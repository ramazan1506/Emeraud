import json
import re
from pathlib import Path
from urllib.parse import quote

import requests
import streamlit as st


ROOT = Path(__file__).resolve().parent
SYSTEM_INSTRUCTION = (
    "Ты — ИИ-стилист Émeraude AI. Отвечай только о моде, одежде, обуви, "
    "аксессуарах и стиле. Если вопрос не о моде, вежливо откажись и предложи "
    "вернуться к теме стиля. Отвечай по-русски, конкретно и доброжелательно."
)
PAGES = ["Главная", "О нас", "ИИ Консультант", "Гардероб"]

st.set_page_config(page_title="Émeraude AI", page_icon="✦", layout="wide")
st.markdown(
    """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,400;6..96,500&family=Jost:wght@300;400;500&display=swap');
    :root { --emerald: #0fa877; --deep: #052e22; --gold: #c9a24a; --muted: #9db0a8; }
    html, body, [class*="css"] { font-family: 'Jost', sans-serif; }
    [data-testid="stAppViewContainer"] { background: #050706; }
    [data-testid="stHeader"] { background: rgba(5, 7, 6, .88); }
    [data-testid="stMainBlockContainer"] { max-width: 1240px; padding-top: 1.5rem; }
    h1, h2, h3 { font-family: 'Bodoni Moda', Georgia, serif !important; }
    h1 { color: #f6f5f0; }
    [data-testid="stRadio"] [role="radiogroup"] { gap: .35rem; }
    [data-testid="stRadio"] label { color: #d8e0dc; }
    [data-testid="stRadio"] label:has(input:checked) { color: #ecdca4; }
    [data-testid="stButton"] button, [data-testid="stFormSubmitButton"] button {
      border: 1px solid var(--gold); border-radius: 3px; color: #f6f5f0;
      background: transparent; min-height: 2.7rem;
    }
    [data-testid="stButton"] button:hover, [data-testid="stFormSubmitButton"] button:hover {
      border-color: #ecdca4; color: #ecdca4; background: rgba(201,162,74,.08);
    }
    [data-testid="stChatMessage"] { border: 1px solid rgba(246,245,240,.12); }
    .eyebrow { color: var(--gold); text-transform: uppercase; font-size: .8rem; }
    .muted { color: var(--muted); }
    .rule { border-top: 1px solid rgba(246,245,240,.16); margin: 1.5rem 0; }
    </style>
    """,
    unsafe_allow_html=True,
)


def secret(name, fallback=None):
    try:
        return st.secrets.get(name, fallback)
    except Exception:
        return fallback


def ask_gemini(prompt, mode="chat"):
    api_key = secret("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError(
            "Добавьте GEMINI_API_KEY в Settings → Secrets вашего приложения Streamlit Cloud."
        )
    if not prompt.strip() or len(prompt) > 4000:
        raise ValueError("Введите сообщение длиной до 4000 символов.")

    model = secret("GEMINI_MODEL", "gemini-3.5-flash-lite")
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
        return text

    try:
        look = json.loads(text)
    except json.JSONDecodeError as error:
        raise RuntimeError("Не удалось разобрать ответ с образом.") from error
    if not isinstance(look, dict) or not isinstance(look.get("t"), str) or not isinstance(look.get("i"), list):
        raise RuntimeError("Gemini вернул образ в неизвестном формате.")
    colors = [
        color for color in look.get("p", [])
        if isinstance(color, str) and re.fullmatch(r"#[0-9a-fA-F]{6}", color)
    ][:5]
    return {
        "title": look["t"][:100],
        "items": [item for item in look["i"] if isinstance(item, str)][:6],
        "palette": colors or ["#000000", "#065f46", "#c9a24a", "#f6f5f0"],
        "score": max(0, min(100, int(look.get("s", 80)))),
    }


def show_look(look):
    left, right = st.columns([1, 2])
    with left:
        image_path = ROOT / "assets" / "Gemini_Generated_Image_ih2p0ih2p0ih2p0i.jpg"
        if image_path.exists():
            st.image(str(image_path), use_container_width=True)
    with right:
        st.subheader(look["title"])
        st.write("\n".join(f"- {item}" for item in look["items"]))
        st.markdown("**Палитра**  " + "　".join(look["palette"]))
        st.metric("Style Score", f"{look['score']} / 100")


def render_home():
    hero_text, hero_image = st.columns([1.1, 0.9], vertical_alignment="center")
    with hero_text:
        st.markdown('<p class="eyebrow">Ваш персональный стилист</p>', unsafe_allow_html=True)
        st.title("Твой стиль.\nТвой интеллект.")
        st.write(
            "Опишите повод, погоду или настроение — ИИ-стилист соберёт образ "
            "с учётом вашего вкуса."
        )
        st.info("Откройте раздел «ИИ Консультант», чтобы обсудить образ, или «Гардероб», чтобы собрать комплект из своих вещей.")
    with hero_image:
        image_path = ROOT / "assets" / "Gemini_Generated_Image_liqqfcliqqfcliqq.jpg"
        if image_path.exists():
            st.image(str(image_path), caption="Образ недели: чёрное пальто, изумрудный трикотаж и золотая цепь.", use_container_width=True)

    st.markdown('<div class="rule"></div>', unsafe_allow_html=True)
    st.subheader("Новая коллекция")
    products = [
        ("Jasonwood", "Осеннее пальто", "1790775475607.jpg"),
        ("Maison Margiela", "Изумрудная водолазка", "Снимок экрана 2026-09-30 191733.png"),
        ("Tiffany & Co.", "Золотая цепь", "Снимок экрана 2026-09-30 191859.png"),
    ]
    columns = st.columns(len(products))
    for column, (brand, name, image) in zip(columns, products):
        with column:
            image_path = ROOT / "assets" / image
            if image_path.exists():
                st.image(str(image_path), use_container_width=True)
            st.caption(f"В духе {brand}")
            st.write(name)


