// _chk-dup-api.js — offline regression probe for client/api/check-dup.js
// Mocks global fetch so the Gemini call never leaves the machine, then drives
// the serverless handler through every branch of its contract.
'use strict';
const assert = require('assert');
const handler = require('./client/api/check-dup.js');

function mockRes() {
  const out = { statusCode: 0, body: null, headers: {} };
  out.setHeader = (k, v) => { out.headers[k] = v; };
  out.status = c => { out.statusCode = c; return out; };
  out.json = b => { out.body = b; return out; };
  out.end = () => { out.ended = true; return out; };
  return out;
}

/* Wrap the real handler with a req/res shim + a controllable Gemini payload. */
let geminiText = null;      // what the mocked Gemini endpoint returns
let geminiCalled = 0;       // how many times Gemini was hit
let geminiShouldFail = false;

async function call(req) {
  const res = mockRes();
  await handler(req, res);
  return res;
}

global.fetch = async () => {
  geminiCalled++;
  if (geminiShouldFail) throw new Error('network down');
  return {
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: geminiText }] } }]
    }),
    text: async () => ''
  };
};

/* The handler fail-opens when the key env var is missing — provide a dummy key
   so the Gemini branches are actually exercised (restored/cleared per test). */
process.env.kuestl_gemini_key = 'test-key-dummy';

const DRAFT = {
  title: 'Drainage failure floods school access road every monsoon',
  description: 'The drain near the Govt school is choked; water rises knee-deep…',
  district: 'Ranchi', state: 'Jharkhand'
};
const EXISTING = [
  { id: 11, title: 'Old drain problem', description: 'Choked drain near school, floods road', district: 'Ranchi', same_district: true },
  { id: 12, title: 'Street lights out', description: 'No lighting on main road', district: 'Hazaribagh', same_district: false }
];

(async () => {
  let pass = 0, fail = 0;
  const t = async (name, fn) => {
    try { await fn(); pass++; console.log('PASS  ' + name); }
    catch (e) { fail++; console.log('FAIL  ' + name + ' :: ' + e.message); }
  };

  await t('CORS headers + OPTIONS preflight', async () => {
    const r = await call({ method: 'OPTIONS' });
    assert.equal(r.statusCode, 200);
    assert.equal(r.headers['Access-Control-Allow-Origin'], '*');
    assert.equal(r.ended, true);
    assert.equal(geminiCalled, 0);
  });

  await t('405 for GET', async () => {
    const r = await call({ method: 'GET' });
    assert.equal(r.statusCode, 405);
  });

  await t('400 when title/description missing', async () => {
    const r = await call({ method: 'POST', body: { title: 'x', existing: EXISTING } });
    assert.equal(r.statusCode, 400);
  });

  await t('EMPTY candidate list → duplicate:false with NO Gemini call (fast path)', async () => {
    const r = await call({ method: 'POST', body: { ...DRAFT, existing: [] } });
    assert.equal(r.statusCode, 200);
    assert.deepEqual(r.body, { duplicate: false, match_id: null, reason: 'No existing problems in this area' });
    assert.equal(geminiCalled, 0, 'must not hit Gemini when there is nothing to compare');
  });

  await t('MISSING existing key → fast path too', async () => {
    const r = await call({ method: 'POST', body: { ...DRAFT } });
    assert.equal(r.body.duplicate, false);
    assert.equal(geminiCalled, 0);
  });

  await t('Gemini says duplicate → duplicate:true with the candidate id', async () => {
    geminiText = JSON.stringify({ duplicate: true, match_id: 11, reason: 'Same choked drain near the school' });
    const r = await call({ method: 'POST', body: { ...DRAFT, existing: EXISTING } });
    assert.equal(geminiCalled, 1);
    assert.equal(r.statusCode, 200);
    assert.equal(r.body.duplicate, true);
    assert.equal(r.body.match_id, 11);
  });

  await t('Gemini hallucinates an unknown match_id → rejected (duplicate:false)', async () => {
    geminiText = JSON.stringify({ duplicate: true, match_id: 999 });
    const r = await call({ method: 'POST', body: { ...DRAFT, existing: EXISTING } });
    assert.equal(r.body.duplicate, false);
    assert.equal(r.body.match_id, null);
  });

  await t('Gemini says not a duplicate → duplicate:false, match_id:null', async () => {
    geminiText = JSON.stringify({ duplicate: false, match_id: null, reason: 'Different issue' });
    const r = await call({ method: 'POST', body: { ...DRAFT, existing: EXISTING } });
    assert.equal(r.body.duplicate, false);
  });

  await t('Gemini returns garbage → FAILS OPEN with duplicate:false (200)', async () => {
    geminiText = 'not json at all {{{';
    const r = await call({ method: 'POST', body: { ...DRAFT, existing: EXISTING } });
    assert.equal(r.statusCode, 200, 'fail-open must still answer 200 so the wizard continues');
    assert.equal(r.body.duplicate, false);
  });

  await t('Gemini network failure → FAILS OPEN with duplicate:false (200)', async () => {
    geminiShouldFail = true;
    const r = await call({ method: 'POST', body: { ...DRAFT, existing: EXISTING } });
    geminiShouldFail = false;
    assert.equal(r.statusCode, 200);
    assert.equal(r.body.duplicate, false);
    assert.equal(r.body.reason, 'Checker unavailable');
  });

  await t('missing key env var → FAILS OPEN without calling Gemini', async () => {
    const before = geminiCalled;
    delete process.env.kuestl_gemini_key;
    const r = await call({ method: 'POST', body: { ...DRAFT, existing: EXISTING } });
    process.env.kuestl_gemini_key = 'test-key-dummy';   // restore for later tests
    assert.equal(r.statusCode, 200);
    assert.equal(r.body.duplicate, false, 'missing key must fail open');
    assert.equal(r.body.reason, 'Checker not configured');
    assert.equal(geminiCalled, before, 'Gemini must not be called without a key');
  });

  console.log('\nRESULT: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });