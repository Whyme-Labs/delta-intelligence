import { research, stageLabels } from './research.mjs';
import { snapshotDate } from './records.mjs';

const form = document.querySelector('#filters');
const resultList = document.querySelector('#signals');
const status = document.querySelector('#result-count');
const details = document.querySelector('#evidence');
const template = document.querySelector('#signal-template');
const download = document.querySelector('#export');
const presets = {
  historical: { query: 'Eppendorf', region: 'Penang', since: '2026-01-01', asOf: '2026-11-01' },
  johor: { query: 'manufacturing', region: 'Johor', since: '2025-01-01', asOf: snapshotDate },
  solar: { query: 'Honda', region: 'Melaka', since: '2026-01-01', asOf: snapshotDate },
};
const dateFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' });
const formatDate = (value) => dateFormat.format(new Date(`${value}T00:00:00Z`));

let report;

function element(tag, text, cls) {
  const el = document.createElement(tag);
  if (text) el.textContent = text;
  if (cls) el.className = cls;
  return el;
}

function sourceLink(source, title) {
  const link = element('a', title || `Read ${source.publisher} ↗`);
  link.href = source.url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}

function selectSignal(record, button, moveFocus = false) {
  resultList.querySelector('[aria-pressed="true"]')?.setAttribute('aria-pressed', 'false');
  button.setAttribute('aria-pressed', 'true');
  const meta = document.createElement('dl');
  for (const [title, value] of [
    ['Publication', formatDate(record.published)],
    ['Event', record.eventDate ? formatDate(record.eventDate) : 'Exact date unconfirmed'],
    ['Reported floor area', record.sizeSqFt ? `${record.sizeSqFt.toLocaleString('en-MY')} sq ft` : 'Unconfirmed'],
  ]) {
    const row = document.createElement('div');
    row.append(element('dt', title), element('dd', value));
    meta.append(row);
  }
  details.replaceChildren(
    element('p', 'Source evidence', 'eyebrow'),
    element('h2', record.company),
    element('p', `${record.sector} · ${record.location}`),
    meta,
    element('blockquote', `“${record.quote}”`),
    sourceLink(record),
    element('h3', record.decision === 'hold' ? 'Hold rooftop outreach' : 'Next research step'),
    element('p', record.reason),
  );
  if (record.history.length > 1) {
    const history = document.createElement('ul');
    for (const item of record.history) {
      const listItem = document.createElement('li');
      listItem.append(sourceLink(item, `${stageLabels[item.stage]} · ${formatDate(item.published)} ↗`));
      history.append(listItem);
    }
    details.append(element('h3', 'Evidence timeline'), history);
  }
  if (moveFocus && matchMedia('(max-width: 970px)').matches) details.focus();
}

function render() {
  resultList.replaceChildren();
  details.replaceChildren();
  download.disabled = true;
  try {
    report = research(Object.fromEntries(new FormData(form)));
  } catch (error) {
    status.textContent = error.message;
    return;
  }
  const count = report.results.length;
  const noun = count === 1 ? 'site' : 'sites';
  status.textContent = `${count} ${noun} · evidence through ${formatDate(report.asOf)}` +
    (report.withheld ? ` · ${report.withheld} older ${report.withheld === 1 ? 'site' : 'sites'} withheld` : '');
  download.disabled = false;
  if (!count) {
    resultList.append(element('p', 'The snapshot contains no supporting evidence in this scope. Try a wider date range or another company name.', 'empty'));
    details.append(element('h2', 'Evidence unavailable'), element('p', 'A missing result leaves the facility status and solar opportunity unknown.'));
    return;
  }
  for (const [index, record] of report.results.entries()) {
    const node = template.content.cloneNode(true);
    const button = node.querySelector('button');
    const date = node.querySelector('time');
    date.dateTime = record.published;
    date.textContent = formatDate(record.published);
    node.querySelector('.region').textContent = record.region;
    node.querySelector('.company').textContent = record.company;
    node.querySelector('.observation').textContent = record.observation;
    node.querySelector('.stage').textContent = stageLabels[record.stage];
    const decision = node.querySelector('.decision');
    decision.textContent = record.decision === 'hold' ? 'Hold' : 'Investigate';
    decision.classList.toggle('hold', record.decision === 'hold');
    button.addEventListener('click', () => selectSignal(record, button, true));
    resultList.append(node);
    if (index === 0) selectSignal(record, button);
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  render();
});
for (const button of document.querySelectorAll('[data-preset]')) {
  button.addEventListener('click', () => {
    const scope = { stage: '', ...presets[button.dataset.preset] };
    for (const [key, value] of Object.entries(scope)) form.elements.namedItem(key).value = value;
    render();
  });
}
download.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ mode: 'source-snapshot', ...report }, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `delta-report-${report.asOf}.json`;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

render();

async function showTelegraphRuns() {
  const response = await fetch(new URL('./telegraph-runs.json', import.meta.url));
  if (!response.ok) return;
  const runs = await response.json();
  if (!runs.length) return;
  const container = document.querySelector('#network-runs');
  for (const run of runs) {
    const amount = Number(run.receipt.amount_uusdc) / 1_000_000;
    const article = element('article');
    article.append(
      element('h3', `${run.miner.name} · ${run.intent}`),
      element('p', run.question),
      element('p', `Base Sepolia • ${amount} faucet USDC • signature and token transfer recorded`),
    );
    for (const row of run.report.results) {
      article.append(element('p', row.observation), sourceLink(row));
    }
    if (!run.report.results.length) {
      article.append(element('p', 'Claim withheld. The search returned no exact supporting article in our verified snapshot.'));
    }
    article.append(
      sourceLink({ url: run.transfer.url }, 'Settled token transfer ↗'),
      sourceLink({ url: run.signal.url }, 'Telegraph signal ↗'),
    );
    container.append(article);
  }
  document.querySelector('#network-evidence').hidden = false;
}

showTelegraphRuns().catch(() => {});
