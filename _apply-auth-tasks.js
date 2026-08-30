/* Scratch: inject Supabase scripts into shell pages + add data-auth="required"
   to protected pages. Idempotent. Run: node _apply-auth-tasks.js */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, 'client');

// hello

const CDN = '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>\n<script src="js/supabase-client.js"></script>\n';
const DATA_TAG = '<script src="js/data.js"></script>';
const AUTH_PAGES = ['my-problems.html','submit.html','org-profile.html','discover.html','interests.html',
  'projects.html','requests.html','notifications.html','admin.html','verify.html','review.html'];

let changed = 0, skipped = 0;

for(const f of fs.readdirSync(root)){
  if(!f.endsWith('.html')) continue;
  let html = fs.readFileSync(path.join(root, f), 'utf8');
  const before = html;
  let actions = [];

  /* 1. inject CDN + shared client before the first js/data.js (skip pages that already have it) */
  if(!html.includes('supabase-client.js') && html.includes(DATA_TAG)){
    html = html.replace(DATA_TAG, CDN + DATA_TAG);
    actions.push('supabase tags');
  }
  /* 2. auth-required body tag */
  if(AUTH_PAGES.includes(f) && !html.includes('data-auth=')){
    html = html.replace(/<body([^>]*)>/, (m, attrs) => `<body${attrs} data-auth="required">`);
    actions.push('data-auth');
  }
  if(html !== before){
    fs.writeFileSync(path.join(root, f), html);
    console.log('OK  ' + f.padEnd(24) + ' ← ' + actions.join(', '));
    changed++;
  } else {
    skipped++;
  }
}
console.log(`\n${changed} file(s) updated, ${skipped} already up to date`);