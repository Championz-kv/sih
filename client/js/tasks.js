/* ---------------- project tasks (Add a new task) ----------------
   Shared helpers for the Tasks tab on both project workspace pages.
   The "Add a new task" modal lives in shell.js; this file wires it up
   and renders added tasks straight into the #wsTasksBody table. */
const TASK_STATUS_OPTIONS = ['In progress', 'Not started', 'Done', 'Due'];
const ADDED_TASKS = {};
const TASK_SEEDS = {};
const TASK_OWNERS = () => {
  const names = (typeof ORGS !== 'undefined' && Array.isArray(ORGS)) ? ORGS.map(o => o.name) : [];
  return names.length ? names : ['MMMUT', 'Team'];
};

function taskStatusStamp(status){
  if(status === 'Done')        return '<span class="stamp stamp-resolved">Done</span>';
  if(status === 'In progress') return '<span class="stamp stamp-open">In progress</span>';
  if(status === 'Due')         return '<span class="stamp stamp-critical">Due</span>';
  return '<span class="stamp stamp-pending">Not started</span>';
}

function renderTasksTable(seedRows, ref){
  const key = ref || '';
  TASK_SEEDS[key] = seedRows || [];
  if(key) window.CUR_REF = key;
  const rows = (TASK_SEEDS[key] || []).concat(ADDED_TASKS[key] || []);
  const body = document.getElementById('wsTasksBody');
  if(!body) return;
  body.innerHTML = rows.length
    ? rows.map(([t,o,s,d]) => '<tr><td>' + esc(t) + '</td><td>' + esc(o) + '</td><td>' + taskStatusStamp(s) + '</td><td class="mono">' + esc(d) + '</td></tr>').join("")
    : '<tr><td colspan="4" style="text-align:center; color:var(--text-faint); padding:22px 12px;">No tasks yet.</td></tr>';
}

function openAddTaskModal(){
  const sel = document.getElementById('taskOwnerSelect');
  if(sel){
    sel.innerHTML = '';
    TASK_OWNERS().forEach((o,i) => {
      const opt = document.createElement('option');
      opt.value = o; opt.textContent = o;
      if(i === 0) opt.selected = true;
      sel.appendChild(opt);
    });
  }
  const st = document.getElementById('taskStatusSelect');
  if(st && !st.options.length){
    TASK_STATUS_OPTIONS.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v; opt.textContent = v; st.appendChild(opt);
    });
  }
  const nm = document.getElementById('taskNameInput'); if(nm) nm.value = '';
  const dd = document.getElementById('taskDueInput');  if(dd) dd.value = '';
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
  const due = dueRaw ? formatDate(dueRaw) : '—';
  const key = window.CUR_REF || 'default';
  if(!ADDED_TASKS[key]) ADDED_TASKS[key] = [];
  ADDED_TASKS[key].push([name, ownerEl.value, statusEl.value, due]);
  renderTasksTable(TASK_SEEDS[key] || [], key);
  closeModal('addTaskModal');
  toast('Task added');
}