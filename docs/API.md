# API Documentation

## Endpoints

### Health Check

```
GET /api/health
```

Response:
```json
{ "status": "ok" }
```

---

### Get PR Info

```
GET /api/pr/:owner/:repo/:pullNumber
```

Fetches PR metadata, raw diff, and Tree-sitter semantic analysis. **Does not run AI review.**

**Parameters:**
- `owner` — Repository owner
- `repo` — Repository name
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
    "branch": "feature-branch",
    "baseBranch": "main",
    "diff": "@@ -1,5 +1,4 @@ ...",
    "semanticDiff": {
      "fileChanges": [
        {
          "filename": "src/index.ts",
          "status": "modified",
          "additions": 12,
          "deletions": 3,
          "functionChanges": [
            { "name": "init", "changeType": "modified" }
          ],
          "importChanges": [
            { "module": "lodash", "changeType": "removed" }
          ],
          "exportChanges": [
            { "name": "App", "changeType": "added" }
          ],
          "summary": "Modified function init, removed import lodash, added export App"
        }
      ],
      "summary": "1 file changed: +12/-3",
      "totalFiles": 1,
      "totalAdditions": 12,
      "totalDeletions": 3
    }
  }
}
```

**Error Responses:**
- `400` — Invalid `pullNumber`
- `500` — `GITHUB_TOKEN` not set or GitHub API error

---

### Full AI Review (Blocking)

```
POST /api/review/:owner/:repo/:pullNumber
```

Runs the complete 4-stage pipeline and returns all results in a single response.

**Response:**
```json
{
  "success": true,
  "data": {
    "pr": {
      "id": 42,
      "title": "Add user authentication",
      "description": "Implements JWT-based auth",
      "author": "dev",
      "branch": "feat/auth",
      "baseBranch": "main"
    },
    "semanticDiff": { ... },
    "review": {
      "summary": { "summary": "This PR adds...", "stage": "summary" },
      "risk": { "issues": [...], "stage": "risk" },
      "consensus": {
        "consensusIssues": [...],
        "claudeOnly": [...],
        "geminiOnly": [...],
        "allAgreeCount": 5,
        "claudeTotal": 8,
        "geminiTotal": 6
      },
      "raceConditions": [...],
      "suggestion": { "suggestions": [...], "stage": "suggestion" }
    }
  }
}
```

---

### SSE Streaming AI Review

```
POST /api/review/:owner/:repo/:pullNumber/stream
```

Runs the pipeline and pushes results progressively via Server-Sent Events. Auto-saves to history on completion.

**Headers:** `Content-Type: text/event-stream`

**SSE Events:**

| Event | Data | Description |
|-------|------|-------------|
| `stage:start` | `{ "stage": "summary" }` | Pipeline stage began |
| `summary` | `{ "summary": "..." }` | AI-generated PR overview |
| `risk:model-done` | `{ "model": "claude", "findings": [...] }` | Risk model completed |
| `consensus` | `{ "consensus": { ... } }` | Dual-model consensus result |
| `suggestion` | `{ "suggestions": [...] }` | Fix suggestions |
| `done` | `{}` | Pipeline complete |
| `error` | `{ "message": "..." }` | Pipeline error |

Review results are automatically saved to history when streaming completes.

---

### Impact Analysis

```
POST /api/impact/:owner/:repo/:pullNumber
```

Returns cross-file dependency impact heatmap without AI analysis.

**Response:**
```json
{
  "success": true,
  "data": {
    "impactGraph": {
      "nodes": [
        { "filename": "src/auth.ts", "impactScore": 85, "impactLevel": "high" }
      ],
      "edges": [
        { "from": "src/auth.ts", "to": "src/api.ts", "sharedSymbols": ["authenticate"] }
      ]
    }
  }
}
```

---

### Review History

```
GET /api/history
```

Returns list of recent reviews (up to 100 entries).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "2026-05-31-facebook-react-28735",
      "owner": "facebook",
      "repo": "react",
      "prNumber": 28735,
      "title": "[UMD] Remove umd builds",
      "createdAt": "2026-05-31T12:33:15.344Z",
      "riskCount": 4,
      "criticalCount": 2,
      "summarySnippet": "This pull request eliminates..."
    }
  ]
}
```

```
GET /api/history/:id
```

Returns full saved review by ID.

**Response:** Same structure as the blocking review endpoint's `data`.

---

### Settings

```
GET /api/settings
```

Returns saved LLM configuration. **API keys are masked** for security.

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": { "provider": "openai-compatible", "model": "deepseek-v4-pro", "baseUrl": "https://..." },
    "risk": { "provider": "openai-compatible", "model": "deepseek-v4-flash", "baseUrl": "https://..." },
    "gemini": { "provider": "openai-compatible", "model": "gemini-3.5-flash", "baseUrl": "https://..." },
    "suggestion": { "provider": "anthropic", "model": "claude-sonnet-4-6" }
  }
}
```

```
POST /api/settings
```

Save LLM configuration. Requires `provider`, `apiKey`, `model` for each of the four stages.

**Request body:**
```json
{
  "summary": { "provider": "openai-compatible", "apiKey": "sk-...", "model": "deepseek-v4-pro", "baseUrl": "https://..." },
  "risk": { "provider": "openai-compatible", "apiKey": "sk-...", "model": "deepseek-v4-flash", "baseUrl": "https://..." },
  "gemini": { "provider": "google", "apiKey": "AIza...", "model": "gemini-3.5-flash" },
  "suggestion": { "provider": "anthropic", "apiKey": "sk-ant-...", "model": "claude-sonnet-4-6" }
}
```

**Error Responses:**
- `400` — Missing required fields for any stage
- `500` — File write error

---

## Error Format

All errors follow this structure:

```json
{
  "success": false,
  "error": "Human-readable error message"
}
```
