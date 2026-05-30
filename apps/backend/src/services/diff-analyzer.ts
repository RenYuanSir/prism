import type { FileChange, PRFile, SemanticDiff } from "@ai-pr-review/shared";
import {
  type ExportInfo,
  type FunctionInfo,
  type ImportInfo,
  analyzeSemanticChanges,
  diffExports,
  diffFunctions,
  diffImports,
  parseFile,
} from "./ast-parser.js";

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];
}

export function parseDiff(diffText: string): Map<string, DiffHunk[]> {
  const files = new Map<string, DiffHunk[]>();
  const lines = diffText.split("\n");

  let currentFile: string | null = null;
  let currentHunks: DiffHunk[] = [];
  let currentHunk: DiffHunk | null = null;

  for (const line of lines) {
    if (line.startsWith("diff --git")) {
      if (currentFile && currentHunks.length > 0) {
        files.set(currentFile, currentHunks);
      }
      const match = line.match(/diff --git a\/(.+?) b\/(.+?)$/);
      currentFile = match?.[1] ?? null;
      currentHunks = [];
      currentHunk = null;
    } else if (line.startsWith("@@")) {
      if (currentHunk) currentHunks.push(currentHunk);
      const match = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      if (match) {
        currentHunk = {
          oldStart: Number.parseInt(match[1], 10),
          oldLines: Number.parseInt(match[2] ?? "1", 10),
          newStart: Number.parseInt(match[3], 10),
          newLines: Number.parseInt(match[4] ?? "1", 10),
          lines: [],
        };
      }
    } else if (currentHunk && !line.startsWith("\\")) {
      currentHunk.lines.push(line);
    }
  }

  if (currentFile && currentHunks.length > 0) {
    files.set(currentFile, currentHunks);
  }

  return files;
}

export async function analyzeDiff(files: PRFile[], _diffText: string): Promise<SemanticDiff> {
  const fileChanges: FileChange[] = [];

  for (const file of files) {
    if (!file.patch || !file.filename.endsWith(".ts")) {
      fileChanges.push({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changeType: file.status as "added" | "removed" | "modified",
        summary: `${file.status}: ${file.filename} (+${file.additions}/-${file.deletions})`,
        functionChanges: [],
        importChanges: [],
        exportChanges: [],
      });
      continue;
    }

    try {
      const oldContent = extractOldContent(file.patch);
      const newContent = extractNewContent(file.patch);

      const oldParsed = await parseFile(oldContent, file.filename);
      const newParsed = await parseFile(newContent, file.filename);

      const functionChanges = diffFunctions(oldParsed.functions, newParsed.functions);
      const importChanges = diffImports(oldParsed.imports, newParsed.imports);
      const exportChanges = diffExports(oldParsed.exports, newParsed.exports);

      const summaries: string[] = [];
      if (functionChanges.length > 0) {
        summaries.push(`${functionChanges.length} function change(s)`);
      }
      if (importChanges.length > 0) {
        summaries.push(`${importChanges.length} import change(s)`);
      }
      if (exportChanges.length > 0) {
        summaries.push(`${exportChanges.length} export change(s)`);
      }

      fileChanges.push({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changeType: file.status as "added" | "removed" | "modified",
        summary: summaries.length > 0 ? summaries.join(", ") : `Modified ${file.filename}`,
        functionChanges,
        importChanges,
        exportChanges,
      });
    } catch {
      fileChanges.push({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changeType: file.status as "added" | "removed" | "modified",
        summary: `Modified ${file.filename} (AST parsing failed)`,
        functionChanges: [],
        importChanges: [],
        exportChanges: [],
      });
    }
  }

  const totalFunctions = fileChanges.reduce((sum, f) => sum + f.functionChanges.length, 0);
  const totalImports = fileChanges.reduce((sum, f) => sum + f.importChanges.length, 0);
  const totalExports = fileChanges.reduce((sum, f) => sum + f.exportChanges.length, 0);

  return {
    fileChanges,
    summary: `Analyzed ${fileChanges.length} file(s): ${totalFunctions} function change(s), ${totalImports} import change(s), ${totalExports} export change(s)`,
    totalFiles: fileChanges.length,
    totalAdditions: files.reduce((sum, f) => sum + f.additions, 0),
    totalDeletions: files.reduce((sum, f) => sum + f.deletions, 0),
  };
}

function extractOldContent(patch: string): string {
  const lines = patch.split("\n");
  const oldLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("-") && !line.startsWith("---")) {
      oldLines.push(line.slice(1));
    } else if (!line.startsWith("+") && !line.startsWith("@@") && !line.startsWith("diff")) {
      oldLines.push(line.startsWith(" ") ? line.slice(1) : line);
    }
  }

  return oldLines.join("\n");
}

function extractNewContent(patch: string): string {
  const lines = patch.split("\n");
  const newLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("+") && !line.startsWith("+++")) {
      newLines.push(line.slice(1));
    } else if (!line.startsWith("-") && !line.startsWith("@@") && !line.startsWith("diff")) {
      newLines.push(line.startsWith(" ") ? line.slice(1) : line);
    }
  }

  return newLines.join("\n");
}
