import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const files = new Map([
  ['/', ['index.html', 'text/html']],
  ['/style.css', ['style.css', 'text/css']],
  ['/telegraph-runs.json', ['telegraph-runs.json', 'application/json']],
  ['/ui.mjs', ['ui.mjs', 'text/javascript']],
  ['/research.mjs', ['research.mjs', 'text/javascript']],
  ['/records.mjs', ['records.mjs', 'text/javascript']],
]);

const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '127.0.0.1';
createServer(async (request, response) => {
  const file = files.get(request.url.split('?')[0]);
  if (request.method !== 'GET' || !file) {
    response.writeHead(404).end('Not found');
    return;
  }
  try {
    const body = await readFile(new URL(`./app/${file[0]}`, import.meta.url));
    response.writeHead(200, {
      'content-type': `${file[1]}; charset=utf-8`,
      'content-security-policy': "default-src 'self'; base-uri 'none'; frame-ancestors 'none'",
      'referrer-policy': 'no-referrer',
      'x-content-type-options': 'nosniff',
    }).end(body);
  } catch {
    response.writeHead(500).end('Could not load the demo');
  }
}).listen(port, host, () => console.log(`Delta Intelligence is available at http://${host}:${port}`));
