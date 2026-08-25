/* ===================================================================
   SolveSamaj — shared shell (topbar + sidebar + modals + toast host)
   Injected into every page so the nav only has to be edited in one
   place. Each page just needs:
     <body data-page="explore">
       <div id="app-topbar"></div>
       <div id="app-sidebar"></div>
       <div class="sidebar-backdrop" id="sidebarBackdrop" onclick="closeSidebar()"></div>
       <main class="main">...page content...</main>
       <div id="modal-mount"></div>
       <div class="toast-wrap" id="toastWrap"></div>
   =================================================================== */

const NAV = [
  { group:null, items:[
    { page:'overview', href:'dashboard.html', label:'Overview', icon:'<path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/>' },
    { page:'explore',  href:'explore.html', label:'Explore Problems', icon:'<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>' },
    { page:'orgdirectory', href:'organizations.html', label:'Organization Directory', icon:'<circle cx="9" cy="8" r="3"/><path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6"/><circle cx="17" cy="8" r="3"/><path d="M15.5 14.2c3.4.4 6 2.8 6 5.8"/>' },
  ]},
  { group:'citizen', label:'Problem Side', items:[
    { page:'submit',      href:'submit.html', label:'Report a Problem', icon:'<path d="M12 5v14M5 12h14"/>' },
    { page:'myproblems',  href:'my-problems.html', label:'My Problems', icon:'<path d="M9 12h6M9 16h6M9 8h6"/><rect x="4" y="4" width="16" height="16" rx="2"/>', count:PROBLEMS.slice(0,5).length },
  ]},
  { group:'org', label:'Solver Side', items:[
    { page:'orgprofile', href:'org-profile.html', label:'Organization Profile', icon:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>' },
    { page:'discover',   href:'discover.html', label:'Matched Problems', icon:'<polygon points="3 11 22 2 13 21 11 13 3 11"/>', count:PROBLEMS.filter(p=>["open","validated","review"].includes(p.status)).length },
    { page:'interests',  href:'interests.html', label:'Interests', icon:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>', count:PROBLEMS.filter(p=>p.orgs.length).length },
  ]},
  { group:null, label:'Collaboration', items:[
    { page:'projects', href:'projects.html', label:'Projects', icon:'<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>' },
    { page:'requests', href:'requests.html', label:'Collaboration Requests', icon:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>', count:3 },
    { page:'funding', href:'funding.html', label:'Funding', icon:'<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>', count:FUND_REQUESTS.filter(f => !fundIsFunded(f)).length },
  ]},
  { group:null, label:'Insights', items:[
    { page:'analytics', href:'analytics.html', label:'Public Analytics', icon:'<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>' },
  ]},
  { group:'admin', label:'Administration', items:[
    { page:'admin',  href:'admin.html', label:'Admin Dashboard', icon:'<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>' },
    { page:'verify', href:'verify.html', label:'Verification Queue', icon:'<path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/>', count:ORGS.filter(o=>!o.verified).length },
    { page:'review', href:'review.html', label:'Problem Review', icon:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>', count:REVIEW_QUEUE.length },
  ]},
  { group:null, items:[
    { page:'notifications', href:'notifications.html', label:'Notifications', icon:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>', count:NOTIFICATIONS.length },
    { page:'chatbot', href:'chatbot.html', label:'AI Assistant', icon:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' },
    { page:'team', href:'team.html', label:'About & Team', icon:'<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>' },
  ]},
];

function svgIcon(paths){ return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${paths}</svg>`; }

function renderTopbar(){
  return `
  <header class="topbar">
    <button class="menu-toggle" id="menuToggle" aria-label="Toggle menu">${svgIcon('<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>')}</button>
    <a class="brand" href="dashboard.html${paramStr()}" style="text-decoration:none;">
      <div class="brand-mark">S</div>
      <div class="brand-text"><b>SolveSamaj</b><span>Innovation Portal</span></div>
    </a>
    <div class="topbar-search">
      ${svgIcon('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>')}
      <input type="text" id="globalSearch" placeholder="Search problems, organizations, case no...">
    </div>
    <div class="topbar-spacer"></div>
    <div class="topbar-right">
      <div class="role-switch">
        <button class="role-btn" id="roleBtn" onclick="toggleRoleMenu()">
          <span class="dot"></span> <span id="roleLabel">Viewing as Citizen</span>
          ${svgIcon('<polyline points="6 9 12 15 18 9"/>')}
        </button>
        <div class="role-menu" id="roleMenu">
          <button data-role="citizen" onclick="setRole('citizen')"><b>Citizen</b><small>Report &amp; track problems</small></button>
          <button data-role="org" onclick="setRole('org')"><b>Organization</b><small>University · NGO · Industry</small></button>
          <button data-role="admin" onclick="setRole('admin')"><b>Government Admin</b><small>Review &amp; monitor</small></button>
        </div>
      </div>
      <button class="icon-btn" onclick="go('notifications.html')" title="Notifications">
        ${svgIcon('<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>')}
        <span class="ping" id="topbarPing">${NOTIFICATIONS.length}</span>
      </button>
      <button class="icon-btn theme-toggle" onclick="toggleTheme()" title="Toggle theme">
        <svg class="icon-sun" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
        <svg class="icon-moon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>
      </button>
      <button class="avatar-btn" onclick="openModal('loginModal')">
        <span class="avatar" id="avatarInit">GD</span>
        <span id="avatarName">Guest Desk</span>
      </button>
    </div>
  </header>`;
}

function renderSidebar(activePage){
  const groups = NAV.map(g => {
    const attr = g.group ? ` data-role-group="${g.group}" style="display:none;"` : '';
    const label = g.label ? `<div class="nav-group-label">${g.label}</div>` : '';
    const items = g.items.map(it => {
      const active = it.page === activePage ? ' active' : '';
      const count = (it.count !== undefined && it.count !== null) ? `<span class="count">${it.count}</span>` : '';
      return `<a class="nav-item${active}" data-page="${it.page}" href="${it.href}${paramStr()}">${svgIcon(it.icon)}${it.label}${count}</a>`;
    }).join('');
    return `<div class="nav-group"${attr}>${label}${items}</div>`;
  }).join('');

  return `
  <nav class="sidebar" id="sidebar">
    ${groups}
    <div class="sidebar-foot"><p class="mono">SolveSamaj v0.2 · Team KUEST-L · Prototype</p></div>
  </nav>`;
}

function renderModals(){
  return `
  <div class="modal-overlay" id="loginModal">
    <div class="modal">
      <div class="modal-head"><h3>Log in to SolveSamaj</h3><button class="close-x" onclick="closeModal('loginModal')">✕</button></div>
      <div class="modal-body">
        <div class="tabbar" style="margin-bottom:16px;">
          <button class="tabbtn active" data-ltab="citizen" onclick="switchLoginTab('citizen')">Citizen</button>
          <button class="tabbtn" data-ltab="org" onclick="switchLoginTab('org')">Organization</button>
          <button class="tabbtn" data-ltab="admin" onclick="switchLoginTab('admin')">Admin</button>
        </div>
        <div class="field"><label>Email or mobile number</label><input class="input" placeholder="you@example.com"></div>
        <div class="field"><label>Password</label><input class="input" type="password" placeholder="••••••••"></div>
        <p class="hint">Placeholder screen — no authentication is wired up yet. "Continue" will just switch your viewing role and take you to that dashboard.</p>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline" onclick="closeModal('loginModal')">Cancel</button>
        <button class="btn btn-primary" onclick="mockLogin()">Continue</button>
      </div>
    </div>
  </div>

  <div class="modal-overlay" id="interestModal">
    <div class="modal">
      <div class="modal-head"><h3>Express Interest</h3><button class="close-x" onclick="closeModal('interestModal')">✕</button></div>
      <div class="modal-body">
        <div class="field"><label>Proposed approach</label><textarea class="input" placeholder="How would your organization approach this problem?"></textarea></div>
        <div class="field"><label>Resources you'd bring</label><input class="input" placeholder="e.g. IoT lab, 6 student researchers, 2 faculty mentors"></div>
        <div class="field"><label>Estimated timeline</label>
          <select class="input"><option>1–3 months</option><option>3–6 months</option><option>6–12 months</option><option>12+ months</option></select>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline" onclick="closeModal('interestModal')">Cancel</button>
        <button class="btn btn-primary" onclick="closeModal('interestModal'); toast('Interest sent to the problem owner (placeholder)')">Send interest</button>
      </div>
    </div>
  </div>

  <div class="modal-overlay" id="inviteModal">
    <div class="modal">
      <div class="modal-head"><h3>Invite a Collaborator</h3><button class="close-x" onclick="closeModal('inviteModal')">✕</button></div>
      <div class="modal-body">
        <div class="field"><label>Organization</label><input class="input" placeholder="Search verified organizations..."></div>
        <div class="field"><label>Role in project</label>
          <select class="input"><option>Technical partner</option><option>Implementation partner</option><option>Funding partner</option><option>Research partner</option></select>
        </div>
        <div class="field"><label>Note</label><textarea class="input" placeholder="Briefly explain what you need from them"></textarea></div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline" onclick="closeModal('inviteModal')">Cancel</button>
        <button class="btn btn-primary" onclick="closeModal('inviteModal'); toast('Invitation sent (placeholder)')">Send invitation</button>
      </div>
    </div>

  <div class="modal-overlay" id="donateModal">
    <div class="modal">
      <div class="modal-head"><h3>Support this request</h3><button class="close-x" onclick="closeModal('donateModal')">✕</button></div>
      <div class="modal-body">
        <p id="donateReqTitle" style="font-weight:600; margin:0 0 2px;"></p>
        <p id="donateReqMeta" class="hint" style="margin-top:0;"></p>
        <div class="field"><label>I'm contributing as</label>
          <select class="input" id="donorType" onchange="donorTypeChanged()">
            <option value="individual">Individual</option>
            <option value="org">Organization</option>
          </select>
        </div>
        <div class="field" id="donorIndField"><label>Your name</label><input class="input" id="donorName" placeholder="e.g. Ravi Kumar"></div>
        <div class="field" id="donorOrgField" style="display:none;"><label>Organization</label>
          <select class="input" id="donorOrg">${ORGS.map(o => '<option>' + o.name + '</option>').join('')}</select>
        </div>
        <div class="field"><label>Amount (₹)</label><input class="input" id="donorAmount" type="number" min="100" step="100" placeholder="Partial amounts are welcome">
          <p class="hint">Payment is simulated in this prototype — the case/project owner verifies each receipt.</p>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline" onclick="closeModal('donateModal')">Cancel</button>
        <button class="btn btn-primary" onclick="submitDonation()">Record contribution</button>
      </div>
    </div>
  </div>

  <div class="modal-overlay" id="requestFundModal">
    <div class="modal">
      <div class="modal-head"><h3>Request funds</h3><button class="close-x" onclick="closeModal('requestFundModal')">✕</button></div>
      <div class="modal-body">
        <p class="hint" style="margin-top:0;">Posted publicly so organizations and individuals can pledge support. You verify each receipt as payments come in.</p>
        <div class="field"><label>Purpose — what the funds are for</label><input class="input" id="rfTitle" placeholder="e.g. Water testing kits & lab analysis"></div>
        <div class="field"><label>Details</label><textarea class="input" id="rfDesc" placeholder="Breakdown, vendors, timeline…"></textarea></div>
        <div class="field"><label>Target amount (₹)</label><input class="input" id="rfTarget" type="number" min="500" step="500"></div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline" onclick="closeModal('requestFundModal')">Cancel</button>
        <button class="btn btn-primary" onclick="submitFundRequest()">Post request</button>
      </div>
    </div>
  </div>`;
}

/* ---------------- funding (pledge → owner verifies receipt) ---------------- */
let fundCtx = null;

function openDonate(reqId){
  const fr = fundById(reqId);
  if(!fr) return;
  fundCtx = reqId;
  document.getElementById('donateReqTitle').textContent = fr.title;
  document.getElementById('donateReqMeta').innerHTML =
    `${fr.kind === 'problem' ? 'Case #' + fr.ref : fr.ref} · ${inr(fundRaised(fr))} received of ${inr(fr.target)} · ${inr(Math.max(fr.target - fundRaised(fr), 0))} still needed`;
  document.getElementById('donorType').value = currentRole() === 'org' ? 'org' : 'individual';
  donorTypeChanged();
  document.getElementById('donorAmount').value = '';
  openModal('donateModal');
}
function donorTypeChanged(){
  const t = document.getElementById('donorType').value;
  document.getElementById('donorIndField').style.display = t === 'individual' ? 'block' : 'none';
  document.getElementById('donorOrgField').style.display = t === 'org' ? 'block' : 'none';
}
function submitDonation(){
  const fr = fundById(fundCtx);
  if(!fr) return;
  const type = document.getElementById('donorType').value;
  const name = type === 'org'
    ? document.getElementById('donorOrg').value
    : (document.getElementById('donorName').value.trim() || 'Anonymous donor');
  let amount = parseInt(document.getElementById('donorAmount').value, 10);
  if(!amount || amount <= 0){ toast('Enter a valid amount first'); return; }
  const remaining = Math.max(fr.target - fundRaised(fr), 0);
  if(remaining <= 0){ toast('This request is already fully funded 🎉'); closeModal('donateModal'); return; }
  if(amount > remaining){
    amount = remaining;
    toast('Capped to the remaining need — ' + inr(remaining));
  }
  fr.pledges.push({ by:name, type:type, amount:amount, status:'pledged' });
  closeModal('donateModal');
  toast('Contribution recorded — the ' + (fr.kind === 'problem' ? 'case owner' : 'project team') + ' will verify receipt');
  if(window.renderFunding) window.renderFunding();
}
function verifyPledge(reqId, idx){
  const fr = fundById(reqId);
  if(!fr || !fr.pledges[idx]) return;
  fr.pledges[idx].status = 'received';
  toast('Receipt verified — ' + inr(fr.pledges[idx].amount) + ' from ' + fr.pledges[idx].by);
  if(window.renderFunding) window.renderFunding();
}
function openRequestFund(kind, ref){
  fundCtx = { kind:kind, ref:ref };
  document.getElementById('rfTitle').value = '';
  document.getElementById('rfDesc').value = '';
  document.getElementById('rfTarget').value = '';
  openModal('requestFundModal');
}
function submitFundRequest(){
  const title = document.getElementById('rfTitle').value.trim();
  const target = parseInt(document.getElementById('rfTarget').value, 10);
  if(!title){ toast('Give the request a purpose first'); return; }
  if(!target || target <= 0){ toast('Enter a valid target amount'); return; }
  FUND_REQUESTS.unshift({
    id:'FR-' + (2405 + FUND_REQUESTS.length),
    kind:fundCtx.kind, ref:fundCtx.ref,
    title:title,
    desc:document.getElementById('rfDesc').value.trim(),
    target:target,
    postedBy:(currentRole() === 'org' ? 'MMMUT' : currentRole() === 'admin' ? 'Admin Desk' : 'Case Owner'),
    pledges:[]
  });
  closeModal('requestFundModal');
  toast('Fund request posted — visible under Funding');
  if(window.renderFunding) window.renderFunding();
}

/* ---------------- role handling ---------------- */
function toggleRoleMenu(){ document.getElementById('roleMenu').classList.toggle('open'); }
function setRole(role){
  storageSet('ss-role', role);
  const home = { citizen:'dashboard.html', org:'discover.html', admin:'admin.html' };
  go(home[role], { role: role });
}
function applyRoleUI(role){
  document.querySelectorAll('.role-menu button').forEach(b => b.classList.toggle('active', b.dataset.role === role));
  const labels = { citizen:'Viewing as Citizen', org:'Viewing as Organization', admin:'Viewing as Gov. Admin' };
  const lbl = document.getElementById('roleLabel'); if(lbl) lbl.textContent = labels[role];
  document.querySelectorAll('[data-role-group]').forEach(g => g.style.display = (g.dataset.roleGroup === role) ? 'flex' : 'none');
  const avatars = { citizen:['GD','Guest Desk'], org:['MU','MMMUT Desk'], admin:['AD','Admin Desk'] };
  const ai = document.getElementById('avatarInit'), an = document.getElementById('avatarName');
  if(ai) ai.textContent = avatars[role][0];
  if(an) an.textContent = avatars[role][1];
}
function mockLogin(){
  const activeTab = document.querySelector('.tabbar .tabbtn[data-ltab].active');
  const role = activeTab ? activeTab.dataset.ltab : 'citizen';
  closeModal('loginModal');
  setRole(role);
}
function switchLoginTab(tab){
  document.querySelectorAll('.tabbar .tabbtn[data-ltab]').forEach(b => b.classList.toggle('active', b.dataset.ltab === tab));
}

/* ---------------- theme handling ---------------- */
function toggleTheme(){
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  storageSet('ss-theme', next);
  updateUrlParam('theme', next);
}

/* ---------------- mobile sidebar ---------------- */
function closeSidebar(){
  const s = document.getElementById('sidebar'), b = document.getElementById('sidebarBackdrop');
  if(s) s.classList.remove('open');
  if(b) b.classList.remove('show');
}

/* ---------------- boot ---------------- */
/* Floating Sahayak widget — auto-mounted on every page except chatbot.html
   (which runs the full-page chat over the same shared transcript). */
if((document.body.dataset.page || '') !== 'chatbot'){
  const cwBrain = document.createElement('script');
  cwBrain.src = 'js/chat-brain.js';
  document.body.appendChild(cwBrain);
  const cwWidget = document.createElement('script');
  cwWidget.src = 'js/chat-widget.js';
  document.body.appendChild(cwWidget);
}

function renderShell(){
  const activePage = document.body.dataset.page || '';
  document.documentElement.setAttribute('data-theme', currentTheme());

  const topbarMount = document.getElementById('app-topbar');
  const sidebarMount = document.getElementById('app-sidebar');
  const modalMount = document.getElementById('modal-mount');
  if(topbarMount) topbarMount.outerHTML = renderTopbar();
  if(sidebarMount) sidebarMount.outerHTML = renderSidebar(activePage);
  if(modalMount) modalMount.outerHTML = `<div id="modal-mount">${renderModals()}</div>`;

  applyRoleUI(currentRole());
  wireGlobalSearch();

  const menuToggle = document.getElementById('menuToggle');
  if(menuToggle) menuToggle.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarBackdrop').classList.toggle('show');
  });

  document.addEventListener('click', (e) => {
    const rs = document.querySelector('.role-switch');
    const menu = document.getElementById('roleMenu');
    if(rs && menu && !rs.contains(e.target)) menu.classList.remove('open');
  });
}
