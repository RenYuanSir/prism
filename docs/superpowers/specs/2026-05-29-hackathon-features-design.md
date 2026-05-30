# AI PR Review: Hackathon 差异化功能实现设计

> **日期**: 2026-05-29
> **目标**: 在 72h Hackathon 约束下，实现三个核心差异化功能，使项目从"能跑的 Demo"升级为"让评委眼前一亮的 Demo"
> **前置分析**: 项目已完成约 60% 报告要求，骨架和工程质量优秀，但 10 个亮点功能仅完整实现 1 个

## 1. 范围与优先级

### 选定功能

| # | 功能 | 报告定位 | 预估时间 | 依赖 |
|---|------|---------|---------|------|
| 1 | Tree-sitter AST 解析升级 | §3.2 核心差异化基础 | 6-8h | 无 |
| 2 | 多模型投票对比 UI | §4.1 #4 "全新交互范式" | 5-7h | #1 |
| 3 | 竞态条件检测 + 时间线可视化 | §4.1 #1 "杀手锏功能" | 7-9h | #1, #2 |

### 执行顺序

```
Phase 1: Tree-sitter 升级 (基础设施)
  ↓
Phase 2: 多模型投票 Pipeline + 共识 UI
  ↓
Phase 3: 竞态条件检测 + 时间线可视化
```

Phase 1 是后两个功能的基础（需要 Tree-sitter 提取函数体和并发模式）。Phase 2 的并行 Pipeline 为 Phase 3 提供共识合并框架。

### 不做的事（YAGNI）

- GitHub Webhook + PR 评论回写（需要部署环境，72h 内 ROI 低）
- SQLite 持久化（当前 API 已能工作，历史功能非 Demo 必需）
- AI 幻觉检测（已选竞态条件作为杀手锏，不分散精力）
- 审查质量自评分、历史相似 PR 预警（锦上添花，非核心）

---

## 2. Tree-sitter AST 解析升级

### 2.1 问题

当前 `ast-parser.ts` 使用正则表达式解析 TypeScript。报告将 Tree-sitter 定义为"突破同质化陷阱的最关键技术"（§3.2）。正则解析器的具体缺陷：

| 场景 | 正则表现 | Tree-sitter 表现 |
|------|---------|-----------------|
| 嵌套函数 `function outer() { function inner() {} }` | 只匹配 `outer`，漏掉 `inner` | 正确提取两层函数 |
| 类方法 `class Foo { bar() {} }` | 误匹配为独立函数 `bar` | 正确识别为方法 |
| 多行签名 `function foo(\n  a: string,\n  b: number\n)` | 匹配失败 | 正确解析 |
| async/generator 修饰符 | 部分匹配 | 完整提取 |
| 函数体重命名 | 认为是"删除+新增" | 可识别为重命名 |
| 函数体内容提取 | 无法实现 | 核心能力 |

### 2.2 方案

**替换 `parseFile` 实现**，保持返回类型 `ParsedFile` 不变，下游 `diffFunctions/Imports/Exports` 零修改。

**新增文件**: `tree-sitter-init.ts` — WASM 单例初始化

```typescript
// tree-sitter-init.ts
import Parser from "web-tree-sitter";

let parser: Parser | null = null;
let tsLanguage: Parser.Language | null = null;
let tsxLanguage: Parser.Language | null = null;

export async function getParser(): Promise<Parser> {
  if (parser) return parser;

  await Parser.init();
  parser = new Parser();

  // tree-sitter-wasms 提供预编译的 .wasm 文件
  tsLanguage = await Parser.Language.load(
    // 路径在构建时解析，指向 node_modules/tree-sitter-wasms/out/
    "tree-sitter-typescript.wasm"
  );
  tsxLanguage = await Parser.Language.load(
    "tree-sitter-tsx.wasm"
  );

  return parser;
}

export function getLanguage(filename: string): Parser.Language | null {
  if (filename.endsWith(".tsx") || filename.endsWith(".jsx")) return tsxLanguage;
  if (filename.endsWith(".ts") || filename.endsWith(".js")) return tsLanguage;
  return null;
}
```

**修改文件**: `ast-parser.ts`

```typescript
export async function parseFile(content: string, filename?: string): Promise<ParsedFile> {
  try {
    const parser = await getParser();
    const lang = getLanguage(filename ?? "file.ts");
    if (!lang) return regexFallback(content);

    parser.setLanguage(lang);
    const tree = parser.parse(content);
    const root = tree.rootNode;

    return {
      functions: extractFunctionsFromAST(root, content),
      imports: extractImportsFromAST(root, content),
      exports: extractExportsFromAST(root, content),
      classes: extractClassesFromAST(root),
      interfaces: extractInterfacesFromAST(root),
      types: extractTypesFromAST(root),
    };
  } catch {
    // Fallback to regex if tree-sitter fails
    return regexFallback(content);
  }
}
```

**AST 提取函数**（关键实现细节）:

- `extractFunctionsFromAST`: 查询 `function_declaration`、`method_definition`、`lexical_declaration`（箭头函数赋值）节点。提取 name、参数列表、返回类型、**函数体文本**（新增能力）。
- `extractImportsFromAST`: 查询 `import_statement` 节点，提取 module specifier 和 import clause。
- `extractExportsFromAST`: 查询含 `export` 关键字的声明节点。

**WASM 路径处理**: `web-tree-sitter` 需要在运行时加载 `.wasm` 文件。使用 `tree-sitter-wasms` 包提供的预编译 WASM，通过 `fileURLToPath` 解析绝对路径。在 `package.json` 的 `build` 脚本中添加 WASM 文件拷贝步骤。

**Fallback 机制**: 将现有正则解析器重命名为 `regexFallback()`，在 Tree-sitter 初始化失败或语言不支持时使用。这保证：
- 现有测试继续通过
- 非 TypeScript 文件不会崩溃
- 开发环境缺少 WASM 时仍可使用

### 2.3 接口变更

`parseFile` 签名变化：

```typescript
// Before
async function parseFile(content: string): Promise<ParsedFile>

// After
async function parseFile(content: string, filename?: string): Promise<ParsedFile>
```

`filename` 参数用于决定使用 TypeScript 还是 TSX 语法。可选参数，向后兼容。

`FunctionInfo` 新增可选字段：

```typescript
export interface FunctionInfo {
  name: string;
  startLine: number;
  endLine: number;
  signature: string;
  parameters: string[];
  returnType: string;
  body?: string;        // NEW: 函数体源代码
  isAsync?: boolean;    // NEW: 是否 async
  isMethod?: boolean;   // NEW: 是否类方法
  className?: string;   // NEW: 所属类名（如果是方法）
}
```

下游调用处（`diff-analyzer.ts` 第 85-86 行）需要传入 filename：

```typescript
// Before
const oldParsed = await parseFile(oldContent);
const newParsed = await parseFile(newContent);

// After
const oldParsed = await parseFile(oldContent, file.filename);
const newParsed = await parseFile(newContent, file.filename);
```

### 2.4 测试

更新 `ast-parser.test.ts`，新增以下测试用例：

- 嵌套函数提取
- 类方法提取（含 className）
- 多行函数签名解析
- async 函数标记
- 箭头函数提取
- 函数体内容提取
- Fallback 机制验证（模拟 Tree-sitter 失败时回退到正则）

### 2.5 预估时间: 6-8h

---

## 3. 多模型投票对比 Pipeline

### 3.1 问题

当前 Pipeline 中，Gemini Flash 只做 Summary，Claude Sonnet 做 Risk + Suggestion。用户看不到两个模型分别发现了什么。报告 §4.1 #4 称多模型投票为"全新交互范式"——让用户看到"Claude 发现了 A、Gemini 发现了 B"的透明界面。

### 3.2 Pipeline 重构

```
当前 Pipeline:
  Summary (Gemini Flash) → Risk (Claude Sonnet) → Suggestion (Claude Sonnet)

新 Pipeline:
  Summary (Gemini Flash)
    → Risk [Claude Sonnet ∥ Gemini Flash 并行]
    → Consensus Merge (合并两模型结果)
    → Suggestion (Claude Sonnet, 仅对 consensus issues 生成修复)
```

### 3.3 新增类型 (`packages/shared/src/index.ts`)

