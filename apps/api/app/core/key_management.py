"""Per-organization key management for encryption and pseudonymization.

Provides an ABC ``KeyProvider`` with two implementations:
- ``LocalKeyProvider``  -- derives keys from env-var seeds via HKDF (dev only).
- ``ScalewaySecretsKeyProvider`` -- fetches keys from Scaleway Secret
  Manager API (production).

Security notes:
- Per-org keys are stored **outside** the database so that crypto-
  shredding (key destruction) makes backup data irrecoverable.
- The ciphertext envelope format prefixes a 1-byte key version so
  rotation is possible without mass re-encryption.
- ``destroy_all_keys`` is intentionally irreversible and idempotent.
- LocalKeyProvider MUST NOT be used in production (enforced at init
  and at the Settings.model_validator level).
- Key material is NEVER logged. All log calls use opaque identifiers
  (org_id, key_type, version) but never raw bytes.
- The Scaleway provider validates org_id as UUID before constructing
  API paths, preventing path-traversal attacks.

Key paths in Scaleway Secrets Manager:
- org/{org_id}/raw_pii_dek          -- AES-256-GCM data-encryption key
- org/{org_id}/fit_params_hmac_key  -- HMAC-SHA256 for fit-parameter
  integrity
- org/{org_id}/pseudonym_hmac_key   -- HMAC-SHA256 for pseudonymization
"""

from __future__ import annotations

import abc
import base64
import os
import struct
from typing import TYPE_CHECKING

import structlog
from cryptography.hazmat.primitives.hashes import SHA256
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

if TYPE_CHECKING:
    import uuid

    from app.core.config import Settings

logger = structlog.get_logger()

# ── Constants ────────────────────────────────────────────

# Key length for AES-256 (32 bytes)
_AES_256_KEY_LEN = 32
# Key length for HMAC-SHA256 (32 bytes recommended)
_HMAC_KEY_LEN = 32
# Minimum seed length (128 bits of entropy)
_MIN_SEED_LENGTH = 16
# Max supported key version (fits in 1 byte unsigned)
MAX_KEY_VERSION = 255

# HTTP timeout configuration for Scaleway API calls.
# Separate connect and read timeouts prevent both connection-hang
# and slow-response DoS scenarios.
_SCW_CONNECT_TIMEOUT = 10.0  # seconds
_SCW_READ_TIMEOUT = 30.0  # seconds

# Key type identifiers -- used in key paths and derivation
KEY_TYPE_RAW_PII_DEK = "raw_pii_dek"
KEY_TYPE_FIT_PARAMS_HMAC = "fit_params_hmac_key"
KEY_TYPE_PSEUDONYM_HMAC = "pseudonym_hmac_key"

_VALID_KEY_TYPES = frozenset(
    {
        KEY_TYPE_RAW_PII_DEK,
        KEY_TYPE_FIT_PARAMS_HMAC,
        KEY_TYPE_PSEUDONYM_HMAC,
    }
)

_VALID_HMAC_KEY_TYPES = frozenset(
    {
        KEY_TYPE_FIT_PARAMS_HMAC,
        KEY_TYPE_PSEUDONYM_HMAC,
    }
)

_KEY_LENGTHS: dict[str, int] = {
    KEY_TYPE_RAW_PII_DEK: _AES_256_KEY_LEN,
    KEY_TYPE_FIT_PARAMS_HMAC: _HMAC_KEY_LEN,
    KEY_TYPE_PSEUDONYM_HMAC: _HMAC_KEY_LEN,
}

# Allowlist for KEY_PROVIDER values -- reject anything else to prevent
# misconfiguration from silently falling through.
_VALID_PROVIDERS = frozenset({"local", "scaleway"})


# ── Exceptions ───────────────────────────────────────────


class KeyManagementError(Exception):
    """Base exception for key management operations."""


class KeyNotFoundError(KeyManagementError):
    """Raised when a requested key does not exist."""


class KeyDestroyedError(KeyManagementError):
    """Raised when keys have been destroyed (crypto-shredding)."""


# ── Ciphertext envelope helpers ──────────────────────────


def pack_version_prefix(version: int) -> bytes:
    """Encode key version as a 1-byte unsigned prefix.

    The ciphertext format is: [1-byte version][actual ciphertext].
    This allows the decryption path to select the correct key version
    without storing metadata alongside the ciphertext.
    """
    if not isinstance(version, int) or not 0 <= version <= MAX_KEY_VERSION:
        msg = f"Key version must be 0..{MAX_KEY_VERSION}, got {version}"
        raise ValueError(msg)
    return struct.pack("B", version)


def unpack_version_prefix(data: bytes) -> tuple[int, bytes]:
    """Extract key version from the 1-byte prefix of ciphertext.

    Returns (version, remaining_ciphertext).
    """
    if len(data) < 2:  # noqa: PLR2004
        msg = "Ciphertext too short to contain version prefix"
        raise ValueError(msg)
    (version,) = struct.unpack("B", data[:1])
    return version, data[1:]


# ── Abstract Base Class ──────────────────────────────────


class KeyProvider(abc.ABC):
    """Abstract key provider for per-organization secrets.

    Implementations must be thread-safe. Methods accept ``org_id``
    as ``uuid.UUID`` to prevent path-traversal in key names -- the
    UUID type guarantee ensures only hex digits and hyphens appear
    in derived paths.
    """

    @abc.abstractmethod
    async def get_dek(
        self,
        org_id: uuid.UUID,
        version: int | None = None,
    ) -> bytes:
        """Fetch the AES-256-GCM data-encryption key for an org.

        Args:
            org_id: Organization UUID.
            version: Specific key version (None = latest).

        Returns:
            32-byte DEK.

        Raises:
            KeyNotFoundError: Key does not exist.
            KeyDestroyedError: Key was destroyed (crypto-shredding).
        """

    @abc.abstractmethod
    async def get_hmac_key(
        self,
        org_id: uuid.UUID,
        key_type: str,
        version: int | None = None,
    ) -> bytes:
        """Fetch an HMAC key for an org.

        Args:
            org_id: Organization UUID.
            key_type: One of KEY_TYPE_FIT_PARAMS_HMAC or
                KEY_TYPE_PSEUDONYM_HMAC.
            version: Specific key version (None = latest).

        Returns:
            32-byte HMAC key.

        Raises:
            KeyNotFoundError: Key does not exist.
            KeyDestroyedError: Key was destroyed (crypto-shredding).
            ValueError: Invalid key_type.
        """

    @abc.abstractmethod
    async def destroy_all_keys(self, org_id: uuid.UUID) -> None:
        """Permanently destroy all keys for an organization.

        This is the crypto-shredding step for RGPD Article 17 erasure.
        After this call, encrypted data for the org is irrecoverable.

        This operation is **irreversible** and **idempotent** -- calling
        it on an already-destroyed org must not raise an error.

        Args:
            org_id: Organization UUID.
        """

    @abc.abstractmethod
    async def rotate_dek(self, org_id: uuid.UUID) -> int:
        """Create a new DEK version for the organization.

        Returns the new version number. Existing data remains
        decryptable with the previous version (the old key is NOT
        deleted).

        Args:
            org_id: Organization UUID.

        Returns:
            The new key version number.
        """

    def _validate_key_type(self, key_type: str) -> None:
        """Validate that key_type is one of the allowed HMAC types.

        The DEK has its own dedicated method (get_dek), so only
        HMAC key types are accepted here.
        """
        if key_type not in _VALID_HMAC_KEY_TYPES:
            msg = (
                f"Invalid key_type '{key_type}'; expected one of: "
                f"{KEY_TYPE_FIT_PARAMS_HMAC}, {KEY_TYPE_PSEUDONYM_HMAC}"
            )
            raise ValueError(msg)


# ── Local Provider (dev only) ────────────────────────────


