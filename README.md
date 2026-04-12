# Avatar

Avatar 是一个基于 Python 3.12 的智能体应用骨架项目，当前提供了命令行入口与一个最小可运行的 FastAPI 服务，便于在 AgentScope 生态中继续扩展业务能力、HTTP 接口和后续子命令。

当前项目主要由以下部分组成：

- `src/avatar/cli/main.py`：项目 CLI 入口，基于 Click 实现，并通过懒加载方式注册子命令。
- `src/avatar/cli/app_cmd.py`：`avatar app` 子命令，用于启动本地 FastAPI 服务。
- `src/avatar/app/_app.py`：FastAPI 应用工厂，当前内置 `/` 与 `/health` 两个基础接口，方便本地联调与健康检查。
- `pyproject.toml`：项目元数据与依赖配置，使用 `uv` 管理环境与执行命令。

当前能力定位：

- 提供统一的命令行启动入口。
- 提供可直接运行的 Web 服务基础骨架。
- 为后续接入更多智能体能力、API 路由和服务模块保留清晰的扩展结构。

可通过以下命令启动应用：

```bash
uv run avatar app --host 127.0.0.1 --port 8000
```
