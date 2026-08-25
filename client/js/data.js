/* ===================================================================
   SolveSamaj — DEMO DATA
   ===================================================================
   Everything in this file is placeholder/mock data. When the backend
   is ready, this is the ONLY file that should need to change shape:
   replace each constant below with a fetch() call that returns the
   same shape, and every page keeps working unmodified.

   Shapes:
     PROBLEM   { id, title, desc, category, tags[], district, block,
                 affected, severity, urgency, status, supporters,
                 contributors, date, orgs[] }
     ORG       { name, full, type, verified, location, expertise[],
                 projects }
     PROJECT   { code, title, problem(id), stage, stageIdx, lead,
                 orgs[], team, start, progress, summary,
                 milestones[[name,pct]], tasks[[task,owner,status,due]],
                 docs[[name,meta]], discussion[[who,msg,when]],
                 outcomes[[value,label]] }
   =================================================================== */

const CATEGORY_COLORS = {
  "Agriculture":        "#5C7A29",
  "Healthcare":         "#B23A63",
  "Water & Sanitation": "#2568A8",
  "Infrastructure":     "#C9622E",
  "Education":          "#6E4FA0",
  "Environment":        "#2F8F5B",
  "Energy":             "#B8860B",
  "Accessibility":      "#4552B8",
  "Disaster Management":"#A32F2F",
  "Public Services":    "#0F7173",
  "Rural Livelihoods":  "#8A6A3D",
};

const AVATAR_PALETTE = ["#0F7173","#B4761F","#5C7A29","#B23A63","#2568A8","#6E4FA0","#A32F2F","#2F8F5B"];

const PROBLEMS = [
  { id:1042, title:"Drainage failure floods school access road every monsoon", desc:"The only road connecting Village X to the block highway becomes impassable for 6–8 weeks every monsoon because the drainage channel silts up, cutting off ~3,000 residents and forcing children to skip school.", category:"Infrastructure", tags:["#monsoon","#drainage","#road"], district:"Ranchi", block:"Ormanjhi", affected:3000, severity:"high", urgency:"Within days", status:"progress", supporters:183, contributors:27, date:"2026-07-12", orgs:["MMMUT","Civica NGO"] },
  { id:1108, title:"Groundwater contamination near tannery cluster", desc:"Well-water testing shows elevated chromium levels affecting drinking water for four hamlets downstream of a small tannery cluster.", category:"Water & Sanitation", tags:["#groundwater","#pollution"], district:"Dhanbad", block:"Baliapur", affected:1200, severity:"critical", urgency:"Immediate", status:"open", supporters:96, contributors:14, date:"2026-08-03", orgs:[] },
  { id:1156, title:"No cold-storage access for tomato farmers", desc:"Farmers lose an estimated 30% of tomato yield post-harvest due to the nearest cold storage being over 40km away, leading to distress sales.", category:"Agriculture", tags:["#postharvest","#coldchain"], district:"Ranchi", block:"Bero", affected:2400, severity:"medium", urgency:"Within months", status:"validated", supporters:211, contributors:19, date:"2026-07-22", orgs:["AgroLink Startup"] },
  { id:1201, title:"Primary health centre lacks a functioning ultrasound unit", desc:"Pregnant women in three panchayats must travel 25km for basic prenatal ultrasound, delaying detection of high-risk pregnancies.", category:"Healthcare", tags:["#maternal-health","#phc"], district:"Bokaro", block:"Chandankiyari", affected:5600, severity:"high", urgency:"Within days", status:"review", supporters:142, contributors:9, date:"2026-07-29", orgs:[] },
  { id:1233, title:"Frequent transformer burnouts cut power to weaving cluster", desc:"A cottage-industry weaving cluster of 80+ households loses 3–4 working days a month to transformer failures on an overloaded feeder line.", category:"Energy", tags:["#electricity","#livelihoods"], district:"Jamshedpur", block:"Potka", affected:400, severity:"medium", urgency:"Within months", status:"progress", supporters:58, contributors:6, date:"2026-07-15", orgs:["NIT Jamshedpur","PowerGrid Interns Collective"] },
  { id:1267, title:"River erosion threatens riverside settlement", desc:"Seasonal flooding has eroded over 40 metres of riverbank in the last three years, now within 15 metres of the nearest homes.", category:"Environment", tags:["#erosion","#flood"], district:"Sahibganj", block:"Rajmahal", affected:850, severity:"critical", urgency:"Immediate", status:"open", supporters:77, contributors:11, date:"2026-08-08", orgs:[] },
  { id:1288, title:"Learning gap in government middle school science labs", desc:"Of 12 middle schools in the block, only 2 have a functioning science lab, limiting practical learning ahead of board exams.", category:"Education", tags:["#stem","#schools"], district:"Ranchi", block:"Kanke", affected:2100, severity:"low", urgency:"Long-term", status:"validated", supporters:64, contributors:8, date:"2026-07-19", orgs:["Vidya Foundation"] },
  { id:1305, title:"No wheelchair-accessible ramp at district hospital OPD", desc:"The district hospital's main OPD block has stairs only, making outpatient visits difficult for elderly and disabled patients.", category:"Accessibility", tags:["#accessibility","#hospital"], district:"Dhanbad", block:"Dhanbad Sadar", affected:900, severity:"medium", urgency:"Within months", status:"resolved", supporters:39, contributors:5, date:"2026-06-02", orgs:["Sahyog NGO"] },
  { id:1319, title:"Broken handpump serving three hamlets", desc:"The only functioning handpump for roughly 600 people across three hamlets has been broken for five weeks, forcing a 2km walk for water.", category:"Water & Sanitation", tags:["#handpump","#water"], district:"Ranchi", block:"Namkum", affected:600, severity:"high", urgency:"Immediate", status:"review", supporters:31, contributors:4, date:"2026-08-21", orgs:[] },
  { id:1314, title:"Crop pest outbreak unreported to Krishi Kendra", desc:"A fall-armyworm outbreak is spreading across maize fields with no formal channel for farmers to alert the local agriculture extension office.", category:"Agriculture", tags:["#pest","#maize"], district:"Gumla", block:"Gumla Sadar", affected:1800, severity:"high", urgency:"Immediate", status:"review", supporters:22, contributors:3, date:"2026-08-19", orgs:[] },
];

