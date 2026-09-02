/* Throwaway: validate the color-hierarchy edits. Run: node _color_check.js */
const fs = require('fs');
let ok = true;
const check = (name, pass, detail) => { console.log((pass ? 'OK   ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if(!pass) ok = false; };

/* 1. inline scripts of funding.html still parse */
const html = fs.readFileSync(__dirname + '/client/funding.html', 'utf8');
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
let m, i = 0;
while((m = re.exec(html))){
  i++;
  try{ new Function(m[1]); check(`funding.html inline #${i} syntax`, true); }
  catch(e){ check(`funding.html inline #${i} syntax`, false, e.message); }
}

/* 2. CSS edits in place */
const styles = fs.readFileSync(__dirname + '/client/css/styles.css', 'utf8');
const landing = fs.readFileSync(__dirname + '/client/css/landing.css', 'utf8');
check('.eyebrow uses --text-faint', /\.eyebrow\{[^}]*color:var\(--text-faint\)/.test(styles));
check('dark .eyebrow accent override removed', !styles.includes('html[data-theme="dark"] .eyebrow'));
check('.lp-eyebrow uses --text-faint', /\.lp-eyebrow\{[^}]*color:var\(--text-faint\)/.test(landing));
check('dark .lp-eyebrow accent override removed', !landing.includes('html[data-theme="dark"] .lp-eyebrow'));
check('.d-warn rule added with existing --ochre-2', styles.includes('.d-warn{ color:var(--ochre-2); }'));
check('.d-up / .d-down semantics untouched', styles.includes('.d-up{ color:var(--ledger); } .d-down{ color:var(--rust); } .d-warn{ color:var(--ochre-2); }'));

/* 3. funding.html ledger uses d-warn for the pending state */
check("funding ledger: 'd-warn ⏳ pending'", html.includes("'d-warn ⏳ pending'"));
check('funding ledger: d-warn branch wired in template', /startsWith\('d-warn'\) \? 'd-warn'/.test(html));
check('funding ledger: prefix strip covers d-warn', html.includes('d-up|d-down|d-warn'));

/* 4. render simulation of the ledger strip logic (real demo totals) */
const FUND_REQUESTS = [
  { target:60000, pledges:[{by:'A',amount:25000,status:'received'},{by:'B',amount:5000,status:'received'},{by:'C',amount:10000,status:'pledged'}] },
  { target:120000, pledges:[{by:'D',amount:40000,status:'received'},{by:'E',amount:7500,status:'received'},{by:'F',amount:20000,status:'pledged'}] },
  { target:95000, pledges:[{by:'G',amount:11000,status:'received'}] },
  { target:45000, pledges:[] },
];
const fundRaised = f => f.pledges.filter(p => p.status === 'received').reduce((s,p) => s + p.amount, 0);
const fundPledged = f => f.pledges.filter(p => p.status === 'pledged').reduce((s,p) => s + p.amount, 0);
const received = FUND_REQUESTS.reduce((s,f) => s + fundRaised(f), 0);
const awaiting = FUND_REQUESTS.reduce((s,f) => s + fundPledged(f), 0);
const rows = [
  [received,  'Received', 'd-up ▲ verified'],
  [awaiting,  'Awaiting verification', 'd-warn ⏳ pending'],
].map(([v, l, d]) =>
  `<span class="d ${String(d).startsWith('d-up') ? 'd-up' : String(d).startsWith('d-down') ? 'd-down' : String(d).startsWith('d-warn') ? 'd-warn' : ''}">${d.replace(/^(d-up|d-down|d-warn)\s?/, '')}</span>`);
check('rendered Received row keeps d-up class + clean label', rows[0] === '<span class="d d-up">▲ verified</span>', rows[0]);
check('rendered Awaiting row gets d-warn class + clean label', rows[1] === '<span class="d d-warn">⏳ pending</span>', rows[1]);

console.log(ok ? '\nALL COLOR-HIERARCHY CHECKS PASSED' : '\nSOME CHECKS FAILED');
process.exitCode = ok ? 0 : 1;
