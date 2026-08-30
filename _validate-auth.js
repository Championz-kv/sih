/* Scratch validator for the Supabase auth changes (run: node _validate-auth.js) */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, 'client');
let ok = true;

function extractInlineScripts(htmlPath){
  const html = fs.readFileSync(htmlPath, 'utf8');
  const out = [];
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while((m = re.exec(html))) out.push(m[1]);
  return out;
}

/* 1. external shared client syntax + contract */
try{
  new Function(fs.readFileSync(path.join(root, 'js', 'supabase-client.js'), 'utf8'));
  console.log('OK   syntax: js/supabase-client.js');
}catch(e){ console.error('FAIL js/supabase-client.js:', e.message); ok = false; }

const sc = fs.readFileSync(path.join(root, 'js', 'supabase-client.js'), 'utf8');
const scChecks = [
  ['client created as sbClient (not supabase)', /const sbClient = window\.supabase\.createClient\(SUPABASE_URL, SUPABASE_ANON_KEY\)/.test(sc)],
  ['no client const named supabase', !/const supabase\s*=/.test(sc)],
  ['ready log present', sc.includes("console.log('Supabase client ready:', typeof sbClient.from)")],
];
for(const [name, pass] of scChecks){
  console.log((pass ? 'OK   ' : 'FAIL ') + 'supabase-client.js: ' + name);
  if(!pass) ok = false;
}

/* 2. inline scripts */
for(const rel of ['login.html', 'auth/callback.html']){
  extractInlineScripts(path.join(root, rel)).forEach((code, i) => {
    try{
      new Function(code);
      console.log(`OK   syntax: ${rel} inline #${i + 1} (${code.length} chars)`);
    }catch(e){
      console.error(`FAIL ${rel} inline #${i + 1}: ${e.message}`);
      ok = false;
    }
  });
}

