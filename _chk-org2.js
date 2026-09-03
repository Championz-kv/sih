/* Headless verification harness for org-profile.html (part 1: stubs) */
let sessionUser = null;          // null => no session
let dbRow = null;                // profiles row returned by selects
const updateCalls = [], upsertCalls = [], toasts = [], navs = [];
const store = {};
const listeners = {};            // element listeners
const docListeners = {};         // document listeners

function El(tag) {
  const el = {
    tagName: (tag || 'div').toUpperCase(), children: [], options: [], id: '',
    value: '', textContent: '', disabled: false, _class: new Set(), _html: '',
    style: {}, readOnly: false, placeholder: '', lastElementChild: null,
    classList: {
      add(...c) { c.forEach(x => el._class.add(x)); },
      remove(...c) { c.forEach(x => el._class.delete(x)); },
      toggle(c, force) { const on = force === undefined ? !el._class.has(c) : !!force; if (on) el._class.add(c); else el._class.delete(c); return on; },
      contains(c) { return el._class.has(c); }
    },
    addEventListener(ev, fn) { (listeners[ev + '::' + el.id] = listeners[ev + '::' + el.id] || []).push(fn); },
    appendChild(c) { el.children.push(c); if (c.tagName === 'OPTION') el.options.push(c); return c; },
    insertAdjacentHTML(pos, html) {
      const row = { querySelector: () => ({ value: '' }) };
      el.children.push(row); el.lastElementChild = row;
      return row;
    },
    querySelector() { return { value: '' }; },
    closest() { return null; }
  };
  Object.defineProperty(el, 'innerHTML', {
    get() { return el._html; },
    set(v) {
      el._html = v; el.children = []; el.options = [];
      if (el.tagName === 'SELECT' && v) {
        [...String(v).matchAll(/<option([^>]*)>([^<]*)<\/option>/g)].forEach(m => {
          const val = (m[1].match(/value="([^"]*)"/) || [])[1] || '';
          el.options.push({ value: val, textContent: m[2] });
        });
      }
    }
  });
  return el;
}

const ids = {};
['oName','oType','oAbout','oState','oDist','oPhone','oEmail','oAddress',
 'orgLinkRows','orgSaveBtn','orgDonorBadge','orgFunding','expChips','resChips','prefChips']
  .forEach(id => {
    const el = El(/^(oState|oDist|oType)$/.test(id) ? 'select' : 'div');
    el.id = id; ids[id] = el;
  });
[['expChips', ['Civil & Structural Engineering', 'IT / Computer Science & AI', 'Law & Public Policy', 'Public Health & Medicine']],
 ['resChips', ['Student Teams', 'Funding / Grants', 'Research Laboratories']],
 ['prefChips', ['Research & Publication', 'Pilot Program Deployment']]]
 .forEach(([cid, chips]) => {
   chips.forEach(t => {
     const chip = El('span');
     chip.chipText = t; chip.textContent = t; chip.closest = () => chip;
     ids[cid].children.push(chip);
   });
 });

function chipChildren(id, selClass) {
  return ids[id].children.filter(c => c.chipText && (!selClass || c._class.has(selClass)));
}
function docSelectAll(sel) {
  if (/#orgLinkRows/.test(sel)) return [{ value: 'https://org.ac.in' }];
  const m = sel.match(/#(\w+)\.chip-opt(\.sel)?$/);
  if (m) return chipChildren(m[1], m[2] ? 'sel' : null);
  return [];
}

const document = {
  getElementById: id => ids[id] || null,
  querySelectorAll: docSelectAll,
  querySelector: () => null,
  createElement: t => El(t),
  title: '',
  addEventListener(ev, fn) { (docListeners[ev] = docListeners[ev] || []).push(fn); }
};
const fs0 = require('fs');
const INDIA = (new Function('window',
  'var fs=require("fs");window.INDIA_DISTRICTS_FALLBACK=null;' +
  'eval(fs.readFileSync("client/js/india-districts-fallback.js","utf8"));' +
  'return window.INDIA_DISTRICTS_FALLBACK;'))({});
const window = { INDIA_DISTRICTS_FALLBACK: INDIA };
const sessionStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; }
};
const sbClient = {
  auth: { getSession: async () => ({ data: { session: sessionUser ? { user: sessionUser } : null } }) },
  from() {
    return {
      select() {
        return { eq() { return { maybeSingle: async () => ({ data: dbRow, error: null }) }; } };
      },
      update(payload) {
        updateCalls.push(payload);
        return { eq() { return { select() { return Promise.resolve({ data: dbRow ? [{ id: sessionUser.id }] : [], error: null }); } }; } };
      },
      upsert(payload) { upsertCalls.push(payload); dbRow = payload; return Promise.resolve({ data: null, error: null }); }
    };
  }
};
function toast(m) { toasts.push(m); }
function go(p) { navs.push(p); }
function getSessionProfile() { try { return JSON.parse(store['ss_profile'] || 'null'); } catch (e) { return null; } }
function saveSessionProfile(p) { store['ss_profile'] = JSON.stringify(p); }
function currentRole() { return 'org_member'; }
function applyRoleUI() {}
function renderShell() {}
function inr(n) { return '₹' + (n || 0); }
const FUND_REQUESTS = [];

