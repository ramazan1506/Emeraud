import os
import streamlit as st

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
html_path = os.path.join(BASE_DIR, "index.html")

try:
    with open(html_path, "r", encoding="utf-8") as f:
        html_content = f.read()
        
    # Выводим HTML с поддержкой стилей на страницу
    st.markdown(html_content, unsafe_allow_html=True)
    
except FileNotFoundError:
    st.error(f"Файл не найден: {html_path}")