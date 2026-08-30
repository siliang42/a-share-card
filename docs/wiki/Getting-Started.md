# 快速开始 / Getting Started

[首页](Home.md) | [Web 后台](Web-Admin.md) | [架构](Architecture.md) | [数据与同步](Data-and-Sync.md) | [移动端](Mobile-App.md) | [运维](Operations.md) | [测试与排障](Testing-and-Troubleshooting.md) | [项目状态](Project-Status.md)

## 中文

### 前置条件

最短运行路径只需要 Git 和 Docker Desktop。进行源码开发时还需要：

- Node.js 22 或更高版本。
- Python 3.13 或更高版本。
- `uv`，用于 Python 依赖与命令执行。
- iOS：macOS、完整 Xcode 和 Simulator。
- Android：Android Studio、模拟器或可用设备。

### 启动本地服务

在仓库根目录运行：

```bash
docker compose -f infra/docker-compose.yml up --build -d
./scripts/smoke-local.sh
```

启动后：

- Web 后台：`http://localhost:3000`
- API 健康检查：`http://localhost:8000/health`
- 数据目录：`data/`

后台只绑定 Mac 本机；API 绑定 `8000`，供同一局域网内的手机访问。macOS 防火墙需要允许 Docker 接收该端口连接。

### 首次同步

首次启动创建空 SQLite 数据库和随机配对令牌，不会自动访问公网数据源。执行完整首次同步：

```bash
docker compose -f infra/docker-compose.yml exec worker \
  uv run --no-sync python -m app.worker sync-all
```

该命令依次同步股票范围、申万行业、东方财富概念和一批公司资料，然后发布手机数据集。公开接口可能限流，完整概念成分同步可能需要较长时间。

也可以在后台“数据同步”中分步执行，或运行单项命令：

```bash
docker compose -f infra/docker-compose.yml exec worker uv run --no-sync python -m app.worker universe
docker compose -f infra/docker-compose.yml exec worker uv run --no-sync python -m app.worker sectors
docker compose -f infra/docker-compose.yml exec worker uv run --no-sync python -m app.worker profiles
docker compose -f infra/docker-compose.yml exec worker uv run --no-sync python -m app.worker publish
```

### 配对手机

1. 在 Mac 网络设置中查看局域网 IP。
2. 打开后台 `http://localhost:3000/settings`。
3. 在 App“设置”中填写 `http://<Mac局域网IP>:8000` 和后台显示的配对令牌。
4. 保存后 App 会验证连接并同步最新离线数据集。

令牌存放在 `data/pairing-token`，文件权限为 `0600`。不要提交、截图公开或写入 CSV。

### 停止服务

```bash
docker compose -f infra/docker-compose.yml down
```

停止容器不会删除 `data/`。详细备份流程见[运维](Operations.md)。

## English

### Prerequisites

The shortest runtime path requires only Git and Docker Desktop. Source development also requires:

- Node.js 22 or later.
- Python 3.13 or later.
- `uv` for Python dependencies and commands.
- iOS: macOS, full Xcode, and Simulator.
- Android: Android Studio, an emulator, or a compatible device.

### Start Local Services

From the repository root:

```bash
docker compose -f infra/docker-compose.yml up --build -d
./scripts/smoke-local.sh
```

After startup:

- Web admin: `http://localhost:3000`
- API health: `http://localhost:8000/health`
- Data directory: `data/`

The admin binds only to the Mac. The API exposes port `8000` to phones on the same LAN. The macOS firewall must allow Docker to accept that connection.

### First Synchronization

The first start creates an empty SQLite database and a random pairing token without contacting public sources. Run the complete initial synchronization explicitly:

```bash
docker compose -f infra/docker-compose.yml exec worker \
  uv run --no-sync python -m app.worker sync-all
```

This synchronizes the stock universe, Shenwan industries, Eastmoney concepts, and one batch of company profiles before publishing the mobile dataset. Public endpoints may throttle requests, and complete concept membership synchronization can take time.

The admin also supports step-by-step synchronization, or use the individual worker commands shown in the Chinese section above.

### Pair a Phone

1. Find the Mac LAN address in macOS network settings.
2. Open `http://localhost:3000/settings`.
3. Enter `http://<Mac-LAN-IP>:8000` and the displayed pairing token in the app Settings screen.
4. Saving verifies the connection and synchronizes the latest offline dataset.

The token is stored at `data/pairing-token` with mode `0600`. Never commit it, publish it in a screenshot, or place it in CSV.

### Stop Services

```bash
docker compose -f infra/docker-compose.yml down
```

Stopping containers does not delete `data/`. See [Operations](Operations.md) for backup details.
