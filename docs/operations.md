# 股识本地运行与维护

股识是单用户、本地优先系统。Docker Compose 在 Mac 上运行 API、同步 worker 和 Web 后台；App 的离线数据、收藏和学习记录保存在手机，行情与资料更新通过同一局域网访问 Mac。

## 启动

要求 Docker Desktop 已启动。进入仓库根目录后执行：

```bash
docker compose -f infra/docker-compose.yml up --build -d
./scripts/smoke-local.sh
```

服务地址：

- Web 后台：`http://localhost:3000`，只绑定 Mac 本机。
- API：`http://<Mac局域网IP>:8000`，供同一局域网内的 App 访问。
- 数据目录：仓库的 `data/`，映射为容器内 `/data`。

查看状态和日志：

```bash
docker compose -f infra/docker-compose.yml ps
docker compose -f infra/docker-compose.yml logs -f api worker admin
```

停止服务不会删除数据：

```bash
docker compose -f infra/docker-compose.yml down
```

## 首次同步

首次启动只创建数据库和配对令牌，不会自动访问公开数据源。可在后台“数据同步”按顺序执行股票、申万、概念、发布，也可运行：

```bash
docker compose -f infra/docker-compose.yml exec worker \
  uv run --no-sync python -m app.worker sync-all
```

全量概念成分和公司资料会受公开接口速度、限流和可用性影响。worker 的默认计划使用 `Asia/Shanghai`：

- 工作日 `08:00` 更新股票范围并发布。
- 工作日 `16:30` 更新申万行业和东方财富概念并发布。
- 周日 `03:00` 增量刷新最多 200 只公司资料并发布。

单独执行任务：

```bash
docker compose -f infra/docker-compose.yml exec worker uv run --no-sync python -m app.worker universe
docker compose -f infra/docker-compose.yml exec worker uv run --no-sync python -m app.worker sectors
docker compose -f infra/docker-compose.yml exec worker uv run --no-sync python -m app.worker profiles
docker compose -f infra/docker-compose.yml exec worker uv run --no-sync python -m app.worker publish
```

## App 配对

1. 在 Mac“系统设置 → 网络”查看当前 Wi-Fi 局域网 IP，例如 `192.168.1.8`。
2. 打开后台 `http://localhost:3000/settings`，显示或复制配对令牌。
3. 在 App“设置”填写 `http://192.168.1.8:8000` 和配对令牌，保存后会立即同步离线数据集。
4. iPhone 与 Mac 必须在同一局域网；macOS 防火墙需允许 Docker 的 `8000` 端口。

配对令牌首次启动时随机生成在 `data/pairing-token`，权限为 `0600`。不要把它提交到 Git、截图发布或放入 CSV。删除该文件并重启 API 会生成新令牌，旧 App 需要重新配对。

## CSV 导入导出

后台“导入导出”支持 UTF-8 CSV。导入先生成差异预览；只有确认后才应用。建议流程：

1. 导出当前数据作为基线。
2. 保留英文列名，只修改允许人工维护的字段。
3. 上传并检查新增、更新、未变化、拒绝行数。
4. 修正所有拒绝行后再应用。
5. 执行“发布数据集”，手机下次同步才会收到变更。

CSV 是交换格式，SQLite 才是权威存储；不要直接用表格覆盖数据库。

## 备份与恢复

备份前让 SQLite 完成 WAL 检查点，并保存数据库、数据集、原始快照和令牌：

```bash
docker compose -f infra/docker-compose.yml exec api \
  uv run --no-sync python -c "import sqlite3; c=sqlite3.connect('/data/gushi.db'); c.execute('PRAGMA wal_checkpoint(FULL)'); c.close()"
tar -czf "gushi-backup-$(date +%Y%m%d-%H%M%S).tgz" data/
```

恢复时先停服务，再把备份的 `data/` 放回原位置后启动并运行冒烟检查：

```bash
docker compose -f infra/docker-compose.yml down
tar -xzf gushi-backup-YYYYMMDD-HHMMSS.tgz
docker compose -f infra/docker-compose.yml up -d
./scripts/smoke-local.sh
```

恢复会覆盖当前服务数据，操作前先另做一份当前 `data/` 备份。手机学习记录不在 Mac 数据库中，不会被该备份恢复或覆盖。

## 行情与数据源故障

行情只请求当前可见股票，至少间隔 15 秒。主源失败时 API 尝试腾讯回退；仍失败则保留最后缓存并在 App 标注“缓存行情”。公开数据仅供学习，不构成投资建议，也不保证交易所级实时性。

同步失败时：

1. 查看 `docker compose -f infra/docker-compose.yml logs --tail=200 worker api`。
2. 在后台确认失败的是股票、申万、概念、公司资料还是发布步骤。
3. 不要删除当前数据集；发布采用先验证后替换，失败不会覆盖手机可用版本。
4. 上游恢复后重跑对应单项任务，再单独执行 `publish`。
5. 申万接口不可用时，可使用明确标记为申万分类的人工 CSV；不要把东方财富行业字段冒充申万行业。

## 常用校验

```bash
docker compose -f infra/docker-compose.yml config
./scripts/smoke-local.sh
make test
```
