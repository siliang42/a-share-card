# 运维 / Operations

[首页](Home.md) | [快速开始](Getting-Started.md) | [Web 后台](Web-Admin.md) | [架构](Architecture.md) | [数据与同步](Data-and-Sync.md) | [移动端](Mobile-App.md) | [测试与排障](Testing-and-Troubleshooting.md) | [项目状态](Project-Status.md)

## 中文

本页是快速运维索引。完整命令与风险说明以[仓库运维手册](https://github.com/siliang42/a-share-card/blob/main/docs/operations.md)为准。

### 服务管理

```bash
docker compose -f infra/docker-compose.yml up --build -d
docker compose -f infra/docker-compose.yml ps
docker compose -f infra/docker-compose.yml logs -f api worker admin
docker compose -f infra/docker-compose.yml down
```

默认端口为 API `8000`、后台 `3000`。后台只绑定 `127.0.0.1`，API 供局域网 App 访问。

### 定时任务

Worker 使用 `Asia/Shanghai`：

- 工作日 `08:00`：股票范围。
- 工作日 `16:30`：申万行业与东方财富概念。
- 周日 `03:00`：最多 200 只公司资料。

每项成功后都会发布数据集。任务使用单实例和合并错过执行策略，避免同类任务并发。

### 备份

备份前先完成 SQLite WAL checkpoint：

```bash
docker compose -f infra/docker-compose.yml exec api \
  uv run --no-sync python -c "import sqlite3; c=sqlite3.connect('/data/gushi.db'); c.execute('PRAGMA wal_checkpoint(FULL)'); c.close()"
tar -czf "gushi-backup-$(date +%Y%m%d-%H%M%S).tgz" data/
```

备份包含服务端数据库、数据集、原始快照和配对令牌。它不包含手机收藏和学习记录。备份文件含敏感令牌，不应上传到 GitHub 或公开网盘。

### 恢复

恢复会替换当前服务数据。先另做当前备份，然后停服、解压并检查：

```bash
docker compose -f infra/docker-compose.yml down
tar -xzf gushi-backup-YYYYMMDD-HHMMSS.tgz
docker compose -f infra/docker-compose.yml up -d
./scripts/smoke-local.sh
```

### 配对令牌

令牌文件是 `data/pairing-token`，要求权限 `0600`。删除文件并重启 API 会生成新令牌，所有手机需要重新配对。不要在日志、Issue、Wiki、截图、CSV 或提交中公开令牌。

### 同步故障

1. 使用 `docker compose -f infra/docker-compose.yml logs --tail=200 worker api` 定位失败任务。
2. 保留当前发布数据集，不要因上游超时删除 `data/datasets/`。
3. 上游恢复后只重跑失败的 `universe`、`sectors` 或 `profiles`。
4. 需要时再单独运行 `publish`。
5. 不要用东方财富行业字段冒充申万分类；人工 CSV 必须标明真实来源边界。

## English

This page is a compact operations index. The [repository runbook](https://github.com/siliang42/a-share-card/blob/main/docs/operations.md) is authoritative for complete commands and risk notes.

### Service Management

Use Docker Compose to start, inspect, follow logs, and stop the `api`, `worker`, and `admin` services. The API defaults to port `8000`; the admin defaults to `3000` and binds only to `127.0.0.1`.

### Schedule

In `Asia/Shanghai`, the worker refreshes the universe at `08:00` on weekdays, sectors at `16:30` on weekdays, and up to 200 company profiles at `03:00` on Sunday. Each successful job publishes a dataset.

### Backup and Restore

Checkpoint SQLite WAL before archiving `data/`. The archive contains the server database, releases, raw snapshots, and pairing token, but not phone favorites or learning history. Treat the archive as sensitive and never upload it to GitHub or public storage.

Restoration replaces current server data: create a current backup, stop the stack, extract the archive, start the stack, and run `./scripts/smoke-local.sh`.

### Token and Failure Handling

`data/pairing-token` must remain mode `0600`. Deleting it and restarting the API rotates the token and requires every phone to pair again. Never place it in logs, issues, Wiki pages, screenshots, CSV, or commits.

For source failures, inspect worker/API logs, preserve the current release, rerun only the failed job after recovery, and publish separately if needed. Never label Eastmoney industry data as Shenwan classification.
