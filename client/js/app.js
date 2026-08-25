/* ===================================================================
   SolveSamaj — shared app utilities
   Used by every page. Page-specific rendering lives in a small
   <script> block at the bottom of each .html file; this file only
   holds logic that's the same everywhere.
   =================================================================== */

/* ---------------- state (role + theme persist across pages) ----------------
   Theme & role are stored in localStorage so they survive ANY navigation,
   even links rendered before a toggle. The ?theme=/?role= URL params still
   work as a first-visit seed / for sharing links. */
function storageGet(key){
  try{ return localStorage.getItem(key); }catch(e){ return null; }
}
function storageSet(key, val){
  try{ localStorage.setItem(key, val); }catch(e){}
}
function currentRole(){
  const saved = storageGet('ss-role');
  if(saved) return saved;
  return new URLSearchParams(location.search).get('role') || 'citizen';
}
function currentTheme(){
  const saved = storageGet('ss-theme');
  if(saved) return saved;
  return new URLSearchParams(location.search).get('theme') || 'light';
}
function paramStr(extra){
  const p = new URLSearchParams();
  p.set('role', currentRole());
  p.set('theme', currentTheme());
  if(extra){ Object.keys(extra).forEach(k => { if(extra[k] !== undefined && extra[k] !== '') p.set(k, extra[k]); }); }
  return '?' + p.toString();
}
function go(path, extra){ location.href = path + paramStr(extra); }
function currentPageFile(){ return location.pathname.split('/').pop() || 'index.html'; }
function updateUrlParam(key, value){
  const url = new URL(location.href);
  url.searchParams.set(key, value);
  history.replaceState(null, '', url.toString());
}

/* ---------------- colour helpers (data-driven, see data.js) ---------------- */
function categoryColor(cat){ return (typeof CATEGORY_COLORS !== 'undefined' && CATEGORY_COLORS[cat]) || '#C76500'; }
function hexToRgba(hex, alpha){
  const h = hex.replace('#','');
  const r = parseInt(h.substring(0,2),16), g = parseInt(h.substring(2,4),16), b = parseInt(h.substring(4,6),16);
  return `rgba(${r},${g},${b},${alpha})`;
}
function avatarColor(name){
  if(typeof AVATAR_PALETTE === 'undefined') return '#0F7173';
  let hash = 0;
  for(let i=0;i<name.length;i++){ hash = name.charCodeAt(i) + ((hash << 5) - hash); }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}
function categoryTagHTML(cat){
  const c = categoryColor(cat);
  return `<span class="tag tag-domain" style="color:${c}; background:${hexToRgba(c,0.12)}; border-color:${hexToRgba(c,0.32)};"><span class="cat-dot" style="background:${c};"></span>${cat}</span>`;
}

/* ---------------- formatting helpers ---------------- */
const STAMP_MAP = {
  submitted:["stamp-review","Submitted"], review:["stamp-review","Under Review"], validated:["stamp-validated","Validated"],
  open:["stamp-open","Open for Solutions"], progress:["stamp-progress","Project Active"], testing:["stamp-review","Testing"],
  resolved:["stamp-resolved","Resolved"], duplicate:["stamp-duplicate","Duplicate"], pending:["stamp-pending","Pending"],
};
function stampHTML(status){
  const [cls,label] = STAMP_MAP[status] || ["stamp-pending","Pending"];
  return `<span class="stamp ${cls}">${label}</span>`;
}
function sevDotHTML(sev){ return `<span class="sev-dot sev-${sev}"></span>`; }
function initials(name){ return name.split(/\s+/).map(w=>w[0]).join("").slice(0,2).toUpperCase(); }
function caseNo(id){ return `SS/JH/2026/${id}`; }
function formatDate(iso){
  const d = new Date(iso + 'T00:00:00');
  if(isNaN(d)) return iso;
  return d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}

/* ---------------- funding helpers (data: FUND_REQUESTS in data.js) ---------------- */
function inr(n){ return '₹' + Math.round(n).toLocaleString('en-IN'); }
function fundById(id){ return (typeof FUND_REQUESTS !== 'undefined') ? FUND_REQUESTS.find(f => f.id === id) : null; }
function fundRaised(fr){ return fr.pledges.filter(p => p.status === 'received').reduce((s,p) => s + p.amount, 0); }
function fundPledged(fr){ return fr.pledges.filter(p => p.status === 'pledged').reduce((s,p) => s + p.amount, 0); }
function fundIsFunded(fr){ return fundRaised(fr) >= fr.target; }
function orgDonated(name){
  if(typeof FUND_REQUESTS === 'undefined') return 0;
  return FUND_REQUESTS.reduce((s,f) => s + f.pledges.filter(p => p.type==='org' && p.by===name && p.status==='received').reduce((a,p)=>a+p.amount,0), 0);
}
function individualDonated(name){
  if(typeof FUND_REQUESTS === 'undefined') return 0;
  return FUND_REQUESTS.reduce((s,f) => s + f.pledges.filter(p => p.type==='individual' && p.by===name && p.status==='received').reduce((a,p)=>a+p.amount,0), 0);
}
function pledgeRowHTML(frId, idx, p){
  const badge = p.status === 'received'
    ? '<span class="stamp stamp-validated">Received</span>'
    : '<span class="stamp stamp-pending">Awaiting verification</span>';
  const verify = p.status === 'pledged'
    ? `<button class="btn btn-outline btn-sm" style="margin-left:auto;" onclick="verifyPledge('${frId}', ${idx})">✓ Verify receipt</button>` : '';
  return `<div class="person-row">
      <div class="av" style="background:${p.type==='org' ? avatarColor(p.by) : 'var(--setu-2)'}; color:#fff;">${initials(p.by)}</div>
      <div style="flex:1;"><b>${p.by}</b><span>${p.type==='org' ? 'Organization' : 'Individual'} · ${inr(p.amount)}</span></div>
      ${badge}${verify}
    </div>`;
}
function fundProgressHTML(fr){
  const r = fundRaised(fr), pl = fundPledged(fr);
  const pct = Math.min(100, Math.round(r / fr.target * 100));
  const backers = fr.pledges.length;
  return `<div class="milestone"><div class="mtop"><b>${inr(r)} received</b><span>${pl ? inr(pl)+' pledged · ' : ''}${backers} backer${backers===1?'':'s'}</span></div><div class="track"><div class="fill" style="width:${pct}%;"></div></div></div>
  <p style="font-size:11px; color:var(--text-faint); margin:-4px 0 10px;">of ${inr(fr.target)} target</p>`;
}

