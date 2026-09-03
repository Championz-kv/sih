// ---------------------------------------------------------------------------
// SolveSamaj — Sahayak chat endpoint (Vercel serverless, Gemini)
// ---------------------------------------------------------------------------
// The brain behind BOTH Sahayak surfaces — the full chat page
// (client/chatbot.html) and the floating hover widget on every other page
// (client/js/chat-widget.js). They share one transcript ('ss-chat' in
// localStorage) and both call aiReply(message, history) in chat-brain.js,
// which POSTs { message, history } here and expects { reply } back.
//
// Scope (v1, simple knowledge base): explain the platform, navigate the site,
// walk through posting/finding problems, finding organizations, registering
// as an org, creating projects, statuses, and who built SolveSamaj. Deeper
// reference data can be added to SYSTEM_PROMPT later.
//
// Style rules enforced by the prompt: medium-length step-wise answers, plain
// language, simple inline HTML only, internal links via the site's go()
// helper, and calm diversion of off-topic questions back to SolveSamaj.
//
// Resilience: any Gemini/parse/network failure returns 200 with a friendly
// fallback reply (never a raw 500) so the chat always stays polite. The API
// key stays server-side (env var `kuestl_gemini_key`), same as the other
// endpoints. Node 18+ built-in fetch only.
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are Sahayak, the friendly AI assistant of SolveSamaj — a civic platform used in India by citizens, organizations (NGOs, universities, startups, companies) and government administrators to solve local problems together. You chat inside the SolveSamaj website.

