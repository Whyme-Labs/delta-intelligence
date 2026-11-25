import { records, snapshotDate } from './records.mjs';

export const stageLabels = {
  announced: 'Announced',
  groundbreaking: 'Groundbreaking',
  'phase-opened': 'Phase opened',
  opened: 'Opened',
  expanded: 'Expanded',
  'energy-update': 'Solar installed',
};

const stageOrder = { announced: 0, groundbreaking: 1, 'phase-opened': 2, opened: 2, expanded: 2 };
const keywordGroups = [
  ['factory', 'plant', 'manufacturing', 'production', 'kilang', 'pembuatan', 'pengeluaran', 'fasiliti'],
  ['expansion', 'expand', 'extension', 'perluasan', 'pembesaran', 'modernise'],
  ['electronics', 'elektronik', 'wafer', 'semiconductor', 'semikonduktor', 'chip'],
  ['solar', 'pv', 'photovoltaic', 'fotovoltaik'],
  ['automotive', 'automotif', 'vehicle', 'kenderaan'],
  ['lab', 'makmal', 'centrifuge', 'laboratory'],
  ['penang', 'pinang'],
  ['opened', 'opening', 'dibuka', 'bukaan'],
  ['groundbreaking', 'construction', 'pembinaan'],
];
const stopWords = new Set([
  'a', 'ada', 'adalah', 'an', 'and', 'at', 'by', 'di', 'find', 'for', 'in', 'is', 'malaysia', 'my',
  'of', 'on', 'or', 'show', 'the', 'to', 'untuk', 'with', 'yang', 'near', 'selepas',
]);

export function isoDate(date) {
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
}

function tokens(value) {
  return value.normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

function related(word) {
  return keywordGroups.find((group) => group.includes(word)) ?? [word];
}

export function matchTerms(record, query) {
  const terms = tokens(query).filter((word) => !stopWords.has(word));
  const searchable = new Set(tokens([
    record.company, ...record.aliases, record.location, record.region, record.sector,
    stageLabels[record.stage], record.observation,
  ].join(' ')));
  return terms.filter((word) => !related(word).some((synonym) => searchable.has(synonym)));
}

export function canonicalSource(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    return url.hostname.replace(/^www\./, '') + url.pathname.replace(/\/+$/, '');
  } catch {
    return null;
  }
}

function screen(record, solarRecord) {
  if (solarRecord?.solar === 'installed') {
    return { decision: 'hold', reason: 'The source reports an existing rooftop system. Confirm any expansion or replacement opportunity first.' };
  }
  if (record.stage === 'announced' || record.stage === 'groundbreaking') {
    return { decision: 'investigate', reason: 'An early facility milestone is documented. Check the construction programme, roof drawings and the facility owner’s energy plans.' };
  }
  return { decision: 'investigate', reason: 'A physical facility is documented. Check usable roof area, current solar coverage and load before qualifying this site.' };
}

export function research(input = {}, corpus = records) {
  const { query = '', region = '', stage = '', since = '2026-01-01', asOf = snapshotDate } = input;
  if (typeof query !== 'string' || !isoDate(asOf) || !isoDate(since) || since > asOf) {
    throw new Error('Choose a valid evidence date range.');
  }
  const visible = corpus.filter((record) => record.published <= asOf);
  const sites = new Map();
  for (const record of visible) {
    const events = sites.get(record.site) ?? [];
    events.push(record);
    sites.set(record.site, events);
  }
  const results = [];
  let withheld = 0;
  for (const events of sites.values()) {
    events.sort((a, b) => b.published.localeCompare(a.published));
    const solar = events.find((record) => record.solar);
    const facility = events.filter((record) => record.stage in stageOrder)
      .sort((a, b) => stageOrder[b.stage] - stageOrder[a.stage])[0];
    const latest = facility ?? solar;
    if (!latest || (region && latest.region !== region) ||
      (stage && latest.stage !== stage) || matchTerms(latest, query).length) continue;
    if (latest.published < since) {
      withheld += 1;
      continue;
    }
    const decision = screen(latest, solar);
    results.push({ ...latest, ...decision, history: events.map((record) => ({
      id: record.id, stage: record.stage, published: record.published,
      publisher: record.publisher, url: record.url,
    })) });
  }
  results.sort((a, b) => Number(a.decision === 'hold') - Number(b.decision === 'hold') ||
    b.published.localeCompare(a.published) || a.company.localeCompare(b.company));
  return { query, region, stage, since, asOf, results, withheld };
}

export function evidenceFromMiner(sources, corpus = records) {
  const urls = new Set();
  for (const entry of Array.isArray(sources) ? sources : []) {
    const value = typeof entry === 'string' ? entry : entry?.url;
    const canonical = canonicalSource(value);
    if (canonical) urls.add(canonical);
  }
  return corpus.filter(({ url }) => urls.has(canonicalSource(url)));
}
