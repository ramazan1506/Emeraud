import os

# Получаем путь к директории, в которой находится текущий файл code.py
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
html_path = os.path.join(BASE_DIR, "index.html")

with open(html_path, "r", encoding="utf-8") as f:
    # ваш код