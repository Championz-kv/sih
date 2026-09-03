/* Headless test for org-profile.html — dropdowns, chip delegation, save */
const fs = require('fs');
const h = fs.readFileSync('client/org-profile.html', 'utf8');
const FALLBACK = fs.readFileSync('client/js/india-districts-fallback.js', 'utf8');
const blocks = h.match(/<script>([\s\S]*?)<\/script>/g);
const src = blocks.map(s => s.replace(/<\/?script>/g, '')).join('\n') +
  '\n__expose({ saveOrgProfile, applyOrgProfileToForm, loadOrgProfile, applyOrgLocation, fillOrgDistricts });';
const FALLBACK_DATA = JSON.parse(
  fs.readFileSync('client/js/india-districts-fallback.js', 'utf8')
    .match(/=\s*(\[[\s\S]*\])\s*;?\s*$/)[1]);
let pass = 0, fail = 0;
const ok = (cond, name) => { if (cond) { pass++; console.log('PASS ' + name); } else { fail++; console.log('FAIL ' + name); } };

const ROW = {
  id: 'u1', username: 'mmmut', full_name: 'Madan Mohan Malaviya University of Technology', role: 'org_member',
  org_type: 'uni', about: 'A public technical university.', state: 'Uttar Pradesh', district: 'Gorakhpur',
  phone: '+91 551 2270000', email: 'contact@mmmut.ac.in', address: 'Deoria Road, Gorakhpur, UP',
  link_other: 'https://mmmut.ac.in\nhttps://alumni.mmmut.ac.in',
  expertise: 'Civil & Structural Engineering, IT / Computer Science & AI',
  resources: 'Research Laboratories', preferences: '',
  funding_verified: 5000, funding_awaited: 1200
};

