import re, base64, mimetypes
from pathlib import Path
import streamlit as st
import streamlit.components.v1 as components

BASE = Path(__file__).parent
st.set_page_config(page_title="Émeraude AI", layout="wide",
                   initial_sidebar_state="collapsed")
st.markdown("""<style>
header,footer,#MainMenu{visibility:hidden;height:0}
.block-container{padding:0!important;max-width:100%!important}
iframe{border:0}
</style>""", unsafe_allow_html=True)

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">'
         '<link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,400;0,500;1,400;1,500'
         '&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">')

def read(p): return (BASE / p).read_text(encoding="utf-8")

def embed_asset(m):
    path = BASE / m.group(0)
    if not path.exists():
        return m.group(0)
    mime = mimetypes.guess_type(path.name)[0] or "image/jpeg"
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()

@st.cache_data
def build():
    html = read("index.html")
    html = html.replace('<link rel="stylesheet" href="css/style.css">',
                        FONTS + "<style>" + read("css/style.css") + "</style>")
    html = html.replace('<script src="js/ai.js"></script>',
                        "<script>" + read("js/ai.js") + "</script>")
    html = html.replace('<script src="js/main.fixed.js"></script>',
                        "<script>" + read("js/main.fixed.js") + "</script>")
    return re.sub(r'assets/[^"\'\s)]+\.(?:jpe?g|png|webp|gif|svg)', embed_asset, html)

components.html(build(), height=1000, scrolling=True)