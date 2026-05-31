# LLM Provider Configuration

PRism supports multiple LLM providers through a unified adapter pattern. Each pipeline stage (summary, risk, gemini, suggestion) can be configured independently with different providers.

## Supported Providers

| Provider | Type | Notes |
|----------|------|-------|
| `anthropic` | Official | Claude series via Anthropic API |
| `google` | Official | Gemini series via Google AI Studio |
| `openai` | Official | GPT series via OpenAI API |
| `openai-compatible` | Third-party | Any OpenAI-compatible API (DeepSeek, Qwen, Bailian, Kimi, etc.) |

## Environment Variables

For each pipeline stage, configure:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LLM_<STAGE>_PROVIDER` | No | See below | Provider type |
| `LLM_<STAGE>_API_KEY` | Yes | - | API key |
| `LLM_<STAGE>_MODEL` | No | See below | Model name |
| `LLM_<STAGE>_BASE_URL` | No | - | Custom API base URL |

Stages: `SUMMARY`, `RISK`, `GEMINI`, `SUGGESTION`

### Defaults

| Stage | Default Provider | Default Model |
|-------|-----------------|---------------|
| Summary | `google` | `gemini-2.0-flash` |
| Risk | `anthropic` | `claude-3-5-sonnet-20241022` |
| Gemini | `google` | `gemini-2.0-flash` |
| Suggestion | `anthropic` | `claude-3-5-sonnet-20241022` |

## Quick Examples

### DeepSeek

```bash
LLM_SUMMARY_PROVIDER=openai-compatible
LLM_SUMMARY_API_KEY=sk-...
LLM_SUMMARY_MODEL=deepseek-chat
LLM_SUMMARY_BASE_URL=https://api.deepseek.com/v1
```

### OpenRouter

```bash
LLM_RISK_PROVIDER=openai-compatible
LLM_RISK_API_KEY=sk-or-...
LLM_RISK_MODEL=anthropic/claude-sonnet-4-6
LLM_RISK_BASE_URL=https://openrouter.ai/api/v1
```

### SiliconFlow

```bash
LLM_SUGGESTION_PROVIDER=openai-compatible
LLM_SUGGESTION_API_KEY=sk-...
LLM_SUGGESTION_MODEL=deepseek-ai/DeepSeek-V3
LLM_SUGGESTION_BASE_URL=https://api.siliconflow.cn/v1
```

### Aliyun Bailian

```bash
LLM_GEMINI_PROVIDER=openai-compatible
LLM_GEMINI_API_KEY=sk-...
LLM_GEMINI_MODEL=gemini-3.5-flash
LLM_GEMINI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
```

### Zhipu AI

```bash
LLM_SUMMARY_PROVIDER=openai-compatible
LLM_SUMMARY_API_KEY=...
LLM_SUMMARY_MODEL=glm-4
LLM_SUMMARY_BASE_URL=https://open.bigmodel.cn/api/paas/v4
```

### 01.AI

```bash
LLM_RISK_PROVIDER=openai-compatible
LLM_RISK_API_KEY=...
LLM_RISK_MODEL=yi-large
LLM_RISK_BASE_URL=https://api.01.ai/v1
```

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      AIReviewPipeline                             │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Summary  │  │  Risk    │  │  Gemini  │  │Suggestion│        │
│  │  Stage   │  │  Stage   │  │  Stage   │  │  Stage   │        │
│  │ (LLM 1)  │  │ (LLM 2)  │  │ (LLM 3)  │  │ (LLM 4)  │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       │              │              │              │              │
│       ▼              ▼              ▼              ▼              │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │               Unified LLMClient Interface                 │   │
│  │          (generateText(prompt) -> string)                 │   │
│  └───────────────────────────────────────────────────────────┘   │
│       │              │              │              │              │
│       ▼              ▼              ▼              ▼              │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────────────┐     │
│  │Anthropic │ │  Google  │ │     OpenAI-Compatible         │     │
│  │ Adapter  │ │ Adapter  │ │         Adapter               │     │
│  └──────────┘ └──────────┘ └──────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────┘
```

**Pipeline flow:**

```
Summary (LLM 1) → Risk (LLM 2) ∥ Gemini (LLM 3) → Consensus Merge → Suggestion (LLM 4)
```

Risk and Gemini run in parallel for cross-validation. After both complete, the consensus merger compares findings by file + line (±3) + severity, producing high-confidence consensus issues.

## Settings Page (Frontend)

The frontend Settings page provides a UI for configuration. It offers 6 preset providers:

| Preset | Provider | Base URL |
|--------|----------|----------|
| Anthropic | `anthropic` | `https://api.anthropic.com` |
| Google Gemini | `google` | - |
| OpenAI | `openai-compatible` | `https://api.openai.com/v1` |
| DeepSeek | `openai-compatible` | `https://api.deepseek.com/v1` |
| Bailian (百炼) | `openai-compatible` | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| Custom | `openai-compatible` | (user-provided) |

Settings are persisted to `data/settings.json` and take priority over environment variables. API keys are stored in the file but masked in the GET response.

## Backward Compatibility

If `settings.json` does not exist, PRism falls back to environment variables. Old variable names are still supported if the new `LLM_*` variables are not set:

- `ANTHROPIC_API_KEY` → maps to `LLM_RISK` and `LLM_SUGGESTION` with `anthropic` provider
- `GOOGLE_API_KEY` → maps to `LLM_SUMMARY` with `google` provider

## Adding a New Provider

To add a new provider:

1. Add the provider type to `LLMProviderConfig.provider` in `llm-client.ts`
2. Create a new adapter class implementing `LLMClient`
3. Add the factory case in `createLLMClient()`
4. Add tests in `llm-client.test.ts`
