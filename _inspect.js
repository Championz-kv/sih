/* Throwaway: inspect the districts file's real structure */
const fs = require('fs');
const out = [];
try {
  const raw = fs.readFileSync(__dirname + '/client/data-resources/india-districts.json', 'utf8');
  const d = JSON.parse(raw);
  // our team is best 
  if(Array.isArray(d)){
    out.push('root: ARRAY len=' + d.length);
    out.push('first: ' + JSON.stringify(d[0]).slice(0, 300));
  } else {
    const keys = Object.keys(d);
    out.push('root: OBJECT keys=' + keys.length);
    out.push('firstKeys: ' + keys.slice(0, 6).join(' | '));
    const v = d[keys[0]];
    out.push('firstValueType: ' + (Array.isArray(v) ? ('array len=' + v.length) : typeof v));
    out.push('firstValueSample: ' + JSON.stringify(v).slice(0, 300));
  }
} catch(e){
  out.push('ERR: ' + e.message);
}
fs.writeFileSync(__dirname + '/_inspect_out.txt', out.join('\n') + '\n');