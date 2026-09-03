/* Syntax check every inline <script> block in org-profile.html & citizen-profile.html */
const fs = require('fs');
let bad = 0;
['client/org-profile.html', 'client/citizen-profile.html'].forEach(f => {
  const h = fs.readFileSync(f, 'utf8');
  const blocks = h.match(/<script>[\s\S]*?<\/script>/g) || [];
  blocks.forEach((b, i) => {
    try {
      new Function(b.replace(/<\/?script>/g, ''));
      console.log('OK   ' + f + ' block ' + i);
    } catch (e) {
      bad++;
      console.log('FAIL ' + f + ' block ' + i + ' — ' + e.message);
    }
  });
});
console.log('syntax errors: ' + bad);
process.exit(bad ? 1 : 0);
