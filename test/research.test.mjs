import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalSource, evidenceFromMiner, isoDate, research } from '../app/research.mjs';
import { records } from '../app/records.mjs';
import { cases } from './cases.mjs';

for (const { id, scope, expected } of cases) {
  test(id, () => {
    const report = research(scope);
    assert.deepEqual(Object.fromEntries(report.results.map(({ id, decision }) => [id, decision])), expected);
  });
}

test('rejects date rollovers and inverted date ranges', () => {
  assert.equal(isoDate('2026-02-30'), false);
  assert.throws(() => research({ since: '2026-10-01', asOf: '2026-09-30' }), /valid evidence date range/);
});

test('URL matching uses exact publisher and path after stripping tracking', () => {
  const source = records[0];
  const result = evidenceFromMiner([
    { url: source.url + '?utm_source=irrelevant#content' },
    { url: source.url.replace('investpenang.gov.my', 'other.example') },
    { url: source.url.replace('https://', 'https://operator@') },
    source.url + 'unrelated-path',
    'InvestPenang',
  ]);
  assert.deepEqual(result.map(({ id }) => id), [source.id]);
  assert.equal(canonicalSource('https://investpenang.gov.my:8443/source'), null);
});

test('record identities are unique and dated before the snapshot ends', () => {
  assert.equal(new Set(records.map(({ id }) => id)).size, records.length);
  for (const record of records) {
    assert(isoDate(record.published));
    if (record.eventDate) assert(record.eventDate <= record.published);
    assert(canonicalSource(record.url));
  }
});
