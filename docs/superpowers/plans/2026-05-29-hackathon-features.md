# Hackathon Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement three core differentiators (Tree-sitter AST, multi-model consensus voting, race condition detection) to transform the project from "working demo" to "judge-wow demo" in 72 hours.

**Architecture:** Sequential three-phase implementation. Phase 1 upgrades AST parsing to Tree-sitter (foundation). Phase 2 refactors pipeline to parallel dual-model risk analysis with consensus merge. Phase 3 adds race condition detection using Tree-sitter patterns + LLM reasoning + timeline visualization.

**Tech Stack:** TypeScript, web-tree-sitter, tree-sitter-wasms, React 18, Express, Anthropic SDK, Google Generative AI SDK

---

## File Structure

### Phase 1: Tree-sitter AST Upgrade
- Create: `apps/backend/src/services/tree-sitter-init.ts` — WASM singleton initialization
- Modify: `apps/backend/src/services/ast-parser.ts` — Replace regex parser with Tree-sitter
- Modify: `apps/backend/src/services/diff-analyzer.ts:85-86` — Pass filename to parseFile
- Modify: `apps/backend/src/services/ast-parser.test.ts` — Add nested/class/async test cases
- Modify: `packages/shared/src/index.ts:12-19` — Add FunctionInfo optional fields

### Phase 2: Multi-Model Consensus Pipeline
- Modify: `packages/shared/src/index.ts` — Add consensus types
- Modify: `apps/backend/src/services/ai-review-pipeline.ts` — Parallel risk + consensus merge
- Modify: `apps/backend/src/index.ts` — API response update
- Modify: `apps/frontend/src/api/client.ts` — Response type update
- Create: `apps/frontend/src/components/ConsensusView.tsx` — Main consensus UI
- Create: `apps/frontend/src/components/ConsensusStats.tsx` — Stats cards
- Create: `apps/frontend/src/components/ConsensusIssueCard.tsx` — Issue card with model comparison
- Modify: `apps/frontend/src/pages/ReviewResult.tsx` — Integrate ConsensusView
- Modify: `apps/backend/src/services/ai-review-pipeline.test.ts` — Consensus merge tests

### Phase 3: Race Condition Detection
- Modify: `packages/shared/src/index.ts` — Add race condition types
- Create: `apps/backend/src/services/race-condition-analyzer.ts` — Tree-sitter pattern extraction
- Modify: `apps/backend/src/services/ai-review-pipeline.ts` — Integrate race analysis
- Modify: `apps/backend/src/index.ts` — API response update
- Modify: `apps/frontend/src/api/client.ts` — Response type update
- Create: `apps/frontend/src/components/RaceConditionTimeline.tsx` — Timeline main component
- Create: `apps/frontend/src/components/ExecutionPathColumn.tsx` — Execution path column
- Create: `apps/frontend/src/components/ConflictIndicator.tsx` — Conflict highlight
- Modify: `apps/frontend/src/pages/ReviewResult.tsx` — Integrate race condition view
- Create: `apps/backend/src/services/race-condition-analyzer.test.ts` — Pattern extraction tests

---

## Phase 1: Tree-sitter AST Upgrade

### Task 1: Install Dependencies & Verify WASM Loading

**Files:**
- Test: `apps/backend/src/services/tree-sitter-init.test.ts`

- [ ] **Step 1: Write test for WASM initialization**

```typescript
import { describe, it, expect } from "vitest";
import { getParser, getLanguage } from "./tree-sitter-init";

describe("tree-sitter-init", () => {
  it("should initialize parser successfully", async () => {
    const parser = await getParser();
    expect(parser).toBeDefined();
  });

  it("should return same parser instance (singleton)", async () => {
    const parser1 = await getParser();
    const parser2 = await getParser();
    expect(parser1).toBe(parser2);
  });

  it("should return TypeScript language for .ts files", async () => {
    await getParser(); // Initialize first
    const lang = getLanguage("test.ts");
    expect(lang).toBeDefined();
  });

  it("should return TSX language for .tsx files", async () => {
    await getParser();
    const lang = getLanguage("test.tsx");
    expect(lang).toBeDefined();
  });

  it("should return null for unsupported extensions", async () => {
    await getParser();
    const lang = getLanguage("test.py");
    expect(lang).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/rysir/job-hunter/xengineer/ai-pr-review
pnpm test tree-sitter-init.test.ts
```

Expected: FAIL with "Cannot find module './tree-sitter-init'"

- [ ] **Step 3: Implement tree-sitter-init.ts**

```typescript
// apps/backend/src/services/tree-sitter-init.ts
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Parser from "web-tree-sitter";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let parser: Parser | null = null;
let tsLanguage: Parser.Language | null = null;
let tsxLanguage: Parser.Language | null = null;

export async function getParser(): Promise<Parser> {
  if (parser) return parser;

  await Parser.init();
  parser = new Parser();

  // Load WASM files from tree-sitter-wasms package
  const wasmBasePath = join(
    __dirname,
    "../../node_modules/tree-sitter-wasms/out"
  );

  tsLanguage = await Parser.Language.load(
    join(wasmBasePath, "tree-sitter-typescript.wasm")
  );
  tsxLanguage = await Parser.Language.load(
    join(wasmBasePath, "tree-sitter-tsx.wasm")
  );

  return parser;
}

export function getLanguage(filename: string): Parser.Language | null {
  if (filename.endsWith(".tsx") || filename.endsWith(".jsx")) {
    return tsxLanguage;
  }
  if (filename.endsWith(".ts") || filename.endsWith(".js")) {
    return tsLanguage;
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test tree-sitter-init.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/services/tree-sitter-init.ts apps/backend/src/services/tree-sitter-init.test.ts
git commit -m "feat: add tree-sitter WASM initialization with singleton pattern"
```

---

### Task 2: Implement Tree-sitter Function Extraction

**Files:**
- Modify: `packages/shared/src/index.ts:12-19`
- Test: `apps/backend/src/services/ast-parser.test.ts`

- [ ] **Step 1: Extend FunctionInfo type**

```typescript
// packages/shared/src/index.ts (modify lines 12-19)
export interface FunctionInfo {
  name: string;
  startLine: number;
  endLine: number;
  signature: string;
  parameters: string[];
  returnType: string;
  body?: string;        // NEW
  isAsync?: boolean;    // NEW
  isMethod?: boolean;   // NEW
  className?: string;   // NEW
}
```

- [ ] **Step 2: Write test for nested function extraction**

```typescript
// apps/backend/src/services/ast-parser.test.ts (add new describe block)
describe("Tree-sitter AST parsing", () => {
  it("should extract nested functions", async () => {
    const code = `
function outer() {
  function inner() {
    return 42;
  }
  return inner();
}
    `;
    const result = await parseFile(code, "test.ts");
    expect(result.functions).toHaveLength(2);
    expect(result.functions.map(f => f.name)).toContain("outer");
    expect(result.functions.map(f => f.name)).toContain("inner");
  });

  it("should extract class methods with className", async () => {
    const code = `
class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }
}
    `;
    const result = await parseFile(code, "test.ts");
    expect(result.functions).toHaveLength(1);
    expect(result.functions[0].name).toBe("add");
    expect(result.functions[0].isMethod).toBe(true);
    expect(result.functions[0].className).toBe("Calculator");
  });

  it("should detect async functions", async () => {
    const code = `
async function fetchData() {
  return await fetch("/api");
}
    `;
    const result = await parseFile(code, "test.ts");
    expect(result.functions).toHaveLength(1);
    expect(result.functions[0].isAsync).toBe(true);
  });

  it("should extract function body", async () => {
    const code = `
function calculate() {
  const x = 10;
  return x * 2;
}
    `;
    const result = await parseFile(code, "test.ts");
    expect(result.functions[0].body).toBeDefined();
    expect(result.functions[0].body).toContain("const x = 10");
  });

  it("should handle multi-line function signatures", async () => {
    const code = `
