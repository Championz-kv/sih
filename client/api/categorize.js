// ---------------------------------------------------------------------------
// SolveSamaj — Gemini auto-categorizer proxy (Vercel serverless function)
// ---------------------------------------------------------------------------
// The frontend (submit.html) POSTs the problem details here; this function
// forwards them to the Gemini API and returns structured metadata. The Gemini
// API key never leaves the server — it is read from the Vercel env var
// `kuestl_gemini_key`. Uses only Node 18+ built-in fetch (no npm packages).
// ---------------------------------------------------------------------------

/* --- Exact prompt builder (kept verbatim from the task spec) --- */
function buildPrompt(title, description, district, state, affectedCount) {
  const categories = [
    "Hospital Access & Infrastructure","Primary & Preventive Healthcare",
    "Emergency & Trauma Care","Maternal & Child Health",
    "Mental Health & Counseling","Disease Outbreak & Epidemics",
    "Medicine Availability & Affordability","Healthcare for Elderly & Disabled",
    "Nutrition & Malnutrition","Drug Abuse & Rehabilitation",
    "Rural Health Worker Shortage","Telemedicine & Remote Diagnosis",
    "Traditional Medicine & AYUSH Access","Drinking Water Access",
    "Water Quality & Contamination","Groundwater Depletion",
    "Irrigation & Farming Water","Sewage & Wastewater",
    "Open Defecation & Toilet Access","Waterlogging & Drainage",
    "Flood Control & River Management","Handpump & Borewell Maintenance",
    "Water Tanker Dependency","Crop Yield & Soil Health",
    "Pest & Disease Control","Farmer Income & Market Access",
    "Post-Harvest Loss & Storage","Irrigation Technology",
    "Animal Husbandry & Dairy","Fisheries & Aquaculture",
    "Food Adulteration & Safety","Seed & Fertilizer Access",
    "Cold Chain & Rural Storage Infrastructure","Farm Equipment Access & Repair",
    "Crop Insurance & Risk Support","Organic Farming & Certification",
    "Road & Bridge Connectivity","Rural Electrification",
    "Housing & Shelter","Public Building Maintenance","Street Lighting",
    "Telecom & Internet Connectivity","Public Transport Access",
    "Panchayat Building & Gram Sabha Infrastructure",
    "Government Office Accessibility","Public Toilet & Rest Area Infrastructure",
    "Last-Mile Connectivity in Remote Areas","Railway & Bus Station Facilities",
    "School Access & Dropout","Teacher Shortage & Quality","Adult Literacy",
    "Vocational & Skill Training","Higher Education Access",
    "Digital Learning Infrastructure","Disability-Inclusive Education",
    "Midday Meal & School Nutrition","Anganwadi & Early Childhood Education",
    "Girl Child Education & Retention","Coaching & Competitive Exam Access",
    "Air Pollution","Soil Degradation & Erosion","Deforestation & Illegal Logging",
    "Wildlife & Biodiversity Loss","Industrial & Chemical Pollution",
    "Plastic & Solid Waste","E-Waste Management",
    "Climate Adaptation & Resilience","Mining & Land Degradation",
    "River & Lake Encroachment","Stubble Burning & Crop Residue",
    "Rural Electrification & Power Cuts","Affordable Clean Cooking Fuel",
    "Solar & Renewable Adoption","Energy Efficiency in Buildings",
    "Biomass & Biogas for Rural Households","Street Light & Public Lighting Outages",
    "Unemployment & Underemployment","Tribal & Marginalized Community Livelihoods",
    "Women's Economic Empowerment","Migrant Worker Welfare","Child Labour",
    "MSME & Small Business Support","SHG & Cooperative Support",
    "Artisan & Handicraft Market Access","MGNREGA & Rural Employment Schemes",
    "Fair Wage & Labour Rights","Corruption & Bribery",
    "Delay in Government Schemes","Land Records & Property Disputes",
    "Legal Aid Access","Police & Safety Concerns","Voter Awareness & Participation",
    "Ration & PDS System Issues","Aadhar, ID & Document Access",
    "Pension & Welfare Scheme Delivery","Gram Panchayat Transparency & Audit",
    "Grievance Redressal & RTI","Caste Certificate & OBC/SC/ST Documentation",
    "Flood Preparedness & Relief","Drought & Water Scarcity",
    "Earthquake Preparedness","Industrial Accident Safety",
    "Fire Safety in Public Spaces","Road Accident Hotspots",
    "Cyclone & Extreme Weather Preparedness","Landslide & Hill Area Safety",
    "Early Warning System Access in Villages","Caste Discrimination",
    "Gender-Based Violence","Child Marriage","Trafficking & Exploitation",
    "Accessibility for Persons with Disabilities","Elderly Care & Abandonment",
    "Bonded Labour & Forced Work","Social Ostracism & Community Conflict"
  ];


  return `You are an expert analyst for SolveSamaj, an Indian civic problem-reporting platform. A citizen has submitted a societal problem. Your job is to analyze it and return structured metadata to help route it to the right organizations.

PROBLEM SUBMITTED:
Title: ${title}
Description: ${description}
Location: ${district}, ${state}
Estimated people affected: ${affectedCount || 'Not specified'}

YOUR TASK:
1. Select 1 to 4 categories from ONLY this list (exact strings, no variations):
${categories.map(c => `"${c}"`).join(', ')}

2. Assess severity:
- critical: immediate danger to life, health emergency, disaster
- high: serious ongoing harm, large population affected, urgent need
- medium: significant problem but not immediately life-threatening
- low: quality-of-life issue, long-term concern

3. Assess urgency on a scale of 1-10:
- 9-10: requires action within days
- 7-8: requires action within weeks
- 5-6: requires action within months
- 1-4: long-term structural issue

4. Suggest 3 to 6 lowercase hashtags (no spaces, use hyphens for multi-word) relevant to the problem. Examples: #clean-water, #rural-roads, #farmer-income, #girl-education

Return ONLY a valid JSON object in this exact structure:
{
  "categories": ["Category One", "Category Two"],
  "severity": "high",
  "urgency": 7,
  "hashtags": ["#example-tag", "#another-tag"],
  "reasoning": "One sentence explaining why these categories were chosen."
}`;
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

  const apiKey = process.env.kuestl_gemini_key;
  if (!apiKey) {
    res.status(500).json({ error: 'Categorization failed', detail: 'Missing Gemini API key' });
    return;
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    res.status(400).json({ error: 'Categorization failed', detail: 'Invalid JSON body' });
    return;
  }

  const { title, description, district, state, affected_count } = body;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: buildPrompt(title, description, district, state, affected_count) }]
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
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: 'Categorization failed', detail: err.message });
  }
};