function makeChip(label){
  const set = new Set(['chip-opt']);
  return { textContent: label, classes: set, style: {},
    classList: {
      add: c => set.add(c),
      remove: c => set.delete(c),
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
    insertAdjacentHTML(pos, html){
      const input = { classes: new Set(['input', 'link-input']), value: '', style: {}, dataset: {},
        classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } } };
      this._doc._inputs.push(input);
      this.children.push({ querySelector(){ return input; } });
    },
    appendChild(opt){ this.options.push(opt); },
    querySelector(){ return null; },
    querySelectorAll(){ return []; } };
  Object.defineProperty(el, 'innerHTML', {
    get(){ return this._innerHTML || ''; },
    set(v){
      this._innerHTML = v;
      /* Real <select>: assigning innerHTML rebuilds options and resets
         value to the first option (the placeholder). The page relies on
         this for both populateOrgStates and fillOrgDistricts, so emulate
         it here. Non-select containers get no options/value side effects. */
      const opts = [...String(v).matchAll(/<option([^>]*)>([^<]*)<\/option>/g)];
      if(opts.length){
        this.options = opts.map(m => ({
          value: (m[1].match(/value="([^"]*)"/) || [])[1] || '',
          textContent: m[2]
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
    _inputs: [],
    _els: els,
    title: '',
    _ls: {},
    getElementById(id){
      if(els[id]) return els[id];
      const el = makeContainer(id, chips[id] || []);
      el._doc = doc;
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
      if(classes.length === 1 && classes[0] === 'link-input') return doc._inputs.slice();
      return (c.children || []).filter(ch => classes.every(k => ch.classes && ch.classes.has(k)));
    },
    querySelector(){ return null; },
    addEventListener(t, cb){ (this._ls[t] = this._ls[t] || []).push(cb); },
    fire(t, ev){ return Promise.all((this._ls[t] || []).map(cb => Promise.resolve(cb(ev)))); }
  };
  return doc;
}
function makeSb(row, calls){
  const b = {};
  b.update = pl => { calls.updatePayload = pl; return b; };
  b.upsert = pl => { calls.upsertPayload = pl; return b; };
  b.select = () => b;
  b.eq = () => b;
  b.maybeSingle = async () => ({ data: row, error: null });
  b.then = res => {
    if(calls.updatePayload != null) res({ data: [{ id: 'u1' }], error: null });
    else if(calls.upsertPayload != null) res({ data: null, error: null });
    else res({ data: row || null, error: null });
  };
  return { from: () => b, auth: { getSession: async () => ({ data: { session: SESSION } }) } };
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
  /* the three chip sections exist in the page's static HTML — pre-create */
  ['expChips', 'resChips', 'prefChips'].forEach(id => doc.getElementById(id));

  /* Emulate js/app.js's generic chip toggle — in the real browser app.js is
     loaded BEFORE this page's inline scripts and is the single site-wide
     owner of .chip-opt clicks. Registering the same handler here (first, in
     load order) lets the harness catch a double-toggle regression: if the
     page ALSO wired its own document listener, two handlers would toggle
     .sel twice per click and chips would never appear selected. */
  doc.addEventListener('click', (e) => {
    const chip = e.target && e.target.closest ? e.target.closest('.chip-opt') : null;
    if(chip) chip.classList.toggle('sel');
  });

  const calls = {};
  const store = {};
  if(opts.cached) store.ss_profile = JSON.stringify(opts.cached);
  const gos = [], toasts = [];
  const sb = makeSb(opts.row === undefined ? ROW : opts.row, calls);
  const win = { location: { search: '' }, addEventListener() {}, open() {}, INDIA_DISTRICTS_FALLBACK: FALLBACK_DATA };
  const fn = new Function('document', 'window', 'location', 'sbClient', 'sessionStorage', 'localStorage', 'navigator', 'history',
    '__cached', '__savedSetter', '__gos', '__toasts', '__expose',
    HELPERS + '\nlet __saved = null;\n' + src);
  const api = {};
  await fn(doc, win, { search: '', pathname: 'org-profile.html' }, sb,
    { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; }, removeItem: k => { delete store[k]; } },
    { getItem: () => null, setItem() {}, removeItem() {} }, { userAgent: 'node' }, { replaceState() {} },
    opts.cached || null, () => {}, gos, toasts, fns => Object.assign(api, fns));
  await doc.fire('DOMContentLoaded');
  await new Promise(r => setTimeout(r, 50));
  return { doc, calls, store, gos, toasts, inputs: doc._inputs, api };
}
(async () => {
  const selTxt = (doc, id) => doc._els[id].children.filter(c => c.classes.has('sel')).map(c => c.textContent);

  /* A — load from DB row */
  const r1 = await run({ row: ROW, cached: null });
  console.log('  [debug] FALLBACK_DATA.states =', FALLBACK_DATA.length,
    '| oState.options =', r1.doc._els.oState.options.length,
    '| oDist.options =', r1.doc._els.oDist.options.length,
    '| oState[1] =', JSON.stringify(r1.doc._els.oState.options[1] && r1.doc._els.oState.options[1].value));
  ok(r1.doc._els.oName.value === ROW.full_name, 'org name prefilled');
  ok(r1.doc._els.oType.value === 'uni', 'org_type select set');
  ok(r1.doc._els.oState.options.length === 35 + 1 && r1.doc._els.oState.options[1].value === 'Andhra Pradesh', 'state dropdown populated from fallback dataset');
  ok(r1.doc._els.oState.value === 'Uttar Pradesh', 'saved state selected');
  ok(r1.doc._els.oDist.disabled === false, 'district dropdown enabled after state');
  ok(r1.doc._els.oDist.options.length === 75 + 1 && r1.doc._els.oDist.options.some(o => o.value === 'Gorakhpur') && r1.doc._els.oDist.options.some(o => o.value === 'Varanasi'), 'district options from state dataset');
  ok(r1.doc._els.oDist.value === 'Gorakhpur', 'saved district selected');
  ok(r1.doc._els.oDistrict === undefined, 'old district text input gone');
  ok(r1.doc._els.oPhone.value === ROW.phone && r1.doc._els.oEmail.value === ROW.email, 'phone/email prefilled');
  ok(r1.doc._els.oAbout.value === ROW.about && r1.doc._els.oAddress.value === ROW.address, 'about/address prefilled');
  ok(JSON.stringify(selTxt(r1.doc, 'expChips')) === JSON.stringify(['Civil & Structural Engineering', 'IT / Computer Science & AI']), 'expertise chips from CSV');
  ok(JSON.stringify(selTxt(r1.doc, 'resChips')) === JSON.stringify(['Research Laboratories']), 'resources chips from CSV');
  ok(selTxt(r1.doc, 'prefChips').length === 0, 'empty preferences -> nothing selected');
  ok(r1.inputs.length === 2 && r1.inputs[0].value === 'https://mmmut.ac.in' && r1.inputs[1].value === 'https://alumni.mmmut.ac.in', 'link rows from link_other');
  ok(r1.doc._els.orgFunding.innerHTML.indexOf('₹5000') >= 0 && r1.doc._els.orgFunding.innerHTML.indexOf('₹1200') >= 0, 'funding card from profile columns');
  ok(r1.doc._els.orgDonorBadge.textContent === 'Yes ✓', 'donor badge derived from funding_verified');

  /* B — chip delegation on document + state change + save */
  const renew = r1.doc._els.expChips.children.find(c => c.textContent === 'Renewable Energy & Clean Technology');
  await r1.doc.fire('click', { target: { closest: () => renew } });
  const labs = r1.doc._els.resChips.children.find(c => c.textContent === 'Research Laboratories');
  await r1.doc.fire('click', { target: { closest: () => labs } });
  /* A click outside every chip section — closest() must return null so the
     delegated listener skips it (mirrors a real browser's .closest). */
  const outside = makeChip('Not a chip');
  await r1.doc.fire('click', { target: { closest: () => null } });
  ok(renew.classes.has('sel') && !labs.classes.has('sel') && !outside.classes.has('sel'), 'document-delegated chip clicks toggle selection');
  r1.doc._els.oState.value = 'Jharkhand';
  await r1.doc._els.oState._listeners.change();
  ok(r1.doc._els.oDist.options.length === 24 + 1 && r1.doc._els.oDist.options.some(o => o.value === 'Ranchi') && r1.doc._els.oDist.options.every(o => o.value !== 'Gorakhpur'), 'district list rebuilds on state change');
  ok(r1.doc._els.oDist.value === '' && r1.doc._els.oDist.disabled === false, 'district reset when state changes');
  r1.doc._els.oDist.value = 'Ranchi';
  await r1.api.saveOrgProfile();
  const pl = r1.calls.updatePayload;
  ok(pl && pl.expertise === 'Civil & Structural Engineering, IT / Computer Science & AI, Renewable Energy & Clean Technology', 'save joins selected chips into CSV');
  ok(pl.resources === '', 'deselected chip removed from CSV');
  ok(pl.org_type === 'uni' && pl.full_name === ROW.full_name, 'save payload fields');
  ok(pl.state === 'Jharkhand' && pl.district === 'Ranchi', 'save reads state/district from the two dropdowns');
  ok(pl.link_other === 'https://mmmut.ac.in\nhttps://alumni.mmmut.ac.in', 'save collects link rows');
  ok(r1.toasts.indexOf('Profile saved successfully') >= 0, 'save success toast');
  ok(JSON.parse(r1.store.ss_profile || '{}').expertise === pl.expertise, 'ss_profile cache updated after save');
  /* C — round-trip through apply */
  r1.api.applyOrgProfileToForm(pl, SESSION.user);
  ok(r1.doc._els.oState.value === 'Jharkhand' && r1.doc._els.oDist.value === 'Ranchi' && r1.doc._els.oDist.disabled === false, 'round-trip restores state+district dropdowns');
  ok(JSON.stringify(selTxt(r1.doc, 'expChips')) === JSON.stringify(['Civil & Structural Engineering', 'IT / Computer Science & AI', 'Renewable Energy & Clean Technology']), 'round-trip restores chips');
  ok(JSON.stringify(selTxt(r1.doc, 'resChips')) === '[]', 'round-trip clears deselected chips');

  /* D — no row yet -> upsert create with auth fallbacks */
  const r3 = await run({ row: null, cached: null });
  ok(r3.calls.upsertPayload && r3.calls.upsertPayload.role === 'org_member' && r3.calls.upsertPayload.id === 'u1', 'missing row auto-created');
  ok(r3.doc._els.oName.value === 'MMMET', 'name falls back to auth metadata, not demo data');
  ok(r3.doc._els.oState.value === '' && r3.doc._els.oDist.disabled === true, 'empty profile leaves selects on placeholders');

  /* E — no session -> redirect to login */
  const gos2 = [];
  {
    const chips = { expChips: parseChips(h, 'expChips'), resChips: parseChips(h, 'resChips'), prefChips: parseChips(h, 'prefChips') };
    const doc = makeDoc(chips);
    const sb = { from(){ throw new Error('should not query'); }, auth: { getSession: async () => ({ data: { session: null } }) } };
    const fn = new Function('document', 'window', 'location', 'sbClient', 'sessionStorage', 'localStorage', 'navigator', 'history', '__cached', '__savedSetter', '__gos', '__toasts', '__expose',
      HELPERS + '\nlet __saved = null;\n' + src);
    await fn(doc, { location: { search: '' }, addEventListener() {}, INDIA_DISTRICTS_FALLBACK: FALLBACK_DATA }, { search: '' }, sb,
      { getItem: () => null, setItem() {}, removeItem() {} }, { getItem: () => null, setItem() {} }, { userAgent: 'node' }, { replaceState() {} }, null, () => {}, gos2, [], () => {});
    await doc.fire('DOMContentLoaded');
    await new Promise(r => setTimeout(r, 30));
  }
  ok(gos2.indexOf('login.html') >= 0, 'no session redirects to login');

  /* F — static: no demo leftovers + verification tiles on both pages */
  ok(h.indexOf('MMMUT') < 0 && h.indexOf('setDonorBadge') < 0 && h.indexOf('oDistrict') < 0, 'no hardcoded demo values / stale ids remain');
  ok(h.indexOf('Verified organizations can create and work on projects and appear first in results.') >= 0, 'org verification tile text updated');
  const ch = fs.readFileSync('client/citizen-profile.html', 'utf8');
  ok(ch.indexOf('Verified citizen account can post problems. Documents supported are Aadhar, PAN, Voter ID or any govt authorized national IDs.') >= 0 && ch.indexOf('Submit documents') >= 0, 'citizen verification tile added');

  console.log('RESULT ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
