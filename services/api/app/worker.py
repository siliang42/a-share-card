import argparse
import asyncio
from dataclasses import asdict
import json
import logging
from typing import Any

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select

from app.config import Settings
from app.db import create_engine_for, create_session_factory
from app.models import Base, CompanyProfile, Stock
from app.services.profile_sync import ProfileSyncService
from app.services.publication import DatasetPublisher
from app.services.schedule import JobSchedule, build_schedule
from app.services.sector_sync import SectorSyncService
from app.services.universe_sync import UniverseSyncService
from app.sources.base import SourceUnavailable
from app.sources.eastmoney import EastmoneyConceptSource, EastmoneyProfileSource, EastmoneyStockSource
from app.sources.shenwan import ShenwanSectorSource


logger = logging.getLogger("gushi.worker")


def cron_trigger(job: JobSchedule, settings: Settings) -> CronTrigger:
    minute, hour, day, month, weekday = job.cron.split()
    weekday = {"1-5": "mon-fri", "0": "sun"}.get(weekday, weekday)
    return CronTrigger(
        minute=minute,
        hour=hour,
        day=day,
        month=month,
        day_of_week=weekday,
        timezone=settings.timezone_info,
    )


async def _universe(session) -> dict[str, Any]:
    return asdict(await UniverseSyncService(session, EastmoneyStockSource()).run())


async def _sectors(session) -> dict[str, Any]:
    shenwan = asdict(await SectorSyncService(session, ShenwanSectorSource()).run())
    concepts = asdict(await SectorSyncService(session, EastmoneyConceptSource()).run())
    return {"shenwan": shenwan, "concepts": concepts}


async def _profiles(session, settings: Settings) -> dict[str, int]:
    stock_ids = session.scalars(
        select(Stock.id)
        .outerjoin(CompanyProfile, CompanyProfile.stock_id == Stock.id)
        .order_by(CompanyProfile.fetched_at.asc().nullsfirst(), Stock.id)
        .limit(settings.profile_batch_size)
    ).all()
    updated = 0
    failed = 0
    service = ProfileSyncService(session, EastmoneyProfileSource())
    for stock_id in stock_ids:
        try:
            await service.refresh(stock_id)
            updated += 1
        except SourceUnavailable as exc:
            failed += 1
            logger.warning("profile refresh failed for %s: %s", stock_id, exc)
    return {"selected": len(stock_ids), "updated": updated, "failed": failed}


def _publish(session, settings: Settings) -> dict[str, Any]:
    return asdict(DatasetPublisher(session, settings.data_dir).publish())


async def run_job(name: str, settings: Settings | None = None) -> dict[str, Any]:
    active_settings = settings or Settings()
    engine = create_engine_for(active_settings)
    Base.metadata.create_all(engine)
    session = create_session_factory(engine)()
    try:
        if name == "universe_sync":
            result = {"universe": await _universe(session)}
        elif name == "sector_sync":
            result = {"sectors": await _sectors(session)}
        elif name == "profile_sync":
            result = {"profiles": await _profiles(session, active_settings)}
        elif name == "publish":
            return {"publication": _publish(session, active_settings)}
        elif name == "sync_all":
            result = {
                "universe": await _universe(session),
                "sectors": await _sectors(session),
                "profiles": await _profiles(session, active_settings),
            }
        else:
            raise ValueError(f"unsupported worker job: {name}")
        result["publication"] = _publish(session, active_settings)
        return result
    finally:
        session.close()
        engine.dispose()


async def run_scheduler(settings: Settings | None = None) -> None:
    active_settings = settings or Settings()
    schedule = build_schedule(active_settings)
    scheduler = AsyncIOScheduler(timezone=schedule.timezone)

    async def execute(name: str) -> None:
        try:
            result = await run_job(name, active_settings)
            logger.info("job %s completed: %s", name, json.dumps(result, default=str, ensure_ascii=False))
        except Exception:
            logger.exception("job %s failed", name)

    for job in schedule.jobs:
        scheduler.add_job(
            execute,
            trigger=cron_trigger(job, active_settings),
            args=[job.name],
            id=job.name,
            max_instances=1,
            coalesce=True,
            misfire_grace_time=3600,
            replace_existing=True,
        )
    scheduler.start()
    logger.info("worker started in %s with %d jobs", schedule.timezone.key, len(schedule.jobs))
    try:
        await asyncio.Event().wait()
    finally:
        scheduler.shutdown(wait=False)


def main() -> None:
    parser = argparse.ArgumentParser(description="股识同步 worker")
    parser.add_argument(
        "command",
        nargs="?",
        default="run",
        choices=("run", "sync-all", "universe", "sectors", "profiles", "publish"),
    )
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    if args.command == "run":
        asyncio.run(run_scheduler())
        return
    command = {
        "sync-all": "sync_all",
        "universe": "universe_sync",
        "sectors": "sector_sync",
        "profiles": "profile_sync",
        "publish": "publish",
    }[args.command]
    result = asyncio.run(run_job(command))
    print(json.dumps(result, default=str, ensure_ascii=False))


if __name__ == "__main__":
    main()
