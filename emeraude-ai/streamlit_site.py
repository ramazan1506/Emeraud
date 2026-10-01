import json
import re
import shutil
import tempfile
from pathlib import Path
from urllib.parse import quote

import requests
import streamlit as st
import streamlit.components.v1 as components


ROOT = Path(__file__).resolve().parent
SYSTEM_INSTRUCTION = (
    "Ты — ИИ-стилист Émeraude AI. Отвечай только о моде, одежде, обуви, "
    "аксессуарах и стиле. Если вопрос не о моде, вежливо откажись и предложи "
    "вернуться к теме стиля. Отвечай по-русски, конкретно и доброжелательно."
)
STREAMLIT_BRIDGE = r"""
(() => {
  const pending = new Map();
  const send = (type, payload = {}) => window.parent.postMessage({
    isStreamlitMessage: true,
    type,
    ...payload
  }, "*");

  window.__emeraudeStreamlitRequest = (prompt, mode) => new Promise((resolve, reject) => {
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    pending.set(requestId, {resolve, reject});
    send("streamlit:setComponentValue", {
      value: {requestId, prompt, mode},
      dataType: "json"
    });
  });

  window.addEventListener("message", event => {
    const message = event.data;
    if (message?.type !== "streamlit:render") return;
    const response = message.args?.ai_response;
    const request = response && pending.get(response.requestId);
    if (!request) return;
    pending.delete(response.requestId);
    if (response.error) request.reject(new Error(response.error));
    else request.resolve(response.result);
  });

    let heightFrame = 0;
    const updateHeight = () => {
        cancelAnimationFrame(heightFrame);
        heightFrame = requestAnimationFrame(() => {
            const height = Math.ceil(Math.max(
                document.documentElement.scrollHeight,
                document.body.scrollHeight,
                document.documentElement.getBoundingClientRect().height,
                document.body.getBoundingClientRect().height
            ));
            send("streamlit:setFrameHeight", {height});
        });
    };
    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(document.documentElement);
    resizeObserver.observe(document.body);
    const mutationObserver = new MutationObserver(updateHeight);
    mutationObserver.observe(document.documentElement, {
        attributes: true,
        childList: true,
        characterData: true,
        subtree: true
    });
    window.addEventListener("load", updateHeight);
    document.addEventListener("load", updateHeight, true);
    window.addEventListener("resize", updateHeight);
    window.addEventListener("hashchange", () => {
        updateHeight();
        try {
            window.parent.scrollTo(0, 0);
        } catch (_) {}
    });
    if (document.fonts?.ready) document.fonts.ready.then(updateHeight);

  send("streamlit:componentReady", {apiVersion: 1});
    updateHeight();
})();
"""

st.set_page_config(page_title="Émeraude AI", layout="wide", initial_sidebar_state="collapsed")
st.markdown(
    """
    <style>
    header[data-testid="stHeader"], [data-testid="stToolbar"], footer {display:none}
    [data-testid="stMainBlockContainer"] {max-width:none;padding:0!important}
    section.main > div {padding:0!important}
    iframe {border:0}
    </style>
    """,
    unsafe_allow_html=True,
)


def get_secret(name, fallback=None):
    try:
        return st.secrets.get(name, fallback)
    except Exception:
        return fallback


