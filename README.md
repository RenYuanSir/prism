<p align="center">
  <img src="prism.png" width="600" alt="PRism logo">
</p>

<h1 align="center">PRism</h1>
<p align="center">AI 驱动的 Pull Request 智能审查工具</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.4-blue" alt="TypeScript">
  <img src="https://img.shields.io/badge/React-18-61DAFB" alt="React">
  <img src="https://img.shields.io/badge/Express-4-000000" alt="Express">
  <img src="https://img.shields.io/badge/pnpm-10-yellow" alt="pnpm">
  <img src="https://img.shields.io/badge/Vitest-2-green" alt="Vitest">
  <img src="https://img.shields.io/badge/Tailwind-3-06B6D4" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT">
</p>

<p align="center">
  <a href="README_EN.md">English</a>
</p>

---

## 什么是 PRism？

PRism 是一个 AI 驱动的代码审查助手，专为 GitHub Pull Request 设计。它将多模型 AI 共识、AST 语义分析、竞态条件检测和依赖影响热力图整合到一个统一的审查管线中，帮助开发者在合并前发现潜在风险。

**命名灵感：** 棱镜（Prism）将白光分解为彩色光谱——PRism 将 Pull Request 中的多维度代码变更分解为结构化的审查结果。多个 feature 分支（彩虹色）经过分析管线后，合并为统一的审查报告（白光主线）。

## 特性

| 特性 | 说明 |
|---|---|
| **Semantic Diff** | 基于 Tree-sitter 的 AST 解析，函数/变量/import/export 级别变更追踪 |
| **Multi-Model Consensus** | 双模型并行风险分析 + 共识投票算法（文件 + 行 ±3 + 严重性匹配） |
| **Race Condition Detection** | 本地 AST 提取 + LLM 富化，时序动画可视化并发执行路径冲突 |
| **Streaming Display** | SSE 流式渐进渲染，结果按管线阶段实时推送至前端 |
| **Impact Heatmap** | 依赖影响图，清晰展示代码变更的波及范围 |
| **Review History** | 审查完成后自动持久化为 JSON 文件，支持历史回看和秒级缓存加载 |
| **URL Auto-Parse** | 粘贴 GitHub PR 链接自动解析 owner/repo/number，无需手动输入 |

## 架构

```
prism/
├── apps/
│   ├── frontend/       # React 18 + Vite + Tailwind CSS
│   │   ├── src/pages/          # PRList, ReviewResult, HistoryPage, Settings
│   │   ├── src/components/    # ConsensusView, RaceConditionTimeline, ImpactHeatmap 等
│   │   └── src/api/           # SSE 流式客户端 + REST API
│   └── backend/        # Node.js + Express
│       └── src/services/
│           ├── ai-review-pipeline.ts      # 多阶段审查管线（summary → risk → 共识 → suggestion）
│           ├── consensus-merger.ts        # 双模型共识匹配算法
│           ├── race-condition-analyzer.ts # 竞态条件模式提取
│           ├── history-store.ts           # JSON 文件持久化
│           ├── llm-client.ts / llm-config.ts  # 多厂商 LLM 抽象层
│           ├── ast-parser.ts              # Tree-sitter WASM AST 解析
│           ├── diff-analyzer.ts           # 语义差异分析
│           ├── impact-analyzer.ts         # 依赖影响图
│           └── github.ts                  # Octokit REST 客户端
├── packages/
│   └── shared/          # 共享 TypeScript 类型（120+ types）
└── pnpm-workspace.yaml  # Monorepo
```

**审查管线：**

```
summary ──▶ 并行 risk (模型 A + 模型 B) ──▶ consensus merge ──▶ suggestion
   │              │                │                │               │
   ▼              ▼                ▼                ▼               ▼
 SSE event    SSE events       SSE event        SSE event       SSE event
 阶段摘要    各模型风险发现      共识结果          修复建议         完成
```

## 技术栈

