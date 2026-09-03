/* Throwaway runtime smoke test for client/js/tasks.js. Run: node _task-smoke.js */
const fs = require('fs');
const code = fs.readFileSync('client/js/tasks.js', 'utf8');

/* ---------- minimal DOM stubs ---------- */
function optStub(){ return { value:'', textContent:'' }; }
function makeSelect(){
  const s = { options:[], selectedIndex:-1, _html:'' };
  Object.defineProperty(s, 'innerHTML', { get(){ return s._html; }, set(v){ s._html = v; s.options = []; s.selectedIndex = -1; } });
  Object.defineProperty(s, 'value', {
    get(){ const o = s.options[s.selectedIndex]; return o ? o.value : ''; },
    set(v){ s.selectedIndex = s.options.findIndex(o => o.value === v); }
  });
  s.appendChild = c => { s.options.push(c); return c; };
  s.insertBefore = c => { s.options.unshift(c); return c; };
  return s;
}
function makeEl(id){
  const stamp = { className:'', textContent:'' };
  const label = { querySelector(sel){ return sel === '.ms-stamp' ? stamp : null; } };
  return { id, innerHTML:'', textContent:'', value:'', style:{}, className:'',
    appendChild(){}, insertBefore(){},
    closest(){ return label; },
    querySelector(sel){ return sel === '.ms-stamp' ? stamp : null; } };
}
const registry = {};
const SELECT_IDS = ['taskOrgSelect','taskStatusSelect'];
function byId(id){
  if(!registry[id]) registry[id] = SELECT_IDS.includes(id) ? makeSelect() : makeEl(id);
  return registry[id];
}
const CALLS = { toast:[], open:[], close:[] };
const checkboxes = [];
const fakeWindow = { CUR_REF:'PRJ-TEST' };

const ORGS = [{name:'MMMUT'},{name:'NIT Jamshedpur'},{name:'Civica NGO'}];
const PIPELINE_STAGES = ['Proposed','Approved','Research','Development','Prototype','Testing','Deployment','Completed'];
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function formatDate(iso){
  const d = new Date(iso + 'T00:00:00');
  if(isNaN(d)) return iso;
  return d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear();
}
const api = new Function('window','document','ORGS','PIPELINE_STAGES','formatDate','esc','toast','openModal','closeModal',
  code + '\n;return { renderTasksTable, openAddTaskModal, addTask, openEditTaskModal, removeTask, openMilestonesModal, syncMilestoneStamp, saveMilestones, openEditSummaryModal, saveSummary, TASK_STATUS_OPTIONS, toDateInputValue };'
)(fakeWindow, {
  getElementById: byId,
  createElement: () => optStub(),
  querySelectorAll(){ return checkboxes; },
}, ORGS, PIPELINE_STAGES, formatDate, s => String(s),
  id => { CALLS.toast.push(id); registry.__lastToast = id; },
  id => CALLS.open.push(id),
  id => CALLS.close.push(id));

/* ---------- assertions ---------- */
let ok = true, n = 0;
function check(name, cond, extra){
  n++;
  if(cond){ console.log('PASS ' + name); }
  else { ok = false; console.log('FAIL ' + name + (extra ? ' :: ' + extra : '')); }
}

/* 1. status options exactly as specified */
check('status dropdown options', JSON.stringify(api.TASK_STATUS_OPTIONS) === JSON.stringify(['Not started','In progress','Completed']), JSON.stringify(api.TASK_STATUS_OPTIONS));

/* 2. seed render with Edit button per row */
api.renderTasksTable([['Site survey','MMMUT','In progress','2026-07-12'],['Draft plan','Civica NGO','Done','—']], 'PRJ-TEST');
const body = byId('wsTasksBody').innerHTML;
check('seed rows rendered', (body.match(/<tr>/g)||[]).length === 2);
check('edit button on rows', (body.match(/openEditTaskModal\(0\)/)||[]).length === 1 && body.includes('openEditTaskModal(1)'));
check('legacy Done still stamped', body.includes('>Done</span>'));

/* 3. org dropdown from CUR_PROJECT_ORGS */
fakeWindow.CUR_PROJECT_ORGS = ['NIT Jamshedpur'];
api.openAddTaskModal();
check('org options from project orgs', byId('taskOrgSelect').options.map(o=>o.value).join('|') === 'NIT Jamshedpur', byId('taskOrgSelect').options.map(o=>o.value).join('|'));
check('add modal resets', byId('taskNameInput').value === '' && byId('taskModalTitle').textContent === 'Add a new task');
check('remove btn hidden on add', byId('taskModalRemoveBtn').style.display === 'none');
check('status select filled', byId('taskStatusSelect').options.length === 3);

