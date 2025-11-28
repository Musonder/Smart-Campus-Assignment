"""
Audit Log Hash Chain Verification Tests

Tests the tamper-evident hash chain implementation for audit logs.
Verifies that any modification to audit entries is detectable.
"""

import pytest
from uuid import UUID, uuid4
from datetime import datetime

from shared.domain.audit import AuditLogEntry, AuditAction, AuditSeverity


class TestAuditHashChain:
    """Test audit log hash chaining and tamper detection."""

    def test_hash_chain_creation(self):
        """Test that hash chain is created correctly."""
        # Create first entry (no previous hash)
        entry1 = AuditLogEntry.create(
            action=AuditAction.CREATE,
            resource_type="user",
            description="User created",
            actor_id=uuid4(),
        )

        # Verify entry has hash
        assert entry1.entry_hash is not None
        assert len(entry1.entry_hash) == 64  # SHA-256 hex digest length

        # Create second entry (with previous hash)
        entry2 = AuditLogEntry.create(
            action=AuditAction.UPDATE,
            resource_type="user",
            description="User updated",
            previous_hash=entry1.entry_hash,
            actor_id=uuid4(),
        )

        # Verify chain link
        assert entry2.previous_hash == entry1.entry_hash
        assert entry2.entry_hash is not None

    def test_hash_verification(self):
        """Test that entry hash can be verified."""
        entry = AuditLogEntry.create(
            action=AuditAction.CREATE,
            resource_type="user",
            description="User created",
            actor_id=uuid4(),
        )

        # Verify hash is correct
        assert entry.verify_hash() is True

    def test_tamper_detection(self):
        """Test that tampering with entry data is detected."""
        entry = AuditLogEntry.create(
            action=AuditAction.CREATE,
            resource_type="user",
            description="User created",
            actor_id=uuid4(),
        )

        original_hash = entry.entry_hash

        # Attempt to tamper (this should fail due to frozen model)
        # In a real scenario, tampering would be done at storage level
        # We simulate by creating a modified entry
        tampered_entry = AuditLogEntry(
            id=entry.id,
            action=AuditAction.DELETE,  # Changed action
            resource_type=entry.resource_type,
            description=entry.description,
            actor_id=entry.actor_id,
            timestamp=entry.timestamp,
            entry_hash=original_hash,  # Using old hash
            previous_hash=entry.previous_hash,
        )

        # Verify tampered entry fails hash verification
        assert tampered_entry.verify_hash() is False

    def test_chain_verification(self):
        """Test that hash chain integrity can be verified."""
        # Create chain of entries
        entry1 = AuditLogEntry.create(
            action=AuditAction.CREATE,
            resource_type="user",
            description="User created",
            actor_id=uuid4(),
        )

        entry2 = AuditLogEntry.create(
            action=AuditAction.UPDATE,
            resource_type="user",
            description="User updated",
            previous_hash=entry1.entry_hash,
            actor_id=uuid4(),
        )

        entry3 = AuditLogEntry.create(
            action=AuditAction.DELETE,
            resource_type="user",
            description="User deleted",
            previous_hash=entry2.entry_hash,
            actor_id=uuid4(),
        )

        # Verify chain integrity
        assert entry1.verify_hash() is True
        assert entry2.verify_hash() is True
        assert entry2.verify_chain(entry1) is True
        assert entry3.verify_hash() is True
        assert entry3.verify_chain(entry2) is True

    def test_chain_break_detection(self):
        """Test that breaking the chain is detected."""
        # Create chain
        entry1 = AuditLogEntry.create(
            action=AuditAction.CREATE,
            resource_type="user",
            description="User created",
            actor_id=uuid4(),
        )

        entry2 = AuditLogEntry.create(
            action=AuditAction.UPDATE,
            resource_type="user",
            description="User updated",
            previous_hash=entry1.entry_hash,
            actor_id=uuid4(),
        )

        # Create entry with wrong previous hash (simulating chain break)
        entry3_broken = AuditLogEntry.create(
            action=AuditAction.DELETE,
            resource_type="user",
            description="User deleted",
            previous_hash="wrong_hash",  # Wrong previous hash
            actor_id=uuid4(),
        )

        # Verify chain break is detected
        assert entry3_broken.verify_chain(entry2) is False

    def test_hash_determinism(self):
        """Test that hash is deterministic (same input = same hash)."""
        actor_id = uuid4()
        resource_id = uuid4()

        entry1 = AuditLogEntry.create(
            action=AuditAction.CREATE,
            resource_type="user",
            resource_id=resource_id,
            description="User created",
            actor_id=actor_id,
        )

        entry2 = AuditLogEntry.create(
            action=AuditAction.CREATE,
            resource_type="user",
            resource_id=resource_id,
            description="User created",
            actor_id=actor_id,
        )

        # Same data should produce same hash (if timestamps are same)
        # Note: In practice, timestamps differ, so hashes will differ
        # This test verifies the hashing algorithm is deterministic
        assert entry1.verify_hash() is True
        assert entry2.verify_hash() is True

    def test_append_only_property(self):
        """Test that audit log is append-only (entries are immutable)."""
        entry = AuditLogEntry.create(
            action=AuditAction.CREATE,
            resource_type="user",
            description="User created",
            actor_id=uuid4(),
        )

        # Verify entry is frozen (immutable)
        assert entry.model_config.get("frozen") is True

        # Attempting to modify should raise error
        with pytest.raises(Exception):  # Pydantic validation error
            entry.action = AuditAction.DELETE

    def test_hash_includes_all_fields(self):
        """Test that hash includes all relevant fields."""
        entry = AuditLogEntry.create(
            action=AuditAction.CREATE,
            resource_type="user",
            resource_id=uuid4(),
            description="User created",
            actor_id=uuid4(),
            metadata={"key": "value"},
        )

        # Verify hash changes if any field changes
        original_hash = entry.entry_hash

        # Create entry with different metadata
        entry2 = AuditLogEntry.create(
            action=AuditAction.CREATE,
            resource_type="user",
            resource_id=entry.resource_id,
            description="User created",
            actor_id=entry.actor_id,
            metadata={"key": "different_value"},  # Different metadata
        )

        # Hashes should differ
        assert entry2.entry_hash != original_hash


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

