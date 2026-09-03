/* Throwaway: inspect the live Supabase "problems" table (schema + sample rows) */
const fs = require('fs');

const SUPABASE_URL = 'https://chwvtrcxnfqfkwlaxxbo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNod3Z0cmN4bmZxZmt3bGF4eGJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3MDczNjUsImV4cCI6MjEwMzI4MzM2NX0.RS5UcZDMG4hYV4ksztZvxDIO51LJVP9GkRjpJQD1ZoY';
const HEADERS = { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY };

const out = [];
async function get(path, accept){
  const res = await fetch(SUPABASE_URL + path, { headers: Object.assign({}, HEADERS, accept ? { Accept: accept } : {}) });
  const text = await res.text();
  return { status: res.status, text };
}
(async () => {
  try {
    /* 1) sample rows — reveals real column names + value shapes */
    const rows = await get('/rest/v1/problems?select=*&limit=3');
    out.push('GET /rest/v1/problems?select=*&limit=3 -> HTTP ' + rows.status);
    try {
      const arr = JSON.parse(rows.text);
      if(Array.isArray(arr)){
        out.push('rows returned: ' + arr.length);
        arr.forEach((r, i) => out.push('row[' + i + ']: ' + JSON.stringify(r)));
        if(arr.length){
          out.push('');
          out.push('--- column: type (from sample values) ---');
          Object.keys(arr[0]).forEach(k => out.push('  ' + k + ': ' + (arr[0][k] === null ? 'null' : typeof arr[0][k])));
        }
      } else {
        out.push('body: ' + rows.text.slice(0, 500));
      }
    } catch(e){ out.push('body (non-JSON): ' + rows.text.slice(0, 500)); }

    /* 2) OpenAPI root — authoritative column list + pg types for the table */
    const spec = await get('/rest/v1/', 'application/openapi+json');
    out.push('');
    out.push('GET /rest/v1/ (OpenAPI) -> HTTP ' + spec.status);
    try {
      const s = JSON.parse(spec.text);
      const def = s.definitions && s.definitions.problems;
      if(def){
        out.push('definitions.problems FOUND. required: ' + JSON.stringify(def.required || []));
        out.push('--- columns (name: pg_type) ---');
        Object.keys(def.properties || {}).forEach(k => {
          const pr = def.properties[k];
          out.push('  ' + k + ': ' + (pr.format || pr.type) + (pr.description ? '  // ' + pr.description : ''));
        });
      } else {
        out.push('definitions.problems NOT FOUND in OpenAPI. Tables exposed: ' +
          Object.keys((s.definitions) || {}).join(', '));
      }
      const pathDef = s.paths && s.paths['/problems'];
      if(pathDef && pathDef.post){
        out.push('POST /problems path exists with a post op (anon insert may be allowed)');
      }
    } catch(e){ out.push('OpenAPI parse failed: ' + e.message); }
  } catch(e){
    out.push('ERR: ' + e.message);
  }
  fs.writeFileSync(__dirname + '/_inspect_support_out.txt', out.join('\n') + '\n');
})();
