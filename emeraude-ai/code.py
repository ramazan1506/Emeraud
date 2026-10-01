import streamlit as st

# Загрузка и отображение HTML-файла
with open("index.html", "r", encoding="utf-8") as f:
    html_content = f.read()

st.components.v1.html(html_content, height=800, scrolling=True)