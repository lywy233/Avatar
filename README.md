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

项目结构如下：

```text
Avatar/
├── README.md
├── .env.example
├── pyproject.toml
├── src/
│   └── avatar/
│       ├── __init__.py
│       ├── agents/
│       │   ├── __init__.py
│       │   ├── model_factory.py
│       │   ├── react_agent.py
│       │   ├── hooks/
│       │   │   └── __init__.py
│       │   ├── md_files/
│       │   │   └── .gitkeep
│       │   ├── memory/
│       │   │   └── __init__.py
│       │   ├── skills/
│       │   │   └── .gitkeep
│       │   ├── tools/
│       │   │   └── __init__.py
│       │   └── utils/
│       │       └── __init__.py
│       ├── config/
│       │   ├── __init__.py
│       │   └── settings.py
│       ├── py.typed
│       ├── app/
│       │   ├── __init__.py
│       │   └── _app.py
│       └── cli/
│           ├── app_cmd.py
│           └── main.py
└── reference_codes/
```

各目录与文件职责：

- `README.md`：项目说明文档。
- `.env.example`：环境变量示例文件，用于声明本地配置项。
- `pyproject.toml`：项目依赖、构建配置与 CLI 入口声明。
- `src/avatar/__init__.py`：包入口，当前放置最基础的导出示例。
- `src/avatar/agents/`：Agent 相关模块目录，当前包含一个参考 `CoPawAgent` 思路的简化版 `react_agent.py` 实现，以及后续扩展所需的子目录骨架。
- `src/avatar/config/`：配置模块，负责从环境变量和 `.env` 文件加载应用设置。
- `src/avatar/py.typed`：标记该包支持类型提示。
- `src/avatar/app/`：Web 应用相关代码，当前主要包含 FastAPI 应用工厂。
- `src/avatar/cli/`：命令行相关代码，包含 CLI 主入口和 `app` 子命令。
- `reference_codes/`：参考代码目录，仅供参考，不参与当前项目主实现。

环境配置：

- 项目使用 `pydantic` + `pydantic-settings` 管理配置。
- 默认会读取仓库根目录下的 `.env` 文件，并使用 `AVATAR_` 作为环境变量前缀。
- 当前已提供 `port` 配置项，对应环境变量为 `AVATAR_PORT`。
- 默认 AgentScope 模型配置包括 `AVATAR_MODEL_NAME`、`AVATAR_API_KEY`、`AVATAR_BASE_URL` 和 `AVATAR_MODEL_STREAM`。

示例：

```env
AVATAR_PORT=9000
AVATAR_MODEL_NAME=gpt-4.1-mini
AVATAR_API_KEY=your-api-key
AVATAR_BASE_URL=https://your-proxy.example.com/v1
AVATAR_MODEL_STREAM=false
```

可通过以下命令启动应用：

```bash
uv run avatar app --host 127.0.0.1
```

如需覆盖配置文件中的端口，也可以显式传入：

```bash
uv run avatar app --host 127.0.0.1 --port 8000
```

当前还提供了一个最小聊天接口：

- 路由内部已改为通过 `agentscope_runtime` 的基础 `Runner` 执行当前 `AvatarReactAgent`。

```bash
curl -X POST "http://127.0.0.1:8000/api/agent/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "user_name": "demo"}'
```
