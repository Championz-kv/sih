/* _chk-phone-fix.js — regression probe for the profiles_phone_key fix.
   Drives org-profile.html's saveOrgProfile through every phone failure mode
   with an error-injecting fake Supabase client (no network, no browser). */
'use strict';
const fs = require('fs');
const h = fs.readFileSync('client/org-profile.html', 'utf8');
const blocks = h.match(/<script>([\s\S]*?)<\/script>/g);
const src = blocks.map(s => s.replace(/<\/?script>/g, '')).join('\n') +
  '\n__expose({ saveOrgProfile });';
const FALLBACK_DATA = JSON.parse(
  fs.readFileSync('client/js/india-districts-fallback.js', 'utf8')
    .match(/=\s*(\[[\s\S]*\])\s*;?\s*$/)[1]);
let pass = 0, fail = 0;
const ok = (cond, name) => { if (cond) { pass++; console.log('PASS ' + name); } else { fail++; console.log('FAIL ' + name); } };

const ROW = {
  id: 'u1', username: 'mmmut', full_name: 'Madan Mohan Malaviya University of Technology', role: 'org_member',
  org_type: 'uni', about: 'A public technical university.', state: 'Uttar Pradesh', district: 'Gorakhpur',
  phone: '+91 551 2270000', email: 'contact@mmmut.ac.in', address: 'Deoria Road, Gorakhpur, UP',
  link_other: '', expertise: 'Civil & Structural Engineering', resources: '', preferences: '',
  funding_verified: 0, funding_awaited: 0
};
const PHONE_DUP = { code: '23505', message: 'duplicate key value violates unique constraint "profiles_phone_key"' };