/* 4. add task */
byId('taskNameInput').value = '  Field testing round 1  ';
byId('taskStatusSelect').value = 'In progress';
byId('taskDueInput').value = '2026-01-01';
api.addTask();
const body2 = byId('wsTasksBody').innerHTML;
check('added row appears', body2.includes('Field testing round 1') && (body2.match(/<tr>/g)||[]).length === 3);
check('due date formatted', body2.includes('1 Jan 2026'));
check('modal closed after add', CALLS.close.includes('addTaskModal'));

/* 5. empty name rejected */
CALLS.toast.length = 0;
byId('taskNameInput').value = '   ';
api.addTask();
check('empty name rejected', CALLS.toast.join('|').includes('name') && (byId('wsTasksBody').innerHTML.match(/<tr>/g)||[]).length === 3);

/* 6. edit prefills; legacy Done -> Completed */
api.openEditTaskModal(1);
check('edit prefills name', byId('taskNameInput').value === 'Draft plan');
check('legacy status mapped', byId('taskStatusSelect').value === 'Completed', byId('taskStatusSelect').value);
check('org prefilled (injected option)', byId('taskOrgSelect').value === 'Civica NGO', byId('taskOrgSelect').options.map(o=>o.value).join('|'));
check('remove btn visible on edit', byId('taskModalRemoveBtn').style.display === '');
byId('taskNameInput').value = 'Draft plan v2';
byId('taskDueInput').value = '2026-02-02';
api.addTask();
const body3 = byId('wsTasksBody').innerHTML;
check('edit saved in place', body3.includes('Draft plan v2') && !body3.includes('>Draft plan<') && (body3.match(/<tr>/g)||[]).length === 3);
check('edited due date', body3.includes('2 Feb 2026'));

/* 7. remove task */
api.openEditTaskModal(0);
api.removeTask();
check('task removed', (byId('wsTasksBody').innerHTML.match(/<tr>/g)||[]).length === 2 && CALLS.toast.includes('Task removed'));

/* 8. date round-trip through the editable due-date input */
check('date round trip', api.toDateInputValue('01 Jan 2026') === '2026-01-01', api.toDateInputValue('01 Jan 2026'));

/* 9. milestones popup: 8 stages, seeded from CUR_STAGE_IDX, checkbox edit */
fakeWindow.CUR_STAGE_IDX = 3;
api.openMilestonesModal();
const ms = byId('milestonesList').innerHTML;
check('8 stages listed', (ms.match(/milestone-check/g)||[]).length === 8, String((ms.match(/milestone-check/g)||[]).length));
check('stages before idx pre-checked', (ms.match(/ checked/g)||[]).length === 3, String((ms.match(/ checked/g)||[]).length));
check('stage names shown', ms.includes('Prototype') && ms.includes('Completed'));
checkboxes.length = 0;
for(let i = 0; i < 8; i++){
  const cb = makeEl('cb' + i); cb.checked = (i < 3) || i === 5 || i === 6; cb._idx = i;
  checkboxes.push(cb);
}
const stampOf = cb => cb.closest('x').querySelector('.ms-stamp');
checkboxes[3].checked = true;
api.syncMilestoneStamp(checkboxes[3]);
check('stamp flips to Completed', stampOf(checkboxes[3]).textContent === 'Completed' && stampOf(checkboxes[3]).className.includes('stamp-resolved'));
checkboxes[3].checked = false;
api.syncMilestoneStamp(checkboxes[3]);
check('stamp flips back to Pending', stampOf(checkboxes[3]).textContent === 'Pending');
api.saveMilestones();
const pipe = byId('wsPipeline').innerHTML;
check('pipeline shows 8 steps', (pipe.match(/pipe-step/g)||[]).length === 8, String((pipe.match(/pipe-step/g)||[]).length));
check('checked milestones ticked on pipeline', (pipe.match(/✓/g)||[]).length === 5, String((pipe.match(/✓/g)||[]).length));
check('milestone modal closed', CALLS.close.includes('milestonesModal'));

/* 10. edit summary */
byId('wsSummary').textContent = 'Old summary.';
api.openEditSummaryModal();
check('summary prefilled', byId('summaryInput').value === 'Old summary.');
byId('summaryInput').value = '  New project summary text  ';
api.saveSummary();
check('summary saved trimmed', byId('wsSummary').textContent === 'New project summary text');
check('summary modal closed', CALLS.close.includes('editSummaryModal'));
CALLS.toast.length = 0;
byId('summaryInput').value = '   ';
api.saveSummary();
check('empty summary rejected', CALLS.toast.join('|').includes('empty'));

console.log('\n' + (ok ? 'ALL ' + n + ' CHECKS PASSED' : 'FAILURES PRESENT'));
process.exit(ok ? 0 : 1);
