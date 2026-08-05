from __future__ import annotations

import json
import os
import re
from pathlib import Path

import httpx

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "openai/gpt-oss-120b"


def load_env() -> None:
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        from dotenv import load_dotenv

        load_dotenv(env_path)


load_env()


def get_openrouter_api_key() -> str:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY is not configured")
    return api_key


def _extract_json_object(text: str) -> str:
    start = text.find("{")
    if start == -1:
        raise ValueError("Unexpected OpenRouter response format")

    depth = 0
    in_string = False
    escape = False

    for index, char in enumerate(text[start:], start):
        if escape:
            escape = False
            continue
        if char == "\\":
            escape = True
            continue
        if char == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return text[start : index + 1]

    raise ValueError("Unexpected OpenRouter response format")


def _parse_ai_response_text(text: str) -> tuple[str, dict | None]:
    json_text = _extract_json_object(text)
    data = json.loads(json_text)
    answer = data.get("answer", "")
    board = data.get("board") or data.get("updatedBoard") or data.get("updated_board")
    return answer, board


def fetch_openrouter_response(prompt: str, model: str = DEFAULT_MODEL) -> str:
    api_key = get_openrouter_api_key()
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
    }

    response = httpx.post(OPENROUTER_URL, headers=headers, json=payload, timeout=30.0)
    response.raise_for_status()
    data = response.json()

    try:
        return data["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, TypeError) as exc:
        raise ValueError("Unexpected OpenRouter response format") from exc


def fetch_openrouter_structured_response(prompt: str, board: dict, model: str = DEFAULT_MODEL) -> tuple[str, dict | None]:
    api_key = get_openrouter_api_key()
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    instruction = (
        "You are an assistant that can update a Kanban board. "
        "Respond with a JSON object only, without additional explanation. "
        "The JSON must include an 'answer' field and may include a 'board' field with the updated board. "
        "If no board changes are needed, set 'board' to the original board or omit it. "
        "Use the same board schema as provided."
    )
    board_payload = json.dumps(board, indent=2)
    user_content = (
        f"Board JSON:\n{board_payload}\n\n"
        f"User request: {prompt}\n\n"
        "Respond only with valid JSON."
    )

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": instruction},
            {"role": "user", "content": user_content},
        ],
    }

    response = httpx.post(OPENROUTER_URL, headers=headers, json=payload, timeout=30.0)
    response.raise_for_status()
    data = response.json()

    try:
        text = data["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, TypeError) as exc:
        raise ValueError("Unexpected OpenRouter response format") from exc

    return _parse_ai_response_text(text)
