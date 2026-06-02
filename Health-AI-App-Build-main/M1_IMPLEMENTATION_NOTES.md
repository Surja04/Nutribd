# NutriBD AI — M1 Backend Upgrade Notes

Implemented M1 except Local LLM / external LLM work.

## Added files

- `nutribd_ai/vector_store.py`
  - ChromaDB persistent vector store at `nutribd_ai/data/chroma_db/`
  - Sentence-transformers model: `paraphrase-multilingual-MiniLM-L12-v2`
  - `build_index()` and `search_foods(query, n_results=5)`
  - Safe keyword fallback if ChromaDB/model packages are not installed yet

- `nutribd_ai/rag_engine.py`
  - Contextual RAG prompt builder
  - `retrieve_context(query)`
  - `build_rag_prompt(user_query, system_role)`

- `nutribd_ai/mcp_server.py`
  - MCP stdio server with 5 tools:
    - `search_food`
    - `get_nutrients`
    - `get_healthy_alternatives`
    - `calculate_daily_totals`
    - `assess_health_risk`

- `nutribd_ai/food_graph.py`
  - NetworkX food knowledge graph
  - Nodes: foods, categories, nutrient tags, health-risk tags
  - Related-food retrieval via `get_related_foods(food_name)`

- `nutribd_ai/local_llm.py`
  - Ollama-backed local meal analysis and health-risk fallback
  - Uses `phi3:mini` by default
  - Exposes CLI actions used by `server.ts`: `status`, `analyze-food`, and `calculate-risks`

- `mcp_config.json`
  - MCP client config for NutriBD AI server

## Modified files

- `nutribd_ai/meal_processor.py`
  - Replaced simple keyword-only matching with hybrid search:
    1. alias/fuzzy matching
    2. semantic vector retrieval fallback

- `nutribd_ai/requirements.txt`
  - Added `chromadb`, `sentence-transformers`, `networkx`, `mcp`

- `server.ts`
  - Added `GET /api/local-llm-status`
  - Tries Ollama before deterministic fallbacks when Gemini is not configured
  - Added `POST /api/health-tip` with Claude-first, Gemini-second fallback
  - Added `GET /api/models-status`

## How to run

```bash
cd Health-AI-App-Build-main
pip install -r nutribd_ai/requirements.txt
python nutribd_ai/vector_store.py
python nutribd_ai/food_graph.py
python nutribd_ai/mcp_server.py
```

Optional Ollama runtime setup:

```bash
ollama pull phi3:mini
ollama pull gemma2:2b
ollama serve
```

For quick pipeline test:

```bash
python - <<'PY'
from nutribd_ai.meal_processor import process_user_day_log
print(process_user_day_log(['1 plate rice', '1 bowl dal']))
PY
```

## Local Ollama setup

- Installed Ollama locally
- Pulled `phi3:mini` and `gemma2:2b`
- Verified local meal analysis and health-risk generation with `phi3:mini`

## Not included in this M1 pass

- DeepSeek server integration
