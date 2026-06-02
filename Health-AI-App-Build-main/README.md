

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/08665c94-aae7-494e-8bd4-ce7c1009f9e5

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Optional Local LLM

NutriBD AI can use Ollama as an offline fallback when Gemini is not configured.

1. Install Ollama from `https://ollama.com`.
2. Pull the local models:
   `ollama pull phi3:mini`
   `ollama pull gemma2:2b`
3. Start Ollama:
   `ollama serve`
4. Run the app and check:
   `GET http://localhost:3000/api/local-llm-status`