```typescript
export type ModelName = "claude" | "gemini";

export interface ModelFinding {
  model: ModelName;
  severity: AIRiskSeverity;
  message: string;
  file: string;
  line: number;
  explanation: string;
}

export type ConsensusConfidence = "high" | "medium" | "low";

export interface ConsensusIssue {
  issue: AIRiskIssue;
  confidence: ConsensusConfidence;
  models: ModelName[];
  modelFindings: ModelFinding[];
}

export interface AIConsensusResult {
  consensusIssues: ConsensusIssue[];
  claudeOnly: ModelFinding[];
  geminiOnly: ModelFinding[];
  allAgreeCount: number;
  claudeTotal: number;
  geminiTotal: number;
}
```

`AIReviewResult` 扩展：

```typescript
export interface AIReviewResult {
  summary: AISummaryResult;
  risk: AIRiskResult;              // 保留，兼容现有 UI
  consensus: AIConsensusResult;    // NEW
  suggestion: AISuggestionResult;
}
```

### 3.4 共识合并算法

```
mergeConsensus(claudeFindings, geminiFindings):
  matched = []
  unmatchedClaude = [...claudeFindings]
  unmatchedGemini = [...geminiFindings]

  for each finding A in claudeFindings:
    for each finding B in geminiFindings:
      if isMatch(A, B):
        consensus = createConsensusIssue(A, B)  // confidence = "high"
        matched.push(consensus)
        remove A from unmatchedClaude
        remove B from unmatchedGemini
        break

  // 未匹配的处理
  for each remaining A in unmatchedClaude:
    confidence = A.severity in ["critical", "warning"] ? "medium" : "low"
    matched.push(createSingleModelIssue(A, confidence))

  for each remaining B in unmatchedGemini:
    confidence = B.severity in ["critical", "warning"] ? "medium" : "low"
    matched.push(createSingleModelIssue(B, confidence))

  // 按 confidence 排序: high > medium > low, 然后按 severity
  return sort(matched)

isMatch(A, B):
  return A.file == B.file
    && abs(A.line - B.line) <= 3
    && severityCompatible(A.severity, B.severity)

severityCompatible(a, b):
  // critical 和 warning 互相兼容，info 只和 info 兼容
  if a == "info" or b == "info": return a == b
  return true
```

### 3.5 `AIReviewPipeline` 重构

新增方法：

```typescript
async run(pr, diff, semanticDiff): Promise<AIReviewResult> {
  // Stage 1: Summary (unchanged)
  const summary = await this.generateSummary(pr, semanticDiff);

  // Stage 2: Parallel Risk Analysis
  const [claudeFindings, geminiFindings] = await Promise.all([
    this.analyzeRisksWithModel(this.riskClient, pr, diff, semanticDiff),
    this.analyzeRisksWithModel(this.summaryClient, pr, diff, semanticDiff),
    // summaryClient is Gemini Flash, reused for parallel risk
  ]);

  // Stage 3: Consensus Merge
  const consensus = mergeConsensus(claudeFindings, geminiFindings);

  // Stage 4: Suggestions (only for high/medium confidence issues)
  const issuesForSuggestion = consensus.consensusIssues
    .filter(i => i.confidence !== "low")
    .map(i => i.issue);
  const suggestion = await this.generateSuggestions(issuesForSuggestion, diff);

  // Build backward-compatible risk result
  const risk = {
    issues: consensus.consensusIssues.map(i => i.issue),
    stage: "risk" as const,
  };

  return { summary, risk, consensus, suggestion };
}
```

`createDefaultPipeline` 更新：Summary 使用 Gemini Flash，Risk 阶段 Claude Sonnet + Gemini Flash 并行，Suggestion 使用 Claude Sonnet。

### 3.6 前端 ConsensusView 组件

新增 `ConsensusView.tsx`，替代 `ReviewResult.tsx` 中的 Risk Issues section：

**布局**:

