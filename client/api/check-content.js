// ---------------------------------------------------------------------------
// SolveSamaj — Gemini content-quality & abuse checker (Vercel serverless)
// ---------------------------------------------------------------------------
// Runs BEFORE the duplicate check in the Report-a-Problem wizard: the draft's
// title/description must first be a genuine, readable and respectful problem
// report. Flags (only when nearly/totally the whole title or description):
//   gibberish — keyboard mash, e.g. "sjnfjn efw er gw"
//   nonsense  — real words strung together with no meaning, e.g.
//               "help world say good time data"
//   abusive   — profanity, slurs, harassment, threats (flagged even when a
//               genuine complaint is present)
// Minor spelling mistakes, typos, Hinglish/local words and imperfect grammar
// must PASS — only essentially-unreadable or abusive reports are flagged.
//
// Request  : { title, description }
// Response : { flagged: <bool>,
//              category: 'gibberish' | 'nonsense' | 'abusive' | null,
//              field: 'title' | 'description' | 'both' | null,
//              note: <short citizen-facing sentence> }
//
// Design rules (mirror check-dup.js):
//  • Missing/blank title or description → 400 (the form enforces both anyway).
//  • Missing API key / Gemini or parse failure → FAIL OPEN with flagged:false
//    so a checker outage never blocks a citizen from filing.
//  • API key never leaves the server — env var `kuestl_gemini_key`.
//  • Node 18+ built-in fetch only (no npm packages), like categorize.js.
// ---------------------------------------------------------------------------

function buildPrompt(draft) {
  const title = String(draft.title || '').replace(/\s+/g, ' ').trim();
  const desc = String(draft.description || '').replace(/\s+/g, ' ').trim().slice(0, 1500);

  return `You are a content-quality and safety moderator for SolveSamaj, a civic problem-reporting platform in India. Citizens report local problems there (roads, water, electricity, drains, streetlights, waste, healthcare, education, and similar civic issues).

Evaluate the report TITLE and DESCRIPTION below and decide whether to FLAG it.

FLAG the report ONLY if (nearly or totally) the whole title, or the whole description, falls into one of these three cases:

1. "gibberish" — random characters, keyboard mashing or unpronounceable letter strings with no real words, e.g. "sjnfjn efw er gw", "asdasd asd".

2. "nonsense" — real everyday words strung together that form no coherent, meaningful statement at all, e.g. "help world say good time data". Each word exists, but the text carries no understandable problem.

3. "abusive" — abusive, hateful, harassing or harsh language: profanity, slurs (racial, casteist, religious, communal), sexual abuse, personal insults directed at people or groups, or threats. Flag this even when a genuine complaint is present, because the language itself is unacceptable.

DO NOT flag when:
- There are minor spelling mistakes, typos or imperfect grammar — a normal human-readable report must PASS.
- The report uses Indian-language words written in Latin script (Hinglish) or local place names.
- The title is short but meaningful (e.g. "Broken streetlight", "No water since Monday").
- Only a small part of an otherwise genuine report is unclear.
- The report is unusual, emotional or poorly written but still understandable — it must PASS.

REPORT:
Title: ${title}
Description: ${desc}

Return ONLY a valid JSON object in this exact structure:
{
  "flagged": true or false,
  "category": "gibberish" or "nonsense" or "abusive" or null,
  "field": "title" or "description" or "both" or null,
  "note": "one short sentence in simple English telling the citizen what to fix"
}

If flagged is false, category and field MUST be null.`;
}

/* --- Vercel serverless handler --- */
module.exports = async function handler(req, res) {
  // CORS — allow the frontend (any origin) to call this proxy.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    res.status(400).json({ error: 'Content check failed', detail: 'Invalid JSON body' });
    return;
  }

  const { title, description } = body;

  if (!title || !description) {
    res.status(400).json({ error: 'Content check failed', detail: 'title and description are required' });
    return;
  }

  const apiKey = process.env.kuestl_gemini_key;
  if (!apiKey) {
    // Fail OPEN — an unconfigured key must never block filing.
    console.error('[check-content] missing kuestl_gemini_key env var');
    res.status(200).json({ flagged: false, category: null, field: null, note: '', reason: 'Checker not configured' });
    return;
  }

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: buildPrompt({ title, description }) }]
          }],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        })
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text().catch(() => '');
      throw new Error('Gemini HTTP ' + geminiRes.status + ' ' + errText);
    }

    const data = await geminiRes.json();
    const text = (data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0] &&
      data.candidates[0].content.parts[0].text) || '';

    const result = JSON.parse(text);

    /* Normalize — trust only an exact true, and clamp the enum fields so a
       stray model wording can never break the frontend switch. */
    const CATS = new Set(['gibberish', 'nonsense', 'abusive']);
    const FIELDS = new Set(['title', 'description', 'both']);

    const flagged = !!(result && result.flagged === true);
    let category = flagged && result.category ? String(result.category).trim().toLowerCase() : null;
    if (flagged && !CATS.has(category)) category = 'nonsense';  // flagged but unknown kind → treat as nonsense
    let field = flagged && result.field ? String(result.field).trim().toLowerCase() : null;
    if (flagged && !FIELDS.has(field)) field = null;

    res.status(200).json({
      flagged,
      category: flagged ? category : null,
      field: flagged ? field : null,
      note: typeof (result && result.note) === 'string' ? result.note : ''
    });
  } catch (err) {
    // Fail OPEN — never block the report because the checker failed.
    console.error('[check-content] failed open:', err.message);
    res.status(200).json({ flagged: false, category: null, field: null, note: '', reason: 'Checker unavailable' });
  }
};