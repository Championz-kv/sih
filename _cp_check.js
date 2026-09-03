/* Throwaway: validate create-project form edits. Run: node _cp_check.js */
const fs = require('fs');
let ok = true;
const check = (name, pass, detail) => { console.log((pass ? 'OK   ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); if(!pass) ok = false; };

const cp = fs.readFileSync(__dirname + '/client/create-project.html', 'utf8');
const mp = fs.readFileSync(__dirname + '/client/my-projects.html', 'utf8');

/* 1. inline scripts still parse */
[cp, mp].forEach((html, k) => {
  const name = k === 0 ? 'create-project.html' : 'my-projects.html';
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m, i = 0;
  while((m = re.exec(html))){
    i++;
    try{ new Function(m[1]); check(`${name} inline #${i} syntax`, true); }
    catch(e){ check(`${name} inline #${i} syntax`, false, e.message); }
  }
});

/* 2. renames applied */
check('label is now "Case ID *"', cp.includes('<label>Case ID *</label>'));
check('placeholder references Case ID', cp.includes('Auto-filled from the Case ID, or type it here'));
check("validation says 'Case ID'", cp.includes("need.push('Case ID')"));
check('button is now "Add project"', cp.includes('>Add project</button>'));

/* 3. old names gone */
check('no "Problem ID" text left', !cp.includes('Problem ID'));
check('no "Save Project" left', !cp.includes('Save Project'));

/* 4. members/mentors + faculty mentor + team size fully removed */
['Members / mentors','memberRows','memberRowHTML','addMemberRow','removeMemberRow','memberCount',
 'suggestTeamSize','teamSizeTouched','fTeamSize','Faculty mentor','Team size','field-row'].forEach(tok =>
  check(`no orphan: ${tok}`, !cp.includes(tok)));

/* 5. remaining form + JS intact */
['fProblemId','fProblemTitle','fSummary','fLead','fStart','fDocs','docZone','docList','docFiles',
 'renderDocList','removeDoc','handleDocFiles','autofillProblemTitle','clearForm','saveProject',
 'initDefaults','MY_ORG','ss_demo_projects'].forEach(tok => check(`intact: ${tok}`, cp.includes(tok)));
check('saved object no longer writes team', !/team:\s*parseInt/.test(cp));
check('start-date field kept with its hint', cp.includes('Pre-filled with today — edit it to any other start date.'));

/* 6. my-projects.html tolerant of missing team */
check('my-projects: members shown only when pr.team exists', mp.includes("${pr.team ? ' · ' + pr.team + ' member' + (pr.team === 1 ? '' : 's') : ''}"));
check('my-projects: old unconditional team render gone', !mp.includes('· ${pr.team} member'));

console.log(ok ? '\nALL CREATE-PROJECT CHECKS PASSED' : '\nSOME CHECKS FAILED');
process.exitCode = ok ? 0 : 1;