/* ---- syntax-check + execute every inline <script> block ---- */
const fs = require('fs');
const vm = require('vm');
const html = fs.readFileSync('client/org-profile.html', 'utf8');
const blocks = html.match(/<script>([\s\S]*?)<\/script>/g) || [];
let pass = 0, fail = 0;
const T = (name, cond) => { if (cond) { pass++; console.log('  ok  ' + name); } else { fail++; console.log('FAIL  ' + name); } };

console.log('--- syntax + exec ---');
const sandbox = { window, document, sessionStorage, sbClient, toast, go, getSessionProfile, saveSessionProfile,
  currentRole, applyRoleUI, renderShell, inr, FUND_REQUESTS, console, setTimeout, Promise };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
blocks.forEach((b, i) => {
  const code = b.replace(/^<script>/, '').replace(/<\/script>$/, '');
  try {
    new Function(code);
    vm.runInContext(code, sandbox, { filename: 'org-block' + i });
    console.log('  ok  block ' + i + ' parses + runs');
    pass++;
  } catch (e) { fail++; console.log('FAIL  block ' + i + ': ' + e.message); }
});

console.log('--- dropdowns ---');
T('states populated from INDIA_DISTRICTS_FALLBACK (' + INDIA.length + ' states)', ids.oState.options.length === 1 + INDIA.length);
T('state list has Andhra Pradesh', ids.oState.options.some(o => o.value === 'Andhra Pradesh'));
T('state list has Uttar Pradesh', ids.oState.options.some(o => o.value === 'Uttar Pradesh'));
T('district dropdown starts disabled + only placeholder', ids.oDist.disabled === true && ids.oDist.options.length === 1);
const chg = listeners['change::oState'] || [];
T('oState change listener wired', chg.length === 1);
ids.oState.value = 'Jharkhand';
chg.forEach(f => f());
T('Jharkhand → districts populated (' + (ids.oDist.options.length - 1) + ')', ids.oDist.options.length > 1);
T('Jharkhand → district dropdown enabled', ids.oDist.disabled === false);
T('district list has Ranchi', ids.oDist.options.some(o => o.value === 'Ranchi'));
(async () => {
  /* ---- Scenario A: DB row prefill via loadOrgProfile ---- */
  console.log('--- prefill from DB ---');
  sessionUser = { id: 'u-org-1', email: 'info@mmmut.ac.in', user_metadata: { role: 'org_member', full_name: 'MMMUT Gorakhpur' } };
  dbRow = { id: 'u-org-1', username: 'mmmut', full_name: 'MMMUT Gorakhpur', email: 'info@mmmut.ac.in',
    phone: '+91 551 234 5678', about: 'State university', address: 'Gorakhpur',
    link_other: 'https://mmmut.ac.in\nhttps://alumni.mmmut.ac.in',
    role: 'org_member', org_type: 'uni', expertise: 'IT / Computer Science & AI, Law & Public Policy',
    resources: 'Funding / Grants', preferences: 'Research & Publication',
    state: 'Bihar', district: 'Patna', funding_verified: 50000, funding_awaited: 0 };
  await sandbox.loadOrgProfile();
  T('org name filled', ids.oName.value === 'MMMUT Gorakhpur');
  T('type code selected (uni)', ids.oType.value === 'uni');
  T('about filled', ids.oAbout.value === 'State university');
  T('state restored to Bihar', ids.oState.value === 'Bihar');
  T('districts rebuilt for Bihar, Patna selected', ids.oDist.value === 'Patna' && ids.oDist.options.some(o => o.value === 'Patna'));
  T('district dropdown enabled after restore', ids.oDist.disabled === false);
  T('phone/email/address filled', ids.oPhone.value === '+91 551 234 5678' && ids.oEmail.value === 'info@mmmut.ac.in' && ids.oAddress.value === 'Gorakhpur');
  T('expertise chips restored (2 selected)', chipChildren('expChips', 'sel').length === 2 &&
      chipChildren('expChips', 'sel').map(c => c.chipText).includes('Law & Public Policy'));
  T('resource chip restored (1 selected)', chipChildren('resChips', 'sel').length === 1);
  T('preference chip restored (1 selected)', chipChildren('prefChips', 'sel').length === 1);
  T('session cache saved with org columns', !!getSessionProfile() && getSessionProfile().org_type === 'uni');

  /* ---- chip toggling (delegated document click) ---- */
  console.log('--- chips ---');
  const clickFns = docListeners['click'] || [];
  T('delegated click listener registered', clickFns.length === 1);
  const chip = chipChildren('expChips')[0];               // unselected chip
  clickFns.forEach(f => f({ target: chip }));
  T('click selects chip', chip._class.has('sel'));
  clickFns.forEach(f => f({ target: chip }));
  T('second click unselects (toggle off)', !chip._class.has('sel'));
  clickFns.forEach(f => f({ target: chip }));
  T('selected again for save test', chip._class.has('sel'));

  /* ---- saveOrgProfile ---- */
  console.log('--- save ---');
  await sandbox.saveOrgProfile();
  T('one update issued', updateCalls.length === 1);
  const p = updateCalls[0] || {};
  T('org columns in payload', p.org_type === 'uni' && typeof p.expertise === 'string' && typeof p.resources === 'string' && typeof p.preferences === 'string');
  T('expertise CSV includes clicked + saved chips', (p.expertise || '').indexOf('Civil & Structural Engineering') >= 0 && (p.expertise || '').indexOf('Law & Public Policy') >= 0);
  T('resources/preferences CSVs exact', p.resources === 'Funding / Grants' && p.preferences === 'Research & Publication');
  T('state/district saved from the two dropdowns', p.state === 'Bihar' && p.district === 'Patna');
  T('no is_anonymous / no fake fields', !('is_anonymous' in p));
  T('success toast shown', toasts.some(m => /saved successfully/i.test(m)));
  T('save button re-enabled', ids.orgSaveBtn.disabled === false && ids.orgSaveBtn.textContent === 'Save profile');
  T('cache updated with expertise CSV', (getSessionProfile().expertise || '').indexOf('Civil & Structural') >= 0);

  /* ---- Scenario B: missing profiles row → auto-create ---- */
  console.log('--- missing row ---');
  updateCalls.length = 0; upsertCalls.length = 0; delete store['ss_profile'];
  dbRow = null;
  await sandbox.loadOrgProfile();
  T('upsert issued for missing row', upsertCalls.length >= 1 && upsertCalls[0].id === 'u-org-1');
  T('form filled from auth metadata, no fake defaults', ids.oName.value === 'MMMUT Gorakhpur' && ids.oAbout.value === '');

  /* ---- Scenario C: no session → login redirect ---- */
  console.log('--- no session ---');
  navs.length = 0;
  sessionUser = null;
  await sandbox.loadOrgProfile();
  T('redirects to login.html', navs.includes('login.html'));

  console.log('--- RESULT: ' + pass + ' passed, ' + fail + ' failed ---');
  process.exitCode = fail ? 1 : 0;
})().catch(e => { console.log('HARNESS ERROR:', e && (e.stack || e.message) || e); process.exitCode = 1; });
