/* ===================================================================
   SolveSamaj — shared chat BRAIN (no UI)
   Used by chatbot.html (full page) and the floating widget injected on
   every other page. One localStorage transcript ('ss-chat') keeps the
   conversation continuous across pages.

   AI INTEGRATION: see AI_SETTINGS below — flip  mode:'placeholder'
   to  mode:'api'  (and set apiUrl) to plug in a real model endpoint.
   aiReply(message, history[]) -> Promise<string|html>
   =================================================================== */
(function(){
  const KEY = 'ss-chat';
  function load(){
    try{ return JSON.parse(localStorage.getItem(KEY)) || []; }catch(e){ return []; }
  }
  function save(h){
    try{ localStorage.setItem(KEY, JSON.stringify(h)); }catch(e){}
  }

  window.ChatCore = {
    history: load(),
    push(role, text){
      this.history.push({ role:role, content:text });
      if(this.history.length > 40) this.history.shift();
      save(this.history);
    },
    clear(){ this.history = []; save(this.history); },
  };
})();

/* ── AI SETTINGS ────────────────────────────────────────────────────
   mode:'placeholder' → keyword demo replies below (current default)
   mode:'api'         → POST { message, history } to apiUrl and expect
                        JSON { reply:"…" } back. One word flips you live. */
const AI_SETTINGS = {
  mode  : 'placeholder',
  apiUrl: '/api/chat',
};

const GENERIC_REPLIES = [
  "I'm running in demo mode right now — answers are placeholders until the AI backend is connected in <code>aiReply()</code>. Meanwhile, try asking about <b>filing a problem</b>, <b>validation</b> or <b>collaboration</b>!",
  "Good question! Once the real model is wired in I'll answer this properly. The two guides on the homepage cover most process questions in detail.",
];
let genericIdx = 0;

window.placeholderReply = function(message){
  const m = (message || '').toLowerCase();
  if(/(^|\s)(hi|hello|namaste|hey)(\s|$|[!,.?])/.test(m))
    return "Namaste! 👋 I'm <b>Sahayak</b>, the SolveSamaj assistant. Ask me how to <b>report a problem</b>, what happens during <b>validation</b>, or how <b>organizations collaborate</b> on solutions.";
  if(/(report|file|submit|complaint|put forward)/.test(m))
    return `Citizens report issues through the <b>Report a Problem</b> form — describe the failure, pin the district &amp; block, add evidence, and you get a permanent case number instantly. <a href="#" onclick="go('submit.html');return false;">Open the form →</a>`;
  if(/(valid|review|approve|duplicate)/.test(m))
    return `After filing, the platform runs duplicate detection, then a government admin reviews the case. Once validated, supporters can back it and it's stamped <b>Open for Solutions</b>. Full journey: <a href="#" onclick="go('guide-filing.html');return false;">filing guide →</a>`;
  if(/(collab|partner|organization|ngo|university|team up)/.test(m))
    return `Verified organizations see problems matched to their expertise, express interest with resources &amp; timeline, then join as technical / implementation / funding / research partners inside a shared project workspace. Walkthrough: <a href="#" onclick="go('guide-collaboration.html');return false;">collaboration guide →</a>`;
  if(/(fund|donat|money|grant)/.test(m))
    return `Cases and projects can post <b>funding needs</b>; organizations and individuals pledge any amount, and the case owner verifies each receipt on the public record. Browse: <a href="#" onclick="go('funding.html');return false;">Funding →</a>`;
  if(/(status|track|where is|progress|case no)/.test(m))
    return `Every case file carries a live stamp: Submitted → Under Review → Validated → Open → Project Active → Testing → Resolved. Track yours under <a href="#" onclick="go('my-problems.html');return false;">My Problems →</a>`;
  if(/(project|milestone|workspace)/.test(m))
    return `Accepted interests become projects with milestone bars, task boards, shared documents and a discussion thread visible to every partner and to admins. Browse current work: <a href="#" onclick="go('projects.html');return false;">Projects →</a>`;
  const reply = GENERIC_REPLIES[genericIdx % GENERIC_REPLIES.length];
  genericIdx++;
  return reply;
};

/* ---- public entry point — used by the FULL PAGE and the WIDGET alike ---- */
window.aiReply = async function(message, history){
  if(AI_SETTINGS.mode === 'api'){
    const res = await fetch(AI_SETTINGS.apiUrl, {
      method : 'POST',
      headers: { 'Content-Type':'application/json' },
      body   : JSON.stringify({ message, history })
    });
    if(!res.ok) throw new Error('AI endpoint returned ' + res.status);
    const data = await res.json();
    return data.reply;                       // plain text or simple html
  }
  /* placeholder mode: simulated latency + keyword-flavoured canned replies */
  return new Promise((resolve) => {
    setTimeout(() => resolve(window.placeholderReply(message)), 600 + Math.random()*700);
  });
};