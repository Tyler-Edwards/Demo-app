# Lessons

- For this project, invoice triage/extraction must be LLM-only — do not ship heuristic parsers as a fallback unless explicitly requested.
- Scanning should hard-fail (clear UI + API error) when `OPENAI_API_KEY` / `OLLAMA_BASE_URL` is missing.