def render_about():
    st.markdown('<p class="eyebrow">Émeraude AI</p>', unsafe_allow_html=True)
    st.title("Мы учим ИИ говорить на языке моды")
    st.write(
        "Émeraude AI — проект о том, как искусственный интеллект может стать "
        "личным стилистом. Консультант помогает сочетать силуэты, ткани, цвета "
        "и одежду для повседневных поводов."
    )
    st.markdown('<div class="rule"></div>', unsafe_allow_html=True)
    st.subheader("Команда проекта")
    team = [
        ("Рамазан", "Founder & Lead Developer", "Идея, продуктовая логика и разработка."),
        ("Медет", "Frontend & UI Developer", "Интерфейс, дизайн-система и адаптивность."),
        ("Даниал", "Product Presenter", "Презентации и история продукта."),
        ("Ксения", "Community & Research", "Обратная связь и исследование потребностей."),
    ]
    columns = st.columns(4)
    for column, (name, role, details) in zip(columns, team):
        with column:
            st.markdown(f"### {name}")
            st.caption(role)
            st.write(details)


def render_chat():
    st.title("ИИ Консультант")
    st.caption("Стилист отвечает о моде, одежде, обуви и аксессуарах.")
    history = st.session_state.chat_history
    for message in history:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    suggestions = ["Что надеть на свидание?", "Как носить изумрудный цвет?", "Образ для офиса", "Какое пальто выбрать на зиму?"]
    suggestion_columns = st.columns(4)
    selected_prompt = None
    for column, suggestion in zip(suggestion_columns, suggestions):
        with column:
            if st.button(suggestion, key=f"suggestion_{suggestion}", use_container_width=True):
                selected_prompt = suggestion
    prompt = st.chat_input("Напишите сообщение") or selected_prompt
    if prompt:
        history.append({"role": "user", "content": prompt})
        try:
            with st.spinner("Стилист подбирает ответ..."):
                answer = ask_gemini(prompt)
        except (RuntimeError, ValueError) as error:
            answer = str(error)
        history.append({"role": "assistant", "content": answer})
        st.rerun()


def render_wardrobe():
    st.title("Личный гардероб")
    st.write("Добавьте свои вещи и попросите стилиста собрать из них образ.")
    with st.form("add_garment", clear_on_submit=True):
        name = st.text_input("Название вещи", placeholder="Например, чёрное пальто")
        category = st.selectbox("Категория", ["Верх", "Низ", "Обувь", "Аксессуары"])
        photo = st.file_uploader("Фото вещи", type=["jpg", "jpeg", "png", "webp"])
        submitted = st.form_submit_button("Добавить вещь")
    if submitted:
        if not name.strip():
            st.warning("Введите название вещи.")
        else:
            photo_bytes = photo.getvalue() if photo else None
            if photo_bytes and len(photo_bytes) > 5 * 1024 * 1024:
                st.warning("Размер фото должен быть не больше 5 МБ.")
            else:
                st.session_state.wardrobe.append({
                    "name": name.strip(),
                    "category": category,
                    "photo": photo_bytes,
                })
                st.rerun()

    garments = st.session_state.wardrobe
    if not garments:
        st.caption("Гардероб пока пуст. Добавьте первую вещь выше.")
        return

    st.markdown('<div class="rule"></div>', unsafe_allow_html=True)
    columns = st.columns(3)
    for index, garment in enumerate(garments):
        with columns[index % len(columns)]:
            if garment["photo"]:
                st.image(garment["photo"], use_container_width=True)
            st.caption(garment["category"])
            st.write(garment["name"])
            if st.button("Удалить", key=f"remove_{index}"):
                garments.pop(index)
                st.rerun()

    if st.button("Собрать образ из гардероба", type="primary"):
        wardrobe_text = ", ".join(f"{item['category']}: {item['name']}" for item in garments)
        try:
            with st.spinner("Стилист собирает комплект..."):
                look = ask_gemini(f"Собери образ только из этих вещей: {wardrobe_text}", mode="look")
            st.session_state.latest_look = look
        except (RuntimeError, ValueError) as error:
            st.error(str(error))
    if st.session_state.get("latest_look"):
        show_look(st.session_state.latest_look)


if "chat_history" not in st.session_state:
    st.session_state.chat_history = [{
        "role": "assistant",
        "content": "Привет! Я ИИ-стилист Émeraude. Помогу с одеждой, цветами и образами. С чего начнём?",
    }]
if "wardrobe" not in st.session_state:
    st.session_state.wardrobe = []

st.markdown("<p class='eyebrow'>Émeraude AI</p>", unsafe_allow_html=True)
page = st.radio("Разделы", PAGES, horizontal=True, label_visibility="collapsed", key="active_page")
st.markdown('<div class="rule"></div>', unsafe_allow_html=True)

if page == "Главная":
    render_home()
elif page == "О нас":
    render_about()
elif page == "ИИ Консультант":
    render_chat()
else:
    render_wardrobe()