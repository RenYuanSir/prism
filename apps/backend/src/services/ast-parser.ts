import type { ChangeType, ExportChange, FunctionChange, ImportChange } from "@ai-pr-review/shared";

export interface ParsedFile {
  functions: FunctionInfo[];
  imports: ImportInfo[];
  exports: ExportInfo[];
  classes: string[];
  interfaces: string[];
  types: string[];
}

export interface FunctionInfo {
  name: string;
  startLine: number;
  endLine: number;
  signature: string;
  parameters: string[];
  returnType: string;
}

export interface ImportInfo {
  module: string;
  imports: string[];
  isDefault: boolean;
}

export interface ExportInfo {
  name: string;
  isDefault: boolean;
}

// Simple regex-based parser for hackathon (tree-sitter has ESM issues)
export async function parseFile(content: string): Promise<ParsedFile> {
  return {
    functions: extractFunctions(content),
    imports: extractImports(content),
    exports: extractExports(content),
    classes: extractClasses(content),
    interfaces: extractInterfaces(content),
    types: extractTypes(content),
  };
}

function extractFunctions(content: string): FunctionInfo[] {
  const functions: FunctionInfo[] = [];
  const lines = content.split("\n");

  // Match function declarations, arrow functions, methods
  const funcRegex =
    /^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*([\w<>[\]|]+))?/;
  const arrowRegex =
    /^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)(?:\s*:\s*([\w<>[\]|]+))?\s*=>/;
  const methodRegex = /^(?:async\s+)?(\w+)\s*\(([^)]*)\)(?:\s*:\s*([\w<>[\]|]+))?\s*\{/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim() ?? "";
    const match = funcRegex.exec(line) ?? arrowRegex.exec(line) ?? methodRegex.exec(line);

    if (match) {
      const name = match[1] ?? "anonymous";
      const params = match[2] ?? "";
      const returnType = match[3] ?? "void";
      const signature = `${name}(${params}): ${returnType}`;

      functions.push({
        name,
        startLine: i + 1,
        endLine: i + 1,
        signature,
        parameters: params
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean),
        returnType,
      });
    }
  }

  return functions;
}

function extractImports(content: string): ImportInfo[] {
  const imports: ImportInfo[] = [];
  const importRegex = /import\s+(?:(\w+)\s*,?\s*)?(?:\{([^}]*)\})?\s*from\s+["']([^"']+)["']/g;

  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(content)) !== null) {
    const defaultImport = match[1];
    const namedImports = match[2];
    const module = match[3];

    const importsList: string[] = [];
    if (defaultImport) {
      importsList.push(defaultImport);
    }
    if (namedImports) {
      importsList.push(
        ...namedImports
          .split(",")
          .map((i) => i.trim())
          .filter(Boolean),
      );
    }

    imports.push({
      module,
      imports: importsList,
      isDefault: !!defaultImport && !namedImports,
    });
  }

  return imports;
}

function extractExports(content: string): ExportInfo[] {
  const exports: ExportInfo[] = [];
  const exportRegex =
    /export\s+(?:default\s+)?(?:function|class|const|let|var|interface|type)\s+(\w+)/g;

  let match: RegExpExecArray | null;
  while ((match = exportRegex.exec(content)) !== null) {
    exports.push({
      name: match[1] ?? "unknown",
      isDefault: content.substring(match.index, match.index + 20).includes("export default"),
    });
  }

  return exports;
}

function extractClasses(content: string): string[] {
  const classes: string[] = [];
  const classRegex = /class\s+(\w+)/g;

  let match: RegExpExecArray | null;
  while ((match = classRegex.exec(content)) !== null) {
    classes.push(match[1] ?? "anonymous");
  }

  return classes;
}

function extractInterfaces(content: string): string[] {
  const interfaces: string[] = [];
  const interfaceRegex = /interface\s+(\w+)/g;

  let match: RegExpExecArray | null;
  while ((match = interfaceRegex.exec(content)) !== null) {
    interfaces.push(match[1] ?? "anonymous");
  }

  return interfaces;
}

function extractTypes(content: string): string[] {
  const types: string[] = [];
  const typeRegex = /type\s+(\w+)/g;

  let match: RegExpExecArray | null;
  while ((match = typeRegex.exec(content)) !== null) {
    types.push(match[1] ?? "anonymous");
  }

  return types;
}

export function diffFunctions(oldFns: FunctionInfo[], newFns: FunctionInfo[]): FunctionChange[] {
  const changes: FunctionChange[] = [];
  const oldMap = new Map(oldFns.map((f) => [f.name, f]));
  const newMap = new Map(newFns.map((f) => [f.name, f]));

  for (const [name, oldFn] of oldMap) {
    const newFn = newMap.get(name);
    if (!newFn) {
      changes.push({
        name,
        changeType: "removed" as ChangeType,
        oldSignature: oldFn.signature,
        newSignature: undefined,
        description: `Function \`${name}\` was removed`,
      });
    } else if (oldFn.signature !== newFn.signature) {
      changes.push({
        name,
        changeType: "modified" as ChangeType,
        oldSignature: oldFn.signature,
        newSignature: newFn.signature,
        description: `Function \`${name}\` signature changed from \`${oldFn.signature}\` to \`${newFn.signature}\``,
      });
    }
  }

  for (const [name, newFn] of newMap) {
    if (!oldMap.has(name)) {
      changes.push({
        name,
        changeType: "added" as ChangeType,
        oldSignature: undefined,
        newSignature: newFn.signature,
        description: `Function \`${name}\` was added with signature \`${newFn.signature}\``,
      });
    }
  }

  return changes;
}

export function diffImports(oldImports: ImportInfo[], newImports: ImportInfo[]): ImportChange[] {
  const changes: ImportChange[] = [];
  const oldMap = new Map(oldImports.map((i) => [i.module, i]));
  const newMap = new Map(newImports.map((i) => [i.module, i]));

  for (const [mod, oldImp] of oldMap) {
    const newImp = newMap.get(mod);
    if (!newImp) {
      changes.push({
        module: mod,
        changeType: "removed" as ChangeType,
        imports: oldImp.imports,
        isDefault: oldImp.isDefault,
      });
    } else if (JSON.stringify(oldImp.imports) !== JSON.stringify(newImp.imports)) {
      changes.push({
        module: mod,
        changeType: "modified" as ChangeType,
        imports: newImp.imports,
        isDefault: newImp.isDefault,
      });
    }
  }

  for (const [mod, newImp] of newMap) {
    if (!oldMap.has(mod)) {
      changes.push({
        module: mod,
        changeType: "added" as ChangeType,
        imports: newImp.imports,
        isDefault: newImp.isDefault,
      });
    }
  }

  return changes;
}

export function diffExports(oldExports: ExportInfo[], newExports: ExportInfo[]): ExportChange[] {
  const changes: ExportChange[] = [];
  const oldMap = new Map(oldExports.map((e) => [e.name, e]));
  const newMap = new Map(newExports.map((e) => [e.name, e]));

  for (const [name, oldExp] of oldMap) {
    const newExp = newMap.get(name);
    if (!newExp) {
      changes.push({
        name,
        changeType: "removed" as ChangeType,
        isDefault: oldExp.isDefault,
      });
    }
  }

  for (const [name, newExp] of newMap) {
    if (!oldMap.has(name)) {
      changes.push({
        name,
        changeType: "added" as ChangeType,
        isDefault: newExp.isDefault,
      });
    }
  }

  return changes;
}

export async function analyzeSemanticChanges(
  oldContent: string,
  newContent: string,
): Promise<{
  functionChanges: FunctionChange[];
  importChanges: ImportChange[];
  exportChanges: ExportChange[];
}> {
  const oldParsed = await parseFile(oldContent);
  const newParsed = await parseFile(newContent);

  return {
    functionChanges: diffFunctions(oldParsed.functions, newParsed.functions),
    importChanges: diffImports(oldParsed.imports, newParsed.imports),
    exportChanges: diffExports(oldParsed.exports, newParsed.exports),
  };
}
