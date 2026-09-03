/* Verify problem.html: inline-script syntax + no stale refs */
const fs = require('fs');
const h = fs.readFileSync('client/problem.html', 'utf8');
let bad = 0;
const blocks = h.match(/<script>[\s\S]*?<\/script>/g) || [];
blocks.forEach((x, i) => {
  try { new Function(x.replace(/<\/?script>/g, '')); }
  catch (e) { bad++; console.log('FAIL block ' + i + ': ' + e.message); }
});
console.log('problem.html inline blocks: ' + blocks.length + ' | syntax errors: ' + bad);

['fundCount', 'fundList', 'actFund', 'detailRail', 'renderFunding',
 'openRequestFund', 'incrementSupport', 'markSupported', 'hasSupported',
 'supportedSet', 'ss-supported'].forEach(x => {
  if (h.includes(x)) console.log('STILL PRESENT: ' + x);
});
console.log('stale-ref scan done');
process.exit(bad ? 1 : 0);