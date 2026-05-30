import type { ChangeType, ExportChange, FunctionChange, ImportChange } from "@ai-pr-review/shared";
import type Parser from "web-tree-sitter";
import { getLanguage, getParser } from "./tree-sitter-init.js";

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
  body?: string;
  isAsync?: boolean;
  isMethod?: boolean;
  className?: string;
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

// Tree-sitter AST parser with regex fallback
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
      functions: extractFunctionsFromAST(root),
      imports: extractImportsFromAST(root),
      exports: extractExportsFromAST(root),
      classes: extractClassesFromAST(root),
      interfaces: extractInterfacesFromAST(root),
      types: extractTypesFromAST(root),
    };
  } catch (error) {
    console.warn("Tree-sitter parsing failed, falling back to regex:", error);
    return regexFallback(content);
  }
}

async function regexFallback(content: string): Promise<ParsedFile> {
  return {
    functions: extractFunctions(content),
    imports: extractImports(content),
    exports: extractExports(content),
    classes: extractClasses(content),
    interfaces: extractInterfaces(content),
    types: extractTypes(content),
  };
}

function extractFunctionsFromAST(root: Parser.SyntaxNode): FunctionInfo[] {
  const functions: FunctionInfo[] = [];

  function visit(node: Parser.SyntaxNode) {
    // Function declarations
    if (node.type === "function_declaration") {
      const nameNode = node.childForFieldName("name");
      const paramsNode = node.childForFieldName("parameters");
      const bodyNode = node.childForFieldName("body");
      const returnTypeNode = node.childForFieldName("return_type");

      if (nameNode) {
        const isAsync = node.text.startsWith("async");
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
        const isAsync = node.text.startsWith("async");
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
      const declarator = node.children.find((c) => c.type === "variable_declarator");
      if (declarator) {
        const nameNode = declarator.childForFieldName("name");
        const valueNode = declarator.childForFieldName("value");

        if (nameNode && valueNode?.type === "arrow_function") {
          const paramsNode = valueNode.childForFieldName("parameters");
          const bodyNode = valueNode.childForFieldName("body");
          const returnTypeNode = valueNode.childForFieldName("return_type");

          const isAsync = valueNode.text.startsWith("async");
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
    if (child.type === "identifier") {
      params.push(child.text);
    } else if (child.type === "required_parameter" || child.type === "optional_parameter") {
      const patternNode = child.childForFieldName("pattern") ?? child.children[0];
      if (patternNode) {
        params.push(patternNode.text);
      }
    }
  }
  return params;
}

function extractImportsFromAST(root: Parser.SyntaxNode): ImportInfo[] {
  const imports: ImportInfo[] = [];

  function visit(node: Parser.SyntaxNode) {
    if (node.type === "import_statement") {
      const sourceNode = node.childForFieldName("source");
      if (!sourceNode) return;

      const module = sourceNode.text.replace(/["']/g, "");
      const importsList: string[] = [];
      let isDefault = false;

      const clauseNode = node.children.find((c) => c.type === "import_clause");
      if (clauseNode) {
        // Default import: identifier child of import_clause (no field name)
        const defaultImport = clauseNode.children.find((c) => c.type === "identifier");
        if (defaultImport) {
          importsList.push(defaultImport.text);
        }

        // Named imports: import_specifier descendants
        const namedImports = clauseNode.descendantsOfType("import_specifier");
        for (const spec of namedImports) {
          const nameNode = spec.childForFieldName("name");
          if (nameNode) {
            importsList.push(nameNode.text);
          }
        }

        // isDefault is true only when there's a default import AND no named imports
        isDefault = defaultImport !== undefined && namedImports.length === 0;
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

function extractExportsFromAST(root: Parser.SyntaxNode): ExportInfo[] {
  const exports: ExportInfo[] = [];

  function visit(node: Parser.SyntaxNode) {
    if (node.type === "export_statement") {
      const declarationNode = node.childForFieldName("declaration");
      if (!declarationNode) return;

      const isDefault = node.text.includes("export default");

      // Function/class declaration: name is a direct field
      let nameNode = declarationNode.childForFieldName("name");

      // Lexical/variable declaration (export const/let/var): drill into variable_declarator
      if (!nameNode) {
        const declarator = declarationNode.children.find((c) => c.type === "variable_declarator");
        if (declarator) {
          nameNode = declarator.childForFieldName("name");
        }
      }

      // Fallback: direct identifier child
      if (!nameNode) {
        nameNode = declarationNode.children.find((c) => c.type === "identifier") ?? null;
      }

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

function extractNamesByNodeType(root: Parser.SyntaxNode, nodeType: string): string[] {
  const names: string[] = [];

  function visit(node: Parser.SyntaxNode) {
    if (node.type === nodeType) {
      const nameNode = node.childForFieldName("name");
      if (nameNode) {
        names.push(nameNode.text);
      }
    }

    for (const child of node.children) {
      visit(child);
    }
  }

  visit(root);
  return names;
}

function extractClassesFromAST(root: Parser.SyntaxNode): string[] {
  return extractNamesByNodeType(root, "class_declaration");
}

function extractInterfacesFromAST(root: Parser.SyntaxNode): string[] {
  return extractNamesByNodeType(root, "interface_declaration");
}

function extractTypesFromAST(root: Parser.SyntaxNode): string[] {
  return extractNamesByNodeType(root, "type_alias_declaration");
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
