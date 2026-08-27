# 股识 Wiki / Gushi Wiki

[快速开始](Getting-Started.md) | [架构](Architecture.md) | [数据与同步](Data-and-Sync.md) | [移动端](Mobile-App.md) | [运维](Operations.md) | [测试与排障](Testing-and-Troubleshooting.md)

## 中文

股识是一套单用户、本地优先的 A 股记忆学习系统。React Native App 提供类似背单词的股票卡片、列表浏览、收藏和复习；Mac 上的 FastAPI、同步 Worker 与 Next.js 后台负责资料维护、免费公开数据同步和离线数据集发布。

### 从哪里开始

| 目标 | 建议阅读 |
| --- | --- |
| 第一次运行 | [快速开始](Getting-Started.md) |
| 理解各服务如何协作 | [系统架构](Architecture.md) |
| 了解五个市场、板块和数据源 | [数据与同步](Data-and-Sync.md) |
| 运行 iOS 或 Android App | [移动端](Mobile-App.md) |
| 备份、恢复和查看日志 | [运维](Operations.md) |
| 执行完整验收或处理故障 | [测试与故障排查](Testing-and-Troubleshooting.md) |

### 产品边界

- 覆盖沪市主板、深市主板、创业板、科创板和北交所。
- 牌组分为股票市场与板块市场；板块包括申万行业和东方财富概念。
- 股票资料与发布数据保存在 Mac 的 SQLite；收藏、学习历史和断点保存在手机。
- 首次启动不会自动抓取公网数据，必须主动执行首次同步。
- 所有运行方式基于免费软件和公开接口，不依赖付费托管、付费 Wiki 或付费行情。
- 公开行情仅供学习，不保证交易所级实时性，也不构成投资建议。

[返回仓库 README](https://github.com/siliang42/a-share-card#readme)

## English

Gushi is a single-user, local-first A-share memory-learning system. The React Native app provides flashcard study, list browsing, favorites, and review. FastAPI, a synchronization worker, and a Next.js admin on the Mac maintain reference data, synchronize free public sources, and publish offline datasets.

### Where to Start

| Goal | Read |
| --- | --- |
| Run the system for the first time | [Getting Started](Getting-Started.md) |
| Understand component collaboration | [Architecture](Architecture.md) |
| Learn about the five markets, sectors, and sources | [Data and Synchronization](Data-and-Sync.md) |
| Run the iOS or Android app | [Mobile App](Mobile-App.md) |
| Back up, restore, and inspect logs | [Operations](Operations.md) |
| Run release verification or diagnose failures | [Testing and Troubleshooting](Testing-and-Troubleshooting.md) |

### Product Boundaries

- Covers the Shanghai Main Board, Shenzhen Main Board, ChiNext, STAR Market, and Beijing Stock Exchange.
- Decks are grouped into Markets and Sectors; sectors include Shenwan industries and Eastmoney concepts.
- Stock reference data and published datasets live in SQLite on the Mac; favorites, study history, and checkpoints live on the phone.
- The first start never fetches public data automatically. The initial synchronization is explicit.
- The system uses free software and public endpoints without paid hosting, a paid Wiki, or paid market data.
- Public quotes are for learning only, are not exchange-grade, and are not investment advice.

[Back to the repository README](https://github.com/siliang42/a-share-card#readme)
