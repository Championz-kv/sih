/* ---------------- project tasks (Add / Edit a task) ----------------
   Shared helpers for the Tasks tab on both project workspace pages.

   The task popup (add + edit) lives in shell.js; this file wires it up,
   fills its fields and renders seed + added tasks straight into
   #wsTasksBody, with an Edit action at the right side of every row. */

const TASK_STATUS_OPTIONS = ['In progress', 'Not started', 'Done', 'Due'];
const ADDED_TASKS = {};
const TASK_SEEDS = {};
let TASK_EDIT = null;   /* { key, idx } while an existing row is being edited */

const TASK_OWNERS = () => {
  const names = (typeof ORGS !== 'undefined' && Array.isArray(ORGS)) ? ORGS.map(o => o.name) : [];
  return names.length ? names : ['MMMUT', 'Team'];
};

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
  const sel = document.getElementById('taskOwnerSelect');
  if(sel){
    sel.innerHTML = '';
    TASK_OWNERS().forEach(o => {
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
  const stVal = (row[2] === 'Completed') ? 'Done' : row[2];  /* legacy seeds */
  if(st){ st.value = stVal; if(st.selectedIndex === -1 && st.options.length) st.selectedIndex = 0; }
  const sel = document.getElementById('taskOwnerSelect');
  if(sel){ sel.value = row[1]; if(sel.selectedIndex === -1 && sel.options.length) sel.selectedIndex = 0; }
  const dd = document.getElementById('taskDueInput'); if(dd) dd.value = toDateInputValue(row[3]);
  const tt = document.getElementById('taskModalTitle'); if(tt) tt.textContent = 'Edit task';
  const sb = document.getElementById('taskModalSubmit'); if(sb) sb.textContent = 'Save changes';
  openModal('addTaskModal');
}

function addTask(){
  const nameEl = document.getElementById('taskNameInput');
  const ownerEl = document.getElementById('taskOwnerSelect');
  const statusEl = document.getElementById('taskStatusSelect');
  const dueEl = document.getElementById('taskDueInput');
  if(!nameEl || !ownerEl || !statusEl) return;
  const name = nameEl.value.trim();
  if(!name){ toast('Please enter a task name'); return; }
  const dueRaw = dueEl ? String(dueEl.value || '').trim() : '';
  const due = dueRaw ? formatDate(dueRaw) : '\u2014';
  const wasEdit = !!(TASK_EDIT && typeof TASK_EDIT.idx === 'number');
  const key = (TASK_EDIT && TASK_EDIT.key) ? TASK_EDIT.key : currentTaskKey();
  if(wasEdit){
    const seeds = TASK_SEEDS[key] || [];
    if(TASK_EDIT.idx < seeds.length){
      seeds[TASK_EDIT.idx] = [name, ownerEl.value, statusEl.value, due];
    } else {
      const added = ADDED_TASKS[key] || [];
      added[TASK_EDIT.idx - seeds.length] = [name, ownerEl.value, statusEl.value, due];
    }
  } else {
    if(!ADDED_TASKS[key]) ADDED_TASKS[key] = [];
    ADDED_TASKS[key].push([name, ownerEl.value, statusEl.value, due]);
  }
  renderTasksTable(TASK_SEEDS[key] || [], key);
  TASK_EDIT = null;
  closeModal('addTaskModal');
  toast(wasEdit ? 'Task updated' : 'Task added');
}

/* Classic scripts put these on window already; pin them so the inline
   onclick handlers keep working even if loading changes later. */
window.taskStatusStamp = taskStatusStamp;
window.renderTasksTable = renderTasksTable;
window.openAddTaskModal = openAddTaskModal;
window.openEditTaskModal = openEditTaskModal;
window.addTask = addTask;