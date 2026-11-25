import { performance } from 'node:perf_hooks';
import { records } from '../app/records.mjs';
import { research } from '../app/research.mjs';
import { cases } from '../test/cases.mjs';

function baseline({ query = '', region = '', stage = '' }) {
  return records.filter((record) => (!region || record.region === region) &&
    (!stage || record.stage === stage) &&
    [record.company, record.observation].join(' ').toLowerCase().includes(query.toLowerCase()))
    .map(({ id }) => ({ id, decision: 'investigate' }));
}

function evaluate(score) {
  let correct = 0;
  let returned = 0;
  let desired = 0;
  let exact = 0;
  const start = performance.now();
  for (const { scope, expected } of cases) {
    const result = score(scope);
    const count = result.filter(({ id, decision }) => expected[id] === decision).length;
    correct += count;
    returned += result.length;
    desired += Object.keys(expected).length;
    if (count === result.length && count === Object.keys(expected).length) exact += 1;
  }
  return {
    exactCases: exact, correctRows: correct, returnedRows: returned, expectedRows: desired,
    precision: returned ? Number((correct / returned).toFixed(3)) : null,
    recall: desired ? Number((correct / desired).toFixed(3)) : null,
    elapsedMs: Number((performance.now() - start).toFixed(2)),
  };
}

console.log(JSON.stringify({
  benchmark: 'Authored regression cases on a curated public-source corpus',
  cases: cases.length,
  baseline: evaluate(baseline),
  delta: evaluate((scope) => research(scope).results),
}, null, 2));