/* ---------------- reusable card markup ---------------- */
function problemCardHTML(p){
  const c = categoryColor(p.category);
  return `
  <div class="card pcard" style="--accent:${c};" onclick="go('problem.html', {id:${p.id}})">
    <div class="pcard-top">
      <div>
        <div class="pcard-id mono">#${p.id}</div>
        <h3>${p.title}</h3>
      </div>
      ${stampHTML(p.status)}
    </div>
    <p class="desc">${p.desc}</p>
    <div class="pcard-tags">
      ${categoryTagHTML(p.category)}
      ${p.tags.slice(0,2).map(t=>`<span class="tag">${t}</span>`).join("")}
    </div>
    <div class="pcard-foot">
      <span class="loc">${sevDotHTML(p.severity)}&nbsp;${p.district} · ${p.block}</span>
      <span class="pcard-stats"><span>👤 ${p.affected.toLocaleString()}</span><span>♥ ${p.supporters}</span></span>
    </div>
  </div>`;
}

function orgCardHTML(o){
  const c = avatarColor(o.name);
  return `
  <div class="card card-pad" style="display:flex; flex-direction:column; gap:10px; cursor:pointer;" onclick="void(0)" title="Organization profile — coming with the accounts module">
    <div class="row-flex" style="justify-content:space-between; align-items:flex-start;">
      <div class="person-row" style="padding:0;">
        <div class="av" style="background:${c}; color:#fff;">${initials(o.name)}</div>
        <div><b>${o.name}</b><span>${o.type}</span></div>
      </div>
      ${o.verified ? '<span class="stamp stamp-validated">Verified</span>' : '<span class="stamp stamp-pending">Pending</span>'}
    </div>
    <div class="pcard-tags">${o.expertise.slice(0,3).map(t=>`<span class="tag">${t}</span>`).join("")}</div>
    <div class="pcard-foot" style="border-top:1px solid var(--border); padding-top:9px;">
      <span>${o.location}</span><span class="mono">${o.projects} projects · ${inr(orgDonated(o.name))} donated</span>
    </div>
  </div>`;
}

/* ---------------- toast ---------------- */
function toast(msg){
  const wrap = document.getElementById('toastWrap');
  if(!wrap) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex:none;"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg><span>${msg}</span>`;
  wrap.appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transition='opacity .3s'; setTimeout(()=>el.remove(),300); }, 3400);
}

/* ---------------- modals ---------------- */
function openModal(id){ const m = document.getElementById(id); if(m) m.classList.add('open'); }
function closeModal(id){ const m = document.getElementById(id); if(m) m.classList.remove('open'); }
document.addEventListener('click', (e) => {
  if(e.target.classList && e.target.classList.contains('modal-overlay')) e.target.classList.remove('open');
});
document.addEventListener('click', (e) => {
  if(e.target.classList && e.target.classList.contains('chip-opt')) e.target.classList.toggle('sel');
});

/* ---------------- search / sort / filter (used on explore & directory pages) ---------------- */
function searchProblems(list, q){
  if(!q) return list;
  const needle = q.trim().toLowerCase();
  if(!needle) return list;
  return list.filter(p =>
    p.title.toLowerCase().includes(needle) ||
    p.desc.toLowerCase().includes(needle) ||
    p.category.toLowerCase().includes(needle) ||
    p.district.toLowerCase().includes(needle) ||
    p.tags.some(t => t.toLowerCase().includes(needle))
  );
}
function sortProblems(list, mode){
  const arr = list.slice();
  const urgencyRank = { "Immediate":0, "Within days":1, "Within months":2, "Long-term":3 };
  if(mode === 'supporters') arr.sort((a,b)=> b.supporters - a.supporters);
  else if(mode === 'urgent') arr.sort((a,b)=> (urgencyRank[a.urgency]??9) - (urgencyRank[b.urgency]??9));
  else if(mode === 'newest') arr.sort((a,b)=> new Date(b.date) - new Date(a.date));
  else if(mode === 'affected') arr.sort((a,b)=> b.affected - a.affected);
  return arr;
}
function filterProblems(list, {categories, severities, statuses} = {}){
  return list.filter(p =>
    (!categories || !categories.length || categories.includes(p.category)) &&
    (!severities || !severities.length || severities.includes(p.severity)) &&
    (!statuses || !statuses.length || statuses.includes(p.status))
  );
}

/* ---------------- global topbar search (redirects to explore.html) ---------------- */
function wireGlobalSearch(){
  const input = document.getElementById('globalSearch');
  if(!input) return;
  input.addEventListener('keydown', (e) => {
    if(e.key === 'Enter'){ go('explore.html', { q: input.value }); }
  });
}
