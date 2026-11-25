import assert from 'node:assert/strict';
import test from 'node:test';
import { askUrl, asset, intent, network, receiver, requireTestnetQuote, validateReceipts } from '../scripts/telegraph-policy.mjs';

const approved = {
  scheme: 'exact', network, asset, payTo: receiver, amount: '10000', maxTimeoutSeconds: 60,
  extra: { name: 'USDC', version: '2' },
};
const challenge = (accepts) => ({ x402Version: 2, resource: { url: askUrl }, accepts });

test('passes only the specifically approved testnet offer to the signer', () => {
  const verified = requireTestnetQuote(challenge([approved, { ...approved, network: 'eip155:8453' }]));
  assert.deepEqual(verified.accepts, [approved]);
});
test('fails closed on mainnet, budget changes, other asset, unknown receiver, and duplicate quotes', () => {
  for (const change of [
    { network: 'eip155:8453' }, { amount: '10001' }, { amount: '0' }, { amount: '1e4' },
    { amount: 10_000 }, { asset: receiver }, { payTo: asset }, { maxTimeoutSeconds: 61 },
    { extra: { ...approved.extra, assetTransferMethod: 'permit2' } },
  ]) {
    assert.throws(() => requireTestnetQuote(challenge([{ ...approved, ...change }])), /test-USDC offer/);
  }
  assert.throws(() => requireTestnetQuote(challenge([approved, approved])), /test-USDC offer/);
  assert.throws(() => requireTestnetQuote({ ...challenge([approved]), resource: { url: askUrl + '/2' } }), /destination/);
});
test('matches settlement transaction, receipt, payer, amount and chain', () => {
  const tx = '0x' + '12'.repeat(32);
  const settlement = { success: true, network, transaction: tx };
  const receipt = {
    tx_hash: tx, settlement: 'onchain', chain: network, rail: 'x402',
    intent, payer: asset, amount_uusdc: '10000', receipt_hash: '0x' + 'ab'.repeat(32),
  };
  assert.equal(validateReceipts(settlement, receipt, approved, asset), tx);
  assert.throws(() => validateReceipts(settlement, { ...receipt, amount_uusdc: '10001' }, approved, asset));
  assert.throws(() => validateReceipts(settlement, { ...receipt, payer: receiver }, approved, asset));
  assert.throws(() => validateReceipts({ ...settlement, network: 'eip155:8453' }, receipt, approved, asset));
});
