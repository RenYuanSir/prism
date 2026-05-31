<p align="center">
  <img src="prism.png" width="800" alt="PRism logo">
</p>
<p align="center"><strong>AI 驱动的 GitHub Pull Request 智能代码审查平台</strong></p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.4-blue" alt="TypeScript">
  <img src="https://img.shields.io/badge/React-18-61DAFB" alt="React">
  <img src="https://img.shields.io/badge/Express-4-000000" alt="Express">
  <img src="https://img.shields.io/badge/pnpm-10-yellow" alt="pnpm">
  <img src="https://img.shields.io/badge/Vitest-2-green" alt="Vitest">
  <img src="https://img.shields.io/badge/Tailwind-3-06B6D4" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT">
</p>

---

## 什么是 PRism？

PRism 是一个 AI 驱动的代码审查助手，专为 GitHub Pull Request 设计。它将 **多模型 AI 共识**、**AST 语义分析**、**竞态条件检测**和**依赖影响热力图**整合到一个统一的审查管线中，通过 SSE 流式实时推送到前端，帮助开发者在合并前发现潜在风险。

**命名灵感：** 棱镜（Prism）将白光分解为彩色光谱——PRism 将 Pull Request 中的多维度代码变更分解为结构化的审查结果。多个 feature 分支（彩虹色）经过分析管线后，合并为统一的审查报告。

## 核心设计理念

### 不替代人类，而是放大人类

AI 审查工具的最大价值不在于"替代人工审查"，而在于**让审查者把有限的时间花在真正需要人类判断的问题上**。PRism 不输出 ESLint 级别的风格建议——它专注于语义级别的深度分析：竞态条件、跨模块依赖破坏、逻辑漏洞、AI 生成代码的隐蔽缺陷。每个发现都附带**可解释的推理过程**，让审查者理解"为什么这是一个问题"而非盲信 AI 的结论。

### 模型选择策略：差异化互补 > 单一最优

2026 年的 LLM 格局表明：**没有单一模型在所有维度上获胜**。Claude 擅长多文件逻辑推理，但成本较高；微调过的快速模型对常见缺陷检出率高，但在复杂推理上可能遗漏。

PRism 采用**四模型分工架构**——不是简单地"多调几次 API"，而是为每个阶段匹配最合适的能力：

| 阶段 | 模型角色 | 推荐模型 | 选型依据 |
|------|---------|---------|---------|
| **Summary** | 快速概览 | `deepseek-v4-pro` | 需要准确理解 PR 意图，大模型的长上下文理解更稳定 |
| **Risk (Model 1)** | 主风险扫描 | `deepseek-v4-flash` | 快速、低成本、对常见缺陷模式覆盖好 |
| **Risk (Model 2)** | 交叉验证 | `kimi-k2.6` | 与 Model 1 异构，提供不同的分析视角增强共识可靠性 |
| **Suggestion** | 修复建议 | `qwen3.6-plus` | 代码生成场景，平衡质量与速度 |

两个 Risk 模型并行运行后通过**共识合并算法**（文件 + 行号 ±3 + 严重性匹配）交叉验证——双方一致确认的标记为 Consensus，仅一方发现的单独列出供人工判断。这种方式的核心价值在于**误报控制**：一个模型可能产生误报，但两个异构模型在同一行代码上独立达成一致的误报概率极低。

### 上下文获取方式：三层渐进式

审查深度与上下文范围是一对核心矛盾——给 LLM 的上下文越多，分析越全面，但 token 消耗和响应时间也越高。PRism 采用**分层上下文策略**：

```
Layer 1: 文件内上下文
  └── AST 解析 → 函数/类级别的语义变更描述 → 喂给 LLM
  └── 而非原始 git diff 文本
  └── 实现：Tree-sitter WASM 解析

Layer 2: 调用链分析
  └── 跨文件 import/export 依赖图构建
  └── 识别变更函数的所有调用者与被调用者
  └── 实现：impact-analyzer (静态依赖追踪)

Layer 3: 竞态上下文
  └── 异步函数 + Promise 链 + 共享状态访问模式提取
  └── 注入到 Risk 阶段的 prompt 中
  └── 实现：race-condition-analyzer
```

这种策略的意义在于：Layer 1 解决"这个函数改了什么"（准确性），Layer 2 解决"改了之后会影响谁"（上下文理解），Layer 3 解决"并发执行时会不会出问题"（深度推理）。三层组合不需要全仓库索引，token 消耗可控，同时在 Demo 中足以展示超越常规 diff 分析的能力。

### 未来扩展方向

