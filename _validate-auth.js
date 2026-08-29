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

/* 1. external shared client syntax */
try{
  new Function(fs.readFileSync(path.join(root, 'js', 'supabase-client.js'), 'utf8'));
  console.log('OK   syntax: js/supabase-client.js');
}catch(e){ console.error('FAIL js/supabase-client.js:', e.message); ok = false; }

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
  ['two Google buttons (login + register)', (login.match(/class="btn-google"/g) || []).length === 2],
  ['Google SVG present twice', (login.match(/viewBox="0 0 48 48"/g) || []).length === 2],
  ['or-divider twice', (login.match(/class="auth-divider"/g) || []).length === 2],
  ['merged field label "Email or Phone Number"', (login.match(/Email or Phone Number/g) || []).length === 2],
  ['spec placeholder twice', (login.match(/Enter your email or 10-digit mobile number/g) || []).length === 2],
  ['signInWithPassword used', login.includes('supabase.auth.signInWithPassword')],
  ['signUp passes role citizen in options.data', /options:\s*\{[\s\S]*?role:\s*'citizen'[\s\S]*?\}/.test(login)],
  ['full_name in signUp metadata', login.includes('full_name: fullName')],
  ['username availability check via profiles', /from\('profiles'\)[\s\S]{0,80}eq\('username', u\)/.test(login)],
  ['oauth redirectTo callback', login.includes('https://sih26kuestl.vercel.app/auth/callback.html')],
  ['role redirect map (citizen→index, org_member→discover, admin→admin)', /citizen:'index.html', org_member:'discover.html', admin:'admin.html'/.test(login)],
  ['success message', login.includes('Account created! Check your email to confirm.')],
  ['no leftover account-type select', !login.includes('id="userType"')],
  ['no leftover separate phone field', !login.includes('id="regPhone"')],
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
  ['redirects by role', cb.includes("'../index.html'") && cb.includes("'../discover.html'") && cb.includes("'../admin.html'")],
  ['shows "Signing you in…"', cb.includes('Signing you in')],
  ['profiles role lookup', cb.includes("from('profiles')")],
];
for(const [name, pass] of cbChecks){
  console.log((pass ? 'OK   ' : 'FAIL ') + 'callback: ' + name);
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