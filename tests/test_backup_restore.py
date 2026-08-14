"""Backup and clean-restore command contract."""

import subprocess


def test_backup_restore_command_rejects_unknown_mode_without_side_effects(tmp_path) -> None:
    """Expose only explicit backup and verify modes before touching a target."""
    target = tmp_path / "must-not-exist"
    result = subprocess.run(
        ["scripts/backup_restore.sh", "unknown", str(target)],
        check=False,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 64
    assert "backup|verify" in result.stderr
    assert not target.exists()