```
MVP (当前)
├── 语义化 Diff (Tree-sitter AST)
├── 四模型 Pipeline (Summary → Risk×2 → Consensus → Suggestion)
├── 竞态条件检测 + 执行路径可视化
├── 跨文件影响热力图 (静态依赖分析)
├── SSE 流式实时渲染
├── 审查历史持久化 + 设置管理
└── 明暗主题 + 棱镜光谱动效

V1 (近期规划)
├── 增量审查 (每次 push 更新，只分析新增变更)
├── 历史相似 PR 风险预警 (向量嵌入 + 相似度检索)
├── 审查质量自评分与趋势分析
├── 双模型共识置信度可视化增强
├── PR 评论自动回写 GitHub (GitHub Suggestion 格式)
└── 支持 GitLab + Gitee

V2 (中期愿景)
├── IDE 插件 (VS Code Extension)
├── 团队自定义审查规则 (YAML 配置)
├── AI 生成代码专项审查 (幻觉检测：调用不存在 API、引用未定义符号)
├── 运行时行为分析集成 (可选的动态分析)
└── 开放 API + Webhook 事件流
```

## 特性

| 特性 | 说明 |
|---|---|
| **Semantic Diff** | 基于 Tree-sitter WASM 的 AST 解析，函数/import/export 级别变更追踪，非文本 diff |
| **Multi-Model Consensus** | 双模型并行风险分析 + 共识投票算法（文件 + 行号 ±3 + 严重性匹配），降低误报率 |
| **Race Condition Detection** | 本地 AST 提取并发模式 + LLM 富化执行路径，时序动画可视化冲突点 |
| **Impact Heatmap** | 基于 import/export 的依赖影响图，变更影响评分 + 依赖关系详情面板 |
| **SSE Streaming** | Server-Sent Events 流式渐进渲染，Pipeline 每阶段结果实时推送至前端 |
| **Review History** | 审查完成后自动持久化为 JSON 文件，支持历史回看和秒级缓存加载 |
| **URL Auto-Parse** | 粘贴 GitHub PR 链接自动解析 owner/repo/number，支持多种 URL 格式 |
| **Light/Dark Theme** | 完整双色彩体系，棱镜光谱渐变 + 玻璃拟态材质 + GPU 合成折射光效动效 |
| **LLM Settings** | 四阶段独立配置 Provider（6 预设 + Custom），API Key 安全脱敏，后端持久化 |

## 技术栈

| 层级 | 技术 |
|---|---|
| Runtime | Node.js >= 18 |
| 语言 | TypeScript 5.4 (strict mode) |
| 包管理 | pnpm >= 8 (monorepo workspace) |
| 前端 | React 18, Vite 5, Tailwind CSS 3, framer-motion |
| 后端 | Express 4, Tree-sitter WASM, Octokit |
| LLM 抽象 | 统一接口支持 Anthropic / Google / OpenAI / OpenAI-compatible |
| 测试 | Vitest 2 (140 tests / 13 文件) |
| Lint/Format | Biome |
| Git Hooks | Husky 9 + lint-staged (pre-commit: format + typecheck + test) |
| CI/CD | GitHub Actions (Quality → Test → Build) |

## 架构

```
prism/
├── apps/
│   ├── frontend/          # React 18 + Vite 5 + Tailwind CSS
│   │   ├── src/pages/             # PRList, ReviewResult, HistoryPage, SettingsPage
│   │   ├── src/components/        # ConsensusView, RaceConditionTimeline, ImpactHeatmap 等
│   │   └── src/api/               # SSE 流式客户端 + REST API
│   └── backend/           # Node.js + Express
│       └── src/services/
│           ├── ai-review-pipeline.ts        # 多阶段审查管线 (summary → risk×2 → consensus → suggestion)
│           ├── consensus-merger.ts          # 双模型共识匹配算法 (文件 + 行 ±3 + 严重性)
│           ├── race-condition-analyzer.ts   # 竞态条件模式提取与候选检测
│           ├── impact-analyzer.ts           # 跨文件依赖图构建与影响评分
│           ├── diff-analyzer.ts             # AST 语义差异分析
│           ├── ast-parser.ts                # Tree-sitter WASM 解析器 (TS/TSX/JS)
│           ├── llm-client.ts                # 多厂商 LLM 抽象层 (Anthropic/Google/OpenAI)
│           ├── llm-config.ts                # 四阶段 Provider 配置 + 缓存
│           ├── history-store.ts             # 审查结果 JSON 文件持久化
│           ├── settings-store.ts            # LLM 设置 JSON 文件持久化
│           └── github.ts                    # Octokit REST 客户端
├── packages/
│   └── shared/             # 共享 TypeScript 类型 (120+ types) + 工具函数
└── pnpm-workspace.yaml     # Monorepo
```

**审查管线：**