/* --- DOM fakes (mirrors _test-org.js) --- */
function makeChip(label){
  const set = new Set();
  return { textContent: label, classes: set, style: {},
    classList: {
      add: c => set.add(c), remove: c => set.delete(c),
      toggle: (c, force) => { const on = force === undefined ? !set.has(c) : force; on ? set.add(c) : set.delete(c); return on; },
      contains: c => set.has(c)
    },
    closest(){ return this; }, _listeners: {},
    addEventListener(t, cb){ this._listeners[t] = cb; } };
}
function parseChips(html, id){
  const m = html.match(new RegExp('id="' + id + '"([\\s\\S]*?)</div>'));
  const labels = [...m[1].matchAll(/chip-opt[^>]*>([^<]+)</g)].map(x => x[1].trim());
  return labels.map(makeChip);
}
function makeContainer(id, chips){
  const el = { id, children: chips || [], style: {}, classes: new Set([id]), _listeners: {},
    textContent: '', readOnly: false, value: '', dataset: {}, options: [], disabled: true,
    addEventListener(t, cb){ this._listeners[t] = cb; },
    insertAdjacentHTML(){}, appendChild(opt){ this.options.push(opt); },
    querySelector(){ return null; }, querySelectorAll(){ return []; } };
  Object.defineProperty(el, 'innerHTML', {
    get(){ return this._innerHTML || ''; },
    set(v){
      this._innerHTML = v;
      const opts = [...String(v).matchAll(/<option([^>]*)>([^<]*)<\/option>/g)];
      if(opts.length){
        this.options = opts.map(m => ({
          value: (m[1].match(/value="([^"]*)"/) || [])[1] || '', textContent: m[2]
        }));
        if(this.options.length) this.value = this.options[0].value;
      }
      if(v === '') this.children.length = 0;
    }
  });
  Object.defineProperty(el, 'lastElementChild', { get(){ return this.children[this.children.length - 1]; } });
  return el;
}
function makeDoc(chips){
  const els = {};
  const doc = {
    _els: els, title: '', _ls: {},
    getElementById(id){
      if(els[id]) return els[id];
      const el = makeContainer(id, chips[id] || []);
      els[id] = el;
      return el;
    },
    createElement(){ return { value: '', textContent: '' }; },
    querySelectorAll(sel){
      const m = sel.match(/^#(\w+)\s+((?:\.[\w-]+)+)$/);
      if(!m) return [];
      const c = els[m[1]];
      if(!c) return [];
      const classes = m[2].split('.').filter(Boolean);
      return (c.children || []).filter(ch => classes.every(k => ch.classes && ch.classes.has(k)));
    },
    querySelector(){ return null; },
    addEventListener(t, cb){ (this._ls[t] = this._ls[t] || []).push(cb); },
    fire(t, ev){ return Promise.all((this._ls[t] || []).map(cb => Promise.resolve(cb(ev)))); }
  };
  return doc;
}
/* Fake Supabase — every .from() gets a fresh builder; update/upsert chains are
   counted per kind so error injection can target only the FIRST attempt. */
function makeSb(opts){
  const calls = { updates: [], upserts: [] };
  let updN = 0, upsN = 0;
  function builder(){
    const b = {};
    let kind = 'load';
    b.update = pl => { calls.updates.push(pl); kind = 'update'; return b; };
    b.upsert = pl => { calls.upserts.push(pl); kind = 'upsert'; return b; };
    b.select = () => b;
    b.eq = () => b;
    b.maybeSingle = async () => ({ data: opts.row || null, error: null });
    b.then = async res => {
      if(kind === 'update'){
        updN++;
        res({ data: (opts.rowMissing && updN === 1) ? [] : [{ id: 'u1' }],
              error: (updN === 1 && opts.updErr) || null });
      }else if(kind === 'upsert'){
        upsN++;
        res({ data: null, error: (upsN === 1 && opts.insErr) || null });
      }else{
        res({ data: opts.row || null, error: null });
      }
    };
    return b;
  }
  return { calls, client: { from: () => builder(),
    auth: { getSession: async () => ({ data: { session: SESSION } }) } } };
}
const SESSION = { user: { id: 'u1', email: 'contact@mmmut.ac.in', user_metadata: { full_name: 'MMMET', role: 'org_member' } } };
const HELPERS = `
  const getSessionProfile = () => __cached;
  const saveSessionProfile = p => { __saved = p; };
  const applyRoleUI = () => {}; const currentRole = () => 'org_member';
  const go = u => __gos.push(u); const toast = m => __toasts.push(m);
  const initials = n => (n || '').slice(0, 2).toUpperCase();
  const avatarColor = () => '#bbb'; const inr = v => '₹' + v;
  const FUND_REQUESTS = []; const PROBLEMS = []; const ORGS = [];
  const renderShell = () => {};
`;
async function run(opts){
  const chips = { expChips: parseChips(h, 'expChips'), resChips: parseChips(h, 'resChips'), prefChips: parseChips(h, 'prefChips') };
  const doc = makeDoc(chips);
  ['expChips', 'resChips', 'prefChips'].forEach(id => doc.getElementById(id));
  doc.addEventListener('click', (e) => {
    const chip = e.target && e.target.closest ? e.target.closest('.chip-opt') : null;
    if(chip) chip.classList.toggle('sel');
  });
  const store = {};
  if(opts.cached) store.ss_profile = JSON.stringify(opts.cached);
  const gos = [], toasts = [];
  const sb = makeSb(opts);
  const win = { location: { search: '' }, addEventListener() {}, open() {}, INDIA_DISTRICTS_FALLBACK: FALLBACK_DATA };
  const fn = new Function('document', 'window', 'location', 'sbClient', 'sessionStorage', 'localStorage', 'navigator', 'history',
    '__cached', '__savedSetter', '__gos', '__toasts', '__expose',
    HELPERS + '\nlet __saved = null;\n' + src);
  const api = {};
  await fn(doc, win, { search: '', pathname: 'org-profile.html' }, sb.client,
    { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; }, removeItem: k => { delete store[k]; } },
    { getItem: () => null, setItem() {}, removeItem() {} }, { userAgent: 'node' }, { replaceState() {} },
    opts.cached || null, () => {}, gos, toasts, fns => Object.assign(api, fns));
  await doc.fire('DOMContentLoaded');
  await new Promise(r => setTimeout(r, 50));
  return { doc, calls: sb.calls, store, gos, toasts, api };
}
async function saveWith(r, phone){
  r.doc._els.oName.value = 'Test Org';
  if(phone !== undefined) r.doc._els.oPhone.value = phone;
  await r.api.saveOrgProfile();
}
(async () => {
  const PHONE_TAKEN_MSG = 'already linked to another account';

  /* 1 — prefilled phone round-trips unchanged */
  const r1 = await run({ row: ROW });
  await saveWith(r1, ROW.phone);
  ok(r1.calls.updates.length === 1, '1. one update when everything is fine');
  ok(r1.calls.updates[0].phone === ROW.phone, '1. prefilled phone saved as-is');
  ok(r1.toasts.includes('Profile saved successfully'), '1. success toast');

  /* 2 — THE BUG: blank phone must be stored as NULL, not '' */
  const r2 = await run({ row: ROW });
  await saveWith(r2, '');
  ok(r2.calls.updates.length === 1 && r2.calls.updates[0].phone === null, '2. blank phone -> NULL (was "" and hit profiles_phone_key)');

  /* 3 — phone owned by another account -> retry WITHOUT phone, rest saves */
  const r3 = await run({ row: ROW, updErr: PHONE_DUP });
  await saveWith(r3, '+91 9999999999');
  ok(r3.calls.updates.length === 2, '3. retried once after phone-dup error');
  ok(r3.calls.updates[0].phone === '+91 9999999999', '3. first attempt carried the phone');
  ok(!('phone' in r3.calls.updates[1]), '3. retry drops the phone key entirely');
  ok(r3.calls.updates[1].full_name === 'Test Org' && r3.calls.updates[1].expertise !== undefined, '3. retry keeps every other field');
  ok(r3.toasts.some(t => t.includes(PHONE_TAKEN_MSG)), '3. clear "already linked" toast instead of raw DB error');

  /* 4 — a NON-phone error must NOT trigger the retry */
  const r4 = await run({ row: ROW, updErr: { message: 'row-level security blocked' } });
  await saveWith(r4, '+91 8888888888');
  ok(r4.calls.updates.length === 1, '4. no retry for unrelated errors');
  ok(r4.toasts.some(t => t.startsWith('Failed to save — row-level security blocked')), '4. real errors still surfaced verbatim');

  /* 5 — row missing + dup phone on the create-upsert -> recovered */
  const r5 = await run({ row: ROW, rowMissing: true, insErr: PHONE_DUP });
  await saveWith(r5, '+91 7777777777');
  ok(r5.calls.upserts.length === 1, '5. create-fallback ran once (update came back empty)');
  ok(r5.calls.upserts[0].phone === '+91 7777777777' && r5.calls.upserts[0].id === 'u1', '5. create attempt carried id + phone');
  ok(r5.calls.updates.length === 2 && !('phone' in r5.calls.updates[1]), '5. recovered via update without phone');
  ok(r5.toasts.some(t => t.includes(PHONE_TAKEN_MSG)), '5. phone-taken toast on the create path too');

  /* 6 — citizen-profile.html got the same treatment (static checks) */
  const cp = fs.readFileSync('client/citizen-profile.html', 'utf8');
  ok(cp.includes("phone: document.getElementById('cPhone').value.trim() || null"), '6. citizen: blank phone -> NULL');
  ok(cp.includes('isPhoneDupError') && /withoutPhone/.test(cp), '6. citizen: detects dup-phone and retries without it');

  console.log('\nRESULT: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });