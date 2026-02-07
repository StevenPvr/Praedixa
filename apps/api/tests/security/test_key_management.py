"""P0-06 Evidence (Keys) — Per-organization key management tests.

Validates that LocalKeyProvider:
- Derives different DEKs for different organizations.
- Derives different keys for different key types (DEK vs HMAC).
- Raises KeyDestroyedError after destroy_all_keys.
- Increments version on rotate_dek.
- Raises KeyManagementError when is_production=True.
- Rejects seeds shorter than 16 bytes.
- pack/unpack version prefix roundtrips correctly.
- Rejects invalid key types.
- Factory function returns correct provider types.

These tests serve as contractual evidence for security gate P0-06.
"""

import uuid
from unittest.mock import MagicMock

import pytest

from app.core.key_management import (
    KEY_TYPE_FIT_PARAMS_HMAC,
    KEY_TYPE_PSEUDONYM_HMAC,
    KEY_TYPE_RAW_PII_DEK,
    MAX_KEY_VERSION,
    KeyDestroyedError,
    KeyManagementError,
    LocalKeyProvider,
    get_key_provider,
    pack_version_prefix,
    unpack_version_prefix,
)


def _mock_settings(
    *,
    key_provider: str = "local",
    local_key_seed: str = "test-seed-for-factory-16b",
    is_production: bool = False,
    environment: str = "development",
) -> MagicMock:
    """Build a mock Settings object."""
    s = MagicMock()
    s.KEY_PROVIDER = key_provider
    s.LOCAL_KEY_SEED = local_key_seed
    s.is_production = is_production
    s.ENVIRONMENT = environment
    return s


# Fixed test UUIDs for deterministic testing
ORG_1 = uuid.UUID("11111111-1111-1111-1111-111111111111")
ORG_2 = uuid.UUID("22222222-2222-2222-2222-222222222222")
TEST_SEED = b"test-seed-for-key-derivation"  # 28 bytes, > 16 min


class TestLocalProviderDifferentKeysPerOrg:
    """P0-06: Two orgs get different DEKs from LocalKeyProvider."""

    async def test_different_orgs_get_different_deks(self) -> None:
        """DEKs for org_1 and org_2 are different."""
        provider = LocalKeyProvider(seed=TEST_SEED)
        dek_1 = await provider.get_dek(ORG_1)
        dek_2 = await provider.get_dek(ORG_2)

        assert dek_1 != dek_2
        assert len(dek_1) == 32  # AES-256 key length
        assert len(dek_2) == 32

    async def test_same_org_gets_same_dek(self) -> None:
        """Same org gets the same DEK (deterministic derivation)."""
        provider = LocalKeyProvider(seed=TEST_SEED)
        dek_a = await provider.get_dek(ORG_1)
        dek_b = await provider.get_dek(ORG_1)
        assert dek_a == dek_b

    async def test_different_seeds_produce_different_keys(self) -> None:
        """Different seeds produce different DEKs for the same org."""
        provider_a = LocalKeyProvider(seed=b"seed-a-16-bytes-ok")
        provider_b = LocalKeyProvider(seed=b"seed-b-16-bytes-ok")
        dek_a = await provider_a.get_dek(ORG_1)
        dek_b = await provider_b.get_dek(ORG_1)
        assert dek_a != dek_b


class TestLocalProviderDifferentKeysPerType:
    """P0-06: DEK != HMAC key for the same org."""

    async def test_dek_differs_from_fit_params_hmac(self) -> None:
        """DEK and fit_params_hmac_key are different for same org."""
        provider = LocalKeyProvider(seed=TEST_SEED)
        dek = await provider.get_dek(ORG_1)
        hmac_key = await provider.get_hmac_key(
            ORG_1,
            KEY_TYPE_FIT_PARAMS_HMAC,
        )
        assert dek != hmac_key
        assert len(hmac_key) == 32

    async def test_dek_differs_from_pseudonym_hmac(self) -> None:
        """DEK and pseudonym_hmac_key are different for same org."""
        provider = LocalKeyProvider(seed=TEST_SEED)
        dek = await provider.get_dek(ORG_1)
        hmac_key = await provider.get_hmac_key(
            ORG_1,
            KEY_TYPE_PSEUDONYM_HMAC,
        )
        assert dek != hmac_key

    async def test_fit_params_differs_from_pseudonym(self) -> None:
        """fit_params_hmac and pseudonym_hmac are different for same org."""
        provider = LocalKeyProvider(seed=TEST_SEED)
        hmac_fit = await provider.get_hmac_key(
            ORG_1,
            KEY_TYPE_FIT_PARAMS_HMAC,
        )
        hmac_pseudo = await provider.get_hmac_key(
            ORG_1,
            KEY_TYPE_PSEUDONYM_HMAC,
        )
        assert hmac_fit != hmac_pseudo


class TestLocalProviderDestroyThenGetRaises:
    """P0-06: After destroy_all_keys, get_dek raises KeyDestroyedError."""

    async def test_get_dek_after_destroy_raises(self) -> None:
        """get_dek raises KeyDestroyedError after keys are destroyed."""
        provider = LocalKeyProvider(seed=TEST_SEED)
        # Should work before destruction
        dek = await provider.get_dek(ORG_1)
        assert len(dek) == 32

        # Destroy keys
        await provider.destroy_all_keys(ORG_1)

        # Should raise after destruction
        with pytest.raises(KeyDestroyedError):
            await provider.get_dek(ORG_1)

    async def test_get_hmac_after_destroy_raises(self) -> None:
        """get_hmac_key raises KeyDestroyedError after destruction."""
        provider = LocalKeyProvider(seed=TEST_SEED)
        await provider.destroy_all_keys(ORG_1)

        with pytest.raises(KeyDestroyedError):
            await provider.get_hmac_key(
                ORG_1,
                KEY_TYPE_FIT_PARAMS_HMAC,
            )

    async def test_destroy_only_affects_target_org(self) -> None:
        """Destroying org_1's keys does not affect org_2."""
        provider = LocalKeyProvider(seed=TEST_SEED)
        await provider.destroy_all_keys(ORG_1)

        # org_2 should still work
        dek_2 = await provider.get_dek(ORG_2)
        assert len(dek_2) == 32

        # org_1 should be destroyed
        with pytest.raises(KeyDestroyedError):
            await provider.get_dek(ORG_1)

    async def test_rotate_after_destroy_raises(self) -> None:
        """rotate_dek raises KeyDestroyedError after destruction."""
        provider = LocalKeyProvider(seed=TEST_SEED)
        await provider.destroy_all_keys(ORG_1)

        with pytest.raises(KeyDestroyedError):
            await provider.rotate_dek(ORG_1)


class TestLocalProviderRotateIncrementsVersion:
    """P0-06: rotate_dek returns increasing version numbers."""

    async def test_first_rotation_returns_2(self) -> None:
        """First rotation increments from default version 1 to 2."""
        provider = LocalKeyProvider(seed=TEST_SEED)
        new_version = await provider.rotate_dek(ORG_1)
        assert new_version == 2

    async def test_successive_rotations_increment(self) -> None:
        """Successive rotations increment the version each time."""
        provider = LocalKeyProvider(seed=TEST_SEED)
        v2 = await provider.rotate_dek(ORG_1)
        v3 = await provider.rotate_dek(ORG_1)
        v4 = await provider.rotate_dek(ORG_1)
        assert v2 == 2
        assert v3 == 3
        assert v4 == 4

    async def test_rotation_per_org_independent(self) -> None:
        """Rotation versions are tracked per-org independently."""
        provider = LocalKeyProvider(seed=TEST_SEED)
        v2_org1 = await provider.rotate_dek(ORG_1)
        v2_org2 = await provider.rotate_dek(ORG_2)
        v3_org1 = await provider.rotate_dek(ORG_1)

        assert v2_org1 == 2
        assert v2_org2 == 2  # Independent version counter
        assert v3_org1 == 3

    async def test_dek_changes_after_rotation(self) -> None:
        """DEK for latest version differs after rotation."""
        provider = LocalKeyProvider(seed=TEST_SEED)
        dek_v1 = await provider.get_dek(ORG_1)
        await provider.rotate_dek(ORG_1)
        dek_v2 = await provider.get_dek(ORG_1)  # Gets latest (v2)
        assert dek_v1 != dek_v2

    async def test_old_version_still_accessible(self) -> None:
        """After rotation, old version DEK is still retrievable."""
        provider = LocalKeyProvider(seed=TEST_SEED)
        dek_v1 = await provider.get_dek(ORG_1, version=1)
        await provider.rotate_dek(ORG_1)
        dek_v1_again = await provider.get_dek(ORG_1, version=1)
        assert dek_v1 == dek_v1_again


class TestLocalProviderRejectedInProduction:
    """P0-06: LocalKeyProvider with production settings raises."""

    def test_production_settings_raises(self) -> None:
        """LocalKeyProvider cannot be instantiated with production settings."""
        prod_settings = _mock_settings(is_production=True)
        with pytest.raises(KeyManagementError) as exc_info:
            LocalKeyProvider(prod_settings, seed=TEST_SEED)
        assert "production" in str(exc_info.value).lower()
        assert "scaleway" in str(exc_info.value).lower()

    def test_no_settings_no_production_check(self) -> None:
        """Without settings, production check uses env fallback (not prod)."""
        # When settings=None, is_production defaults to False
        provider = LocalKeyProvider(seed=TEST_SEED)
        assert provider is not None


class TestLocalProviderShortSeedRejected:
    """P0-06: Seed < 16 bytes is rejected."""

    def test_seed_15_bytes_rejected(self) -> None:
        """15-byte seed is too short."""
        with pytest.raises(KeyManagementError) as exc_info:
            LocalKeyProvider(seed=b"short-15-bytes")
        assert "16 bytes" in str(exc_info.value)

    def test_seed_1_byte_rejected(self) -> None:
        """1-byte seed is too short."""
        with pytest.raises(KeyManagementError):
            LocalKeyProvider(seed=b"x")

    def test_seed_empty_rejected(self) -> None:
        """Empty seed is rejected."""
        with pytest.raises(KeyManagementError):
            LocalKeyProvider(seed=b"")

    def test_seed_exactly_16_accepted(self) -> None:
        """16-byte seed is accepted (boundary value)."""
        provider = LocalKeyProvider(seed=b"exactly-16-bytes")
        assert provider is not None

    def test_missing_env_seed_rejected(self) -> None:
        """No seed argument and no env var raises."""
        import os

        old = os.environ.pop("LOCAL_KEY_SEED", None)
        try:
            with pytest.raises(KeyManagementError) as exc_info:
                LocalKeyProvider()
            assert "LOCAL_KEY_SEED" in str(exc_info.value)
        finally:
            if old is not None:
                os.environ["LOCAL_KEY_SEED"] = old


class TestVersionPrefixPackUnpackRoundtrip:
    """P0-06: pack_version_prefix + unpack_version_prefix roundtrips."""

    def test_roundtrip_version_0(self) -> None:
        """Version 0 roundtrips correctly."""
        prefix = pack_version_prefix(0)
        ciphertext = b"encrypted-data-here"
        combined = prefix + ciphertext
        version, remaining = unpack_version_prefix(combined)
        assert version == 0
        assert remaining == ciphertext

    def test_roundtrip_version_1(self) -> None:
        """Version 1 roundtrips correctly."""
        prefix = pack_version_prefix(1)
        ciphertext = b"encrypted-data"
        combined = prefix + ciphertext
        version, remaining = unpack_version_prefix(combined)
        assert version == 1
        assert remaining == ciphertext

    def test_roundtrip_version_255(self) -> None:
        """Maximum version 255 roundtrips correctly."""
        prefix = pack_version_prefix(255)
        ciphertext = b"data"
        combined = prefix + ciphertext
        version, remaining = unpack_version_prefix(combined)
        assert version == 255
        assert remaining == ciphertext

    def test_pack_version_256_raises(self) -> None:
        """Version 256 exceeds the 1-byte limit and raises."""
        with pytest.raises(ValueError):
            pack_version_prefix(256)

    def test_pack_negative_version_raises(self) -> None:
        """Negative version raises."""
        with pytest.raises(ValueError):
            pack_version_prefix(-1)

    def test_unpack_too_short_raises(self) -> None:
        """Ciphertext shorter than 2 bytes raises."""
        with pytest.raises(ValueError) as exc_info:
            unpack_version_prefix(b"\x01")
        assert "too short" in str(exc_info.value).lower()

    def test_unpack_empty_raises(self) -> None:
        """Empty ciphertext raises."""
        with pytest.raises(ValueError):
            unpack_version_prefix(b"")

    def test_prefix_is_1_byte(self) -> None:
        """pack_version_prefix always returns exactly 1 byte."""
        for v in [0, 1, 127, 255]:
            assert len(pack_version_prefix(v)) == 1


class TestInvalidKeyTypeRejected:
    """P0-06: get_hmac_key with invalid key_type raises ValueError."""

    async def test_invalid_key_type_raises(self) -> None:
        """An unknown key type raises ValueError."""
        provider = LocalKeyProvider(seed=TEST_SEED)
        with pytest.raises(ValueError) as exc_info:
            await provider.get_hmac_key(ORG_1, "invalid_type")
        assert "invalid_type" in str(exc_info.value).lower()

    async def test_dek_key_type_as_hmac_raises(self) -> None:
        """Using raw_pii_dek as an HMAC key type raises ValueError."""
        provider = LocalKeyProvider(seed=TEST_SEED)
        with pytest.raises(ValueError):
            await provider.get_hmac_key(
                ORG_1,
                KEY_TYPE_RAW_PII_DEK,
            )

    async def test_valid_hmac_types_accepted(self) -> None:
        """Valid HMAC key types are accepted."""
        provider = LocalKeyProvider(seed=TEST_SEED)
        for key_type in [
            KEY_TYPE_FIT_PARAMS_HMAC,
            KEY_TYPE_PSEUDONYM_HMAC,
        ]:
            key = await provider.get_hmac_key(ORG_1, key_type)
            assert len(key) == 32


class TestFactoryLocal:
    """P0-06: get_key_provider with KEY_PROVIDER='local' returns LocalKeyProvider."""

    def test_factory_returns_local_provider(self) -> None:
        """Factory with KEY_PROVIDER='local' returns a LocalKeyProvider."""
        settings = _mock_settings(key_provider="local")
        provider = get_key_provider(settings)
        assert isinstance(provider, LocalKeyProvider)

    def test_factory_local_with_production_raises(self) -> None:
        """Factory with 'local' on production settings raises."""
        settings = _mock_settings(
            key_provider="local",
            is_production=True,
        )
        with pytest.raises(KeyManagementError):
            get_key_provider(settings)


class TestFactoryUnknownRaises:
    """P0-06: get_key_provider with unknown KEY_PROVIDER raises KeyManagementError."""

    def test_unknown_provider_raises(self) -> None:
        """Unknown provider name raises KeyManagementError."""
        settings = _mock_settings(key_provider="unknown")
        with pytest.raises(KeyManagementError) as exc_info:
            get_key_provider(settings)
        assert "unknown" in str(exc_info.value).lower()

    def test_empty_provider_raises(self) -> None:
        """Empty provider name raises KeyManagementError."""
        settings = _mock_settings(key_provider="")
        with pytest.raises(KeyManagementError):
            get_key_provider(settings)

    def test_typo_provider_raises(self) -> None:
        """Common typo 'Local' (capitalized) raises."""
        settings = _mock_settings(key_provider="Local")
        with pytest.raises(KeyManagementError):
            get_key_provider(settings)


class TestMaxKeyVersionLimit:
    """P0-06: MAX_KEY_VERSION is enforced on rotation."""

    def test_max_key_version_is_255(self) -> None:
        """MAX_KEY_VERSION constant is 255 (fits in 1 unsigned byte)."""
        assert MAX_KEY_VERSION == 255

    async def test_version_overflow_raises(self) -> None:
        """Rotating past MAX_KEY_VERSION raises KeyManagementError."""
        provider = LocalKeyProvider(seed=TEST_SEED)
        # Set version to 254 manually, then rotate to 255 (ok), then 256 (fail)
        provider._versions[str(ORG_1)] = MAX_KEY_VERSION
        with pytest.raises(KeyManagementError) as exc_info:
            await provider.rotate_dek(ORG_1)
        assert "max" in str(exc_info.value).lower()
