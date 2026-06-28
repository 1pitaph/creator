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

默认没有 `LLM_API_KEY` 时，聊天接口会自动使用 mock Agent 回复。要接真实 OpenAI-compatible 接口，在根目录创建 `.env`：

```bash
LLM_API_KEY=your-key
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
PORT=8787
WEB_ORIGIN=http://127.0.0.1:5174
```

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
```
