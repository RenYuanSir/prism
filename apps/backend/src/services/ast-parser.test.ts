import { describe, expect, it } from "vitest";
import {
  type ExportInfo,
  type FunctionInfo,
  type ImportInfo,
  diffExports,
  diffFunctions,
  diffImports,
  parseFile,
} from "./ast-parser.js";

describe("parseFile", () => {
  it("should extract functions from code", async () => {
    const code = `
function add(a: number, b: number): number {
  return a + b;
}

const multiply = (x: number, y: number): number => x * y;
`;
    const parsed = await parseFile(code);
    expect(parsed.functions.length).toBeGreaterThanOrEqual(1);
    expect(parsed.functions[0]?.name).toBe("add");
  });

  it("should extract imports from code", async () => {
    const code = `import { foo, bar } from "lodash";
import React from "react";
`;
    const parsed = await parseFile(code);
    expect(parsed.imports.length).toBeGreaterThanOrEqual(1);
  });
});

describe("diffFunctions", () => {
  it("should detect added functions", () => {
    const oldFns: FunctionInfo[] = [];
    const newFns: FunctionInfo[] = [
      {
        name: "newFunc",
        startLine: 1,
        endLine: 3,
        signature: "newFunc(): void",
        parameters: [],
        returnType: "void",
      },
    ];

    const changes = diffFunctions(oldFns, newFns);
    expect(changes).toHaveLength(1);
    expect(changes[0]?.changeType).toBe("added");
    expect(changes[0]?.name).toBe("newFunc");
  });

  it("should detect removed functions", () => {
    const oldFns: FunctionInfo[] = [
      {
        name: "oldFunc",
        startLine: 1,
        endLine: 3,
        signature: "oldFunc(): void",
        parameters: [],
        returnType: "void",
      },
    ];
    const newFns: FunctionInfo[] = [];

    const changes = diffFunctions(oldFns, newFns);
    expect(changes).toHaveLength(1);
    expect(changes[0]?.changeType).toBe("removed");
    expect(changes[0]?.name).toBe("oldFunc");
  });

  it("should detect modified function signatures", () => {
    const oldFns: FunctionInfo[] = [
      {
        name: "calc",
        startLine: 1,
        endLine: 3,
        signature: "calc(a: number): number",
        parameters: ["a: number"],
        returnType: "number",
      },
    ];
    const newFns: FunctionInfo[] = [
      {
        name: "calc",
        startLine: 1,
        endLine: 3,
        signature: "calc(a: number, b: number): number",
        parameters: ["a: number", "b: number"],
        returnType: "number",
      },
    ];

    const changes = diffFunctions(oldFns, newFns);
    expect(changes).toHaveLength(1);
    expect(changes[0]?.changeType).toBe("modified");
    expect(changes[0]?.description).toContain("signature changed");
  });

  it("should ignore unchanged functions", () => {
    const fn: FunctionInfo = {
      name: "same",
      startLine: 1,
      endLine: 3,
      signature: "same(): void",
      parameters: [],
      returnType: "void",
    };

    const changes = diffFunctions([fn], [fn]);
    expect(changes).toHaveLength(0);
  });
});

describe("diffImports", () => {
  it("should detect added imports", () => {
    const changes = diffImports(
      [],
      [{ module: "lodash", imports: ["debounce"], isDefault: false }],
    );
    expect(changes).toHaveLength(1);
    expect(changes[0]?.changeType).toBe("added");
  });

  it("should detect removed imports", () => {
    const changes = diffImports(
      [{ module: "lodash", imports: ["debounce"], isDefault: false }],
      [],
    );
    expect(changes).toHaveLength(1);
    expect(changes[0]?.changeType).toBe("removed");
  });
});

describe("diffExports", () => {
  it("should detect added exports", () => {
    const changes = diffExports([], [{ name: "foo", isDefault: false }]);
    expect(changes).toHaveLength(1);
    expect(changes[0]?.changeType).toBe("added");
  });

  it("should detect removed exports", () => {
    const changes = diffExports([{ name: "foo", isDefault: false }], []);
    expect(changes).toHaveLength(1);
    expect(changes[0]?.changeType).toBe("removed");
  });
});

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
    expect(result.functions.map((f) => f.name)).toContain("outer");
    expect(result.functions.map((f) => f.name)).toContain("inner");
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
    expect(result.functions[0]?.name).toBe("add");
    expect(result.functions[0]?.isMethod).toBe(true);
    expect(result.functions[0]?.className).toBe("Calculator");
  });

  it("should detect async functions", async () => {
    const code = `
async function fetchData() {
  return await fetch("/api");
}
    `;
    const result = await parseFile(code, "test.ts");
    expect(result.functions).toHaveLength(1);
    expect(result.functions[0]?.isAsync).toBe(true);
  });

  it("should extract function body", async () => {
    const code = `
function calculate() {
  const x = 10;
  return x * 2;
}
    `;
    const result = await parseFile(code, "test.ts");
    expect(result.functions[0]?.body).toBeDefined();
    expect(result.functions[0]?.body).toContain("const x = 10");
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
    expect(result.functions[0]?.parameters).toEqual(["param1", "param2", "param3"]);
  });
});