```
┌─────────────────────────────────────────────────────────────┐
│  Review Consensus                                            │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  Claude     │  │  Consensus │  │  Gemini    │            │
│  │  3 issues   │  │  5 agreed  │  │  2 issues  │            │
│  └────────────┘  └────────────┘  └────────────┘            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  HIGH CONFIDENCE — Both models agree                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ [CRITICAL] Race condition in processOrder            │    │
│  │ src/services/order.ts:42                             │    │
│  │                                                      │    │
│  │ Claude says: "Shared state without lock..."    [▼]   │    │
│  │ Gemini says: "Concurrent access to..."         [▼]   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  MEDIUM CONFIDENCE — Single model finding                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ [WARNING] Missing error handler                      │    │
│  │ src/api/routes.ts:87 (Claude only)                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  LOW CONFIDENCE — Minor, single model                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ [INFO] Consider extracting helper                    │    │
│  │ src/utils.ts:12 (Gemini only)                        │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

**组件结构**:
- `ConsensusView.tsx` — 主组件，包含三列统计卡 + 分组问题列表
- `ConsensusStats.tsx` — 顶部三列统计
- `ConsensusIssueCard.tsx` — 单条共识问题卡片（可折叠展示两个模型的解释）

**交互**:
- 共识问题默认展开，显示两个模型的解释（可折叠）
- 独有问题标注来源模型 badge（"Claude only" / "Gemini only"）
- 按 confidence 分组排序：high → medium → low

### 3.7 影响范围

| 文件 | 操作 | 说明 |
|------|------|------|
| `packages/shared/src/index.ts` | 修改 | 新增共识相关类型 |
| `apps/backend/src/services/ai-review-pipeline.ts` | 修改 | 并行 Risk + Consensus Merge |
| `apps/backend/src/index.ts` | 修改 | API 响应增加 consensus 字段 |
| `apps/frontend/src/api/client.ts` | 修改 | 响应类型更新 |
| `apps/frontend/src/components/ConsensusView.tsx` | 新增 | 共识视图主组件 |
| `apps/frontend/src/components/ConsensusStats.tsx` | 新增 | 统计卡片 |
| `apps/frontend/src/components/ConsensusIssueCard.tsx` | 新增 | 共识问题卡片 |
| `apps/frontend/src/pages/ReviewResult.tsx` | 修改 | 集成 ConsensusView |
| `apps/backend/src/services/ai-review-pipeline.test.ts` | 修改 | 新增 consensus merge 测试 |

### 3.8 预估时间: 5-7h

---

## 4. 竞态条件检测 + 时间线可视化

### 4.1 问题

报告中竞态条件检测是"⭐⭐⭐⭐⭐ 核心差异化"，Demo Golden Path 的开场功能。报告指出当前所有主流 AI 审查工具在此维度评分仅 2-3/10。实现此功能可在 Demo 前 30 秒内建立技术深度认知。

### 4.2 混合策略

```
Step 1: Tree-sitter 模式提取 (本地, <100ms)
  → 识别并发代码模式 (async/Promise/callback/event/timer)
  → 识别共享状态访问 (变量读写/DB操作/缓存操作)
  → 检测"同一共享状态被 ≥2 个并发模式访问"

Step 2: LLM 并发推理 (集成到 Risk Pipeline)
  → 将提取的模式注入 prompt
  → LLM 分析并发执行路径
  → 输出 RaceConditionIssue (含两个执行路径描述)

Step 3: 时间线可视化 (前端)
  → 双列动画展示两个请求的执行路径
  → 冲突点高亮
```

### 4.3 新增类型 (`packages/shared/src/index.ts`)

```typescript
// --- Race Condition Detection Types ---

export type ConcurrencyPatternType =
  | "async_function"
  | "promise_chain"
  | "callback"
  | "event_handler"
  | "timer";

export type SharedStateType =
  | "variable_write"
  | "db_operation"
  | "cache_operation"
  | "global_mutation";

export interface ConcurrencyPattern {
  type: ConcurrencyPatternType;
  file: string;
  line: number;
  endLine: number;
  functionName: string;
  sharedStateAccess: SharedStateAccess[];
}

export interface SharedStateAccess {
  type: SharedStateType;
  name: string;
  line: number;
  isWrite: boolean;
}

export interface RaceConditionIssue {
  severity: AIRiskSeverity;
  message: string;
  file: string;
  line: number;
  explanation: string;
  sharedState: string;
  patternA: ExecutionPath;
  patternB: ExecutionPath;
  conflictPoint: string;
  confidence: ConsensusConfidence;
  models: ModelName[];
}

export interface ExecutionPath {
  label: string;
  functionName: string;
  steps: PathStep[];
}

