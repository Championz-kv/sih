const fs = require('fs');
const out = [];
out.push('=== ROOT API DIR ===');
try { out.push(fs.readdirSync('api').join('\n')); } catch (e) { out.push('NO api dir: ' + e.message); }
out.push('=== CLIENT API DIR ===');
try { out.push(fs.readdirSync('client/api').join('\n')); } catch (e) { out.push('NO client/api dir: ' + e.message); }
out.push('=== SUBMIT/AI TESTS ===');
try { out.push(fs.readdirSync('.').filter(f => /^_test-(submit|cat|api)/.test(f)).join('\n')); } catch (e) { out.push(String(e)); }
out.push('=== API CATEGORIZE HEAD (root) ===');
try { out.push(fs.readFileSync('api/categorize.js', 'utf8').slice(0, 400)); } catch (e) { out.push('ERR ' + e.message); }
fs.writeFileSync('_info.txt', out.join('\n\n'));
console.log('done');