# 测试与故障排查 / Testing and Troubleshooting

[首页](Home.md) | [快速开始](Getting-Started.md) | [架构](Architecture.md) | [数据与同步](Data-and-Sync.md) | [移动端](Mobile-App.md) | [运维](Operations.md)

## 中文

### 常用测试

安装依赖：

```bash
make setup
```

运行 API、后台和移动端测试：

```bash
make test
```

单独运行：

```bash
make test-api
make test-web
make test-mobile
```

### 完整发布验收

```bash
./scripts/verify-all.sh
```

该脚本：

1. 运行 API 测试。
2. 构建共享 TypeScript contracts，运行后台测试、类型检查和生产构建。
3. 运行移动端测试和类型检查。
4. 构建隔离的 Docker Compose 项目，并通过生产 parser 写入五市场确定性样例。
5. 启动隔离栈并验证健康检查、认证目录和数据集。
6. 运行后台 Playwright 桌面/移动视口场景并生成截图。
7. 导出 Android Hermes bundle。
8. 条件满足时执行 iOS Maestro 断点恢复流程。

临时数据库、端口和容器项目与日常 `data/` 隔离；该验收不会主动执行公网全市场同步。

### iOS 验收条件

自动 iOS 流程要求：

- 完整 Xcode，而不是只有 Command Line Tools。
- 已启动的 Simulator。
- Maestro。
- 模拟器中已安装 `cn.gushi.memory`。

强制执行：

```bash
GUSHI_RUN_IOS=1 ./scripts/verify-all.sh
```

缺少任一条件时强制模式会失败；默认 `auto` 模式会明确跳过。

### 常见问题

#### `vitest: command not found`

仓库根目录依赖尚未安装。运行 `npm install` 或 `make setup`。

#### `Cannot find module '@gushi/contracts'`

运行 `npm --workspace @gushi/contracts run build`。完整验收脚本会在后台类型检查前自动构建 contracts。

#### Docker Hub 返回 `EOF` 或无法获取匿名令牌

这是 Docker 到镜像仓库的网络或代理问题，不是项目测试失败。先用 `docker pull node:22-alpine` 和 `docker pull python:3.13-slim` 验证链路，恢复后重新运行完整验收。

#### 默认端口被占用

为隔离验收指定其他端口：

```bash
GUSHI_VERIFY_API_PORT=18081 \
GUSHI_VERIFY_ADMIN_PORT=13012 \
./scripts/verify-all.sh
```

#### App 无法配对

确认手机与 Mac 在同一局域网、地址包含 `http://` 和端口 `8000`、Docker API 健康、macOS 防火墙允许连接，并重新从后台复制令牌。不要把真实令牌放入 Issue。

#### 同步结果为空或不完整

查看 Worker 日志与对应同步记录。公开接口可能限流；保留上一版数据集，待上游恢复后重跑失败步骤。不要把确定性五市场测试样例当作真实全市场数据。

### 已知边界

- 免费公开数据没有可用性或低延迟保证。
- iOS 原生验收只能在 macOS 完整工具链上执行。
- Android 已验证 Expo/Hermes 导出，应用商店发布不在当前范围。
- 系统是单用户局域网工具，不是公网多租户服务。

## English

### Focused Tests

Run `make setup` once, then `make test` for API, admin, and mobile tests. Use `make test-api`, `make test-web`, or `make test-mobile` for a focused suite.

### Full Release Verification

`./scripts/verify-all.sh` runs API tests; builds shared contracts; tests, type-checks, and builds the admin; tests and type-checks mobile; builds an isolated Compose stack; seeds deterministic fixtures through production parsers; runs authenticated smoke checks; runs Playwright desktop/mobile scenarios; exports Android Hermes; and conditionally runs the iOS Maestro resume flow.

The temporary database, ports, and Compose project are isolated from daily `data/`. Full verification does not trigger a live full-market synchronization.

### iOS Requirements

The automated iOS flow requires full Xcode, a booted Simulator, Maestro, and an installed `cn.gushi.memory` app. `GUSHI_RUN_IOS=1 ./scripts/verify-all.sh` makes missing prerequisites a failure; default `auto` mode reports a skip.

### Common Failures

- `vitest: command not found`: run `npm install` or `make setup` at the repository root.
- Missing `@gushi/contracts`: run `npm --workspace @gushi/contracts run build`; full verification already does this.
- Docker Hub `EOF` or token failure: verify the Docker registry/proxy path with explicit base-image pulls, then retry.
- Port conflict: set `GUSHI_VERIFY_API_PORT` and `GUSHI_VERIFY_ADMIN_PORT` to unused values.
- Pairing failure: check LAN reachability, API health, URL scheme and port, firewall access, and the current admin token without posting that token publicly.
- Empty synchronization: inspect worker logs and sync records, preserve the last release, and retry after the public source recovers.

### Known Boundaries

Free public sources have no uptime or low-latency guarantee. Native iOS verification requires a complete macOS toolchain. Android currently has Expo/Hermes export coverage, not store publication. The system is a single-user LAN tool, not a public multi-tenant service.
