# Avatar

## 版本说明
当前为学习测试版本，暂未可以实际使用。

## 应用说明

Avatar 是一个基于 Python 3.12 的智能体应用项目，当前同时包含 FastAPI 后端、React + Vite 前端，以及围绕 AgentScope 构建的智能体执行、技能管理、文件系统访问和模型提供方配置能力。

当前项目主要由以下部分组成：

- `src/avatar/app/`：FastAPI 应用主入口，整合鉴权、Agent 聊天、技能中心、文件系统和模型提供方等后端路由。
- `src/avatar/agents/`：Agent 相关实现，包括 `AvatarReactAgent`、模型工厂、工具与运行时上下文。
- `src/avatar/config/`：应用配置、运行配置与用户配置的加载入口。
- `src/avatar/cli/`：项目 CLI 入口，当前通过 `avatar app` 启动本地服务。
- `web/`：React + Vite 前端工程，承载聊天、技能中心、文件系统、模型配置和设置等页面。
- `tests/`：后端接口与工具相关测试。
- `pyproject.toml`：项目元数据与 Python 依赖配置，使用 `uv` 管理环境与执行命令。

当前能力定位：

- 提供统一的命令行启动入口与 FastAPI 服务进程。
- 提供可直接运行的 Web 管理界面与后端 API。
- 提供 Agent 对话、技能管理、文件系统操作、模型提供方配置等基础能力。
- 为后续接入更多智能体能力、页面模块和服务组件保留清晰的扩展结构。

项目结构如下：

```text
Avatar/
├── README.md
├── .env.example
├── docs/
│   └── frontend/
├── pyproject.toml
├── src/
│   └── avatar/
│       ├── __init__.py
│       ├── agents/
│       │   ├── __init__.py
│       │   ├── agent_context.py
│       │   ├── model_factory.py
│       │   ├── react_agent.py
│       │   ├── hooks/
│       │   ├── md_files/
│       │   ├── memory/
│       │   ├── skills/
│       │   ├── tools/
│       │   └── utils/
│       ├── app/
│       │   ├── __init__.py
│       │   ├── _agent_app.py
│       │   ├── _app.py
│       │   ├── _lifespan.py
│       │   ├── auth/
│       │   ├── router/
│       │   │   ├── auth_router.py
│       │   │   ├── file_system_router.py
│       │   │   ├── model_provider_router.py
│       │   │   ├── skills_hub_router.py
│       │   │   ├── user_config_settings_router.py
│       │   │   ├── file_system/
│       │   │   ├── model_provider/
│       │   │   └── skills_hub/
│       │   ├── runner/
│       │   └── utils/
│       ├── cli/
│       │   ├── app_cmd.py
│       │   └── main.py
│       ├── config/
│       │   ├── __init__.py
│       │   ├── app_config.py
│       │   ├── runnning_config.py
│       │   └── user_config.py
│       ├── exceptions.py
│       └── py.typed
├── tests/
│   ├── agents/
│   └── app/
├── web/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── pages/
│   ├── components.json
│   ├── package.json
│   └── vite.config.ts
└── reference_codes/
```

以上结构省略了 `node_modules/`、`dist/`、`__pycache__/`、`.venv/` 等依赖、缓存和构建产物目录。

各目录与文件职责：

- `README.md`：项目说明文档。
- `.env.example`：环境变量示例文件，用于声明本地配置项。
- `docs/frontend/`：前端结构与约定文档。
- `pyproject.toml`：Python 项目依赖、构建配置与 CLI 入口声明。
- `src/avatar/agents/`：Agent 相关实现目录，包含 Agent 主体、模型工厂、工具、技能与运行上下文。
- `src/avatar/app/`：FastAPI 应用目录，负责应用装配、生命周期管理、鉴权、路由注册与运行时调用。
- `src/avatar/app/router/`：后端 HTTP 路由入口，按鉴权、文件系统、技能中心、模型提供方和用户配置等能力拆分。
- `src/avatar/app/auth/`：本地鉴权相关依赖、模型、服务与存储实现。
- `src/avatar/app/runner/`：Agent 运行过程中的会话与执行封装。
- `src/avatar/cli/`：命令行相关代码，包含 CLI 主入口和 `app` 子命令。
- `src/avatar/config/`：应用配置、运行配置和用户配置的加载与持久化入口。
- `tests/`：后端接口与工具相关测试。
- `web/`：React + Vite 前端工程，包含页面、组件、hooks 与前端公共库。
- `reference_codes/`：参考代码目录，仅供参考，不参与当前项目主实现。

环境配置：

- 项目使用 `pydantic` + `pydantic-settings` 管理配置。
- 默认会读取仓库根目录下的 `.env` 文件，并使用 `AVATAR_` 作为环境变量前缀。
- 当前已提供 `port` 配置项，对应环境变量为 `AVATAR_PORT`。
- 默认 AgentScope 模型配置包括 `AVATAR_MODEL_NAME`、`AVATAR_API_KEY`、`AVATAR_BASE_URL`。

示例：

```env
AVATAR_PORT=18088
AVATAR_MODEL_NAME=gpt-4.1-mini
AVATAR_API_KEY=your-api-key
AVATAR_BASE_URL=https://your-proxy.example.com/v1
```

可通过以下命令启动应用：

```bash
uv run avatar app --host 127.0.0.1
```

如需覆盖配置文件中的端口，也可以显式传入：

```bash
uv run avatar app --host 127.0.0.1 --port 8000
```