def ask_gemini(prompt, mode):
    api_key = get_secret("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("Добавьте GEMINI_API_KEY в Settings → Secrets приложения Streamlit Cloud.")
    if not isinstance(prompt, str) or not prompt.strip() or len(prompt) > 4000:
        raise ValueError("Введите сообщение длиной до 4000 символов.")
    if mode not in ("chat", "look"):
        raise ValueError("Неизвестный тип запроса.")

    model = get_secret("GEMINI_MODEL", "gemini-3.5-flash-lite")
    endpoint = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{quote(model, safe='')}:generateContent"
    )
    user_prompt = prompt
    if mode == "look":
        user_prompt += (
            "\n\nСоставь один цельный модный образ. Верни только JSON с полями: "
            "t (краткое название), i (массив из 4-6 вещей), "
            "p (массив из 5 цветов в формате #RRGGBB), "
            "s (целое число от 0 до 100)."
        )

    try:
        response = requests.post(
            endpoint,
            headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
            json={
                "systemInstruction": {"parts": [{"text": SYSTEM_INSTRUCTION}]},
                "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
                "generationConfig": (
                    {"responseMimeType": "application/json", "temperature": 0.7, "maxOutputTokens": 700}
                    if mode == "look"
                    else {"temperature": 0.7, "maxOutputTokens": 600}
                ),
            },
            timeout=45,
        )
    except requests.RequestException as error:
        raise RuntimeError("Не удалось связаться с Gemini. Проверьте подключение.") from error

    if response.status_code == 429:
        raise RuntimeError("Закончился лимит запросов Gemini. Попробуйте позже.")
    if response.status_code in (401, 403):
        raise RuntimeError("Gemini отклонил ключ. Проверьте GEMINI_API_KEY в Secrets.")
    if not response.ok:
        raise RuntimeError(f"Ошибка Gemini API ({response.status_code}). Попробуйте позже.")

    try:
        result = response.json()
    except requests.exceptions.JSONDecodeError as error:
        raise RuntimeError("Gemini вернул ответ в неизвестном формате.") from error
    candidates = result.get("candidates", [])
    parts = candidates[0].get("content", {}).get("parts", []) if candidates else []
    text = "".join(part.get("text", "") for part in parts).strip()
    if not text:
        raise RuntimeError("Gemini не вернул текстовый ответ.")
    if mode == "chat":
        return {"text": text}

    try:
        look = json.loads(text)
    except json.JSONDecodeError as error:
        raise RuntimeError("Не удалось разобрать образ от Gemini.") from error
    if not isinstance(look, dict) or not isinstance(look.get("t"), str) or not isinstance(look.get("i"), list):
        raise RuntimeError("Gemini вернул образ в неизвестном формате.")
    palette = [
        color for color in look.get("p", [])
        if isinstance(color, str) and re.fullmatch(r"#[0-9a-fA-F]{6}", color)
    ][:5]
    return {
        "t": look["t"][:100],
        "i": [item for item in look["i"] if isinstance(item, str)][:6],
        "p": palette or ["#000000", "#065f46", "#c9a24a", "#f6f5f0", "#6b7280"],
        "s": max(0, min(100, int(look.get("s", 80)))),
    }


@st.cache_resource
def get_site_component():
    bundle = Path(tempfile.mkdtemp(prefix="emeraude-streamlit-"))
    for folder in ("assets", "css", "js"):
        shutil.copytree(ROOT / folder, bundle / folder)

    html = (ROOT / "index.html").read_text(encoding="utf-8")
    fonts = (
        '<link rel="preconnect" href="https://fonts.googleapis.com">'
        '<link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,400;0,500;1,400;1,500'
        '&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">'
    )
    html = html.replace(
        '<link rel="stylesheet" href="css/style.css">',
        fonts + '<link rel="stylesheet" href="css/style.css">',
    )
    html = html.replace(
        "</head>",
        """<style>
        body {min-height:100vh;display:flex;flex-direction:column}
        body > main {flex:1 0 auto}
        body > footer {flex:0 0 auto;margin-top:auto}
        #home .scroll-reveal,
        #home .scroll-reveal.is-visible {opacity:1!important;transform:none!important}
        .rvc {clip-path:none!important}
        </style></head>""",
    )
    html = html.replace(
        '<script src="js/ai.js"></script>',
        f"<script>{STREAMLIT_BRIDGE}</script><script src=\"js/ai.js\"></script>",
    )
    (bundle / "index.html").write_text(html, encoding="utf-8")
    return components.declare_component("emeraude_site", path=str(bundle))


if "ai_response" not in st.session_state:
    st.session_state.ai_response = None
if "processed_request_id" not in st.session_state:
    st.session_state.processed_request_id = None

site = get_site_component()
request = site(ai_response=st.session_state.ai_response, key="emeraude_site")
if isinstance(request, dict):
    request_id = request.get("requestId")
    if request_id and request_id != st.session_state.processed_request_id:
        st.session_state.processed_request_id = request_id
        try:
            result = ask_gemini(request.get("prompt"), request.get("mode"))
            st.session_state.ai_response = {"requestId": request_id, "result": result}
        except (RuntimeError, ValueError) as error:
            st.session_state.ai_response = {"requestId": request_id, "error": str(error)}
        st.rerun()