export interface PathStep {
  description: string;
  line: number;
  isConflictPoint: boolean;
}
```

`AIReviewResult` 扩展：

```typescript
export interface AIReviewResult {
  summary: AISummaryResult;
  risk: AIRiskResult;
  consensus: AIConsensusResult;
  raceConditions: RaceConditionIssue[];  // NEW
  suggestion: AISuggestionResult;
}
```

### 4.4 `race-condition-analyzer.ts`

**Tree-sitter 模式匹配查询**:

使用 Tree-sitter 的 query API 匹配以下 AST 模式：

| 模式类型 | AST 匹配规则 | 示例代码 |
|---------|-------------|---------|
| `async_function` | `function_declaration` 含 `async` 修饰符 | `async function processOrder()` |
| `promise_chain` | `call_expression` 中 callee 为 `.then()` 或 `Promise.all/race` | `fetchData().then(handle)` |
| `callback` | 函数作为参数传递给异步 API (setTimeout, readFile 等) | `setTimeout(() => {...}, 100)` |
| `event_handler` | `call_expression` 中 callee 为 `.on()` / `addEventListener()` | `emitter.on('data', handler)` |
| `timer` | `call_expression` 中 callee 为 `setInterval` / `setTimeout` | `setInterval(tick, 1000)` |

**共享状态访问识别**:

| 状态类型 | AST 匹配规则 | 示例 |
|---------|-------------|------|
| `variable_write` | `assignment_expression` 或 `update_expression` 对模块级变量 | `inventoryCount -= 1` |
| `db_operation` | `call_expression` 中 callee 含 `query`/`update`/`delete`/`save`/`create`/`insert` | `db.orders.update(...)` |
| `cache_operation` | `call_expression` 中 callee 含 `get`/`set`/`delete`/`invalidate` 且对象名含 cache/redis/store | `cache.set(key, val)` |
| `global_mutation` | `call_expression` 中 callee 含 `push`/`splice`/`shift`/`pop` 对数组变量 | `queue.push(item)` |

**核心算法**:

```
analyzeRaceConditionPatterns(semanticDiff):
  allPatterns = []

  for each fileChange in semanticDiff.fileChanges:
    if fileChange has no function changes: continue
    ast = parseFile(newContent, filename)

    // Step 1: 提取所有并发模式
    patterns = extractConcurrencyPatterns(ast)

    // Step 2: 对每个模式，提取共享状态访问
    for each pattern in patterns:
      pattern.sharedStateAccess = extractSharedStateAccess(
        ast, pattern.functionName
      )

    allPatterns.push(...patterns)

  // Step 3: 检测共享状态冲突
  candidates = []
  for each stateAccess in allPatterns.flatMap(p => p.sharedStateAccess):
    writers = allPatterns.filter(p =>
      p.sharedStateAccess.some(a =>
        a.name == stateAccess.name && a.isWrite
      )
    )
    if writers.length >= 2:
      // 同一共享状态被 ≥2 个并发模式写入
      candidates.push({
        sharedState: stateAccess.name,
        patterns: writers,
      })

  return deduplicate(candidates)
```

### 4.5 LLM Prompt 增强

在 Risk Pipeline prompt 中追加竞态条件专项分析指令：

```
ADDITIONAL: Race Condition Analysis

Tree-sitter analysis detected the following concurrent access patterns
in this PR that may lead to race conditions:

Pattern 1: async function processOrder() at src/order.ts:15-35
  - Variable write: inventoryCount (line 23)
  - DB operation: db.orders.update() (line 25)

Pattern 2: async function cancelOrder() at src/order.ts:45-65
  - Variable write: inventoryCount (line 52)
  - DB operation: db.orders.update() (line 54)

Shared state: inventoryCount is written by both functions without
apparent locking or transaction coordination.

For each potential race condition, provide a JSON response:
{
  "raceConditions": [
    {
      "severity": "critical" | "warning" | "info",
      "message": "Brief description",
      "file": "path/to/file.ts",
      "line": 15,
      "explanation": "Detailed explanation of the race condition",
      "sharedState": "inventoryCount",
      "patternA": {
        "label": "Request A (processOrder)",
        "functionName": "processOrder",
        "steps": [
          { "description": "Read inventoryCount = 10", "line": 23, "isConflictPoint": false },
          { "description": "Process order (async, 200ms)", "line": 24, "isConflictPoint": false },
          { "description": "Write inventoryCount = 9", "line": 25, "isConflictPoint": true }
        ]
      },
      "patternB": {
        "label": "Request B (cancelOrder)",
        "functionName": "cancelOrder",
        "steps": [
          { "description": "Read inventoryCount = 10", "line": 52, "isConflictPoint": false },
          { "description": "Cancel order (async, 100ms)", "line": 53, "isConflictPoint": false },
          { "description": "Write inventoryCount = 9", "line": 54, "isConflictPoint": true }
        ]
      },
      "conflictPoint": "Both requests read the same value before either writes"
    }
  ]
}
```

如果 Tree-sitter 未检测到并发模式，此段 prompt 不注入（避免 LLM 产生幻觉式误报）。

### 4.6 Pipeline 集成

```typescript
// ai-review-pipeline.ts — run() 方法更新

async run(pr, diff, semanticDiff): Promise<AIReviewResult> {
  const summary = await this.generateSummary(pr, semanticDiff);

  // 提取竞态条件模式 (本地, <100ms)
  const racePatterns = analyzeRaceConditionPatterns(semanticDiff);

  // 并行 Risk 分析 (prompt 中注入竞态分析指令)
  const [claudeFindings, geminiFindings] = await Promise.all([
    this.analyzeRisksWithModel(this.riskClient, pr, diff, semanticDiff, racePatterns),
    this.analyzeRisksWithModel(this.summaryClient, pr, diff, semanticDiff, racePatterns),
  ]);

  const consensus = mergeConsensus(claudeFindings, geminiFindings);

  // 从共识结果中提取竞态条件专项结果
  const raceConditions = extractRaceConditions(consensus, racePatterns);

  const issuesForSuggestion = consensus.consensusIssues
    .filter(i => i.confidence !== "low")
    .map(i => i.issue);
  const suggestion = await this.generateSuggestions(issuesForSuggestion, diff);

  const risk = {
    issues: consensus.consensusIssues.map(i => i.issue),
    stage: "risk" as const,
  };

  return { summary, risk, consensus, raceConditions, suggestion };
}
```

### 4.7 前端 RaceConditionTimeline 组件

**布局设计**:

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚡ Race Condition Detected                                      │
│  HIGH CONFIDENCE — Both models detected this                     │
│                                                                  │
│  src/services/order.ts — processOrder & cancelOrder              │
│  Shared State: inventoryCount (no lock protection)               │
│                                                                  │
│  ┌──────────────────────┐     ┌──────────────────────┐          │
│  │ Request A             │     │ Request B             │          │
│  │ processOrder()        │     │ cancelOrder()         │          │
│  │                       │     │                       │          │
│  │ ┌───────────────────┐ │     │ ┌───────────────────┐ │          │
│  │ │ 1. Read inventory │ │     │ │ 1. Read inventory │ │          │
│  │ │    = 10     :23   │ │     │ │    = 10     :52   │ │          │
│  │ └───────────────────┘ │     │ └───────────────────┘ │          │
│  │          ↓            │     │          ↓            │          │
│  │ ┌───────────────────┐ │     │ ┌───────────────────┐ │          │
│  │ │ 2. Process order  │ │     │ │ 2. Cancel order   │ │          │
│  │ │    (200ms)  :24   │ │     │ │    (100ms)  :53   │ │          │
│  │ └───────────────────┘ │     │ └───────────────────┘ │          │
│  │          ↓            │     │          ↓            │          │
│  │ ┌───────────────────┐ │     │                       │          │
│  │ │ 3. Write inventory│ │     │                       │          │
│  │ │    = 9 ⚠️   :25   │─┼─────┼─── CONFLICT ───┐    │          │
│  │ └───────────────────┘ │     │                  │    │          │
│  │                       │     │ ┌───────────────────┐ │          │
│  │                       │     │ │ 3. Write inventory│ │          │
│  │                       │     │ │    = 9 ⚠️   :54   │ │          │
│  │                       │     │ └───────────────────┘ │          │
│  └──────────────────────┘     └──────────────────────┘          │
│                                                                  │
│  Expected: inventoryCount = 8                                    │
│  Actual:   inventoryCount = 9  ❌ Lost update!                  │
│                                                                  │
│  [▶ Play Animation]  [Step 1/3]  [Step 2/3]  [Step 3/3]        │
└─────────────────────────────────────────────────────────────────┘
```

**组件结构**:

- `RaceConditionTimeline.tsx` — 主组件，管理动画状态、步骤进度
  - Props: `issues: RaceConditionIssue[]`
  - State: `currentIssue` (多个竞态条件时切换), `animationStep`, `isPlaying`
  - 动画逻辑: `useEffect` + `setInterval`，每步 1000ms，到达冲突点时暂停 2s

