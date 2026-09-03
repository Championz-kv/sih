/* ---- project tasks (Add / Edit / Remove) + milestones + summary ----
   Shared helpers for the Overview and Tasks tabs on both project
   workspace pages.

   The task popup (add + edit), the milestones popup and the edit-summary
   popup live in shell.js; this file wires them up, fills their fields and
   renders seed + added tasks straight into #wsTasksBody, with an Edit
   action (and Remove inside the popup) for every row. */

const TASK_STATUS_OPTIONS = ['Not started', 'In progress', 'Completed'];
const ADDED_TASKS = {};
const TASK_SEEDS = {};
const MILESTONES_DONE = {};   /* project ref -> [bool per project-cycle stage] */
let TASK_EDIT = null;   /* { key, idx } while an existing row is being edited */

/* Dropdown options for the Organisation field: the collaborating
   organisations of the open project (window.CUR_PROJECT_ORGS), falling
   back to the full ORGS directory. */
const TASK_ORGS = () => {
  const cur = (Array.isArray(window.CUR_PROJECT_ORGS)) ? window.CUR_PROJECT_ORGS.filter(Boolean) : [];
  if(cur.length) return cur;
  const names = (typeof ORGS !== 'undefined' && Array.isArray(ORGS)) ? ORGS.map(o => o.name) : [];
  return names.length ? names : ['Team'];
};

/* Keep a stored value selectable even when it is not in the option list. */
function ensureSelectOption(sel, value){
  if(!sel || !value) return;
  for(let i = 0; i < sel.options.length; i++){
    if(sel.options[i].value === value) return;
  }
  const opt = document.createElement('option');
  opt.value = value; opt.textContent = value;
  sel.insertBefore(opt, sel.firstChild);
}

/* Status stamp - loose class reuse so all states keep the existing look. */
function taskStatusStamp(status){
  if(status === 'Done')        return '<span class="stamp stamp-resolved">Done</span>';
  if(status === 'Completed')   return '<span class="stamp stamp-resolved">Completed</span>';
  if(status === 'In progress') return '<span class="stamp stamp-open">In progress</span>';
  if(status === 'Due')         return '<span class="stamp stamp-critical">Due</span>';
  return '<span class="stamp stamp-pending">Not started</span>';
}

/* Best-effort conversion of a stored due value to the yyyy-mm-dd a date input expects. */
function toDateInputValue(v){
  if(!v) return '';
  const s = String(v).trim();
  if(s.length === 10 && s.charAt(4) === '-' && s.charAt(7) === '-') return s;
  if(s.indexOf('-') !== -1 && s.split('-')[0].length === 4) return s;
  const dt = new Date(s);
  if(!isNaN(dt.getTime())) {
    const m = ('0' + (dt.getMonth() + 1)).slice(-2);
    const d = ('0' + dt.getDate()).slice(-2);
    return dt.getFullYear() + '-' + m + '-' + d;
  }
  return '';
}

/* One row - seed or added - with an Edit button at the right side. */
function taskRowHTML(row, i){
  return '<tr>' +
    '<td>' + esc(row[0]) + '</td>' +
    '<td>' + esc(row[1]) + '</td>' +
    '<td>' + taskStatusStamp(row[2]) + '</td>' +
    '<td class="mono">' + esc(row[3]) + '</td>' +
    '<td style="text-align:right;">' +
    '<button class="btn btn-outline btn-sm" title="Edit task" onclick="openEditTaskModal(' + i + ')">Edit</button>' +
    '</td></tr>';
}

/* Rebuild both dropdowns from the shared option lists (called on every open). */
function fillTaskModalSelects(){
  const sel = document.getElementById('taskOrgSelect');
  if(sel){
    sel.innerHTML = '';
    TASK_ORGS().forEach(o => {
      const opt = document.createElement('option');
      opt.value = o; opt.textContent = o;
      sel.appendChild(opt);
    });
  }
  const st = document.getElementById('taskStatusSelect');
  if(st){
    st.innerHTML = '';
    TASK_STATUS_OPTIONS.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v; opt.textContent = v;
      st.appendChild(opt);
    });
  }
}

function currentTaskKey(){
  return window.CUR_REF || 'default';
}

/* Combined display list for the current project (seeds first, then added). */
function taskRowsFor(key){
  return (TASK_SEEDS[key] || []).concat(ADDED_TASKS[key] || []);
}

function renderTasksTable(seedRows, ref){
  const key = ref || '';
  TASK_SEEDS[key] = seedRows || [];
  if(key) window.CUR_REF = key;
  const rows = taskRowsFor(key);
  const body = document.getElementById('wsTasksBody');
  if(!body) return;
  body.innerHTML = rows.length
    ? rows.map((r, i) => taskRowHTML(r, i)).join('')
    : '<tr><td colspan="5" style="text-align:center; color:var(--text-faint); padding:22px 12px;">No tasks yet.</td></tr>';
}


