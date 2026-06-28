# 抖音创作者中心 AI Demo

一个从零搭建的 monorepo demo，用来验证“动态 AI 分析模块 + 数据聊天 Agent”的创作者中心体验。

## 快速开始

```bash
pnpm install
pnpm dev
```

默认启动：

- Web: http://127.0.0.1:5174
- API: http://127.0.0.1:8787

桌面壳单独启动：

```bash
pnpm dev:desktop
```

## AI 配置

当前 AI 聊天主路径支持流式输出：前端通过 `/api/chat/stream` 接收 AI SDK UI message stream。配置了真实 LLM 时会透传上游文本流；没有 `LLM_API_KEY` 时会使用本地确定性 Agent 回复，并按句子分片输出，方便本地开发继续验证 UI。

默认 `pnpm dev` 只启动 Web 和 API。要接完整链路，在根目录创建 `.env`：

```bash
LLM_API_KEY=your-key
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
LLM_PROVIDER_NAME=openai-compatible
LLM_TIMEOUT_MS=30000

DATA_KERNEL_URL=http://127.0.0.1:8790
DATA_KERNEL_TOKEN=local-dev-token
DATA_KERNEL_REQUIRE_TOKEN=1

AGENT_CHECKPOINT_URL=
PORT=8787
WEB_ORIGIN=http://127.0.0.1:5174
```

本地完整开发可以开两个终端：

```bash
pnpm dev:kernel
pnpm dev
```

如果要同时验证 Postgres checkpoint、data-kernel 和 API 容器链路，可以使用 Docker Compose：

```bash
docker compose up --build postgres data-kernel api
```

`AGENT_CHECKPOINT_URL` 为空时，Agent checkpoint 会回退到进程内 memory；设置为 Postgres 连接串后可恢复审批中的线程状态。`DATA_KERNEL_URL` 为空时，Agent 会跳过 Python 数据工具证据，只使用 mock 创作者数据和 AI 模块诊断。

## 项目结构

```txt
apps/
  web/        React + Vite 主体验
  api/        Fastify 薄后端，负责诊断和 LLM 代理
  desktop/    Electron 壳，加载同一套 Web UI

packages/
  data-contracts/  Zod schemas 和公共类型
  mock-data/       3 类创作者 mock 数据
  ai-modules/      动态 AI 模块注册表
  agent-core/      Agent prompt、上下文和 mock fallback
  ui/              共享 UI 组件
```

## 验证命令

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm test:ai-smoke
```

`pnpm test:ai-smoke` 会启动真实 FastAPI data-kernel，并用本地 fake OpenAI-compatible LLM 验证 `/api/chat/stream` 返回 LLM 分片、AgentRun 和 data-kernel 证据。默认 Python 路径是 `/tmp/creator-data-kernel-venv/bin/python`，也可以用 `DATA_KERNEL_PYTHON=/path/to/python pnpm test:ai-smoke` 指定。
