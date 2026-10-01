/* Запросы идут через локальный сервер, API-ключ браузеру не передаётся. */
async function askAI(q, mode) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({prompt: q, mode})
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Не удалось получить ответ от ИИ.');
  if (mode === 'look') return {...data, q};
  if (typeof data.text !== 'string') throw new Error('ИИ вернул ответ в неизвестном формате.');
  return data.text;
}

const LK = [
  {t:'Noir Emerald', img:'assets/Gemini_Generated_Image_ih2p0ih2p0ih2p0i.jpg', i:['Пальто оверсайз — чёрная шерсть','Водолазка из мериноса — изумруд','Прямые брюки — графит','Челси на массивной подошве'], p:['#000000','#065f46','#0fa877','#c9a24a','#f6f5f0']},
  {t:'Gilded Minimal', img:'assets/Gemini_Generated_Image_jkym2ijkym2ijkym.jpg', i:['Шёлковая рубашка — молочная','Жилет — чёрный','Брюки со стрелками — чёрные','Лоферы и золотая цепь'], p:['#f6f5f0','#000000','#c9a24a','#0b3d2e','#e9d27a']},
  {t:'Street Couture', img:'assets/Gemini_Generated_Image_or0opoor0opoor0o.jpg', i:['Кожаный бомбер — чёрный','Худи оверсайз — тёмно-зелёное','Карго — оливковые','Кроссовки — белые с серебром'], p:['#111111','#14532d','#6b8e23','#c0c0c0','#ffffff']},
  {t:'Soft Tailoring', img:'assets/Gemini_Generated_Image_js3b1jjs3b1jjs3b.jpg', i:['Двубортный пиджак — бутылочный','Топ в тон — шампань','Юбка-миди или брюки — чёрные','Ботильоны на каблуке'], p:['#064e3b','#f7e7ce','#000000','#c9a24a','#a7f3d0']}
];
