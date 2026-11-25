import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { x402Client } from '@x402/core/client';
import { toClientEvmSigner } from '@x402/evm';
import { ExactEvmScheme } from '@x402/evm/exact/client';
import { createPublicClient, http, keccak256, parseAbi, parseEventLogs, toBytes } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { evidenceFromMiner, research } from '../app/research.mjs';
import { snapshotDate } from '../app/records.mjs';
import { askUrl, asset, chainId, intent, network, oracle, receiver, requireTestnetQuote, validateReceipts } from './telegraph-policy.mjs';

const options = {
  purchase: { type: 'boolean' },
  company: { type: 'string', default: 'MKS' },
  query: { type: 'string', default: 'Find the MIDA release for the MKS Supercenter Factory in Penang, June 2026. Return its exact official source URL and publication date.' },
  since: { type: 'string', default: '2026-01-01' },
  'as-of': { type: 'string', default: snapshotDate },
  output: { type: 'string' },
};

const fromHeader = (response, name) => {
  const value = response.headers.get(name);
  if (!value) throw new Error(`Missing ${name} header.`);
  return JSON.parse(Buffer.from(value, 'base64').toString('utf8'));
};

function sortedJson(value) {
  if (Array.isArray(value)) return `[${value.map(sortedJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${sortedJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

async function verifySignal(hash) {
  if (typeof hash !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(hash)) {
    throw new Error('The paid answer did not carry a valid signal hash.');
  }
  const url = `${oracle}/engine/v1/signal/${hash}`;
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`Signal read returned HTTP ${response.status}.`);
  const { payload, verification } = await response.json();
  if (!payload || typeof payload !== 'object') throw new Error('Missing signal payload.');
  if (typeof payload.wallet_address === 'string') payload.wallet_address = payload.wallet_address.toLowerCase();
  const escaped = sortedJson(payload).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
  const computed = keccak256(toBytes(escaped));
  if (computed.toLowerCase() !== hash.toLowerCase()) throw new Error('Signal content hash did not match.');
  return { url, hash, nodeVerified: verification?.verified === true, independentlyHashed: true };
}

async function main() {
  const { values } = parseArgs({ options });
  const scope = { query: values.company, since: values.since, asOf: values['as-of'] };
  research(scope, []); // Validate the evidence window before asking the network.
  if (Buffer.byteLength(values.query) > 256 || !values.query.trim()) {
    throw new Error('Use a nonempty public question of at most 256 UTF-8 bytes.');
  }
  const body = JSON.stringify({ intent, params: { query: values.query }, deadline_ms: 25_000 });
  const ask = (headers = {}) => fetch(askUrl, {
    method: 'POST', body, headers: { 'content-type': 'application/json', ...headers },
    redirect: 'error', signal: AbortSignal.timeout(40_000),
  });

  const quoteResponse = await ask();
  if (quoteResponse.status !== 402) throw new Error(`Expected a 402 challenge, got HTTP ${quoteResponse.status}.`);
  const approved = requireTestnetQuote(fromHeader(quoteResponse, 'payment-required'));
  await quoteResponse.body?.cancel();
  const [quote] = approved.accepts;
  if (!values.purchase) {
    console.log(JSON.stringify({ mode: 'unsigned-quote', status: 402, intent, query: values.query, ...quote }, null, 2));
    return;
  }
  const walletPath = process.env.DELTA_TEST_WALLET_FILE;
  if (!walletPath) throw new Error('Set DELTA_TEST_WALLET_FILE to a disposable, funded Base Sepolia wallet key file.');
  const account = privateKeyToAccount((await readFile(walletPath, 'utf8')).trim());
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http('https://sepolia.base.org', { retryCount: 0 }) });
  if (await publicClient.getChainId() !== chainId) throw new Error('Unexpected RPC chain.');
  const balance = await publicClient.readContract({
    address: asset,
    abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
    functionName: 'balanceOf',
    args: [account.address],
  });
  if (balance < BigInt(quote.amount)) throw new Error('The disposable wallet has insufficient Base Sepolia faucet USDC.');
  const signer = toClientEvmSigner(account, publicClient);
  const client = new x402Client().register(network, new ExactEvmScheme(signer));
  const payment = await client.createPaymentPayload(approved);
  if (values.output) {
    const attempt = { mode: 'base-sepolia-x402', status: 'pending', intent, question: values.query };
    await writeFile(values.output, JSON.stringify(attempt, null, 2) + '\n', { flag: 'wx' });
  }
  const signed = await ask({ 'payment-signature': Buffer.from(JSON.stringify(payment)).toString('base64') });
  if (!signed.ok) {
    const settlementHeader = signed.headers.get('payment-response');
    if (settlementHeader) console.error('Reported sandbox settlement:', fromHeader(signed, 'payment-response'));
    throw new Error(`Telegraph returned HTTP ${signed.status} after one signed attempt. Inspect its status before making another purchase.`);
  }
  const settlement = fromHeader(signed, 'payment-response');
  const receipt = fromHeader(signed, 'x-telegraph-receipt');
  const tx = validateReceipts(settlement, receipt, quote, account.address);
  const answer = await signed.json();

  const chainReceipt = await publicClient.waitForTransactionReceipt({ hash: tx, retryCount: 3, timeout: 30_000 });
  const transfers = parseEventLogs({
    abi: parseAbi(['event Transfer(address indexed from, address indexed to, uint256 value)']),
    eventName: 'Transfer', logs: chainReceipt.logs.filter((log) => log.address.toLowerCase() === asset),
  });
  const transfersMatch = transfers.some(({ args }) =>
    args.from.toLowerCase() === account.address.toLowerCase() && args.to.toLowerCase() === receiver &&
    args.value === BigInt(quote.amount),
  );
  if (chainReceipt.status !== 'success' || !transfersMatch) {
    throw new Error(`Sandbox transaction ${tx} did not show the expected faucet-token transfer.`);
  }
  let signal;
  try {
    signal = await verifySignal(answer.signal_hash);
  } catch (error) {
    signal = { hash: answer.signal_hash, independentlyHashed: false, reason: error.message };
  }

  // Network output selects sources. Only a known URL exactly matching a curated record
  // can enter the downstream report. The miner's free text never becomes a facility claim.
  const recognized = evidenceFromMiner(answer.result?.sources);
  const report = research(scope, recognized);
  const evidence = {
    mode: 'base-sepolia-x402', status: 'delivered', intent, question: values.query, settlement,
    receipt, signal, transfer: { verified: true, url: `https://sepolia.basescan.org/tx/${tx}` },
    miner: { id: answer.miner_id, name: answer.miner_name, sources: answer.result?.sources ?? [] },
    report,
  };
  const json = JSON.stringify(evidence, null, 2) + '\n';
  if (values.output) await writeFile(values.output, json);
  console.log(json);
  if (!report.results.length || !signal.independentlyHashed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
