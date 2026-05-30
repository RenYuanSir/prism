import type { ImpactEdge, ImpactGraph, ImpactLevel, ImpactNode, SemanticDiff } from "@prism/shared";
import type { FileChange } from "@prism/shared";

/**
 * Resolves an import path to a filename in the PR's changed files.
 * Only handles relative imports; package imports are skipped.
 */
export function resolveImportPath(
  importPath: string,
  importingFile: string,
  availableFiles: string[],
): string | null {
  if (!importPath.startsWith(".")) {
    return null;
  }

  const dir = importingFile.split("/").slice(0, -1);
  const parts = importPath.split("/");
  const resolved: string[] = [...dir];

  for (const part of parts) {
    if (part === ".") continue;
    if (part === "..") {
      resolved.pop();
    } else {
      resolved.push(part);
    }
  }

  const normalizedPath = resolved.join("/");
  const normalizedParts = resolved.map(stripExtensions);

  for (const file of availableFiles) {
    const fileNoExt = stripExtensions(file);
    if (fileNoExt === normalizedPath || file === normalizedPath) {
      return file;
    }
    const fileParts = fileNoExt.split("/");
    if (
      normalizedParts.length <= fileParts.length &&
      normalizedParts.every(
        (part, i) => part === fileParts[fileParts.length - normalizedParts.length + i],
      )
    ) {
      return file;
    }
  }

  return null;
}

function stripExtensions(s: string): string {
  return s.replace(/\.(ts|tsx|js|jsx)$/, "");
}

/**
 * Analyze cross-file impact of changes in a PR.
 * Builds a dependency graph from import/export relationships and
 * calculates impact scores based on how many files depend on each changed file.
 */
export function analyzeImpact(semanticDiff: SemanticDiff): ImpactGraph {
  const { fileChanges } = semanticDiff;
  const filenames = fileChanges.map((f) => f.filename);

  // Map: filename -> Set of exported symbol names
  const exportMap = new Map<string, Set<string>>();
  for (const file of fileChanges) {
    const exports = new Set<string>();
    for (const exp of file.exportChanges) {
      exports.add(exp.name);
    }
    exportMap.set(file.filename, exports);
  }

  const edges: ImpactEdge[] = [];
  // Map: filename -> Set of files that import from it
  const dependentsMap = new Map<string, Set<string>>();
  // Map: filename -> Set of files it imports from
  const dependenciesMap = new Map<string, Set<string>>();

  for (const filename of filenames) {
    dependentsMap.set(filename, new Set());
    dependenciesMap.set(filename, new Set());
  }

  for (const file of fileChanges) {
    for (const imp of file.importChanges) {
      const resolved = resolveImportPath(imp.module, file.filename, filenames);
      if (resolved && resolved !== file.filename) {
        edges.push({
          from: file.filename,
          to: resolved,
          symbols: imp.imports,
        });
        dependentsMap.get(resolved)?.add(file.filename);
        dependenciesMap.get(file.filename)?.add(resolved);
      }
    }
  }

  const nodes: ImpactNode[] = fileChanges.map((file) => {
    const directDependents = Array.from(dependentsMap.get(file.filename) ?? []);
    const directDependencies = Array.from(dependenciesMap.get(file.filename) ?? []);
    const changedExports = file.exportChanges.map((e) => e.name);
    const affectedFileCount = directDependents.length;
    const totalFiles = fileChanges.length;
    const ratio = totalFiles > 1 ? affectedFileCount / (totalFiles - 1) : 0;

    let impactScore: number;
    if (file.exportChanges.length > 0) {
      impactScore = Math.min(1, 0.3 + ratio * 0.7);
    } else if (file.functionChanges.length > 0) {
      impactScore = Math.min(0.6, 0.1 + ratio * 0.5);
    } else {
      impactScore = Math.min(0.3, ratio * 0.3);
    }

    const impactLevel = determineImpactLevel(impactScore, affectedFileCount, totalFiles);

    return {
      filename: file.filename,
      impactScore: Number.parseFloat(impactScore.toFixed(2)),
      impactLevel,
      directDependents,
      directDependencies,
      changedExports,
      affectedFileCount,
    };
  });

  const maxImpactScore = nodes.reduce((max, n) => Math.max(max, n.impactScore), 0);
  const highImpactCount = nodes.filter((n) => n.impactLevel === "high").length;
  const mediumImpactCount = nodes.filter((n) => n.impactLevel === "medium").length;
  const lowImpactCount = nodes.filter((n) => n.impactLevel === "low").length;

  return {
    nodes,
    edges,
    maxImpactScore,
    highImpactCount,
    mediumImpactCount,
    lowImpactCount,
  };
}

function determineImpactLevel(
  score: number,
  affectedCount: number,
  totalFiles: number,
): ImpactLevel {
  if (affectedCount === 0 && score < 0.3) return "low";
  if (score >= 0.7 || affectedCount >= Math.ceil(totalFiles / 2)) return "high";
  if (score >= 0.4 || affectedCount >= Math.ceil(totalFiles / 4)) return "medium";
  return "low";
}
