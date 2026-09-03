// _chk-content-api.js — offline regression probe for the new content-quality
// stage: client/api/check-content.js (Gemini) + its wiring in submit.html.
// Mocks global fetch so the Gemini call never leaves the machine.
'use strict';
const assert = require('assert');
const fs = require('fs');
const handler = require('./client/api/check-content.js');

function mockRes() {
  const out = { statusCode: 0, body: null, headers: {} };
  out.setHeader = (k, v) => { out.headers[k] = v; };
  out.status = c => { out.statusCode = c; return out; };
  out.json = b => { out.body = b; return out; };
  out.end = () => { out.ended = true; return out; };
  return out;
}

let geminiText = null;
let geminiCalled = 0;
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

process.env.kuestl_gemini_key = 'test-key-dummy';

const GOOD = { title: 'Drainage failure floods school access road every monsoon', description: 'The drain near the Govt school is choked; water rises knee-deep every rain.' };

(async () => {
  let pass = 0, fail = 0;
  const t = async (name, fn) => {
    try { await fn(); pass++; console.log('PASS  ' + name); }
    catch (e) { fail++; console.log('FAIL  ' + name + ' :: ' + e.message); }
  };

  /* ---- endpoint contract ---- */

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

  await t('400 when title or description missing', async () => {
    const r = await call({ method: 'POST', body: { title: 'only title' } });
    assert.equal(r.statusCode, 400);
  });

  await t('flags GIBBERISH title ("sjnfjn efw er gw")', async () => {
    geminiText = JSON.stringify({ flagged: true, category: 'gibberish', field: 'title', note: 'The title is random characters.' });
    const r = await call({ method: 'POST', body: GOOD });
    assert.equal(geminiCalled, 1);
    assert.equal(r.statusCode, 200);
    assert.equal(r.body.flagged, true);
    assert.equal(r.body.category, 'gibberish');
    assert.equal(r.body.field, 'title');
    assert.equal(r.body.note, 'The title is random characters.');
  });


  await t('flags NONSENSE word-salad ("help world say good time data")', async () => {
    geminiText = JSON.stringify({ flagged: true, category: 'nonsense', field: 'both', note: 'No understandable problem.' });
    const r = await call({ method: 'POST', body: GOOD });
    assert.equal(r.body.flagged, true);
    assert.equal(r.body.category, 'nonsense');
    assert.equal(r.body.field, 'both');
  });

  await t('flags ABUSIVE language even inside a genuine complaint', async () => {
    geminiText = JSON.stringify({ flagged: true, category: 'abusive', field: 'description', note: 'Contains profanity.' });
    const r = await call({ method: 'POST', body: GOOD });
    assert.equal(r.body.flagged, true);
    assert.equal(r.body.category, 'abusive');
    assert.equal(r.body.field, 'description');
  });

  await t('PASS on minor typos — not flagged', async () => {
    geminiText = JSON.stringify({ flagged: false, category: null, field: null, note: '' });
    const r = await call({ method: 'POST', body: { title: 'Streetlight brokn near park', description: 'Light not wrking since last weak, road is dark at nite.' } });
    assert.equal(r.body.flagged, false);
    assert.equal(r.body.category, null);
  });

  await t('PASS on short meaningful title (Hinglish)', async () => {
    geminiText = JSON.stringify({ flagged: false, category: null, field: null, note: '' });
    const r = await call({ method: 'POST', body: { title: 'Paani nahi aa raha', description: 'Water supply cut in our colony since Monday.' } });
    assert.equal(r.body.flagged, false);
  });

  await t('flagged:true with UNKNOWN category is clamped to "nonsense" (still blocks)', async () => {
    geminiText = JSON.stringify({ flagged: true, category: 'spam-ish', field: 'title', note: 'Unclear.' });
    const r = await call({ method: 'POST', body: GOOD });
    assert.equal(r.body.flagged, true);
    assert.equal(r.body.category, 'nonsense');
    assert.equal(r.body.note, 'Unclear.');
  });

  await t('uppercase category normalized, unknown field → null', async () => {
    geminiText = JSON.stringify({ flagged: true, category: 'ABUSIVE', field: 'everywhere', note: 'Harsh words.' });
    const r = await call({ method: 'POST', body: GOOD });
    assert.equal(r.body.flagged, true);
    assert.equal(r.body.category, 'abusive');
    assert.equal(r.body.field, null);
  });

  await t('truthy-but-not-true flagged (1 / "true") is NOT trusted', async () => {
    geminiText = JSON.stringify({ flagged: 1, category: 'gibberish', field: 'title' });
    const r = await call({ method: 'POST', body: GOOD });
    assert.equal(r.body.flagged, false, 'only exact true may flag a report');
    assert.equal(r.body.category, null);
  });

  await t('Gemini garbage → FAILS OPEN with flagged:false (200)', async () => {
    geminiText = 'not json at all {{{';
    const r = await call({ method: 'POST', body: GOOD });
    assert.equal(r.statusCode, 200);
    assert.equal(r.body.flagged, false);
    assert.equal(r.body.reason, 'Checker unavailable');
  });

  await t('Gemini network failure → FAILS OPEN (200)', async () => {
    geminiShouldFail = true;
    const r = await call({ method: 'POST', body: GOOD });
    geminiShouldFail = false;
    assert.equal(r.statusCode, 200);
    assert.equal(r.body.flagged, false);
  });

  await t('missing key env var → FAILS OPEN without calling Gemini', async () => {
    const before = geminiCalled;
    delete process.env.kuestl_gemini_key;
    const r = await call({ method: 'POST', body: GOOD });
    process.env.kuestl_gemini_key = 'test-key-dummy';
    assert.equal(r.statusCode, 200);
    assert.equal(r.body.flagged, false);
    assert.equal(r.body.reason, 'Checker not configured');
    assert.equal(geminiCalled, before);
  });


  /* ---- prompt quality (what Sahayak is actually told) ---- */

  await t('prompt contains the user\'s exact example strings', async () => {
    // Re-run once and capture the outbound Gemini request body.
    let sent = '';
    global.fetch = async (url, opts) => {
      geminiCalled++;
      sent = (opts && opts.body) || '';
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: geminiText }] } }] }) };
    };
    geminiText = JSON.stringify({ flagged: false, category: null, field: null, note: '' });
    await call({ method: 'POST', body: { title: 'T', description: 'D' } });
    assert.ok(sent.includes('sjnfjn efw er gw'), 'gibberish example present');
    assert.ok(sent.includes('help world say good time data'), 'nonsense example present');
    assert.ok(/spelling mistakes/i.test(sent), 'typo-tolerance instruction present');
    assert.ok(/abusive|harsh/i.test(sent), 'abuse instruction present');
    assert.ok(/gibberish.*nonsense.*abusive/s.test(sent), 'three categories named');
  });

  /* ---- submit.html wiring (Phase 0 sits before the duplicate check) ---- */

  const sh = fs.readFileSync('client/submit.html', 'utf8');

  await t('Phase 0 wired before Phase 1 in runAiReview', async () => {
    const p0 = sh.indexOf("fetch('/api/check-content'");
    const p1 = sh.indexOf("fetch('/api/check-dup'");
    assert.ok(p0 > -1 && p1 > -1, 'both endpoints referenced');
    assert.ok(p0 < p1, 'content check runs BEFORE the duplicate check');
  });

  await t('flagged draft hard-gates: no continue button, Back refocuses the field', async () => {
    assert.ok(sh.includes('showContentNotice(content)'), 'flag swap shown');
    assert.ok(sh.includes("contentFocusField = (content.field === 'description') ? 'fDesc' : 'fTitle'"), 'offending field remembered');
    assert.ok(sh.includes("cStay.style.display = 'none'") && sh.includes("cDup.style.display = 'none'"), 'stay + duplicate-continue buttons hidden on flag');
    assert.ok(sh.includes("'← Back to edit'"), 'Back button relabelled');
    assert.ok(sh.includes("setTimeout(() => { try{ el.focus(); }catch(e){} }, 60)"), 'Back focuses the field');
  });

  await t('skip re-check only for identical text; failure of /api/check-content fails open', async () => {
    assert.ok(sh.includes('contentOkKey = contentKey'), 'fingerprint stored after pass');
    assert.ok(sh.includes('if(contentOkKey !== contentKey){'), 'skip only on identical text');
    assert.ok(/content check failed — continuing/.test(sh), 'network error → continue to dup check');
  });

  console.log('\nRESULT: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
