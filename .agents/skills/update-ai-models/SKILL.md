---
name: update-ai-models
description: Fetch current available models from all LLM provider APIs and update the centralized model registry.
---

# Update AI Models

## When to Use
- When an AI feature returns a 500 error related to model availability
- After a provider announces model deprecations
- Periodically, to keep the registry fresh
- When you see a `⚠️ AI Model Registry has stale/deprecated models` GitHub Issue

## Prerequisites
At least one provider API key must be available as an environment variable:
- `GROQ_API_KEY`
- `OPENAI_API_KEY`  
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`

## Steps

### 1. Run the Validation Script
```bash
cd backend/ai_service
python scripts/validate_models.py
```

### 2. Review the Output
- ✅ = Model is available and current
- ⚠️ = Model is NOT FOUND on the provider (deprecated or decommissioned)
- 🆕 = Model is available on the provider but not in our registry

### 3. Update the Registry
Edit `backend/ai_service/providers/model_registry.py`:

1. **Remove stale models** from `available` and `fallbacks` lists
2. **Add new models** you want to support to `available` 
3. **Update `default`** if the current default is stale — pick the best general-purpose model
4. **Update `fallbacks`** — list 2-3 alternatives in priority order
5. Keep model display names human-readable (e.g., `"GPT-6 Astra"`)

### 4. Test the AI Service
```bash
# Restart the AI service and check boot logs for the registry summary
pm2 restart jobpilot
# or
cd backend/ai_service && python main.py
```

Verify at least one feature works:
- Mail Creator: generate a message
- Role Fit: analyze an application
- classify-job: trigger an RSS poll

### 5. Commit and Push
```bash
git add backend/ai_service/providers/model_registry.py
git commit -m "chore: update AI model registry — replace deprecated models"
git push
```

## Important Notes
- The `model_registry.py` file is the **single source of truth**. All 4 provider files read from it.
- The `LLMRouter.get_model_with_fallback()` mechanism provides runtime protection — if a model is deprecated, it automatically tries the next fallback and logs a warning.
- Groq models change most frequently. Prioritize checking Groq first.
- The weekly GitHub Action (`validate-models.yml`) will auto-open an Issue if stale models are detected.

## Provider API Reference
| Provider | List Models Endpoint |
|:---------|:---------------------|
| Groq | `GET https://api.groq.com/openai/v1/models` |
| OpenAI | `GET https://api.openai.com/v1/models` |
| Anthropic | `GET https://api.anthropic.com/v1/models` |
| Gemini | `GET https://generativelanguage.googleapis.com/v1beta/models` |
