/* Throwaway: validate Milestones + Outcomes & Impact removal from project.html. Run: node _tab_check2.js */
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


/* 2. no orphans of either removed section */
['wsMilestones','wsOutcomes','tab-milestones','tab-outcomes','data-tab="milestones"','data-tab="outcomes"',
 "switchTab('milestones')","switchTab('outcomes')",'pr.milestones','pr.outcomes'].forEach(tok =>
  check(`no orphan: ${tok}`, !html.includes(tok)));

/* 3. tabbar now exactly the 6 expected tabs, in order */
const bar = html.match(/<div class="tabbar">([\s\S]*?)<\/div>/)[1];
const tabs = [...bar.matchAll(/data-tab="([^"]+)"/g)].map(x => x[1]);
check('tabbar order = ov, team, tasks, docs, discussion, funding',
  JSON.stringify(tabs) === JSON.stringify(['ov','team','tasks','docs','discussion','funding']), tabs.join(','));
check('Milestones tab gone', !bar.includes('Milestones'));
check('Outcomes & Impact tab gone', !bar.includes('Outcomes'));

/* 4. remaining panels + renders intact */
['tab-ov','tab-team','tab-tasks','tab-docs','tab-discussion','tab-funding'].forEach(id =>
  check(`panel ${id} present`, html.includes(`id="${id}"`)));
['wsPipeline','wsUpdates','wsOrgs','wsTasksBody','wsDocs','wsDiscussion','projFundList','projFundCount','CUR_REF']
  .forEach(id => check(`render for ${id} intact`, html.includes(`getElementById('${id}')`) || html.includes(`window.${id}`)));
check('wsProgress/overview intact', html.includes("getElementById('wsProgress')"));

/* 5. structural sanity: every tabpanel opened is closed, main closes once */
check('tabpanel count = 6', (html.match(/class="tabpanel/g) || []).length === 6);
check('</main> present once', (html.match(/<\/main>/g) || []).length === 1);

console.log(ok ? '\nALL SECTION-REMOVAL CHECKS PASSED' : '\nSOME CHECKS FAILED');
process.exitCode = ok ? 0 : 1;
