import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createClient} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {TransactionHashVariant} from 'genlayer-js/types';
import {ADDRESS, DEMOS, DEPLOYMENT, MODEL, parseResult, transactionState} from '../src/network.mjs';

const client = createClient({chain: studionet});
const studioAccount = '0x62750Bb60A705B27B96867c60665D47cCF5B1Dd7';
const sha256 = value => createHash('sha256').update(value).digest('hex');

async function finalized(hash, outcome = 'finalized') {
  const tx = await client.getTransaction({hash});
  assert.equal(tx.to_address.toLowerCase(), ADDRESS.toLowerCase());
  assert.equal(tx.from_address.toLowerCase(), studioAccount.toLowerCase());
  assert.equal(tx.leader_only, false);
  assert.deepEqual(transactionState(tx), {status: 'FINALIZED', outcome});
  return tx;
}

const [source, onChainSource] = await Promise.all([
  readFile(new URL('../contracts/recall_scope.py', import.meta.url), 'utf8'),
  client.getContractCode(ADDRESS),
  finalized(DEPLOYMENT),
]);
assert.equal(source, onChainSource, 'The deployed byte-for-byte source differs');
console.log('Source SHA-256', sha256(source));

const expected = {'EP250324:expanded': 'COVERED'};
await Promise.all(Object.entries(DEMOS).map(async ([key, hash]) => {
  const [lot, stage] = key.split(':');
  const [raw, tx] = await Promise.all([
    client.readContract({address: ADDRESS, functionName: 'get_result', args: [MODEL, lot, stage],
      transactionHashVariant: TransactionHashVariant.LATEST_FINAL}),
    finalized(hash),
  ]);
  assert.ok(tx.data.calldata.readable.includes('"check_lot"'));
  assert.ok(tx.data.calldata.readable.includes('"' + lot + '"'));
  assert.ok(tx.data.calldata.readable.includes('"' + stage + '"'));
  const result = parseResult(raw, lot, stage);
  assert.equal(result.verdict, expected[key] ?? 'OUTSIDE_NOTICE_SCOPE');
  assert.ok(result.notices.every(record => record.state === 'VERIFIED'));
  const {decision_hash, ...decision} = result;
  assert.equal(decision_hash, sha256(JSON.stringify(decision)));
  console.log(key, result.verdict, hash, decision_hash);
}));

if (process.argv[2]) {
  await finalized(process.argv[2], 'failed');
  console.log('Malformed lot rejected', process.argv[2]);
}
