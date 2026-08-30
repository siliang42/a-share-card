# 数据与同步 / Data and Synchronization

[首页](Home.md) | [快速开始](Getting-Started.md) | [Web 后台](Web-Admin.md) | [架构](Architecture.md) | [移动端](Mobile-App.md) | [运维](Operations.md) | [测试与排障](Testing-and-Troubleshooting.md) | [项目状态](Project-Status.md)

## 中文

### 市场范围

| 显示名称 | 内部值 | 交易所 |
| --- | --- | --- |
| 沪市主板 | `SH_MAIN` | SH |
| 深市主板 | `SZ_MAIN` | SZ |
| 创业板 | `CHINEXT` | SZ |
| 科创板 | `STAR` | SH |
| 北交所 | `BSE` | BJ |

股票主键使用交易所与六位代码组合，例如 `SH:600000`。同步器优先使用上游明确板块，缺失时再按交易所和代码规则分类。

### 板块分类

- `board`：五个交易市场，用于“股票市场”牌组。
- `shenwan`：申万行业分类，用于行业牌组。
- `eastmoney_concept`：东方财富概念分类，用于概念牌组。

旧数据中的 `concept` 会按兼容规则视为东方财富概念，但新数据统一写入 `eastmoney_concept`。

### 免费公开数据源

| 数据 | 主源 | 回退/说明 |
| --- | --- | --- |
| 股票范围、上市日期、来源行业 | 东方财富 | 按五个市场分页同步 |
| 公司简介与主营范围 | 东方财富 | 默认每周增量更新最多 200 只 |
| 概念目录与成分 | 东方财富 | 分类标记为 `eastmoney_concept` |
| 行业目录与成分 | 申万 | 分类标记为 `shenwan` |
| 当前行情 | 东方财富 | 失败时回退腾讯，之后使用最近缓存 |

这些接口不提供交易所级服务承诺，可能延迟、限流、变更或返回不完整数据。

### 同步与发布流程

1. Worker 拉取响应，同时将原始 JSON 写入 `data/raw/<date>/<source>/` 的 gzip 快照。
2. Parser 规范化股票、板块、成分和公司资料。
3. 服务写入来源字段，保留来源时间和抓取时间。
4. 人工覆盖只影响允许维护的名称、主营摘要、标签和备注；主营摘要优先使用人工值。
5. Publisher 校验股票、板块、成分引用和唯一性。
6. 规范化内容生成 16 位内容版本，发布为 `data/datasets/<version>.json.gz`。
7. 手机比较 manifest 版本与 SHA-256，只在变化时下载，并在事务中替换目录。

发布失败不会把不完整文件标记为当前版本。

### 行情策略

客户端只请求当前可见股票，服务端对同一股票至少缓存 15 秒。返回结果包含来源时间、抓取时间和新鲜度。行情不可用时不要把缓存值解释为当前成交价格。

### CSV 交换

后台支持 UTF-8 CSV 导出。可导入类型包括：

- `stock_overrides`：维护已有股票的名称、主营摘要、标签和备注。
- `manual_stocks`：维护明确标记为人工来源的股票。

导入必须先预览，检查新增、更新、未变化和拒绝行，再确认应用。上游拥有的股票不能通过 `manual_stocks` 覆盖。CSV 是交换格式，SQLite 才是权威数据源。

### 默认计划

Worker 使用 `Asia/Shanghai`：

- 工作日 `08:00`：股票范围同步并发布。
- 工作日 `16:30`：申万行业和东方财富概念同步并发布。
- 周日 `03:00`：公司资料增量同步并发布。

## English

### Market Coverage

The five internal boards are `SH_MAIN`, `SZ_MAIN`, `CHINEXT`, `STAR`, and `BSE`, covering the Shanghai Main Board, Shenzhen Main Board, ChiNext, STAR Market, and Beijing Stock Exchange. Stock IDs combine exchange and six-digit symbol, for example `SH:600000`.

### Taxonomies

- `board`: the five market decks.
- `shenwan`: Shenwan industry decks.
- `eastmoney_concept`: Eastmoney concept decks.

Legacy `concept` data is treated as Eastmoney concept data for compatibility, while new records use `eastmoney_concept`.

### Public Sources

Eastmoney is the primary source for the stock universe, listing dates, company profiles, concepts, and quotes. Shenwan supplies the industry taxonomy. Tencent is the quote fallback. These free public endpoints provide no exchange-grade service guarantee and can lag, throttle, change, or return incomplete data.

### Synchronization and Publication

The worker stores compressed raw snapshots, normalizes upstream responses, writes source-aware records, applies allowed manual overrides, validates references, and publishes deterministic versioned `json.gz` datasets. Mobile compares the manifest version and SHA-256 checksum before a transactional catalog replacement. A failed publication never becomes the current release.

### Quotes and CSV

The app requests only visible stock quotes, and the API caches each stock for at least 15 seconds. Responses carry source time, fetch time, and freshness. Cached values must not be interpreted as current trades.

CSV import is preview-first and limited to `stock_overrides` and explicitly manual stocks. CSV is an exchange format; SQLite remains authoritative.

### Default Schedule

The worker uses `Asia/Shanghai`: universe sync at `08:00` on weekdays, sector sync at `16:30` on weekdays, and incremental company-profile refresh at `03:00` on Sunday. Each successful job publishes a new validated dataset.
