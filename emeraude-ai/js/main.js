/* main.js — интерфейс: маршрутизация, контент страниц, генератор образов, чат, гардероб */
const $ = s => document.querySelector(s);
const esc = s => s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ls = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d } catch (e) { return d } };
const sv = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return 1 } catch (e) { return 0 } };
const toast = m => { const t = $('#t'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 2600) };
const BG = ['#052e22','#0b6b4c','#1a1a1a','#3a2e0e','#e9e6da'];
const art = (i, x = '') => `<div class="art ${x}" style="--bgc:${BG[i % 5]}"><svg viewBox="0 0 100 200"><use href="#f${i % 3 + 1}"/></svg></div>`;
const list = (a, f) => a.map(f).join('');

/* Маршрутизация и анимации при прокрутке */
const V = ['about','home','gen','chat','wardrobe'];
const cnt = el => { const n = +el.dataset.n, t0 = performance.now(); (function f(t) { const p = Math.min((t - t0) / 1400, 1); el.textContent = Math.round(n * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f) })(t0) };
const io = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; const t = e.target; t.dataset.n ? cnt(t) : t.classList.add('in'); io.unobserve(t) }), {threshold: .15});
function show() {
  let v = location.hash.slice(1); if (!V.includes(v)) v = 'home';
  V.forEach(x => $('#' + x).classList.toggle('on', x === v));
  document.querySelectorAll('nav a').forEach(a => a.classList.toggle('act', a.dataset.v === v));
  document.body.classList.remove('menu'); scrollTo(0, 0);
  document.querySelectorAll('.rvc:not(.in),[data-n]').forEach(el => io.observe(el));
}
addEventListener('scroll', () => document.documentElement.style.setProperty('--sy', scrollY), {passive: true});

/* Контент страниц */
$('#mq').innerHTML = 'Maison Margiela,Rick Owens,Prada,Chrome Hearts,Yohji Yamamoto,Ann Demeulemeester'.split(',').map(b => `<span>${b}</span>`).join('').repeat(3);
$('#new').innerHTML = list([['Maison Margiela','Драпированное пальто'],['Rick Owens','Кожаный бомбер'],['Prada','Нейлоновая парка'],['Chrome Hearts','Худи с серебряной фурнитурой'],['Maison Margiela','Лоферы с раздвоенным носом'],['Rick Owens','Асимметричный трикотаж'],['Prada','Шёлковая рубашка'],['Chrome Hearts','Кожаные брюки']],
  ([b, t], i) => `<a class="pc" href="#gen" data-p="Образ с вещью «${t}» в духе ${b}">${art(i, 'rvc')}<small>в духе ${b}</small><h3>${t}</h3></a>`);
$('#cats').innerHTML = list([['Верхняя одежда','Пальто, парки, кожаные куртки'],['Трикотаж','Водолазки, кардиганы, худи'],['Обувь','Лоферы, челси, кроссовки'],['Аксессуары','Ремни, цепи, сумки']],
  ([t, d]) => `<a class="cr" href="#gen" data-p="Образ на основе категории «${t}»"><h3>${t}</h3><p>${d}</p></a>`);
$('#steps').innerHTML = list([['Опишите запрос','Напишите, куда идёте, какая погода и что вам нравится: «ужин в ресторане, прохладный вечер, люблю тёмные цвета».'],['ИИ анализирует','Модель работает строго в контексте моды: учитывает повод, сезон, силуэты, палитру и ваши предпочтения.'],['Получите образ','Полный лук: верх, низ, обувь и аксессуары, цветовая палитра и оценка стиля от 0 до 100.'],['Поделитесь и сохраните','Отправьте образ друзьям, ведите историю запросов и собирайте новые сочетания из своего гардероба.']],
  ([t, d], i) => `<div class="step"><b>${i + 1}</b><div><h3>${t}</h3><p>${d}</p></div></div>`);
