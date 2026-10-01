const SYSTEM_INSTRUCTION = 'Ты — ИИ-стилист Émeraude AI. Отвечай только о моде, одежде, обуви, аксессуарах и стиле. Если вопрос не о моде, вежливо откажись и предложи вернуться к теме стиля. Отвечай по-русски, конкретно и доброжелательно.';
const MAX_PROMPT_LENGTH = 4000;

function json(response, status, data) {
  return response.status(status).json(data);
}

function parseBody(body) {
  if (!body) return {};
  if (typeof body === 'object') return body;
  try { return JSON.parse(body); } catch { return {}; }
}

export default async function handler(request, response) {
  if (request.method !== 'POST') return json(response, 405, {error: 'Метод не поддерживается.'});
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return json(response, 503, {error: 'В Vercel не добавлена переменная GEMINI_API_KEY.'});

  const input = parseBody(request.body);
  const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : '';
  const mode = input.mode === 'look' ? 'look' : input.mode === 'chat' ? 'chat' : '';
  if (!prompt || prompt.length > MAX_PROMPT_LENGTH || !mode) {
    return json(response, 400, {error: 'Укажите сообщение до 4000 символов и корректный режим запроса.'});
  }

  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const userPrompt = mode === 'look'
    ? `${prompt}\n\nСоставь один цельный модный образ. Верни только JSON с полями: t (краткое название), i (массив из 4-6 вещей), p (массив из 5 цветов в формате #RRGGBB), s (целое число от 0 до 100).`
    : prompt;

  try {
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'x-goog-api-key': apiKey},
      body: JSON.stringify({
        systemInstruction: {parts: [{text: SYSTEM_INSTRUCTION}]},
        contents: [{role: 'user', parts: [{text: userPrompt}]}],
        generationConfig: mode === 'look'
          ? {responseMimeType: 'application/json', temperature: 0.7, maxOutputTokens: 700}
          : {temperature: 0.7, maxOutputTokens: 600}
      })
    });
    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const message = upstream.status === 429
        ? 'У Gemini закончился бесплатный лимит запросов. Попробуйте позже.'
        : upstream.status === 403 || upstream.status === 401
          ? 'Gemini не принял API-ключ. Проверьте GEMINI_API_KEY в Vercel.'
          : `Ошибка Gemini API (${upstream.status}). Попробуйте позже.`;
      return json(response, 502, {error: message});
    }

    const text = result.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim();
    if (!text) return json(response, 502, {error: 'Gemini не вернул текстовый ответ.'});
    if (mode === 'chat') return json(response, 200, {text});

    let look;
    try { look = JSON.parse(text); } catch { return json(response, 502, {error: 'Не удалось разобрать образ от Gemini.'}); }
    if (typeof look.t !== 'string' || !Array.isArray(look.i) || !Array.isArray(look.p)) {
      return json(response, 502, {error: 'Gemini вернул образ в неизвестном формате.'});
    }
    const palette = look.p.filter(color => typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)).slice(0, 5);
    return json(response, 200, {
      t: look.t.slice(0, 100),
      i: look.i.filter(item => typeof item === 'string').slice(0, 6),
      p: palette.length ? palette : ['#000000', '#065f46', '#c9a24a', '#f6f5f0', '#6b7280'],
      s: Number.isFinite(Number(look.s)) ? Math.max(0, Math.min(100, Math.round(Number(look.s)))) : 80
    });
  } catch {
    return json(response, 502, {error: 'Не удалось связаться с Gemini. Проверьте настройки Vercel.'});
  }
}