- `ExecutionPathColumn.tsx` — 单侧执行路径列
  - Props: `path: ExecutionPath`, `currentStep: number`, `highlightConflict: boolean`
  - 渲染步骤列表，当前步骤高亮，冲突步骤红色闪烁

- `ConflictIndicator.tsx` — 冲突点连接线和标签
  - Props: `visible: boolean`, `conflictPoint: string`
  - 红色虚线连接两列的冲突步骤，中间显示 "CONFLICT" badge

**动画行为**:
1. 默认状态：两列全部步骤可见，无高亮
2. 点击 "Play Animation"：步骤从左到右、从上到下依次高亮（每步 1000ms）
3. 当动画到达冲突点（`isConflictPoint: true`）：两列同时高亮冲突步骤，中间出现 "CONFLICT" 连接，底部显示 Expected vs Actual
4. 动画结束后保持最终状态，可点击 "Replay"

### 4.8 影响范围

| 文件 | 操作 | 说明 |
|------|------|------|
| `packages/shared/src/index.ts` | 修改 | 新增竞态条件相关类型 |
| `apps/backend/src/services/race-condition-analyzer.ts` | 新增 | Tree-sitter 模式提取 + 冲突检测 |
| `apps/backend/src/services/ai-review-pipeline.ts` | 修改 | 集成竞态分析到并行 Pipeline |
| `apps/backend/src/index.ts` | 修改 | API 响应增加 raceConditions 字段 |
| `apps/frontend/src/api/client.ts` | 修改 | 响应类型更新 |
| `apps/frontend/src/components/RaceConditionTimeline.tsx` | 新增 | 时间线主组件 |
| `apps/frontend/src/components/ExecutionPathColumn.tsx` | 新增 | 执行路径列组件 |
| `apps/frontend/src/components/ConflictIndicator.tsx` | 新增 | 冲突指示器 |
| `apps/frontend/src/pages/ReviewResult.tsx` | 修改 | 集成竞态条件视图（在共识视图上方） |
| `apps/backend/src/services/race-condition-analyzer.test.ts` | 新增 | 模式提取 + 冲突检测测试 |

### 4.9 预估时间: 7-9h

---

## 5. 总时间预估与执行计划

| Phase | 功能 | 时间 | 累计 |
|-------|------|------|------|
| Phase 1 | Tree-sitter AST 升级 | 6-8h | 6-8h |
| Phase 2 | 多模型投票 Pipeline + UI | 5-7h | 11-15h |
| Phase 3 | 竞态条件检测 + 时间线 | 7-9h | 18-24h |
| Buffer | 测试、调试、集成 | 4-6h | 22-30h |
| **Total** | | | **22-30h** |

在 72h Hackathon 中，扣除睡眠和休息，可用开发时间约 40-48h，此计划在可行范围内。

---

## 6. 技术决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| Tree-sitter WASM 加载 | `tree-sitter-wasms` 预编译包 | 避免本地编译 tree-sitter 的复杂性 |
| Fallback 策略 | 正则解析器作为 fallback | 保证稳定性，现有测试不受影响 |
| 共识匹配算法 | 文件+行号(±3)+severity | 简单可靠，72h 内可实现 |
| 竞态检测策略 | Tree-sitter 提取 + LLM 推理 | 纯 Tree-sitter 无法理解语义，纯 LLM 缺少结构化线索 |
| 动画方案 | React state + CSS transitions | 无需引入额外动画库 |
| 并行 API 调用 | `Promise.all` | 两个模型无依赖关系，可完全并行 |

---

## 7. 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| Tree-sitter WASM 在 Node.js 中加载失败 | 中 | 高 | Fallback 到正则解析器；提前测试 WASM 加载路径 |
| LLM 输出不符合 JSON 格式 | 中 | 中 | 现有 `parseRiskResponse` 已有容错；增加 retry 逻辑 |
| 共识匹配误合并（不同问题被错误匹配） | 低 | 中 | 行号容差 ±3 + severity 兼容检查；可在 Demo 前调优阈值 |
| 竞态条件 LLM prompt 过长 | 低 | 中 | 仅在检测到并发模式时注入；限制模式数量上限为 5 |
| 动画在低性能设备上卡顿 | 低 | 低 | 使用 CSS transform 而非 layout 动画；可降级为非动画模式 |