function complex(
  param1: string,
  param2: number,
  param3: boolean
): Promise<void> {
  return Promise.resolve();
}
    `;
    const result = await parseFile(code, "test.ts");
    expect(result.functions).toHaveLength(1);
    expect(result.functions[0].parameters).toEqual(["param1", "param2", "param3"]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
pnpm test ast-parser.test.ts
```

Expected: FAIL (new tests fail because parseFile doesn't support Tree-sitter yet)

- [ ] **Step 4: Implement Tree-sitter function extraction**

```typescript
// apps/backend/src/services/ast-parser.ts (add new functions)

import { getParser, getLanguage } from "./tree-sitter-init.js";
import type Parser from "web-tree-sitter";

// ... existing code ...

export async function parseFile(content: string, filename?: string): Promise<ParsedFile> {
  try {
    const parser = await getParser();
    const lang = getLanguage(filename ?? "file.ts");
    if (!lang) {
      return regexFallback(content);
    }

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
  } catch (error) {
    console.warn("Tree-sitter parsing failed, falling back to regex:", error);
    return regexFallback(content);
  }
}

function extractFunctionsFromAST(root: Parser.SyntaxNode, content: string): FunctionInfo[] {
  const functions: FunctionInfo[] = [];

  function visit(node: Parser.SyntaxNode) {
    // Function declarations
    if (node.type === "function_declaration") {
      const nameNode = node.childForFieldName("name");
      const paramsNode = node.childForFieldName("parameters");
      const bodyNode = node.childForFieldName("body");
      const returnTypeNode = node.childForFieldName("return_type");

      if (nameNode) {
        const isAsync = node.text.includes("async");
        const params = extractParameters(paramsNode);
        const returnType = returnTypeNode?.text ?? "void";
        const signature = `${nameNode.text}(${params.join(", ")}): ${returnType}`;

        functions.push({
          name: nameNode.text,
          startLine: node.startPosition.row + 1,
          endLine: node.endPosition.row + 1,
          signature,
          parameters: params,
          returnType,
          body: bodyNode?.text,
          isAsync,
          isMethod: false,
        });
      }
    }

    // Method definitions (class methods)
    if (node.type === "method_definition") {
      const nameNode = node.childForFieldName("name");
      const paramsNode = node.childForFieldName("parameters");
      const bodyNode = node.childForFieldName("body");
      const returnTypeNode = node.childForFieldName("return_type");

      if (nameNode) {
        const isAsync = node.text.includes("async");
        const params = extractParameters(paramsNode);
        const returnType = returnTypeNode?.text ?? "void";
        const signature = `${nameNode.text}(${params.join(", ")}): ${returnType}`;

        // Find parent class name
        let className: string | undefined;
        let parent = node.parent;
        while (parent && parent.type !== "class_declaration") {
          parent = parent.parent;
        }
        if (parent) {
          const classNameNode = parent.childForFieldName("name");
          className = classNameNode?.text;
        }

        functions.push({
          name: nameNode.text,
          startLine: node.startPosition.row + 1,
          endLine: node.endPosition.row + 1,
          signature,
          parameters: params,
          returnType,
          body: bodyNode?.text,
          isAsync,
          isMethod: true,
          className,
        });
      }
    }

    // Arrow functions assigned to const/let/var
    if (node.type === "lexical_declaration" || node.type === "variable_declaration") {
      const declarator = node.children.find(c => c.type === "variable_declarator");
      if (declarator) {
        const nameNode = declarator.childForFieldName("name");
        const valueNode = declarator.childForFieldName("value");

        if (nameNode && valueNode?.type === "arrow_function") {
          const paramsNode = valueNode.childForFieldName("parameters");
          const bodyNode = valueNode.childForFieldName("body");
          const returnTypeNode = valueNode.childForFieldName("return_type");

          const isAsync = valueNode.text.includes("async");
          const params = extractParameters(paramsNode);
          const returnType = returnTypeNode?.text ?? "void";
          const signature = `${nameNode.text}(${params.join(", ")}): ${returnType}`;

          functions.push({
            name: nameNode.text,
            startLine: node.startPosition.row + 1,
            endLine: node.endPosition.row + 1,
            signature,
            parameters: params,
            returnType,
            body: bodyNode?.text,
            isAsync,
            isMethod: false,
          });
        }
      }
    }

    // Recurse into children
    for (const child of node.children) {
      visit(child);
    }
  }

  visit(root);
  return functions;
}

function extractParameters(paramsNode: Parser.SyntaxNode | null): string[] {
  if (!paramsNode) return [];

  const params: string[] = [];
  for (const child of paramsNode.children) {
    if (child.type === "identifier" || child.type === "required_parameter") {
      const nameNode = child.childForFieldName("name") ?? child;
      params.push(nameNode.text);
    }
  }
  return params;
}

// Rename existing parseFile to regexFallback
async function regexFallback(content: string): Promise<ParsedFile> {
  // ... existing parseFile implementation, renamed ...
  return {
    functions: extractFunctions(content),
    imports: extractImports(content),
    exports: extractExports(content),
    classes: extractClasses(content),
    interfaces: extractInterfaces(content),
    types: extractTypes(content),
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm test ast-parser.test.ts
```

Expected: PASS (all existing + 5 new tests)

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/index.ts apps/backend/src/services/ast-parser.ts apps/backend/src/services/ast-parser.test.ts
git commit -m "feat: implement Tree-sitter AST function extraction with fallback"
```

---

### Task 3: Implement Tree-sitter Import/Export/Class Extraction

**Files:**
- Modify: `apps/backend/src/services/ast-parser.ts`
- Test: `apps/backend/src/services/ast-parser.test.ts`

- [ ] **Step 1: Write test for import extraction**

```typescript
// apps/backend/src/services/ast-parser.test.ts (add tests)
describe("Tree-sitter import extraction", () => {
  it("should extract named imports", async () => {
    const code = `import { foo, bar } from "./utils";`;
    const result = await parseFile(code, "test.ts");
    expect(result.imports).toHaveLength(1);
    expect(result.imports[0].module).toBe("./utils");
    expect(result.imports[0].imports).toEqual(["foo", "bar"]);
    expect(result.imports[0].isDefault).toBe(false);
  });

  it("should extract default imports", async () => {
    const code = `import React from "react";`;
    const result = await parseFile(code, "test.ts");
    expect(result.imports[0].isDefault).toBe(true);
    expect(result.imports[0].imports).toEqual(["React"]);
  });

  it("should extract mixed imports", async () => {
    const code = `import React, { useState } from "react";`;
    const result = await parseFile(code, "test.ts");
    expect(result.imports[0].imports).toContain("React");
    expect(result.imports[0].imports).toContain("useState");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test ast-parser.test.ts
```

Expected: FAIL (extractImportsFromAST not implemented)

- [ ] **Step 3: Implement import/export/class/interface/type extraction**

```typescript
// apps/backend/src/services/ast-parser.ts (add functions)

function extractImportsFromAST(root: Parser.SyntaxNode, _content: string): ImportInfo[] {
  const imports: ImportInfo[] = [];

  function visit(node: Parser.SyntaxNode) {
    if (node.type === "import_statement") {
      const sourceNode = node.childForFieldName("source");
      if (!sourceNode) return;

      const module = sourceNode.text.replace(/["']/g, "");
      const importsList: string[] = [];
      let isDefault = false;

      const clauseNode = node.childForFieldName("import_clause");
      if (clauseNode) {
        // Default import
        const defaultImport = clauseNode.childForFieldName("name");
        if (defaultImport) {
          importsList.push(defaultImport.text);
          isDefault = true;
        }

        // Named imports
        const namedImports = clauseNode.descendantsOfType("import_specifier");
        for (const spec of namedImports) {
          const nameNode = spec.childForFieldName("name");
          if (nameNode) {
            importsList.push(nameNode.text);
          }
        }
      }

      imports.push({
        module,
        imports: importsList,
        isDefault,
      });
    }

    for (const child of node.children) {
      visit(child);
    }
  }

  visit(root);
  return imports;
}

function extractExportsFromAST(root: Parser.SyntaxNode, _content: string): ExportInfo[] {
  const exports: ExportInfo[] = [];

  function visit(node: Parser.SyntaxNode) {
    if (node.type === "export_statement") {
      const declarationNode = node.childForFieldName("declaration");
      if (!declarationNode) return;

      const isDefault = node.text.includes("export default");

      // Function/class/variable export
      const nameNode =
        declarationNode.childForFieldName("name") ??
        declarationNode.children.find(c => c.type === "identifier");

      if (nameNode) {
        exports.push({
          name: nameNode.text,
          isDefault,
        });
      }
    }

    for (const child of node.children) {
      visit(child);
    }
  }

  visit(root);
  return exports;
}

function extractClassesFromAST(root: Parser.SyntaxNode): string[] {
  const classes: string[] = [];

  function visit(node: Parser.SyntaxNode) {
    if (node.type === "class_declaration") {
      const nameNode = node.childForFieldName("name");
      if (nameNode) {
        classes.push(nameNode.text);
      }
    }

    for (const child of node.children) {
      visit(child);
    }
  }

  visit(root);
  return classes;
}

function extractInterfacesFromAST(root: Parser.SyntaxNode): string[] {
  const interfaces: string[] = [];

  function visit(node: Parser.SyntaxNode) {
    if (node.type === "interface_declaration") {
      const nameNode = node.childForFieldName("name");
      if (nameNode) {
        interfaces.push(nameNode.text);
      }
    }

    for (const child of node.children) {
      visit(child);
    }
  }

  visit(root);
  return interfaces;
}

function extractTypesFromAST(root: Parser.SyntaxNode): string[] {
  const types: string[] = [];

  function visit(node: Parser.SyntaxNode) {
    if (node.type === "type_alias_declaration") {
      const nameNode = node.childForFieldName("name");
      if (nameNode) {
        types.push(nameNode.text);
      }
    }

    for (const child of node.children) {
      visit(child);
    }
  }

  visit(root);
  return types;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test ast-parser.test.ts
```

Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/services/ast-parser.ts apps/backend/src/services/ast-parser.test.ts
git commit -m "feat: implement Tree-sitter import/export/class/interface/type extraction"
```

---

### Task 4: Update diff-analyzer to Pass Filename

**Files:**
- Modify: `apps/backend/src/services/diff-analyzer.ts:85-86`

- [ ] **Step 1: Update parseFile calls to include filename**

```typescript
// apps/backend/src/services/diff-analyzer.ts (modify lines 85-86)
const oldParsed = await parseFile(oldContent, file.filename);
const newParsed = await parseFile(newContent, file.filename);
```

- [ ] **Step 2: Run all tests**

```bash
pnpm test
```

Expected: PASS (all existing tests still pass)

- [ ] **Step 3: Run typecheck**

```bash
pnpm typecheck
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/services/diff-analyzer.ts
git commit -m "feat: pass filename to parseFile for language detection"
```

---

## Phase 2: Multi-Model Consensus Pipeline

### Task 5: Add Consensus Types to Shared Package

**Files:**
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Add consensus-related types**

```typescript
// packages/shared/src/index.ts (add after AIReviewResult)

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

// Update AIReviewResult
export interface AIReviewResult {
  summary: AISummaryResult;
  risk: AIRiskResult;
  consensus: AIConsensusResult;  // NEW
  suggestion: AISuggestionResult;
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: Errors in ai-review-pipeline.ts (consensus field missing in return type)

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/index.ts
git commit -m "feat: add consensus types for multi-model voting"
```

---

### Task 6: Implement Consensus Merge Algorithm

**Files:**
- Create: `apps/backend/src/services/consensus-merger.ts`
- Test: `apps/backend/src/services/consensus-merger.test.ts`

- [ ] **Step 1: Write test for consensus merge**

```typescript
import { describe, it, expect } from "vitest";
import { mergeConsensus } from "./consensus-merger";
import type { ModelFinding } from "@ai-pr-review/shared";

describe("mergeConsensus", () => {
  it("should match findings from both models on same file and line", () => {
    const claude: ModelFinding[] = [
      {
        model: "claude",
        severity: "critical",
        message: "Race condition",
        file: "src/order.ts",
        line: 42,
        explanation: "Shared state",
      },
    ];
    const gemini: ModelFinding[] = [
      {
        model: "gemini",
        severity: "critical",
        message: "Race condition detected",
        file: "src/order.ts",
        line: 43,
        explanation: "Concurrent access",
      },
    ];

    const result = mergeConsensus(claude, gemini);
    expect(result.consensusIssues).toHaveLength(1);
    expect(result.consensusIssues[0].confidence).toBe("high");
    expect(result.consensusIssues[0].models).toEqual(["claude", "gemini"]);
  });

  it("should mark unmatched critical findings as medium confidence", () => {
    const claude: ModelFinding[] = [
      {
        model: "claude",
        severity: "critical",
        message: "Security issue",
        file: "src/auth.ts",
        line: 10,
        explanation: "SQL injection",
      },
    ];
    const gemini: ModelFinding[] = [];

    const result = mergeConsensus(claude, gemini);
    expect(result.claudeOnly).toHaveLength(1);
  });

  it("should not match findings on different files", () => {
    const claude: ModelFinding[] = [
      {
        model: "claude",
        severity: "warning",
        message: "Issue",
        file: "src/a.ts",
        line: 10,
        explanation: "Test",
      },
    ];
    const gemini: ModelFinding[] = [
      {
        model: "gemini",
        severity: "warning",
        message: "Issue",
        file: "src/b.ts",
        line: 10,
        explanation: "Test",
      },
    ];

    const result = mergeConsensus(claude, gemini);
    expect(result.consensusIssues).toHaveLength(0);
    expect(result.claudeOnly).toHaveLength(1);
    expect(result.geminiOnly).toHaveLength(1);
  });

  it("should handle empty findings", () => {
    const result = mergeConsensus([], []);
    expect(result.consensusIssues).toHaveLength(0);
    expect(result.allAgreeCount).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test consensus-merger.test.ts
```

Expected: FAIL with "Cannot find module './consensus-merger'"

- [ ] **Step 3: Implement consensus merger**

```typescript
// apps/backend/src/services/consensus-merger.ts
import type {
  ModelFinding,
  ConsensusIssue,
  AIConsensusResult,
  AIRiskIssue,
  ConsensusConfidence,
} from "@ai-pr-review/shared";

export function mergeConsensus(
  claudeFindings: ModelFinding[],
  geminiFindings: ModelFinding[]
): AIConsensusResult {
  const matched: ConsensusIssue[] = [];
  const unmatchedClaude = [...claudeFindings];
  const unmatchedGemini = [...geminiFindings];

  // Match findings from both models
  for (let i = unmatchedClaude.length - 1; i >= 0; i--) {
    const claude = unmatchedClaude[i];
    if (!claude) continue;

    for (let j = unmatchedGemini.length - 1; j >= 0; j--) {
      const gemini = unmatchedGemini[j];
      if (!gemini) continue;

      if (isMatch(claude, gemini)) {
        const consensus = createConsensusIssue(claude, gemini);
        matched.push(consensus);
        unmatchedClaude.splice(i, 1);
        unmatchedGemini.splice(j, 1);
        break;
      }
    }
  }

  // Sort by confidence (high > medium > low), then by severity
  matched.sort((a, b) => {
    const confidenceOrder = { high: 0, medium: 1, low: 2 };
    const severityOrder = { critical: 0, warning: 1, info: 2 };

    const confDiff = confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
    if (confDiff !== 0) return confDiff;

    return severityOrder[a.issue.severity] - severityOrder[b.issue.severity];
  });

  return {
    consensusIssues: matched,
    claudeOnly: unmatchedClaude,
    geminiOnly: unmatchedGemini,
    allAgreeCount: matched.filter(i => i.confidence === "high").length,
    claudeTotal: claudeFindings.length,
    geminiTotal: geminiFindings.length,
  };
}

function isMatch(a: ModelFinding, b: ModelFinding): boolean {
  return (
    a.file === b.file &&
    Math.abs(a.line - b.line) <= 3 &&
    severityCompatible(a.severity, b.severity)
  );
}

function severityCompatible(a: string, b: string): boolean {
  if (a === "info" || b === "info") return a === b;
  return true; // critical and warning are compatible
}

function createConsensusIssue(
  claude: ModelFinding,
  gemini: ModelFinding
): ConsensusIssue {
  // Use Claude's finding as the primary issue
  const issue: AIRiskIssue = {
    severity: claude.severity,
    message: claude.message,
    file: claude.file,
    line: claude.line,
    explanation: claude.explanation,
  };

  return {
    issue,
    confidence: "high",
    models: ["claude", "gemini"],
    modelFindings: [claude, gemini],
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test consensus-merger.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/services/consensus-merger.ts apps/backend/src/services/consensus-merger.test.ts
git commit -m "feat: implement consensus merge algorithm for multi-model voting"
```

---

### Task 7: Refactor AIReviewPipeline for Parallel Risk Analysis

**Files:**
- Modify: `apps/backend/src/services/ai-review-pipeline.ts`
- Modify: `apps/backend/src/services/ai-review-pipeline.test.ts`

- [ ] **Step 1: Update pipeline to run risk analysis in parallel**

```typescript
// apps/backend/src/services/ai-review-pipeline.ts (modify run method)

import { mergeConsensus } from "./consensus-merger.js";

// ... existing code ...

async run(pr: PullRequest, diff: string, semanticDiff: SemanticDiff): Promise<AIReviewResult> {
  const summary = await this.generateSummary(pr, semanticDiff);

  // Stage 2: Parallel Risk Analysis
  const [claudeFindings, geminiFindings] = await Promise.all([
    this.analyzeRisksWithModel(this.riskClient, "claude", pr, diff, semanticDiff),
    this.analyzeRisksWithModel(this.summaryClient, "gemini", pr, diff, semanticDiff),
  ]);

  // Stage 3: Consensus Merge
  const consensus = mergeConsensus(claudeFindings, geminiFindings);

  // Stage 4: Suggestions (only for high/medium confidence issues)
  const issuesForSuggestion = consensus.consensusIssues
    .filter(i => i.confidence !== "low")
    .map(i => i.issue);
  const suggestion = await this.generateSuggestions(issuesForSuggestion, diff);

  // Build backward-compatible risk result
  const risk: AIRiskResult = {
    issues: consensus.consensusIssues.map(i => i.issue),
    stage: "risk",
  };

  return { summary, risk, consensus, suggestion };
}

async analyzeRisksWithModel(
  client: LLMClient,
  modelName: "claude" | "gemini",
  pr: PullRequest,
  diff: string,
  semanticDiff: SemanticDiff
): Promise<ModelFinding[]> {
  const prompt = this.buildRiskPrompt(pr, diff, semanticDiff);
  const response = await client.generateText(prompt);
  const issues = this.parseRiskResponse(response);

  // Convert AIRiskIssue to ModelFinding
  return issues.map(issue => ({
    model: modelName,
    severity: issue.severity,
    message: issue.message,
    file: issue.file,
    line: issue.line,
    explanation: issue.explanation,
  }));
}
```

- [ ] **Step 2: Write test for parallel risk analysis**

```typescript
// apps/backend/src/services/ai-review-pipeline.test.ts (add new test)
import { describe, it, expect, vi } from "vitest";
import { AIReviewPipeline } from "./ai-review-pipeline";
import type { PullRequest, SemanticDiff } from "@ai-pr-review/shared";

describe("AIReviewPipeline parallel risk analysis", () => {
  it("should run both models in parallel and return consensus", async () => {
    const mockClaude = {
      generateText: vi.fn().mockResolvedValue(
        JSON.stringify({
          issues: [
            {
              severity: "critical",
              message: "Race condition",
              file: "src/order.ts",
              line: 42,
              explanation: "Shared state",
            },
          ],
        })
      ),
    };

    const mockGemini = {
      generateText: vi.fn().mockResolvedValue(
        JSON.stringify({
          issues: [
            {
              severity: "critical",
              message: "Race condition detected",
              file: "src/order.ts",
              line: 43,
              explanation: "Concurrent access",
            },
          ],
        })
      ),
    };

    const pipeline = new AIReviewPipeline({
      summaryClient: mockGemini,
      riskClient: mockClaude,
      suggestionClient: mockClaude,
    });

    const pr: PullRequest = {
      id: 1,
      title: "Test PR",
      description: "Test",
      author: "test",
      branch: "feature",
      baseBranch: "main",
      files: [],
      commits: [],
    };

    const semanticDiff: SemanticDiff = {
      fileChanges: [],
      summary: "test",
      totalFiles: 0,
      totalAdditions: 0,
      totalDeletions: 0,
    };

    const result = await pipeline.run(pr, "diff", semanticDiff);

    expect(result.consensus).toBeDefined();
    expect(result.consensus.consensusIssues).toHaveLength(1);
    expect(result.consensus.consensusIssues[0].confidence).toBe("high");
    expect(result.consensus.consensusIssues[0].models).toEqual(["claude", "gemini"]);
    expect(mockClaude.generateText).toHaveBeenCalled();
    expect(mockGemini.generateText).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run test to verify it passes**

```bash
pnpm test ai-review-pipeline.test.ts
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/services/ai-review-pipeline.ts apps/backend/src/services/ai-review-pipeline.test.ts
git commit -m "feat: refactor pipeline for parallel dual-model risk analysis"
```

---

### Task 8: Create ConsensusView Frontend Component

**Files:**
- Create: `apps/frontend/src/components/ConsensusView.tsx`
- Create: `apps/frontend/src/components/ConsensusStats.tsx`
- Create: `apps/frontend/src/components/ConsensusIssueCard.tsx`

- [ ] **Step 1: Implement ConsensusStats**

```tsx
// apps/frontend/src/components/ConsensusStats.tsx
import type { AIConsensusResult } from "@ai-pr-review/shared";

interface ConsensusStatsProps {
  consensus: AIConsensusResult;
}

export function ConsensusStats({ consensus }: ConsensusStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-center">
        <p className="text-xs text-purple-400 uppercase tracking-wider mb-1">Claude</p>
        <p className="text-2xl font-bold text-purple-300">{consensus.claudeTotal}</p>
        <p className="text-xs text-slate-500">issues found</p>
      </div>
      <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
        <p className="text-xs text-green-400 uppercase tracking-wider mb-1">Consensus</p>
        <p className="text-2xl font-bold text-green-300">{consensus.allAgreeCount}</p>
        <p className="text-xs text-slate-500">both agree</p>
      </div>
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
        <p className="text-xs text-blue-400 uppercase tracking-wider mb-1">Gemini</p>
        <p className="text-2xl font-bold text-blue-300">{consensus.geminiTotal}</p>
        <p className="text-xs text-slate-500">issues found</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement ConsensusIssueCard**

```tsx
// apps/frontend/src/components/ConsensusIssueCard.tsx
import type { ConsensusIssue } from "@ai-pr-review/shared";
import { useState } from "react";
import { SeverityBadge } from "./SeverityBadge";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ConsensusIssueCardProps {
  issue: ConsensusIssue;
}

export function ConsensusIssueCard({ issue }: ConsensusIssueCardProps) {
  const [expanded, setExpanded] = useState(issue.confidence === "high");

  const confidenceStyles = {
    high: "bg-green-500/10 border-green-500/30",
    medium: "bg-yellow-500/10 border-yellow-500/30",
    low: "bg-slate-800/50 border-slate-700",
  };

  const confidenceLabel = {
    high: "🔒 HIGH CONFIDENCE — Both models agree",
    medium: "⚠️ MEDIUM CONFIDENCE — Single model finding",
    low: "ℹ️ LOW CONFIDENCE — Minor, single model",
  };

  return (
    <div className={`border rounded-lg p-4 mb-3 ${confidenceStyles[issue.confidence]}`}>
      <div className="flex items-start gap-3 mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <SeverityBadge severity={issue.issue.severity} />
            <span className="text-sm font-medium text-slate-200">{issue.issue.message}</span>
          </div>
          <div className="text-xs text-slate-400 font-mono mb-1">
            {issue.issue.file}:{issue.issue.line}
          </div>
          <div className="text-xs text-slate-500">{confidenceLabel[issue.confidence]}</div>
        </div>
        {issue.confidence === "high" && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-slate-400 hover:text-slate-200"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}
      </div>

      {expanded && issue.confidence === "high" && (
        <div className="mt-4 space-y-3 border-t border-slate-700/50 pt-3">
          {issue.modelFindings.map((finding) => (
            <div key={finding.model} className="text-sm">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                {finding.model === "claude" ? "Claude says:" : "Gemini says:"}
              </p>
              <p className="text-slate-300">{finding.explanation}</p>
            </div>
          ))}
        </div>
      )}

      {issue.confidence !== "high" && (
        <div className="mt-2 text-sm text-slate-300">{issue.issue.explanation}</div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Implement ConsensusView**

```tsx
// apps/frontend/src/components/ConsensusView.tsx
import type { AIConsensusResult } from "@ai-pr-review/shared";
import { ConsensusStats } from "./ConsensusStats";
import { ConsensusIssueCard } from "./ConsensusIssueCard";

interface ConsensusViewProps {
  consensus: AIConsensusResult;
}

export function ConsensusView({ consensus }: ConsensusViewProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-200 mb-4">Review Consensus</h2>
      <ConsensusStats consensus={consensus} />

      {consensus.consensusIssues.length > 0 && (
        <div className="space-y-3">
          {consensus.consensusIssues.map((issue, i) => (
            <ConsensusIssueCard key={`${issue.issue.file}-${issue.issue.line}-${i}`} issue={issue} />
          ))}
        </div>
      )}

      {consensus.claudeOnly.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
            Claude Only ({consensus.claudeOnly.length})
          </h3>
          {consensus.claudeOnly.map((finding, i) => (
            <ConsensusIssueCard
              key={`claude-${i}`}
              issue={{
                issue: {
                  severity: finding.severity,
                  message: finding.message,
                  file: finding.file,
                  line: finding.line,
                  explanation: finding.explanation,
                },
                confidence: finding.severity === "info" ? "low" : "medium",
                models: ["claude"],
                modelFindings: [finding],
              }}
            />
          ))}
        </div>
      )}

      {consensus.geminiOnly.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
            Gemini Only ({consensus.geminiOnly.length})
          </h3>
          {consensus.geminiOnly.map((finding, i) => (
            <ConsensusIssueCard
              key={`gemini-${i}`}
              issue={{
                issue: {
                  severity: finding.severity,
                  message: finding.message,
                  file: finding.file,
                  line: finding.line,
                  explanation: finding.explanation,
                },
                confidence: finding.severity === "info" ? "low" : "medium",
                models: ["gemini"],
                modelFindings: [finding],
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/components/ConsensusView.tsx apps/frontend/src/components/ConsensusStats.tsx apps/frontend/src/components/ConsensusIssueCard.tsx
git commit -m "feat: add consensus view components for multi-model comparison"
```

---

### Task 9: Integrate ConsensusView into ReviewResult Page

**Files:**
- Modify: `apps/frontend/src/pages/ReviewResult.tsx`
- Modify: `apps/frontend/src/api/client.ts`

- [ ] **Step 1: Update API client types**

```typescript
// apps/frontend/src/api/client.ts (update ReviewResponse)
export interface ReviewResponse {
  pr: {
    id: number;
    title: string;
    description: string;
    author: string;
    branch: string;
    baseBranch: string;
  };
  semanticDiff: SemanticDiff;
  review: AIReviewResult;
  // consensus is now part of AIReviewResult
}
```

- [ ] **Step 2: Replace RiskIssues section with ConsensusView**

```tsx
// apps/frontend/src/pages/ReviewResult.tsx (modify)
import { ConsensusView } from "../components/ConsensusView";

// In ReviewContent component, replace the Risk Issues section:
{/* Risk Issues - replaced with Consensus View */}
<section>
  <ConsensusView consensus={review.consensus} />
</section>
```

- [ ] **Step 3: Run typecheck**

```bash
pnpm typecheck
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/pages/ReviewResult.tsx apps/frontend/src/api/client.ts
git commit -m "feat: integrate consensus view into review result page"
```

---

## Phase 3: Race Condition Detection

### Task 10: Add Race Condition Types

**Files:**
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Add race condition types**

```typescript
// packages/shared/src/index.ts (add after consensus types)

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

// Update AIReviewResult
export interface AIReviewResult {
  summary: AISummaryResult;
  risk: AIRiskResult;
  consensus: AIConsensusResult;
  raceConditions: RaceConditionIssue[];  // NEW
  suggestion: AISuggestionResult;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/shared/src/index.ts
git commit -m "feat: add race condition detection types"
```

---

### Task 11: Implement Race Condition Pattern Extractor

**Files:**
- Create: `apps/backend/src/services/race-condition-analyzer.ts`
- Create: `apps/backend/src/services/race-condition-analyzer.test.ts`

- [ ] **Step 1: Write test for async function detection**

```typescript
import { describe, it, expect } from "vitest";
import { analyzeRaceConditionPatterns } from "./race-condition-analyzer";
import type { SemanticDiff } from "@ai-pr-review/shared";

describe("analyzeRaceConditionPatterns", () => {
  it("should detect async functions with shared state writes", async () => {
    const semanticDiff: SemanticDiff = {
      fileChanges: [
        {
          filename: "src/order.ts",
          status: "modified",
          additions: 10,
          deletions: 5,
          changeType: "modified",
          summary: "Modified order processing",
          functionChanges: [
            {
              name: "processOrder",
              changeType: "modified",
              oldSignature: "processOrder()",
              newSignature: "processOrder()",
            },
          ],
          importChanges: [],
          exportChanges: [],
        },
      ],
      summary: "test",
      totalFiles: 1,
      totalAdditions: 10,
      totalDeletions: 5,
    };

    // Mock the actual code content for testing
    const result = await analyzeRaceConditionPatterns(semanticDiff, {
      "src/order.ts": `
        async function processOrder() {
          inventoryCount -= 1;
          await db.orders.update();
        }
        async function cancelOrder() {
          inventoryCount -= 1;
          await db.orders.update();
        }
      `,
    });

    expect(result.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test race-condition-analyzer.test.ts
```

Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement race condition analyzer**

```typescript
// apps/backend/src/services/race-condition-analyzer.ts
import type {
  SemanticDiff,
  ConcurrencyPattern,
  SharedStateAccess,
  RaceConditionIssue,
  ConcurrencyPatternType,
} from "@ai-pr-review/shared";
import { parseFile } from "./ast-parser.js";
import type Parser from "web-tree-sitter";

export async function analyzeRaceConditionPatterns(
  semanticDiff: SemanticDiff,
  fileContents: Record<string, string>
): Promise<ConcurrencyPattern[]> {
  const allPatterns: ConcurrencyPattern[] = [];

  for (const fileChange of semanticDiff.fileChanges) {
    if (fileChange.functionChanges.length === 0) continue;

    const content = fileContents[fileChange.filename];
    if (!content) continue;

    try {
      const parsed = await parseFile(content, fileChange.filename);

      // Extract concurrent patterns from functions
      for (const func of parsed.functions) {
        if (!func.isAsync && !func.body?.includes("Promise") && !func.body?.includes("await")) {
          continue;
        }

        const patternType: ConcurrencyPatternType = func.isAsync
          ? "async_function"
          : "promise_chain";

        const sharedStateAccess = extractSharedStateAccess(func.body ?? "", func.startLine);

        if (sharedStateAccess.length > 0) {
          allPatterns.push({
            type: patternType,
            file: fileChange.filename,
            line: func.startLine,
            endLine: func.endLine,
            functionName: func.name,
            sharedStateAccess,
          });
        }
      }
    } catch (error) {
      console.warn(`Failed to analyze ${fileChange.filename}:`, error);
    }
  }

  return allPatterns;
}

function extractSharedStateAccess(code: string, startLine: number): SharedStateAccess[] {
  const accesses: SharedStateAccess[] = [];
  const lines = code.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const lineNum = startLine + i;

    // Variable writes (assignment, update expressions)
    if (/[\w.]+\s*[-+*/]?=/.test(line) || /[\w.]+\+\+|[\w.]+--/.test(line)) {
      const match = line.match(/([\w.]+)\s*[-+*/]?=/);
      if (match && match[1]) {
        accesses.push({
          type: "variable_write",
          name: match[1],
          line: lineNum,
          isWrite: true,
        });
      }
    }

    // DB operations
    if (/\.(query|update|delete|save|create|insert)\s*\(/.test(line)) {
      const match = line.match(/([\w.]+)\.(query|update|delete|save|create|insert)/);
      if (match && match[1]) {
        accesses.push({
          type: "db_operation",
          name: match[1],
          line: lineNum,
          isWrite: !line.includes(".query("),
        });
      }
    }

    // Cache operations
    if (/(cache|redis|store)\.(get|set|delete|invalidate)\s*\(/.test(line)) {
      const match = line.match(/(cache|redis|store)\.(get|set|delete|invalidate)/);
      if (match && match[1]) {
        accesses.push({
          type: "cache_operation",
          name: match[1],
          line: lineNum,
          isWrite: match[2] !== "get",
        });
      }
    }

    // Array mutations
    if (/[\w.]+\.(push|splice|shift|pop)\s*\(/.test(line)) {
      const match = line.match(/([\w.]+)\.(push|splice|shift|pop)/);
      if (match && match[1]) {
        accesses.push({
          type: "global_mutation",
          name: match[1],
          line: lineNum,
          isWrite: true,
        });
      }
    }
  }

  return accesses;
}

export function detectRaceConditionCandidates(
  patterns: ConcurrencyPattern[]
): Array<{ sharedState: string; patterns: ConcurrencyPattern[] }> {
  const candidates: Array<{ sharedState: string; patterns: ConcurrencyPattern[] }> = [];
  const stateMap = new Map<string, ConcurrencyPattern[]>();

  // Group patterns by shared state
  for (const pattern of patterns) {
    for (const access of pattern.sharedStateAccess) {
      if (!access.isWrite) continue;

      if (!stateMap.has(access.name)) {
        stateMap.set(access.name, []);
      }
      stateMap.get(access.name)!.push(pattern);
    }
  }

  // Find states accessed by multiple patterns
  for (const [state, statePatterns] of stateMap) {
    if (statePatterns.length >= 2) {
      candidates.push({
        sharedState: state,
        patterns: statePatterns,
      });
    }
  }

  return candidates;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test race-condition-analyzer.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/services/race-condition-analyzer.ts apps/backend/src/services/race-condition-analyzer.test.ts
git commit -m "feat: implement race condition pattern extractor using Tree-sitter"
```

---

### Task 12: Integrate Race Condition Detection into Pipeline

**Files:**
- Modify: `apps/backend/src/services/ai-review-pipeline.ts`

- [ ] **Step 1: Update pipeline to include race condition analysis**

```typescript
// apps/backend/src/services/ai-review-pipeline.ts (modify run method)

import {
  analyzeRaceConditionPatterns,
  detectRaceConditionCandidates,
} from "./race-condition-analyzer.js";
import type { ConcurrencyPattern, RaceConditionIssue, ModelName } from "@ai-pr-review/shared";

async run(
  pr: PullRequest,
  diff: string,
  semanticDiff: SemanticDiff,
  fileContents: Record<string, string>  // NEW parameter
): Promise<AIReviewResult> {
  const summary = await this.generateSummary(pr, semanticDiff);

  // Extract race condition patterns (local, <100ms)
  const racePatterns = await analyzeRaceConditionPatterns(semanticDiff, fileContents);
  const raceCandidates = detectRaceConditionCandidates(racePatterns);

  // Parallel Risk Analysis (with race condition context in prompt)
  const [claudeResponse, geminiResponse] = await Promise.all([
    this.riskClient.generateText(
      this.buildRiskPrompt(pr, diff, semanticDiff, raceCandidates)
    ),
    this.summaryClient.generateText(
      this.buildRiskPrompt(pr, diff, semanticDiff, raceCandidates)
    ),
  ]);

  // Parse both risk findings and race conditions from each model
  const claudeFindings = this.parseRiskResponse(claudeResponse).map(
    (issue): ModelFinding => ({
      model: "claude",
      severity: issue.severity,
      message: issue.message,
      file: issue.file,
      line: issue.line,
      explanation: issue.explanation,
    })
  );

  const geminiFindings = this.parseRiskResponse(geminiResponse).map(
    (issue): ModelFinding => ({
      model: "gemini",
      severity: issue.severity,
      message: issue.message,
      file: issue.file,
      line: issue.line,
      explanation: issue.explanation,
    })
  );

  // Parse race conditions from each model
  const claudeRaceConditions = this.parseRaceConditions(claudeResponse).map(
    (rc): RaceConditionIssue => ({
      ...rc,
      models: ["claude"],
    })
  );

  const geminiRaceConditions = this.parseRaceConditions(geminiResponse).map(
    (rc): RaceConditionIssue => ({
      ...rc,
      models: ["gemini"],
    })
  );

  // Merge race conditions by matching file + line + sharedState
  const mergedRaceConditions = this.mergeRaceConditions(
    claudeRaceConditions,
    geminiRaceConditions
  );

  const consensus = mergeConsensus(claudeFindings, geminiFindings);

  const issuesForSuggestion = consensus.consensusIssues
    .filter(i => i.confidence !== "low")
    .map(i => i.issue);
  const suggestion = await this.generateSuggestions(issuesForSuggestion, diff);

  const risk: AIRiskResult = {
    issues: consensus.consensusIssues.map(i => i.issue),
    stage: "risk",
  };

  return { summary, risk, consensus, raceConditions: mergedRaceConditions, suggestion };
}

private mergeRaceConditions(
  claudeRCs: RaceConditionIssue[],
  geminiRCs: RaceConditionIssue[]
): RaceConditionIssue[] {
  const merged: RaceConditionIssue[] = [];
  const unmatchedClaude = [...claudeRCs];
  const unmatchedGemini = [...geminiRCs];

  // Match race conditions from both models
  for (let i = unmatchedClaude.length - 1; i >= 0; i--) {
    const claude = unmatchedClaude[i];
    if (!claude) continue;

    for (let j = unmatchedGemini.length - 1; j >= 0; j--) {
      const gemini = unmatchedGemini[j];
      if (!gemini) continue;

      if (
        claude.file === gemini.file &&
        Math.abs(claude.line - gemini.line) <= 5 &&
        claude.sharedState === gemini.sharedState
      ) {
        // Merge: use Claude's data but mark as high confidence
        merged.push({
          ...claude,
          confidence: "high",
          models: ["claude", "gemini"],
        });
        unmatchedClaude.splice(i, 1);
        unmatchedGemini.splice(j, 1);
        break;
      }
    }
  }

  // Add unmatched (medium confidence)
  for (const rc of unmatchedClaude) {
    merged.push({ ...rc, confidence: "medium", models: ["claude"] });
  }
  for (const rc of unmatchedGemini) {
    merged.push({ ...rc, confidence: "medium", models: ["gemini"] });
  }

  // Sort by confidence (high > medium)
  merged.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.confidence] - order[b.confidence];
  });

  return merged;
}
```

- [ ] **Step 2: Update buildRiskPrompt to request structured race condition data**

```typescript
// apps/backend/src/services/ai-review-pipeline.ts (modify buildRiskPrompt)

private buildRiskPrompt(
  pr: PullRequest,
  diff: string,
  semanticDiff: SemanticDiff,
  raceCandidates?: Array<{ sharedState: string; patterns: ConcurrencyPattern[] }>
): string {
  let basePrompt = `Analyze this pull request for potential risks, bugs, security issues, and logic errors.

PR Title: ${pr.title}
PR Description: ${pr.description || "(no description)"}

Semantic Changes:
${semanticDiff.fileChanges.map((f) => `- ${f.filename}: ${f.summary}`).join("\n")}

Full Diff:
\`\`\`diff
${diff}
\`\`\`

Identify issues related to:
- Logic errors and bugs
- Security vulnerabilities (SQL injection, XSS, auth bypass, etc.)
- Error handling gaps
- Race conditions
- Performance issues
- Breaking changes

For each issue found, provide a JSON response with this exact structure:
{
  "issues": [
    {
      "severity": "critical" | "warning" | "info",
      "message": "Brief one-line description of the issue",
      "file": "path/to/file.ts",
      "line": 42,
      "explanation": "Detailed explanation of why this is risky and what could go wrong"
    }
  ]
}`;

  // Add race condition section if candidates exist
  if (raceCandidates && raceCandidates.length > 0) {
    basePrompt += `\n\nADDITIONAL: Race Condition Analysis

Tree-sitter analysis detected the following concurrent access patterns that may lead to race conditions:

`;

    for (const candidate of raceCandidates.slice(0, 3)) {
      basePrompt += `Shared state: ${candidate.sharedState}\n`;
      for (const pattern of candidate.patterns) {
        basePrompt += `  - ${pattern.type}: ${pattern.functionName}() at ${pattern.file}:${pattern.line}\n`;
        for (const access of pattern.sharedStateAccess) {
          basePrompt += `    * ${access.isWrite ? "Write" : "Read"}: ${access.name} (line ${access.line})\n`;
        }
      }
      basePrompt += `\n`;
    }

    basePrompt += `
For each race condition detected, provide EXECUTION PATH details in this structure:
{
  "raceConditions": [
    {
      "severity": "critical" | "warning" | "info",
      "message": "Brief description",
      "file": "path/to/file.ts",
      "line": 15,
      "explanation": "Detailed explanation",
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

Focus on CODE QUALITY issues, not style preferences. Be specific with line numbers. Respond with ONLY the JSON, no markdown code blocks.`;
  } else {
    basePrompt += `

If no issues are found, return: {"issues": []}

Focus on CODE QUALITY issues, not style preferences. Be specific with line numbers. Respond with ONLY the JSON, no markdown code blocks.`;
  }

  return basePrompt;
}
```

- [ ] **Step 3: Add parseRaceConditions method**

```typescript
// apps/backend/src/services/ai-review-pipeline.ts (add method)

private parseRaceConditions(response: string): RaceConditionIssue[] {
  try {
    const cleaned = response
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    const parsed = JSON.parse(cleaned) as { raceConditions?: unknown[] };

    if (!parsed.raceConditions || !Array.isArray(parsed.raceConditions)) {
      return [];
    }

    return parsed.raceConditions
      .filter((rc): rc is Record<string, unknown> => {
        return (
          typeof rc === "object" &&
          rc !== null &&
          "severity" in rc &&
          "message" in rc &&
          "patternA" in rc &&
          "patternB" in rc
        );
      })
      .map((rc) => ({
        severity: this.validateSeverity(rc.severity),
        message: String(rc.message),
        file: String(rc.file),
        line: Number(rc.line) || 0,
        explanation: String(rc.explanation),
        sharedState: String(rc.sharedState || "unknown"),
        patternA: this.validateExecutionPath(rc.patternA),
        patternB: this.validateExecutionPath(rc.patternB),
        conflictPoint: String(rc.conflictPoint || "unknown"),
        confidence: "high" as ConsensusConfidence, // Will be updated by consensus merge
        models: [] as ModelName[], // Will be updated by consensus merge
      }));
  } catch {
    return [];
  }
}

private validateExecutionPath(path: unknown): ExecutionPath {
  if (typeof path !== "object" || path === null) {
    return { label: "Unknown", functionName: "unknown", steps: [] };
  }

  const p = path as Record<string, unknown>;
  const steps = Array.isArray(p.steps)
    ? p.steps
        .filter(
          (s): s is Record<string, unknown> =>
            typeof s === "object" && s !== null
        )
        .map((s) => ({
          description: String(s.description || ""),
          line: Number(s.line) || 0,
          isConflictPoint: Boolean(s.isConflictPoint),
        }))
    : [];

  return {
    label: String(p.label || "Unknown"),
    functionName: String(p.functionName || "unknown"),
    steps,
  };
}
```

- [ ] **Step 3: Update backend API to pass file contents**

```typescript
// apps/backend/src/index.ts (modify /api/review endpoint)
// Fetch file contents for each changed file
const fileContents: Record<string, string> = {};
for (const file of pr.files) {
  try {
    const content = await github.getFileContent(owner, repo, file.filename, pr.branch);
    fileContents[file.filename] = content;
  } catch {
    // Skip files that can't be fetched
  }
}

const reviewResult = await pipeline.run(pr, diff, semanticDiff, fileContents);
```

- [ ] **Step 4: Add getFileContent method to GitHubService**

```typescript
// apps/backend/src/services/github.ts (add method)
async getFileContent(
  owner: string,
  repo: string,
  path: string,
  ref: string
): Promise<string> {
  const { data } = await this.octokit.repos.getContent({
    owner,
    repo,
    path,
    ref,
  });

  if ("content" in data && typeof data.content === "string") {
    return Buffer.from(data.content, "base64").toString("utf-8");
  }

  throw new Error(`Cannot get content for ${path}`);
}
```

- [ ] **Step 5: Run tests**

```bash
pnpm test
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/services/ai-review-pipeline.ts apps/backend/src/services/github.ts apps/backend/src/index.ts
git commit -m "feat: integrate race condition detection into pipeline"
```

---

### Task 13: Create Race Condition Timeline UI

**Files:**
- Create: `apps/frontend/src/components/RaceConditionTimeline.tsx`
- Create: `apps/frontend/src/components/ExecutionPathColumn.tsx`
- Create: `apps/frontend/src/components/ConflictIndicator.tsx`

- [ ] **Step 1: Implement ExecutionPathColumn**

```tsx
// apps/frontend/src/components/ExecutionPathColumn.tsx
import type { ExecutionPath, PathStep } from "@ai-pr-review/shared";

interface ExecutionPathColumnProps {
  path: ExecutionPath;
  currentStep: number;
  highlightConflict: boolean;
}

export function ExecutionPathColumn({
  path,
  currentStep,
  highlightConflict,
}: ExecutionPathColumnProps) {
  return (
    <div className="flex-1">
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-3">
        <h3 className="text-sm font-semibold text-slate-200 mb-1">{path.label}</h3>
        <p className="text-xs text-slate-400 font-mono">{path.functionName}()</p>
      </div>

      <div className="space-y-2">
        {path.steps.map((step, index) => {
          const isActive = index <= currentStep;
          const isConflict = step.isConflictPoint && highlightConflict;

          return (
            <div
              key={index}
              className={`
                border rounded-lg p-3 transition-all
                ${isConflict ? "bg-red-500/20 border-red-500/50 animate-pulse" : ""}
                ${isActive && !isConflict ? "bg-blue-500/10 border-blue-500/30" : ""}
                ${!isActive ? "bg-slate-900/30 border-slate-800 opacity-50" : ""}
              `}
            >
              <div className="flex items-start gap-2">
                <span className="text-xs font-bold text-slate-500 mt-0.5">
                  {index + 1}.
                </span>
                <div className="flex-1">
                  <p className="text-sm text-slate-200">{step.description}</p>
                  <p className="text-xs text-slate-500 font-mono mt-1">:{step.line}</p>
                </div>
                {isConflict && (
                  <span className="text-xs font-bold text-red-400">⚠️ CONFLICT</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement ConflictIndicator**

```tsx
// apps/frontend/src/components/ConflictIndicator.tsx
interface ConflictIndicatorProps {
  visible: boolean;
  conflictPoint: string;
}

export function ConflictIndicator({ visible, conflictPoint }: ConflictIndicatorProps) {
  if (!visible) return null;

  return (
    <div className="flex items-center justify-center my-4">
      <div className="flex-1 border-t-2 border-dashed border-red-500/50"></div>
      <div className="mx-4 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg">
        <p className="text-xs font-bold text-red-400 text-center">CONFLICT</p>
        <p className="text-xs text-slate-300 text-center mt-1">{conflictPoint}</p>
      </div>
      <div className="flex-1 border-t-2 border-dashed border-red-500/50"></div>
    </div>
  );
}
```

- [ ] **Step 3: Implement RaceConditionTimeline**

```tsx
// apps/frontend/src/components/RaceConditionTimeline.tsx
import type { RaceConditionIssue } from "@ai-pr-review/shared";
import { useState, useEffect } from "react";
import { Play, RotateCcw } from "lucide-react";
import { ExecutionPathColumn } from "./ExecutionPathColumn";
import { ConflictIndicator } from "./ConflictIndicator";
import { SeverityBadge } from "./SeverityBadge";

interface RaceConditionTimelineProps {
  issues: RaceConditionIssue[];
}

export function RaceConditionTimeline({ issues }: RaceConditionTimelineProps) {
  const [currentIssueIndex, setCurrentIssueIndex] = useState(0);
  const [animationStep, setAnimationStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);

  const issue = issues[currentIssueIndex];
  if (!issue) return null;

  const maxSteps = Math.max(
    issue.patternA.steps.length,
    issue.patternB.steps.length
  );

  const hasConflict =
    animationStep >= 0 &&
    (issue.patternA.steps[animationStep]?.isConflictPoint ||
      issue.patternB.steps[animationStep]?.isConflictPoint);

  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      setAnimationStep(prev => {
        if (prev >= maxSteps - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, maxSteps]);

  const handlePlay = () => {
    setAnimationStep(0);
    setIsPlaying(true);
  };

  const handleReplay = () => {
    setAnimationStep(-1);
    setIsPlaying(false);
  };

  return (
    <div className="space-y-6">
      {issues.length > 1 && (
        <div className="flex gap-2 mb-4">
          {issues.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setCurrentIssueIndex(i);
                handleReplay();
              }}
              className={`px-3 py-1 text-xs rounded ${
                i === currentIssueIndex
                  ? "bg-blue-500 text-white"
                  : "bg-slate-700 text-slate-300"
              }`}
            >
              Issue {i + 1}
            </button>
          ))}
        </div>
      )}

      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <div className="flex items-start gap-3 mb-4">
          <span className="text-2xl">⚡</span>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <SeverityBadge severity={issue.severity} />
              <span className="text-sm font-medium text-slate-200">{issue.message}</span>
            </div>
            <p className="text-xs text-slate-400 font-mono mb-1">
              {issue.file}:{issue.line}
            </p>
            {issue.confidence === "high" && (
              <p className="text-xs text-green-400 font-semibold">
                🔒 HIGH CONFIDENCE — Both models detected this
              </p>
            )}
          </div>
        </div>

        <p className="text-sm text-slate-300 mb-2">
          <span className="font-semibold">Shared State:</span> {issue.sharedState}
        </p>
        <p className="text-sm text-slate-300 mb-6">{issue.explanation}</p>

        <div className="grid grid-cols-2 gap-6">
          <ExecutionPathColumn
            path={issue.patternA}
            currentStep={animationStep}
            highlightConflict={hasConflict}
          />
          <ExecutionPathColumn
            path={issue.patternB}
            currentStep={animationStep}
            highlightConflict={hasConflict}
          />
        </div>

        <ConflictIndicator visible={hasConflict} conflictPoint={issue.conflictPoint} />

        <div className="flex items-center justify-center gap-4 mt-6">
          {animationStep === -1 && (
            <button
              type="button"
              onClick={handlePlay}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
            >
              <Play className="h-4 w-4" />
              Play Animation
            </button>
          )}
          {animationStep >= 0 && !isPlaying && (
            <button
              type="button"
              onClick={handleReplay}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Replay
            </button>
          )}
          {animationStep >= 0 && (
            <span className="text-sm text-slate-400">
              Step {animationStep + 1} / {maxSteps}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/components/RaceConditionTimeline.tsx apps/frontend/src/components/ExecutionPathColumn.tsx apps/frontend/src/components/ConflictIndicator.tsx
git commit -m "feat: add race condition timeline visualization with animation"
```

---

### Task 14: Integrate Race Condition Timeline into ReviewResult

**Files:**
- Modify: `apps/frontend/src/pages/ReviewResult.tsx`

- [ ] **Step 1: Add RaceConditionTimeline to ReviewResult**

```tsx
// apps/frontend/src/pages/ReviewResult.tsx (add import and section)
import { RaceConditionTimeline } from "../components/RaceConditionTimeline";

// In ReviewContent component, add before ConsensusView:
{review.raceConditions && review.raceConditions.length > 0 && (
  <section>
    <h2 className="text-lg font-semibold text-slate-200 mb-3">
      Race Conditions Detected
    </h2>
    <RaceConditionTimeline issues={review.raceConditions} />
  </section>
)}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: No errors

- [ ] **Step 3: Run all tests**

```bash
pnpm test
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/pages/ReviewResult.tsx
git commit -m "feat: integrate race condition timeline into review result page"
```

---

### Task 15: Final Integration Test & Polish

**Files:**
- All modified files

- [ ] **Step 1: Run full test suite**

```bash
pnpm test
```

Expected: PASS (all tests)

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: No errors

- [ ] **Step 3: Run lint**

```bash
pnpm lint
```

Expected: No errors (or fix any lint errors)

- [ ] **Step 4: Run build**

```bash
pnpm build
```

Expected: Build successful

- [ ] **Step 5: Test with a real PR**

Start the backend and frontend:

```bash
pnpm dev
```

Test with a PR that has race conditions (e.g., async functions modifying shared state). Verify:
1. Tree-sitter parses functions correctly
2. Consensus view shows both models' findings
3. Race condition timeline appears if detected
4. Animation plays correctly

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "feat: complete hackathon features - Tree-sitter, consensus voting, race detection"
```

---

## Summary

**Total Tasks:** 15
**Estimated Time:** 22-30 hours (within 72h Hackathon constraint)

**Phase 1 (Tree-sitter):** Tasks 1-4 (~6-8h)
**Phase 2 (Consensus):** Tasks 5-9 (~5-7h)
**Phase 3 (Race Condition):** Tasks 10-15 (~7-9h)

Each task is self-contained, testable, and committable. The plan follows TDD principles with tests written before implementation.
