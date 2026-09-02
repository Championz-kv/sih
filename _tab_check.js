/* Throwaway: validate the project.html tab rename + members-bar removal. Run: node _tab_check.js */
const fs = require('fs');
let ok = true;
const check = (name, pass, detail) => { console.log((pass ? 'OK   ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if(!pass) ok = false; };

const html = fs.readFileSync(__dirname + '/client/project.html', 'utf8');

/* 1. all inline scripts still parse */
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
let m, i = 0;
while((m = re.exec(html))){
  i++;
  try{ new Function(m[1]); check(`project.html inline #${i} syntax`, true); }
  catch(e){ check(`project.html inline #${i} syntax`, false, e.message); }
}

/* 2. rename applied, exactly once */
check('tab renamed to Organisation', (html.match(/data-tab="team"[^>]*>Organisation<\/button>/g) || []).length === 1);
check('old "Members &amp; Orgs" label gone', !html.includes('Members &amp; Orgs') && !html.includes('Members & Orgs'));

/* 3. members bar fully removed (markup + JS), nothing orphaned */
check('"Members &amp; mentors" card removed', !html.includes('Members &amp; mentors') && !html.includes('Members & mentors'));
check('no orphaned wsMembers references', !html.includes('wsMembers'));

/* 4. surviving team panel is the single participating-organizations card */
const panel = html.match(/<div class="tabpanel" id="tab-team">[\s\S]*?<\/div>\s*<\/div>\s*/);
check('tab-team keeps wsOrgs container', /id="tab-team">[\s\S]*?id="wsOrgs"/.test(html));
check('tab-team has exactly one card now', (html.match(/id="tab-team">[\s\S]*?<\/div>\s*<\/div>\s*<div class="tabpanel" id="tab-milestones"/) || [''])[0].includes('card card-pad') && !/id="tab-team">[\s\S]*?tab-milestones/.test('id="wsMembers"'));

/* 5. downstream renders still present (milestones/tasks/docs/discussion/outcomes/funding) */
['wsMilestones','wsTasksBody','wsDocs','wsDiscussion','wsOutcomes','projFundList'].forEach(id =>
  check(`downstream render for ${id} intact`, html.includes(`getElementById('${id}')`)));

console.log(ok ? '\nALL TAB-EDIT CHECKS PASSED' : '\nSOME CHECKS FAILED');
process.exitCode = ok ? 0 : 1;