| 层级 | 技术 |
|---|---|
| Runtime | Node.js >= 18 |
| 语言 | TypeScript 5.4+ (strict) |
| 包管理 | pnpm >= 8 (monorepo workspace) |
| 前端 | React 18, Vite 5, Tailwind CSS 3 |
| 后端 | Express 4, Tree-sitter WASM, Octokit |
| LLM | OpenAI 兼容接口（支持 DeepSeek、Qwen、百炼等） |
| 测试 | Vitest 2（120 测试 / 11 文件） |
| Lint/Format | Biome |
| Git Hooks | Husky 9 + lint-staged |
| CI/CD | GitHub Actions |

## 快速开始

```bash
# 1. 安装依赖
pnpm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，填入 GitHub Token 和 LLM API Key

# 3. 启动开发服务器
pnpm dev          # Frontend (:5173) + Backend (:3001) 并行启动
```

## 环境变量

每个管线阶段（summary / risk / suggestion）可独立配置不同的 LLM 厂商和模型。

| 变量 | 必填 | 说明 |
|---|---|---|
| `GITHUB_TOKEN` | ✅ | GitHub 个人访问令牌 |
| `LLM_SUMMARY_PROVIDER` | ✅ | 摘要阶段 Provider（如 `openai-compatible`） |
| `LLM_SUMMARY_API_KEY` | ✅ | 摘要阶段 API Key |
| `LLM_SUMMARY_MODEL` | ✅ | 摘要阶段模型名 |
| `LLM_RISK_PROVIDER` | ✅ | 风险分析 Provider |
| `LLM_RISK_API_KEY` | ✅ | 风险分析 API Key |
| `LLM_RISK_MODEL` | ✅ | 风险分析模型名 |
| `LLM_SUGGESTION_PROVIDER` | ✅ | 建议生成 Provider |
| `LLM_SUGGESTION_API_KEY` | ✅ | 建议生成 API Key |
| `LLM_SUGGESTION_MODEL` | ✅ | 建议生成模型名 |
| `LLM_*_BASE_URL` | 否 | 自定义 API 地址（用于 OpenAI 兼容服务） |
| `PORT` | 否 | 后端端口（默认 3001） |

**支持的 Provider：** `anthropic` | `google` | `openai` | `openai-compatible`

`openai-compatible` 模式支持任意 OpenAI 兼容接口服务，设置 `LLM_*_BASE_URL` 指向服务地址即可。

## API 端点

| 端点 | 方法 | 说明 |
|---|---|---|
| `/api/health` | GET | 健康检查 |
| `/api/pr/:owner/:repo/:number` | GET | 获取 PR 元数据、diff 和语义分析 |
| `/api/review/:owner/:repo/:number` | POST | 完整 AI 审查（阻塞式，一次性返回） |
| `/api/review/:owner/:repo/:number/stream` | POST | SSE 流式 AI 审查（渐进式推送结果） |
| `/api/impact/:owner/:repo/:number` | POST | 依赖影响热力图 |
| `/api/history` | GET | 审查历史列表 |
| `/api/history/:id` | GET | 按 ID 获取历史审查详情 |

## 脚本 & 测试

```bash
# 开发
pnpm dev              # 全部启动
pnpm dev:frontend     # 仅前端 (5173)
pnpm dev:backend      # 仅后端 (3001)

# 构建
pnpm build            # 构建全部
pnpm build:shared     # 仅 shared 包

# 质量
pnpm lint             # Biome 检查
pnpm lint:fix         # 自动修复
pnpm typecheck        # TypeScript 严格检查
pnpm test             # 运行全部 120 测试
pnpm test -- --watch  # 监听模式
```

## CI/CD

GitHub Actions 在每个 PR 上运行：
1. **Quality** — `pnpm lint` + `pnpm typecheck`
2. **Test** — `pnpm test`（120 tests）
3. **Build** — `pnpm build`

三项全部通过方可合并。

## Git 工作流

1. 从 `main` 创建分支：`git checkout -b feat/description`
2. 编码 + 测试
3. `pnpm typecheck && pnpm lint && pnpm test` — 全部通过
4. Conventional Commits：`feat:` `fix:` `chore:` `docs:` `test:`
5. Push 并创建 PR — CI 强制执行质量门禁

## 许可证

MIT
