# API Documentation

## Endpoints

### Health Check

```
GET /api/health
```

Response:
```json
{
  "status": "ok"
}
```

### Full PR Review

```
GET /api/pr/:owner/:repo/:pullNumber
```

Fetches PR metadata, diff, runs AI analysis, and returns complete review.

**Parameters:**
- `owner` — Repository owner (e.g., `facebook`)
- `repo` — Repository name (e.g., `react`)
- `pullNumber` — PR number (positive integer)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 28735,
    "title": "[UMD] Remove umd builds",
    "description": "In React 19...",
    "author": "gnoff",
    "branch": "remove-umd",
    "baseBranch": "main",
    "files": [...],
    "semanticDiff": {
      "files": [
        {
          "filename": ".eslintrc.js",
          "status": "modified",
          "additions": 0,
          "deletions": 1,
          "imports": { "added": [], "removed": ["__UMD__"] },
          "functions": { "added": [], "modified": [], "removed": [] }
        }
      ]
    },
    "review": {
      "summary": "This PR removes all UMD build configurations...",
      "risks": [...],
      "suggestions": [...],
      "consensus": {
        "agreedIssues": [...],
        "disagreedIssues": [...]
      },
      "impactGraph": { ... },
      "raceConditions": [...]
    }
  }
}
```

**Error Responses:**
- `400` — Invalid pullNumber
- `500` — GITHUB_TOKEN not set or GitHub API error

### Impact Analysis

```
POST /api/impact/:owner/:repo/:pullNumber
```

Returns impact heatmap without AI analysis (faster).

**Response:**
```json
{
  "success": true,
  "data": {
    "impactGraph": {
      "nodes": [...],
      "edges": [...]
    }
  }
}
```

## Error Format

All errors follow this structure:

```json
{
  "success": false,
  "error": "Human-readable error message"
}
```
