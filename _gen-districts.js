/* Regenerates client/js/india-districts-fallback.js from
   client/data-resources/india-districts.json so the state/district
   dropdowns also work when the site is opened straight from disk (file://),
   where fetch() cannot read local files.
   Run after updating the JSON:   node _gen-districts.js */
   //epshita
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'client', 'data-resources', 'india-districts.json');
const dst = path.join(__dirname, 'client', 'js', 'india-districts-fallback.js');

const parsed = JSON.parse(fs.readFileSync(src, 'utf8'));
const arr = Array.isArray(parsed) ? parsed : parsed.states;
if(!Array.isArray(arr) || !arr.length) throw new Error('No states found in the JSON');

const js = '/* Auto-generated from data-resources/india-districts.json\n'
  + '   Regenerate after editing that JSON:  node _gen-districts.js  */\n'
  + 'window.INDIA_DISTRICTS_FALLBACK = '
  + JSON.stringify(arr.map(s => ({ state: s.state, districts: s.districts })))
  + ';';

fs.writeFileSync(dst, js, 'utf8');
console.log('Wrote ' + dst + '  (' + arr.length + ' states, '
  + arr.reduce((s,x)=> s + x.districts.length, 0) + ' districts)');