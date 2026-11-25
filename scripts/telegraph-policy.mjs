export const oracle = 'https://devnode.telegraphprotocol.com';
export const askUrl = oracle + '/engine/v1/ask';
export const network = 'eip155:84532';
export const chainId = 84532;
export const asset = '0x036cbd53842c5426634e7929541ec2318f3dcf7e';
export const receiver = '0xc0a3fb6d3f1f4b54617d29ffbda4663af5f96e2e';
export const maxMicroUsdc = 10_000n;
export const intent = 'WEB_SEARCH_GENERAL';

function address(value) {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

export function requireTestnetQuote(body) {
  if (body?.x402Version !== 2 || body.resource?.url !== askUrl || !Array.isArray(body.accepts)) {
    throw new Error('Unexpected x402 challenge or destination.');
  }
  const candidates = body.accepts.filter((entry) =>
    entry?.scheme === 'exact' && entry.network === network &&
    address(entry.asset) === asset && address(entry.payTo) === receiver &&
    typeof entry.amount === 'string' && /^\d{1,6}$/.test(entry.amount) && BigInt(entry.amount) > 0n && BigInt(entry.amount) <= maxMicroUsdc &&
    Number.isInteger(entry.maxTimeoutSeconds) && entry.maxTimeoutSeconds > 0 && entry.maxTimeoutSeconds <= 60 &&
    entry.extra?.name === 'USDC' && entry.extra?.version === '2' &&
    !entry.extra.assetTransferMethod,
  );
  if (candidates.length !== 1) {
    throw new Error('The challenge does not contain one approved Base Sepolia test-USDC offer.');
  }
  // Pass the checked offer only. An SDK may support other chains or transfer methods.
  return { x402Version: 2, resource: { url: askUrl }, accepts: candidates };
}

export function validateReceipts(settlement, receipt, quote, payer) {
  const tx = settlement?.transaction;
  const validHash = (value) => typeof value === 'string' && /^0x[0-9a-fA-F]{64}$/.test(value);
  if (settlement?.success !== true || settlement.network !== network || !validHash(tx) ||
      receipt?.rail !== 'x402' || receipt.chain !== network ||
      receipt.settlement !== 'onchain' || receipt.intent !== intent ||
      receipt.tx_hash?.toLowerCase() !== tx.toLowerCase() ||
      address(receipt.payer) !== address(payer) || String(receipt.amount_uusdc) !== quote.amount ||
      !validHash(receipt.receipt_hash)) {
    throw new Error('Returned receipts do not match the approved testnet purchase.');
  }
  return tx;
}