```
  ┌──────────┐     ┌─────────────────────┐     ┌───────────┐     ┌────────────┐
  │ Summary  │ ──▶ │   Risk (并行)        │ ──▶ │ Consensus │ ──▶ │ Suggestion │
  │          │     │  Model 1 │ Model 2   │     │   Merge   │     │            │
  └──────────┘     └─────────────────────┘     └───────────┘     └────────────┘
       │               │          │                 │                 │
       ▼               ▼          ▼                 ▼                 ▼
   SSE event       SSE events  SSE event       SSE event         SSE event
   阶段摘要       各模型发现    共识结果         修复建议           完成
```

每个事件通过 SSE 实时推送到前端，支持 AbortController 取消。

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

每个管线阶段（summary / risk / gemini / suggestion）可独立配置不同的 LLM 厂商和模型。

| 变量 | 必填 | 说明 |
|---|---|---|
| `GITHUB_TOKEN` | ✅ | GitHub 个人访问令牌 |
| `LLM_SUMMARY_PROVIDER` | ✅ | 摘要阶段 Provider |
| `LLM_SUMMARY_API_KEY` | ✅ | 摘要阶段 API Key |
| `LLM_SUMMARY_MODEL` | ✅ | 摘要阶段模型名 |
| `LLM_RISK_PROVIDER` | ✅ | Risk Model 1 Provider |
| `LLM_RISK_API_KEY` | ✅ | Risk Model 1 API Key |
| `LLM_RISK_MODEL` | ✅ | Risk Model 1 模型名 |
| `LLM_GEMINI_PROVIDER` | ✅ | Risk Model 2 Provider |
| `LLM_GEMINI_API_KEY` | ✅ | Risk Model 2 API Key |
| `LLM_GEMINI_MODEL` | ✅ | Risk Model 2 模型名 |
| `LLM_SUGGESTION_PROVIDER` | ✅ | 建议生成 Provider |
| `LLM_SUGGESTION_API_KEY` | ✅ | 建议生成 API Key |
| `LLM_SUGGESTION_MODEL` | ✅ | 建议生成模型名 |
| `LLM_*_BASE_URL` | 否 | 自定义 API 地址（适用于 OpenAI 兼容服务） |
| `PORT` | 否 | 后端端口（默认 3001） |

**支持的 Provider：** `anthropic` | `google` | `openai` | `openai-compatible`

`openai-compatible` 模式兼容任意 OpenAI 接口格式的服务（DeepSeek、Qwen、百炼、Kimi 等），设置 `LLM_*_BASE_URL` 指向服务地址即可。

## API 端点

| 端点 | 方法 | 说明 |
|---|---|---|
| `/api/health` | GET | 健康检查 |
| `/api/pr/:owner/:repo/:number` | GET | 获取 PR 元数据、原始 diff 和语义分析 |
| `/api/review/:owner/:repo/:number` | POST | 完整 AI 审查（阻塞式，一次性返回） |
| `/api/review/:owner/:repo/:number/stream` | POST | SSE 流式 AI 审查（渐进式实时推送结果） |
| `/api/impact/:owner/:repo/:number` | POST | 跨文件依赖影响热力图 |
| `/api/history` | GET | 审查历史列表（最近 100 条） |
| `/api/history/:id` | GET | 按 ID 获取历史审查完整详情 |
| `/api/settings` | GET | 获取 LLM 配置（API Key 脱敏） |
| `/api/settings` | POST | 保存 LLM 配置（含 API Key，写入磁盘） |

## 脚本 & 测试

```bash
# 开发
pnpm dev              # Frontend + Backend 并行启动
pnpm dev:frontend     # 仅前端 (localhost:5173)
pnpm dev:backend      # 仅后端 (localhost:3001)

# 构建
pnpm build            # 构建全部
pnpm build:shared     # 仅 shared 包

# 质量
pnpm lint             # Biome 检查
pnpm lint:fix         # 自动修复
pnpm typecheck        # TypeScript 严格检查
pnpm test             # 运行全部 140 tests
pnpm test -- --watch  # 监听模式
```

## CI/CD

GitHub Actions 在每个 PR 上运行三道门禁，全部通过方可合并：

1. **Quality** — `pnpm lint` + `pnpm typecheck`
2. **Test** — `pnpm test` (140 tests / 13 文件)
3. **Build** — `pnpm build`

## 贡献

1. 从 `main` 创建分支：`git checkout -b feat/description`
2. 编码 + 测试
3. `pnpm typecheck && pnpm lint && pnpm test` —— 全部通过
4. 使用 Conventional Commits：`feat:` `fix:` `chore:` `docs:` `test:`
5. Push 并创建 PR —— CI 强制执行质量门禁
6. 合并后删除分支

## 许可证

MIT

---

<p align="center">
  <a href="README_EN.md">English</a>
</p>
