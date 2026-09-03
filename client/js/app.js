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
  return new URLSearchParams(location.search).get('role') || 'guest';
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
/* Resolve the taxonomy heading a category belongs to (the tag itself if standalone). */
function categoryGroupOf(tag){
  if(typeof PROBLEM_CATEGORY_GROUPS === 'undefined') return tag;
  const g = PROBLEM_CATEGORY_GROUPS.find(gr => gr.name === tag || gr.tags.includes(tag));
  return g ? g.name : tag;
}
/* A case can carry several taxonomy tags; 'category' remains the primary
   (first) tag used for accent colours and compact tables. */
function problemCats(p){ return (p.cats && p.cats.length) ? p.cats : [p.category]; }
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
  return `<span class="tag tag-domain" title="Category: ${categoryGroupOf(cat)}" style="color:${c}; background:${hexToRgba(c,0.12)}; border-color:${hexToRgba(c,0.32)};"><span class="cat-dot" style="background:${c};"></span>${cat}</span>`;
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
      ${(() => {
        /* show at most 5 chips; the rest collapse into “+N” but still
           count for search and filters */
        const chips = [...problemCats(p).map(categoryTagHTML),
                       ...p.tags.map(t=>`<span class="tag">${t}</span>`)];
        return chips.slice(0,5).join("") +
          (chips.length > 5 ? `<span class="tag tag-more">+${chips.length-5}</span>` : "");
      })()}
    </div>
    <div class="pcard-foot">
      <span class="loc">${sevDotHTML(p.severity)}&nbsp;${p.district} · ${p.block}</span>
      <span class="pcard-stats"><span>👤 ${(p.supporters || 0).toLocaleString()}</span></span>
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
    <p title="${o.desc || ''}" style="font-size:12px; color:var(--text-soft); margin:0; line-height:1.55;">${(() => {
        const d = o.desc || '';
        return d.length > 118 ? d.slice(0, 115).trimEnd() + '…' : d;
      })()}</p>
    <div class="pcard-foot" style="border-top:1px solid var(--border); padding-top:9px;">
      <span>${o.location}</span><span class="mono">${o.projects} projects · ${inr(orgDonated(o.name))} donated</span>
    </div>
  </div>`;
}

/* ---------------- my-projects (organisation) helpers ----------------
   Demo stand-in for per-org project ownership until the backend persists
   projects: the demo org (MMMUT) claims projects where it leads or
   collaborates, padded so the My Projects section always demos with two
   already-created projects. Shared by my-projects.html and the project
   workspace pages to decide which projects belong to the signed-in org. */
const MY_ORG = 'MMMUT';
function myOrgProjects(){
  const mine = PROJECTS.filter(pr => pr.lead === MY_ORG || pr.orgs.includes(MY_ORG));
  return mine.length >= 2
    ? mine
    : mine.concat(PROJECTS.filter(pr => !mine.includes(pr)).slice(0, 2 - mine.length));
}
function isMyOrgProject(code){
  return myOrgProjects().some(pr => pr.code === code);
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
/* Single generic chip toggle for the whole site (org profile chips, submit
   page previews, etc.). Uses closest() so it keeps working even if a chip
   later contains nested elements. Pages must NOT register a second
   document-level .chip-opt listener — two handlers would toggle .sel twice
   per click, so chips would appear unresponsive (see org-profile.html). */
document.addEventListener('click', (e) => {
  const chip = e.target && e.target.closest ? e.target.closest('.chip-opt') : null;
  if(chip) chip.classList.toggle('sel');
});

/* ---------------- search / sort / filter (used on explore & directory pages) ---------------- */
function searchProblems(list, q){
  if(!q) return list;
  const needle = q.trim().toLowerCase();
  if(!needle) return list;
  return list.filter(p =>
    p.title.toLowerCase().includes(needle) ||
    p.desc.toLowerCase().includes(needle) ||
    p.district.toLowerCase().includes(needle) ||
    p.tags.some(t => t.toLowerCase().includes(needle)) ||
    problemCats(p).some(c => c.toLowerCase().includes(needle))
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
    (!categories || !categories.length || categories.some(c => problemCats(p).includes(c))) &&
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

/* ---------------- live supporter counts + per-account support toggle --------
   problems.support holds each case's supporter count. WHO backed it lives in
   profiles.supported_problems (bigint[] of problem ids), and profiles.
   cases_supported is that account's total. The Support button on problem.html
   is a two-way toggle — see toggleSupport() below. There is no per-session /
   localStorage lock anymore: the profile row IS the source of truth, so the
   state follows the account (across devices and refreshes) and a supporter
   can never double-count a case.

   Demo data in data.js uses the property name `supporters`, so the count
   helpers below read the DB column and overlay the value onto the PROBLEMS
   list — every renderer keeps using p.supporters and card hearts / the detail
   page stay in sync with the DB (single source of truth).

   Every helper degrades silently to the demo values when Supabase is
   unreachable (offline / CDN blocked), matching shell.js behaviour. */
function supportApiReady(){ return typeof sbClient !== 'undefined' && !!sbClient; }
/* Coerce a DB number (Postgres may hand back a string) to a safe integer. */
function num(v){ const n = (typeof v === 'number') ? v : parseInt(v, 10); return isNaN(n) ? 0 : n; }

/* Every problem row the visitor can read: { id -> support }. null on failure. */
async function fetchSupportCounts(){
  if(!supportApiReady()) return null;
  try{
    const { data, error } = await sbClient.from('problems').select('id, support');
    if(error) throw error;
    const map = {};
    (data || []).forEach(r => { map[r.id] = num(r.support); });
    return map;
  }catch(e){
    console.warn('[support] count fetch failed:', (e && e.message) || e);
    return null;
  }
}

/* Overlay DB counts onto the demo PROBLEMS list, in place. Returns how many
   entries were updated (0 → nothing changed, callers skip the re-render). */
function applySupportCounts(map){
  if(!map || typeof PROBLEMS === 'undefined') return 0;
  let n = 0;
  PROBLEMS.forEach(p => {
    if(map[p.id] !== undefined){ p.supporters = map[p.id]; n++; }
  });
  return n;
}

/* One Support-button click — a two-way toggle, applied live to the DB:
     • not backed yet   → problems.support +1, profiles.cases_supported +1,
                          and this problem id appended to supported_problems
     • already backed   → both counters −1 (never below 0) and the id removed
                          from supported_problems.
   Reads the two current rows, writes both, resolves with the NEW state so
   the caller can repaint its button and counts. Throws when either write
   fails or either row is missing. */
async function toggleSupport(problemId, userId){
  if(!supportApiReady()) throw new Error('Supabase unavailable');
  const pid = Number(problemId);
  const [probRes, profRes] = await Promise.all([
    sbClient.from('problems').select('id, support').eq('id', pid).maybeSingle(),
    sbClient.from('profiles').select('id, cases_supported, supported_problems').eq('id', userId).maybeSingle()
  ]);
  if(probRes.error) throw probRes.error;
  if(!probRes.data) throw new Error('problems has no row for id ' + pid);
  if(profRes.error) throw profRes.error;
  if(!profRes.data) throw new Error('No profile row for your account — sign in or save your profile first');

  const prob = probRes.data, prof = profRes.data;
  const backed = new Set(Array.isArray(prof.supported_problems) ? prof.supported_problems.map(x => Number(x)) : []);
  const wasBacked = backed.has(pid);

  const support = wasBacked
    ? Math.max(0, num(prob.support) - 1)
    : num(prob.support) + 1;
  const cases_supported = wasBacked
    ? Math.max(0, num(prof.cases_supported) - 1)
    : num(prof.cases_supported) + 1;
  if(wasBacked) backed.delete(pid); else backed.add(pid);
  const supported_problems = Array.from(backed);

  const [updProb, updProf] = await Promise.all([
    sbClient.from('problems').update({ support }).eq('id', pid).select('id, support'),
    sbClient.from('profiles').update({ cases_supported, supported_problems }).eq('id', userId).select('id')
  ]);
  if(updProb.error) throw updProb.error;
  if(!updProb.data || !updProb.data.length) throw new Error('support update matched no problems row (RLS policy?)');
  if(updProf.error) throw updProf.error;

  return {
    supported: !wasBacked,
    support: num(updProb.data[0].support),
    cases_supported,
    supported_problems
  };
}