/* Problem posting taxonomy — grouped sub-tags rendered on the report form.
   Each group borrows a palette colour (same keys as CATEGORY_COLORS) so
   panels stay visually consistent with the rest of the desk. */
const PROBLEM_CATEGORY_GROUPS = [
  { name:"Healthcare", color:"#B23A63", tags:[
    "Hospital Access & Infrastructure","Primary & Preventive Healthcare","Emergency & Trauma Care",
    "Maternal & Child Health","Mental Health & Counseling","Disease Outbreak & Epidemics",
    "Medicine Availability & Affordability","Healthcare for Elderly & Disabled","Nutrition & Malnutrition",
    "Drug Abuse & Rehabilitation"] },
  { name:"Water & Sanitation", color:"#2568A8", tags:[
    "Drinking Water Access","Water Quality & Contamination","Groundwater Depletion",
    "Irrigation & Farming Water","Sewage & Wastewater","Open Defecation & Toilet Access",
    "Waterlogging & Drainage","Flood Control & River Management"] },
  { name:"Agriculture & Food", color:"#5C7A29", tags:[
    "Crop Yield & Soil Health","Pest & Disease Control","Farmer Income & Market Access",
    "Post-Harvest Loss & Storage","Irrigation Technology","Animal Husbandry & Dairy",
    "Fisheries & Aquaculture","Food Adulteration & Safety","Seed & Fertilizer Access"] },
  { name:"Infrastructure", color:"#C9622E", tags:[
    "Railways","Airways","Road & Bridge Connectivity","Rural Electrification","Housing & Shelter",
    "Public Building Maintenance","Street Lighting","Telecom & Internet Connectivity","Public Transport Access"] },
  { name:"Education", color:"#6E4FA0", tags:[
    "School Access & Dropout","Teacher Shortage & Quality","Adult Literacy","Vocational & Skill Training",
    "Higher Education Access","Digital Learning Infrastructure","Disability-Inclusive Education",
    "Student Project and Innovation"] },
  { name:"Environment", color:"#2F8F5B", tags:[
    "Air Pollution","Soil Degradation & Erosion","Deforestation & Illegal Logging",
    "Wildlife & Biodiversity Loss","Industrial & Chemical Pollution","Plastic & Solid Waste",
    "E-Waste Management","Climate Adaptation & Resilience"] },
  { name:"Energy", color:"#B8860B", tags:[
    "Rural Electrification & Power Cuts","Affordable Clean Cooking Fuel",
    "Solar & Renewable Adoption","Energy Efficiency in Buildings"] },
  { name:"Livelihoods & Economy", color:"#8A6A3D", tags:[
    "Unemployment & Underemployment","Tribal & Marginalized Community Livelihoods",
    "Women's Economic Empowerment","Migrant Worker Welfare","Child Labour","MSME & Small Business Support"] },
  { name:"Governance & Public Services", color:"#0F7173", tags:[
    "Corruption & Bribery","Delay in Government Schemes","Land Records & Property Disputes",
    "Legal Aid Access","Police & Safety Concerns","Voter Awareness & Participation"] },
  { name:"Disaster & Safety", color:"#A32F2F", tags:[
    "Flood Preparedness & Relief","Drought & Water Scarcity","Earthquake Preparedness",
    "Industrial Accident Safety","Fire Safety in Public Spaces","Road Accident Hotspots"] },
  { name:"Social Issues", color:"#4552B8", tags:[
    "Caste Discrimination","Gender-Based Violence","Child Marriage","Trafficking & Exploitation",
    "Accessibility for Persons with Disabilities","Elderly Care & Abandonment"] },
];

