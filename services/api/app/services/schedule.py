from dataclasses import dataclass
from zoneinfo import ZoneInfo

from app.config import Settings


@dataclass(frozen=True)
class JobSchedule:
    name: str
    cron: str


@dataclass(frozen=True)
class WorkerSchedule:
    timezone: ZoneInfo
    jobs: tuple[JobSchedule, ...]

    def job(self, name: str) -> JobSchedule:
        for job in self.jobs:
            if job.name == name:
                return job
        raise KeyError(name)


def build_schedule(settings: Settings) -> WorkerSchedule:
    return WorkerSchedule(
        timezone=settings.timezone_info,
        jobs=(
            JobSchedule("universe_sync", "0 8 * * 1-5"),
            JobSchedule("sector_sync", "30 16 * * 1-5"),
            JobSchedule("profile_sync", "0 3 * * 0"),
        ),
    )