/* 3. login.html structural checks */
const login = fs.readFileSync(path.join(root, 'login.html'), 'utf8');
const loginChecks = [
  ['CDN bundle loads before supabase-client.js', login.indexOf('cdn.jsdelivr.net/npm/@supabase/supabase-js@2') > -1 && login.indexOf('cdn.jsdelivr.net/npm/@supabase/supabase-js@2') < login.indexOf('js/supabase-client.js')],
  ['one Google button (login pane only)', (login.match(/class="btn-google"/g) || []).length === 1],
  ['Google button sits in the login pane (not register)', login.indexOf('class="btn-google"') > -1 && login.indexOf('class="btn-google"') < login.indexOf('id="regErr"') && login.indexOf('class="btn-google"') === login.lastIndexOf('class="btn-google"')],
  ['Google SVG present once', (login.match(/viewBox="0 0 48 48"/g) || []).length === 1],
  ['or-divider once (login pane only)', (login.match(/class="auth-divider"/g) || []).length === 1],
  ['email-only field label (no phone)', (login.match(/<label>Email<\/label>/g) || []).length === 2],
  ['email placeholders on both panes', (login.match(/you@example.com/g) || []).length === 2],
  ['phone sign-in fully removed', !login.includes('identifierToEmail') && !login.includes('PHONE_EMAIL_DOMAIN') && !login.includes('10-digit')],
  ['X close button → landing page', login.includes('id="loginClose"') && login.includes("onclick=\"go('index.html')\"")],
  ['signInWithPassword used via sbClient', login.includes('sbClient.auth.signInWithPassword')],
  ['signUp passes role in options.data', /options:\s*\{[\s\S]*?role:\s*regRole[\s\S]*?\}/.test(login)],
  ['full_name in signUp metadata', login.includes('full_name: fullName')],
  ['username availability check via profiles', /from\('profiles'\)[\s\S]{0,80}eq\('username', u\)/.test(login)],
  ['oauth redirectTo callback', login.includes('https://sih26kuestl.vercel.app/auth/callback.html')],
  ['role redirect map (citizen→dashboard, org_member→discover, admin→admin)', /citizen:'dashboard.html', org_member:'discover.html', admin:'admin.html'/.test(login)],
  ['success message', login.includes('Account created! Check your email to confirm.')],
  ['no leftover account-type select', !login.includes('id="userType"')],
  ['no leftover separate phone field', !login.includes('id="regPhone"')],
  ['no bare supabase.* client calls (namespace conflict gone)', !/\bsupabase\.(from|auth)\./.test(login)],
  ['sbClient used for every client call', login.includes('sbClient.auth.signInWithPassword') && login.includes('sbClient.auth.signUp') && login.includes('sbClient.auth.signInWithOAuth') && login.includes("sbClient.from('profiles')")],
  ['order: CDN bundle < supabase-client.js < app.js', (() => {
    const a = login.indexOf('cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
    const b = login.indexOf('js/supabase-client.js');
    const c = login.indexOf('js/app.js');
    return a > -1 && a < b && b < c;
  })()],
  ['inline page script comes last', login.lastIndexOf('<script>') > login.indexOf('js/app.js')],
];
for(const [name, pass] of loginChecks){
  console.log((pass ? 'OK   ' : 'FAIL ') + name);
  if(!pass) ok = false;
}

/* 4. callback.html structural checks */
const cb = fs.readFileSync(path.join(root, 'auth', 'callback.html'), 'utf8');
const cbChecks = [
  ['links ../css/styles.css', cb.includes('../css/styles.css')],
  ['loads ../js/supabase-client.js after CDN bundle', cb.indexOf('cdn.jsdelivr.net/npm/@supabase/supabase-js@2') < cb.indexOf('../js/supabase-client.js')],
  ['listens to onAuthStateChange', cb.includes('onAuthStateChange')],
  ['redirects by role', cb.includes("'../dashboard.html'") && cb.includes("'../discover.html'") && cb.includes("'../admin.html'")],
  ['shows "Signing you in…"', cb.includes('Signing you in')],
  ['profiles role lookup', /from\('profiles'\)/.test(cb)],
  ['no bare supabase.* client calls (namespace conflict gone)', !/\bsupabase\.(from|auth)\./.test(cb)],
  ['sbClient used for every client call', cb.includes("sbClient.from('profiles')") && cb.includes('sbClient.auth.getSession') && cb.includes('sbClient.auth.onAuthStateChange')],
  ['callback: fallback profile marked _minimal', cb.includes('_minimal: true')],
];
for(const [name, pass] of cbChecks){
  console.log((pass ? 'OK   ' : 'FAIL ') + 'callback: ' + name);
  if(!pass) ok = false;
}

/* 4b. Task set 2 — registration role picker */
const pillChecks = [
  ['two role pills (citizen + org_member)', /data-role="citizen"/.test(login) && /data-role="org_member"/.test(login)],
  ['no admin option in the picker', !/regRolePills[\s\S]{0,600}admin/i.test(login)],
  ['pills sit between Full Name and Password', login.indexOf('regFullName') < login.indexOf('regRolePills') && login.indexOf('regRolePills') < login.indexOf('id="regPass"')],
  ['pickRegRole defined', login.includes('function pickRegRole(')],
  ['signUp passes role: regRole', /role:\s*regRole/.test(login)],
  ['profile cached to ss_profile on login', login.includes("saveSsProfile(profile)")],
  ['login caches minimal profile when row missing', /fetchProfile\(data\.user\.id\) \|\| minimalProfile\(data\.user\)/.test(login)],
  ['immediate-session reg caches minimal profile', /saveSsProfile\(\{\s*username:u,\s*full_name:fullName,\s*role:regRole\s*\}\)/.test(login)],
  ['full profile columns fetched', login.includes("select('id, username, full_name, role, avatar_url, org_id')")],
];
for(const [name, pass] of pillChecks){
  console.log((pass ? 'OK   ' : 'FAIL ') + 'register: ' + name);
  if(!pass) ok = false;
}

/* 4c. Task set 2 — shell session/UI integration */
const shell = fs.readFileSync(path.join(root, 'js', 'shell.js'), 'utf8');
try{ new Function(shell); console.log('OK   syntax: js/shell.js'); }
catch(e){ console.error('FAIL js/shell.js:', e.message); ok = false; }

const shellChecks = [
  ['ss_profile sessionStorage cache used', shell.includes("'ss_profile'") && shell.includes('getSessionProfile') && shell.includes('saveSessionProfile') && shell.includes('clearSessionProfile')],
  ['initAuthSession checks getSession()', shell.includes('sbClient.auth.getSession()')],
  ['profile refetch when cache missing (tab reopen)', shell.includes("profile.id !== session.user.id")],
  ['minimal profile fallback when profiles row missing', shell.includes('_minimal') && shell.includes('minimalProfileFromUser')],
  ['auth guard via body[data-auth="required"]', shell.includes("document.body.dataset.auth === 'required'")],
  ['renderShell awaits session before rendering', /async function renderShell\(\)\s*\{[\s\S]{0,200}await initAuthSession\(\)/.test(shell)],
  ['renderShell passes profile to applyRoleUI', shell.includes('applyRoleUI(currentRole(), profile)')],
  ['topbar: avatar tinted via avatarColor + initials(full_name)', shell.includes('avatarColor(uname || fullName)') && shell.includes('initials(fullName)')],
  ['topbar: @username mono handle', shell.includes('acct-handle mono')],
  ['topbar: Sign in button for guests', shell.includes(">Sign in</button>")],
  ['demo role-switcher removed from topbar', !shell.includes('class="role-switch"')],
  ['renderTopbar defines signedIn before use', /const signedIn = !!profile/.test(shell)],
  ['brand logo links to landing page (index.html)', shell.includes('href="index.html${paramStr()}"')],
  ['notifications bell only rendered for signed-in users', (() => {
    const bell = shell.indexOf("go('notifications.html')");
    const ternary = shell.indexOf('${signedIn ?');
    const theme = shell.indexOf('theme-toggle');
    return bell > -1 && ternary > -1 && bell > ternary && bell < theme;
  })()],
  ['shell sections render in try/catch (one failure cannot blank chrome)', (shell.match(/catch\(e\)\{ console\.error\('\[shell\] (topbar|sidebar|modals) render failed/g) || []).length === 3],
  ['getSession raced with timeout', shell.includes('Promise.race')],
  ['dropdown: My Profile + Sign out', shell.includes("onclick=\"acctProfile()\">My Profile</button>") && shell.includes('onclick="logout()">Sign out</button>')],
  ['logout calls sbClient.auth.signOut()', shell.includes('await sbClient.auth.signOut()')],
  ['logout clears profile + goes to login.html', /clearSessionProfile\(\);[\s\S]{0,200}go\('login\.html'\)/.test(shell)],
  ['citizen My Profile → my-problems.html, org → org-profile.html', shell.includes("go('my-problems.html')") && shell.includes("go('org-profile.html')")],
  ['org_member → org mapping for shell UI', shell.includes("role === 'org_member' ? 'org'")],
  ['profile fetch uses full column list', shell.includes("select('id, username, full_name, role, avatar_url, org_id')")],
];
for(const [name, pass] of shellChecks){
  console.log((pass ? 'OK   ' : 'FAIL ') + 'shell: ' + name);
  if(!pass) ok = false;
}

/* 4d. Task set 2 — page coverage: supabase tags + data-auth */
const AUTH_REQUIRED = ['my-problems.html','submit.html','org-profile.html','discover.html','interests.html',
  'projects.html','requests.html','notifications.html','admin.html','verify.html','review.html'];
const PUBLIC_PAGES = ['index.html','explore.html','problem.html','analytics.html','organizations.html','team.html'];
let pageFail = 0;
for(const f of fs.readdirSync(root)){
  if(!f.endsWith('.html') || f === 'login.html') continue;
  const html = fs.readFileSync(path.join(root, f), 'utf8');
  const hasTags = html.includes('supabase-js@2') && html.includes('supabase-client.js');
  const tagOrder = hasTags ? html.indexOf('supabase-js@2') < html.indexOf('supabase-client.js') : false;
  const needsAuth = AUTH_REQUIRED.includes(f);
  const hasAuth = html.includes('data-auth="required"');
  if(!hasTags || !tagOrder || (needsAuth && !hasAuth) || (!needsAuth && PUBLIC_PAGES.includes(f) && hasAuth)){
    console.log(`FAIL page: ${f}` + (!hasTags ? ' — missing supabase tags' : '') + (!tagOrder ? ' — CDN/client order wrong' : '') + ((needsAuth && !hasAuth) ? ' — missing data-auth' : '') + ((!needsAuth && PUBLIC_PAGES.includes(f) && hasAuth) ? ' — public page should not have data-auth' : ''));
    pageFail++;
  }
}
if(pageFail === 0) console.log('OK   pages: supabase tags + data-auth coverage correct on all shell pages');
else ok = false;

/* 4e. Task set 2 — index.html explore gate */
const idx = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
try{ 
  extractInlineScripts(path.join(root, 'index.html')).forEach((code, i) => {
    new Function(code);
    console.log(`OK   syntax: index.html inline #${i + 1}`);
  });
}catch(e){ console.error('FAIL index.html inline:', e.message); ok = false; }
const idxChecks = [
  ['both Explore Problems buttons go straight to explore.html', (idx.match(/onclick="go\('explore\.html'\)">Explore Problems<\/button>/g) || []).length === 2],
  ['exploreGate helper removed (guests go straight in)', !idx.includes('exploreGate')],
  ['hero Report a Problem goes to submit.html', /go\('submit\.html'\)"[^>]*><i class="fa-solid fa-bullhorn"><\/i> Report a Problem</.test(idx)],
  ['no direct go(login) on Explore buttons', !/go\('login\.html'\)">Explore Problems/.test(idx)],
];
for(const [name, pass] of idxChecks){
  console.log((pass ? 'OK   ' : 'FAIL ') + 'index: ' + name);
  if(!pass) ok = false;
}

/* 4f. team page — photo avatars with initials fallback */
const teamHtml = fs.readFileSync(path.join(root, 'team.html'), 'utf8');
const teamChecks = [
  ['photos loaded from img/team/<letter>.jpg', /src="img\/team\/\$\{letter\}\.jpg"/.test(teamHtml)],
  ['initials fallback when photo file missing', teamHtml.includes('onerror="this.remove()"') && teamHtml.includes('team-photo')],
  ['square-crop + size styles present', teamHtml.includes('object-fit:cover') && teamHtml.includes('width:88px')],
  ['photo folder doc exists', fs.existsSync(path.join(root, 'img', 'team', 'README.txt'))],
];
for(const [name, pass] of teamChecks){
  console.log((pass ? 'OK   ' : 'FAIL ') + 'team: ' + name);
  if(!pass) ok = false;
}

/* 4g. temp demo-ids tile + github links */
const ghLink = 'github.com/Championz-kv/sih';
const tempChecks = [
  ['login: sample-ids tile present (temp)', login.includes('class="demo-ids"') && login.includes('citizen@gmail.com') && login.includes('admin@gmail.com')],
  ['login: tile clearly marked removable', login.includes('TEMP: sample-ids tile')],
  ['index: github link in footer', idx.includes(ghLink)],
  ['team: github link at bottom', teamHtml.includes(ghLink)],
];
for(const [name, pass] of tempChecks){
  console.log((pass ? 'OK   ' : 'FAIL ') + 'temp-ui: ' + name);
  if(!pass) ok = false;
}

/* 4h. citizen profile ↔ Supabase */
const cp = fs.readFileSync(path.join(root, 'citizen-profile.html'), 'utf8');
const cpChecks = [
  ['about field has id cAbout', /textarea class="input" id="cAbout"/.test(cp)],
  ['link inputs use .link-input (static + dynamic rows)', (cp.match(/class="input link-input"/g) || []).length === 2],
  ['username/email readonly with notes', cp.includes('id="cUser" value="guest" readonly') && cp.includes('(username cannot be changed)')],
  ['email editable and saved', !/id="cEmail"[^>]*readonly/.test(cp) && cp.includes("email: document.getElementById('cEmail').value.trim()")],
  ['loads profile with full column list', cp.includes("select('id, username, full_name, email, phone, about, address, link_other, funding_verified, funding_awaited')")],
  ['falls back to select(*) when a column is missing', cp.includes("select('*')")],
  ['missing row → auto-created via upsert', cp.includes("upsert") && cp.includes("ignoreDuplicates: true")],
  ['load errors surfaced via toast', cp.includes("toast('Could not load profile — ' +")],
  ['no session redirects to login', cp.includes("go('login.html')")],
  ['save uses sbClient update on profiles', /from\('profiles'\)[\s\S]{0,40}\.update\(payload\)/.test(cp)],
  ['uses link_other column (not link_others)', cp.includes('link_other') && !cp.includes('link_others')],
  ['links joined as newline string on save', cp.includes(".join('\\n')")],
  ['ss_profile synced after save', cp.includes("sessionStorage.getItem('ss_profile')")],
  ['civic counts via head:true', (cp.match(/count:'exact', head:true/g) || []).length === 2],
  ['page requires auth via body flag', cp.includes('data-auth="required"')],
];
for(const [name, pass] of cpChecks){
  console.log((pass ? 'OK   ' : 'FAIL ') + 'citizen-profile: ' + name);
  if(!pass) ok = false;
}

/* 5. live probes */
const SUPA = 'https://chwvtrcxnfqfkwlaxxbo.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNod3Z0cmN4bmZxZmt3bGF4eGJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3MDczNjUsImV4cCI6MjEwMzI4MzM2NX0.RS5UcZDMG4hYV4ksztZvxDIO51LJVP9GkRjpJQD1ZoY';

(async () => {
  try{
    const payload = JSON.parse(Buffer.from(KEY.split('.')[1], 'base64').toString('utf8'));
    console.log('OK   anon key decodes → role: ' + payload.role + ', ref: ' + payload.ref);
  }catch(e){ console.log('WARN could not decode anon key: ' + e.message); }

  try{
    const res = await fetch(SUPA + '/rest/v1/profiles?select=id,username,role&limit=1', {
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }
    });
    console.log('REST probe profiles → HTTP ' + res.status);
    if(res.ok) console.log('     sample row: ' + JSON.stringify(await res.json()));
    else console.log('     body: ' + (await res.text()).slice(0, 300));
  }catch(e){ console.log('WARN REST probe failed: ' + e.message); }

  console.log(ok ? '\nALL CHECKS PASSED' : '\nSOME CHECKS FAILED');
  process.exitCode = ok ? 0 : 1;
})();