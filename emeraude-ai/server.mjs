import {createServer} from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const HOST = '127.0.0.1';
const MAX_BODY_BYTES = 16_000;
const SYSTEM_INSTRUCTION = 'Ты — ИИ-стилист Émeraude AI. Отвечай только о моде, одежде, обуви, аксессуарах и стиле. Если вопрос не о моде, вежливо откажись и предложи вернуться к теме стиля. Отвечай по-русски, конкретно и доброжелательно.';

async function loadEnv() {
  try {
    const contents = await readFile(path.join(ROOT, '.env'), 'utf8');
    for (const line of contents.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!match || match[1] in process.env) continue;
      let value = match[2];
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[match[1]] = value;
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

function sendJson(response, status, data) {
  response.writeHead(status, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'});
  response.end(JSON.stringify(data));
}

async function readJson(request) {
  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > MAX_BODY_BYTES) {
      const error = new Error('Размер запроса слишком большой.');
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    const error = new Error('Некорректный JSON в запросе.');
    error.status = 400;
    throw error;
  }
}

async function handleChat(request, response) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return sendJson(response, 503, {error: 'Добавьте GEMINI_API_KEY в файл .env и перезапустите сервер.'});

  const input = await readJson(request);
  const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : '';
  const mode = input.mode === 'look' ? 'look' : input.mode === 'chat' ? 'chat' : '';
  if (!prompt || prompt.length > 4000 || !mode) {
    return sendJson(response, 400, {error: 'Укажите сообщение до 4000 символов и корректный режим запроса.'});
  }

  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const userPrompt = mode === 'look'
    ? `${prompt}\n\nСоставь один цельный модный образ. Верни только JSON с полями: t (краткое название), i (массив из 4-6 вещей), p (массив из 5 цветов в формате #RRGGBB), s (целое число от 0 до 100).`
    : prompt;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  try {
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'x-goog-api-key': apiKey},
      signal: controller.signal,
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
          ? 'Gemini не принял API-ключ. Проверьте GEMINI_API_KEY в .env.'
          : `Ошибка Gemini API (${upstream.status}). Проверьте подключение и настройки модели.`;
      return sendJson(response, 502, {error: message});
    }

    const text = result.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim();
    if (!text) return sendJson(response, 502, {error: 'Gemini не вернул текстовый ответ. Попробуйте ещё раз.'});
    if (mode === 'chat') return sendJson(response, 200, {text});

    let look;
    try {
      look = JSON.parse(text);
    } catch {
      return sendJson(response, 502, {error: 'Не удалось разобрать образ от Gemini. Попробуйте ещё раз.'});
    }
    if (typeof look.t !== 'string' || !Array.isArray(look.i) || !Array.isArray(look.p)) {
      return sendJson(response, 502, {error: 'Gemini вернул образ в неизвестном формате.'});
    }
    const palette = look.p.filter(color => typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)).slice(0, 5);
    return sendJson(response, 200, {
      t: look.t.slice(0, 100),
      i: look.i.filter(item => typeof item === 'string').slice(0, 6),
      p: palette.length ? palette : ['#000000', '#065f46', '#c9a24a', '#f6f5f0', '#6b7280'],
      s: Number.isFinite(Number(look.s)) ? Math.max(0, Math.min(100, Math.round(Number(look.s)))) : 80
    });
  } catch (error) {
    const message = error.name === 'AbortError'
      ? 'Gemini отвечает слишком долго. Попробуйте ещё раз.'
      : 'Не удалось связаться с Gemini. Проверьте интернет-соединение.';
    return sendJson(response, 502, {error: message});
  } finally {
    clearTimeout(timeout);
  }
}

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

async function handleStatic(pathname, response, method) {
  const allowed = pathname === '/index.html' || /^\/(assets|css|js)\//.test(pathname);
  if (!allowed || pathname.includes('\\') || pathname.split('/').some(part => part === '..' || part.startsWith('.'))) {
    response.writeHead(404);
    return response.end('Not found');
  }

  const filename = path.resolve(ROOT, `.${pathname}`);
  if (!filename.startsWith(`${ROOT}${path.sep}`)) {
    response.writeHead(404);
    return response.end('Not found');
  }

  try {
    if (!(await stat(filename)).isFile()) throw new Error('Not a file');
    const contents = await readFile(filename);
    response.writeHead(200, {
      'Content-Type': MIME_TYPES[path.extname(filename).toLowerCase()] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff'
    });
    response.end(method === 'HEAD' ? undefined : contents);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
}

await loadEnv();
const server = createServer(async (request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, `http://${HOST}`).pathname);
  } catch {
    return sendJson(response, 400, {error: 'Некорректный адрес запроса.'});
  }

  if (pathname === '/api/chat') {
    if (request.method !== 'POST') return sendJson(response, 405, {error: 'Метод не поддерживается.'});
    try {
      return await handleChat(request, response);
    } catch (error) {
      return sendJson(response, error.status || 500, {error: error.status ? error.message : 'Внутренняя ошибка сервера.'});
    }
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405);
    return response.end('Method not allowed');
  }
  if (pathname === '/') pathname = '/index.html';
  return handleStatic(pathname, response, request.method);
});

const port = Number(process.env.PORT) || 3000;
server.listen(port, HOST, () => console.log(`Émeraude AI доступен: http://${HOST}:${port}`));
