// _chk-chat-api.js — offline regression probe for the Sahayak chat endpoint
// (client/api/chat.js) + the live-mode flip of client/js/chat-brain.js.
// Mocks global fetch so no real Gemini call leaves the machine.
'use strict';
const assert = require('assert');
const fs = require('fs');
const handler = require('./client/api/chat.js');

function mockRes() {
  const out = { statusCode: 0, body: null, headers: {} };
  out.setHeader = (k, v) => { out.headers[k] = v; };
  out.status = c => { out.statusCode = c; return out; };
  out.json = b => { out.body = b; return out; };
  out.end = () => { out.ended = true; return out; };
  return out;
}
async function call(req) {
  const res = mockRes();
  await handler(req, res);
  return res;
}

let geminiText = null;
let geminiCalled = 0;
let geminiShouldFail = false;
let lastGeminiBody = null;

global.fetch = async (url, opts) => {
  geminiCalled++;
  lastGeminiBody = JSON.parse(opts.body);
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

const GOOD_REPLY =
  'To report a problem: <br><ul>' +
  '<li>Open <a href="#" onclick="go(\'submit.html\');return false;">Report a Problem →</a></li>' +
  '<li>Fill <b>title, description, state, district</b></li></ul>';

(async () => {
  let pass = 0, fail = 0;
  const t = async (name, fn) => {
    try { await fn(); pass++; console.log('PASS  ' + name); }
    catch (e) { fail++; console.log('FAIL  ' + name + ' :: ' + e.message); }
  };

  await t('CORS + OPTIONS preflight, no Gemini call', async () => {
    const r = await call({ method: 'OPTIONS' });
    assert.equal(r.statusCode, 200);
    assert.equal(r.headers['Access-Control-Allow-Origin'], '*');
    assert.equal(r.ended, true);
    assert.equal(geminiCalled, 0);
  });

  await t('405 for GET', async () => {
    assert.equal((await call({ method: 'GET' })).statusCode, 405);
  });

  await t('400 when message missing/blank', async () => {
    assert.equal((await call({ method: 'POST', body: {} })).statusCode, 400);
    assert.equal((await call({ method: 'POST', body: { message: '   ' } })).statusCode, 400);
  });

  await t('knowledge prompt sent as systemInstruction (Sahayak + KUEST-L + go-links)', async () => {
    geminiText = GOOD_REPLY;
    const r = await call({ method: 'POST', body: { message: 'how do I report a problem?' } });
    assert.equal(r.statusCode, 200);
    const si = lastGeminiBody.systemInstruction.parts[0].text;
    assert.ok(si.includes('Sahayak'), 'persona present');
    assert.ok(si.includes('Team KUEST-L'), 'maker info present');
    assert.ok(si.includes("go('submit.html')"), 'navigation knowledge present');
    assert.ok(si.includes('Smart India Hackathon'), 'origin info present');
  });

  await t('history shaped into Gemini turns, newest message last', async () => {
    geminiText = GOOD_REPLY;
    await call({
      method: 'POST',
      body: {
        message: 'and organizations?',
        history: [
          { role: 'user', text: 'hi' },
          { role: 'model', text: 'Namaste!' },
          { role: 'junk', text: 'dropped' },
          { role: 'user', text: '' }
        ]
      }
    });
    const c = lastGeminiBody.contents;
    assert.equal(c.length, 3, 'junk/empty turns dropped, user msg appended');
    assert.equal(c[0].role, 'user');
    assert.equal(c[1].role, 'model');
    assert.equal(c[2].role, 'user');
    assert.equal(c[2].parts[0].text, 'and organizations?');
  });

  await t('history capped at last 12 turns', async () => {
    geminiText = GOOD_REPLY;
    const big = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? 'model' : 'user', text: 't' + i }));
    await call({ method: 'POST', body: { message: 'go on', history: big } });
    assert.ok(lastGeminiBody.contents.length <= 13, '12 turns + current message');
  });

  await t('reply sanitization: script/img stripped, foreign onclick dropped', async () => {
    geminiText = 'Hi <script>alert(1)</script><img src=x onerror=alert(2)>' +
      '<a href="#" onclick="steal()">bad</a>' +
      '<a href="#" onclick="go(\'explore.html\');return false;">good →</a>';
    const r = await call({ method: 'POST', body: { message: 'x' } });
    const out = r.body.reply;
    assert.ok(!out.includes('script') && !out.includes('alert'), 'scripts stripped');
    assert.ok(!out.includes('img') && !out.includes('onerror'), 'img stripped');
    assert.ok(!out.includes('steal'), 'foreign onclick link dropped');
    assert.ok(out.includes('go(\'explore.html\')'), 'own go() link kept');
  });

  await t('Gemini failure → 200 with friendly FALLBACK_REPLY', async () => {
    geminiShouldFail = true;
    const r = await call({ method: 'POST', body: { message: 'hello' } });
    geminiShouldFail = false;
    assert.equal(r.statusCode, 200);
    assert.ok(r.body.reply.includes('trouble reaching'), 'friendly fallback');
    assert.ok(r.body.reply.includes('go(\'explore.html\')'), 'fallback carries links');
    assert.equal(r.body.reason, 'unavailable');
  });

  await t('empty Gemini reply → fallback', async () => {
    geminiText = '   ';
    const r = await call({ method: 'POST', body: { message: 'hello' } });
    assert.ok(r.body.reply.includes('trouble reaching'));
  });

  await t('missing key → fallback without calling Gemini', async () => {
    const before = geminiCalled;
    delete process.env.kuestl_gemini_key;
    const r = await call({ method: 'POST', body: { message: 'hello' } });
    process.env.kuestl_gemini_key = 'test-key-dummy';
    assert.equal(r.statusCode, 200);
    assert.equal(r.body.reason, 'not-configured');
    assert.equal(geminiCalled, before);
  });

  await t('offline-input guards: oversized message clamped to 1000 chars', async () => {
    geminiText = GOOD_REPLY;
    await call({ method: 'POST', body: { message: 'a'.repeat(5000) } });
    assert.equal(lastGeminiBody.contents.at(-1).parts[0].text.length, 1000);
  });

  /* ---- chat-brain.js live-mode flip (static checks) ---- */
  const brain = fs.readFileSync('client/js/chat-brain.js', 'utf8');
  await t('chat-brain: mode is api, contract { message, history } → { reply }', () => {
    assert.ok(/mode\s*:\s*'api'/.test(brain), 'live mode on');
    assert.ok(brain.includes("JSON.stringify({ message, history })"), 'request contract');
    assert.ok(brain.includes('window.placeholderReply(message)'), 'offline fallback brain kept');
    assert.ok(brain.includes("return data.reply"), 'reply contract');
  });
  await t('both surfaces share the same brain', () => {
    const page = fs.readFileSync('client/chatbot.html', 'utf8');
    const widget = fs.readFileSync('client/js/chat-widget.js', 'utf8');
    assert.ok(page.includes('chat-brain.js') && page.includes('aiReply('), 'page uses shared aiReply');
    assert.ok(widget.includes('chat-brain.js') && widget.includes('aiReply('), 'widget uses shared aiReply');
  });

  console.log('\nRESULT: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });