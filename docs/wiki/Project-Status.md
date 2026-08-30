# 项目状态 / Project Status

[首页](Home.md) | [快速开始](Getting-Started.md) | [Web 后台](Web-Admin.md) | [移动端](Mobile-App.md) | [数据与同步](Data-and-Sync.md) | [架构](Architecture.md) | [运维](Operations.md) | [测试与排障](Testing-and-Troubleshooting.md)

## 中文

本页记录可复核的实现状态，不承诺任何公网部署或数据源服务等级。状态快照日期：**2026-08-30（Asia/Shanghai）**。

### 已实现并纳入代码

| 范围 | 状态 |
| --- | --- |
| React Native / Expo 移动端 | iOS 优先；同一套路由、TypeScript、SQLite 和业务逻辑可导出 Android。 |
| 两类记忆牌组 | “股票市场”和“板块市场”，覆盖五个市场、申万行业和东方财富概念。 |
| 学习功能 | 名称识代码、代码识名称、答案揭示、记得/再学、撤销、FSRS、牌组断点和继续学习。 |
| 股票浏览 | 搜索、上下快速浏览、收藏、详情、主营摘要和可用行情。 |
| Web 后台 | 数据总览、股票维护、板块目录、CSV 预览导入/导出、同步、发布和局域网配对。 |
| 服务端 | FastAPI、同步 Worker、SQLite 权威库、原始快照和版本化 gzip 手机数据集。 |

### 最近一次确定性验收

2026-08-27 的合并状态验收通过：API `41 passed, 1 skipped`，后台 `12 passed`，移动端 `27 passed`；同时完成 Android Expo/Hermes 导出、后台 Playwright 场景、链接校验、Wiki 文件一致性和远端主分支哈希校验。确定性验收使用仓库内五市场样例，不访问公网全市场数据源。

可重复执行：

```bash
make test
./scripts/verify-all.sh
```

完整 iOS 原生断点验收还需要完整 Xcode、已启动 Simulator、Maestro 和已安装 `cn.gushi.memory`；缺少条件时默认会跳过，强制执行可用 `GUSHI_RUN_IOS=1 ./scripts/verify-all.sh`。

### 本机运行状态快照

在本机 Docker 栈于 2026-08-30 只读检查到：API 健康、Web 后台健康、Worker 正在运行；SQLite 中 `stocks=0`、`sectors=155`、`dataset_releases=0`，还没有成功发布手机数据集。这表示本机尚未执行成功的真实全市场同步，不代表功能缺失，也不代表其他克隆或未来同步结果。

首次使用必须显式执行同步，详见[快速开始](Getting-Started.md)或[Web 后台](Web-Admin.md)。在未同步前，移动端不会拥有真实的全市场股票目录；不要把确定性样例或板块目录数量当作真实全市场统计。

### 免费功能与边界

- 运行依赖 Git、Docker Desktop、Node.js、Python 和公开 HTTP 接口，不使用付费托管、付费行情、订阅或 GitHub Pages。
- 东方财富是股票目录、公司资料、概念和主行情源；申万提供行业分类；腾讯提供行情回退。
- 免费公开接口可能延迟、限流、变更或返回不完整数据；行情不是交易所级实时服务。
- 项目是单用户、Mac 本地服务和同一局域网 App，不是公网多租户系统。
- Android 已有跨平台导出验证；App Store、Google Play 和生产托管发布不在当前范围。
- 股票信息和行情仅用于记忆学习，不构成证券研究、交易信号或投资建议。

### 文档与发布规则

Wiki 源文件维护在 `docs/wiki/`，发布到 GitHub 原生 Wiki 时要求文件字节一致。修改页面后应重新运行相对链接、敏感信息和 `git diff --check` 校验，再推送主仓库和 Wiki。详细命令见[测试与故障排查](Testing-and-Troubleshooting.md)和[运维手册](https://github.com/siliang42/a-share-card/blob/main/docs/operations.md)。

## English

This page records reviewable implementation state. It does not promise a public deployment or a service-level guarantee from any source. Snapshot date: **2026-08-30 (Asia/Shanghai)**.

### Implemented in the Repository

The repository contains the iOS-first React Native/Expo app with Android exportability, Markets and Sectors deck families, name/symbol prompts, reveal, remembered/again ratings, undo, FSRS, checkpoints, favorites, list/detail browsing, a Next.js admin, FastAPI, a synchronization worker, SQLite, raw snapshots, and versioned gzip mobile datasets.

### Latest Deterministic Verification

The merged state passed the 2026-08-27 deterministic verification: API `41 passed, 1 skipped`, admin `12 passed`, and mobile `27 passed`. It also covered Android Expo/Hermes export, Playwright admin scenarios, link checks, Wiki parity, and remote main-branch hash parity. The verification uses five-market repository fixtures and does not fetch the live full market.

Run it again with:

```bash
make test
./scripts/verify-all.sh
```

Native iOS resume verification requires full Xcode, a booted Simulator, Maestro, and an installed `cn.gushi.memory` app. Default `auto` mode skips it when prerequisites are missing; `GUSHI_RUN_IOS=1 ./scripts/verify-all.sh` makes it required.

### Local Runtime Snapshot

A read-only check of the local Docker stack on 2026-08-30 found a healthy API, healthy Web admin, and a running Worker. SQLite contained `stocks=0`, `sectors=155`, and `dataset_releases=0`, so no mobile dataset had been successfully published yet. This means the local checkout has not completed a live full-market synchronization; it is not a statement that the feature is absent or that future syncs will have the same counts.

The first use requires an explicit synchronization. Until it succeeds, the mobile app has no real full-market stock catalog. Do not treat deterministic fixtures or a sector-only count as live market statistics.

### Free-Only Scope and Boundaries

- The stack uses Git, Docker Desktop, Node.js, Python, and public HTTP endpoints; it does not require paid hosting, paid quotes, subscriptions, or GitHub Pages.
- Eastmoney supplies the stock universe, profiles, concepts, and primary quotes; Shenwan supplies industry taxonomy; Tencent is the quote fallback.
- Public endpoints may lag, throttle, change, or return incomplete data. Quotes are not exchange-grade real-time service.
- The project is a single-user Mac-local service with a same-LAN app, not a public multi-tenant system.
- Android export is covered; App Store, Google Play, and production hosting publication are out of scope.
- Stock data and quotes are for memory learning only, not securities research, trading signals, or investment advice.

### Documentation and Publication Rule

Wiki source files live under `docs/wiki/`. Native Wiki publication must keep the files byte-identical. After editing, rerun relative-link, sensitive-file, and `git diff --check` validation before pushing both the main repository and the Wiki. See [Testing and Troubleshooting](Testing-and-Troubleshooting.md) and the [operations runbook](https://github.com/siliang42/a-share-card/blob/main/docs/operations.md) for commands.
