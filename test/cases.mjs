export const cases = [
  {
    id: 'exact-site-as-of', scope: { query: 'Eppendorf', asOf: '2026-11-01' },
    expected: { 'eppendorf-lease': 'investigate' },
  },
  {
    id: 'same-site-new-milestone', scope: { query: 'Eppendorf SE', asOf: '2026-11-25' },
    expected: { 'eppendorf-groundbreaking': 'investigate' },
  },
  {
    id: 'no-peeking-before-july', scope: { query: 'Eppendorf', asOf: '2026-07-01' },
    expected: {},
  },
  {
    id: 'malay-search', scope: { query: 'kilang semikonduktor', region: 'Penang', since: '2026-10-09' },
    expected: { 'estek-opening': 'investigate' },
  },
  {
    id: 'location-disambiguation', scope: { query: 'manufacturing', region: 'Johor', since: '2025-01-01' },
    expected: { 'rianlon-groundbreaking': 'investigate', 'scanfil-expansion': 'investigate' },
  },
  {
    id: 'alias-and-freshness', scope: { query: 'SRXGlobal', region: 'Johor' },
    expected: {},
  },
  {
    id: 'existing-solar', scope: { query: 'Honda', region: 'Melaka' },
    expected: { 'honda-existing-pv': 'hold' },
  },
  {
    id: 'wrong-state', scope: { query: 'Honda', region: 'Johor' },
    expected: {},
  },
  {
    id: 'report-date-not-event-date', scope: { query: 'KYZEN', asOf: '2026-10-07' },
    expected: {},
  },
  {
    id: 'phase-not-complete-site', scope: { query: 'MKS', stage: 'opened' },
    expected: {},
  },
  {
    id: 'unknown-name', scope: { query: 'Northstar Solar Plastics 2600' },
    expected: {},
  },
  {
    id: 'eligible-expansion-alias', scope: { query: 'SRXGlobal', region: 'Johor', since: '2025-01-01' },
    expected: { 'scanfil-expansion': 'investigate' },
  },
  {
    id: 'older-announcement-meets-cutoff', scope: { query: 'SuperSiC', region: 'Penang', since: '2025-07-04' },
    expected: { 'supersic-groundbreaking': 'investigate' },
  },
];
