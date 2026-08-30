/* Scratch: executes shell.js render functions under DOM stubs so runtime
   errors (ReferenceError etc.) are caught — syntax checks alone can't.
   Run: node _shell-smoke.js */
const fs = require('fs');

/* ---- minimal browser stubs ---- */
function makeEl(tag){ return { tag, textContent:'', innerHTML:'', style:{}, dataset:{},
  classList:{ toggle(){}, add(){}, remove(){} }, contains(){ return false; },
  addEventListener(){}, appendChild(){}, outerHTML:'' }; }
const elCache = {};
global.document = {
  body: { dataset:{ page:'overview' }, appendChild(){} },
  documentElement: { setAttribute(){}, getAttribute(){ return 'light'; } },
  getElementById(id){ if(!elCache[id]) elCache[id] = makeEl(id); return elCache[id]; },
  querySelectorAll(){ return []; },
  querySelector(){ return null; },
  createElement(tag){ return makeEl(tag); },
  addEventListener(){}
};
global.window = { addEventListener(){} };
global.location = { href:'http://localhost/dashboard.html', search:'', pathname:'/dashboard.html' };
global.history = { replaceState(){} };
const lstore = {};
global.localStorage = { getItem:k => (k in lstore ? lstore[k] : null),
  setItem:(k,v) => { lstore[k] = String(v); }, removeItem:k => { delete lstore[k]; } };
const sstore = {};
global.sessionStorage = { getItem:k => (k in sstore ? sstore[k] : null),
  setItem:(k,v) => { sstore[k] = String(v); }, removeItem:k => { delete sstore[k]; } };

/* ---- data globals shell.js expects from data.js ---- */
global.PROBLEMS = []; global.FUND_REQUESTS = []; global.NOTIFICATIONS = [];
global.ORGS = []; global.REVIEW_QUEUE = []; global.TEAM = { name:'T', members:[] };
global.fundIsFunded = () => true; global.fundById = () => null; global.inr = n => String(n);

/* ---- app.js helpers (same implementations) ---- */
global.initials = name => String(name || '').split(/\s+/).map(w => w[0]).join('').slice(0,2).toUpperCase();
global.AVATAR_PALETTE = ['#0F7173','#C76500'];
global.avatarColor = name => { let h = 0; for(const c of String(name || '')){ h = c.charCodeAt(0) + ((h << 5) - h); }
  return global.AVATAR_PALETTE[Math.abs(h) % global.AVATAR_PALETTE.length]; };
global.storageGet = k => (k in lstore ? lstore[k] : null);
global.storageSet = (k,v) => { lstore[k] = String(v); };
global.currentRole = () => global.storageGet('ss-role') || 'guest';
global.currentTheme = () => 'light';
global.paramStr = () => '?role=x&theme=light';
global.go = p => { global.__lastNav = p; };
global.toast = () => {};
global.updateUrlParam = () => {};
global.wireGlobalSearch = () => {};
global.renderModals = () => '<div id="loginModal"></div>';

/* ---- fake supabase client ---- */
const profRow = { id:'u1', username:'aarav', full_name:'Aarav Sharma', role:'citizen', avatar_url:null, org_id:null };
global.__fakeSession = true;
global.sbClient = {
  auth: {
    getSession: async () => ({ data:{ session: global.__fakeSession ? { user:{ id:'u1' } } : null } }),
    signOut: async () => {}
  },
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: profRow }) }) }) })
};

/* ---- RUNNER APPENDED BELOW ---- */
const src = fs.readFileSync(__dirname + '/client/js/shell.js', 'utf8');
const runner = `
;(async () => {
  const out = [];
  const check = (name, pass, detail) => { out.push((pass ? 'OK   ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if(!pass) process.exitCode = 1; };
  try{
    /* signed-in topbar */
    sessionStorage.setItem('ss_profile', JSON.stringify({ id:'u1', username:'aarav', full_name:'Aarav Sharma', role:'citizen' }));
    let html = renderTopbar();
    check('renderTopbar() executes (no ReferenceError)', typeof html === 'string' && html.indexOf('<header class="topbar">') !== -1);
    check('topbar: signed-in account area rendered', html.indexOf('acct-wrap') !== -1);
    check('topbar: @username shown', html.indexOf('@aarav') !== -1);
    check('topbar: avatar initials present', html.indexOf('AS') !== -1);
    check('topbar: no Sign in button while signed in', html.indexOf('Sign in</button>') === -1);
    check('topbar: My Profile + Sign out present', html.indexOf('My Profile</button>') !== -1 && html.indexOf('Sign out</button>') !== -1);
    check('topbar: brand links to landing page', html.indexOf('href="index.html') !== -1);

    /* guest topbar */
    sessionStorage.removeItem('ss_profile');
    html = renderTopbar();
    check('topbar: guest gets Sign in button', html.indexOf('Sign in</button>') !== -1);
    check('topbar: no account area for guest', html.indexOf('acct-wrap') === -1);

    /* sidebar */
    const sb = renderSidebar('overview');
    check('renderSidebar() executes', typeof sb === 'string' && sb.indexOf('nav-item') !== -1 && sb.indexOf('id="sidebar"') !== -1);

    /* session rehydration */
    sessionStorage.setItem('ss_profile', JSON.stringify({ id:'u1', username:'aarav', full_name:'Aarav Sharma', role:'citizen' }));
    const p = await initAuthSession();
    check('initAuthSession returns cached profile (session present)', !!p && p.username === 'aarav');

    /* role UI against stub DOM */
    try{ applyRoleUI('citizen', p); check('applyRoleUI(citizen, profile) executes', true); }
    catch(e){ check('applyRoleUI(citizen, profile) executes', false, e.message); }
    try{ applyRoleUI('org_member', p); check('applyRoleUI tolerates unmapped role', true); }
    catch(e){ check('applyRoleUI tolerates unmapped role', false, e.message); }

    /* auth guard */
    global.__fakeSession = false;
    sessionStorage.removeItem('ss_profile');
    document.body.dataset.auth = 'required';
    global.__lastNav = '';
    await initAuthSession();
    check('auth-required + no session redirects to login.html', global.__lastNav === 'login.html', 'lastNav=' + global.__lastNav);

    /* public page, no session: no redirect */
    document.body.dataset.auth = '';
    global.__lastNav = '';
    await initAuthSession();
    check('public page + no session stays (guest)', global.__lastNav === '');

    /* supabase unavailable: degrade, no redirect on public page */
    const realClient = global.sbClient; global.sbClient = undefined;
    global.__lastNav = '';
    await initAuthSession();
    check('missing sbClient degrades gracefully on public page', global.__lastNav === '');
    global.sbClient = realClient;

    console.log(out.join('\\n'));
    if(process.exitCode === 1) console.error('\\nSMOKE TESTS FAILED');
    else console.log('\\nALL SMOKE TESTS PASSED');
  }catch(e){
    console.error('SMOKE RUNNER ERROR: ' + (e && e.stack ? e.stack : e));
    process.exitCode = 1;
  }
})();`;
eval(src + runner);