HOW TO ANSWER (always):
- Plain, warm, simple English. Never robotic, never preachy.
- Medium length: 2–5 short sentences, or 2–4 numbered steps when explaining how to do something. Never a wall of text, never a one-word reply.
- Use only simple inline HTML: <b>, <a>, <br>, and <ul><li> lists. No markdown, no headings, no scripts, styles, tables or images.
- For internal pages, write links EXACTLY in this pattern (the site's router understands it):
  <a href="#" onclick="go('PAGE');return false;">Label →</a>

WHAT YOU KNOW (your only facts about the platform — never invent anything else):
- Purpose: SolveSamaj lets citizens report local civic problems (roads, water, drains, electricity, streetlights, waste…), gets each report AI-checked and admin-validated, then lets verified organizations collaborate on real solution projects — openly, with public case files and clear statuses.
- Who made it: SolveSamaj was built by Team KUEST-L as a Smart India Hackathon prototype (v0.2). Point people to <a href="#" onclick="go('team.html');return false;">the team page →</a> to meet the makers.
- Report a problem (citizen): open <a href="#" onclick="go('submit.html');return false;">Report a Problem →</a>. Step 1: title, description, state, district (block/village optional). Next → Sahayak AI first checks the report is clear and respectful, then checks it isn't a duplicate of a nearby problem, then suggests categories and tags. Step 3: review & submit — you get a permanent case number instantly.
- Find problems: <a href="#" onclick="go('explore.html');return false;">Explore Problems →</a> lists every case with search and filters (state, district, category, status). Each case opens as a public case file where anyone can press Support (backs the case; pressing again unsupports), add evidence, and join the community discussion.
- Track your own filings under <a href="#" onclick="go('my-problems.html');return false;">My Problems →</a>. Case statuses flow: Submitted → Under Review → Validated → Open for Solutions → Project Active → Testing → Resolved.
- Organizations: browse them under <a href="#" onclick="go('orgs.html');return false;">Organizations →</a>. Each org profile shows its location, expertise, resources, preferences and funding status. To register as an organization, open <a href="#" onclick="go('login.html');return false;">Sign Up →</a>, choose Organization, and after signing in complete <a href="#" onclick="go('org-profile.html');return false;">Organization Profile →</a> — admins can then verify the org for funding eligibility.
- Projects: an interested organization presses Express Interest on a case; once the case is validated, the org creates a project from it at <a href="#" onclick="go('create-project.html');return false;">Create Project →</a> (proposal, timeline, budget, documents). Projects appear on the case file and under <a href="#" onclick="go('projects.html');return false;">Projects →</a>. Admins validate cases and oversee projects from their admin page.
- Accounts & profile: sign in with email at <a href="#" onclick="go('login.html');return false;">Sign in →</a>. Citizens edit theirs at <a href="#" onclick="go('citizen-profile.html');return false;">Citizen Profile →</a>, organizations at <a href="#" onclick="go('org-profile.html');return false;">Organization Profile →</a>. Profiles store name, contact, location, and expertise/resources/preferences chips.
- Support: pressing Support on a case backs it once per account (pressing again unsupports). It signals demand — more support gives a case more visibility with organizations and admins.
- If asked something off-topic (politics, code help, homework, random trivia, personal advice, other platforms), answer in ONE short calm sentence and immediately offer the nearest SolveSamaj help — for example, walking through posting a problem or finding organizations. Never claim capabilities the site doesn't have.
- Never invent problems, projects, organizations, statistics, names, emails or phone numbers. If you don't know something, say so briefly and offer the nearest helpful page.

You are Sahayak ("helper" in Hindi). Greet warmly, stay patient, and keep every answer focused on SolveSamaj.

Here is the user's chat so far:`;

/* Shape the client transcript into Gemini turns. Only plain text survives and
   every turn is capped, so a bloated history can't blow up the request. */
const MAX_TURNS = 12;
const MAX_TURN_CHARS = 400;
function buildContents(userText, history) {
  const turns = Array.isArray(history) ? history.slice(-MAX_TURNS) : [];
  const contents = turns
    .filter(m => m && (m.role === 'user' || m.role === 'model') &&
      typeof m.text === 'string' && m.text.trim())
    .map(m => ({ role: m.role, parts: [{ text: m.text.trim().slice(0, MAX_TURN_CHARS) }] }));
  contents.push({ role: 'user', parts: [{ text: String(userText || '').trim().slice(0, 1000) }] });
  return contents;
}

/* Last-resort reply when Gemini is unreachable — the bot never goes silent. */
const FALLBACK_REPLY =
  'I\u2019m having a little trouble reaching my knowledge right now \u{1F625} — please try again in a moment. ' +
  'Meanwhile you can <a href="#" onclick="go(\'explore.html\');return false;">explore problems →</a> or ' +
  '<a href="#" onclick="go(\'submit.html\');return false;">report one →</a>.';

/* Keep replies to the small safe HTML subset the two chat surfaces render:
   <b>, <a>, <br>, <ul>, <li>. Everything else is stripped, foreign on-*
   handlers are neutralized, and only the site's own go('page.html') links
   are allowed through. */
function sanitizeReply(html) {
  let s = String(html)
    .replace(/<\s*(script|style|img|iframe|object|embed|svg|video|audio)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|img|iframe|object|embed|svg|video|audio)\b[^>]*\/?\s*>/gi, '')
    .replace(/\bon[a-z]+\s*=\s*"(?!\s*go\()/gi, 'data-x="')
    .replace(/\bon[a-z]+\s*=\s*'(?!\s*go\()/gi, "data-x='");
  const allowed = new Set(['b', 'a', 'br', 'ul', 'li']);
  const GO_OK = /^\s*go\('([a-z0-9-]+\.html)'\)\s*;?\s*return\s*false\s*;?\s*$/i;
  s = s.replace(/<(\/?)([a-zA-Z0-9]+)([^>]*)>/g, (m, slash, tag, attrs) => {
    const t = tag.toLowerCase();
    if (!allowed.has(t)) return '';
    if (t === 'br') return '<br>';
    if (t !== 'a') return slash ? `</${t}>` : `<${t}>`;
    /* <a>: only href="#" plus a plain go('page.html') onclick */
    const href = /href\s*=\s*"([^"]*)"/i.exec(attrs);
    const onclick = /onclick\s*=\s*"([^"]*)"/i.exec(attrs);
    if (!href || href[1].trim() !== '#' || !onclick || !GO_OK.test(onclick[1])) return '';
    return `<a href="#" onclick="${onclick[1].trim().replace(/"/g, '')}">`;
  });
  return s;
}

/* --- Vercel serverless handler --- */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    res.status(400).json({ error: 'Chat failed', detail: 'Invalid JSON body' });
    return;
  }

  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 1000) : '';
  if (!message) {
    res.status(400).json({ error: 'Chat failed', detail: 'message is required' });
    return;
  }

  const apiKey = process.env.kuestl_gemini_key;
  if (!apiKey) {
    console.error('[chat] missing kuestl_gemini_key env var');
    res.status(200).json({ reply: FALLBACK_REPLY, reason: 'not-configured' });
    return;
  }

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: buildContents(message, body.history),
          generationConfig: { temperature: 0.6, maxOutputTokens: 300 }
        })
      }
    );
    if (!geminiRes.ok) {
      const errText = await geminiRes.text().catch(() => '');
      throw new Error('Gemini HTTP ' + geminiRes.status + ' ' + errText);
    }
    const data = await geminiRes.json();
    const raw = (data.candidates && data.candidates[0] && data.candidates[0].content &&
      data.candidates[0].content.parts && data.candidates[0].content.parts[0] &&
      data.candidates[0].content.parts[0].text) || '';
    if (!raw.trim()) throw new Error('Gemini returned an empty reply');
    res.status(200).json({ reply: sanitizeReply(raw.trim()) });
  } catch (err) {
    console.error('[chat] fallback used:', err.message);
    res.status(200).json({ reply: FALLBACK_REPLY, reason: 'unavailable' });
  }
};