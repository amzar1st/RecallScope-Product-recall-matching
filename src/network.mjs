export const MODEL = 'D087031RH';
export const ADDRESS = '0x14062fBbC5C4b62d89dcE4D3beF6260b4DCd15Ff';
export const STUDIO = 'https://studio.genlayer.com/?import-contract=' + ADDRESS;
export const EXPLORER = 'https://explorer-studio.genlayer.com';
export const DEPLOYMENT = '0xb7ef5dcd9395dcefc631483a6e43bd5cb438a8e3e6b6279a13415fe6144b5a9d';
export const DEMOS = {
  'EP250324:original': '0xea1d8dfe2264a8a933e559ce488b4f05e89aba130ab7f73876a84eb4ae03b7b8',
  'EP250324:expanded': '0xc3d0537ca5be9a9c8505ab114fc6ffcf40c800710ab834d9c403f131591e2d75',
  'EP250325:expanded': '0x7f4401afbe4a8f6e20cb50af53c8c2b1e24dbdec23aa919ca3f54d338e5b2776',
};

export function transactionState(tx) {
  const status = String(tx.statusName ?? tx.status ?? 'PENDING').toUpperCase();
  const receipts = tx.consensus_data?.leader_receipt;
  // Studio can include a bookkeeping receipt with an "idle" payload after execution.
  const receipt = Array.isArray(receipts) ?
    receipts.findLast(entry => entry.result?.payload !== 'idle') : receipts;
  const execution = String(tx.txExecutionResultName ?? receipt?.execution_result ?? '').toUpperCase();
  if (['CANCELED', 'UNDETERMINED', 'VALIDATORS_TIMEOUT', 'LEADER_TIMEOUT'].includes(status)) {
    return {status, outcome: 'failed'};
  }
  if (status === 'FINALIZED') {
    if (execution && execution !== 'SUCCESS' && execution !== 'FINISHED_WITH_RETURN') {
      return {status, outcome: 'failed'};
    }
    return {status, outcome: execution ? 'finalized' : 'unconfirmed'};
  }
  return {status, outcome: 'pending'};
}

export function parseResult(raw, lot, stage) {
  if (raw === '') return null;
  const result = JSON.parse(raw);
  if (result.model !== MODEL || result.lot !== lot || result.stage !== stage ||
      !/^[a-f0-9]{64}$/.test(result.decision_hash) || !Array.isArray(result.notices) ||
      !['COVERED', 'OUTSIDE_NOTICE_SCOPE', 'INSUFFICIENT_EVIDENCE'].includes(result.verdict)) {
    throw new Error('Unexpected RecallScope response');
  }
  return result;
}
