# Web 后台 / Web Admin

[首页](Home.md) | [快速开始](Getting-Started.md) | [移动端](Mobile-App.md) | [数据与同步](Data-and-Sync.md) | [架构](Architecture.md) | [运维](Operations.md) | [测试与排障](Testing-and-Troubleshooting.md) | [项目状态](Project-Status.md)

## 中文

Web 后台是运行在 Mac 上的 Next.js 数据维护台。它只绑定 `127.0.0.1:3000`，不提供公网多用户登录；后台通过服务端读取配对令牌并访问 FastAPI。手机配对使用 API 的局域网地址和令牌，具体步骤见[快速开始](Getting-Started.md)。

### 进入后台

```bash
docker compose -f infra/docker-compose.yml up --build -d
open http://localhost:3000
```

如果页面无法打开，先运行 `./scripts/smoke-local.sh`，再查看 `docker compose -f infra/docker-compose.yml logs --tail=200 api admin worker`。默认 API 端口为 `8000`，后台端口为 `3000`；端口被占用时按[运维手册](https://github.com/siliang42/a-share-card/blob/main/docs/operations.md)调整 Compose 环境变量。

### 页面与用途

| 页面 | 作用 |
| --- | --- |
| 数据总览 `/` | 查看股票数、板块数、待确认数、当前数据集版本、数据源说明和最近同步记录。 |
| 股票维护 `/stocks` | 按名称或代码搜索，按五个市场或板块过滤，浏览行情与主营摘要，点击股票打开人工覆盖编辑器。 |
| 板块目录 `/sectors` | 在申万行业和东方财富概念之间切换，按名称搜索并查看成分股数量。 |
| 导入导出 `/imports` | 下载有效股票、人工覆盖和本地补充股票 CSV；上传 CSV 后先预览差异，再确认应用。 |
| 连接设置 `/settings` | 查看本机 API 地址、配对二维码和令牌，用于手机 App 配对。 |

### 推荐同步顺序

首次或较大范围更新时，在“数据总览”依次点击：

1. **同步股票目录**：从东方财富更新五个市场的股票范围。
2. **同步申万行业**：写入 `shenwan` 行业分类和成分关系。
3. **同步概念板块**：写入 `eastmoney_concept` 概念分类和成分关系。
4. **发布手机数据集**：校验引用和唯一性后生成版本化 `json.gz`，手机下次同步才会看到变更。

公司主营资料由 Worker 的 `profiles` 命令按批次补充，后台当前没有单独的资料按钮：

```bash
docker compose -f infra/docker-compose.yml exec worker \
  uv run --no-sync python -m app.worker profiles
docker compose -f infra/docker-compose.yml exec worker \
  uv run --no-sync python -m app.worker publish
```

公开接口可能限流或返回不完整数据。同步失败时保留当前已发布数据集，待上游恢复后只重跑失败步骤。

### 股票维护

股票表一次加载最多 50 行，可点击“加载更多”。搜索支持名称和代码；市场筛选对应沪市主板、深市主板、创业板、科创板和北交所；板块筛选使用当前目录中的板块名称。表格展示名称、代码、价格、涨跌、市场、板块、主营摘要和生效来源。

后台只为当前可见行请求行情，并按至少 15 秒的间隔刷新。东方财富行情失败时 API 回退腾讯；仍不可用时显示最近缓存或 `--`。缓存行情必须按新鲜度理解，不能当作交易所当前成交价。

点击股票名称或行尾箭头可打开编辑器。人工可维护字段包括名称、主营摘要（最多 240 字）、标签和个人备注；外部源字段仍保留，人工摘要显示为 `人工生效`。保存后要重新执行“发布手机数据集”。

### 板块与 CSV

“板块目录”中的 `申万行业` 与 `概念板块` 是两个独立体系，不能把东方财富行业字段标成申万分类。CSV 支持两种类型：

- `stock_overrides`：为已有股票补充名称、主营摘要、标签和备注。
- `manual_stocks`：加入明确标记为人工来源的股票。

导入流程是“选择类型 → 上传 UTF-8 CSV → 生成变更预览 → 检查新增、更新、未变化和拒绝行 → 确认应用 → 发布数据集”。SQLite 是权威存储，CSV 只用于交换和补充；上游拥有的股票不能用 `manual_stocks` 覆盖。

### 配对与安全

在“连接设置”显示二维码或复制连接信息后，让 iPhone/Android 与 Mac 处于同一局域网，在 App 设置中填写 API 地址并扫描/输入令牌。令牌来自 `data/pairing-token`，文件权限为 `0600`。不要把令牌写进 Issue、Wiki、截图、CSV 或 Git 提交。

## English

The Web admin is a Next.js maintenance console running on the Mac. It binds only to `127.0.0.1:3000` and is not a public multi-user login. The server reads the pairing token and proxies requests to FastAPI. Pair the phone with the API LAN address and token as described in [Getting Started](Getting-Started.md).

### Open the Admin

```bash
docker compose -f infra/docker-compose.yml up --build -d
open http://localhost:3000
```

If the page does not open, run `./scripts/smoke-local.sh` and inspect `docker compose -f infra/docker-compose.yml logs --tail=200 api admin worker`. The default API port is `8000` and the admin port is `3000`; see the [operations runbook](https://github.com/siliang42/a-share-card/blob/main/docs/operations.md) for port overrides.

### Pages and Responsibilities

| Page | Responsibility |
| --- | --- |
| Dashboard `/` | Shows stock and sector counts, pending confirmations, current dataset version, source notes, and recent sync runs. |
| Stock maintenance `/stocks` | Searches by name or symbol, filters by the five boards or sector, shows quotes and summaries, and opens manual overrides. |
| Sector catalog `/sectors` | Switches between Shenwan industries and Eastmoney concepts, with name search and member counts. |
| Imports and exports `/imports` | Downloads stock and override CSVs; previews an uploaded CSV before applying it. |
| Connection settings `/settings` | Shows the Mac API address, pairing QR code, and token for the mobile app. |

### Recommended Sync Order

From the Dashboard, run **Sync stock universe**, **Sync Shenwan industries**, **Sync concept sectors**, and finally **Publish mobile dataset**. The `profiles` worker command refreshes company summaries in batches because the admin has no separate profile button:

```bash
docker compose -f infra/docker-compose.yml exec worker \
  uv run --no-sync python -m app.worker profiles
docker compose -f infra/docker-compose.yml exec worker \
  uv run --no-sync python -m app.worker publish
```

Public endpoints can throttle or return incomplete data. A failed job preserves the current published dataset; retry only the failed step after the source recovers.

### Stocks, Sectors, and CSV

The stock table loads up to 50 rows at a time and can load more. Search accepts names and symbols. Board filters cover the Shanghai Main Board, Shenzhen Main Board, ChiNext, STAR Market, and Beijing Stock Exchange. The table shows name, symbol, price, change, board, sector, business summary, and effective source.

Quotes are requested only for visible rows and refresh no faster than every 15 seconds. Eastmoney is the primary quote source, Tencent is the fallback, and the last cached value is retained when both fail. Treat cached quotes as stale learning data, not as the current exchange trade.

The sector catalog keeps `shenwan` and `eastmoney_concept` separate. CSV supports `stock_overrides` for existing-stock edits and `manual_stocks` for explicitly manual records. The import flow is preview-first; SQLite remains authoritative and CSV is only an exchange format.

### Pairing and Security

Show the QR code or copy connection details from Connection Settings, keep the phone and Mac on the same LAN, and enter or scan the API address and token in the app. The token is generated in `data/pairing-token` with mode `0600`. Never place it in an issue, Wiki, screenshot, CSV, or Git commit.
