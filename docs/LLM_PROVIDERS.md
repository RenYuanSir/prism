# LLM Provider Configuration

AI PR Review supports multiple LLM providers through a unified adapter pattern. Each pipeline stage (summary, risk analysis, suggestions) can be configured independently with different providers.

## Supported Providers

| Provider | Type | Notes |
|----------|------|-------|
| `anthropic` | Official | Claude 3/3.5 series via Anthropic API |
| `google` | Official | Gemini 1.5/2.0 series via Google AI Studio |
| `openai` | Official | GPT-4/GPT-3.5 via OpenAI API |
| `openai-compatible` | Third-party | Any OpenAI-compatible API (DeepSeek, OpenRouter, etc.) |

## Environment Variables

For each pipeline stage, configure:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LLM_<STAGE>_PROVIDER` | No | See below | Provider type |
| `LLM_<STAGE>_API_KEY` | Yes | - | API key |
| `LLM_<STAGE>_MODEL` | No | See below | Model name |
| `LLM_<STAGE>_BASE_URL` | No | - | Custom API base URL |

Stages: `SUMMARY`, `RISK`, `SUGGESTION`

### Defaults

| Stage | Default Provider | Default Model |
|-------|-----------------|---------------|
| Summary | `google` | `gemini-2.0-flash` |
| Risk | `anthropic` | `claude-3-5-sonnet-20241022` |
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
LLM_RISK_MODEL=anthropic/claude-3.5-sonnet
LLM_RISK_BASE_URL=https://openrouter.ai/api/v1
```

### SiliconFlow

```bash
LLM_SUGGESTION_PROVIDER=openai-compatible
LLM_SUGGESTION_API_KEY=sk-...
LLM_SUGGESTION_MODEL=deepseek-ai/DeepSeek-V3
LLM_SUGGESTION_BASE_URL=https://api.siliconflow.cn/v1
```

### Moonshot AI

```bash
LLM_RISK_PROVIDER=openai-compatible
LLM_RISK_API_KEY=sk-...
LLM_RISK_MODEL=moonshot-v1-8k
LLM_RISK_BASE_URL=https://api.moonshot.cn/v1
```

### Aliyun Bailian

```bash
LLM_SUMMARY_PROVIDER=openai-compatible
LLM_SUMMARY_API_KEY=sk-...
LLM_SUMMARY_MODEL=qwen-max
LLM_SUMMARY_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
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

## Backward Compatibility

Old environment variables are still supported if new ones are not set:

- `ANTHROPIC_API_KEY` → maps to `LLM_RISK` and `LLM_SUGGESTION` with `anthropic` provider
- `GOOGLE_API_KEY` → maps to `LLM_SUMMARY` with `google` provider

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AIReviewPipeline                          │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Summary Stage│  │  Risk Stage  │  │Suggestion Stage│     │
│  │   (LLM 1)    │  │   (LLM 2)    │  │   (LLM 3)      │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         ▼                  ▼                  ▼              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Unified LLMClient Interface              │   │
│  │         (generateText(prompt) -> string)              │   │
│  └──────────────────────────────────────────────────────┘   │
│         │                  │                  │              │
│         ▼                  ▼                  ▼              │
│  ┌──────────┐      ┌──────────┐      ┌──────────────────┐  │
│  │Anthropic │      │  Google  │      │ OpenAI-Compatible │  │
│  │ Adapter  │      │ Adapter  │      │    Adapter        │  │
│  └──────────┘      └──────────┘      └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Adding a New Provider

To add a new provider:

1. Add the provider type to `LLMProviderConfig.provider` in `llm-client.ts`
2. Create a new adapter class implementing `LLMClient`
3. Add the factory case in `createLLMClient()`
4. Add tests in `llm-client.test.ts`