$('#lb').innerHTML = list(LK, (l, i) => `<div class="lk">${art(i, 'rvc')}<h3>${l.t}</h3><p>${l.i.slice(0, 2).join(', ')}</p></div>`);
$('#faq').innerHTML = list([['Как ИИ подбирает образ?','Вы описываете повод, погоду и вкусы. Модель, ограниченная темой моды, предлагает верх, низ, обувь и аксессуары, а также палитру и оценку стиля.'],['Можно ли говорить с ИИ на другие темы?','Нет. Консультант вежливо возвращает разговор к одежде и стилю, поэтому его советы остаются предметными.'],['Как работает гардероб?','Загрузите фото своих вещей и укажите категорию: карточка подстроится под любой размер изображения. Из сохранённых вещей можно собрать образ одним нажатием.'],['Где хранятся мои данные?','В демо-версии всё хранится только в вашем браузере: история запросов и гардероб не отправляются на сервер.'],['Будет ли мобильное приложение?','Да, оно в планах: то же ядро, камера для съёмки вещей и примерка образов.']],
  ([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`);
$('#vals').innerHTML = list([['Стиль без стресса','Одежда помогает говорить о себе. Мы убираем тревогу выбора и оставляем удовольствие от образа.'],['ИИ только о моде','Консультант не отвлекается на посторонние темы: каждый ответ опирается на знания о стиле, сезоне и сочетаниях.'],['Стилист для каждого','Персональный совет, который раньше был привилегией, должен быть доступен в кармане.']],
  ([t, d]) => `<div><h3>${t}</h3><p>${d}</p></div>`);
$('#team').innerHTML = list([['Рамазан','Frontend Dev','Проектирует интерфейс и анимации, отвечает за адаптивность сайта и мобильной версии.'],['Медет','Frontend Dev','Верстает страницы, собирает дизайн-систему и следит за аккуратностью каждой детали.'],['Даниал','Speaker','Представляет проект аудитории, выстраивает питч и рассказывает историю продукта.'],['Ксения','Speaker','Отвечает за коммуникацию с пользователями, презентации и обратную связь по идее.']],
  ([n, r, b]) => `<article class="tc gl"><div class="av">${n[0]}</div><h3>${n}</h3><span class="role">${r}</span><p>${b}</p></article>`);
$('#road').innerHTML = list([['Этап 1','Идея','Заметили, что выбор одежды отнимает время, а универсальные ИИ дают размытые советы.'],['Этап 2','Прототип','Собрали сайт: генератор образов, консультант и цифровой гардероб.'],['Этап 3','ИИ-стилист','Подключаем языковую модель, ограниченную только миром моды.'],['Этап 4','Приложение','Выпускаем мобильную версию с камерой и примеркой вещей.']],
  ([s, t, d]) => `<div><small>${s}</small><h3>${t}</h3><p>${d}</p></div>`);

/* Сгенерировать образ */
let hist = ls('ea_h', []), cur = null;
const look = l => `<div class="look">${art(H(l.t))}<div><h2 style="font-size:clamp(30px,4vw,52px);margin-bottom:12px">${l.t}</h2>${list(l.i, x => `<div class="li">${x}</div>`)}<div class="pal">${list(l.p, c => `<i style="background:${c}"></i>`)}</div><div class="cta" style="margin:0;align-items:center"><div class="score" style="--s:${l.s}" title="Style Score"><b>${l.s}</b></div><button class="btn gold" id="sh">Поделиться образом</button></div></div></div>`;
const rh = () => { $('#hl').innerHTML = list(hist, (h, i) => `<div class="hi${cur === h ? ' on' : ''}" data-i="${i}" title="${esc(h.q)}">${esc(h.q)}</div>`) || '<div class="hi">Пока пусто</div>' };
const intro = () => { cur = null; $('#out').innerHTML = '<div style="min-height:100%;display:grid;place-items:center;text-align:center"><div><h2>Что наденем сегодня?</h2><p style="color:var(--mut);margin-top:12px">Опишите повод, погоду и настроение, и ИИ соберёт образ.</p></div></div>'; rh() };
async function gen(q) {
  q = q.trim(); if (!q) return; const o = $('#out');
  if (!FASH.test(q)) { o.innerHTML = '<p style="color:var(--mut);padding:30px;text-align:center">Я генерирую только модные образы. Попробуйте: «свидание в дождь».</p>'; return }
  o.innerHTML = '<div class="typing" style="padding:60px;text-align:center"><i></i><i></i><i></i><p style="color:var(--mut);margin-top:10px">ИИ подбирает образ</p></div>';
  const l = await askAI(q, 'look'); cur = l; hist = [l, ...hist].slice(0, 30); sv('ea_h', hist); rh(); o.innerHTML = look(l); $('#gi').value = '';
}
async function share() {
  if (!cur) return; const t = `Мой образ от Émeraude AI — ${cur.t}: ${cur.i.join(', ')}`;
  try { if (navigator.share) { await navigator.share({title: cur.t, text: t}); return } } catch (e) {}
  try { await navigator.clipboard.writeText(t); toast('Образ скопирован, можно делиться') } catch (e) { toast('Скопируйте: ' + t) }
}
const chips = a => list(a, x => `<button class="chip" data-q="${x}">${x}</button>`);
$('#qc').innerHTML = chips(['Свидание в дождливый вечер','Офис в изумрудных тонах','Streetwear на прогулку по городу','Вечеринка в золотом']);
$('#gi').onkeydown = e => e.key === 'Enter' && gen(e.target.value); $('#gs').onclick = () => gen($('#gi').value); $('#ng').onclick = intro;

/* ИИ Консультант */
const ms = $('#ms'), tm = () => new Date().toLocaleTimeString('ru', {hour: '2-digit', minute: '2-digit'});
function add(t, c) { const d = document.createElement('div'); d.className = 'm ' + c; d.innerHTML = t + `<time>${tm()}${c === 'u' ? ' ✓✓' : ''}</time>`; ms.append(d); ms.scrollTop = ms.scrollHeight; return d }
async function send(t) { t = t.trim(); if (!t) return; add(esc(t), 'u'); $('#ci').value = ''; const ty = add('<span class="typing"><i></i><i></i><i></i></span>', 'b'); const a = await askAI(t, 'chat'); ty.remove(); add(esc(a), 'b') }
add('Привет! Я ИИ-стилист Émeraude. Помогу с одеждой, цветами и образами. С чего начнём?', 'b');
$('#cq').innerHTML = chips(['Что надеть на свидание?','Как носить изумрудный цвет?','Образ на офис','Какое пальто на зиму?']);
$('#ci').onkeydown = e => e.key === 'Enter' && send(e.target.value); $('#cs').onclick = () => send($('#ci').value);

/* Мой гардероб */
const CT = ['Все','Верх','Низ','Обувь','Аксессуары'];
let W = ls('ea_w', [{n:'Чёрное пальто оверсайз',c:'Верх'},{n:'Изумрудная водолазка',c:'Верх'},{n:'Брюки цвета графит',c:'Низ'},{n:'Челси на массивной подошве',c:'Обувь'},{n:'Золотая цепь',c:'Аксессуары'},{n:'Кожаный ремень',c:'Аксессуары'}]), F = 'Все', pend = null;
function rw() {
  $('#wf2').innerHTML = list(CT, c => `<button class="chip${c === F ? ' on' : ''}" data-c="${c}">${c}</button>`);
  $('#wg').innerHTML = list(W.map((w, i) => [w, i]).filter(([w]) => F === 'Все' || w.c === F), ([w, i]) => `<figure class="wi">${w.img ? `<img src="${w.img}" alt="${esc(w.n)}">` : art(CT.indexOf(w.c) + 1)}<button class="x" data-i="${i}" aria-label="Удалить">✕</button><figcaption><small>${w.c}</small><b>${esc(w.n)}</b></figcaption></figure>`);
}
function pick(f) {
  if (!f || !/^image\//.test(f.type)) return toast('Выберите файл-изображение');
  const r = new FileReader();
  r.onload = () => { const im = new Image(); im.onload = () => { const k = Math.min(1, 900 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = im.width * k; c.height = im.height * k; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); pend = c.toDataURL('image/jpeg', .8); $('#prev').src = pend; $('#prev').hidden = false; $('#ut').textContent = 'Фото выбрано' }; im.src = r.result };
  r.readAsDataURL(f);
}
$('#wfile').onchange = e => pick(e.target.files[0]);
const wf = $('.wf'); ['dragover', 'dragleave', 'drop'].forEach(ev => wf.addEventListener(ev, e => { e.preventDefault(); wf.classList.toggle('drag', ev === 'dragover'); if (ev === 'drop') pick(e.dataTransfer.files[0]) }));
$('#wa').onclick = () => {
  const n = $('#wn').value.trim(); if (!n) return toast('Введите название вещи');
  W.push({n, c: $('#wc').value, img: pend}); if (!sv('ea_w', W)) toast('Память браузера заполнена: фото исчезнет после перезагрузки');
  pend = null; $('#wn').value = ''; $('#prev').hidden = true; $('#ut').textContent = 'Загрузить фото'; $('#wfile').value = ''; rw();
};
$('#wm').onclick = () => {
  const o = ['Верх','Низ','Обувь','Аксессуары'].map(c => { const a = W.filter(w => w.c === c); return a[Math.random() * a.length | 0] }).filter(Boolean);
  if (!o.length) { $('#wr').innerHTML = ''; return toast('Добавьте вещи в гардероб') }
  $('#wr').innerHTML = `<div class="box" style="padding:20px;margin-bottom:26px"><h3 style="margin-bottom:14px">Образ из вашего гардероба</h3><div class="chips">${list(o, w => `<span class="chip">${w.img ? `<img src="${w.img}" alt="">` : ''}${esc(w.n)}</span>`)}</div></div>`;
};

/* Общие клики */
document.addEventListener('click', e => {
  const t = e.target;
  if (t.closest('#bg')) document.body.classList.toggle('menu');
  if (t.dataset.c) { F = t.dataset.c; rw() }
  if (t.classList.contains('x')) { W.splice(+t.dataset.i, 1); sv('ea_w', W); rw() }
  if (t.classList.contains('hi') && t.dataset.i) { cur = hist[+t.dataset.i]; $('#out').innerHTML = look(cur); rh() }
  if (t.dataset.q) t.closest('#qc') ? gen(t.dataset.q) : send(t.dataset.q);
  if (t.id === 'sh') share();
  const p = t.closest('[data-p]'); if (p) gen(p.dataset.p);
});
addEventListener('hashchange', show); intro(); rw(); show();
