# 移动端 / Mobile App

[首页](Home.md) | [快速开始](Getting-Started.md) | [Web 后台](Web-Admin.md) | [架构](Architecture.md) | [数据与同步](Data-and-Sync.md) | [运维](Operations.md) | [测试与排障](Testing-and-Troubleshooting.md) | [项目状态](Project-Status.md)

## 中文

### 技术与平台

移动端使用 React Native 0.86、Expo 57 和 Expo Router。产品以 iOS 为第一目标，同时保持同一套 TypeScript、路由、SQLite 和业务逻辑可导出到 Android。

- iOS Bundle ID：`cn.gushi.memory`
- Android Package：`cn.gushi.memory`
- 本地数据：Expo SQLite
- 配对令牌：Expo SecureStore
- 复习调度：`ts-fsrs`

### 启动开发环境

```bash
npm install
npm --workspace @gushi/mobile run start
```

指定平台：

```bash
npm --workspace @gushi/mobile run ios
npm --workspace @gushi/mobile run android
```

iOS 原生运行需要完整 Xcode；Android 需要 Android Studio、模拟器或可用设备。手机和 Mac API 必须能在同一局域网互相访问。

### 配对与离线同步

App“设置”保存两个值：

- Mac API 地址保存在本地 SQLite 设置表。
- 配对令牌保存在系统 SecureStore。

保存配对后，App 获取 manifest；版本变化时下载 gzip JSON，校验 SHA-256、版本、数量、唯一标识和板块引用，然后在事务中更新股票目录。下载失败或校验失败时保留旧目录。

### 主要页面

- 首页：继续上次牌组、今日学习统计、到期复习和市场入口。
- 市场：切换“股票市场”和“板块市场”，查看市场、申万行业和概念牌组。
- 股票列表：搜索、快速上下浏览、收藏，显示名称、代码、行情、板块和主营摘要。
- 股票详情：查看完整关键信息并进入相关牌组。
- 学习页：顺序学习或到期复习，支持两个提示方向、答案揭示、记得/再学和撤销。
- 收藏：集中浏览设备本地收藏。
- 设置：配对、同步状态和连接维护。

### 记忆与断点

- `name_to_symbol`：看到名称回忆代码。
- `symbol_to_name`：看到代码回忆名称。
- “记得”和“再学”分别映射到 FSRS 二元评分并计算下次到期时间。
- 每个牌组、每种学习模式独立保存断点；退出或终止 App 后仍从下一张继续。
- 撤销会恢复上一条卡片状态和原牌组断点。
- 今日完成、记得、再学、到期数量与连续天数来自设备本地学习事件。

### 本地数据边界

Mac 备份不包含手机学习记录。重新配对或更新股票数据集不会主动删除收藏、卡片进度或学习事件。卸载 App 或清除 App 数据会删除这些设备本地记录。

## English

### Technology and Platforms

The app uses React Native 0.86, Expo 57, and Expo Router. iOS is the first delivery target, while the same TypeScript, routing, SQLite, and domain logic remain exportable to Android.

- iOS bundle ID: `cn.gushi.memory`
- Android package: `cn.gushi.memory`
- Local data: Expo SQLite
- Pairing token: Expo SecureStore
- Review scheduling: `ts-fsrs`

### Development

```bash
npm install
npm --workspace @gushi/mobile run start
```

Use the `ios` or `android` workspace script for a specific platform. Native iOS requires full Xcode. Android requires Android Studio, an emulator, or a compatible device. The phone and Mac API must be mutually reachable on the same LAN.

### Pairing and Offline Sync

The API base URL is stored in local SQLite, while the token is stored in SecureStore. After pairing, the app fetches the manifest and downloads the gzip JSON only when its version changes. It validates SHA-256, version, counts, unique IDs, and membership references before a transactional update. Failure preserves the previous catalog.

### Main Workflows

The app provides Home, Markets, stock list and detail, Favorites, Study, and Settings. Study supports sequential and due-review sessions, both prompt directions, answer reveal, remembered/again ratings, and undo.

Each deck and study mode has its own checkpoint. FSRS card state, study events, daily totals, due count, streak, favorites, and checkpoints remain in the device database across app restarts.

### Local Data Boundary

Mac backups do not contain phone learning history. Re-pairing or replacing the stock dataset does not intentionally delete favorites, card progress, or study events. Uninstalling the app or clearing app data removes those device-local records.