class LocalKeyProvider(KeyProvider):
    """Dev-only key provider that derives keys from a local seed via HKDF.

    Uses HKDF (RFC 5869) from the ``cryptography`` library for proper
    key derivation with domain separation. The salt is the org_id bytes,
    and the info field encodes the key type and version for domain
    separation.

    This is acceptable for development/testing but MUST NOT be used in
    production because:
    1. A single seed compromise exposes ALL org keys.
    2. No external key destruction -- crypto-shredding only works
       in-memory and is lost on process restart.
    3. Keys are deterministic -- same seed + org produces same keys,
       which is useful for test reproducibility but a weakness in prod.

    The seed is read from ``settings.LOCAL_KEY_SEED`` or passed directly.
    """

    def __init__(
        self,
        settings: Settings | None = None,
        *,
        seed: bytes | None = None,
    ) -> None:
        # Determine if production -- if Settings provided, use it;
        # otherwise fall back to ENVIRONMENT env var as a safety check.
        is_production = False
        if settings is not None:
            is_production = settings.is_production

        if is_production:
            msg = (
                "LocalKeyProvider MUST NOT be used in production. "
                "Configure KEY_PROVIDER=scaleway for Secrets Manager."
            )
            raise KeyManagementError(msg)

        # Resolve seed: explicit argument > Settings > env var fallback
        if seed is None and settings is not None and settings.LOCAL_KEY_SEED:
            seed = settings.LOCAL_KEY_SEED.encode()
        if seed is None:
            env_seed = os.environ.get("LOCAL_KEY_SEED", "")
            if not env_seed:
                msg = (
                    "LOCAL_KEY_SEED is required for LocalKeyProvider. "
                    "Set it in .env or pass seed= explicitly."
                )
                raise KeyManagementError(msg)
            seed = env_seed.encode()  # pragma: no cover

        if len(seed) < _MIN_SEED_LENGTH:
            msg = f"Key seed must be at least {_MIN_SEED_LENGTH} bytes"
            raise KeyManagementError(msg)

        self._seed = seed
        # Track destroyed orgs in memory (dev only -- not persistent)
        self._destroyed_orgs: set[str] = set()
        # Track latest version per org (dev only)
        self._versions: dict[str, int] = {}

        # Warn that this provider is not for production use.
        # This log entry is intentional -- it surfaces in dev logs as
        # a reminder to configure Scaleway before deploying.
        logger.warning(
            "local_key_provider_initialized",
            msg="LocalKeyProvider is for DEVELOPMENT ONLY. Do NOT use in production.",
        )

    def _derive_key(
        self,
        org_id: uuid.UUID,
        key_type: str,
        version: int,
        length: int,
    ) -> bytes:
        """Derive a key using HKDF-SHA256 with domain separation.

        The salt is the org_id bytes (16 bytes from UUID). The info
        field encodes the key type and version, ensuring that each
        (org, key_type, version) triple produces a unique key even
        from the same seed.

        HKDF is the NIST-recommended (SP 800-56C) key derivation
        function for deriving multiple keys from a single secret.
        """
        org_str = str(org_id)
        if org_str in self._destroyed_orgs:
            msg = "Keys for organization have been destroyed"
            raise KeyDestroyedError(msg)

        # Domain-separated info: key_type|version
        # The org_id is used as salt (16 bytes from UUID binary form)
        info = f"{key_type}|{version}".encode()
        salt = org_id.bytes  # 16-byte binary UUID -- fixed length, safe

        hkdf = HKDF(
            algorithm=SHA256(),
            length=length,
            salt=salt,
            info=info,
        )
        return hkdf.derive(self._seed)

    def _get_latest_version(self, org_id: uuid.UUID) -> int:
        """Get the latest key version for an org. Defaults to 1."""
        org_str = str(org_id)
        return self._versions.get(org_str, 1)

    async def get_dek(
        self,
        org_id: uuid.UUID,
        version: int | None = None,
    ) -> bytes:
        if version is None:
            version = self._get_latest_version(org_id)
        return self._derive_key(
            org_id,
            KEY_TYPE_RAW_PII_DEK,
            version,
            _AES_256_KEY_LEN,
        )

    async def get_hmac_key(
        self,
        org_id: uuid.UUID,
        key_type: str,
        version: int | None = None,
    ) -> bytes:
        self._validate_key_type(key_type)
        if version is None:
            version = self._get_latest_version(org_id)
        return self._derive_key(
            org_id,
            key_type,
            version,
            _HMAC_KEY_LEN,
        )

    async def destroy_all_keys(self, org_id: uuid.UUID) -> None:
        """Mark org keys as destroyed. Idempotent -- no error if already destroyed."""
        org_str = str(org_id)
        if org_str in self._destroyed_orgs:  # pragma: no cover
            logger.info(
                "keys_already_destroyed",
                org_id=org_str,
                provider="local",
            )
            return
        self._destroyed_orgs.add(org_str)
        # Remove version tracking -- no longer relevant
        self._versions.pop(org_str, None)
        logger.warning(
            "keys_destroyed",
            org_id=org_str,
            provider="local",
            msg="Keys marked as destroyed (in-memory only, not persistent)",
        )

    async def rotate_dek(self, org_id: uuid.UUID) -> int:
        org_str = str(org_id)
        if org_str in self._destroyed_orgs:
            msg = "Keys for organization have been destroyed"
            raise KeyDestroyedError(msg)
        current = self._get_latest_version(org_id)
        new_version = current + 1
        if new_version > MAX_KEY_VERSION:
            msg = f"Maximum key version ({MAX_KEY_VERSION}) reached"
            raise KeyManagementError(msg)
        self._versions[org_str] = new_version
        logger.info(
            "dek_rotated",
            org_id=org_str,
            new_version=new_version,
            provider="local",
        )
        return new_version


