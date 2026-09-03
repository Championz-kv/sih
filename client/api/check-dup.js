// ---------------------------------------------------------------------------
// SolveSamaj — Gemini duplicate-detector proxy (Vercel serverless function)
// ---------------------------------------------------------------------------
// Runs BEFORE categorization in the Report-a-Problem wizard. The frontend
// (submit.html) already fetched the candidate problems in the same state
// (same-district rows first) via Supabase and POSTs them here together with
// the user's draft. Gemini decides whether the draft is essentially the same
// problem as one of the candidates.
//
// Request  : { title, description, district, state,
//              existing: [{ id, title, description, district, same_district }] }
// Response : { duplicate: <bool>, match_id: <problems.id | null>, reason }
//
// Design rules (mirror the wizard's contract):
//  • Empty/missing `existing`  → immediate { duplicate:false }, NO Gemini call
//    (a district with no prior problems must not pay for a round-trip).
//  • Any Gemini / parse failure → fail OPEN with { duplicate:false } so a
//    checker outage never blocks a citizen from filing a problem.
//  • API key never leaves the server — env var `kuestl_gemini_key`.
//  • Node 18+ built-in fetch only (no npm packages), like categorize.js.
// ---------------------------------------------------------------------------

/* Candidate descriptions are truncated to keep the prompt small and fast. */
const CAND_DESC_CAP = 400;
const MAX_CANDIDATES = 25;

function buildPrompt(draft, existing) {
  const list = existing.slice(0, MAX_CANDIDATES).map((c, i) => {
    const desc = String(c.description || '').replace(/\s+/g, ' ').trim().slice(0, CAND_DESC_CAP);
    return (i + 1) + '. [id=' + c.id + ']' + (c.same_district ? ' (SAME district)' : ' (other district, same state)') +
      '\n   Title: ' + String(c.title || '').replace(/\s+/g, ' ').trim() +
      '\n   Description: ' + (desc || '(no description)');
  }).join('\n');

  const title = String(draft.title || '').replace(/\s+/g, ' ').trim();
  const desc = String(draft.description || '').replace(/\s+/g, ' ').trim().slice(0, 1500);

  return `You are a duplicate-detection assistant for a civic problem-reporting platform (India). A citizen is filing a NEW problem report. Below are existing reports already filed in the same STATE (mostly the same DISTRICT).

Decide whether the NEW report is essentially THE SAME PROBLEM as one of the existing reports.

Two problems are the SAME only if they describe the same underlying issue at the same location — e.g. the same broken road, the same failed drain, the same out-of-service facility. Merely sharing a category (two different water problems, two different road issues) is NOT a duplicate. Different specific locations, different root causes, or different affected facilities mean NOT a duplicate. When genuinely unsure, answer NOT a duplicate.

NEW REPORT (district: ${draft.district}, state: ${draft.state}):
Title: ${title}
Description: ${desc}

EXISTING REPORTS (same state):
${list || '(none)'}

Return ONLY a valid JSON object in this exact structure:
{
  "duplicate": true or false,
  "match_id": <the numeric id of the matching existing report, or null if duplicate is false>,
  "reason": "one short sentence"
}

If duplicate is true, match_id MUST be one of the [id=…] values above. If duplicate is false, match_id MUST be null.`;
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
    res.status(400).json({ error: 'Duplicate check failed', detail: 'Invalid JSON body' });
    return;
  }

  const { title, description, district, state } = body;
  const existing = Array.isArray(body.existing) ? body.existing : [];

  if (!title || !description) {
    res.status(400).json({ error: 'Duplicate check failed', detail: 'title and description are required' });
    return;
  }

  /* Fast path — no candidates (e.g. no problems filed in that state/district
     yet): nothing to compare against, skip the Gemini round-trip entirely. */
  if (existing.length === 0) {
    res.status(200).json({ duplicate: false, match_id: null, reason: 'No existing problems in this area' });
    return;
  }

  const apiKey = process.env.kuestl_gemini_key;
  if (!apiKey) {
    // Fail OPEN — an unconfigured key must never block filing.
    console.error('[check-dup] missing kuestl_gemini_key env var');
    res.status(200).json({ duplicate: false, match_id: null, reason: 'Checker not configured' });
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
            parts: [{ text: buildPrompt({ title, description, district, state }, existing) }]
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

    /* Normalize — the client only trusts { duplicate:true, match_id } and the
       match_id must point at one of the candidates we actually sent. */
    const validIds = new Set(existing.map(c => c.id));
    const duplicate = !!(result && result.duplicate === true &&
      result.match_id != null && validIds.has(result.match_id));

    res.status(200).json({
      duplicate,
      match_id: duplicate ? result.match_id : null,
      reason: typeof (result && result.reason) === 'string' ? result.reason : ''
    });
  } catch (err) {
    // Fail OPEN — never block the report because the checker failed.
    console.error('[check-dup] failed open:', err.message);
    res.status(200).json({ duplicate: false, match_id: null, reason: 'Checker unavailable' });
  }
};