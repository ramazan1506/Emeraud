/* main.js — интерфейс: маршрутизация, контент страниц, генератор образов, чат, гардероб */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s).replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ls = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d } catch (e) { return d } };
const sv = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return 1 } catch (e) { return 0 } };
const toast = m => { const t = $('#t'); if (!t) return; t.textContent = m; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 2600) };
const BG = ['#052e22','#0b6b4c','#1a1a1a','#3a2e0e','#e9e6da'];
const FALLBACK_IMAGES = [
  'assets/fashion-1.svg',
  'assets/fashion-2.svg',
  'assets/fashion-3.svg',
  'assets/fashion-4.svg',
  'assets/fashion-5.svg',
  'assets/fashion-6.svg'
];
const art = (i, x = '', src = '') => {
  const photo = src || FALLBACK_IMAGES[i % FALLBACK_IMAGES.length];
  return `<div class="art ${x}" style="--bgc:${BG[i % 5]}"><img src="${photo}" alt="" loading="lazy"></div>`;
};
const list = (a, f) => Array.isArray(a) ? a.map(f).join('') : '';

document.addEventListener('DOMContentLoaded', () => {
  const V = ['about','home','chat','wardrobe'];
  const cnt = el => { const n = +el.dataset.n, t0 = performance.now(); (function f(t) { const p = Math.min((t - t0) / 1400, 1); el.textContent = Math.round(n * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f) })(t0) };
  let io;
  const safeIo = () => {
    if (io) return io;
    io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const t = e.target;
      t.dataset.n ? cnt(t) : t.classList.add('in');
      io.unobserve(t);
    }), {threshold: .15});
    return io;
  };

  function show() {
    let v = location.hash.slice(1);
    if (!V.includes(v)) v = 'home';
    V.forEach(x => { const el = $('#' + x); if (el) el.classList.toggle('on', x === v); });
    $$('nav a').forEach(a => a.classList.toggle('act', a.dataset.v === v));
    document.body.classList.remove('menu');
    scrollTo(0, 0);
    $$('.rvc:not(.in),[data-n]').forEach(el => safeIo().observe(el));
  }

  addEventListener('scroll', () => document.documentElement.style.setProperty('--sy', scrollY), {passive: true});

  const mq = $('#mq'); if (mq) mq.innerHTML = 'Maison Margiela,Rick Owens,Prada,Chrome Hearts,Yohji Yamamoto,Ann Demeulemeester'.split(',').map(b => `<span>${b}</span>`).join('').repeat(3);
  const newWrap = $('#new'); if (newWrap) newWrap.innerHTML = list([
    ['Jasonwood','Осеннее пальто','assets/1790775475607.jpg'],
    ['Maison Margiela','Изумрудная водолазка','assets/Снимок экрана 2026-09-30 191733.png'],
    ['Tiffany & Co.','Золотая цепь','assets/Снимок экрана 2026-09-30 191859.png']
  ],
    ([b, t, img], i) => `<a class="pc" href="#chat" style="--reveal-delay:${i * 100}ms" data-p="Образ с вещью «${t}» в духе ${b}">${art(i, '', img)}<small>в духе ${b}</small><h3>${t}</h3></a>`);
  const revealImage = img => requestAnimationFrame(() => img.classList.add('is-loaded'));
  document.addEventListener('load', e => {
    if (e.target instanceof HTMLImageElement && e.target.closest('#home .art')) revealImage(e.target);
  }, true);
  $$('#home .art img').forEach(img => {
    if (img.complete && img.naturalWidth) revealImage(img);
  });
  const homeRevealTargets = $$('#home .sh, #new .pc, #cats .cr, #steps .step, #home .man > *, #lb .lk, #faq details, #home .fin h2, #home .fin .cta');
  homeRevealTargets.forEach((target, i) => {
    target.classList.add('scroll-reveal');
    target.style.setProperty('--reveal-delay', `${i % 4 * 100}ms`);
  });
  const revealHomeTargets = () => {
    homeRevealTargets.forEach(target => {
      const r = target.getBoundingClientRect();
      if (r.top < innerHeight * .9 && r.bottom > 0) target.classList.add('is-visible');
    });
  };
  addEventListener('scroll', revealHomeTargets, {passive: true});
  addEventListener('resize', revealHomeTargets);
  revealHomeTargets();
  const cats = $('#cats'); if (cats) cats.innerHTML = list([['Верхняя одежда','Пальто, парки, кожаные куртки'],['Трикотаж','Водолазки, кардиганы, худи'],['Обувь','Лоферы, челси, кроссовки'],['Аксессуары','Ремни, цепи, сумки']],
    ([t, d]) => `<a class="cr" href="#chat" data-p="Образ на основе категории «${t}»"><h3>${t}</h3><p>${d}</p></a>`);
  const steps = $('#steps'); if (steps) steps.innerHTML = list([['Опишите запрос','Напишите, куда идёте, какая погода и что вам нравится: «ужин в ресторане, прохладный вечер, люблю тёмные цвета».'],['ИИ анализирует','Модель работает строго в контексте моды: учитывает повод, сезон, силуэты, палитру и ваши предпочтения.'],['Получите образ','Полный лук: верх, низ, обувь и аксессуары, цветовая палитра и оценка стиля от 0 до 100.'],['Поделитесь и сохраните','Отправьте образ друзьям, ведите историю запросов и собирайте новые сочетания из своего гардероба.']],
    ([t, d], i) => `<div class="step"><b>${i + 1}</b><div><h3>${t}</h3><p>${d}</p></div></div>`);
  const lb = $('#lb'); if (lb) lb.innerHTML = list(LK, (l, i) => `<div class="lk">${art(i, '', l.img)}<h3>${l.t}</h3><p>${l.i.slice(0, 2).join(', ')}</p></div>`);
  const faq = $('#faq'); if (faq) faq.innerHTML = list([['Как ИИ подбирает образ?','Вы описываете повод, погоду и вкусы. Модель, ограниченная темой моды, предлагает верх, низ, обувь и аксессуары, а также палитру и оценку стиля.'],['Можно ли говорить с ИИ на другие темы?','Нет. Консультант вежливо возвращает разговор к одежде и стилю, поэтому его советы остаются предметными.'],['Как работает гардероб?','Загрузите фото своих вещей и укажите категорию: карточка подстроится под любой размер изображения. Из сохранённых вещей можно собрать образ одним нажатием.'],['Где хранятся мои данные?','В демо-версии всё хранится только в вашем браузере: история запросов и гардероб не отправляются на сервер.'],['Будет ли мобильное приложение?','Да, оно в планах: то же ядро, камера для съёмки вещей и примерка образов.']],
    ([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`);
  const vals = $('#vals'); if (vals) vals.innerHTML = list([['Стиль без стресса','Одежда помогает говорить о себе. Мы убираем тревогу выбора и оставляем удовольствие от образа.'],['ИИ только о моде','Консультант не отвлекается на посторонние темы: каждый ответ опирается на знания о стиле, сезоне и сочетаниях.'],['Стилист для каждого','Персональный совет, который раньше был привилегией, должен быть доступен в кармане.']],
    ([t, d]) => `<div><h3>${t}</h3><p>${d}</p></div>`);
  const team = $('#team'); if (team) team.innerHTML = list([['Рамазан','Frontend Dev','Проектирует интерфейс и анимации, отвечает за адаптивность сайта и мобильной версии.'],['Медет','Frontend Dev','Верстает страницы, собирает дизайн-систему и следит за аккуратностью каждой детали.'],['Даниал','Speaker','Представляет проект аудитории, выстраивает питч и рассказывает историю продукта.'],['Ксения','Speaker','Отвечает за коммуникацию с пользователями, презентации и обратную связь по идее.']],
    ([n, r, b]) => `<article class="tc gl"><div class="av">${n[0]}</div><h3>${n}</h3><span class="role">${r}</span><p>${b}</p></article>`);
  const road = $('#road'); if (road) road.innerHTML = list([['Этап 1','Идея','Заметили, что выбор одежды отнимает время, а универсальные ИИ дают размытые советы.'],['Этап 2','Прототип','Собрали сайт: генератор образов, консультант и цифровой гардероб.'],['Этап 3','ИИ-стилист','Подключаем языковую модель, ограниченную только миром моды.'],['Этап 4','Приложение','Выпускаем мобильную версию с камерой и примеркой вещей.']],
    ([s, t, d]) => `<div><small>${s}</small><h3>${t}</h3><p>${d}</p></div>`);

  const chips = a => list(a, x => `<button class="chip" data-q="${x}">${x}</button>`);

  const ms = $('#ms'), tm = () => new Date().toLocaleTimeString('ru', {hour: '2-digit', minute: '2-digit'});
  function add(t, c) {
    const d = document.createElement('div');
    d.className = 'm ' + c;
    d.innerHTML = t + `<time>${tm()}${c === 'u' ? ' ✓✓' : ''}</time>`;
    if (ms) {
      ms.append(d);
      ms.scrollTop = ms.scrollHeight;
    }
    return d;
  }

  async function send(t) {
    t = String(t || '').trim();
    if (!t) return;
    add(esc(t), 'u');
    const ci = $('#ci');
    if (ci) ci.value = '';
    const ty = add('<span class="typing"><i></i><i></i><i></i></span>', 'b');
    const a = await askAI(t, 'chat');
    ty.remove();
    add(esc(a), 'b');
  }

  add('Привет! Я ИИ-стилист Émeraude. Помогу с одеждой, цветами и образами. С чего начнём?', 'b');
  const cq = $('#cq'); if (cq) cq.innerHTML = chips(['Что надеть на свидание?','Как носить изумрудный цвет?','Образ на офис','Какое пальто на зиму?']);
  const ci = $('#ci'); if (ci) ci.onkeydown = e => e.key === 'Enter' && send(e.target.value);
  const cs = $('#cs'); if (cs) cs.onclick = () => send(ci ? ci.value : '');

  const CT = ['Все','Верх','Низ','Обувь','Аксессуары'];
  let W = ls('ea_w', [{n:'Чёрное пальто оверсайз',c:'Верх'},{n:'Изумрудная водолазка',c:'Верх'},{n:'Брюки цвета графит',c:'Низ'},{n:'Челси на массивной подошве',c:'Обувь'},{n:'Золотая цепь',c:'Аксессуары'},{n:'Кожаный ремень',c:'Аксессуары'}]), F = 'Все', pend = null;

  function rw() {
    const wf2 = $('#wf2'); if (wf2) wf2.innerHTML = list(CT, c => `<button class="chip${c === F ? ' on' : ''}" data-c="${c}">${c}</button>`);
    const wg = $('#wg'); if (wg) wg.innerHTML = list(W.map((w, i) => [w, i]).filter(([w]) => F === 'Все' || w.c === F), ([w, i]) => `<figure class="wi">${w.img ? `<img src="${w.img}" alt="${esc(w.n)}">` : art(CT.indexOf(w.c) + 1)}<button class="x" data-i="${i}" aria-label="Удалить">✕</button><figcaption><small>${w.c}</small><b>${esc(w.n)}</b></figcaption></figure>`);
  }

  function pick(f) {
    if (!f || !/^image\//.test(f.type)) return toast('Выберите файл-изображение');
    const r = new FileReader();
    r.onload = () => {
      const im = new Image();
      im.onload = () => {
        const k = Math.min(1, 900 / Math.max(im.width, im.height)), c = document.createElement('canvas');
        c.width = im.width * k;
        c.height = im.height * k;
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        pend = c.toDataURL('image/jpeg', .8);
        const prev = $('#prev'); if (prev) { prev.src = pend; prev.hidden = false; }
        const ut = $('#ut'); if (ut) ut.textContent = 'Фото выбрано';
      };
      im.src = r.result;
    };
    r.readAsDataURL(f);
  }

  const wfile = $('#wfile'); if (wfile) wfile.onchange = e => pick(e.target.files[0]);
  const wf = $('.wf'); if (wf) ['dragover', 'dragleave', 'drop'].forEach(ev => wf.addEventListener(ev, e => { e.preventDefault(); wf.classList.toggle('drag', ev === 'dragover'); if (ev === 'drop') pick(e.dataTransfer.files[0]); }));
  const wa = $('#wa'); if (wa) wa.onclick = () => {
    const wnField = $('#wn'); const n = wnField ? wnField.value.trim() : '';
    if (!n) return toast('Введите название вещи');
    W.push({n, c: $('#wc').value, img: pend});
    if (!sv('ea_w', W)) toast('Память браузера заполнена: фото исчезнет после перезагрузки');
    pend = null;
    if (wnField) wnField.value = '';
    const prev = $('#prev'); if (prev) prev.hidden = true;
    const ut = $('#ut'); if (ut) ut.textContent = 'Загрузить фото';
    const fileInput = $('#wfile'); if (fileInput) fileInput.value = '';
    rw();
  };

  const wm = $('#wm'); if (wm) wm.onclick = () => {
    const o = ['Верх','Низ','Обувь','Аксессуары'].map(c => { const a = W.filter(w => w.c === c); return a[Math.random() * a.length | 0]; }).filter(Boolean);
    const wr = $('#wr'); if (!wr) return;
    if (!o.length) { wr.innerHTML = ''; return toast('Добавьте вещи в гардероб'); }
    wr.innerHTML = `<div class="box" style="padding:20px;margin-bottom:26px"><h3 style="margin-bottom:14px">Образ из вашего гардероба</h3><div class="chips">${list(o, w => `<span class="chip">${w.img ? `<img src="${w.img}" alt="">` : ''}${esc(w.n)}</span>`)}</div></div>`;
  };

  document.addEventListener('click', e => {
    const t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('#bg')) document.body.classList.toggle('menu');
    if (t.dataset.c) { F = t.dataset.c; rw(); }
    if (t.classList.contains('x')) { W.splice(+t.dataset.i, 1); sv('ea_w', W); rw(); }
    if (t.dataset.q) send(t.dataset.q);
    const p = t.closest('[data-p]'); if (p) send(p.dataset.p);
  });

  addEventListener('hashchange', show);
  rw();
  show();
});
