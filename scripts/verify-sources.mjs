import { records } from '../app/records.mjs';

const named = {
  amp: '&', nbsp: ' ', rsquo: "'", lsquo: "'", quot: '"', apos: "'",
  ndash: '-', mdash: '-', rdquo: '"', ldquo: '"',
};

function normalize(value) {
  return value
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, name) => {
      if (!name.startsWith('#')) return named[name] ?? entity;
      const number = name[1]?.toLowerCase() === 'x' ? Number.parseInt(name.slice(2), 16) : Number(name.slice(1));
      return number <= 0x10ffff ? String.fromCodePoint(number) : entity;
    })
    .normalize('NFKC').toLowerCase().replace(/[’‘]/g, "'").replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ').trim();
}

for (const group of [records.slice(0, 5), records.slice(5)]) {
  const results = await Promise.all(group.map(async (record) => {
    try {
      const response = await fetch(record.url, { signal: AbortSignal.timeout(20_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (new URL(record.url).hostname !== new URL(response.url).hostname) {
        throw new Error('Redirected away from cited publisher');
      }
      const html = (await response.text())
        .replace(/<!--[^]*?-->/g, '')
        .replace(/<(script|style|svg)\b[^>]*>[^]*?<\/\1>/gi, '')
        .replace(/<[^>]+>/g, ' ');
      const text = normalize(html);
      const quoteFound = text.includes(normalize(record.quote));
      const dateFound = text.includes(normalize(record.dateAnchor));
      if (!quoteFound || !dateFound) process.exitCode = 1;
      return { id: record.id, result: quoteFound && dateFound ? 'matches' : 'changed', quoteFound, dateFound };
    } catch (error) {
      process.exitCode = 1;
      return { id: record.id, result: 'unavailable', error: error.message };
    }
  }));
  for (const result of results) console.log(JSON.stringify(result));
}
