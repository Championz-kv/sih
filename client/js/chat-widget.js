/* ===================================================================
   SolveSamaj — floating Sahayak widget (every page except chatbot.html)
   Shares its transcript with the full chat page via chat-brain.js
   ('ss-chat' in localStorage). Injected automatically by shell.js.
   =================================================================== */
(function(){
  if(document.body && document.body.dataset.page === 'chatbot') return;

  const BOT_SVG = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="7" width="16" height="12" rx="3"/><path d="M12 7V4M8 4h8"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/></svg>';
  const X_SVG   = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>';
  const TRASH_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
  const SEND_SVG  = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';

  const root = document.createElement('div');
  root.id = 'cwRoot';
  root.className = 'cw-root';
  root.innerHTML = `
  <div class="cw-panel" id="cwPanel">
    <div class="cw-head">
      <span class="cw-av">S</span>
      <div style="flex:1;min-width:0;">
        <b>Sahayak</b>
        <span>AI assistant · online</span>
      </div>
      <button class="cw-ico" id="cwClear" title="Clear conversation">${TRASH_SVG}</button>
      <button class="cw-ico" id="cwClose" title="Minimise">${X_SVG}</button>
    </div>
    <div class="cw-log" id="cwLog"></div>
    <form class="cw-input" id="cwForm">
      <input id="cwText" placeholder="Ask Sahayak…" autocomplete="off">
      <button class="cw-send" type="submit" aria-label="Send">${SEND_SVG}</button>
    </form>
  </div>
  <button class="cw-btn" id="cwBtn" aria-label="Open Sahayak AI assistant">${BOT_SVG}</button>`;
  document.body.appendChild(root);

  const panel  = document.getElementById('cwPanel');
  const btn    = document.getElementById('cwBtn');
  const logEl  = document.getElementById('cwLog');

  /* The brain (chat-brain.js) is injected dynamically and may still be
     loading — wait for it before touching the transcript. */
  function whenBrain(cb){
    if(window.ChatCore){ cb(); return; }
    let tries = 0;
    (function wait(){
      if(window.ChatCore || ++tries > 50){ cb(); }
      else{ setTimeout(wait, 60); }
    })();
  }

  function open(){
    root.classList.add('open');
    btn.style.display = 'none';
    whenBrain(() => {
      replay();
      const t = document.getElementById('cwText');
      if(t) t.focus();
    });
  }
  function close(){
    root.classList.remove('open');
    btn.style.display = '';
  }
  btn.addEventListener('click', open);
  document.getElementById('cwClose').addEventListener('click', close);

  function scrollBottom(){ logEl.scrollTop = logEl.scrollHeight; }
  function nowTime(){ return new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}); }
  function esc(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function appendMsg(role, html, withTime){
    const row = document.createElement('div');
    row.className = 'msg-row ' + role;
    row.innerHTML =
      `<div class="msg-av">${role === 'user' ? 'YOU' : 'S'}</div>` +
      `<div class="msg">${html}${withTime ? '<span class="msg-time">'+nowTime()+'</span>' : ''}</div>`;
    logEl.appendChild(row); scrollBottom();
  }

  /* Replay stored transcript (so the convo follows you between pages) */
  function replay(){
    logEl.innerHTML = '';
    if(!ChatCore.history.length){
      const w = "Namaste! 🙏 I'm <b>Sahayak</b>. Ask how problems are <b>filed</b>, how orgs <b>collaborate</b>, or what each <b>status</b> means.";
      appendMsg('bot', w, true);
      ChatCore.push('assistant', w.replace(/<[^>]+>/g,''));
      return;
    }
    ChatCore.history.forEach(h =>
      appendMsg(h.role, h.role === 'user' ? esc(h.content) : h.content, false));
  }

  document.getElementById('cwClear').addEventListener('click', () => {
    ChatCore.clear(); replay();
  });

  let busy = false;
  document.getElementById('cwForm').addEventListener('submit', e => {
    e.preventDefault();
    const input = document.getElementById('cwText');
    const text = (input.value || '').trim();
    if(!text || busy) return;
    if(!window.ChatCore){ appendMsg('bot', 'Assistant is still loading — try again in a second.'); return; }
    appendMsg('user', esc(text), true);
    ChatCore.push('user', text);
    input.value = '';
    busy = true;
    const dots = document.createElement('div');
    dots.className = 'msg-row bot';
    dots.innerHTML = '<div class="msg-av">S</div><div class="msg"><span class="typing-dots"><i></i><i></i><i></i></span></div>';
    logEl.appendChild(dots); scrollBottom();

    Promise.resolve(window.aiReply(text, ChatCore.history.slice()))
      .then(reply => {
        dots.remove();
        appendMsg('bot', reply, true);
        ChatCore.push('assistant', reply.replace(/<[^>]+>/g,''));
      })
      .catch(() => { dots.remove(); appendMsg('bot','Sorry — something went wrong. Please try again.'); })
      .finally(() => { busy = false; input.focus(); });
  });
})();