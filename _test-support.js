/* Headless test for the Support-button toggle in client/js/app.js.
   Evals app.js with a stubbed browser + Supabase client, then drives
   toggleSupport through support / unsupport / multi-case / missing-row
   scenarios and asserts both counters + supported_problems stay in sync. */
const fs = require('fs');
const SRC = fs.readFileSync('client/js/app.js', 'utf8');
let pass = 0, fail = 0;
const ok = (cond, name) => { if(cond){ pass++; console.log('PASS ' + name); } else { fail++; console.log('FAIL ' + name); } };

/* ---------- in-memory database ---------- */
const db = {
  problems: {
    1: { id: 1, support: 3 },
    2: { id: 2, support: 7 }
  },
  profiles: {
    U1: { id: 'U1', cases_supported: 0, supported_problems: [] }
  }
};
function pick(row, cols){
  const out = {};
  if(cols === '*') return Object.assign({}, row);
  cols.split(',').map(s => s.trim()).forEach(c => { out[c] = row[c]; });
  return out;
}
function makeQB(table){
  let op = 'select', cols = '*', filter = null, payload = null;
  const q = {
    select(c){ cols = c; return q; },
    eq(col, val){ filter = { col, val }; return q; },
    maybeSingle(){ op = 'maybeSingle'; return q; },
    single(){ op = 'single'; return q; },
    update(p){ op = 'update'; payload = p; return q; },
    then(resolve, reject){
      try{
        const rows = db[table] || {};
        const arr = Object.keys(rows).map(k => rows[k]);
        const filtered = filter ? arr.filter(r => r[filter.col] === filter.val) : arr;
        let data = null, error = null;
        if(op === 'update'){
          const row = filtered[0] || null;
          if(row) Object.assign(row, payload);
          data = row ? [pick(row, cols)] : [];
        } else if(op === 'select'){
          data = filtered.map(r => pick(r, cols));
        } else {
          data = filtered.length ? pick(filtered[0], cols) : null;
        }
        resolve({ data, error });
      }catch(e){ reject(e); }
    }
  };
  return q;
}
const sbClient = { from: t => makeQB(t), auth: { getSession: async () => ({ data: { session: null } }) } };
const sessionStore = {};
const localStore = {};

const fn = new Function('document', 'window', 'location', 'sbClient', 'sessionStorage', 'localStorage', 'navigator', 'history', '__expose',
  SRC + '\n__expose({ toggleSupport, num, fetchSupportCounts, applySupportCounts });');
const api = {};
fn(
  { addEventListener(){}, getElementById(){ return null; }, createElement(){ return {}; } },
  { addEventListener(){}, location: { search: '' } },
  { search: '', href: '', replace(){}, assign(){} },
  sbClient,
  { getItem: k => sessionStore[k] ?? null, setItem: (k, v) => { sessionStore[k] = v; }, removeItem: k => { delete sessionStore[k]; } },
  { getItem: k => localStore[k] ?? null, setItem: (k, v) => { localStore[k] = v; }, removeItem: k => { delete localStore[k]; } },
  { userAgent: 'node' },
  { replaceState(){} },
  fns => Object.assign(api, fns)
);

(async () => {
  /* 1 — first click SUPPORTS: both counters +1, id appended */
  let r = await api.toggleSupport(1, 'U1');
  ok(r.supported === true && r.support === 4 && r.cases_supported === 1
    && JSON.stringify(r.supported_problems) === JSON.stringify([1]),
    'support: problems.support 3→4, cases_supported 0→1, id appended');
  ok(db.problems[1].support === 4 && db.profiles.U1.cases_supported === 1
    && db.profiles.U1.supported_problems.length === 1 && db.profiles.U1.supported_problems[0] === 1,
    'support: DB rows actually updated');

  /* 2 — second click UNSUPPORTS: both counters back down, id removed */
  r = await api.toggleSupport(1, 'U1');
  ok(r.supported === false && r.support === 3 && r.cases_supported === 0
    && JSON.stringify(r.supported_problems) === '[]',
    'unsupport: problems.support 4→3, cases_supported 1→0, id removed');
  ok(db.problems[1].support === 3 && db.profiles.U1.cases_supported === 0
    && db.profiles.U1.supported_problems.length === 0,
    'unsupport: DB rows actually updated');

  /* 3 — supporting TWO different cases tracks both ids */
  await api.toggleSupport(2, 'U1');           /* now backed: {2} */
  await api.toggleSupport(1, 'U1');           /* now backed: {2,1} */
  ok(db.problems[1].support === 4 && db.problems[2].support === 8 && db.profiles.U1.cases_supported === 2,
    'multi-case: both counters +1 each = 2 total cases_supported');
  ok([...db.profiles.U1.supported_problems].sort().join(',') === '1,2',
    'multi-case: supported_problems tracks both ids');

  /* 4 — unsupporting ONE leaves the other intact */
  r = await api.toggleSupport(1, 'U1');
  ok(r.supported === false && r.cases_supported === 1
    && JSON.stringify(r.supported_problems) === JSON.stringify([2]),
    'unsupport one: other case stays backed, cases_supported back to 1');
  ok(db.problems[1].support === 3 && db.problems[2].support === 8,
    'unsupport one: only problem 1 decremented');

  /* 5 — cleanup: unsupport the remaining case */
  r = await api.toggleSupport(2, 'U1');
  ok(r.cases_supported === 0 && db.problems[2].support === 7 && db.profiles.U1.supported_problems.length === 0,
    'cleanup: full cycle returns every counter to its start');

  /* 6 — missing problem row rejects (can never double-count a phantom) */
  try{ await api.toggleSupport(999, 'U1'); ok(false, 'missing row rejects'); }
  catch(e){ ok(/problems has no row for id 999/.test(e.message), 'missing row rejects: ' + e.message); }

  /* 7 — missing profile row rejects */
  try{ await api.toggleSupport(1, 'NOPE'); ok(false, 'missing profile rejects'); }
  catch(e){ ok(/profile row/.test(e.message), 'missing profile rejects: ' + e.message); }

  /* 8 — string values from Postgres (bigint serialised as strings) coerce */
  db.problems[5] = { id: 5, support: 2 };
  db.profiles.U1 = { id: 'U1', cases_supported: '2', supported_problems: ['2', '5'] };
  r = await api.toggleSupport('5', 'U1');
  ok(r.supported === false && r.support === 1 && r.cases_supported === 1
    && JSON.stringify(r.supported_problems) === JSON.stringify([2]),
    'string coerce: "5" recognised as already backed → unsupport decrements both');

  /* 9 — fetchSupportCounts still overlays DB counts */
  const map = await api.fetchSupportCounts();
  ok(map && map[1] === 3 && map[2] === 7 && map[5] === 1, 'fetchSupportCounts still reads support per problem');

  console.log('RESULT ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });