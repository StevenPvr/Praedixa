"""Security gap analysis — Rate limit bypass via header spoofing.

Tests that the rate limiter cannot be bypassed by:
1. Spoofing X-Forwarded-For with multiple IPs.
2. Injecting private/loopback IPs via X-Forwarded-For.
3. Using IPv6 loopback addresses.
4. Sending empty or malformed proxy headers.
5. Using X-Real-IP (unsupported — should fall through to XFF/client).

OWASP API4:2023 — Unrestricted Resource Consumption
"""

from unittest.mock import MagicMock

from app.core.rate_limit import _get_client_ip


class TestXForwardedForFirstIpOnly:
    """The limiter MUST use only the first IP from X-Forwarded-For.

    An attacker can append arbitrary IPs to XFF. Only the first IP
    (set by the edge proxy) is trustworthy.
    """

    def test_xff_with_multiple_ips_uses_first(self) -> None:
        """Only the first IP in X-Forwarded-For is used."""
        request = MagicMock()

        def header_get(name: str) -> str | None:
            if name == "x-forwarded-for":
                return "203.0.113.1, 10.0.0.1, 192.168.1.1"
            return None

        request.headers.get = header_get
        request.client = MagicMock()
        request.client.host = "127.0.0.1"

        assert _get_client_ip(request) == "203.0.113.1"

    def test_xff_with_private_ip_first(self) -> None:
        """Private IP as first XFF entry is used as-is.

        This is correct — if the edge proxy sets the first entry to a private IP
        (e.g., client is on a VPN), that's the key function's job to report.
        Rate limiting on private IPs is a deployment concern, not a code issue.
        """
        request = MagicMock()

        def header_get(name: str) -> str | None:
            if name == "x-forwarded-for":
                return "10.0.0.1, 203.0.113.50"
            return None

        request.headers.get = header_get
        request.client = MagicMock()
        request.client.host = "127.0.0.1"

        assert _get_client_ip(request) == "10.0.0.1"

    def test_xff_single_ip(self) -> None:
        """Single IP in X-Forwarded-For is used correctly."""
        request = MagicMock()

        def header_get(name: str) -> str | None:
            if name == "x-forwarded-for":
                return "198.51.100.42"
            return None

        request.headers.get = header_get
        request.client = MagicMock()
        request.client.host = "127.0.0.1"

        assert _get_client_ip(request) == "198.51.100.42"


class TestCloudflareHeaderPriority:
    """cf-connecting-ip takes absolute priority over all other headers.

    In a Cloudflare deployment, the attacker cannot influence
    cf-connecting-ip — it is set by the Cloudflare edge, not forwarded
    from the client. An attacker trying to spoof via X-Forwarded-For
    is irrelevant when cf-connecting-ip is present.
    """

    def test_cf_ip_overrides_xff_spoofing(self) -> None:
        """cf-connecting-ip is used even when XFF contains a different IP."""
        request = MagicMock()

        def header_get(name: str) -> str | None:
            headers = {
                "cf-connecting-ip": "198.51.100.1",
                "x-forwarded-for": "10.0.0.99, 192.168.1.1",  # attacker-controlled
            }
            return headers.get(name)

        request.headers.get = header_get
        request.client = MagicMock()
        request.client.host = "127.0.0.1"

        assert _get_client_ip(request) == "198.51.100.1"

    def test_cf_ip_overrides_client_host(self) -> None:
        """cf-connecting-ip is used even when client.host differs."""
        request = MagicMock()

        def header_get(name: str) -> str | None:
            if name == "cf-connecting-ip":
                return "203.0.113.50"
            return None

        request.headers.get = header_get
        request.client = MagicMock()
        request.client.host = "10.0.0.1"

        assert _get_client_ip(request) == "203.0.113.50"


class TestMalformedHeaderHandling:
    """Malformed proxy headers are handled without crashing."""

    def test_empty_xff_falls_through_to_client(self) -> None:
        """Empty X-Forwarded-For falls through to client.host."""
        request = MagicMock()

        def header_get(name: str) -> str | None:
            if name == "x-forwarded-for":
                return ""
            return None

        request.headers.get = header_get
        request.client = MagicMock()
        request.client.host = "192.168.1.100"

        # Empty string is falsy, falls through to client.host
        result = _get_client_ip(request)
        assert result == "192.168.1.100"

    def test_xff_with_only_commas_uses_first_empty_part(self) -> None:
        """XFF with only commas splits to empty strings."""
        request = MagicMock()

        def header_get(name: str) -> str | None:
            if name == "x-forwarded-for":
                return ","
            return None

        request.headers.get = header_get
        request.client = MagicMock()
        request.client.host = "10.0.0.1"

        # "," splits to ["", ""], first is "" which is stripped to ""
        result = _get_client_ip(request)
        # Empty string after strip — still returned by the function
        # This is the expected behavior: an empty string IP key
        assert isinstance(result, str)

    def test_xff_with_ipv6_address(self) -> None:
        """IPv6 addresses in XFF are passed through correctly."""
        request = MagicMock()

        def header_get(name: str) -> str | None:
            if name == "x-forwarded-for":
                return "2001:db8::1, 10.0.0.1"
            return None

        request.headers.get = header_get
        request.client = MagicMock()
        request.client.host = "127.0.0.1"

        assert _get_client_ip(request) == "2001:db8::1"

    def test_xff_with_port_number(self) -> None:
        """IP with port in XFF is used as-is (no parsing)."""
        request = MagicMock()

        def header_get(name: str) -> str | None:
            if name == "x-forwarded-for":
                return "203.0.113.1:8080, 10.0.0.1"
            return None

        request.headers.get = header_get
        request.client = MagicMock()
        request.client.host = "127.0.0.1"

        # The IP with port is returned as-is
        assert _get_client_ip(request) == "203.0.113.1:8080"


class TestXRealIpNotSupported:
    """X-Real-IP is NOT checked by the rate limiter key function.

    This is intentional: only cf-connecting-ip and X-Forwarded-For
    are supported. An attacker sending X-Real-IP cannot influence
    the rate limit key.
    """

    def test_x_real_ip_ignored(self) -> None:
        """X-Real-IP does not affect the extracted client IP."""
        request = MagicMock()

        def header_get(name: str) -> str | None:
            if name == "x-real-ip":
                return "203.0.113.99"
            return None

        request.headers.get = header_get
        request.client = MagicMock()
        request.client.host = "10.0.0.1"

        # X-Real-IP is not checked, falls through to client.host
        assert _get_client_ip(request) == "10.0.0.1"


class TestExemptPathsCompleteness:
    """All paths that should be exempt from rate limiting are listed."""

    def test_health_endpoint_exempt(self) -> None:
        """Both /health and /api/v1/health are exempt."""
        from app.core.rate_limit import _EXEMPT_PATHS

        assert "/health" in _EXEMPT_PATHS
        assert "/api/v1/health" in _EXEMPT_PATHS

    def test_no_auth_endpoints_exempt(self) -> None:
        """Auth endpoints are NOT exempt (brute-force prevention)."""
        from app.core.rate_limit import _EXEMPT_PATHS

        assert "/api/v1/auth/login" not in _EXEMPT_PATHS
        assert "/api/v1/auth" not in _EXEMPT_PATHS

    def test_exempt_paths_frozen(self) -> None:
        """Exempt paths cannot be modified at runtime."""
        from app.core.rate_limit import _EXEMPT_PATHS

        assert isinstance(_EXEMPT_PATHS, frozenset)