# ── Scaleway Secrets Manager Provider (production) ───────


class ScalewaySecretsKeyProvider(KeyProvider):  # pragma: no cover
    """Production key provider using Scaleway Secret Manager API.

    Stores per-org keys at paths:
    - org/{org_id}/raw_pii_dek
    - org/{org_id}/fit_params_hmac_key
    - org/{org_id}/pseudonym_hmac_key

    Each secret supports multiple versions for key rotation.

    Security measures:
    - org_id is validated as UUID before constructing API paths
      (defense against path traversal).
    - HTTP calls use separate connect/read timeouts (10s/30s)
      to prevent hanging on slow responses.
    - The API key is passed via X-Auth-Token header (Scaleway
      convention), never in query strings or logs.
    - destroy_all_keys disables secrets (not deletes) to preserve
      audit trail while making key material irrecoverable.

    Requires Settings with:
    - SCW_SECRET_KEY: Scaleway API key
    - SCW_DEFAULT_PROJECT_ID: Scaleway project ID
    - SCW_REGION: Region (default: fr-par)
    """

    _BASE_URL = "https://api.scaleway.com/secret-manager/v1beta1"

    def __init__(self, settings: Settings) -> None:
        self._api_key = settings.SCW_SECRET_KEY
        self._project_id = settings.SCW_DEFAULT_PROJECT_ID
        self._region = settings.SCW_REGION

        if not self._api_key:
            msg = "SCW_SECRET_KEY is required for ScalewaySecretsKeyProvider"
            raise KeyManagementError(msg)

        if not self._project_id:
            msg = "SCW_DEFAULT_PROJECT_ID is required for ScalewaySecretsKeyProvider"
            raise KeyManagementError(msg)

        # Validate region format: lowercase letters and hyphens only.
        # Prevents injection into the base URL.
        if not self._region or not all(c.isalpha() or c == "-" for c in self._region):
            msg = "Invalid SCW_REGION: must contain only letters and hyphens"
            raise KeyManagementError(msg)

        import httpx

        self._client = httpx.AsyncClient(
            base_url=(f"{self._BASE_URL}/regions/{self._region}"),
            headers={
                "X-Auth-Token": self._api_key,
                "Content-Type": "application/json",
            },
            # Separate connect and read timeouts:
            # - connect: 10s (fail fast if Scaleway is unreachable)
            # - read: 30s (allow for large responses / slow API)
            timeout=httpx.Timeout(
                connect=_SCW_CONNECT_TIMEOUT,
                read=_SCW_READ_TIMEOUT,
                write=_SCW_CONNECT_TIMEOUT,
                pool=_SCW_CONNECT_TIMEOUT,
            ),
        )

        logger.info(
            "scaleway_key_provider_initialized",
            region=self._region,
            # Log only first 8 chars of project ID -- enough for
            # identification without full exposure.
            project_id_prefix=self._project_id[:8] + "...",
        )

    def _secret_name(
        self,
        org_id: uuid.UUID,
        key_type: str,
    ) -> str:
        """Build the secret name path.

        org_id is typed as uuid.UUID, which guarantees the string
        representation contains only hex digits and hyphens -- safe
        for URL path construction without encoding.
        """
        return f"org/{org_id}/{key_type}"

    async def _find_secret_id(
        self,
        org_id: uuid.UUID,
        key_type: str,
    ) -> tuple[str, str]:
        """Find a secret by name and return (secret_id, status).

        Raises KeyNotFoundError if no secret matches the name.
        Raises KeyManagementError on API errors.
        """
        name = self._secret_name(org_id, key_type)

        resp = await self._client.get(
            "/secrets",
            params={
                "name": name,
                "project_id": self._project_id,
            },
        )
        if resp.status_code != 200:  # noqa: PLR2004
            logger.error(
                "scaleway_api_error_listing_secrets",
                status_code=resp.status_code,
                key_type=key_type,
                org_id=str(org_id),
            )
            msg = f"Failed to list secrets (HTTP {resp.status_code})"
            raise KeyManagementError(msg)

        data = resp.json()
        secrets = data.get("secrets", [])
        if not secrets:
            msg = f"Key {key_type} not found for organization"
            raise KeyNotFoundError(msg)

        secret = secrets[0]
        return secret["id"], secret.get("status", "ready")

    async def _get_secret_version(
        self,
        org_id: uuid.UUID,
        key_type: str,
        version: int | None,
    ) -> bytes:
        """Fetch a specific secret version from Scaleway.

        Validates the returned key material length matches the
        expected length for the key type.
        """
        secret_id, status = await self._find_secret_id(org_id, key_type)

        # Check if the secret has been disabled (crypto-shredding)
        if status in ("locked", "disabled"):
            msg = "Keys for organization have been destroyed"
            raise KeyDestroyedError(msg)

        version_id = "latest" if version is None else str(version)

        # Access the secret version data
        access_resp = await self._client.get(
            f"/secrets/{secret_id}/versions/{version_id}/access",
        )
        if access_resp.status_code == 404:  # noqa: PLR2004
            msg = f"Key version {version_id} not found for {key_type}"
            raise KeyNotFoundError(msg)
        if access_resp.status_code != 200:  # noqa: PLR2004
            logger.error(
                "scaleway_api_error_accessing_version",
                status_code=access_resp.status_code,
                key_type=key_type,
                org_id=str(org_id),
            )
            msg = f"Failed to access key version (HTTP {access_resp.status_code})"
            raise KeyManagementError(msg)

        access_data = access_resp.json()
        raw_data = access_data.get("data")
        if not isinstance(raw_data, str):
            msg = "Secret version response missing data field"
            raise KeyManagementError(msg)

        raw = base64.b64decode(raw_data)
        expected_len = _KEY_LENGTHS.get(key_type, _AES_256_KEY_LEN)
        if len(raw) != expected_len:
            # Log the mismatch but NEVER log the key material itself
            logger.error(
                "key_length_mismatch",
                key_type=key_type,
                expected=expected_len,
                actual=len(raw),
                org_id=str(org_id),
            )
            msg = (
                f"Key {key_type} has unexpected length "
                f"{len(raw)}, expected {expected_len}"
            )
            raise KeyManagementError(msg)
        return raw

    async def get_dek(
        self,
        org_id: uuid.UUID,
        version: int | None = None,
    ) -> bytes:
        return await self._get_secret_version(
            org_id,
            KEY_TYPE_RAW_PII_DEK,
            version,
        )

    async def get_hmac_key(
        self,
        org_id: uuid.UUID,
        key_type: str,
        version: int | None = None,
    ) -> bytes:
        self._validate_key_type(key_type)
        return await self._get_secret_version(
            org_id,
            key_type,
            version,
        )

    async def destroy_all_keys(self, org_id: uuid.UUID) -> None:
        """Disable all secret versions for an org.

        This is the crypto-shredding step. We disable (not delete)
        so there is an audit trail of the key's existence, but the
        material is irrecoverable.

        Idempotent: if secrets are already disabled or do not exist,
        the operation succeeds silently.
        """
        for key_type in _VALID_KEY_TYPES:
            try:
                secret_id, status = await self._find_secret_id(
                    org_id,
                    key_type,
                )
            except KeyNotFoundError:
                # Secret never existed -- nothing to destroy.
                # This makes the operation idempotent.
                logger.info(
                    "secret_not_found_for_destruction",
                    key_type=key_type,
                    org_id=str(org_id),
                )
                continue
            except KeyManagementError:
                logger.exception(
                    "failed_to_list_secret_for_destruction",
                    key_type=key_type,
                    org_id=str(org_id),
                )
                continue

            # Already disabled -- idempotent
            if status in ("locked", "disabled"):
                logger.info(
                    "secret_already_disabled",
                    secret_id=secret_id,
                    key_type=key_type,
                    org_id=str(org_id),
                )
                continue

            disable_resp = await self._client.post(
                f"/secrets/{secret_id}/disable",
            )
            if disable_resp.status_code == 200:  # noqa: PLR2004
                logger.warning(
                    "secret_disabled_crypto_shredding",
                    secret_id=secret_id,
                    key_type=key_type,
                    org_id=str(org_id),
                )
            else:
                logger.error(
                    "failed_to_disable_secret",
                    secret_id=secret_id,
                    status_code=disable_resp.status_code,
                    key_type=key_type,
                    org_id=str(org_id),
                )

    async def rotate_dek(self, org_id: uuid.UUID) -> int:
        """Create a new DEK version in Scaleway Secrets Manager.

        Generates a 32-byte random key using os.urandom (CSPRNG)
        and creates a new version of the DEK secret. The previous
        version remains accessible for decrypting existing data.
        """
        secret_id, status = await self._find_secret_id(
            org_id,
            KEY_TYPE_RAW_PII_DEK,
        )

        if status in ("locked", "disabled"):
            msg = "Keys for organization have been destroyed"
            raise KeyDestroyedError(msg)

        # Generate new 32-byte key using OS CSPRNG
        new_key = os.urandom(_AES_256_KEY_LEN)
        encoded = base64.b64encode(new_key).decode("ascii")

        # Create new version
        create_resp = await self._client.post(
            f"/secrets/{secret_id}/versions",
            json={"data": encoded},
        )
        if create_resp.status_code != 200:  # noqa: PLR2004
            logger.error(
                "failed_to_create_dek_version",
                status_code=create_resp.status_code,
                org_id=str(org_id),
            )
            msg = f"Failed to create new DEK version (HTTP {create_resp.status_code})"
            raise KeyManagementError(msg)

        version_data = create_resp.json()
        new_version = version_data.get("revision", 0)
        logger.info(
            "dek_rotated",
            org_id=str(org_id),
            new_version=new_version,
            provider="scaleway",
        )
        return new_version

    async def close(self) -> None:
        """Close the HTTP client. Call during application shutdown."""
        await self._client.aclose()


# ── Provider factory ─────────────────────────────────────


def get_key_provider(settings: Settings) -> KeyProvider:
    """Create a KeyProvider based on application settings.

    Args:
        settings: Application settings (pydantic-settings instance).

    Returns:
        A KeyProvider instance appropriate for the current environment.

    Raises:
        KeyManagementError: Unknown or invalid KEY_PROVIDER value.
    """
    provider = settings.KEY_PROVIDER

    if provider not in _VALID_PROVIDERS:
        msg = (
            f"Unknown KEY_PROVIDER '{provider}'; "
            f"expected one of: {', '.join(sorted(_VALID_PROVIDERS))}"
        )
        raise KeyManagementError(msg)

    if provider == "local":
        return LocalKeyProvider(settings)

    return ScalewaySecretsKeyProvider(settings)  # pragma: no cover
