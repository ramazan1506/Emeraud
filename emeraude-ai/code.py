import os
import streamlit as st
import streamlit.components.v1 as components

# Настройка страницы
st.set_page_config(page_title="Мой HTML в Streamlit", layout="wide")

st.title("Рендеринг index.html")

# Получаем путь к файлу
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
html_path = os.path.join(BASE_DIR, "index.html")

try:
    with open(html_path, "r", encoding="utf-8") as f:
        html_content = f.read()
        
    # Встраиваем HTML-код с помощью компонентов Streamlit
    # height задает высоту фрейма в пикселях
    components.html(html_content, height=600, scrolling=True)
    
except FileNotFoundError:
    st.error(f"Файл не найден: {html_path}")