function openAddTaskModal(){
  TASK_EDIT = null;
  fillTaskModalSelects();
  const nm = document.getElementById('taskNameInput'); if(nm) nm.value = '';
  const dd = document.getElementById('taskDueInput');  if(dd) dd.value = '';
  const st = document.getElementById('taskStatusSelect'); if(st) st.selectedIndex = 0;
  const org = document.getElementById('taskOrgSelect'); if(org) org.selectedIndex = 0;
  const rm = document.getElementById('taskModalRemoveBtn'); if(rm) rm.style.display = 'none';
  const tt = document.getElementById('taskModalTitle'); if(tt) tt.textContent = 'Add a new task';
  const sb = document.getElementById('taskModalSubmit'); if(sb) sb.textContent = 'Add task';
  openModal('addTaskModal');
}

function openEditTaskModal(idx){
  const key = currentTaskKey();
  const row = taskRowsFor(key)[idx];
  if(!row){ toast('Task not found'); return; }
  TASK_EDIT = { key: key, idx: idx };
  fillTaskModalSelects();
  const nm = document.getElementById('taskNameInput'); if(nm) nm.value = row[0];
  const st = document.getElementById('taskStatusSelect');
  const stVal = (row[2] === 'Done') ? 'Completed' : row[2];  /* legacy seeds */
  if(st){ st.value = stVal; if(st.selectedIndex === -1 && st.options.length) st.selectedIndex = 0; }
  const sel = document.getElementById('taskOrgSelect');
  if(sel){ ensureSelectOption(sel, row[1]); sel.value = row[1]; if(sel.selectedIndex === -1 && sel.options.length) sel.selectedIndex = 0; }
  const dd = document.getElementById('taskDueInput'); if(dd) dd.value = toDateInputValue(row[3]);
  const rm = document.getElementById('taskModalRemoveBtn'); if(rm) rm.style.display = '';
  const tt = document.getElementById('taskModalTitle'); if(tt) tt.textContent = 'Edit task';
  const sb = document.getElementById('taskModalSubmit'); if(sb) sb.textContent = 'Save changes';
  openModal('addTaskModal');
}

function addTask(){
  const nameEl = document.getElementById('taskNameInput');
  const orgEl = document.getElementById('taskOrgSelect');
  const statusEl = document.getElementById('taskStatusSelect');
  const dueEl = document.getElementById('taskDueInput');
  if(!nameEl || !orgEl || !statusEl) return;
  const name = nameEl.value.trim();
  if(!name){ toast('Please enter a task name'); return; }
  const dueRaw = dueEl ? String(dueEl.value || '').trim() : '';
  const due = dueRaw ? formatDate(dueRaw) : '\u2014';
  const wasEdit = !!(TASK_EDIT && typeof TASK_EDIT.idx === 'number');
  const key = (TASK_EDIT && TASK_EDIT.key) ? TASK_EDIT.key : currentTaskKey();
  if(wasEdit){
    const seeds = TASK_SEEDS[key] || [];
    if(TASK_EDIT.idx < seeds.length){
      seeds[TASK_EDIT.idx] = [name, orgEl.value, statusEl.value, due];
    } else {
      const added = ADDED_TASKS[key] || [];
      added[TASK_EDIT.idx - seeds.length] = [name, orgEl.value, statusEl.value, due];
    }
  } else {
    if(!ADDED_TASKS[key]) ADDED_TASKS[key] = [];
    ADDED_TASKS[key].push([name, orgEl.value, statusEl.value, due]);
  }
  renderTasksTable(TASK_SEEDS[key] || [], key);
  if(typeof window.persistTasksHook === 'function') window.persistTasksHook(taskRowsFor(key));
  TASK_EDIT = null;
  closeModal('addTaskModal');
  toast(wasEdit ? 'Task updated' : 'Task added');
}

/* ---- Remove the task currently being edited (button in the popup) ---- */
function removeTask(){
  if(!TASK_EDIT || typeof TASK_EDIT.idx !== 'number'){ closeModal('addTaskModal'); return; }
  const key = TASK_EDIT.key;
  const seeds = TASK_SEEDS[key] || [];
  if(TASK_EDIT.idx < seeds.length){
    seeds.splice(TASK_EDIT.idx, 1);
  } else {
    const added = ADDED_TASKS[key] || [];
    added.splice(TASK_EDIT.idx - seeds.length, 1);
  }
  renderTasksTable(TASK_SEEDS[key] || [], key);
  if(typeof window.persistTasksHook === 'function') window.persistTasksHook(taskRowsFor(key));
  TASK_EDIT = null;
  closeModal('addTaskModal');
  toast('Task removed');
}

/* ---- Project milestones: the 8 stages of the project cycle ----
   Checkbox list in the milestones popup; saved state re-renders the
   pipeline strip with completed stages FILLED with colour. */
function cycleStages(){
  return (typeof PIPELINE_STAGES !== 'undefined' && PIPELINE_STAGES.length) ? PIPELINE_STAGES : [];
}

function currentStageIdx(){
  return (typeof window.CUR_STAGE_IDX === 'number') ? window.CUR_STAGE_IDX : 0;
}

function milestoneRowHTML(label, i, done){
  return '<label style="display:flex; align-items:center; gap:10px; padding:9px 12px; border:1px solid var(--border); border-radius:8px; cursor:pointer;">' +
    '<input type="checkbox" class="milestone-check" data-idx="' + i + '"' + (done ? ' checked' : '') + ' onchange="syncMilestoneStamp(this)">' +
    '<span class="mono" style="color:var(--text-faint); font-size:11px; width:14px;">' + (i + 1) + '</span>' +
    '<b style="font-weight:600; font-size:13px;">' + esc(label) + '</b>' +
    '<span class="stamp ' + (done ? 'stamp-resolved' : 'stamp-pending') + ' ms-stamp" style="margin-left:auto;">' + (done ? 'Completed' : 'Pending') + '</span>' +
  '</label>';
}

function openMilestonesModal(){
  const list = document.getElementById('milestonesList');
  if(!list) return;
  const stages = cycleStages();
  if(!stages.length){
    list.innerHTML = '<p class="hint" style="margin:0;">No project cycle stages are defined for this workspace.</p>';
  } else {
    const saved = MILESTONES_DONE[currentTaskKey()];
    const fromDb = Array.isArray(window.CUR_PROJECT_MILESTONES) ? window.CUR_PROJECT_MILESTONES : [];
    const done = (saved && saved.length === stages.length)
      ? saved
      : (fromDb.length
          ? stages.map((s, i) => fromDb.indexOf(i + 1) !== -1)      /* DB milestones */
          : stages.map((s, i) => i < currentStageIdx()));           /* new project: seed from its current stage */
    list.innerHTML = stages.map((label, i) => milestoneRowHTML(label, i, done[i])).join('');
  }
  openModal('milestonesModal');
}

function syncMilestoneStamp(cb){
  const row = cb.closest('label');
  const stamp = row ? row.querySelector('.ms-stamp') : null;
  if(!stamp) return;
  stamp.className = 'stamp ' + (cb.checked ? 'stamp-resolved' : 'stamp-pending') + ' ms-stamp';
  stamp.textContent = cb.checked ? 'Completed' : 'Pending';
}

function saveMilestones(){
  const key = currentTaskKey();
  const boxes = Array.prototype.slice.call(document.querySelectorAll('#milestonesList .milestone-check'));
  if(boxes.length) MILESTONES_DONE[key] = boxes.map(b => !!b.checked);
  if(boxes.length && typeof window.persistMilestonesHook === 'function'){
    const nums = [];
    MILESTONES_DONE[key].forEach((d, i) => { if(d) nums.push(i + 1); });
    window.persistMilestonesHook(nums);
  }
  closeModal('milestonesModal');
  renderPipelineFromMilestones(key);
  toast('Milestones updated');
}

/* Pipeline strip: a completed stage (checkbox ticked / DB milestone) is
   FILLED with colour instead of showing a tick mark. */
function renderPipelineFromMilestones(key){
  const el = document.getElementById('wsPipeline');
  const stages = cycleStages();
  if(!el || !stages.length) return;
  const k = key || currentTaskKey();
  let done;
  if(MILESTONES_DONE[k] && MILESTONES_DONE[k].length){
    done = MILESTONES_DONE[k];                                    /* saved this session */
  } else if(Array.isArray(window.CUR_PROJECT_MILESTONES) && window.CUR_PROJECT_MILESTONES.length){
    done = stages.map((s, i) => window.CUR_PROJECT_MILESTONES.indexOf(i + 1) !== -1);  /* DB milestones */
  } else {
    done = stages.map((s, i) => i < currentStageIdx());           /* new project fallback */
  }
  el.innerHTML = stages.map((label, i) => {
    const complete = !!done[i];
    return '<div class="pipe-step' + (complete ? ' done' : '') + '"><div class="n">' + (i + 1) + '</div><div class="lbl">' + label + '</div></div>';
  }).join('');
}

/* ---- Edit the project summary (Overview tab) ---- */
function openEditSummaryModal(){
  const el = document.getElementById('wsSummary');
  const ta = document.getElementById('summaryInput');
  if(ta && el) ta.value = el.textContent.trim();
  openModal('editSummaryModal');
}

function saveSummary(){
  const ta = document.getElementById('summaryInput');
  if(!ta) return;
  const text = ta.value.trim();
  if(!text){ toast('Summary cannot be empty'); return; }
  const el = document.getElementById('wsSummary');
  if(el){ el.textContent = text; el.style.whiteSpace = 'pre-wrap'; }
  if(typeof window.persistSummaryHook === 'function') window.persistSummaryHook(text);
  closeModal('editSummaryModal');
  toast('Summary updated');
}

/* Classic scripts put these on window already; pin them so the inline
   onclick handlers keep working even if loading changes later. */
window.taskStatusStamp = taskStatusStamp;
window.renderTasksTable = renderTasksTable;
window.openAddTaskModal = openAddTaskModal;
window.openEditTaskModal = openEditTaskModal;
window.addTask = addTask;
window.removeTask = removeTask;
window.openMilestonesModal = openMilestonesModal;
window.syncMilestoneStamp = syncMilestoneStamp;
window.saveMilestones = saveMilestones;
window.renderPipelineFromMilestones = renderPipelineFromMilestones;
window.openEditSummaryModal = openEditSummaryModal;
window.saveSummary = saveSummary;