const ORGS = [
  { name:"MMMUT", full:"Madan Mohan Malaviya University of Technology", type:"University", verified:true, location:"Gorakhpur, UP", expertise:["Civil & Structural Engineering","IT / Computer Science & AI","Electronics & Embedded Systems","Renewable Energy & Clean Technology"], projects:6,
    desc:"A public technical university running applied research, student innovation projects and rural technology deployment programs across eastern Uttar Pradesh." },
  { name:"NIT Jamshedpur", full:"National Institute of Technology, Jamshedpur", type:"University", verified:true, location:"Jamshedpur, JH", expertise:["Electronics & Embedded Systems","Mechanical Engineering","Electrical and Electronics"], projects:11,
    desc:"An Institute of National Importance known for power-systems research, robotics labs and industry-sponsored infrastructure studies across Jharkhand." },
  { name:"Civica NGO", full:"Civica Rural Development Trust", type:"NGO", verified:true, location:"Ranchi, JH", expertise:["Social Work & Community Development","Public Health & Medicine"], projects:14,
    desc:"Rural development trust working on community mobilization, drinking-water safety and sanitation drives across Ranchi's blocks and panchayats." },
  { name:"AgroLink Startup", full:"AgroLink Technologies Pvt. Ltd.", type:"Startup", verified:false, location:"Ranchi, JH", expertise:["Agricultural technology","Business, Entrepreneurship & Management"], projects:3,
    desc:"Agri-tech startup building cold-chain IoT hardware and market-linkage tools that cut post-harvest losses for smallholder farmers." },
  { name:"Vidya Foundation", full:"Vidya Education Foundation", type:"NGO", verified:true, location:"Patna, BR", expertise:["Education & Pedagogy","Psychology & Behavioral Science"], projects:22,
    desc:"Education NGO focused on STEM learning, teacher training and dropout-prevention programs in government schools across Bihar." },
  { name:"Sahyog NGO", full:"Sahyog Disability Rights Collective", type:"NGO", verified:true, location:"Dhanbad, JH", expertise:["Social Work & Community Development","Law & Public Policy"], projects:9,
    desc:"Disability-rights collective conducting accessibility audits and assistive-tech adoption drives in Dhanbad's public spaces." },
  { name:"PowerGrid Interns Collective", full:"PowerGrid Corp — CSR Innovation Cell", type:"Industry / CSR", verified:true, location:"Ranchi, JH", expertise:["Electrical and Electronics","Renewable Energy & Clean Technology"], projects:5,
    desc:"CSR innovation cell of PowerGrid Corp piloting grid-reliability upgrades and rural electrification models with engineering interns." },
  { name:"Sensfirm Robotics", full:"Sensfirm Robotics Pvt. Ltd.", type:"Startup", verified:false, location:"Bengaluru, KA", expertise:["Electronics & Embedded Systems","IT / Computer Science & AI"], projects:2,
    desc:"Robotics startup prototyping low-cost environmental sensors, including flood early-warning nodes for riverine districts." },
];

const PROJECTS = [
  { code:"PRJ-0312", title:"Smart Drainage & Early Warning System", problem:1042, stage:"Research", stageIdx:3, lead:"MMMUT", orgs:["MMMUT","Civica NGO"], team:6, start:"2026-07-18", progress:38,
    summary:"Combining low-cost IoT water-level sensors with an SMS early-warning system for the drainage channel serving Village X, alongside a civil-engineering redesign proposal for the channel itself.",
    milestones:[["Problem scoping & site survey",100],["Sensor prototype",65],["Community SMS pilot",20],["Civil redesign proposal",0]],
    tasks:[["Finalize sensor placement map","R. Kumar (MMMUT)","In progress","28 Aug"],["Draft SMS alert flow","Civica NGO team","In progress","30 Aug"],["Civil BOQ estimate","Civil Eng. dept.","Not started","10 Sep"]],
    docs:[["Site survey report.pdf","2.4 MB · 14 Jul"],["Sensor spec sheet.xlsx","310 KB · 20 Jul"]],
    discussion:[["R. Kumar (MMMUT)","Site visit done — channel silting is worse near the culvert, will need dredging before sensors go in.","19 Jul"],["Civica NGO","We can mobilize 15 volunteers for the community SMS pilot, just need the message templates.","22 Jul"]],
    outcomes:[["—","People benefited (projected)"],["—","Flood events reduced"],["—","Response time improvement"],["—","Cost saved vs. reactive repair"]] },
  { code:"PRJ-0298", title:"Cold-Chain Micro-Storage Pilot", problem:1156, stage:"Prototype", stageIdx:5, lead:"AgroLink Startup", orgs:["AgroLink Startup"], team:4, start:"2026-07-29", progress:56,
    summary:"A solar-powered micro cold-storage unit pilot for 40 tomato-farming households in Bero block, aiming to cut post-harvest loss by half.",
    milestones:[["Farmer household survey",100],["Unit design finalized",100],["Prototype build",70],["Field trial",0]],
    tasks:[["Order solar panel batch","Ops team","Done","—"],["Assemble first unit","Fab team","In progress","2 Sep"]],
    docs:[["Farmer survey results.csv","88 KB · 3 Aug"]],
    discussion:[["AgroLink Startup","Prototype cooling chamber holds 4°C consistently in bench tests — moving to field enclosure next.","5 Aug"]],
    outcomes:[["30%→15%","Projected post-harvest loss"],["40","Households in pilot"],["—","Income uplift (TBD)"],["1","Unit deployed"]] },
  { code:"PRJ-0341", title:"Feeder Line Load Balancing Study", problem:1233, stage:"Development", stageIdx:4, lead:"NIT Jamshedpur", orgs:["NIT Jamshedpur","PowerGrid Interns Collective"], team:8, start:"2026-07-20", progress:44,
    summary:"Analyzing load patterns on the overloaded feeder serving the Potka weaving cluster and proposing a phased load-balancing and transformer-upgrade plan.",
    milestones:[["Load data collection",100],["Simulation model",80],["Upgrade proposal draft",30],["PowerGrid sign-off",0]],
    tasks:[["Validate simulation against Aug outage data","NIT team","In progress","1 Sep"],["Draft transformer upgrade BOQ","PowerGrid engineers","Not started","15 Sep"]],
    docs:[["Load simulation v2.pdf","1.1 MB · 25 Jul"]],
    discussion:[["PowerGrid Interns Collective","We can fast-track budget approval once the simulation is validated against real outage logs.","27 Jul"]],
    outcomes:[["—","Outage-days avoided (projected)"],["80","Households directly affected"],["—","Working days recovered"],["—","Feeder capacity headroom"]] },
];

const NOTIFICATIONS = [
  { color:"var(--setu)", text:"MMMUT expressed interest in your problem #1042 — Drainage failure near School X.", time:"2 hours ago" },
  { color:"var(--ochre-2)", text:"PowerGrid Interns Collective invited NIT Jamshedpur to collaborate on PRJ-0341.", time:"Yesterday" },
  { color:"var(--ledger)", text:"Problem #1305 was marked Resolved by Sahyog NGO.", time:"2 days ago" },
  { color:"var(--rust)", text:"Your organization profile is still Pending Verification — submit documents to speed this up.", time:"3 days ago" },
  { color:"var(--setu)", text:"New milestone update posted on PRJ-0312: Sensor prototype now 65% complete.", time:"4 days ago" },
];

const REVIEW_QUEUE = [
  { id:1319, title:"Broken handpump serving 3 hamlets", category:"Water & Sanitation", flag:"—", date:"Today" },
  { id:1318, title:"Village road flooding every rainy season", category:"Infrastructure", flag:"92% match to #1042", date:"Today" },
  { id:1316, title:"No streetlights on school route", category:"Infrastructure", flag:"—", date:"Yesterday" },
  { id:1314, title:"Crop pest outbreak unreported to Krishi Kendra", category:"Agriculture", flag:"Needs location", date:"Yesterday" },
];

const STATUS_STAGES = [
  ["submitted","Submitted","Citizen filed the problem"],
  ["review","Under Review","Admin checking completeness"],
  ["validated","Validated","Confirmed genuine & categorized"],
  ["open","Open for Solutions","Visible to matching organizations"],
  ["progress","Project Active","An organization is working on it"],
  ["testing","Solution Testing","Prototype under field validation"],
  ["resolved","Impact Verified","Deployed & outcome recorded"],
];

/* Team KUEST-L — built this prototype for Smart India Hackathon 2026.
   Name derives from first letters: Khushil, Udit, Epshita, Shaurya, Tanisha, Lakshay. */
const TEAM = {
  name: "KUEST-L",
  event: "Smart India Hackathon 2026",
  problemStatement: "Problem Statement 26043 — Societal Innovation Collaboration Portal",
  members: [
    { name:"Khushil" },
    { name:"Udit" },
    { name:"Epshita" },
    { name:"Shaurya" },
    { name:"Tanisha" },
    { name:"Lakshay" },
  ],
};

/* -------------------------------------------------------------------
   FUNDING — demo records.
   kind: 'problem' | 'project'; ref: problem id or project code.
   pledges[]: { by, type:'org'|'individual', amount, status }
     'pledged' = recorded, awaiting receipt verification by the
                 case/project owner
     'received'= verified by the owner
   raised  = sum of verified ('received') pledges
   pledged = sum of pledges still awaiting verification
   ------------------------------------------------------------------- */
const FUND_REQUESTS = [
  { id:'FR-2401', kind:'problem', ref:1108, title:'Water testing kits & lab analysis',
    desc:'Chromium test kits for four hamlets plus NIT Jamshedpur lab analysis fees.',
    target:60000, postedBy:'Dhanbad Zila Parishad', pledges:[
      { by:'MMMUT', type:'org', amount:25000, status:'received' },
      { by:'Ravi Sharma', type:'individual', amount:5000, status:'received' },
      { by:'PowerGrid Interns Collective', type:'org', amount:10000, status:'pledged' },
    ]},
  { id:'FR-2402', kind:'project', ref:'PRJ-0312', title:'Cold-storage prototype enclosure',
    desc:'Insulated panels, thermostat controller and field-trial logistics for the tomato pilot.',
    target:120000, postedBy:'AgroLink Startup', pledges:[
      { by:'NIT Jamshedpur', type:'org', amount:40000, status:'received' },
      { by:'Meena Gupta', type:'individual', amount:7500, status:'received' },
      { by:'Civica NGO', type:'org', amount:20000, status:'pledged' },
    ]},
  { id:'FR-2403', kind:'problem', ref:1201, title:'Portable ultrasound deposit',
    desc:'Advance payment to rent a portable ultrasound unit for the primary health centre.',
    target:95000, postedBy:'Bokaro Health Society', pledges:[
      { by:'Ankit Verma', type:'individual', amount:11000, status:'received' },
    ]},
  { id:'FR-2404', kind:'project', ref:'PRJ-0341', title:'Feeder sensor hardware',
    desc:'Current & voltage sensors plus data loggers for the load-balancing study.',
    target:45000, postedBy:'NIT Jamshedpur', pledges:[] },
];
