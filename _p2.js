const fs0 = require('fs');
const INDIA = (function () {
  const w = {};
  (new Function('window', fs0.readFileSync('client/js/india-districts-fallback.js', 'utf8')))(w);
  return w.INDIA_DISTRICTS_FALLBACK;
})();
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
