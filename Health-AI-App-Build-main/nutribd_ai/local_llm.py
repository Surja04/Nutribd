"""Ollama-backed local LLM fallback for NutriBD AI."""
from __future__ import annotations

import json
import sys
from typing import Any, Dict, List
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

OLLAMA_BASE_URL = "http://localhost:11434"
DEFAULT_MODEL = "gemma2:2b"


def _request_json(path: str, payload: Dict[str, Any] | None = None, timeout: int = 120) -> Dict[str, Any]:
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = Request(
        f"{OLLAMA_BASE_URL}{path}",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST" if payload is not None else "GET",
    )
    with urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def check_ollama() -> bool:
    """Return True when a local Ollama server is reachable."""
    try:
        _request_json("/api/tags", timeout=3)
        return True
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError):
        return False


def _extract_json(text: str) -> Dict[str, Any]:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1]
        cleaned = cleaned.rsplit("```", 1)[0].strip()
    start, end = cleaned.find("{"), cleaned.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("Ollama response did not contain a JSON object.")
    return json.loads(cleaned[start : end + 1])


def _generate_json(prompt: str, model: str = DEFAULT_MODEL, num_predict: int = 900) -> Dict[str, Any]:
    if not check_ollama():
        raise RuntimeError("Ollama is not running.")
    response = _request_json(
        "/api/generate",
        {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0.2,
                "num_predict": num_predict,
                "num_ctx": 2048,
            },
        },
    )
    return _extract_json(str(response.get("response", "")))


def _as_text(value: Any, default: str) -> str:
    if isinstance(value, str) and value.strip():
        return value
    if value:
        return json.dumps(value, ensure_ascii=False)
    return default


def _normalize_food_item(item: Dict[str, Any], index: int) -> Dict[str, Any]:
    name = item.get("name")
    if not name:
        name = next((value for key, value in item.items() if "name" in key.lower() and value), "Unknown food")
    portion = item.get("portion", "estimated serving")
    if isinstance(portion, dict):
        portion = " ".join(str(value) for value in portion.values() if value) or "estimated serving"
    return {
        "id": str(item.get("id", index + 1)),
        "name": str(name),
        "portion": str(portion),
        "calories": item.get("calories", 0),
        "protein": item.get("protein", 0),
        "carbs": item.get("carbs", 0),
        "fat": item.get("fat", 0),
        "sodium": item.get("sodium", 0),
        "sugar": item.get("sugar", 0),
        "iron": item.get("iron", 0),
    }


def _has_food_data(item: Dict[str, Any]) -> bool:
    if item["name"] != "Unknown food":
        return True
    return any(item[key] for key in ("calories", "protein", "carbs", "fat", "sodium", "sugar", "iron"))


def analyze_food_local(food_text: str, model: str = DEFAULT_MODEL) -> Dict[str, Any]:
    """Parse a meal log using a local Ollama model."""
    prompt = f"""Return compact JSON only.
You are a Bangladeshi nutrition expert. Parse the meal log into common local foods.
Schema:
{{"detectedItems":[{{"name":"food name","portion":"common Bangladeshi serving","calories":0,"protein":0,"carbs":0,"fat":0,"sodium":0,"sugar":0,"iron":0}}],"overallComments":"2-3 sentences with practical Bangladesh-specific nutrition notes."}}
Use realistic household/street-food estimates. Do not include markdown.
Meal: {food_text}"""
    result = _generate_json(prompt, model=model, num_predict=700)
    items = result.get("detectedItems", [])
    if not isinstance(items, list):
        raise ValueError("Ollama food analysis returned an invalid detectedItems value.")
    normalized_items = [_normalize_food_item(item, index) for index, item in enumerate(items) if isinstance(item, dict)]
    result["detectedItems"] = [item for item in normalized_items if _has_food_data(item)]
    result["overallComments"] = _as_text(result.get("overallComments"), "Analyzed locally with Ollama.")
    return result


def get_risks_local(profile: Dict[str, Any], food_log: List[Dict[str, Any]], model: str = DEFAULT_MODEL) -> Dict[str, Any]:
    """Generate a non-diagnostic local health-risk summary."""
    prompt = f"""Return JSON only. You are a Bangladeshi preventive nutrition assistant.
Schema:
{{"alerts":[{{"title":"specific risk title","severity":"low|medium|high","explanation":"2 detailed sentences tied to the profile and food log","actionableSteps":["specific local step 1","specific local step 2","specific local step 3"]}}],"overallSummary":"3 sentences summarizing the biggest nutrition risks and protective habits.","disclaimer":"educational wellness guidance, not medical diagnosis"}}
Create exactly 3 alerts. Use South Asian BMI overweight threshold 23.0. Mention Bangladesh-specific risks such as high rice load, salty snacks/table salt, fried oil, and iron deficiency where relevant.
Profile: {json.dumps(profile, ensure_ascii=False)}
Food log: {json.dumps(food_log, ensure_ascii=False)}"""
    result = _generate_json(prompt, model=model, num_predict=900)
    if not isinstance(result.get("alerts", []), list):
        raise ValueError("Ollama risk analysis returned an invalid alerts value.")
    for alert in result.get("alerts", []):
        if not isinstance(alert, dict):
            continue
        steps = alert.get("actionableSteps", [])
        if not isinstance(steps, list):
            alert["actionableSteps"] = [str(steps)]
        while len(alert["actionableSteps"]) < 3:
            alert["actionableSteps"].append("Add dal, seasonal shak, and measured rice portions to keep the plan practical for Bangladeshi meals.")
        explanation = _as_text(alert.get("explanation"), "This pattern can affect long-term cardiometabolic and micronutrient health.")
        if len(explanation.split()) < 18:
            explanation += " The recommendation is based on your logged meal pattern, South Asian risk thresholds, and common Bangladeshi cooking habits."
        alert["explanation"] = explanation
    result["overallSummary"] = _as_text(result.get("overallSummary"), "Risk profile analyzed locally with Ollama.")
    result["disclaimer"] = _as_text(
        result.get("disclaimer"),
        "This educational wellness guidance is not a medical diagnosis. Consult a qualified clinician for medical advice.",
    )
    return result


def _read_payload() -> Dict[str, Any]:
    raw = sys.stdin.read().strip()
    return json.loads(raw) if raw else {}


def main() -> None:
    action = sys.argv[1] if len(sys.argv) > 1 else "status"
    payload = _read_payload()
    model = str(payload.get("model", DEFAULT_MODEL))
    try:
        if action == "status":
            output = {"ollama": check_ollama(), "model": model}
        elif action == "analyze-food":
            output = analyze_food_local(str(payload.get("foodText", "")), model=model)
        elif action == "calculate-risks":
            output = get_risks_local(payload.get("profile", {}), payload.get("foodLog", []), model=model)
        else:
            raise ValueError(f"Unknown action: {action}")
        print(json.dumps(output, ensure_ascii=False))
    except Exception as exc:
        print(json.dumps({"error": str(exc), "ollama": check_ollama(), "model": model}))
        raise SystemExit(1)


if __name__ == "__main__":
    main()
