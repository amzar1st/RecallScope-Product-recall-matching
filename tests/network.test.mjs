import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MODEL, parseResult, transactionState} from '../src/network.mjs';

test('consensus acceptance is pending until finalization', () => {
  for (const status of ['PENDING', 'ACCEPTED', 'READY_TO_FINALIZE']) {
    assert.deepEqual(transactionState({status}), {status, outcome: 'pending'});
  }
});
test('recognizes a successful finalized transaction', () => {
  assert.equal(transactionState({statusName:'FINALIZED', txExecutionResultName:'SUCCESS'}).outcome, 'finalized');
});
test('recognizes failed execution and terminal consensus states', () => {
  assert.equal(transactionState({status:'FINALIZED', txExecutionResultName:'FAILURE'}).outcome, 'failed');
  assert.equal(transactionState({status:'UNDETERMINED'}).outcome, 'failed');
});
test('empty on-chain result and mismatched result identity', () => {
  const record = JSON.stringify({model:MODEL, lot:'EP250324', stage:'expanded', verdict:'COVERED',
    decision_hash:'a'.repeat(64), notices:[]});
  assert.equal(parseResult('', 'EP250324', 'expanded'), null);
  assert.equal(parseResult(record, 'EP250324', 'expanded').verdict, 'COVERED');
  assert.throws(() => parseResult(record, 'EP250325', 'expanded'));
  assert.throws(() => parseResult(record, 'EP250324', 'original'));
});
