import type {
  ConcurrencyPattern,
  ConcurrencyPatternType,
  SemanticDiff,
  SharedStateAccess,
} from "@ai-pr-review/shared";
import { parseFile } from "./ast-parser.js";

export async function analyzeRaceConditionPatterns(
  semanticDiff: SemanticDiff,
  fileContents: Record<string, string>,
): Promise<ConcurrencyPattern[]> {
  const allPatterns: ConcurrencyPattern[] = [];

  for (const fileChange of semanticDiff.fileChanges) {
    if (fileChange.functionChanges.length === 0) continue;

    const content = fileContents[fileChange.filename];
    if (!content) continue;

    try {
      const parsed = await parseFile(content, fileChange.filename);

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
      if (match?.[1]) {
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
      if (match?.[1]) {
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
      if (match?.[1]) {
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
      if (match?.[1]) {
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
  patterns: ConcurrencyPattern[],
): Array<{ sharedState: string; patterns: ConcurrencyPattern[] }> {
  const candidates: Array<{ sharedState: string; patterns: ConcurrencyPattern[] }> = [];
  const stateMap = new Map<string, ConcurrencyPattern[]>();

  for (const pattern of patterns) {
    for (const access of pattern.sharedStateAccess) {
      if (!access.isWrite) continue;

      if (!stateMap.has(access.name)) {
        stateMap.set(access.name, []);
      }
      stateMap.get(access.name)!.push(pattern);
    }
  }

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
