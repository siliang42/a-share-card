from app.config import Settings
from app.services.schedule import build_schedule


def test_default_schedule_uses_shanghai_timezone(tmp_path):
    schedule = build_schedule(Settings(data_dir=tmp_path))

    assert schedule.timezone.key == "Asia/Shanghai"
    assert schedule.job("universe_sync").cron == "0 8 * * 1-5"
    assert schedule.job("sector_sync").cron == "30 16 * * 1-5"
    assert schedule.job("profile_sync").cron == "0 3 * * 0"


def test_pairing_token_file_is_generated_once_with_private_permissions(tmp_path):
    token_file = tmp_path / "pairing-token"

    first = Settings(data_dir=tmp_path, pairing_token_file=token_file)
    second = Settings(data_dir=tmp_path, pairing_token_file=token_file)

    assert len(first.pairing_token) >= 32
    assert second.pairing_token == first.pairing_token
    assert token_file.read_text(encoding="utf-8").strip() == first.pairing_token
    assert token_file.stat().st_mode & 0o777 == 0o600
