import {createClient} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {TransactionHashVariant} from 'genlayer-js/types';
import {ADDRESS, DEMOS, EXPLORER, MODEL, STUDIO, parseResult, transactionState} from './network.mjs';

const client = createClient({chain: studionet});
const byId = id => document.getElementById(id);
const form = byId('lookup');
const lotInput = byId('lot');
const stageInput = byId('stage');
const status = byId('status');
const txStatus = byId('tx-status');
const resultPanel = byId('result');
let lookupRun = 0;
let trackRun = 0;
let activeQuery;

function element(tag, value, className) {
  const node = document.createElement(tag);
  node.textContent = value;
  if (className) node.className = className;
  return node;
}

function link(text, url) {
  const node = element('a', text);
  node.href = url;
  node.target = '_blank';
  node.rel = 'noopener';
  return node;
}

const labels = {
  COVERED: 'Covered by the notice',
  OUTSIDE_NOTICE_SCOPE: 'Outside the selected notice scope',
  INSUFFICIENT_EVIDENCE: 'Insufficient evidence',
};

function showResult(result) {
  resultPanel.append(element('p', labels[result.verdict], 'decision ' + result.verdict.toLowerCase()));
  for (const record of result.notices) {
    const item = element('div', '', 'evidence');
    if (/^https:\/\/www\.accessdata\.fda\.gov\/scripts\/cdrh\/cfdocs\/cfres\/res\.cfm\?id=(215768|218129)$/.test(record.url)) {
      item.append(link(record.id + ' ↗', record.url));
    }
    if (record.state === 'VERIFIED') {
      item.append(element('p', record.lot_match ? 'Lot listed in Code Information' : 'Lot absent from Code Information'));
      item.append(element('p', record.clause));
    } else {
      item.append(element('p', 'FDA scope could not be verified against the pinned version.'));
    }
    item.append(element('p', 'Scope SHA-256 ' + record.sha256, 'fingerprint'));
    if (/^https:\/\/raw\.githubusercontent\.com\/amzar1st\/RecallScope-Product-recall-matching\/[a-f0-9]{40}\/evidence\/(215768|218129)\.json$/.test(record.snapshot_url)) {
      item.append(link('Pinned scope snapshot ↗', record.snapshot_url));
    }
    resultPanel.append(item);
  }
  resultPanel.append(element('p', 'Decision SHA-256 ' + result.decision_hash, 'fingerprint'));
}

async function lookup() {
  const run = ++lookupRun;
  const lot = lotInput.value.toUpperCase();
  const stage = stageInput.value;
  const stageLabel = stageInput.selectedOptions[0].textContent;
  activeQuery = [lot, stage];
  const url = new URL(location.href);
  url.searchParams.set('lot', lot);
  url.searchParams.set('stage', stage);
  history.replaceState(null, '', url);
  byId('args').textContent = JSON.stringify([MODEL, lot, stage]);
  byId('run').open = false;
  status.textContent = 'Reading finalized StudioNet state…';
  resultPanel.replaceChildren();
  try {
    const raw = await client.readContract({
      address: ADDRESS, functionName: 'get_result', args: [MODEL, lot, stage],
      transactionHashVariant: TransactionHashVariant.LATEST_FINAL,
    });
    if (run !== lookupRun) return;
    const result = parseResult(raw, lot, stage);
    if (!result) {
      status.textContent = 'No finalized decision for this lot and notice set.';
      byId('run').open = true;
      return;
    }
    status.textContent = MODEL + ' / ' + lot + ' · ' + stageLabel;
    showResult(result);
    const hash = DEMOS[lot + ':' + stage];
    if (hash) resultPanel.append(link('View finalized example transaction ↗', EXPLORER + '/tx/' + hash));
  } catch {
    if (run === lookupRun) status.textContent = 'StudioNet did not return a readable result. Try the lookup again.';
  }
}

async function track(hash) {
  const run = ++trackRun;
  const initialQuery = activeQuery;
  txStatus.textContent = 'Looking up the transaction…';
  for (let poll = 0; poll < 60 && run === trackRun; poll++) {
    try {
      const tx = await client.getTransaction({hash});
      if (run !== trackRun) return;
      const recipient = tx.to_address ?? tx.recipient;
      if (recipient?.toLowerCase() !== ADDRESS.toLowerCase()) {
        txStatus.textContent = 'This transaction could not be matched to the RecallScope deployment.';
        return;
      }
      const state = transactionState(tx);
      const message = state.outcome === 'failed' ? 'Transaction failed' :
        state.outcome === 'finalized' ? 'Transaction finalized' :
          state.outcome === 'unconfirmed' ? 'Finalized; execution result unavailable' : 'Awaiting finalization';
      txStatus.replaceChildren(document.createTextNode(message + ' · ' + state.status + ' · '),
        link('Explorer ↗', EXPLORER + '/tx/' + hash));
      if (state.outcome === 'finalized' && initialQuery && activeQuery === initialQuery &&
          lotInput.value.toUpperCase() === initialQuery[0] && stageInput.value === initialQuery[1]) await lookup();
      if (state.outcome !== 'pending') return;
    } catch {
      if (run !== trackRun) return;
      txStatus.textContent = 'Transaction unavailable. Waiting for StudioNet to return a record…';
    }
    await new Promise(resolve => setTimeout(resolve, 4000));
  }
  if (run === trackRun) txStatus.textContent = 'Tracking paused. Submit the same hash to check again.';
}

byId('studio').href = STUDIO;
byId('network').href = EXPLORER + '/address/' + ADDRESS;
byId('args').textContent = JSON.stringify([MODEL, 'EP250324', 'expanded']);
form.addEventListener('submit', event => {event.preventDefault(); lookup();});
byId('track').addEventListener('submit', event => {
  event.preventDefault();
  track(byId('hash').value.trim());
});
document.querySelectorAll('[data-lot]').forEach(button => button.addEventListener('click', () => {
  lotInput.value = button.dataset.lot;
  form.requestSubmit();
}));

const params = new URLSearchParams(location.search);
const requestedLot = params.get('lot');
const requestedStage = params.get('stage');
if (requestedLot && /^EP[0-9]{6}[A-Z]?$/i.test(requestedLot) &&
    ['original', 'expanded'].includes(requestedStage)) {
  lotInput.value = requestedLot;
  stageInput.value = requestedStage;
  lookup();
}
