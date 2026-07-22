import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Modal, StyleSheet, Platform, Alert, StatusBar, ActivityIndicator, Switch, Dimensions, Share, Linking, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import RNShare from 'react-native-share';
import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  getAvailablePurchases,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
} from 'react-native-iap';
import useCases from './src/data/cases/useCases';

// ═══════════════════════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════════════════════
const C={bg:'#0c1117',sf:'#151d28',sfr:'#1a2433',t1:'#e8edf4',t2:'#8899ad',t3:'#556677',ac:'#4fc3f7',acd:'#1a3a4f',acp:'#3aa8d8',bd:'#1e2d3d',crit:'#ef4444',high:'#f59e0b',low:'#60a5fa',ok:'#34d399',cbg:'rgba(239,68,68,0.07)',gbg:'#0d2818',gbd:'#34d399',rbg:'#2a1215',rbd:'#f87171',ibg:'rgba(52,211,153,0.15)',nbg:'rgba(248,113,113,0.15)',ov:'rgba(0,0,0,0.65)',amber:'#f59e0b',amberDim:'rgba(245,158,11,0.12)',purple:'#a78bfa',purpleDim:'rgba(167,139,250,0.12)',gold:'#fbbf24',goldDim:'rgba(251,191,36,0.12)'};
const FC={critical:C.crit,high:C.high,low:C.low,normal:C.ok};
const FL={critical:'⚠ CRITICAL',high:'↑ HIGH',low:'↓ LOW',normal:'✓ WNL'};
const W=Dimensions.get('window').width;

// ═══════════════════════════════════════════════════════════
// IAP PRODUCT IDS + PRICING
// Keep these IDs in sync with App Store Connect / Google Play Console.
//   - MONTHLY  → auto-renewing subscription, $14.99/month
//   - LIFETIME → non-consumable one-time purchase, $59.99
// PRICE_* strings are display-only fallbacks; the real localized price
// comes back from the store via fetchProducts() at runtime.
// ═══════════════════════════════════════════════════════════
const PRODUCT_ID_MONTHLY  = 'com.scrublife.ncjmm.pro.monthly';
const PRODUCT_ID_LIFETIME = 'com.scrublife.ncjmm.pro.lifetime';
// Back-compat alias — older code paths referenced PRODUCT_ID directly.
const PRODUCT_ID = PRODUCT_ID_MONTHLY;
const PRICE_MONTHLY  = '$14.99';
const PRICE_LIFETIME = '$59.99';

// ═══════════════════════════════════════════════════════════
// EXTRA NCLEX CATEGORY CHIPS
// These are always shown in the horizontal "Case Studies" filter row,
// even when no case carries the tag yet (count will display as 0).
// To populate one of these categories with a real case, add the matching
// string to the case JSON's "tags" array, e.g.:
//
//     "tags": ["Cardiovascular", "Reduction of Risk Potential"]
//
// The daily case-generator workflow (.github/workflows/daily_cases.yml)
// can rotate through these NCLEX test-plan buckets by picking one of the
// strings below for each new case and writing it into the "tags" array
// of the generated case JSON (see CLAUDE.md §4 for the NCSBN test plan).
// ═══════════════════════════════════════════════════════════
const EXTRA_NCLEX_CATEGORIES = [
  'Management of Care',
  'Health Promotion',
  'Safety & Infection Control',
  'Basic Care & Comfort',
  'Reduction of Risk Potential',
  'Leadership & Delegation',
  'Ethical & Legal',
];

// ═══════════════════════════════════════════════════════════
// LICENSURE TRACKS — the learner picks one at onboarding (and can switch it
// any time from the home-screen toggle). Each case carries a "tracks" array;
// the app is RN-first so every array includes 'RN'. The array is ADDITIVE:
//   ["RN"]              → RN scope only (acute/critical/RN-exclusive care)
//   ["RN","LVN"]        → also within LVN scope (stable/ongoing/teaching care)
//   ["RN","LVN","LPT"]  → also within LPT scope (psych / behavioral / SUD)
// A case is shown to a learner when its tracks array includes the picked track,
// so RN sees everything, LVN sees LVN+psych cases, LPT sees psych cases only.
// ═══════════════════════════════════════════════════════════
const TRACKS = ['RN', 'LVN', 'LPT'];
const TRACK_META = {
  RN:  { label: 'RN',  name: 'Registered Nurse',          blurb: 'Full scope — every case in the library.' },
  LVN: { label: 'LVN', name: 'Licensed Vocational Nurse', blurb: 'Stable & ongoing care within LVN/LPN scope.' },
  LPT: { label: 'LPT', name: 'Psychiatric Technician',    blurb: 'Psychiatric, behavioral & substance-use cases.' },
};
const DEFAULT_TRACK = 'RN';
// Cases missing a tracks array stay visible to everyone (never silently dropped).
function caseTracks(c){ return Array.isArray(c?.tracks) && c.tracks.length ? c.tracks : TRACKS; }
// Track filtering is FORMAT-LOCKED:
//  • LPT (California Psychiatric Technician) is tested only in the state exam's
//    single-best-answer multiple-choice format, so the LPT track shows ONLY
//    format:'mc' cases — never the 6-step NGN cases, regardless of tags.
//  • RN/LVN take the Next-Gen NCLEX, so they see ONLY NGN cases (never MC).
// This guarantees the split even if a case is mistagged or a daily-generated
// case forgets its tracks array.
function casesForTrack(cases, track){
  return (cases||[]).filter(c => {
    const isMc = c.format === 'mc';
    if (track === 'LPT') return isMc;
    return !isMc && caseTracks(c).includes(track);
  });
}
// Only the RN ("Nurse") track ships free cases; LVN/LPT are Pro upgrade tracks.
const FREE_TRACK = 'RN';
// Safe top inset for full-bleed screen headers. Android draws edge-to-edge under
// the status bar / notch (Expo SDK 54+), so pad by the real status-bar height.
const SAFE_TOP = Platform.OS==='ios' ? 54 : (StatusBar.currentHeight || 24) + 8;
// Fisher–Yates shuffle — used to present ranking steps unsolved (never pre-arranged).
function shuffle(a){const x=a.slice();for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]];}return x;}

// ═══════════════════════════════════════════════════════════
// BUNDLED CASES — 6 cases shipped with the app.
// Daily-generated cases merge on top via the useCases hook (no rebuild needed).
// ═══════════════════════════════════════════════════════════

const BUNDLED_CASES=[
  // CASE 1: ELECTROLYTES (FREE)
  {id:'electrolyte-001',tracks:['RN'],title:'Imbalanced Electrolytes',subtitle:'Human Response & Clinical Judgment',isFree:true,category:'Physiological Adaptation',
  patient:{name:'J. Morales',age:68,sex:'Male',code:'Full Code',allergies:'NKDA',admitDate:'Today, 0645',room:'4-South, Bed 2'},
  vitals:[{time:'0600',hr:'52 bpm',bp:'148/88',rr:'18/min',spo2:'96% RA'},{time:'0800',hr:'48 bpm',bp:'152/92',rr:'20/min',spo2:'95% RA'}],
  labs:[{n:'Sodium (Na⁺)',v:'132 mEq/L',r:'136–145',f:'low'},{n:'Potassium (K⁺)',v:'6.1 mEq/L',r:'3.5–5.0',f:'critical'},{n:'BUN',v:'38 mg/dL',r:'7–20',f:'high'},{n:'Creatinine',v:'2.4 mg/dL',r:'0.7–1.3',f:'high'},{n:'pH (ABG)',v:'7.30',r:'7.35–7.45',f:'low'},{n:'Bicarb (HCO₃⁻)',v:'20 mEq/L',r:'22–26',f:'low'}],
  nursesNote:'0645 — 68 y/o male admitted from ED. Reports progressive fatigue and muscle weakness over 3 days. States "my legs feel heavy and tingly." History includes ACE inhibitor and potassium-sparing diuretic. Taking NSAID OTC. UO 180 mL/8hrs. Peaked T-waves and widened QRS on ECG. Oriented x4.',
  steps:[
    {id:1,title:'Recognize Cues',sub:'What matters?',icon:'🔍',inst:'Select ALL clinically relevant cues.',type:'multi',opts:[
      {id:'a',text:'Heart rate 48–52 bpm (bradycardia)',c:true,rat:'Critical cue. Elevated K⁺ affects cardiac conduction → bradycardia.'},
      {id:'b',text:'K⁺ 6.1 mEq/L (critically elevated)',c:true,rat:'Hallmark critical lab. Risk for lethal dysrhythmias.'},
      {id:'c',text:'BUN 38 / Creatinine 2.4 (elevated)',c:true,rat:'Renal markers — kidneys not clearing K⁺.'},
      {id:'d',text:'Patient is oriented x4',c:false,rat:'Normal finding. Not a concerning cue.'},
      {id:'e',text:'UO 180 mL/8hrs (oliguria)',c:true,rat:'Dangerously low. K⁺ not being excreted.'},
      {id:'f',text:'Peaked T-waves and widened QRS',c:true,rat:'Classic cardiac effects of elevated K⁺. Priority safety cue.'},
      {id:'g',text:'Reports "legs feel heavy and tingly"',c:true,rat:'Neuromuscular symptoms — key human response.'},
      {id:'h',text:'Temperature 98.2°F',c:false,rat:'Normal. Does not contribute to clinical picture.'},
    ]},
    {id:2,title:'Analyze Cues',sub:'What do cues mean together?',icon:'🧩',inst:'Select correct linkages.',type:'multi',opts:[
      {id:'a',text:'Elevated K⁺, peaked T-waves, and bradycardia indicate cardiac conduction impairment.',c:true,rat:'Correct chain. K⁺ depresses conduction → peaked T → widened QRS → bradycardia.'},
      {id:'b',text:'Fatigue is caused by low sodium alone.',c:false,rat:'Na⁺ 132 is only mildly low. Elevated K⁺ and renal impairment are primary drivers.'},
      {id:'c',text:'Elevated BUN/Cr and oliguria mean kidneys can\'t excrete K⁺.',c:true,rat:'Kidneys are primary K⁺ excretion route. When renal function declines, K⁺ accumulates.'},
      {id:'d',text:'NSAID + K⁺-sparing diuretic compound retention risk.',c:true,rat:'NSAIDs reduce renal blood flow + K⁺-sparing diuretics block excretion = triple threat.'},
    ]},
    {id:3,title:'Prioritize Hypotheses',sub:'Priority nursing concern?',icon:'⚡',inst:'RANK highest to lowest using ABCs.',type:'rank',opts:[
      {id:'a',text:'Risk for Decreased Cardiac Output r/t electrolyte-induced conduction changes',cr:1,rat:'HIGHEST (Circulation). Heart actively affected → can progress to lethal dysrhythmias.'},
      {id:'b',text:'Excess Fluid Volume r/t impaired renal elimination',cr:3,rat:'Important but less immediately life-threatening.'},
      {id:'c',text:'Risk for Electrolyte Imbalance (worsening)',cr:2,rat:'HIGH. Without intervention K⁺ rises → worse cardiac risk.'},
      {id:'d',text:'Anxiety r/t hospitalization',cr:4,rat:'Valid but addressed AFTER physiological threats.'},
    ]},
    {id:4,title:'Generate Solutions',sub:'Appropriate interventions?',icon:'💡',inst:'INDICATED or NOT INDICATED.',type:'classify',cats:['Indicated','Not Indicated'],opts:[
      {id:'a',text:'Continuous cardiac monitoring',c:'Indicated',rat:'Essential. ECG already shows changes.'},
      {id:'b',text:'Calcium gluconate IV',c:'Indicated',rat:'Stabilizes cardiac membrane. Protects heart while other interventions work.'},
      {id:'c',text:'IV potassium supplement',c:'Not Indicated',rat:'SAFETY ALERT: K⁺ already 6.1. More K⁺ could be fatal.'},
      {id:'d',text:'Regular insulin IV + D50W',c:'Indicated',rat:'Insulin drives K⁺ into cells. D50W prevents hypoglycemia.'},
      {id:'e',text:'Encourage high-K⁺ foods',c:'Not Indicated',rat:'Contraindicated. Dietary K⁺ must be RESTRICTED.'},
    ]},
    {id:5,title:'Take Action',sub:'Implementation order?',icon:'🎯',inst:'Rank FIRST to LAST.',type:'rank',opts:[
      {id:'a',text:'Place on cardiac monitor + 12-lead ECG',cr:1,rat:'FIRST — Assess before intervening. ABCs.'},
      {id:'b',text:'Administer calcium gluconate IV',cr:2,rat:'SECOND — Stabilize the heart.'},
      {id:'c',text:'Administer insulin IV + D50W',cr:3,rat:'THIRD — Shift K⁺ intracellularly.'},
      {id:'d',text:'Administer Kayexalate + strict I&O',cr:4,rat:'FOURTH — Promote K⁺ elimination.'},
      {id:'e',text:'Hold K⁺-sparing diuretic + notify provider',cr:5,rat:'FIFTH — Prevent further accumulation.'},
    ]},
    {id:6,title:'Evaluate Outcomes',sub:'Improving?',icon:'📊',inst:'Select ALL positive findings.',type:'multi',opts:[
      {id:'a',text:'Repeat K⁺: 5.2 mEq/L (down from 6.1)',c:true,rat:'Improving! Downward trend.'},
      {id:'b',text:'HR: 68 bpm, regular',c:true,rat:'Bradycardia resolved.'},
      {id:'c',text:'ECG: peaked T-waves resolved',c:true,rat:'Myocardium no longer under direct threat.'},
      {id:'d',text:'UO: 60 mL in the last hour',c:true,rat:'Kidneys helping excrete K⁺.'},
      {id:'e',text:'Increased muscle cramping',c:false,rat:'NOT positive. Worsening symptoms need assessment.'},
      {id:'f',text:'Blood glucose: 58 mg/dL',c:false,rat:'HYPOGLYCEMIA — adverse effect of insulin. Complication.'},
    ]},
  ]},

  // CASE 2: HYPOVOLEMIC SHOCK (PRO)
  {id:'hypovolemic-002',tracks:['RN'],title:'Deficient Fluid Volume',subtitle:'Hemorrhagic Circulatory Compromise',isFree:false,category:'Physiological Adaptation',
  patient:{name:'R. Achebe',age:74,sex:'Female',code:'Full Code',allergies:'Sulfa',admitDate:'Today, 1415',room:'ED Bay 3'},
  vitals:[{time:'1415',hr:'118 bpm',bp:'82/54',rr:'26/min',spo2:'93% RA'},{time:'1445',hr:'126 bpm',bp:'76/48',rr:'28/min',spo2:'91% RA'}],
  labs:[{n:'Hgb',v:'7.8 g/dL',r:'12–16 (F)',f:'critical'},{n:'Hct',v:'23%',r:'37–47% (F)',f:'critical'},{n:'Lactate',v:'4.6 mmol/L',r:'0.5–2.0',f:'critical'},{n:'BUN',v:'32 mg/dL',r:'7–20',f:'high'}],
  nursesNote:'1415 — 74 y/o female. 3 days dark tarry stools. On aspirin + warfarin (INR 3.8). Lethargic, confused. Skin cool, pale, diaphoretic. Cap refill >4s. Foley: 15 mL dark urine.',
  steps:[
    {id:1,title:'Recognize Cues',sub:'What requires immediate attention?',icon:'🔍',inst:'Select ALL relevant cues.',type:'multi',opts:[
      {id:'a',text:'BP 82/54 → 76/48 (progressive hypotension)',c:true,rat:'CRITICAL. MAP ~57 and falling.'},
      {id:'b',text:'HR 118→126 (worsening tachycardia)',c:true,rat:'Earliest compensatory sign of hemorrhage.'},
      {id:'c',text:'Hgb 7.8 / Hct 23% (critically low)',c:true,rat:'Significant blood loss.'},
      {id:'d',text:'Lactate 4.6 (tissue hypoperfusion)',c:true,rat:'Cellular oxygen debt.'},
      {id:'e',text:'Dark tarry stools (melena)',c:true,rat:'Upper GI bleeding source.'},
      {id:'f',text:'UO 15 mL (oliguria)',c:true,rat:'Kidneys underperfused.'},
      {id:'g',text:'Oriented to person only',c:true,rat:'Acute cerebral hypoperfusion.'},
      {id:'h',text:'Platelets 162 K/µL',c:false,rat:'Normal. Not contributing.'},
    ]},
    {id:2,title:'Analyze Cues',sub:'How do cues connect?',icon:'🧩',inst:'Select correct linkages.',type:'multi',opts:[
      {id:'a',text:'Melena + low Hgb/Hct + supratherapeutic INR = active hemorrhage.',c:true,rat:'Warfarin + aspirin → GI hemorrhage → volume depletion.'},
      {id:'b',text:'Progressive tachycardia, hypotension, oliguria = failing compensation.',c:true,rat:'Decompensation → organ hypoperfusion.'},
      {id:'c',text:'Elevated lactate confirms tissue oxygen debt.',c:true,rat:'Anaerobic metabolism from inadequate perfusion.'},
      {id:'d',text:'AMS is age-related, not from volume loss.',c:false,rat:'Acute change = cerebral hypoperfusion.'},
    ]},
    {id:3,title:'Prioritize Hypotheses',sub:'Priority?',icon:'⚡',inst:'RANK.',type:'rank',opts:[
      {id:'a',text:'Decreased Cardiac Output r/t hemorrhagic fluid loss',cr:1,rat:'HIGHEST. Without volume → multi-organ failure.'},
      {id:'b',text:'Impaired Gas Exchange r/t decreased Hgb',cr:2,rat:'Hgb too low to carry O₂.'},
      {id:'c',text:'Risk for Injury r/t supratherapeutic INR',cr:3,rat:'Must correct coagulopathy.'},
      {id:'d',text:'Acute Confusion r/t decreased cerebral perfusion',cr:4,rat:'Symptom of circulation failure.'},
    ]},
    {id:4,title:'Generate Solutions',sub:'Appropriate?',icon:'💡',inst:'INDICATED or NOT INDICATED.',type:'classify',cats:['Indicated','Not Indicated'],opts:[
      {id:'a',text:'0.9% NS IV bolus wide open',c:'Indicated',rat:'First-line volume expansion.'},
      {id:'b',text:'Transfuse 2 units pRBCs STAT',c:'Indicated',rat:'Restores volume AND O₂ capacity.'},
      {id:'c',text:'Vitamin K 10mg IV',c:'Indicated',rat:'Reverses warfarin.'},
      {id:'d',text:'Non-rebreather mask 15 L/min',c:'Indicated',rat:'Maximize O₂ delivery.'},
      {id:'e',text:'Vasopressors as first-line',c:'Not Indicated',rat:'Fix hypovolemia FIRST.'},
      {id:'f',text:'Position flat with legs elevated',c:'Indicated',rat:'Promotes venous return.'},
    ]},
    {id:5,title:'Take Action',sub:'Order?',icon:'🎯',inst:'Rank FIRST to LAST.',type:'rank',opts:[
      {id:'a',text:'Apply O₂ via NRB + pulse oximetry',cr:1,rat:'FIRST (Breathing).'},
      {id:'b',text:'NS bolus + position supine legs elevated',cr:2,rat:'SECOND (Circulation).'},
      {id:'c',text:'Begin pRBC transfusion',cr:3,rat:'THIRD. Volume + Hgb.'},
      {id:'d',text:'Vitamin K IV + hold warfarin',cr:4,rat:'FOURTH. Stop hemorrhage.'},
      {id:'e',text:'Document, SBAR, strict I&O',cr:5,rat:'FIFTH. Communication.'},
    ]},
    {id:6,title:'Evaluate Outcomes',sub:'Improving at 2 hours?',icon:'📊',inst:'Select ALL positive.',type:'multi',opts:[
      {id:'a',text:'BP improved to 96/62',c:true,rat:'Above 65 MAP threshold.'},
      {id:'b',text:'HR decreased to 98 bpm',c:true,rat:'Compensation easing.'},
      {id:'c',text:'Repeat Hgb: 8.9 g/dL',c:true,rat:'Transfusion working.'},
      {id:'d',text:'UO: 45 mL in last hour',c:true,rat:'Renal perfusion improving.'},
      {id:'e',text:'Repeat lactate: 5.1 (rising)',c:false,rat:'Oxygen debt WORSENING.'},
      {id:'f',text:'New chest tightness + bilateral crackles',c:false,rat:'TACO/TRALI risk.'},
    ]},
  ]},

  // CASE 3: HEART FAILURE (PRO)
  {id:'hf-003',tracks:['RN'],title:'Excess Fluid Volume',subtitle:'Acute Decompensated Cardiac Function',isFree:false,category:'Physiological Adaptation',
  patient:{name:'D. Patel',age:78,sex:'Female',code:'Full Code',allergies:'NKDA',admitDate:'Today, 0315',room:'3-West, Bed 4'},
  vitals:[{time:'0315',hr:'108 bpm',bp:'178/96',rr:'30/min',spo2:'88% RA'},{time:'0345',hr:'114 bpm',bp:'182/100',rr:'34/min',spo2:'85% RA'}],
  labs:[{n:'BNP',v:'1,280 pg/mL',r:'<100',f:'critical'},{n:'K⁺',v:'5.3 mEq/L',r:'3.5–5.0',f:'high'},{n:'Na⁺',v:'131 mEq/L',r:'136–145',f:'low'},{n:'PaO₂',v:'58 mmHg',r:'80–100',f:'critical'}],
  nursesNote:'0315 — 78 y/o female, acute PND. "I feel like I\'m drowning." 4 pillows. 10 lb weight gain/10 days. Tripod, accessory muscles. Bilateral crackles. S3 gallop. JVD. 3+ edema. Foley: 20 mL. Ran out of furosemide 6 days ago.',
  steps:[
    {id:1,title:'Recognize Cues',sub:'What signals decompensation?',icon:'🔍',inst:'Select ALL relevant.',type:'multi',opts:[
      {id:'a',text:'SpO₂ 85–88% with worsening dyspnea',c:true,rat:'Respiratory failure.'},
      {id:'b',text:'Bilateral crackles bases to mid-lung',c:true,rat:'Pulmonary edema.'},
      {id:'c',text:'BNP 1,280 pg/mL',c:true,rat:'Acute decompensated HF.'},
      {id:'d',text:'10 lb weight gain / 10 days',c:true,rat:'~4.5L fluid retention.'},
      {id:'e',text:'S3 gallop + JVD',c:true,rat:'Classic HF findings.'},
      {id:'f',text:'UO 20 mL (oliguria)',c:true,rat:'Cardiorenal syndrome.'},
      {id:'g',text:'WBC 8.2 K/µL',c:false,rat:'Normal.'},
    ]},
    {id:2,title:'Analyze Cues',sub:'Pattern?',icon:'🧩',inst:'Select correct linkages.',type:'multi',opts:[
      {id:'a',text:'Stopping furosemide overwhelmed EF 25% LV → pulmonary congestion.',c:true,rat:'Root cause.'},
      {id:'b',text:'Hypoxemia from fluid flooding alveoli — V/Q mismatch.',c:true,rat:'Pulmonary edema mechanism.'},
      {id:'c',text:'Dilutional hyponatremia from water retention.',c:true,rat:'Treat by REMOVING fluid.'},
      {id:'d',text:'Elevated creatinine = kidneys are PRIMARY cause.',c:false,rat:'Primary = decompensated LV.'},
    ]},
    {id:3,title:'Prioritize Hypotheses',sub:'Priority?',icon:'⚡',inst:'RANK.',type:'rank',opts:[
      {id:'a',text:'Impaired Gas Exchange r/t pulmonary congestion',cr:1,rat:'SpO₂ 85% = respiratory failure.'},
      {id:'b',text:'Excess Fluid Volume r/t compromised cardiac pump',cr:2,rat:'ROOT CAUSE.'},
      {id:'c',text:'Decreased Cardiac Output r/t EF 25%',cr:3,rat:'Underlying chronic problem.'},
      {id:'d',text:'Deficient Knowledge r/t med non-compliance',cr:4,rat:'After crisis.'},
    ]},
    {id:4,title:'Generate Solutions',sub:'Appropriate?',icon:'💡',inst:'INDICATED or NOT INDICATED.',type:'classify',cats:['Indicated','Not Indicated'],opts:[
      {id:'a',text:'BiPAP IPAP 12 / EPAP 5 / FiO₂ 100%',c:'Indicated',rat:'Pushes fluid from alveoli.'},
      {id:'b',text:'Furosemide 80mg IV push STAT',c:'Indicated',rat:'Removes excess fluid.'},
      {id:'c',text:'Nitroglycerin IV infusion',c:'Indicated',rat:'Reduces preload/afterload.'},
      {id:'d',text:'0.9% NS 1000 mL IV bolus',c:'Not Indicated',rat:'CONTRAINDICATED. Excess fluid.'},
      {id:'e',text:'Position HIGH FOWLER\'S',c:'Indicated',rat:'Reduces venous return.'},
      {id:'f',text:'Continue spironolactone',c:'Not Indicated',rat:'K⁺ 5.3 = hyperkalemia risk.'},
    ]},
    {id:5,title:'Take Action',sub:'Order?',icon:'🎯',inst:'Rank FIRST to LAST.',type:'rank',opts:[
      {id:'a',text:'High Fowler\'s + BiPAP + pulse ox',cr:1,rat:'FIRST (Breathing).'},
      {id:'b',text:'Furosemide 80mg IV + strict I&O',cr:2,rat:'SECOND. Fluid removal.'},
      {id:'c',text:'NTG IV + cardiac monitoring',cr:3,rat:'THIRD. Reduce workload.'},
      {id:'d',text:'Hold spironolactone, recheck K⁺',cr:4,rat:'FOURTH. Med safety.'},
      {id:'e',text:'Document, SBAR, education',cr:5,rat:'FIFTH.'},
    ]},
    {id:6,title:'Evaluate Outcomes',sub:'Improving at 2 hours?',icon:'📊',inst:'Select ALL positive.',type:'multi',opts:[
      {id:'a',text:'SpO₂ improved to 95% on BiPAP',c:true,rat:'Gas exchange improving.'},
      {id:'b',text:'UO: 800 mL in 2 hours',c:true,rat:'Brisk diuresis.'},
      {id:'c',text:'RR 34→22, no accessory muscles',c:true,rat:'WOB decreased.'},
      {id:'d',text:'New pink frothy sputum',c:false,rat:'WORSENING. Prepare for intubation.'},
      {id:'e',text:'K⁺ dropped to 2.8',c:false,rat:'Severe hypokalemia from diuresis.'},
    ]},
  ]},

  // CASE 4: DKA (PRO)
  {id:'dka-004',tracks:['RN'],title:'Metabolic Acidosis — DKA',subtitle:'Acute Insulin Deficiency & Ketoacidosis',isFree:false,category:'Physiological Adaptation',
  patient:{name:'M. Santos',age:22,sex:'Female',code:'Full Code',allergies:'Latex',admitDate:'Today, 1830',room:'ED Bay 5'},
  vitals:[{time:'1830',hr:'124 bpm',bp:'96/58',rr:'32/min (Kussmaul)',spo2:'97% RA'},{time:'1900',hr:'130 bpm',bp:'90/52',rr:'36/min',spo2:'96% RA'}],
  labs:[{n:'Glucose',v:'486 mg/dL',r:'70–100',f:'critical'},{n:'pH',v:'7.18',r:'7.35–7.45',f:'critical'},{n:'Bicarb',v:'10 mEq/L',r:'22–26',f:'critical'},{n:'K⁺',v:'5.6 mEq/L',r:'3.5–5.0',f:'high'},{n:'Anion Gap',v:'26',r:'8–12',f:'critical'},{n:'Ketones',v:'5.8 mmol/L',r:'<0.6',f:'critical'}],
  nursesNote:'1830 — 22 y/o female T1DM. Ill 3 days, stopped insulin. Lethargic, oriented person/place. Fruity breath. Kussmaul. Skin warm, dry, poor turgor. Weight loss 8 lbs.',
  steps:[
    {id:1,title:'Recognize Cues',sub:'What signals metabolic crisis?',icon:'🔍',inst:'Select ALL relevant.',type:'multi',opts:[
      {id:'a',text:'Glucose 486 mg/dL',c:true,rat:'Cells starving despite excess glucose.'},
      {id:'b',text:'pH 7.18 / Bicarb 10',c:true,rat:'Life-threatening acidosis.'},
      {id:'c',text:'Kussmaul respirations (RR 36)',c:true,rat:'Compensatory CO₂ blowoff.'},
      {id:'d',text:'K⁺ 5.6 (DECEPTIVE — total body depleted)',c:true,rat:'Will plummet with insulin.'},
      {id:'e',text:'Serum ketones 5.8',c:true,rat:'Severe ketosis.'},
      {id:'f',text:'BP 90/52 + HR 130',c:true,rat:'Dehydration from osmotic diuresis.'},
      {id:'g',text:'Fruity breath',c:true,rat:'Classic DKA hallmark.'},
      {id:'h',text:'SpO₂ 97%',c:false,rat:'Normal. Breathing is compensatory.'},
    ]},
    {id:2,title:'Analyze Cues',sub:'Connections?',icon:'🧩',inst:'Select correct linkages.',type:'multi',opts:[
      {id:'a',text:'No insulin → fat breakdown → ketones → acidosis.',c:true,rat:'Core DKA mechanism.'},
      {id:'b',text:'Hyperglycemia → osmotic diuresis → dehydration.',c:true,rat:'Glucose drags water.'},
      {id:'c',text:'K⁺ 5.6 looks high but total body K⁺ is DEPLETED.',c:true,rat:'Most dangerous misunderstanding.'},
      {id:'d',text:'Give bicarb immediately for pH 7.18.',c:false,rat:'NOT unless pH <6.9. Insulin corrects.'},
    ]},
    {id:3,title:'Prioritize Hypotheses',sub:'Priority?',icon:'⚡',inst:'RANK.',type:'rank',opts:[
      {id:'a',text:'Deficient Fluid Volume r/t osmotic diuresis',cr:1,rat:'Fluids FIRST — even before insulin.'},
      {id:'b',text:'Risk for Electrolyte Imbalance (K⁺ shift)',cr:2,rat:'K⁺ must be ≥3.3 before insulin.'},
      {id:'c',text:'Impaired Gas Exchange (compensatory)',cr:3,rat:'Kussmaul is helping.'},
      {id:'d',text:'Deficient Knowledge r/t sick-day management',cr:4,rat:'Discharge teaching.'},
    ]},
    {id:4,title:'Generate Solutions',sub:'Appropriate?',icon:'💡',inst:'INDICATED or NOT INDICATED.',type:'classify',cats:['Indicated','Not Indicated'],opts:[
      {id:'a',text:'0.9% NS 1000 mL IV bolus',c:'Indicated',rat:'First-line. Restore perfusion.'},
      {id:'b',text:'Regular insulin IV continuous',c:'Indicated',rat:'After K⁺ ≥3.3.'},
      {id:'c',text:'KCl 20-40 mEq added to IV',c:'Indicated',rat:'Proactive K⁺ replacement.'},
      {id:'d',text:'NPH insulin subcutaneously',c:'Not Indicated',rat:'Wrong type/route.'},
      {id:'e',text:'Sodium bicarbonate IV',c:'Not Indicated',rat:'Not unless pH <6.9.'},
      {id:'f',text:'Continuous cardiac monitoring',c:'Indicated',rat:'K⁺ shift dysrhythmias.'},
    ]},
    {id:5,title:'Take Action',sub:'Order?',icon:'🎯',inst:'Rank FIRST to LAST.',type:'rank',opts:[
      {id:'a',text:'NS bolus + cardiac monitor',cr:1,rat:'FIRST. Fluids + monitoring.'},
      {id:'b',text:'Verify K⁺ ≥3.3 → start insulin drip',cr:2,rat:'SECOND. Safety check.'},
      {id:'c',text:'Add KCl to IV + hourly glucose',cr:3,rat:'THIRD. K⁺ replacement.'},
      {id:'d',text:'Repeat BMP at 2 hours',cr:4,rat:'FOURTH. Catch K⁺ shift.'},
      {id:'e',text:'Transition to SQ insulin + education',cr:5,rat:'FIFTH.'},
    ]},
    {id:6,title:'Evaluate Outcomes',sub:'Resolving at 4 hours?',icon:'📊',inst:'Select ALL positive.',type:'multi',opts:[
      {id:'a',text:'Glucose decreased to 248',c:true,rat:'Insulin working.'},
      {id:'b',text:'pH improved to 7.30',c:true,rat:'Acidosis correcting.'},
      {id:'c',text:'K⁺ is 4.1',c:true,rat:'Normalized.'},
      {id:'d',text:'Client alert, oriented x4',c:true,rat:'Mental status returned.'},
      {id:'e',text:'Glucose dropped to 52, diaphoretic',c:false,rat:'HYPOGLYCEMIA.'},
      {id:'f',text:'K⁺ dropped to 2.6',c:false,rat:'LIFE-THREATENING.'},
    ]},
  ]},

  // CASE 5: POST-OP HEMORRHAGE (PRO)
  {id:'postop-005',tracks:['RN'],title:'Post-Op Hemorrhage',subtitle:'Acute Surgical Blood Loss',isFree:false,category:'Reduction of Risk Potential',
  patient:{name:'J. Williams',age:56,sex:'Male',code:'Full Code',allergies:'Codeine',admitDate:'Today, POD#0',room:'PACU Bay 2'},
  vitals:[{time:'1400',hr:'92 bpm',bp:'128/76',rr:'18/min',spo2:'98% 2L NC'},{time:'1530',hr:'118 bpm',bp:'98/62',rr:'22/min',spo2:'96%'},{time:'1600',hr:'128 bpm',bp:'86/54',rr:'26/min',spo2:'94%'}],
  labs:[{n:'Hgb (pre-op)',v:'14.2 g/dL',r:'14–18 (M)',f:'normal'},{n:'Hgb (3hr post)',v:'9.8 g/dL',r:'14–18',f:'low'},{n:'Hct',v:'29%',r:'42–52%',f:'critical'},{n:'Lactate',v:'3.2 mmol/L',r:'0.5–2.0',f:'high'}],
  nursesNote:'1600 — 56 y/o male POD#0 partial colectomy. HR 92→118→128, BP 128/76→98/62→86/54. Pain DECREASED 5→2/10 WITHOUT analgesics. Dressing saturated bright red x2. JP drain: 450 mL/3hrs. Skin cool, pale, clammy. UO: 45→20→10 mL/hr.',
  steps:[
    {id:1,title:'Recognize Cues',sub:'What post-op changes need action?',icon:'🔍',inst:'Select ALL.',type:'multi',opts:[
      {id:'a',text:'Progressive tachycardia 92→128',c:true,rat:'Earliest compensatory sign.'},
      {id:'b',text:'Progressive hypotension 128/76→86/54',c:true,rat:'Decompensation.'},
      {id:'c',text:'Dressing saturated bright red x2',c:true,rat:'Active hemorrhage.'},
      {id:'d',text:'JP drain 450 mL/3hrs',c:true,rat:'4.5x expected.'},
      {id:'e',text:'Pain DECREASED without analgesics',c:true,rat:'RED FLAG. Decreased LOC.'},
      {id:'f',text:'Hgb 14.2→9.8 in 3 hours',c:true,rat:'Significant hemorrhage.'},
      {id:'g',text:'UO decreasing 45→10 mL/hr',c:true,rat:'Kidneys shutting down.'},
      {id:'h',text:'Platelets 188 / INR 1.1',c:false,rat:'Normal coagulation.'},
    ]},
    {id:2,title:'Analyze Cues',sub:'Pattern?',icon:'🧩',inst:'Select correct linkages.',type:'multi',opts:[
      {id:'a',text:'Tachycardia→hypotension→oliguria→↓LOC = hemorrhagic shock cascade.',c:true,rat:'Decompensation → organ failure.'},
      {id:'b',text:'Saturated dressing + excessive drain + ↓Hgb = active surgical hemorrhage.',c:true,rat:'Needs OR.'},
      {id:'c',text:'Elevated lactate confirms tissue oxygen debt.',c:true,rat:'Hypoperfusion.'},
      {id:'d',text:'Decreasing pain = analgesics working.',c:false,rat:'DANGEROUS. No analgesics given.'},
      {id:'e',text:'Changes are post-anesthesia — wait.',c:false,rat:'FATAL. Worsening trajectory.'},
    ]},
    {id:3,title:'Prioritize Hypotheses',sub:'Priority?',icon:'⚡',inst:'RANK.',type:'rank',opts:[
      {id:'a',text:'Decreased Cardiac Output r/t surgical hemorrhage',cr:1,rat:'HIGHEST.'},
      {id:'b',text:'Impaired Tissue Perfusion r/t hypovolemia',cr:2,rat:'End-organs failing.'},
      {id:'c',text:'Risk for Hypothermia r/t blood loss',cr:3,rat:'Lethal triad risk.'},
      {id:'d',text:'Anxiety (family)',cr:4,rat:'After stabilizing.'},
    ]},
    {id:4,title:'Generate Solutions',sub:'Appropriate?',icon:'💡',inst:'INDICATED or NOT INDICATED.',type:'classify',cats:['Indicated','Not Indicated'],opts:[
      {id:'a',text:'NS 500 mL bolus + prepare blood',c:'Indicated',rat:'Bridge while blood prepared.'},
      {id:'b',text:'Notify surgical team for possible OR',c:'Indicated',rat:'Only surgeon stops surgical bleeding.'},
      {id:'c',text:'Increase O₂ to maintain SpO₂ ≥95%',c:'Indicated',rat:'Maximize O₂.'},
      {id:'d',text:'Warming blankets + blood warmers',c:'Indicated',rat:'Prevent lethal triad.'},
      {id:'e',text:'Give heparin prophylaxis',c:'Not Indicated',rat:'CONTRAINDICATED.'},
      {id:'f',text:'Reassess in 30 minutes',c:'Not Indicated',rat:'DANGEROUS DELAY.'},
    ]},
    {id:5,title:'Take Action',sub:'Order?',icon:'🎯',inst:'Rank FIRST to LAST.',type:'rank',opts:[
      {id:'a',text:'↑O₂, position flat, NS bolus',cr:1,rat:'FIRST. ABCs.'},
      {id:'b',text:'SBAR surgical team',cr:2,rat:'SECOND.'},
      {id:'c',text:'Begin pRBC transfusion',cr:3,rat:'THIRD.'},
      {id:'d',text:'Warming, reinforce dressing, q5min VS',cr:4,rat:'FOURTH.'},
      {id:'e',text:'Hold heparin, document, update family',cr:5,rat:'FIFTH.'},
    ]},
    {id:6,title:'Evaluate Outcomes',sub:'Resuscitation working?',icon:'📊',inst:'Select ALL positive.',type:'multi',opts:[
      {id:'a',text:'HR decreased to 96',c:true,rat:'Volume being restored.'},
      {id:'b',text:'BP improved to 110/70',c:true,rat:'Adequate perfusion.'},
      {id:'c',text:'UO: 40 mL/hr',c:true,rat:'Kidneys responding.'},
      {id:'d',text:'Client more alert, pain 5/10',c:true,rat:'Brain perfused.'},
      {id:'e',text:'JP drain continues 200 mL/hr',c:false,rat:'ONGOING HEMORRHAGE.'},
      {id:'f',text:'Hgb 7.2 despite 2 units pRBCs',c:false,rat:'Losing faster than replacing.'},
    ]},
  ]},

  // CASE 6: SEPSIS / SEPTIC SHOCK (PRO) — NEW
  {id:'sepsis-006',tracks:['RN'],title:'Septic Shock',subtitle:'Distributive Shock — Urosepsis Source',isFree:false,category:'Physiological Adaptation',
  patient:{name:'J. Okafor',age:72,sex:'Male',code:'Full Code',allergies:'Penicillin (rash)',admitDate:'POD#2 TURP',room:'5-North, Bed 8'},
  vitals:[{time:'0900',hr:'112 bpm',bp:'96/58',rr:'24/min',spo2:'94% RA'},{time:'1000',hr:'128 bpm',bp:'78/44',rr:'28/min',spo2:'91% 2L NC'}],
  labs:[{n:'WBC',v:'22.4 K/µL',r:'4.5–11',f:'high'},{n:'Lactate',v:'4.8 mmol/L',r:'0.5–2.0',f:'critical'},{n:'Procalcitonin',v:'8.2 ng/mL',r:'<0.5',f:'critical'},{n:'pH (ABG)',v:'7.28',r:'7.35–7.45',f:'low'},{n:'Bicarb (HCO₃⁻)',v:'16 mEq/L',r:'22–26',f:'low'},{n:'Creatinine',v:'2.1 mg/dL',r:'0.7–1.3',f:'high'}],
  nursesNote:'1000 — 72 y/o male POD#2 TURP. Initially stable. Now febrile 102.8°F, confused (was A&Ox4 this AM). Skin warm/flushed earlier, now mottled extremities, cap refill >3 sec. Foley draining cloudy yellow urine, UO 25 mL last hour. BP unresponsive to 1L NS bolus.',
  steps:[
    {id:1,title:'Recognize Cues',sub:'What signals shock?',icon:'🔍',inst:'Select ALL clinically relevant cues.',type:'multi',opts:[
      {id:'a',text:'BP 96/58 → 78/44 (progressive hypotension despite fluids)',c:true,rat:'MAP <65 = inadequate organ perfusion. Decompensating.'},
      {id:'b',text:'HR 112 → 128 (worsening tachycardia)',c:true,rat:'Compensatory response to hypotension and vasodilation.'},
      {id:'c',text:'Lactate 4.8 mmol/L (severe)',c:true,rat:'Critical marker of tissue hypoperfusion. Triggers Surviving Sepsis hour-1 bundle.'},
      {id:'d',text:'WBC 22.4 + procalcitonin 8.2 (bacterial source)',c:true,rat:'Strongly suggests bacterial infection driving the systemic response.'},
      {id:'e',text:'New onset confusion (was A&Ox4)',c:true,rat:'Cerebral hypoperfusion + sepsis-associated encephalopathy.'},
      {id:'f',text:'Cloudy urine + UO 25 mL/hr post-TURP',c:true,rat:'Urinary source for sepsis + AKI from renal hypoperfusion.'},
      {id:'g',text:'Mottled extremities + cap refill >3 sec',c:true,rat:'Peripheral hypoperfusion. Late shock sign.'},
      {id:'h',text:'Allergy to penicillin',c:false,rat:'Important for med selection but not a CUE of the current condition.'},
    ]},
    {id:2,title:'Analyze Cues',sub:'How do cues connect?',icon:'🧩',inst:'Select correct linkages.',type:'multi',opts:[
      {id:'a',text:'Hypotension + tachycardia + lactate + AMS = septic shock with end-organ hypoperfusion.',c:true,rat:'Classic septic shock pattern. Failed fluid response = vasopressor territory.'},
      {id:'b',text:'Fever + leukocytosis + procalcitonin + cloudy urine + post-TURP = urosepsis source.',c:true,rat:'TURP carries known risk of bacterial translocation from the urinary tract.'},
      {id:'c',text:'Metabolic acidosis (pH 7.28, low bicarb) reflects lactic acidosis from anaerobic metabolism.',c:true,rat:'Shock → cells switch to anaerobic glycolysis → lactate accumulation → acidemia.'},
      {id:'d',text:'Hold IV fluids since post-op patients are at risk for fluid overload.',c:false,rat:'DANGEROUS. Sepsis demands aggressive fluid resus 30 mL/kg per Surviving Sepsis bundle.'},
    ]},
    {id:3,title:'Prioritize Hypotheses',sub:'Priority?',icon:'⚡',inst:'RANK highest to lowest.',type:'rank',opts:[
      {id:'a',text:'Decreased Cardiac Output r/t septic vasodilation and relative hypovolemia',cr:1,rat:'HIGHEST. Inadequate perfusion → multi-organ failure within hours if untreated.'},
      {id:'b',text:'Risk for Sepsis-Induced Multi-Organ Dysfunction',cr:2,rat:'HIGH. AKI already developing. Lung, liver, brain, coagulation cascade next.'},
      {id:'c',text:'Acute Confusion r/t cerebral hypoperfusion',cr:3,rat:'Symptom of #1. Resolves with restored perfusion.'},
      {id:'d',text:'Risk for Infection r/t indwelling Foley',cr:4,rat:'Source already identified. Treatment, not future prevention, is priority.'},
    ]},
    {id:4,title:'Generate Solutions',sub:'Appropriate interventions?',icon:'💡',inst:'INDICATED or NOT INDICATED.',type:'classify',cats:['Indicated','Not Indicated'],opts:[
      {id:'a',text:'Obtain blood cultures x2 BEFORE antibiotics',c:'Indicated',rat:'Cultures must precede antibiotics or organisms can\'t be identified. Hour-1 bundle requirement.'},
      {id:'b',text:'Broad-spectrum IV antibiotic within 1 hour (non-PCN per allergy)',c:'Indicated',rat:'Each hour antibiotics are delayed in septic shock = ~7% increase in mortality.'},
      {id:'c',text:'Crystalloid bolus 30 mL/kg (LR or NS)',c:'Indicated',rat:'Surviving Sepsis Campaign standard for hypotension or lactate ≥4.'},
      {id:'d',text:'Norepinephrine IV drip if MAP <65 after fluid resus',c:'Indicated',rat:'First-line vasopressor in septic shock per current guidelines.'},
      {id:'e',text:'IV piperacillin-tazobactam (Zosyn)',c:'Not Indicated',rat:'Beta-lactam — cross-reactivity risk with PCN allergy. Use cefepime, vanc + aztreonam, or per allergy protocol.'},
      {id:'f',text:'Dopamine as first-line vasopressor',c:'Not Indicated',rat:'No longer first-line. Higher arrhythmia risk than norepinephrine.'},
    ]},
    {id:5,title:'Take Action',sub:'Implementation order?',icon:'🎯',inst:'Rank FIRST to LAST.',type:'rank',opts:[
      {id:'a',text:'Draw blood cultures x2, lactate, urine cx, CBC, CMP',cr:1,rat:'FIRST — must precede antibiotics to identify the organism.'},
      {id:'b',text:'Administer broad-spectrum IV antibiotic per allergy protocol',cr:2,rat:'SECOND — within 1 hour of recognition.'},
      {id:'c',text:'Initiate 30 mL/kg crystalloid bolus, large-bore IV access',cr:3,rat:'THIRD — restore intravascular volume.'},
      {id:'d',text:'If MAP <65 after fluids, start norepinephrine drip via central access',cr:4,rat:'FOURTH — maintain perfusion pressure.'},
      {id:'e',text:'SBAR to provider, prepare for ICU transfer, hourly UO',cr:5,rat:'FIFTH — escalate care, monitor response.'},
    ]},
    {id:6,title:'Evaluate Outcomes',sub:'Improving at 4 hours?',icon:'📊',inst:'Select ALL positive findings.',type:'multi',opts:[
      {id:'a',text:'MAP increased from 55 to 72 on norepinephrine',c:true,rat:'Adequate perfusion pressure restored.'},
      {id:'b',text:'Repeat lactate: 2.1 mmol/L (down from 4.8)',c:true,rat:'Tissue oxygenation improving — most sensitive resuscitation marker.'},
      {id:'c',text:'UO 50 mL/hr',c:true,rat:'Renal perfusion restored.'},
      {id:'d',text:'Patient now A&Ox3 (was confused)',c:true,rat:'Cerebral perfusion improved.'},
      {id:'e',text:'New atrial fibrillation with RVR 145',c:false,rat:'COMPLICATION — sepsis + vasopressors increase arrhythmia risk.'},
      {id:'f',text:'Lactate trending up to 5.6 despite resus',c:false,rat:'WORSENING — refractory shock. May need source control surgery, additional vasopressors, evaluate for hydrocortisone.'},
    ]},
  ]},
  {
  "id": "case-009",
  "title": "Acute Ischemic Stroke",
  "subtitle": "64 y/o female, in the alteplase window",
  "isFree": false,
  "category": "Neuro",
  "nursesNote": "0712 — 64 y/o female brought in by EMS after sudden onset of right-sided facial droop, right arm weakness, and slurred speech witnessed by spouse at 0635. Last known well 0630. NIHSS at triage: 14 (moderate). Spouse denies recent surgery, head trauma, GI bleed, or anticoagulant use. CT head without contrast at 0745 — no hemorrhage, no early ischemic changes. Neurology at bedside; client is being evaluated for IV alteplase pending BP control.",
  "patient": { "name": "Karina Bhatia", "age": "64", "sex": "Female", "code": "Full Code", "allergies": "NKDA", "admitDate": "05/04/2026", "room": "ED-3, Bed 14" },
  "vitals": [
    { "time": "0700", "hr": "88",  "bp": "196/108", "rr": "16", "spo2": "98%" },
    { "time": "0730", "hr": "92",  "bp": "204/112", "rr": "18", "spo2": "97%" },
    { "time": "0800", "hr": "90",  "bp": "198/110", "rr": "18", "spo2": "97%" }
  ],
  "labs": [
    { "n": "Glucose (fingerstick)", "v": "142 mg/dL",  "r": "70–110 mg/dL",  "f": "high"   },
    { "n": "INR",                   "v": "1.0",        "r": "0.8–1.1",       "f": "normal" },
    { "n": "aPTT",                  "v": "28 sec",     "r": "25–35 sec",     "f": "normal" },
    { "n": "Platelets",             "v": "245 K/μL",   "r": "150–400 K/μL",  "f": "normal" },
    { "n": "Creatinine",            "v": "0.9 mg/dL",  "r": "0.6–1.3 mg/dL", "f": "normal" },
    { "n": "Troponin I",            "v": "0.02 ng/mL", "r": "<0.04 ng/mL",   "f": "normal" }
  ],
  "steps": [
    {
      "id": 1, "title": "Recognize Cues", "sub": "Identify alteplase-candidacy cues", "icon": "🔍",
      "inst": "Select the THREE (3) cues that BEST establish this client as a candidate for IV alteplase.",
      "type": "multi",
      "opts": [
        { "id": "a", "text": "Last known well at 0630 (within the 4.5-hour window)", "c": true,  "rat": "The IV alteplase window is up to 4.5 hours from LAST KNOWN WELL — not from symptom discovery or ED arrival. This single data point is the gatekeeper for thrombolysis (AHA/ASA 2019)." },
        { "id": "b", "text": "Non-contrast CT shows no hemorrhage and no early ischemic changes", "c": true,  "rat": "A negative head CT excludes intracerebral hemorrhage — the mandatory prerequisite for alteplase. Absence of early ischemic changes does NOT rule out infarct (often invisible <6h)." },
        { "id": "c", "text": "NIHSS 14 (moderate stroke severity)", "c": true,  "rat": "NIHSS quantifies severity; scores 5–25 derive the greatest benefit from thrombolysis. A 14 supports treatment in an otherwise eligible candidate." },
        { "id": "d", "text": "BP 204/112 mmHg", "c": false, "rat": "Currently EXCLUDES alteplase until lowered to <185/110. This is a barrier to address, not an eligibility cue." },
        { "id": "e", "text": "Slurred speech (dysarthria)", "c": false, "rat": "Confirms stroke but does not specifically establish thrombolytic candidacy — time window, CT, and severity do." },
        { "id": "f", "text": "Glucose 142 mg/dL", "c": false, "rat": "Mildly elevated but rules OUT hypoglycemia mimic. Does not, by itself, establish candidacy." },
        { "id": "g", "text": "INR 1.0, platelets 245 K/μL", "c": false, "rat": "Supportive normal coags — but normal labs are not 'cues' to recognize." },
        { "id": "h", "text": "NKDA per spouse", "c": false, "rat": "Background safety data, not a clinical cue for thrombolysis." }
      ]
    },
    {
      "id": 2, "title": "Analyze Cues", "sub": "Link cues to pathophysiology", "icon": "🧩",
      "inst": "Select the THREE (3) statements that correctly link the cues to underlying pathophysiology.",
      "type": "multi",
      "opts": [
        { "id": "a", "text": "Focal deficits arise from arterial occlusion creating an irreversibly infarcted core surrounded by a salvageable penumbra", "c": true, "rat": "The core infarcts within minutes; the penumbra remains viable for hours if reperfusion occurs — the entire rationale for time-critical thrombolysis (Lewis Med-Surg 11e, p. 1395)." },
        { "id": "b", "text": "The elevated BP is largely a compensatory response to maintain cerebral perfusion to the penumbra", "c": true, "rat": "Cerebral autoregulation is impaired in the penumbra, making perfusion pressure-dependent. This is why permissive hypertension is allowed in non-thrombolysis candidates (up to 220/120)." },
        { "id": "c", "text": "Aggressive BP lowering before reperfusion can extend the infarct by reducing penumbral perfusion", "c": true, "rat": "Overshoot lowering converts salvageable penumbra to infarcted tissue; titrate to <185/110 carefully (AHA/ASA 2019)." },
        { "id": "d", "text": "The 4.5-hour alteplase window starts from the time of ED arrival", "c": false, "rat": "Incorrect — starts from LAST KNOWN WELL. The most commonly missed concept and a major safety issue." },
        { "id": "e", "text": "Alteplase reverses damage already completed in the infarct core", "c": false, "rat": "Alteplase only salvages the penumbra by lysing the clot; the core infarct is irreversible at presentation." },
        { "id": "f", "text": "A negative head CT definitively rules out acute ischemic stroke", "c": false, "rat": "Non-contrast CT is highly sensitive for HEMORRHAGE; acute ischemia is often invisible for 6–24 hours." }
      ]
    },
    {
      "id": 3, "title": "Prioritize Hypotheses", "sub": "Most likely diagnosis", "icon": "📊",
      "inst": "Drag to rank from MOST likely (1) to LEAST likely (5).",
      "type": "rank",
      "opts": [
        { "id": "a", "text": "Acute ischemic stroke — large-vessel (likely left MCA) territory", "cr": 1, "rat": "Sudden contralateral focal deficits, NIHSS 14, witnessed onset, and CT excluding bleed make AIS overwhelmingly most likely." },
        { "id": "b", "text": "Hemorrhagic stroke (intracerebral hemorrhage)", "cr": 2, "rat": "Always in the differential for sudden focal deficit, but the negative non-contrast CT effectively excludes acute hemorrhage now." },
        { "id": "c", "text": "Stroke mimic — hypoglycemia", "cr": 3, "rat": "Always assessed early because it is rapidly reversible, but ruled out here by glucose 142." },
        { "id": "d", "text": "Stroke mimic — complex migraine or Todd's paralysis", "cr": 4, "rat": "Possible but no headache aura history, no witnessed seizure, and deficits are persistent." },
        { "id": "e", "text": "Conversion (functional) disorder", "cr": 5, "rat": "Least likely: deficits follow a clear vascular distribution and are objectively demonstrable. Diagnosis of exclusion." }
      ]
    },
    {
      "id": 4, "title": "Generate Solutions", "sub": "Time-critical interventions", "icon": "💡",
      "inst": "Select the THREE (3) MOST time-critical interventions for the alteplase pathway in the first hour.",
      "type": "multi",
      "opts": [
        { "id": "a", "text": "Administer IV labetalol per stroke protocol to lower BP to <185/110 prior to alteplase", "c": true, "rat": "Alteplase is contraindicated above this threshold; controlling BP is the immediate gateway to thrombolysis (AHA/ASA 2019)." },
        { "id": "b", "text": "Administer alteplase 0.9 mg/kg IV (10% bolus, 90% infusion over 60 min) once eligible", "c": true, "rat": "Standard adult dose for AIS within 4.5 hours of last known well; max total 90 mg. Door-to-needle goal ≤45 min." },
        { "id": "c", "text": "Initiate continuous cardiac/BP monitoring with q15-min neuro checks", "c": true, "rat": "Mandatory safety baseline for detecting hemorrhagic conversion or angioedema during and after the infusion." },
        { "id": "d", "text": "Administer aspirin 325 mg PO immediately", "c": false, "rat": "Antiplatelets must be HELD for 24 hours after alteplase to avoid hemorrhagic conversion. Safe at the 24-hour mark following a confirming CT." },
        { "id": "e", "text": "Bolus 1 L of 0.9% normal saline wide open", "c": false, "rat": "No evidence of hypovolemia; would worsen severe HTN and could increase cerebral edema." },
        { "id": "f", "text": "Administer clopidogrel 600 mg loading dose now", "c": false, "rat": "Antiplatelet loading is contraindicated in the peri-thrombolysis window — markedly increases ICH risk." },
        { "id": "g", "text": "Give sublingual nifedipine for rapid BP drop", "c": false, "rat": "Causes precipitous, uncontrolled hypotension that can extend the infarct. Specifically warned against in stroke care." }
      ]
    },
    {
      "id": 5, "title": "Take Action", "sub": "Order of implementation", "icon": "⚡",
      "inst": "Drag to rank the actions from FIRST (1) to LAST (5).",
      "type": "rank",
      "opts": [
        { "id": "a", "text": "Place client on continuous cardiac/BP monitoring and initiate q15-min neuro checks", "cr": 1, "rat": "FIRST — establishes the safety baseline before any intervention. You cannot detect deterioration without it." },
        { "id": "b", "text": "Administer IV labetalol per protocol to bring BP <185/110", "cr": 2, "rat": "SECOND — alteplase is contraindicated above this threshold; titrate carefully to avoid overshoot." },
        { "id": "c", "text": "Confirm all alteplase inclusion/exclusion criteria with the neurologist and obtain informed consent", "cr": 3, "rat": "THIRD — final eligibility check immediately before the bolus." },
        { "id": "d", "text": "Administer alteplase 0.9 mg/kg IV (10% bolus, then 90% infusion over 60 minutes)", "cr": 4, "rat": "FOURTH — door-to-needle goal ≤45 minutes per AHA/ASA." },
        { "id": "e", "text": "Transfer to the Neuro ICU for ongoing post-thrombolysis monitoring", "cr": 5, "rat": "LAST — ICU-level monitoring is required for at least the first 24 hours." }
      ]
    },
    {
      "id": 6, "title": "Evaluate Outcomes", "sub": "Improving, worsening, or unchanged?", "icon": "📈",
      "inst": "After 24 hours of post-alteplase care, classify each finding as Improving, Worsening, or Unchanged.",
      "type": "classify",
      "cats": ["Improving", "Worsening", "Unchanged"],
      "opts": [
        { "id": "a", "text": "NIHSS improved from 14 to 6 at 24 hours post-alteplase", "c": "Improving", "rat": "A reduction of ≥4 points on NIHSS is clinically meaningful and reflects successful reperfusion of the penumbra." },
        { "id": "b", "text": "BP controlled at 162/88 mmHg throughout the alteplase infusion", "c": "Improving", "rat": "Maintaining BP <180/105 during and 24 hours post-alteplase is the AHA/ASA target and minimizes ICH risk." },
        { "id": "c", "text": "Client passes the bedside dysphagia screen and tolerates small sips of water", "c": "Improving", "rat": "Permits safe oral intake and PO meds; signals adequate bulbar function." },
        { "id": "d", "text": "Sudden severe headache, nausea, and vomiting 4 hours after alteplase infusion", "c": "Worsening", "rat": "Classic presentation of symptomatic ICH post-thrombolysis. STOP infusion if running, stat CT, notify provider immediately." },
        { "id": "e", "text": "Right-sided facial droop resolved; only mild residual right hand weakness", "c": "Improving", "rat": "Resolution of major focal deficits reflects successful reperfusion and salvage of the penumbra." },
        { "id": "f", "text": "Tongue and lip swelling noted 30 minutes into the alteplase infusion", "c": "Worsening", "rat": "Orolingual angioedema (1–5%, higher on ACE inhibitors). Stop infusion and protect the airway." },
        { "id": "g", "text": "No bleeding from IV sites, gums, or urinary catheter; no new bruising", "c": "Improving", "rat": "Absence of systemic bleeding is a positive safety finding given alteplase's systemic fibrinolytic effect." },
        { "id": "h", "text": "NIHSS unchanged at 14 with no new deficits at 24 hours", "c": "Unchanged", "rat": "Stability, not improvement. Lack of NIHSS reduction suggests failed reperfusion or completed infarct — consider thrombectomy evaluation." }
      ]
    }
  ]
}
];

// ═══════════════════════════════════════════════════════════
// NCLEX CATEGORY MAPPING — for practice exam breakdown
// ═══════════════════════════════════════════════════════════
const NCLEX_CATS=['Safe & Effective Care','Health Promotion','Psychosocial Integrity','Physiological Integrity'];

// ═══════════════════════════════════════════════════════════
// STORAGE SYSTEM
// ═══════════════════════════════════════════════════════════
const K={DISC:'@v3_disc',PRO:'@v3_pro',ANX:'@v3_anx',PERF:'@v3_perf',STREAK:'@v3_streak',HIST:'@v3_hist',EXAMS:'@v3_exams',REMED:'@v3_remed',TRACK:'@v3_track',PILOT:'@v3_pilot'};

// PILOT / CLASSROOM ACCESS CODES — grant full Pro access (ALL tracks: RN,
// LVN/PN, and LPT) to partner-program cohorts without a purchase. Each code
// carries a label and an expiry date; expired codes silently deactivate on the
// next launch so pilots end on schedule. Add a row per school/cohort.
const PILOT_CODES={
  'MTSAC2026'  :{label:'Mt. SAC pilot cohort', expires:'2027-06-30'},
  'SCRUBFACULTY':{label:'Instructor review access', expires:'2027-06-30'},
};
function pilotIsActive(p){
  if(!p||!p.code)return false;
  const meta=PILOT_CODES[p.code];
  if(!meta)return false; // code removed from the list → access ends
  return new Date()<=new Date(meta.expires+'T23:59:59');
}

async function loadAll(){
  try{
    const[d,p,a,pf,st,hi,ex,rm,tk,pl]=await Promise.all([AsyncStorage.getItem(K.DISC),AsyncStorage.getItem(K.PRO),AsyncStorage.getItem(K.ANX),AsyncStorage.getItem(K.PERF),AsyncStorage.getItem(K.STREAK),AsyncStorage.getItem(K.HIST),AsyncStorage.getItem(K.EXAMS),AsyncStorage.getItem(K.REMED),AsyncStorage.getItem(K.TRACK),AsyncStorage.getItem(K.PILOT)]);
    return{disc:d==='true',pro:p==='true',anx:a==='true',perf:pf?JSON.parse(pf):{},streak:st?JSON.parse(st):{current:0,best:0,lastDate:null},hist:hi?JSON.parse(hi):[],exams:ex?JSON.parse(ex):[],remed:rm?JSON.parse(rm):[],track:tk||null,pilot:pl?JSON.parse(pl):null};
  }catch{return{disc:false,pro:false,anx:false,perf:{},streak:{current:0,best:0,lastDate:null},hist:[],exams:[],remed:[],track:null,pilot:null};}
}
const save=async(k,v)=>AsyncStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v));

// ═══════════════════════════════════════════════════════════
// PERFORMANCE ENGINE
// ═══════════════════════════════════════════════════════════
function calcPerformance(history){
  if(!history||history.length===0)return null;
  const byTopic={},byStep={};
  const STEP_NAMES=['Recognize Cues','Analyze Cues','Prioritize Hypotheses','Generate Solutions','Take Action','Evaluate Outcomes'];
  history.forEach(h=>{
    if(!byTopic[h.caseTitle])byTopic[h.caseTitle]={correct:0,total:0};
    byTopic[h.caseTitle].correct+=h.correct;byTopic[h.caseTitle].total+=h.total;
    if(h.stepScores){
      h.stepScores.forEach((ss,i)=>{
        const name=STEP_NAMES[i]||`Step ${i+1}`;
        if(!byStep[name])byStep[name]={correct:0,total:0};
        byStep[name].correct+=ss.correct;byStep[name].total+=ss.total;
      });
    }
  });
  const totalC=history.reduce((s,h)=>s+h.correct,0);
  const totalT=history.reduce((s,h)=>s+h.total,0);
  const overallPct=totalT>0?Math.round((totalC/totalT)*100):0;
  let readiness='Low';
  if(overallPct>=85)readiness='Very High';
  else if(overallPct>=70)readiness='High';
  else if(overallPct>=55)readiness='Borderline';
  let weakest=null,weakPct=100;
  Object.entries(byStep).forEach(([name,data])=>{
    const pct=data.total>0?Math.round((data.correct/data.total)*100):0;
    if(pct<weakPct){weakPct=pct;weakest=name;}
  });
  const topicScores=Object.entries(byTopic).map(([name,data])=>({name,pct:data.total>0?Math.round((data.correct/data.total)*100):0,total:data.total})).filter(t=>t.total>=1).sort((a,b)=>a.pct-b.pct);
  const weakTopics=topicScores.slice(0,3);
  const stepScores=Object.entries(byStep).map(([name,data])=>({name,pct:data.total>0?Math.round((data.correct/data.total)*100):0,total:data.total})).filter(t=>t.total>=1).sort((a,b)=>a.pct-b.pct);
  const weakSteps=stepScores.slice(0,3);
  return{byTopic,byStep,overallPct,readiness,weakest,weakPct,totalAttempts:history.length,totalC,totalT,weakTopics,weakSteps};
}

function updateStreak(streak){
  const today=new Date().toISOString().split('T')[0];
  if(streak.lastDate===today)return streak;
  const yesterday=new Date(Date.now()-86400000).toISOString().split('T')[0];
  let newCurrent=streak.lastDate===yesterday?streak.current+1:1;
  return{current:newCurrent,best:Math.max(streak.best,newCurrent),lastDate:today};
}

// ═══════════════════════════════════════════════════════════
// AI DIAGNOSTIC
// ═══════════════════════════════════════════════════════════
async function fetchAI(wrongAnswers,caseTitle){
  if(!wrongAnswers||wrongAnswers.length===0)return"Perfect score! No error patterns detected.";
  let report='';wrongAnswers.forEach(w=>{report+=`Step ${w.stepId} (${w.stepTitle}): Chose "${w.chosen}" but correct was "${w.correct}". Option: "${w.optionText}"\n`;});
  try{
    const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:800,system:`You are a Senior Nurse Educator analyzing NCLEX practice performance on a ${caseTitle} case study. Analyze the student's wrong answers. 1) NAME the cognitive error pattern. 2) Give a bedside tip. 3) Identify weakest NCJMM step. Under 150 words. Encouraging but direct.`,messages:[{role:'user',content:`Wrong answers:\n${report}\nAnalyze patterns.`}]})});
    const d=await r.json();return(d.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('\n')||"Review rationales for each missed question.";
  }catch{return"AI unavailable. Review rationales shown for each question.";}
}

// ═══════════════════════════════════════════════════════════
// AI REMEDIATION PLAN GENERATOR
// ═══════════════════════════════════════════════════════════
async function generateRemediation(weakTopics,weakSteps,overallPct){
  const weakInfo=`Weakest topics: ${weakTopics.map(t=>`${t.name} (${t.pct}%)`).join(', ')}. Weakest NCJMM steps: ${weakSteps.map(s=>`${s.name} (${s.pct}%)`).join(', ')}. Overall accuracy: ${overallPct}%.`;
  try{
    const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1200,system:`You are a Senior Nurse Educator creating a personalized 7-day NCLEX remediation plan. Based on the student's weakness data, create a specific day-by-day study plan. For each day: specify the focus topic, what to study, how many practice questions, and a specific goal. Format each day as "Day X: [Focus] — [Activity] — [Goal]". Keep it actionable and encouraging. Under 300 words.`,messages:[{role:'user',content:`Student weakness data:\n${weakInfo}\nCreate 7-day remediation plan.`}]})});
    const d=await r.json();return(d.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('\n')||"Complete more cases to generate a remediation plan.";
  }catch{return"AI unavailable. Focus on your weakest areas shown in the dashboard.";}
}

// ═══════════════════════════════════════════════════════════
// EXAM TIMER
// ═══════════════════════════════════════════════════════════
function ExamTimer({totalSeconds,onTimeUp}){
  const[rem,setRem]=useState(totalSeconds);const ref=useRef(null);
  useEffect(()=>{ref.current=setInterval(()=>setRem(p=>{if(p<=1){clearInterval(ref.current);onTimeUp?.();return 0;}return p-1;}),1000);return()=>clearInterval(ref.current);},[]);
  const m=Math.floor(rem/60),s=rem%60,pct=rem/totalSeconds;
  const col=pct>0.5?C.ac:pct>0.2?C.amber:C.crit;
  return(<View style={{flexDirection:'row',alignItems:'center',gap:8,padding:10,borderRadius:8,borderWidth:1.5,borderColor:col,backgroundColor:pct>0.5?C.acd:pct>0.2?C.amberDim:C.cbg,marginBottom:12}}>
    <Text style={{fontSize:14}}>⏱</Text>
    <View style={{flex:1}}><View style={{height:6,backgroundColor:C.bd,borderRadius:3,overflow:'hidden'}}><View style={{height:6,borderRadius:3,backgroundColor:col,width:`${pct*100}%`}}/></View></View>
    <Text style={{fontSize:16,fontWeight:'800',color:col,minWidth:52,textAlign:'right',fontVariant:['tabular-nums']}}>{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}</Text>
  </View>);
}

// ═══════════════════════════════════════════════════════════
// PASS PROBABILITY GAUGE
// ═══════════════════════════════════════════════════════════
function PassGauge({probability}){
  const col=probability>=80?C.gbd:probability>=60?C.ac:probability>=40?C.amber:C.crit;
  const label=probability>=80?'VERY LIKELY TO PASS':probability>=60?'LIKELY TO PASS':probability>=40?'BORDERLINE':'AT RISK';
  return(<View style={{backgroundColor:C.sf,borderWidth:2,borderColor:col,borderRadius:14,padding:16,alignItems:'center',marginBottom:12}}>
    <Text style={{color:C.t3,fontSize:9,fontWeight:'700',letterSpacing:1.5,textTransform:'uppercase',marginBottom:6}}>NCLEX PASS PROBABILITY</Text>
    <Text style={{color:col,fontSize:42,fontWeight:'900'}}>{probability}%</Text>
    <Text style={{color:col,fontSize:11,fontWeight:'700',letterSpacing:1,marginTop:2}}>{label}</Text>
    <View style={{height:8,backgroundColor:C.bd,borderRadius:4,overflow:'hidden',width:'100%',marginTop:12}}>
      <View style={{height:8,borderRadius:4,backgroundColor:col,width:`${probability}%`}}/>
    </View>
  </View>);
}

// ═══════════════════════════════════════════════════════════
// MAIN APP — IAP fix + dynamic case loading via useCases
// ═══════════════════════════════════════════════════════════
export default function App(){
  const[screen,setScreen]=useState('loading');
  const[isPro,setIsPro]=useState(false);
  const[pilot,setPilot]=useState(null); // active classroom/pilot access code
  const[anxMode,setAnxMode]=useState(false);
  const[perf,setPerf]=useState({});
  const[streak,setStreak]=useState({current:0,best:0,lastDate:null});
  const[history,setHistory]=useState([]);
  const[activeCase,setActiveCase]=useState(null);
  const[finalScore,setFinalScore]=useState({correct:0,total:0});
  const[wrongAnswers,setWrongAnswers]=useState([]);
  const[exams,setExams]=useState([]);
  const[userTrack,setUserTrack]=useState(null);

  // Dynamic case loader: bundled-first, then merges remote cases from GitHub Pages.
  // Network failure is non-fatal — bundled cases still display.
  const { cases: ALL_CASES, loading: casesLoading, refresh: refreshCases } = useCases(BUNDLED_CASES);

  useEffect(()=>{loadAll().then(d=>{d=d||{};d.hist=d.hist||[];d.perf=d.perf||{};d.streak=d.streak||{current:0,best:0,lastDate:null};d.exams=d.exams||[];setPilot(d.pilot||null);setIsPro(d.pro||pilotIsActive(d.pilot));setAnxMode(d.anx);setPerf(d.perf||{});setStreak(d.streak||{current:0,best:0,lastDate:null});setHistory(d.hist||[]);setExams(d.exams||[]);setUserTrack(d.track||null);setScreen(d.disc?(d.track?'home':'track'):'disclaimer');});},[]);

  useEffect(() => {
    let purchaseListener = null;
    let errorListener = null;
    const setupIAP = async () => {
      try {
        await initConnection();
        purchaseListener = purchaseUpdatedListener(async (purchase) => {
          if (purchase.transactionReceipt) {
            setIsPro(true);
            await save(K.PRO, 'true');
            await finishTransaction({ purchase, isConsumable: false });
            Alert.alert('🎉 Welcome to Pro!', 'You now have full access.');
            setScreen('home');
          }
        });
        errorListener = purchaseErrorListener((error) => {
          if (error.code !== 'E_USER_CANCELLED') Alert.alert('Purchase Failed', error.message || 'Try again.');
        });
      } catch (err) { console.error('IAP init error:', err); }
    };
    setupIAP();
    return () => {
      if (purchaseListener) purchaseListener.remove();
      if (errorListener) errorListener.remove();
      endConnection();
    };
  }, []);

  // --- IAP LOGIC ---
  const restorePurchases = async () => {
    try {
      const purchases = await getAvailablePurchases();
      if (purchases && purchases.length > 0) {
        setIsPro(true);
        await save(K.PRO, 'true');
        Alert.alert('Success', 'Access Restored!');
      } else {
        Alert.alert('Notice', 'No previous purchases found.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Could not connect to the App Store.');
    }
  };

  // unlockPro now accepts a plan: 'monthly' (default, subscription) or
  // 'lifetime' (one-time, non-consumable).
  const unlockPro = async (plan = 'monthly') => {
    const isLifetime = plan === 'lifetime';
    const sku  = isLifetime ? PRODUCT_ID_LIFETIME : PRODUCT_ID_MONTHLY;
    const type = isLifetime ? 'inapp' : 'subs';
    try {
      const products = await fetchProducts({ skus: [sku], type });
      if (!products || products.length === 0) {
        Alert.alert(
          'Unavailable',
          'This product is not available right now. Please try again in a moment, or contact support if it keeps happening.'
        );
        return;
      }
      await requestPurchase({
        request: {
          ios: { sku },
          android: { skus: [sku] },
        },
        type,
      });
    } catch (err) {
      console.warn('IAP unlockPro error:', err);
      if (err && err.code !== 'E_USER_CANCELLED') {
        Alert.alert(
          'Purchase Error',
          (err && err.message) || 'Could not complete purchase. Please try again.'
        );
      }
    }
  };

  // --- CORE APP LOGIC ---
  const onAccept=async()=>{await save(K.DISC,'true');setScreen(userTrack?'home':'track');};
  // Persist the picked licensure track. Used by the onboarding picker and the
  // home-screen toggle so the chosen track survives app restarts.
  const updateTrack=async t=>{setUserTrack(t);await save(K.TRACK,t);};
  const toggleAnx=async v=>{setAnxMode(v);await save(K.ANX,v?'true':'false');};
  // Dev/TestFlight unlock — triggered by 7-taps on the version chip on the home screen.
  // Flips Pro state on or off and persists it. Remove or gate behind __DEV__ before App Store release.
  const devTogglePro=async()=>{
    const next=!isPro;
    setIsPro(next);
    await save(K.PRO,next?'true':'false');
    Alert.alert(next?'🔓 Pro unlocked (dev)':'🔒 Pro locked',next?'All cases and Pro features are now available.':'Pro features are now locked.');
  };

  const startCase=c=>{
    if(!c.isFree&&!isPro){setScreen('paywall');return;}
    setActiveCase(c);setScreen('case');
  };

  const onFinish=async(correct,total,wrongs,stepScores)=>{
    const entry={caseId:activeCase.id,caseTitle:activeCase.title,correct,total,stepScores,date:new Date().toISOString()};
    const newHist=[...history,entry];
    const newStreak=updateStreak(streak);
    setHistory(newHist);setStreak(newStreak);setFinalScore({correct,total});setWrongAnswers(wrongs);
    await save(K.HIST,newHist);await save(K.STREAK,newStreak);
    setScreen('results');
  };

  // Redeem a classroom/pilot access code — grants full Pro (all tracks) until
  // the code's expiry. Purely local: no purchase, no server, revocable by
  // removing the code from PILOT_CODES in a future update.
  const redeemCode=async raw=>{
    const code=(raw||'').trim().toUpperCase();
    if(!code)return{ok:false,msg:'Enter a code first.'};
    const meta=PILOT_CODES[code];
    if(!meta)return{ok:false,msg:'Code not recognized. Check with your instructor.'};
    if(new Date()>new Date(meta.expires+'T23:59:59'))return{ok:false,msg:'This code has expired.'};
    const p={code,activated:new Date().toISOString()};
    setPilot(p);await save(K.PILOT,p);setIsPro(true);
    return{ok:true,msg:`${meta.label} activated. Full access to every track — RN, LVN, and LPT — until ${meta.expires}.`};
  };

  const perfData=calcPerformance(history);
  const activeTrack=userTrack||DEFAULT_TRACK;
  // Practice Exam draws only from cases in the learner's track, matching the home list.
  const examCases=casesForTrack(ALL_CASES,activeTrack);

  // --- ROUTING ---
  if(screen==='loading')return<View style={s.loadWrap}><ActivityIndicator size="large" color={C.ac}/></View>;
  if(screen==='disclaimer')return<DisclaimerScreen onAccept={onAccept}/>;
  if(screen==='track')return<TrackSelectScreen current={userTrack} onChoose={async t=>{await updateTrack(t);setScreen('home');}}/>;
  if(screen==='home'){
    const homeProps={cases:ALL_CASES,userTrack:activeTrack,onChangeTrack:updateTrack,casesLoading,refreshCases,onStart:startCase,perf:perfData,streak,isPro,anxMode,toggleAnx,devTogglePro,goStats:()=>setScreen('dashboard'),goPay:()=>setScreen('paywall'),goExam:()=>{if(!isPro){setScreen('paywall');return;}setScreen('practiceExam');},goRemed:()=>{if(!isPro){setScreen('paywall');return;}setScreen('remediation');},history};
    return activeTrack==='LPT'?<LptHomeScreen {...homeProps}/>:<HomeScreen {...homeProps}/>;
  }
  if(screen==='dashboard')return<DashboardScreen perf={perfData} streak={streak} history={history} exams={exams} onBack={()=>setScreen('home')}/>;
  if(screen==='paywall')return<PaywallScreen onUnlock={unlockPro} onRestore={restorePurchases} onRedeem={redeemCode} onBack={()=>setScreen('home')}/>;
  if(screen==='case')return activeCase?.format==='mc'
    ?<McCaseScreen caseData={activeCase} startIndex={activeCase._startIndex||0} onFinish={onFinish} onBack={()=>setScreen('home')} anxMode={anxMode}/>
    :<CaseScreen caseData={activeCase} onFinish={onFinish} onBack={()=>setScreen('home')} anxMode={anxMode}/>;
  if(screen==='results')return<ResultsScreen score={finalScore} caseTitle={activeCase?.title} wrongs={wrongAnswers} perf={perfData} streak={streak} isPro={isPro} onRetry={()=>setScreen('case')} onHome={()=>setScreen('home')} onShare={async()=>{try{await Share.share({message:`🩺 I scored ${finalScore.correct}/${finalScore.total} (${Math.round(finalScore.correct/finalScore.total*100)}%) on the ${activeCase?.title} NCJMM Case Study!\n\nReadiness: ${perfData?.readiness||'Calculating...'}\n🔥 ${streak.current}-day streak\n\nNCJMM Clinical Judgment Trainer`});}catch{}}}/>;
  if(screen==='practiceExam')return<PracticeExamScreen cases={examCases} isPro={isPro} history={history} onFinishExam={async(examResult)=>{const newExams=[...exams,examResult];setExams(newExams);await save(K.EXAMS,newExams);const newStreak=updateStreak(streak);setStreak(newStreak);await save(K.STREAK,newStreak);setScreen('examResults');setFinalScore(examResult);}} onBack={()=>setScreen('home')}/>;
  if(screen==='examResults')return<ExamResultsScreen exam={finalScore} perf={perfData} onHome={()=>setScreen('home')} onRemed={()=>setScreen('remediation')}/>;
  if(screen==='remediation')return<RemediationScreen perf={perfData} onBack={()=>setScreen('home')}/>;
  return null;
}

// ═══════════════════════════════════════════════════════════
// DISCLAIMER SCREEN
// ═══════════════════════════════════════════════════════════
function DisclaimerScreen({onAccept}){
  return(<View style={s.loadWrap}><StatusBar barStyle="light-content"/><View style={{backgroundColor:C.sfr,borderRadius:20,padding:24,width:'90%',maxWidth:400,borderWidth:1,borderColor:C.bd}}>
    <View style={{width:56,height:56,borderRadius:28,backgroundColor:C.acd,alignItems:'center',justifyContent:'center',alignSelf:'center',marginBottom:16}}><Text style={{fontSize:28}}>⚕️</Text></View>
    <Text style={{color:C.t1,fontSize:22,fontWeight:'800',textAlign:'center',marginBottom:4}}>Medical Disclaimer</Text>
    <Text style={{color:C.t2,fontSize:13,textAlign:'center',marginBottom:20}}>Please read before continuing</Text>
    <Text style={{color:C.t2,fontSize:14,lineHeight:22}}>This is an <Text style={{fontWeight:'700',color:C.t1}}>educational tool</Text> for exam preparation — NGN (NCLEX-RN/PN) clinical-judgment case studies and California LPT state-exam practice questions. It <Text style={{fontWeight:'800',color:C.ac}}>does not provide medical diagnosis or treatment</Text>. Content is a study supplement — verify against your program's current curriculum and official NCSBN/BVNPT materials.</Text>
    <Pressable onPress={onAccept} style={{backgroundColor:C.ac,borderRadius:10,paddingVertical:14,alignItems:'center',marginTop:20,minHeight:44}}><Text style={{color:C.bg,fontSize:14,fontWeight:'800',letterSpacing:1,textTransform:'uppercase'}}>I Understand — Continue</Text></Pressable>
  </View></View>);
}

// ═══════════════════════════════════════════════════════════
// TRACK SELECT SCREEN — onboarding licensure-track picker (toggle buttons).
// Shown once after the disclaimer; the same toggle also lives on the home
// screen so the learner can switch tracks at any time.
// ═══════════════════════════════════════════════════════════
function TrackSelectScreen({current,onChoose}){
  const [sel,setSel]=useState(current||DEFAULT_TRACK);
  const meta=TRACK_META[sel]||TRACK_META[DEFAULT_TRACK];
  return(<View style={s.loadWrap}><StatusBar barStyle="light-content"/><View style={{backgroundColor:C.sfr,borderRadius:20,padding:24,width:'90%',maxWidth:400,borderWidth:1,borderColor:C.bd}}>
    <View style={{width:56,height:56,borderRadius:28,backgroundColor:C.acd,alignItems:'center',justifyContent:'center',alignSelf:'center',marginBottom:16}}><Text style={{fontSize:28}}>🩺</Text></View>
    <Text style={{color:C.t1,fontSize:22,fontWeight:'800',textAlign:'center',marginBottom:4}}>Choose Your Track</Text>
    <Text style={{color:C.t2,fontSize:13,textAlign:'center',marginBottom:20}}>We'll tailor the case library to your license. You can change this anytime.</Text>
    <View style={{flexDirection:'row',backgroundColor:C.sf,borderWidth:1,borderColor:C.bd,borderRadius:12,padding:4,gap:4}}>
      {TRACKS.map(t=>{const on=sel===t;const pro=t!==FREE_TRACK;return(
        <Pressable key={t} onPress={()=>setSel(t)} style={{flex:1,backgroundColor:on?C.ac:'transparent',borderRadius:9,paddingVertical:10,alignItems:'center',minHeight:44,justifyContent:'center'}}>
          <Text style={{color:on?C.bg:C.t2,fontSize:15,fontWeight:'800',letterSpacing:0.5}}>{TRACK_META[t].label}</Text>
          {pro&&<View style={{marginTop:3,backgroundColor:on?'rgba(0,0,0,0.18)':C.goldDim,paddingHorizontal:5,paddingVertical:1,borderRadius:3}}><Text style={{color:on?C.bg:C.gold,fontSize:7,fontWeight:'800',letterSpacing:0.5}}>PRO</Text></View>}
        </Pressable>);})}
    </View>
    {sel!==FREE_TRACK&&<Text style={{color:C.gold,fontSize:11,textAlign:'center',marginTop:8}}>⭐ {TRACK_META[sel].label} is a Pro track — unlock with an upgrade. The {TRACK_META[FREE_TRACK].label} track is free to start.</Text>}
    <View style={{backgroundColor:C.acd,borderRadius:10,padding:14,marginTop:14}}>
      <Text style={{color:C.ac,fontSize:14,fontWeight:'800'}}>{meta.name}</Text>
      <Text style={{color:C.t2,fontSize:12,lineHeight:18,marginTop:2}}>{meta.blurb}</Text>
    </View>
    <Pressable onPress={()=>onChoose(sel)} style={{backgroundColor:C.ac,borderRadius:10,paddingVertical:14,alignItems:'center',marginTop:20,minHeight:44}}><Text style={{color:C.bg,fontSize:14,fontWeight:'800',letterSpacing:1,textTransform:'uppercase'}}>Continue</Text></Pressable>
  </View></View>);
}

// ═══════════════════════════════════════════════════════════
// PAYWALL SCREEN
// ═══════════════════════════════════════════════════════════
function PaywallScreen({onUnlock,onRestore,onRedeem,onBack}){
  // Default the plan picker to Lifetime (best value); user can toggle to Monthly.
  const [plan,setPlan]=useState('lifetime');
  const isLifetime = plan === 'lifetime';
  // Classroom/pilot access-code entry (schools & instructor review cohorts).
  const [codeInput,setCodeInput]=useState('');
  const [redeeming,setRedeeming]=useState(false);
  const handleRedeem=async()=>{
    if(redeeming)return;
    setRedeeming(true);
    const res=await onRedeem(codeInput);
    setRedeeming(false);
    Alert.alert(res.ok?'✅ Access Activated':'Code Not Applied',res.msg,[{text:'OK',onPress:()=>{if(res.ok)onBack();}}]);
  };
  return(<ScrollView style={{flex:1,backgroundColor:C.bg}} contentContainerStyle={{padding:16,paddingTop:56,alignItems:'center'}}><StatusBar barStyle="light-content"/>
    <Text style={{fontSize:48,marginBottom:12}}>🔓</Text>
    <Text style={{color:C.t1,fontSize:26,fontWeight:'900',textAlign:'center',marginBottom:4}}>Unlock Pro</Text>
    <Text style={{color:C.ac,fontSize:13,fontWeight:'700',marginBottom:20,textAlign:'center'}}>Full clinical-judgment trainer • Cancel anytime</Text>

    <View style={{backgroundColor:C.sf,borderRadius:14,padding:20,width:'100%',borderWidth:1,borderColor:C.bd,marginBottom:16}}>
      <Text style={{color:C.t1,fontSize:16,fontWeight:'700',marginBottom:12}}>Pro includes:</Text>
      {['Access to all clinical case studies (new cases added daily)','AI "Why I\'m Wrong" error pattern analysis','Exam Simulation Mode with timer','Full Performance Dashboard with readiness predictor','Unlimited study history tracking','Practice Exam with Pass/Fail Predictor','AI Weakness Detection & Remediation Plans'].map(f=>
        <View key={f} style={{flexDirection:'row',gap:10,marginBottom:8,alignItems:'flex-start'}}><Text style={{color:C.ok,fontSize:14}}>✓</Text><Text style={{color:C.t2,fontSize:14,flex:1}}>{f}</Text></View>
      )}
    </View>

    {/* PLAN PICKER — Lifetime first (recommended), Monthly second */}
    <Pressable onPress={()=>setPlan('lifetime')} style={{width:'100%',backgroundColor:isLifetime?C.acd:C.sf,borderWidth:2,borderColor:isLifetime?C.ac:C.bd,borderRadius:14,padding:14,marginBottom:10,flexDirection:'row',alignItems:'center'}}>
      <View style={{width:22,height:22,borderRadius:11,borderWidth:2,borderColor:isLifetime?C.ac:C.t3,alignItems:'center',justifyContent:'center',marginRight:12}}>
        {isLifetime&&<View style={{width:10,height:10,borderRadius:5,backgroundColor:C.ac}}/>}
      </View>
      <View style={{flex:1}}>
        <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:2}}>
          <Text style={{color:C.t1,fontSize:15,fontWeight:'800'}}>Lifetime Access</Text>
          <View style={{backgroundColor:C.goldDim,paddingHorizontal:6,paddingVertical:2,borderRadius:4,borderWidth:1,borderColor:C.gold}}>
            <Text style={{color:C.gold,fontSize:9,fontWeight:'800',letterSpacing:0.5}}>BEST VALUE</Text>
          </View>
        </View>
        <Text style={{color:C.t2,fontSize:12}}>One-time payment • Never expires</Text>
      </View>
      <Text style={{color:C.ac,fontSize:18,fontWeight:'900'}}>{PRICE_LIFETIME}</Text>
    </Pressable>

    <Pressable onPress={()=>setPlan('monthly')} style={{width:'100%',backgroundColor:!isLifetime?C.acd:C.sf,borderWidth:2,borderColor:!isLifetime?C.ac:C.bd,borderRadius:14,padding:14,marginBottom:16,flexDirection:'row',alignItems:'center'}}>
      <View style={{width:22,height:22,borderRadius:11,borderWidth:2,borderColor:!isLifetime?C.ac:C.t3,alignItems:'center',justifyContent:'center',marginRight:12}}>
        {!isLifetime&&<View style={{width:10,height:10,borderRadius:5,backgroundColor:C.ac}}/>}
      </View>
      <View style={{flex:1}}>
        <Text style={{color:C.t1,fontSize:15,fontWeight:'800',marginBottom:2}}>Monthly</Text>
        <Text style={{color:C.t2,fontSize:12}}>Auto-renews monthly • Cancel anytime</Text>
      </View>
      <Text style={{color:C.ac,fontSize:18,fontWeight:'900'}}>{PRICE_MONTHLY}<Text style={{color:C.t2,fontSize:11,fontWeight:'600'}}>/mo</Text></Text>
    </Pressable>

    <View style={{backgroundColor:C.sf,borderRadius:14,padding:16,width:'100%',borderWidth:1,borderColor:C.bd,marginBottom:20}}>
      <Text style={{color:C.t3,fontSize:11,textAlign:'center',letterSpacing:0.5,textTransform:'uppercase',marginBottom:8}}>Free vs Pro</Text>
      <View style={{flexDirection:'row',borderBottomWidth:1,borderBottomColor:C.bd,paddingBottom:8,marginBottom:8}}>
        <Text style={{flex:2,color:C.t2,fontSize:12,fontWeight:'600'}}>Feature</Text>
        <Text style={{flex:1,color:C.t2,fontSize:12,fontWeight:'600',textAlign:'center'}}>Free</Text>
        <Text style={{flex:1,color:C.ac,fontSize:12,fontWeight:'600',textAlign:'center'}}>Pro</Text>
      </View>
      {[['Case Studies','1','All'],['AI Diagnostic','—','✓'],['Exam Timer','—','✓'],['Dashboard','Basic','Full'],['Practice Exam','—','✓'],['Remediation','—','✓'],['Score Sharing','✓','✓']].map(([f,free,pro])=>
        <View key={f} style={{flexDirection:'row',paddingVertical:6,borderBottomWidth:1,borderBottomColor:C.bd}}>
          <Text style={{flex:2,color:C.t1,fontSize:13}}>{f}</Text>
          <Text style={{flex:1,color:C.t3,fontSize:13,textAlign:'center'}}>{free}</Text>
          <Text style={{flex:1,color:C.ac,fontSize:13,textAlign:'center',fontWeight:'700'}}>{pro}</Text>
        </View>
      )}
    </View>

    <Pressable onPress={()=>onUnlock(plan)} style={{backgroundColor:C.ac,borderRadius:10,paddingVertical:14,alignItems:'center',width:'100%',minHeight:44}}>
      <Text style={{color:C.bg,fontSize:14,fontWeight:'800',letterSpacing:1,textTransform:'uppercase'}}>
        {isLifetime ? `UNLOCK LIFETIME — ${PRICE_LIFETIME}` : `SUBSCRIBE — ${PRICE_MONTHLY}/MO`}
      </Text>
    </Pressable>
    <Text style={{color:C.t3,fontSize:10,textAlign:'center',marginTop:8}}>
      {isLifetime
        ? `${PRICE_LIFETIME} one-time purchase. Lifetime access. No recurring charges.`
        : `${PRICE_MONTHLY}/month. Auto-renews monthly. Cancel anytime in Apple ID settings.`}
    </Text>
    <Pressable onPress={onRestore} style={{marginTop:12,paddingVertical:10,alignItems:'center',width:'100%',minHeight:44}}>
      <Text style={{color:C.ac,fontSize:13,fontWeight:'700',textDecorationLine:'underline'}}>↻ Restore Purchases</Text>
    </Pressable>

    {/* CLASSROOM / PILOT ACCESS — nursing (RN/LVN) and psych-tech (LPT) program
        cohorts get full Pro access with a code from their instructor. */}
    <View style={{backgroundColor:C.sf,borderWidth:1,borderColor:C.bd,borderRadius:14,padding:16,width:'100%',marginTop:12}}>
      <Text style={{color:C.t1,fontSize:14,fontWeight:'800',marginBottom:2}}>🎓 Student or faculty?</Text>
      <Text style={{color:C.t2,fontSize:12,lineHeight:17,marginBottom:10}}>Enter your program's access code for full access to every track — RN, LVN, and LPT.</Text>
      <View style={{flexDirection:'row',gap:8}}>
        <TextInput value={codeInput} onChangeText={setCodeInput} placeholder="ACCESS CODE" placeholderTextColor={C.t3} autoCapitalize="characters" autoCorrect={false}
          style={{flex:1,backgroundColor:C.sfr,borderWidth:1,borderColor:C.bd,borderRadius:10,paddingHorizontal:12,paddingVertical:10,color:C.t1,fontSize:14,letterSpacing:1}}/>
        <Pressable onPress={handleRedeem} disabled={redeeming} style={{backgroundColor:C.ac,borderRadius:10,paddingHorizontal:16,justifyContent:'center',minHeight:44,opacity:redeeming?0.6:1}}>
          {redeeming?<ActivityIndicator size="small" color={C.bg}/>:<Text style={{color:C.bg,fontSize:12,fontWeight:'800',letterSpacing:0.5}}>APPLY</Text>}
        </Pressable>
      </View>
    </View>
    <View style={{flexDirection:'row',gap:16,marginTop:8,marginBottom:8}}>
      <Pressable onPress={()=>Linking.openURL('https://rxmazda06-alt.github.io/scrublife-legal/terms.html')}><Text style={{color:C.ac,fontSize:11,textDecorationLine:'underline'}}>Terms of Use</Text></Pressable>
      <Text style={{color:C.t3}}>•</Text>
      <Pressable onPress={()=>Linking.openURL('https://rxmazda06-alt.github.io/scrublife-legal/privacy.html')}><Text style={{color:C.ac,fontSize:11,textDecorationLine:'underline'}}>Privacy Policy</Text></Pressable>
    </View>
    <Pressable onPress={onBack} style={{marginTop:16,minHeight:44,justifyContent:'center'}}><Text style={{color:C.ac,fontSize:14,fontWeight:'700'}}>← Maybe Later</Text></Pressable>
  </ScrollView>);
}

// ═══════════════════════════════════════════════════════════
// SPECIALTY GROUPING — derive a single section label per case from its tags.
// Priority order matters: a case tagged ["Pediatrics","Cardiovascular"] groups
// under Pediatrics, not Cardiac. Bundled cases without tags fall under Foundations.
// ═══════════════════════════════════════════════════════════
const SPECIALTY_RULES=[
  ['Pediatrics',          ['Pediatrics']],
  ['Maternal & Newborn',  ['Maternal-Newborn','Maternity','Obstetrics']],
  ['Mental Health',       ['Mental Health']],
  ['Geriatrics',          ['Geriatrics']],
  ['Critical Care',       ['Critical Care']],
  ['Cardiac',             ['Cardiovascular']],
  ['Neuro',               ['Neurological']],
  ['Respiratory',         ['Respiratory']],
  ['Endocrine',           ['Endocrine']],
  ['GI / Hepatic',        ['Gastrointestinal']],
  ['Renal / GU',          ['Renal']],
  ['Hematology / Onc',    ['Hematology-Oncology','Hematology']],
  ['Immunology',          ['Immunological','Immunology']],
  ['Trauma',              ['Trauma']],
  ['Infection',           ['Infection','Infectious Disease']],
  ['Integumentary',       ['Integumentary']],
  ['Pharmacology / Safety',['Pharmacology','Safety','Patient Safety']],
];
// NCLEX test-plan categories (the tags the daily generator actually writes)
// mapped to their own browse sections. Checked AFTER the clinical-specialty
// rules, so a Cardiac case that also carries "Reduction of Risk Potential" still
// files under Cardiac — but a case tagged with ONLY test-plan categories gets a
// real section instead of collapsing into the "Foundations" catch-all.
const NCLEX_SECTION_RULES=[
  ['Management of Care',         ['Management of Care','Leadership & Delegation','Ethical & Legal']],
  ['Health Promotion',          ['Health Promotion']],
  ['Safety & Infection Control',['Safety & Infection Control','Safety and Infection Control']],
  ['Basic Care & Comfort',      ['Basic Care & Comfort','Basic Care and Comfort']],
  ['Reduction of Risk',         ['Reduction of Risk Potential']],
  ['Perioperative',             ['Perioperative']],
];
const SPECIALTY_ORDER=SPECIALTY_RULES.map(r=>r[0])
  .concat(NCLEX_SECTION_RULES.map(r=>r[0]))
  .concat(['Foundations']);
function caseSpecialty(c){
  const tags=c.tags||[];
  if(tags.length===0)return'Foundations';
  for(const [label,tagList] of SPECIALTY_RULES){
    if(tags.some(t=>tagList.includes(t)))return label;
  }
  // No clinical specialty matched — file under the NCLEX test-plan section.
  for(const [label,tagList] of NCLEX_SECTION_RULES){
    if(tags.some(t=>tagList.includes(t)))return label;
  }
  return'Foundations';
}
// Free-text case search: matches the query (already lowercased) against a case's
// title, subtitle, category, domain, and tags. Empty query matches everything.
function caseMatchesQuery(c,q){
  if(!q)return true;
  const hay=[c.title,c.subtitle,c.category,c.domain,...(c.tags||[])].filter(Boolean).join(' ').toLowerCase();
  return hay.includes(q);
}

// LPT (California state exam) content domains. The LPT track groups & filters by
// these — matching how the PSI licensing exam is organized — instead of the NGN
// clinical specialties used for RN/LVN.
const LPT_DOMAINS=['Mental Health Care','Basic Nursing Care','Developmental Disabilities','Legal & Ethical (LPS Act & Patient Rights)'];
function caseDomain(c){ return c.domain || 'Mental Health Care'; }

// FULL STATE-EXAM FORM — the real BVNPT exam is 240 questions spread across the
// content domains, NOT weighted by how many questions happen to be in the bank.
// This samples a blueprint-weighted, domain-mixed exam from the accessible LPT
// questions so the simulation feels like the real test regardless of bank skew.
// Weights are approximate content-area targets; counts are capped by availability
// and any shortfall is redistributed to domains that still have spare questions.
const LPT_EXAM_BLUEPRINT={
  'Mental Health Care':0.45,
  'Basic Nursing Care':0.22,
  'Developmental Disabilities':0.18,
  'Legal & Ethical (LPS Act & Patient Rights)':0.15,
};
function shuffleArr(arr){const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function buildLptExamForm(lptCases,isPro,total=240){
  const pool={};
  (lptCases||[]).forEach(c=>{ if(!c.isFree&&!isPro)return; const d=caseDomain(c); (c.steps||[]).forEach(st=>{(pool[d]=pool[d]||[]).push({q:st.q,opts:st.opts,domain:st.domain||d});}); });
  const domains=Object.keys(LPT_EXAM_BLUEPRINT).filter(d=>pool[d]&&pool[d].length);
  const totalAvail=domains.reduce((n,d)=>n+pool[d].length,0);
  const target=Math.min(total,totalAvail);
  if(target===0)return {id:'lpt-exam-240',title:'LPT Full State Exam',subtitle:'0 questions',isFree:true,category:'LPT',format:'mc',timed:true,steps:[],_startIndex:0};
  const wsum=domains.reduce((s,d)=>s+LPT_EXAM_BLUEPRINT[d],0)||1;
  const take={};let assigned=0;
  domains.forEach(d=>{const want=Math.round(LPT_EXAM_BLUEPRINT[d]/wsum*target);take[d]=Math.min(want,pool[d].length);assigned+=take[d];});
  // Redistribute rounding error / shortfall to domains with spare capacity.
  let short=target-assigned;const cap=d=>pool[d].length-take[d];
  while(short!==0){
    const order=domains.slice().sort((a,b)=>cap(b)-cap(a));let moved=false;
    for(const d of order){
      if(short>0&&cap(d)>0){take[d]++;short--;moved=true;}
      else if(short<0&&take[d]>0){take[d]--;short++;moved=true;}
      if(short===0)break;
    }
    if(!moved)break;
  }
  let picked=[];
  domains.forEach(d=>{picked=picked.concat(shuffleArr(pool[d]).slice(0,take[d]));});
  picked=shuffleArr(picked); // interleave domains so the exam is mixed, not grouped
  return {id:'lpt-exam-240',title:`LPT Full State Exam · ${picked.length} Q`,subtitle:'Blueprint-weighted · timed · mixed domains',isFree:true,category:'LPT',format:'mc',timed:true,steps:picked.map((qq,i)=>({q:qq.q,opts:qq.opts,domain:qq.domain,type:'single',id:i+1,stepTitle:qq.domain})),_startIndex:0};
}

// ═══════════════════════════════════════════════════════════
// LPT STATE-EXAM HOME — dedicated area for the California LPT track.
// LPT is a different exam from the NGN NCLEX, so it gets its own screen:
// state-exam branding, PSI content-domain navigation, and single-best-answer
// question sets only (format:'mc'). Shown instead of HomeScreen when track=LPT.
// ═══════════════════════════════════════════════════════════
function LptHomeScreen({cases,userTrack,onChangeTrack,casesLoading,refreshCases,onStart,perf,streak,isPro,toggleAnx,anxMode,goStats,goPay,goExam,goRemed,history=[]}){
  const readCol={Low:C.rbd,Borderline:C.high,High:C.ac,'Very High':C.gbd};
  const [domainFilter,setDomainFilter]=useState('All');
  const [query,setQuery]=useState('');
  const trackCounts=TRACKS.reduce((a,t)=>{a[t]=casesForTrack(cases,t).length;return a;},{});
  const lptCases=casesForTrack(cases,'LPT'); // format-locked to MC cases
  // Chip badges show QUESTION counts per domain (this track is a flat question list).
  const counts=lptCases.reduce((a,c)=>{const d=caseDomain(c);a[d]=(a[d]||0)+((c.steps||[]).length);return a;},{});
  const chips=['All',...LPT_DOMAINS.filter(d=>counts[d])];
  const eff=chips.includes(domainFilter)?domainFilter:'All';
  const domainCases=eff==='All'?lptCases:lptCases.filter(c=>caseDomain(c)===eff);
  const q=query.trim().toLowerCase();
  const totalQ=lptCases.reduce((n,c)=>n+((c.steps||[]).length),0);
  // FLAT LINEAR EXAM — the LPT track mirrors the real BVNPT exam: one continuous,
  // numbered list of single-best-answer questions rather than grouped topic cards.
  // Flatten every accessible question in the filtered domain into one sequence, then
  // filter by the search query at the QUESTION level (stem + options + domain + source).
  // Build the DISPLAY list from all filtered questions (Pro-locked ones are shown as a
  // teaser, not hidden), tagging each with its lock state. The actual exam RUN excludes
  // locked questions, so a free learner tapping one is routed to the paywall instead.
  const lockedRemain=domainCases.some(c=>!c.isFree&&!isPro);
  const flat=[];
  domainCases.forEach(c=>{
    const locked=!c.isFree&&!isPro;const dom0=caseDomain(c);
    (c.steps||[]).forEach(st=>{
      const dom=st.domain||dom0;
      if(!q||[st.q,dom,c.title,...(st.opts||[]).map(o=>o.text)].filter(Boolean).join(' ').toLowerCase().includes(q))
        flat.push({q:st.q,opts:st.opts,domain:dom,locked});
    });
  });
  const run=flat.filter(x=>!x.locked);const hasUnlocked=run.length>0;
  // Aggregated case fed to the linear player, numbered 1..N over the accessible run.
  const makeExam=(startIndex=0)=>({id:'lpt-linear-exam',title:'LPT State-Exam · Linear Practice',subtitle:`${run.length} questions`,isFree:true,category:'LPT',format:'mc',steps:run.map((qq,i)=>({q:qq.q,opts:qq.opts,domain:qq.domain,type:'single',id:i+1,stepTitle:qq.domain})),_startIndex:Math.min(Math.max(0,startIndex),Math.max(0,run.length-1))});
  const MAX_ROWS=75;const rows=flat.slice(0,MAX_ROWS);
  return(<ScrollView style={{flex:1,backgroundColor:C.bg}} contentContainerStyle={{paddingBottom:60}} showsVerticalScrollIndicator={false}><StatusBar barStyle="light-content"/>
    <View style={{backgroundColor:C.sfr,borderBottomWidth:1,borderBottomColor:C.bd,paddingTop:56,paddingBottom:24,paddingHorizontal:16}}>
      <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <View style={{backgroundColor:C.acd,paddingHorizontal:10,paddingVertical:4,borderRadius:4}}><Text style={{color:C.ac,fontSize:10,fontWeight:'800',letterSpacing:1.5,textTransform:'uppercase'}}>SCRUB LIFE · LPT{isPro?' • PRO':''}</Text></View>
        {!isPro&&<Pressable onPress={goPay} style={{backgroundColor:C.goldDim,paddingHorizontal:12,paddingVertical:5,borderRadius:20,borderWidth:1,borderColor:C.gold}}><Text style={{color:C.gold,fontSize:10,fontWeight:'800',letterSpacing:0.5}}>⭐ UPGRADE TO PRO</Text></Pressable>}
      </View>
      <Text style={{color:C.t1,fontSize:30,fontWeight:'900',letterSpacing:-0.5,lineHeight:36}}>California{'\n'}<Text style={{color:C.ac}}>State Board Exam</Text></Text>
      <Text style={{color:C.t2,fontSize:14,lineHeight:21,marginTop:4}}>Licensed Psychiatric Technician · {totalQ} single-best-answer questions</Text>
    </View>
    <View style={{paddingHorizontal:16}}>
      <View style={{flexDirection:'row',backgroundColor:C.sf,borderWidth:1,borderColor:C.bd,borderRadius:14,padding:14,marginTop:16,marginBottom:12}}>
        <Pressable onPress={goStats} style={{flex:1,alignItems:'center'}}><Text style={{color:C.ac,fontSize:22,fontWeight:'800'}}>{perf?.overallPct??'—'}%</Text><Text style={{color:C.t3,fontSize:9,fontWeight:'600',letterSpacing:0.8,textTransform:'uppercase'}}>ACCURACY</Text></Pressable>
        <View style={{width:1,backgroundColor:C.bd}}/>
        <View style={{flex:1,alignItems:'center'}}><Text style={{color:perf?readCol[perf.readiness]||C.t2:C.t2,fontSize:14,fontWeight:'800'}}>{perf?.readiness||'—'}</Text><Text style={{color:C.t3,fontSize:9,fontWeight:'600',letterSpacing:0.8,textTransform:'uppercase'}}>READINESS</Text></View>
        <View style={{width:1,backgroundColor:C.bd}}/>
        <View style={{flex:1,alignItems:'center'}}><Text style={{color:C.amber,fontSize:22,fontWeight:'800'}}>🔥{streak.current}</Text><Text style={{color:C.t3,fontSize:9,fontWeight:'600',letterSpacing:0.8,textTransform:'uppercase'}}>STREAK</Text></View>
        <View style={{width:1,backgroundColor:C.bd}}/>
        <View style={{flex:1,alignItems:'center'}}><Text style={{color:C.ac,fontSize:22,fontWeight:'800'}}>{perf?.totalAttempts||0}</Text><Text style={{color:C.t3,fontSize:9,fontWeight:'600',letterSpacing:0.8,textTransform:'uppercase'}}>DONE</Text></View>
      </View>

      <Pressable onPress={()=>isPro?onStart(buildLptExamForm(lptCases,isPro)):goPay()} style={{backgroundColor:C.purpleDim,borderWidth:1.5,borderColor:C.purple,borderRadius:14,padding:16,marginBottom:12,flexDirection:'row',alignItems:'center',gap:12,minHeight:60}}>
        <View style={{width:44,height:44,borderRadius:22,backgroundColor:'rgba(167,139,250,0.2)',alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:22}}>🎯</Text></View>
        <View style={{flex:1}}>
          <Text style={{color:C.t1,fontSize:16,fontWeight:'800'}}>Full State Exam · 240 Q</Text>
          <Text style={{color:C.purple,fontSize:11,fontWeight:'600'}}>Timed · single-best-answer · blueprint-weighted domain mix</Text>
        </View>
        {!isPro&&<View style={{backgroundColor:C.goldDim,paddingHorizontal:8,paddingVertical:3,borderRadius:4}}><Text style={{color:C.gold,fontSize:9,fontWeight:'700'}}>PRO</Text></View>}
        <Text style={{color:C.purple,fontSize:16}}>→</Text>
      </Pressable>

      <Pressable onPress={goStats} style={{backgroundColor:C.sf,borderWidth:1,borderColor:C.bd,borderRadius:10,padding:14,marginBottom:16,flexDirection:'row',alignItems:'center',gap:10,minHeight:44}}>
        <Text style={{fontSize:18}}>📊</Text><Text style={{color:C.t1,fontSize:14,fontWeight:'700',flex:1}}>Performance Dashboard</Text><Text style={{color:C.ac,fontSize:14}}>→</Text>
      </Pressable>

      <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
        <Text style={{color:C.t2,fontSize:10,fontWeight:'600',letterSpacing:1.5,textTransform:'uppercase'}}>Exam Track</Text>
        <Text style={{color:C.t3,fontSize:10,fontWeight:'600'}}>{TRACK_META[userTrack]?.name||''}</Text>
      </View>
      <View style={{flexDirection:'row',backgroundColor:C.sf,borderWidth:1,borderColor:C.bd,borderRadius:12,padding:4,gap:4,marginBottom:16}}>
        {TRACKS.map(t=>{const on=userTrack===t;const pro=t!==FREE_TRACK&&!isPro;return(
          <Pressable key={t} onPress={()=>{setDomainFilter('All');onChangeTrack&&onChangeTrack(t);}} accessibilityRole="tab" accessibilityState={{selected:on}} accessibilityLabel={`${TRACK_META[t].name} track, ${trackCounts[t]} sets`} accessibilityHint="Switches to this licensure track" style={{flex:1,backgroundColor:on?C.ac:'transparent',borderRadius:9,paddingVertical:8,alignItems:'center',minHeight:44,justifyContent:'center'}}>
            <Text style={{color:on?C.bg:C.t2,fontSize:13,fontWeight:'800',letterSpacing:0.5}}>{TRACK_META[t].label}</Text>
            <Text style={{color:on?C.bg:C.t3,fontSize:9,fontWeight:'700',marginTop:1}}>{trackCounts[t]}</Text>
            {pro&&<View style={{position:'absolute',top:3,right:4,backgroundColor:C.goldDim,paddingHorizontal:3,borderRadius:3}}><Text style={{color:C.gold,fontSize:7,fontWeight:'800'}}>PRO</Text></View>}
          </Pressable>);})}
      </View>

      <View style={{flexDirection:'row',alignItems:'center',backgroundColor:C.sf,borderWidth:1,borderColor:query?C.ac:C.bd,borderRadius:12,paddingHorizontal:12,marginBottom:12,minHeight:44}}>
        <Text style={{color:C.t3,fontSize:14,marginRight:8}}>🔍</Text>
        <TextInput value={query} onChangeText={setQuery} accessibilityLabel="Search questions" accessibilityHint="Filters the question list as you type" placeholder="Search questions by name, topic, or tag…" placeholderTextColor={C.t3} style={{flex:1,color:C.t1,fontSize:14,paddingVertical:10}} returnKeyType="search" autoCorrect={false} autoCapitalize="none"/>
        {query.length>0&&<Pressable onPress={()=>setQuery('')} hitSlop={8} style={{padding:4}}><Text style={{color:C.t3,fontSize:15,fontWeight:'700'}}>✕</Text></Pressable>}
      </View>
      <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <Text style={{color:C.t2,fontSize:10,fontWeight:'600',letterSpacing:1.5,textTransform:'uppercase'}}>Linear Exam ({q||eff!=='All'?flat.length+'/'+totalQ:totalQ} questions)</Text>
        <Pressable onPress={refreshCases} disabled={casesLoading} accessibilityRole="button" accessibilityLabel={casesLoading?"Checking for new content":"Refresh content"} style={{flexDirection:'row',alignItems:'center',gap:6,paddingVertical:4,paddingHorizontal:8}}>
          {casesLoading?<ActivityIndicator size="small" color={C.ac}/>:<Text style={{color:C.ac,fontSize:12}}>↻</Text>}
          <Text style={{color:C.ac,fontSize:10,fontWeight:'700'}}>{casesLoading?'CHECKING':'REFRESH'}</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:12,marginHorizontal:-16}} contentContainerStyle={{gap:8,paddingHorizontal:16}}>
        {chips.map(t=>{const sel=eff===t;const count=t==='All'?totalQ:(counts[t]||0);
          return(<Pressable key={t} onPress={()=>setDomainFilter(t)} accessibilityRole="button" accessibilityState={{selected:sel}} accessibilityLabel={`${t} filter, ${count} questions`} style={{backgroundColor:sel?C.acd:C.sf,borderWidth:1,borderColor:sel?C.ac:C.bd,borderRadius:18,paddingHorizontal:12,paddingVertical:7,flexDirection:'row',alignItems:'center',gap:6}}>
            <Text style={{color:sel?C.ac:C.t2,fontSize:12,fontWeight:'700'}}>{t}</Text>
            <View style={{backgroundColor:sel?C.ac:C.bd,paddingHorizontal:6,paddingVertical:1,borderRadius:8,minWidth:18,alignItems:'center'}}><Text style={{color:sel?C.sfr:C.t2,fontSize:9,fontWeight:'800'}}>{count}</Text></View>
          </Pressable>);})}
      </ScrollView>
      {flat.length>0&&<Pressable onPress={()=>hasUnlocked?onStart(makeExam(0)):goPay()} accessibilityRole="button" accessibilityLabel={hasUnlocked?`Start linear exam, ${run.length} questions`:"Unlock linear exam with Pro"} style={{backgroundColor:hasUnlocked?C.ac:C.goldDim,borderWidth:hasUnlocked?0:1,borderColor:C.gold,borderRadius:12,paddingVertical:14,alignItems:'center',justifyContent:'center',marginBottom:14,minHeight:48}}>
        <Text style={{color:hasUnlocked?C.bg:C.gold,fontSize:13,fontWeight:'800',letterSpacing:1,textTransform:'uppercase'}}>{hasUnlocked?`▶ Start Linear Exam · ${run.length} Q`:'⭐ Unlock Linear Exam with Pro'}</Text>
      </Pressable>}
      {flat.length===0&&<View style={{padding:24,alignItems:'center',backgroundColor:C.sf,borderWidth:1,borderColor:C.bd,borderRadius:10,marginBottom:12}}><Text style={{color:C.t3,fontSize:13}}>{q?`No questions match “${query.trim()}”.`:'No questions available yet.'}</Text></View>}
      {rows.map((qq,i)=>(
        <Pressable key={i} onPress={()=>qq.locked?goPay():onStart(makeExam(flat.slice(0,i).filter(x=>!x.locked).length))} accessibilityRole="button" accessibilityLabel={`Question ${i+1}. ${qq.domain}. ${qq.locked?"Locked, requires Pro. ":""}${qq.q}`} accessibilityHint={qq.locked?"Opens the upgrade screen":"Starts the exam at this question"} style={{flexDirection:'row',backgroundColor:C.sf,borderWidth:1,borderColor:C.bd,borderRadius:10,padding:12,marginBottom:8,gap:10,alignItems:'flex-start',minHeight:44,opacity:qq.locked?0.6:1}}>
          <View style={{minWidth:30,height:24,borderRadius:6,backgroundColor:C.acd,alignItems:'center',justifyContent:'center',paddingHorizontal:6}}><Text style={{color:C.ac,fontSize:11,fontWeight:'800'}}>{i+1}</Text></View>
          <View style={{flex:1}}>
            <Text style={{color:C.t1,fontSize:13,lineHeight:18,fontWeight:'600'}} numberOfLines={3}>{qq.locked?'🔒 ':''}{qq.q}</Text>
            <Text style={{color:C.t3,fontSize:10,fontWeight:'700',marginTop:4,textTransform:'uppercase',letterSpacing:0.5}}>{qq.domain}</Text>
          </View>
          <Text style={{color:C.ac,fontSize:16,marginTop:2}}>›</Text>
        </Pressable>
      ))}
      {flat.length>MAX_ROWS&&<View style={{padding:14,alignItems:'center',marginBottom:8}}><Text style={{color:C.t3,fontSize:12,textAlign:'center'}}>+ {flat.length-MAX_ROWS} more questions. Tap “Start Linear Exam” for the full run, or search / filter to narrow this list.</Text></View>}
      {lockedRemain&&<Pressable onPress={goPay} style={{backgroundColor:C.goldDim,borderWidth:1,borderColor:C.gold,borderRadius:10,padding:14,marginTop:4,marginBottom:8,flexDirection:'row',alignItems:'center',gap:8,minHeight:44}}>
        <Text style={{fontSize:16}}>⭐</Text>
        <Text style={{color:C.gold,fontSize:12,fontWeight:'700',flex:1}}>Unlock the full question bank with Pro</Text>
        <Text style={{color:C.gold,fontSize:14}}>→</Text>
      </Pressable>}
      <Text style={{textAlign:'center',color:C.t3,fontSize:9,letterSpacing:0.8,textTransform:'uppercase',marginTop:16}}>Educational tool for CA LPT exam prep only.{'\n'}Does not provide medical diagnosis or treatment.</Text>
    </View>
  </ScrollView>);
}

// ═══════════════════════════════════════════════════════════
// HOME SCREEN
// ═══════════════════════════════════════════════════════════
function HomeScreen({cases,userTrack=DEFAULT_TRACK,onChangeTrack,casesLoading,refreshCases,onStart,perf,streak,isPro,anxMode,toggleAnx,devTogglePro,goStats,goPay,goExam,goRemed,history=[]}){
  const readCol={Low:C.rbd,Borderline:C.high,High:C.ac,'Very High':C.gbd};
  const [tagFilter,setTagFilter]=useState('All');
  const [query,setQuery]=useState('');
  // Hidden dev unlock: 7 rapid taps on the version chip flips Pro on/off.
  const versionTapsRef=useRef({count:0,lastTs:0});
  const handleVersionTap=()=>{
    const now=Date.now();
    const r=versionTapsRef.current;
    r.count=(now-r.lastTs<1500)?r.count+1:1;
    r.lastTs=now;
    if(r.count>=7){r.count=0;devTogglePro&&devTogglePro();}
  };
  // Narrow to the learner's licensure track first; the tag chips + grouping
  // then operate only on cases that track can see.
  const trackCases=casesForTrack(cases,userTrack);
  const trackCounts=TRACKS.reduce((a,t)=>{a[t]=casesForTrack(cases,t).length;return a;},{});
  // Topic grouping is TRACK-AWARE so the learner can pick a topic area to drill:
  //  • LPT (California state exam) groups & filters by the PSI content DOMAINS
  //    (c.domain) — Mental Health Care, Basic Nursing Care, Developmental
  //    Disabilities, Legal & Ethical.
  //  • RN/LVN group by NGN clinical specialty and filter by NCLEX test-plan tags.
  const isLpt=userTrack==='LPT';
  let tagCounts, allTags, groupOf, groupOrder;
  if(isLpt){
    groupOf=caseDomain; groupOrder=LPT_DOMAINS;
    tagCounts=trackCases.reduce((acc,c)=>{const d=caseDomain(c);acc[d]=(acc[d]||0)+1;return acc;},{});
    allTags=['All',...LPT_DOMAINS.filter(d=>tagCounts[d])];
  }else{
    groupOf=caseSpecialty; groupOrder=SPECIALTY_ORDER;
    // Count how many cases carry each tag (clinical specialty + NCLEX bucket).
    tagCounts=trackCases.reduce((acc,c)=>{(c.tags||[]).forEach(t=>{acc[t]=(acc[t]||0)+1;});return acc;},{});
    // Chips: "All" · existing tags (A→Z) · NCLEX categories that always show (count 0 until a case is tagged).
    const existingTags=Object.keys(tagCounts).sort();
    const extraTags=EXTRA_NCLEX_CATEGORIES.filter(t=>!existingTags.includes(t));
    allTags=['All',...existingTags,...extraTags];
  }
  // Guard: a filter chosen under a different track may not exist here — fall back to All.
  const effFilter=allTags.includes(tagFilter)?tagFilter:'All';
  const filteredCases=effFilter==='All'
    ?trackCases
    :(isLpt?trackCases.filter(c=>caseDomain(c)===effFilter):trackCases.filter(c=>(c.tags||[]).includes(effFilter)));
  // Search narrows the category-filtered list further (title/subtitle/tags/etc.).
  const q=query.trim().toLowerCase();
  const searchedCases=q?filteredCases.filter(c=>caseMatchesQuery(c,q)):filteredCases;
  const groupedSections=(()=>{
    const groups={};
    for(const c of searchedCases){const g=groupOf(c);(groups[g]=groups[g]||[]).push(c);}
    return groupOrder.filter(s=>groups[s]&&groups[s].length>0).map(s=>({specialty:s,items:groups[s]}));
  })();
  return(<ScrollView style={{flex:1,backgroundColor:C.bg}} contentContainerStyle={{paddingBottom:60}} showsVerticalScrollIndicator={false}><StatusBar barStyle="light-content"/>
    <View style={{backgroundColor:C.sfr,borderBottomWidth:1,borderBottomColor:C.bd,paddingTop:56,paddingBottom:24,paddingHorizontal:16}}>
      <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <Pressable onPress={handleVersionTap} style={{backgroundColor:C.acd,paddingHorizontal:10,paddingVertical:4,borderRadius:4}}><Text style={{color:C.ac,fontSize:10,fontWeight:'800',letterSpacing:1.5,textTransform:'uppercase'}}>NCJMM TRAINER v5{isPro?' • PRO':''}</Text></Pressable>
        {!isPro&&<Pressable onPress={goPay} style={{backgroundColor:C.goldDim,paddingHorizontal:12,paddingVertical:5,borderRadius:20,borderWidth:1,borderColor:C.gold}}><Text style={{color:C.gold,fontSize:10,fontWeight:'800',letterSpacing:0.5}}>⭐ UPGRADE TO PRO</Text></Pressable>}
      </View>
      <Text style={{color:C.t1,fontSize:30,fontWeight:'900',letterSpacing:-0.5,lineHeight:36}}>Clinical{'\n'}<Text style={{color:C.ac}}>Judgment</Text></Text>
      <Text style={{color:C.t2,fontSize:14,lineHeight:21,marginTop:4}}>{isLpt?'California LPT state-exam prep • Multiple-choice • Topic drills':'NGN case studies • AI coaching • NCLEX readiness'}</Text>
    </View>
    <View style={{paddingHorizontal:16}}>
      <View style={{flexDirection:'row',backgroundColor:C.sf,borderWidth:1,borderColor:C.bd,borderRadius:14,padding:14,marginTop:16,marginBottom:12}}>
        <Pressable onPress={goStats} style={{flex:1,alignItems:'center'}}><Text style={{color:C.ac,fontSize:22,fontWeight:'800'}}>{perf?.overallPct??'—'}%</Text><Text style={{color:C.t3,fontSize:9,fontWeight:'600',letterSpacing:0.8,textTransform:'uppercase'}}>ACCURACY</Text></Pressable>
        <View style={{width:1,backgroundColor:C.bd}}/>
        <View style={{flex:1,alignItems:'center'}}><Text style={{color:perf?readCol[perf.readiness]||C.t2:C.t2,fontSize:14,fontWeight:'800'}}>{perf?.readiness||'—'}</Text><Text style={{color:C.t3,fontSize:9,fontWeight:'600',letterSpacing:0.8,textTransform:'uppercase'}}>READINESS</Text></View>
        <View style={{width:1,backgroundColor:C.bd}}/>
        <View style={{flex:1,alignItems:'center'}}><Text style={{color:C.amber,fontSize:22,fontWeight:'800'}}>🔥{streak.current}</Text><Text style={{color:C.t3,fontSize:9,fontWeight:'600',letterSpacing:0.8,textTransform:'uppercase'}}>STREAK</Text></View>
        <View style={{width:1,backgroundColor:C.bd}}/>
        <View style={{flex:1,alignItems:'center'}}><Text style={{color:C.ac,fontSize:22,fontWeight:'800'}}>{perf?.totalAttempts||0}</Text><Text style={{color:C.t3,fontSize:9,fontWeight:'600',letterSpacing:0.8,textTransform:'uppercase'}}>DONE</Text></View>
      </View>

      {perf?.weakest&&<View style={{backgroundColor:C.amberDim,borderWidth:1,borderColor:C.amber,borderRadius:10,padding:12,marginBottom:12,flexDirection:'row',alignItems:'center',gap:8}}>
        <Text style={{fontSize:16}}>⚠️</Text>
        <View style={{flex:1}}><Text style={{color:C.amber,fontSize:12,fontWeight:'700'}}>Weakest: {perf.weakest}</Text><Text style={{color:C.t2,fontSize:11}}>Accuracy: {perf.weakPct}%</Text></View>
        <Pressable onPress={goRemed} style={{backgroundColor:C.amberDim,borderWidth:1,borderColor:C.amber,borderRadius:8,paddingHorizontal:10,paddingVertical:6}}><Text style={{color:C.amber,fontSize:10,fontWeight:'700'}}>FIX IT →</Text></Pressable>
      </View>}

      <Pressable onPress={goExam} style={{backgroundColor:C.purpleDim,borderWidth:1.5,borderColor:C.purple,borderRadius:14,padding:16,marginBottom:12,flexDirection:'row',alignItems:'center',gap:12,minHeight:60}}>
        <View style={{width:44,height:44,borderRadius:22,backgroundColor:'rgba(167,139,250,0.2)',alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:22}}>🎯</Text></View>
        <View style={{flex:1}}>
          <Text style={{color:C.t1,fontSize:16,fontWeight:'800'}}>Practice Exam</Text>
          <Text style={{color:C.purple,fontSize:11,fontWeight:'600'}}>Timed NCLEX simulation • Pass/Fail predictor</Text>
        </View>
        {!isPro&&<View style={{backgroundColor:C.goldDim,paddingHorizontal:8,paddingVertical:3,borderRadius:4}}><Text style={{color:C.gold,fontSize:9,fontWeight:'700'}}>PRO</Text></View>}
        <Text style={{color:C.purple,fontSize:16}}>→</Text>
      </Pressable>

      <Pressable onPress={goRemed} style={{backgroundColor:'rgba(0,230,118,0.06)',borderWidth:1.5,borderColor:C.gbd,borderRadius:14,padding:16,marginBottom:12,flexDirection:'row',alignItems:'center',gap:12,minHeight:60}}>
        <View style={{width:44,height:44,borderRadius:22,backgroundColor:'rgba(52,211,153,0.15)',alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:22}}>🧠</Text></View>
        <View style={{flex:1}}>
          <Text style={{color:C.t1,fontSize:16,fontWeight:'800'}}>AI Remediation</Text>
          <Text style={{color:C.gbd,fontSize:11,fontWeight:'600'}}>Weakness detection • Personalized study plan</Text>
        </View>
        {!isPro&&<View style={{backgroundColor:C.goldDim,paddingHorizontal:8,paddingVertical:3,borderRadius:4}}><Text style={{color:C.gold,fontSize:9,fontWeight:'700'}}>PRO</Text></View>}
        <Text style={{color:C.gbd,fontSize:16}}>→</Text>
      </Pressable>

      <Pressable onPress={goStats} style={{backgroundColor:C.sf,borderWidth:1,borderColor:C.bd,borderRadius:10,padding:14,marginBottom:12,flexDirection:'row',alignItems:'center',gap:10,minHeight:44}}>
        <Text style={{fontSize:18}}>📊</Text><Text style={{color:C.t1,fontSize:14,fontWeight:'700',flex:1}}>Performance Dashboard</Text><Text style={{color:C.ac,fontSize:14}}>→</Text>
      </Pressable>

      <View style={{flexDirection:'row',alignItems:'center',backgroundColor:C.sf,borderWidth:1,borderColor:C.bd,borderRadius:10,padding:14,marginBottom:16,gap:12}}>
        <View style={{flex:1}}><View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:2}}><Text style={{fontSize:14}}>⏱</Text><Text style={{color:C.t1,fontSize:13,fontWeight:'700'}}>Exam Simulation</Text></View>
          <Text style={{color:C.t2,fontSize:11}}>Timer + strike-through</Text></View>
        <Switch value={anxMode} onValueChange={toggleAnx} accessibilityRole="switch" accessibilityLabel="Exam simulation mode" accessibilityHint="Adds a countdown timer and strike-through to cases" accessibilityState={{checked:anxMode}} trackColor={{false:C.bd,true:C.acd}} thumbColor={anxMode?C.ac:C.t3}/>
      </View>

      <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
        <Text style={{color:C.t2,fontSize:10,fontWeight:'600',letterSpacing:1.5,textTransform:'uppercase'}}>Track</Text>
        <Text style={{color:C.t3,fontSize:10,fontWeight:'600'}}>{TRACK_META[userTrack]?.name||''}</Text>
      </View>
      <View style={{flexDirection:'row',backgroundColor:C.sf,borderWidth:1,borderColor:C.bd,borderRadius:12,padding:4,gap:4,marginBottom:16}}>
        {TRACKS.map(t=>{const on=userTrack===t;const pro=t!==FREE_TRACK&&!isPro;return(
          <Pressable key={t} onPress={()=>{setTagFilter('All');onChangeTrack&&onChangeTrack(t);}} accessibilityRole="tab" accessibilityState={{selected:on}} accessibilityLabel={`${TRACK_META[t].name} track, ${trackCounts[t]} cases`} accessibilityHint="Switches to this licensure track" style={{flex:1,backgroundColor:on?C.ac:'transparent',borderRadius:9,paddingVertical:8,alignItems:'center',minHeight:44,justifyContent:'center'}}>
            <Text style={{color:on?C.bg:C.t2,fontSize:13,fontWeight:'800',letterSpacing:0.5}}>{TRACK_META[t].label}</Text>
            <Text style={{color:on?C.bg:C.t3,fontSize:9,fontWeight:'700',marginTop:1}}>{trackCounts[t]}</Text>
            {pro&&<View style={{position:'absolute',top:3,right:4,backgroundColor:C.goldDim,paddingHorizontal:3,borderRadius:3}}><Text style={{color:C.gold,fontSize:7,fontWeight:'800'}}>PRO</Text></View>}
          </Pressable>);})}
      </View>
      <View style={{flexDirection:'row',alignItems:'center',backgroundColor:C.sf,borderWidth:1,borderColor:query?C.ac:C.bd,borderRadius:12,paddingHorizontal:12,marginBottom:12,minHeight:44}}>
        <Text style={{color:C.t3,fontSize:14,marginRight:8}}>🔍</Text>
        <TextInput value={query} onChangeText={setQuery} accessibilityLabel="Search cases" accessibilityHint="Filters the case list as you type" placeholder="Search cases by name, topic, or tag…" placeholderTextColor={C.t3} style={{flex:1,color:C.t1,fontSize:14,paddingVertical:10}} returnKeyType="search" autoCorrect={false} autoCapitalize="none"/>
        {query.length>0&&<Pressable onPress={()=>setQuery('')} hitSlop={8} style={{padding:4}}><Text style={{color:C.t3,fontSize:15,fontWeight:'700'}}>✕</Text></Pressable>}
      </View>
      <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <Text style={{color:C.t2,fontSize:10,fontWeight:'600',letterSpacing:1.5,textTransform:'uppercase'}}>{isLpt?'Topic Areas':'Case Studies'} ({q||effFilter!=='All'?searchedCases.length+'/'+trackCases.length:trackCases.length})</Text>
        <Pressable onPress={refreshCases} disabled={casesLoading} accessibilityRole="button" accessibilityLabel={casesLoading?"Checking for new content":"Refresh content"} style={{flexDirection:'row',alignItems:'center',gap:6,paddingVertical:4,paddingHorizontal:8}}>
          {casesLoading?<ActivityIndicator size="small" color={C.ac}/>:<Text style={{color:C.ac,fontSize:12}}>↻</Text>}
          <Text style={{color:C.ac,fontSize:10,fontWeight:'700'}}>{casesLoading?'CHECKING':'REFRESH'}</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:12,marginHorizontal:-16}} contentContainerStyle={{gap:8,paddingHorizontal:16}}>
        {allTags.map(t=>{
          const sel=effFilter===t;
          const count=t==='All'?trackCases.length:(tagCounts[t]||0);
          return(<Pressable key={t} onPress={()=>setTagFilter(t)} accessibilityRole="button" accessibilityState={{selected:sel}} accessibilityLabel={`${t} filter, ${count} cases`} style={{backgroundColor:sel?C.acd:C.sf,borderWidth:1,borderColor:sel?C.ac:C.bd,borderRadius:18,paddingHorizontal:12,paddingVertical:7,flexDirection:'row',alignItems:'center',gap:6}}>
            <Text style={{color:sel?C.ac:C.t2,fontSize:12,fontWeight:'700'}}>{t}</Text>
            <View style={{backgroundColor:sel?C.ac:C.bd,paddingHorizontal:6,paddingVertical:1,borderRadius:8,minWidth:18,alignItems:'center'}}><Text style={{color:sel?C.sfr:C.t2,fontSize:9,fontWeight:'800'}}>{count}</Text></View>
          </Pressable>);
        })}
      </ScrollView>
      {searchedCases.length===0&&<View style={{padding:24,alignItems:'center',backgroundColor:C.sf,borderWidth:1,borderColor:C.bd,borderRadius:10,marginBottom:12}}><Text style={{color:C.t3,fontSize:13}}>{q?`No cases match “${query.trim()}”.`:'No cases in this category yet.'}</Text></View>}
      {groupedSections.map(({specialty,items})=>(
        <View key={specialty} style={{marginBottom:8}}>
          <View style={{flexDirection:'row',alignItems:'center',gap:8,marginTop:4,marginBottom:10}}>
            <Text style={{color:C.ac,fontSize:13,fontWeight:'800',letterSpacing:0.5}}>{specialty}</Text>
            <View style={{backgroundColor:C.acd,paddingHorizontal:7,paddingVertical:1,borderRadius:8}}><Text style={{color:C.ac,fontSize:10,fontWeight:'800'}}>{items.length}</Text></View>
            <View style={{flex:1,height:1,backgroundColor:C.bd}}/>
          </View>
          {items.map(c=>{
            const locked=!c.isFree&&!isPro;
            const caseHist=(history||[]).filter(h=>h.caseId===c.id);
            const bestPct=(caseHist||[]).length>0?Math.max(...caseHist.map(h=>Math.round(h.correct/h.total*100))):null;
            return(<Pressable key={c.id} onPress={()=>onStart(c)} accessibilityRole="button" accessibilityLabel={`${c.title}. ${c.subtitle||""}. ${locked?"Locked, requires Pro":(c.format==="mc"?((c.steps||[]).length+" questions"):"6 step case")}${bestPct!==null?". Best score "+bestPct+" percent":""}`} accessibilityHint={locked?"Opens the upgrade screen":"Opens this case"} style={{backgroundColor:C.sf,borderWidth:1,borderColor:C.bd,borderRadius:14,overflow:'hidden',marginBottom:12,opacity:locked?0.85:1}}>
              <View style={{padding:14,paddingBottom:0,flexDirection:'row',gap:6,flexWrap:'wrap'}}>
                <View style={{backgroundColor:C.acd,paddingHorizontal:8,paddingVertical:3,borderRadius:4}}><Text style={{color:C.ac,fontSize:9,fontWeight:'700',letterSpacing:0.5,textTransform:'uppercase'}}>{c.format==='mc'?`LPT • ${(c.steps||[]).length} QUESTIONS`:'NCJMM • 6 STEPS'}</Text></View>
                {c.isFree&&<View style={{backgroundColor:C.gbg,paddingHorizontal:8,paddingVertical:3,borderRadius:4}}><Text style={{color:C.gbd,fontSize:9,fontWeight:'700'}}>FREE</Text></View>}
                {locked&&<View style={{backgroundColor:C.goldDim,paddingHorizontal:8,paddingVertical:3,borderRadius:4}}><Text style={{color:C.gold,fontSize:9,fontWeight:'700'}}>⭐ PRO</Text></View>}
              </View>
              <View style={{flexDirection:'row',padding:14,alignItems:'center',gap:14}}>
                <View style={{flex:1}}>
                  <Text style={{color:C.t1,fontSize:18,fontWeight:'800',marginBottom:2}}>{locked?'🔒 ':''}{c.title}</Text>
                  <Text style={{color:C.ac,fontSize:12}}>{c.subtitle}</Text>
                </View>
                {bestPct!==null&&<View style={{width:48,height:48,borderRadius:24,borderWidth:3,borderColor:C.ac,backgroundColor:C.sfr,alignItems:'center',justifyContent:'center'}}><Text style={{color:C.ac,fontSize:13,fontWeight:'800'}}>{bestPct}%</Text></View>}
              </View>
              <View style={{backgroundColor:locked?C.goldDim:C.acd,paddingVertical:10,alignItems:'center',minHeight:44,justifyContent:'center'}}>
                <Text style={{color:locked?C.gold:C.ac,fontSize:12,fontWeight:'800',letterSpacing:1,textTransform:'uppercase'}}>{locked?'Unlock with Pro':(caseHist||[]).length>0?'Retry Case':'Start Case'} →</Text>
              </View>
            </Pressable>);
          })}
        </View>
      ))}

      <Text style={{textAlign:'center',color:C.t3,fontSize:9,letterSpacing:0.8,textTransform:'uppercase',marginTop:16}}>Educational tool for NCLEX-RN/PN prep only.{'\n'}Does not provide medical diagnosis or treatment.</Text>
    </View>
  </ScrollView>);
}

// ═══════════════════════════════════════════════════════════
// PRACTICE EXAM SCREEN
// ═══════════════════════════════════════════════════════════
function PracticeExamScreen({cases,isPro,history,onFinishExam,onBack}){
  const scrollRef=useRef(null);
  const allQuestions=[];
  cases.forEach(c=>{
    if(!c.isFree&&!isPro)return;
    c.steps.forEach(step=>{
      step.opts.forEach(opt=>{
        allQuestions.push({caseId:c.id,caseTitle:c.title,category:c.category,stepId:step.id,stepTitle:step.title||step.stepTitle||step.domain||'Question',stepType:step.type,opt,step});
      });
    });
  });

  const TOTAL_Q=Math.min(allQuestions.length,30);
  const[questions]=useState(()=>allQuestions.sort(()=>Math.random()-0.5).slice(0,TOTAL_Q));
  const[current,setCurrent]=useState(0);
  const[answers,setAnswers]=useState({});
  const[showResult,setShowResult]=useState(false);
  const[correct,setCorrect]=useState(0);
  const[timedOut,setTimedOut]=useState(false);

  const passProbability=current>0?Math.min(99,Math.max(5,Math.round((correct/current)*120))):50;

  const answerQuestion=(idx,isCorrect)=>{
    if(answers[idx]!==undefined)return;
    setAnswers(p=>({...p,[idx]:isCorrect}));
    if(isCorrect)setCorrect(p=>p+1);
    setTimeout(()=>{
      if(idx<TOTAL_Q-1){setCurrent(idx+1);scrollRef.current?.scrollTo({y:0,animated:true});}
      else finishExam();
    },800);
  };

  const finishExam=()=>{
    const totalCorrect=Object.values(answers).filter(v=>v===true).length;
    const totalAnswered=Object.keys(answers).length;
    const pct=totalAnswered>0?Math.round((totalCorrect/totalAnswered)*100):0;
    const byCategory={};const byStep={};
    questions.forEach((q,i)=>{
      if(answers[i]===undefined)return;
      if(!byCategory[q.category])byCategory[q.category]={correct:0,total:0};
      byCategory[q.category].total++;
      if(answers[i])byCategory[q.category].correct++;
      if(!byStep[q.stepTitle])byStep[q.stepTitle]={correct:0,total:0};
      byStep[q.stepTitle].total++;
      if(answers[i])byStep[q.stepTitle].correct++;
    });
    onFinishExam({correct:totalCorrect,total:totalAnswered,pct,passProbability:Math.min(99,Math.max(5,Math.round((totalCorrect/totalAnswered)*120))),byCategory,byStep,date:new Date().toISOString()});
  };

  const q=questions[current];
  if(!q)return<View style={s.loadWrap}><Text style={{color:C.t1}}>No questions available. Complete more cases first.</Text><Pressable onPress={onBack} style={{marginTop:16}}><Text style={{color:C.ac}}>← Back</Text></Pressable></View>;

  const isMulti=q.step.type==='multi'||q.step.type==='single';
  const isCorrectAnswer=isMulti?q.opt.c===true:q.opt.c==='Indicated';
  const answered=answers[current]!==undefined;

  return(<ScrollView ref={scrollRef} style={{flex:1,backgroundColor:C.bg}} contentContainerStyle={{paddingBottom:80}}><StatusBar barStyle="light-content"/>
    <View style={{flexDirection:'row',alignItems:'center',paddingHorizontal:14,paddingTop:Platform.OS==='ios'?54:12,paddingBottom:10,borderBottomWidth:1,borderBottomColor:C.bd,gap:10}}>
      <Pressable onPress={()=>Alert.alert('Leave Exam?','Your progress will be lost.',[{text:'Stay',style:'cancel'},{text:'Leave',style:'destructive',onPress:onBack}])} style={{minWidth:44,minHeight:44,justifyContent:'center'}}><Text style={{color:C.ac,fontSize:14,fontWeight:'700'}}>← Exit</Text></Pressable>
      <Text style={{color:C.t1,fontSize:15,fontWeight:'700',flex:1}}>Practice Exam</Text>
      <Text style={{color:C.t2,fontSize:12,fontWeight:'600'}}>{current+1}/{TOTAL_Q}</Text>
    </View>
    <View style={{paddingHorizontal:14,paddingTop:12}}>
      <ExamTimer totalSeconds={TOTAL_Q*60} onTimeUp={()=>{setTimedOut(true);finishExam();}}/>
      <PassGauge probability={passProbability}/>
      <View style={{height:4,backgroundColor:C.bd,borderRadius:2,marginBottom:16,overflow:'hidden'}}>
        <View style={{height:4,backgroundColor:C.ac,borderRadius:2,width:`${(current/TOTAL_Q)*100}%`}}/>
      </View>

      <View style={{backgroundColor:C.sf,borderWidth:1,borderColor:C.bd,borderRadius:14,padding:16}}>
        <View style={{flexDirection:'row',gap:6,marginBottom:8,flexWrap:'wrap'}}>
          <View style={{backgroundColor:C.acd,paddingHorizontal:8,paddingVertical:3,borderRadius:4}}><Text style={{color:C.ac,fontSize:9,fontWeight:'700'}}>{q.category}</Text></View>
          <View style={{backgroundColor:C.purpleDim,paddingHorizontal:8,paddingVertical:3,borderRadius:4}}><Text style={{color:C.purple,fontSize:9,fontWeight:'700'}}>{q.stepTitle}</Text></View>
        </View>
        <Text style={{color:C.t1,fontSize:15,fontWeight:'700',marginBottom:4}}>{q.caseTitle}</Text>
        <Text style={{color:C.t2,fontSize:12,marginBottom:14}}>{q.step.inst||q.step.q||''}</Text>

        <View style={{backgroundColor:C.sfr,borderRadius:10,padding:14,borderWidth:1,borderColor:C.bd,marginBottom:14}}>
          <Text style={{color:C.t1,fontSize:14,lineHeight:20}}>{q.opt.text}</Text>
        </View>

        <Text style={{color:C.t2,fontSize:12,textAlign:'center',marginBottom:10}}>{isMulti?'Should this be selected?':'Is this intervention appropriate?'}</Text>

        {!answered&&<View style={{flexDirection:'row',gap:10}}>
          <Pressable onPress={()=>answerQuestion(current,isCorrectAnswer===true)} style={{flex:1,backgroundColor:C.gbg,borderWidth:1.5,borderColor:C.gbd,borderRadius:10,paddingVertical:14,alignItems:'center',minHeight:48}}>
            <Text style={{color:C.gbd,fontSize:14,fontWeight:'800'}}>✓ YES</Text>
          </Pressable>
          <Pressable onPress={()=>answerQuestion(current,isCorrectAnswer===false)} style={{flex:1,backgroundColor:C.rbg,borderWidth:1.5,borderColor:C.rbd,borderRadius:10,paddingVertical:14,alignItems:'center',minHeight:48}}>
            <Text style={{color:C.rbd,fontSize:14,fontWeight:'800'}}>✗ NO</Text>
          </Pressable>
        </View>}

        {answered&&<View style={{backgroundColor:answers[current]?C.gbg:C.rbg,borderWidth:1,borderColor:answers[current]?C.gbd:C.rbd,borderRadius:10,padding:12}}>
          <Text style={{color:answers[current]?C.gbd:C.rbd,fontSize:13,fontWeight:'700',marginBottom:4}}>{answers[current]?'✓ Correct!':'✗ Incorrect'}</Text>
          <Text style={{color:C.t2,fontSize:12,lineHeight:17}}>{q.opt.rat}</Text>
        </View>}
      </View>
    </View>
  </ScrollView>);
}

// ═══════════════════════════════════════════════════════════
// EXAM RESULTS SCREEN
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// SOCIAL SHARE — captures a branded "score card" and shares it via the native
// share sheet (Instagram/Facebook/TikTok/anywhere) plus one-tap IG/FB Stories.
// NOTE: uses native modules (view-shot, expo-sharing, react-native-share) — ships
// only in a native EAS BUILD, not an OTA update. Facebook Stories needs a Meta
// app id in FB_APP_ID; without it the FB button falls back to the share sheet.
// ═══════════════════════════════════════════════════════════
const FB_APP_ID = '';
const SHARE_TAGS = '#nursing #NCLEX #LPT #nursingstudent #scrublife';
function ResultShareRow({title,pct,correct,total,streak=0,subtitle}){
  const shotRef=useRef(null);
  const [busy,setBusy]=useState(false);
  const ringCol=pct>=90?C.gbd:pct>=75?C.ac:pct>=60?C.high:C.rbd;
  const caption=`I scored ${pct}% (${correct}/${total}) on ${title} in the ScrubLife trainer! 🔥 ${streak}-day streak\n\n${SHARE_TAGS}`;
  const grab=async()=>await shotRef.current.capture();
  const openSheet=async(uri)=>{
    if(await Sharing.isAvailableAsync())await Sharing.shareAsync(uri,{mimeType:'image/png',dialogTitle:'Share your result',UTI:'public.png'});
    else await Share.share({message:caption});
  };
  const doShare=async()=>{
    try{setBusy(true);const uri=await grab();await openSheet(uri);}
    catch(e){Alert.alert('Share unavailable','Could not create the image. Please try again.');}
    finally{setBusy(false);}
  };
  const doStory=async(social)=>{
    try{setBusy(true);const uri=await grab();
      await RNShare.shareSingle({social,appId:FB_APP_ID,backgroundImage:uri,backgroundTopColor:C.sfr,backgroundBottomColor:C.bg});
    }catch(e){ // app not installed / no FB app id → fall back to the share sheet
      try{const uri=await grab();await openSheet(uri);}catch(_){}
    }finally{setBusy(false);}
  };
  return(<View style={{width:'100%',marginBottom:14}}>
    <ViewShot ref={shotRef} options={{format:'png',quality:1,result:'tmpfile'}} style={{borderRadius:16,overflow:'hidden',marginBottom:12}}>
      <View style={{backgroundColor:C.sfr,borderWidth:1,borderColor:C.bd,borderRadius:16,padding:20,alignItems:'center'}}>
        <Text style={{color:C.ac,fontSize:12,fontWeight:'900',letterSpacing:3}}>SCRUB LIFE</Text>
        <Text style={{color:C.t3,fontSize:9,fontWeight:'700',letterSpacing:1,textTransform:'uppercase',marginBottom:14}}>LPT · NCLEX Trainer</Text>
        <View style={{width:120,height:120,borderRadius:60,borderWidth:6,borderColor:ringCol,backgroundColor:C.bg,alignItems:'center',justifyContent:'center'}}>
          <Text style={{color:ringCol,fontSize:40,fontWeight:'900'}}>{pct}%</Text>
          <Text style={{color:C.t2,fontSize:11,fontWeight:'700'}}>{correct}/{total}</Text>
        </View>
        <Text style={{color:C.t1,fontSize:16,fontWeight:'800',marginTop:14,textAlign:'center'}} numberOfLines={2}>{title}</Text>
        {!!subtitle&&<Text style={{color:C.ac,fontSize:12,fontWeight:'600',marginTop:2,textAlign:'center'}}>{subtitle}</Text>}
        {streak>0&&<Text style={{color:C.amber,fontSize:13,fontWeight:'800',marginTop:10}}>🔥 {streak}-day streak</Text>}
        <Text style={{color:C.t3,fontSize:9,fontWeight:'700',letterSpacing:1,textTransform:'uppercase',marginTop:14}}>Study with me · scrublife</Text>
      </View>
    </ViewShot>
    <Pressable onPress={doShare} disabled={busy} style={{backgroundColor:C.ac,borderRadius:10,paddingVertical:13,alignItems:'center',justifyContent:'center',minHeight:48,marginBottom:8,opacity:busy?0.6:1}}>
      {busy?<ActivityIndicator color={C.bg}/>:<Text style={{color:C.bg,fontSize:13,fontWeight:'800',letterSpacing:0.5,textTransform:'uppercase'}}>📤 Share My Result</Text>}
    </Pressable>
    <View style={{flexDirection:'row',gap:8}}>
      <Pressable onPress={()=>doStory(RNShare.Social.INSTAGRAM_STORIES)} disabled={busy} style={{flex:1,backgroundColor:C.sf,borderWidth:1,borderColor:C.bd,borderRadius:10,paddingVertical:12,alignItems:'center',justifyContent:'center',minHeight:44}}>
        <Text style={{color:C.t1,fontSize:12,fontWeight:'700'}}>📸 IG Story</Text>
      </Pressable>
      <Pressable onPress={()=>doStory(RNShare.Social.FACEBOOK_STORIES)} disabled={busy} style={{flex:1,backgroundColor:C.sf,borderWidth:1,borderColor:C.bd,borderRadius:10,paddingVertical:12,alignItems:'center',justifyContent:'center',minHeight:44}}>
        <Text style={{color:C.t1,fontSize:12,fontWeight:'700'}}>📘 FB Story</Text>
      </Pressable>
    </View>
  </View>);
}

function ExamResultsScreen({exam,perf,onHome,onRemed}){
  const pct=exam.pct||0;
  const prob=exam.passProbability||50;
  const probCol=prob>=80?C.gbd:prob>=60?C.ac:prob>=40?C.amber:C.crit;
  return(<ScrollView style={{flex:1,backgroundColor:C.bg}} contentContainerStyle={{padding:16,paddingTop:56,paddingBottom:80,alignItems:'center'}}><StatusBar barStyle="light-content"/>
    <Text style={{fontSize:44,marginBottom:8}}>{prob>=60?'🎉':'📚'}</Text>
    <Text style={{color:C.t1,fontSize:28,fontWeight:'900'}}>Exam Complete</Text>

    <PassGauge probability={prob}/>

    <View style={{flexDirection:'row',gap:16,marginBottom:20}}>
      <View style={{flex:1,backgroundColor:C.sf,borderRadius:12,padding:16,alignItems:'center',borderWidth:1,borderColor:C.bd}}>
        <Text style={{color:C.ac,fontSize:28,fontWeight:'900'}}>{exam.correct}</Text>
        <Text style={{color:C.t3,fontSize:10,fontWeight:'600',textTransform:'uppercase'}}>Correct</Text>
      </View>
      <View style={{flex:1,backgroundColor:C.sf,borderRadius:12,padding:16,alignItems:'center',borderWidth:1,borderColor:C.bd}}>
        <Text style={{color:C.t1,fontSize:28,fontWeight:'900'}}>{exam.total}</Text>
        <Text style={{color:C.t3,fontSize:10,fontWeight:'600',textTransform:'uppercase'}}>Total</Text>
      </View>
      <View style={{flex:1,backgroundColor:C.sf,borderRadius:12,padding:16,alignItems:'center',borderWidth:1,borderColor:C.bd}}>
        <Text style={{color:pct>=70?C.gbd:pct>=50?C.amber:C.rbd,fontSize:28,fontWeight:'900'}}>{pct}%</Text>
        <Text style={{color:C.t3,fontSize:10,fontWeight:'600',textTransform:'uppercase'}}>Score</Text>
      </View>
    </View>

    <ResultShareRow title="Practice Exam" pct={pct} correct={exam.correct} total={exam.total} subtitle={`Pass likelihood: ${prob}%`}/>

    {exam.byCategory&&<View style={{backgroundColor:C.sf,borderWidth:1,borderColor:C.bd,borderRadius:14,padding:16,width:'100%',marginBottom:16}}>
      <Text style={{color:C.ac,fontSize:10,fontWeight:'700',letterSpacing:1.5,textTransform:'uppercase',marginBottom:12}}>Performance by Category</Text>
      {Object.entries(exam.byCategory).map(([cat,data])=>{
        const catPct=data.total>0?Math.round((data.correct/data.total)*100):0;
        return(<View key={cat} style={{marginBottom:10}}>
          <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:4}}>
            <Text style={{color:C.t1,fontSize:12,fontWeight:'600',flex:1}}>{cat}</Text>
            <Text style={{color:catPct>=70?C.gbd:catPct>=50?C.amber:C.rbd,fontSize:12,fontWeight:'700'}}>{catPct}%</Text>
          </View>
          <View style={{height:8,backgroundColor:C.bd,borderRadius:4,overflow:'hidden'}}>
            <View style={{height:8,borderRadius:4,backgroundColor:catPct>=70?C.gbd:catPct>=50?C.amber:C.rbd,width:`${catPct}%`}}/>
          </View>
        </View>);
      })}
    </View>}

    {exam.byStep&&<View style={{backgroundColor:C.sf,borderWidth:1,borderColor:C.bd,borderRadius:14,padding:16,width:'100%',marginBottom:16}}>
      <Text style={{color:C.ac,fontSize:10,fontWeight:'700',letterSpacing:1.5,textTransform:'uppercase',marginBottom:12}}>NCJMM Step Accuracy</Text>
      {Object.entries(exam.byStep).map(([step,data])=>{
        const stepPct=data.total>0?Math.round((data.correct/data.total)*100):0;
        return(<View key={step} style={{marginBottom:10}}>
          <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:4}}>
            <Text style={{color:C.t1,fontSize:12,fontWeight:'500'}}>{step}</Text>
            <Text style={{color:stepPct>=70?C.gbd:stepPct>=50?C.amber:C.rbd,fontSize:12,fontWeight:'700'}}>{stepPct}%</Text>
          </View>
          <View style={{height:8,backgroundColor:C.bd,borderRadius:4,overflow:'hidden'}}>
            <View style={{height:8,borderRadius:4,backgroundColor:stepPct>=70?C.gbd:stepPct>=50?C.amber:C.rbd,width:`${stepPct}%`}}/>
          </View>
        </View>);
      })}
    </View>}

    <Pressable onPress={onRemed} style={{backgroundColor:C.purpleDim,borderWidth:1.5,borderColor:C.purple,borderRadius:10,paddingVertical:14,width:'100%',alignItems:'center',minHeight:44,marginBottom:10}}>
      <Text style={{color:C.purple,fontSize:14,fontWeight:'800'}}>🧠 Get AI Remediation Plan</Text>
    </Pressable>
    <Pressable onPress={onHome} style={{backgroundColor:C.sf,borderWidth:1,borderColor:C.bd,borderRadius:10,paddingVertical:14,width:'100%',alignItems:'center',minHeight:44}}>
      <Text style={{color:C.ac,fontSize:14,fontWeight:'800'}}>← Dashboard</Text>
    </Pressable>
  </ScrollView>);
}

// ═══════════════════════════════════════════════════════════
// REMEDIATION SCREEN
// ═══════════════════════════════════════════════════════════
function RemediationScreen({perf,onBack}){
  const[plan,setPlan]=useState(null);
  const[loading,setLoading]=useState(false);

  const generatePlan=async()=>{
    if(!perf||!perf.weakTopics||perf.weakTopics.length===0){Alert.alert('Need More Data','Complete at least 3 cases to generate a remediation plan.');return;}
    setLoading(true);
    const result=await generateRemediation(perf.weakTopics,perf.weakSteps||[],perf.overallPct);
    setPlan(result);
    setLoading(false);
  };

  return(<ScrollView style={{flex:1,backgroundColor:C.bg}} contentContainerStyle={{padding:16,paddingTop:56,paddingBottom:80}}><StatusBar barStyle="light-content"/>
    <View style={{flexDirection:'row',alignItems:'center',gap:10,marginBottom:20}}>
      <Pressable onPress={onBack} style={{minWidth:44,minHeight:44,justifyContent:'center'}}><Text style={{color:C.ac,fontSize:14,fontWeight:'700'}}>← Back</Text></Pressable>
      <Text style={{color:C.t1,fontSize:20,fontWeight:'800',flex:1}}>AI Remediation</Text>
    </View>

    <View style={{backgroundColor:C.sf,borderWidth:1.5,borderColor:C.amber,borderRadius:14,padding:20,marginBottom:16}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:14}}>
        <Text style={{fontSize:22}}>⚠️</Text>
        <Text style={{color:C.t1,fontSize:18,fontWeight:'800'}}>Weakness Detection</Text>
      </View>

      {perf?.weakTopics&&perf.weakTopics.length>0?<>
        <Text style={{color:C.amber,fontSize:10,fontWeight:'700',letterSpacing:1.5,textTransform:'uppercase',marginBottom:10}}>Weakest Clinical Topics</Text>
        {perf.weakTopics.map((t,i)=>(
          <View key={t.name} style={{marginBottom:12}}>
            <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:4}}>
              <Text style={{color:C.t1,fontSize:13,fontWeight:'600'}}>{i+1}. {t.name}</Text>
              <Text style={{color:t.pct<50?C.rbd:C.amber,fontSize:13,fontWeight:'800'}}>{t.pct}%</Text>
            </View>
            <View style={{height:8,backgroundColor:C.bd,borderRadius:4,overflow:'hidden'}}>
              <View style={{height:8,borderRadius:4,backgroundColor:t.pct<50?C.rbd:C.amber,width:`${t.pct}%`}}/>
            </View>
          </View>
        ))}

        {perf.weakSteps&&perf.weakSteps.length>0&&<>
          <Text style={{color:C.purple,fontSize:10,fontWeight:'700',letterSpacing:1.5,textTransform:'uppercase',marginTop:16,marginBottom:10}}>Weakest NCJMM Steps</Text>
          {perf.weakSteps.map((st,i)=>(
            <View key={st.name} style={{marginBottom:12}}>
              <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:4}}>
                <Text style={{color:C.t1,fontSize:13,fontWeight:'600'}}>{i+1}. {st.name}</Text>
                <Text style={{color:st.pct<50?C.rbd:C.purple,fontSize:13,fontWeight:'800'}}>{st.pct}%</Text>
              </View>
              <View style={{height:8,backgroundColor:C.bd,borderRadius:4,overflow:'hidden'}}>
                <View style={{height:8,borderRadius:4,backgroundColor:st.pct<50?C.rbd:C.purple,width:`${st.pct}%`}}/>
              </View>
            </View>
          ))}
        </>}
      </>:<View style={{alignItems:'center',padding:20}}>
        <Text style={{color:C.t2,fontSize:14,textAlign:'center'}}>Complete at least 3 cases to detect your weaknesses.</Text>
      </View>}
    </View>

    <View style={{backgroundColor:C.sf,borderWidth:1.5,borderColor:C.gbd,borderRadius:14,padding:20,marginBottom:16}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:14}}>
        <Text style={{fontSize:22}}>🧠</Text>
        <View style={{flex:1}}>
          <Text style={{color:C.t1,fontSize:18,fontWeight:'800'}}>7-Day Study Plan</Text>
          <Text style={{color:C.gbd,fontSize:11,fontWeight:'600'}}>AI-generated based on your weaknesses</Text>
        </View>
      </View>

      {!plan&&!loading&&<Pressable onPress={generatePlan} style={{backgroundColor:'rgba(52,211,153,0.1)',borderWidth:1.5,borderColor:C.gbd,borderRadius:10,paddingVertical:14,alignItems:'center',minHeight:48}}>
        <Text style={{color:C.gbd,fontSize:14,fontWeight:'800'}}>🎯 Generate My Remediation Plan</Text>
      </Pressable>}

      {loading&&<View style={{alignItems:'center',padding:20}}>
        <ActivityIndicator color={C.gbd}/>
        <Text style={{color:C.gbd,fontSize:12,marginTop:8}}>Analyzing your weaknesses...</Text>
      </View>}

      {plan&&<View style={{backgroundColor:C.sfr,borderRadius:10,padding:14,borderLeftWidth:3,borderLeftColor:C.gbd}}>
        <Text style={{color:C.t1,fontSize:13,lineHeight:21}}>{plan}</Text>
      </View>}
    </View>

    <View style={{backgroundColor:C.sf,borderWidth:1,borderColor:C.bd,borderRadius:14,padding:16}}>
      <Text style={{color:C.ac,fontSize:10,fontWeight:'700',letterSpacing:1.5,textTransform:'uppercase',marginBottom:10}}>Study Tips</Text>
      {['Focus on your weakest NCJMM step first — it appears across ALL cases','Redo cases you scored below 70% — repetition builds pattern recognition','Use Exam Simulation mode to practice under time pressure','Review rationales for EVERY wrong answer, not just the score'].map((tip,i)=>
        <View key={i} style={{flexDirection:'row',gap:8,marginBottom:8,alignItems:'flex-start'}}>
          <Text style={{color:C.ac,fontSize:12}}>💡</Text>
          <Text style={{color:C.t2,fontSize:12,lineHeight:18,flex:1}}>{tip}</Text>
        </View>
      )}
    </View>
  </ScrollView>);
}

// ═══════════════════════════════════════════════════════════
// PERFORMANCE DASHBOARD SCREEN
// ═══════════════════════════════════════════════════════════
function DashboardScreen({perf,streak,history,exams,onBack}){
  const readCol={Low:C.rbd,Borderline:C.high,High:C.ac,'Very High':C.gbd};
  const STEP_NAMES=['Recognize Cues','Analyze Cues','Prioritize Hypotheses','Generate Solutions','Take Action','Evaluate Outcomes'];
  return(<ScrollView style={{flex:1,backgroundColor:C.bg}} contentContainerStyle={{padding:16,paddingTop:56,paddingBottom:60}}><StatusBar barStyle="light-content"/>
    <View style={{flexDirection:'row',alignItems:'center',gap:10,marginBottom:20}}>
      <Pressable onPress={onBack} style={{minWidth:44,minHeight:44,justifyContent:'center'}}><Text style={{color:C.ac,fontSize:14,fontWeight:'700'}}>← Back</Text></Pressable>
      <Text style={{color:C.t1,fontSize:20,fontWeight:'800',flex:1}}>Performance Dashboard</Text>
    </View>

    <View style={{backgroundColor:C.sf,borderWidth:2,borderColor:perf?readCol[perf.readiness]||C.bd:C.bd,borderRadius:14,padding:20,marginBottom:16,alignItems:'center'}}>
      <Text style={{color:C.t3,fontSize:10,fontWeight:'600',letterSpacing:1.5,textTransform:'uppercase',marginBottom:8}}>NCLEX Readiness Prediction</Text>
      <Text style={{color:perf?readCol[perf.readiness]:C.t2,fontSize:32,fontWeight:'900',marginBottom:4}}>{perf?.readiness||'Not enough data'}</Text>
      <Text style={{color:C.t2,fontSize:13}}>{perf?.overallPct||0}% overall • {perf?.totalAttempts||0} attempts</Text>
    </View>

    <View style={{flexDirection:'row',backgroundColor:C.sf,borderWidth:1,borderColor:C.bd,borderRadius:14,padding:16,marginBottom:16,gap:16}}>
      <View style={{flex:1,alignItems:'center'}}><Text style={{fontSize:28}}>🔥</Text><Text style={{color:C.amber,fontSize:24,fontWeight:'800'}}>{streak.current}</Text><Text style={{color:C.t3,fontSize:10,fontWeight:'600',textTransform:'uppercase'}}>Current Streak</Text></View>
      <View style={{width:1,backgroundColor:C.bd}}/>
      <View style={{flex:1,alignItems:'center'}}><Text style={{fontSize:28}}>🏆</Text><Text style={{color:C.gold,fontSize:24,fontWeight:'800'}}>{streak.best}</Text><Text style={{color:C.t3,fontSize:10,fontWeight:'600',textTransform:'uppercase'}}>Best Streak</Text></View>
    </View>

    <View style={{backgroundColor:C.sf,borderWidth:1,borderColor:C.bd,borderRadius:14,padding:16,marginBottom:16}}>
      <Text style={{color:C.ac,fontSize:10,fontWeight:'700',letterSpacing:1.5,textTransform:'uppercase',marginBottom:12}}>NCJMM Step Accuracy</Text>
      {perf?.byStep?STEP_NAMES.map((name,i)=>{
        const data=perf.byStep[name];
        if(!data)return null;
        const pct=data.total>0?Math.round((data.correct/data.total)*100):0;
        const isWeak=name===perf.weakest;
        return(<View key={name} style={{marginBottom:10}}>
          <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:4}}>
            <Text style={{color:isWeak?C.amber:C.t1,fontSize:12,fontWeight:isWeak?'700':'500'}}>{isWeak?'⚠ ':''}{i+1}. {name}</Text>
            <Text style={{color:isWeak?C.amber:C.ac,fontSize:12,fontWeight:'700'}}>{pct}%</Text>
          </View>
          <View style={{height:8,backgroundColor:C.bd,borderRadius:4,overflow:'hidden'}}>
            <View style={{height:8,borderRadius:4,backgroundColor:pct>=70?C.gbd:pct>=50?C.amber:C.rbd,width:`${pct}%`}}/>
          </View>
        </View>);
      }):<Text style={{color:C.t3,fontSize:13}}>Complete a case to see breakdown.</Text>}
    </View>

    <View style={{backgroundColor:C.sf,borderWidth:1,borderColor:C.bd,borderRadius:14,padding:16,marginBottom:16}}>
      <Text style={{color:C.ac,fontSize:10,fontWeight:'700',letterSpacing:1.5,textTransform:'uppercase',marginBottom:12}}>Accuracy by Topic</Text>
      {perf?.byTopic?Object.entries(perf.byTopic).map(([topic,data])=>{
        const pct=data.total>0?Math.round((data.correct/data.total)*100):0;
        return(<View key={topic} style={{flexDirection:'row',alignItems:'center',paddingVertical:8,borderBottomWidth:1,borderBottomColor:C.bd,gap:10}}>
          <View style={{flex:1}}><Text style={{color:C.t1,fontSize:13,fontWeight:'600'}}>{topic}</Text></View>
          <Text style={{color:pct>=70?C.gbd:pct>=50?C.amber:C.rbd,fontSize:14,fontWeight:'800',minWidth:40,textAlign:'right'}}>{pct}%</Text>
        </View>);
      }):<Text style={{color:C.t3,fontSize:13}}>No data yet.</Text>}
    </View>

    {exams&&exams.length>0&&<View style={{backgroundColor:C.sf,borderWidth:1,borderColor:C.bd,borderRadius:14,padding:16,marginBottom:16}}>
      <Text style={{color:C.purple,fontSize:10,fontWeight:'700',letterSpacing:1.5,textTransform:'uppercase',marginBottom:12}}>Practice Exam History</Text>
      {exams.slice(-10).reverse().map((ex,i)=>(
        <View key={i} style={{flexDirection:'row',alignItems:'center',paddingVertical:8,borderBottomWidth:1,borderBottomColor:C.bd,gap:10}}>
          <Text style={{color:C.t1,fontSize:13,flex:1,fontWeight:'600'}}>Exam #{exams.length-i}</Text>
          <Text style={{color:ex.pct>=70?C.gbd:ex.pct>=50?C.amber:C.rbd,fontSize:13,fontWeight:'700'}}>{ex.pct}%</Text>
          <Text style={{color:ex.passProbability>=60?C.gbd:C.rbd,fontSize:10,fontWeight:'700'}}>{ex.passProbability}% pass</Text>
          <Text style={{color:C.t3,fontSize:10}}>{new Date(ex.date).toLocaleDateString()}</Text>
        </View>
      ))}
    </View>}

    <View style={{backgroundColor:C.sf,borderWidth:1,borderColor:C.bd,borderRadius:14,padding:16}}>
      <Text style={{color:C.ac,fontSize:10,fontWeight:'700',letterSpacing:1.5,textTransform:'uppercase',marginBottom:12}}>Recent Attempts</Text>
      {history.length>0?history.slice(-10).reverse().map((h,i)=>(
        <View key={i} style={{flexDirection:'row',alignItems:'center',paddingVertical:8,borderBottomWidth:1,borderBottomColor:C.bd,gap:10}}>
          <Text style={{color:C.t1,fontSize:13,flex:1,fontWeight:'600'}}>{h.caseTitle}</Text>
          <Text style={{color:C.ac,fontSize:13,fontWeight:'700'}}>{Math.round(h.correct/h.total*100)}%</Text>
          <Text style={{color:C.t3,fontSize:10}}>{new Date(h.date).toLocaleDateString()}</Text>
        </View>
      )):<Text style={{color:C.t3,fontSize:13}}>Complete a case to see history.</Text>}
    </View>
  </ScrollView>);
}

// ═══════════════════════════════════════════════════════════
// CASE STUDY SCREEN
// ═══════════════════════════════════════════════════════════
function CaseScreen({caseData,onFinish,onBack,anxMode}){
  const scrollRef=useRef(null);
  const[cur,setCur]=useState(0);const[ehrTab,setEhrTab]=useState('note');
  const[sels,setSels]=useState({});const[ranks,setRanks]=useState({});const[clss,setClss]=useState({});
  const[done,setDone]=useState({});const[scores,setScores]=useState({});const[rankTouched,setRankTouched]=useState({});
  const[struckOut,setStruckOut]=useState({});const[wrongLog,setWrongLog]=useState([]);const[timedOut,setTimedOut]=useState(false);
  const step=caseData.steps[cur];

  useEffect(()=>{const r={};caseData.steps.forEach(st=>{if(st.type==='rank'){
    const ids=st.opts.map(o=>o.id);
    // Present ranking options shuffled so the correct order is never pre-arranged
    // (otherwise an untouched rank step could score 100% with no interaction).
    let order=ids;
    if(ids.length>1){const correct=st.opts.slice().sort((a,b)=>a.cr-b.cr).map(o=>o.id).join(',');do{order=shuffle(ids);}while(order.join(',')===correct);}
    r[st.id]=order;
  }});setRanks(r);setRankTouched({});},[caseData]);

  const toggle=(sid,oid)=>setSels(p=>{const c=p[sid]||[];return{...p,[sid]:c.includes(oid)?c.filter(x=>x!==oid):[...c,oid]};});
  const moveRank=(sid,i,d)=>{const t=i+d;const a=ranks[sid]||[];if(t<0||t>=a.length)return;setRankTouched(p=>({...p,[sid]:true}));setRanks(p=>{const ar=[...(p[sid]||[])];[ar[i],ar[t]]=[ar[t],ar[i]];return{...p,[sid]:ar};});};
  // An option must actually be answered before it can be submitted (and scored):
  //  multi → at least one selected · classify → every option categorized · rank → reordered at least once.
  const canSubmit=sid=>{const st=caseData.steps.find(x=>x.id===sid);if(!st)return false;
    if(st.type==='multi')return (sels[sid]||[]).length>0;
    if(st.type==='classify'){const cl=clss[sid]||{};return st.opts.every(o=>!!cl[o.id]);}
    if(st.type==='rank')return st.opts.length<=1||!!rankTouched[sid];
    return true;};
  const toggleClass=(sid,oid,cats)=>setClss(p=>{const c=(p[sid]||{})[oid];const ci=c?cats.indexOf(c):-1;const ni=(ci+1)%(cats.length+1);return{...p,[sid]:{...(p[sid]||{}),[oid]:ni<cats.length?cats[ni]:null}};});
  const toggleStrike=(sid,oid)=>setStruckOut(p=>({...p,[`${sid}-${oid}`]:!p[`${sid}-${oid}`]}));
  const isStruck=(sid,oid)=>!!struckOut[`${sid}-${oid}`];

  const submit=sid=>{
    const st=caseData.steps.find(x=>x.id===sid);let correct=0,total=0;const newW=[];
    if(st.type==='multi'){const sel=sels[sid]||[];const cids=st.opts.filter(o=>o.c===true).map(o=>o.id);total=cids.length;correct=Math.max(0,cids.filter(id=>sel.includes(id)).length-sel.filter(id=>!cids.includes(id)).length);
      sel.filter(id=>!cids.includes(id)).forEach(id=>{const o=st.opts.find(x=>x.id===id);newW.push({stepId:st.id,stepTitle:st.title,stepType:st.type,chosen:o.text,correct:'Should not be selected',optionText:o.text});});
      cids.filter(id=>!sel.includes(id)).forEach(id=>{const o=st.opts.find(x=>x.id===id);newW.push({stepId:st.id,stepTitle:st.title,stepType:st.type,chosen:'Not selected',correct:'Should be selected',optionText:o.text});});
    }else if(st.type==='rank'){const rk=ranks[sid]||[];total=st.opts.length;correct=rk.filter((id,i)=>{const o=st.opts.find(x=>x.id===id);return o.cr===i+1;}).length;
      rk.forEach((id,i)=>{const o=st.opts.find(x=>x.id===id);if(o.cr!==i+1)newW.push({stepId:st.id,stepTitle:st.title,stepType:st.type,chosen:`#${i+1}`,correct:`Should be #${o.cr}`,optionText:o.text});});
    }else if(st.type==='classify'){const cl=clss[sid]||{};total=st.opts.length;correct=st.opts.filter(o=>cl[o.id]===o.c).length;
      st.opts.filter(o=>cl[o.id]!==o.c).forEach(o=>{newW.push({stepId:st.id,stepTitle:st.title,stepType:st.type,chosen:cl[o.id]||'Not answered',correct:o.c,optionText:o.text});});
    }
    setScores(p=>({...p,[sid]:{correct,total}}));setDone(p=>({...p,[sid]:true}));
    if(newW.length>0)setWrongLog(p=>[...p,...newW]);
  };

  const next=()=>{if(cur<caseData.steps.length-1){setCur(cur+1);scrollRef.current?.scrollTo({y:0,animated:true});}};
  const finish=()=>{
    const stepScores=caseData.steps.map(st=>scores[st.id]||{correct:0,total:0});
    const tc=Object.values(scores).reduce((a,v)=>a+v.correct,0);
    const tp=Object.values(scores).reduce((a,v)=>a+v.total,0);
    onFinish(tc,tp,wrongLog,stepScores);
  };
  const handleBack=()=>{if(Object.keys(done).length>0)Alert.alert('Leave?','Progress will not be saved.',[{text:'Stay',style:'cancel'},{text:'Leave',style:'destructive',onPress:onBack}]);else onBack();};

  return(<ScrollView ref={scrollRef} style={{flex:1,backgroundColor:C.bg}} contentContainerStyle={{paddingBottom:80}} showsVerticalScrollIndicator={false}><StatusBar barStyle="light-content"/>
    <View style={{flexDirection:'row',alignItems:'center',paddingHorizontal:14,paddingTop:SAFE_TOP,paddingBottom:10,borderBottomWidth:1,borderBottomColor:C.bd,backgroundColor:C.bg,gap:10}}>
      <Pressable onPress={handleBack} accessibilityRole="button" accessibilityLabel="Back" accessibilityHint="Leaves this case and returns to the list" style={{minWidth:44,minHeight:44,justifyContent:'center'}}><Text style={{color:C.ac,fontSize:14,fontWeight:'700'}}>← Back</Text></Pressable>
      <Text style={{color:C.t1,fontSize:15,fontWeight:'700',flex:1}} numberOfLines={1}>{caseData.title}</Text>
      <Text style={{color:C.t2,fontSize:12,fontWeight:'600'}}>{cur+1}/6</Text>
    </View>
    <View style={{paddingHorizontal:14}}>
      {anxMode&&!timedOut&&<ExamTimer totalSeconds={720} onTimeUp={()=>{setTimedOut(true);Alert.alert('⏱ Time!','Submitting progress.',[{text:'Results',onPress:()=>{caseData.steps.forEach(st=>{if(!done[st.id])submit(st.id);});setTimeout(finish,100);}}]);}}/>}
      <View style={{flexDirection:'row',alignItems:'center',backgroundColor:C.sf,borderWidth:1,borderColor:C.bd,borderRadius:12,padding:10,marginTop:10,marginBottom:10,gap:8}}>
        <View style={{width:34,height:34,borderRadius:17,backgroundColor:C.acd,alignItems:'center',justifyContent:'center'}}><Text style={{color:C.ac,fontSize:11,fontWeight:'800'}}>{caseData.patient.name.split(' ').map(w=>w[0]).join('')}</Text></View>
        <View style={{flex:1}}><Text style={{color:C.t1,fontSize:13,fontWeight:'700'}}>{caseData.patient.name}</Text><Text style={{color:C.t2,fontSize:10}}>{caseData.patient.age} y/o {caseData.patient.sex} • {caseData.patient.room}</Text></View>
      </View>
      <View style={{flexDirection:'row',gap:2}}>
        {[['note','Note'],['vitals','Vitals'],['labs','Labs']].map(([k,l])=><Pressable key={k} onPress={()=>setEhrTab(k)} style={{flex:1,paddingVertical:8,backgroundColor:ehrTab===k?'#2563eb':C.sf,borderTopLeftRadius:8,borderTopRightRadius:8,alignItems:'center',minHeight:38,justifyContent:'center'}}><Text style={{color:ehrTab===k?'#fff':C.t2,fontSize:10,fontWeight:ehrTab===k?'700':'500',textTransform:'uppercase'}}>{l}</Text></Pressable>)}
      </View>
      <View style={{backgroundColor:C.sf,borderWidth:1,borderColor:C.bd,borderBottomLeftRadius:12,borderBottomRightRadius:12,marginBottom:10,padding:12,overflow:'hidden'}}>
        {ehrTab==='note'&&<Text style={{color:C.t1,fontSize:12,lineHeight:19}}>{caseData.nursesNote}</Text>}
        {ehrTab==='vitals'&&caseData.vitals.map((v,i)=><View key={i} style={{flexDirection:'row',gap:8,paddingVertical:4,borderBottomWidth:1,borderBottomColor:C.bd}}><Text style={{color:C.t1,fontSize:11,fontWeight:'600',minWidth:40}}>{v.time}</Text><Text style={{color:parseInt(v.hr)<60||parseInt(v.hr)>110?C.crit:C.t1,fontSize:11,flex:1}}>{v.hr}</Text><Text style={{color:C.t1,fontSize:11,flex:1}}>{v.bp}</Text><Text style={{color:C.t1,fontSize:11,flex:1}}>{v.spo2}</Text></View>)}
        {ehrTab==='labs'&&caseData.labs.map((l,i)=>{
          const longLab=String(l.v).length>48||String(l.n).length>34;
          return longLab?(
            <View key={i} style={{paddingVertical:6,borderBottomWidth:1,borderBottomColor:C.bd}}>
              <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:6,marginBottom:3}}>
                <Text style={{color:C.t1,fontSize:11,fontWeight:'700',flex:1}}>{l.n}</Text>
                <Text style={{color:FC[l.f],fontSize:8,fontWeight:'700'}}>{FL[l.f]}</Text>
              </View>
              <Text style={{color:FC[l.f],fontSize:11,fontWeight:l.f!=='normal'?'700':'400',lineHeight:17}}>{l.v}</Text>
            </View>
          ):(
            <View key={i} style={{flexDirection:'row',alignItems:'center',paddingVertical:4,borderBottomWidth:1,borderBottomColor:C.bd,gap:6}}>
              <Text style={{color:C.t1,fontSize:11,fontWeight:'600',flex:2}}>{l.n}</Text>
              <Text style={{color:FC[l.f],fontSize:11,fontWeight:l.f!=='normal'?'800':'400',flex:1,textAlign:'right'}}>{l.v}</Text>
              <Text style={{color:FC[l.f],fontSize:8,fontWeight:'700',minWidth:60,textAlign:'center'}}>{FL[l.f]}</Text>
            </View>
          );
        })}
      </View>
      {/* Progress indicator — slim connected segments (a progress bar, not buttons).
          Completed steps fill green, the current step is highlighted, upcoming are muted.
          Tapping a segment still jumps back to an already-visited step. */}
      <View style={{marginBottom:10}}>
        <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:5}}>
          <Text style={{color:C.t2,fontSize:9,fontWeight:'700',letterSpacing:1,textTransform:'uppercase'}}>Progress</Text>
          <Text style={{color:C.t3,fontSize:9,fontWeight:'700'}}>Step {cur+1} of {caseData.steps.length}</Text>
        </View>
        <View style={{flexDirection:'row',gap:4}}>
          {caseData.steps.map((st,i)=>{const isCur=i===cur;const isDone=!!done[st.id];const canJump=i<=cur;
            return(<Pressable key={st.id} onPress={()=>{if(canJump)setCur(i);}} disabled={!canJump} style={{flex:1,paddingVertical:4}}>
              <View style={{height:5,borderRadius:3,backgroundColor:isCur?C.ac:isDone?C.gbd:C.bd}}/>
            </Pressable>);})}
        </View>
      </View>
      <View style={{backgroundColor:C.sf,borderWidth:1,borderColor:C.bd,borderRadius:14,padding:14}}>
        <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:4}}><Text style={{fontSize:22}}>{step.icon}</Text><View><Text style={{color:C.ac,fontSize:9,fontWeight:'700',letterSpacing:1,textTransform:'uppercase'}}>STEP {step.id} OF 6</Text><Text style={{color:C.t1,fontSize:18,fontWeight:'800'}}>{step.title}</Text></View></View>
        <Text style={{color:C.t2,fontSize:12,fontStyle:'italic',marginBottom:10}}>{step.sub}</Text>
        <View style={{backgroundColor:C.sfr,borderRadius:8,padding:12,borderLeftWidth:4,borderLeftColor:C.ac,marginBottom:14}}><Text style={{color:C.t1,fontSize:13,lineHeight:19}}>{step.inst}</Text></View>

        {step.type==='multi'&&step.opts.map(opt=>{
          const sel=(sels[step.id]||[]).includes(opt.id);const isDone=!!done[step.id];const isC=opt.c===true;
          const showG=isDone&&isC;const showR=isDone&&sel&&!isC;
          let bg=C.sf,bd=C.bd;if(!isDone&&sel){bg=C.acd;bd=C.ac;}if(showG){bg=C.gbg;bd=C.gbd;}if(showR){bg=C.rbg;bd=C.rbd;}
          const struck=isStruck(step.id,opt.id);
          return(<View key={opt.id} style={{marginBottom:5}}>
            <Pressable onPress={()=>!isDone&&toggle(step.id,opt.id)} onLongPress={()=>anxMode&&!isDone&&toggleStrike(step.id,opt.id)} disabled={isDone}
              style={{flexDirection:'row',alignItems:'flex-start',padding:10,borderRadius:10,borderWidth:2,minHeight:44,gap:6,backgroundColor:bg,borderColor:bd,opacity:isDone&&!sel&&!showG?0.4:struck?0.35:1}}>
              <Text style={{color:C.ac,fontSize:13,fontWeight:'800'}}>{opt.id.toUpperCase()}.</Text>
              <Text style={{color:C.t1,fontSize:13,lineHeight:18,flex:1,...(struck?{textDecorationLine:'line-through',color:C.t3}:{})}}>{opt.text}</Text>
            </Pressable>
            {isDone&&(sel||isC)&&<View style={{marginLeft:12,paddingLeft:8,paddingVertical:4,borderLeftWidth:3,borderLeftColor:isC?C.gbd:C.rbd,marginTop:2}}>
              <Text style={{color:isC?C.gbd:C.rbd,fontSize:11,fontWeight:'700'}}>{isC?'✓ Correct':'✗ Incorrect'}</Text>
              <Text style={{color:C.t2,fontSize:11,lineHeight:16}}>{opt.rat}</Text>
            </View>}
          </View>);
        })}

        {step.type==='rank'&&<View>
          <Text style={{color:C.t2,fontSize:9,fontWeight:'600',letterSpacing:0.5,textTransform:'uppercase',marginBottom:6}}>Arrows to reorder • #1 = Highest</Text>
          {(ranks[step.id]||[]).map((oid,idx)=>{const opt=step.opts.find(o=>o.id===oid);const isDone=!!done[step.id];const isCP=isDone&&opt.cr===idx+1;
            return(<View key={oid} style={{marginBottom:5}}>
              <View style={{flexDirection:'row',alignItems:'center',padding:8,borderRadius:10,borderWidth:2,minHeight:44,gap:6,backgroundColor:isDone?(isCP?C.gbg:C.rbg):C.sf,borderColor:isDone?(isCP?C.gbd:C.rbd):C.bd}}>
                <Text style={{color:C.ac,fontSize:16,fontWeight:'800',minWidth:22,textAlign:'center'}}>{idx+1}</Text>
                <Text style={{color:C.t1,fontSize:12,lineHeight:17,flex:1}}>{opt.text}</Text>
                {!isDone&&<View><Pressable onPress={()=>moveRank(step.id,idx,-1)} style={{minWidth:32,minHeight:20,alignItems:'center'}}><Text style={{color:C.t2,fontSize:12}}>▲</Text></Pressable><Pressable onPress={()=>moveRank(step.id,idx,1)} style={{minWidth:32,minHeight:20,alignItems:'center'}}><Text style={{color:C.t2,fontSize:12}}>▼</Text></Pressable></View>}
                {isDone&&!isCP&&<Text style={{color:C.high,fontSize:9,fontWeight:'800'}}>→#{opt.cr}</Text>}
              </View>
              {isDone&&<View style={{marginLeft:12,paddingLeft:8,paddingVertical:4,borderLeftWidth:3,borderLeftColor:C.ac,marginTop:2}}><Text style={{color:C.ac,fontSize:11,fontWeight:'700'}}>#{opt.cr}</Text><Text style={{color:C.t2,fontSize:11,lineHeight:16}}>{opt.rat}</Text></View>}
            </View>);
          })}
        </View>}

        {step.type==='classify'&&<View>
          <Text style={{color:C.t2,fontSize:9,fontWeight:'600',letterSpacing:0.5,textTransform:'uppercase',marginBottom:6}}>Tap to toggle: {step.cats.join(' / ')}</Text>
          {step.opts.map(opt=>{const chosen=(clss[step.id]||{})[opt.id];const isDone=!!done[step.id];const isC=isDone&&chosen===opt.c;const isW=isDone&&chosen&&chosen!==opt.c;
            let bg=C.sf,bd=C.bd;if(!isDone&&chosen){bg=C.acd;bd=C.ac;}if(isC){bg=C.gbg;bd=C.gbd;}if(isW){bg=C.rbg;bd=C.rbd;}
            const struck=isStruck(step.id,opt.id);
            return(<View key={opt.id} style={{marginBottom:5}}>
              <Pressable onPress={()=>!isDone&&toggleClass(step.id,opt.id,step.cats)} onLongPress={()=>anxMode&&!isDone&&toggleStrike(step.id,opt.id)} disabled={isDone}
                style={{flexDirection:'row',alignItems:'center',padding:10,borderRadius:10,borderWidth:2,minHeight:44,gap:6,backgroundColor:bg,borderColor:bd,opacity:struck?0.35:1}}>
                <Text style={{color:C.ac,fontSize:13,fontWeight:'800'}}>{opt.id.toUpperCase()}.</Text>
                <Text style={{color:C.t1,fontSize:12,lineHeight:17,flex:1,...(struck?{textDecorationLine:'line-through',color:C.t3}:{})}}>{opt.text}</Text>
                {chosen&&<View style={{paddingHorizontal:8,paddingVertical:2,borderRadius:20,backgroundColor:chosen==='Indicated'?C.ibg:C.nbg}}><Text style={{color:chosen==='Indicated'?C.gbd:C.rbd,fontSize:9,fontWeight:'800'}}>{chosen}</Text></View>}
              </Pressable>
              {isDone&&<View style={{marginLeft:12,paddingLeft:8,paddingVertical:4,borderLeftWidth:3,borderLeftColor:isC?C.gbd:C.rbd,marginTop:2}}>
                {!isC&&<Text style={{color:C.rbd,fontSize:11,fontWeight:'700'}}>Correct: {opt.c}</Text>}
                <Text style={{color:C.t2,fontSize:11,lineHeight:16}}>{opt.rat}</Text>
              </View>}
            </View>);
          })}
        </View>}

        {done[step.id]&&scores[step.id]&&<View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:14,paddingTop:12,borderTopWidth:1,borderTopColor:C.bd}}>
          <View accessible={true} accessibilityLiveRegion="polite" accessibilityLabel={`You scored ${scores[step.id].correct} out of ${scores[step.id].total} correct on this step.`}><Text style={{color:C.ac,fontSize:20,fontWeight:'800'}}>{scores[step.id].correct}/{scores[step.id].total}</Text><Text style={{color:C.t2,fontSize:9,fontWeight:'600',textTransform:'uppercase'}}>correct</Text></View>
          <Pressable onPress={cur<caseData.steps.length-1?next:finish} accessibilityRole="button" accessibilityLabel={cur<caseData.steps.length-1?`Next step. Step ${cur+2} of ${caseData.steps.length}`:'See results'} style={{backgroundColor:C.ac,borderRadius:8,paddingHorizontal:18,paddingVertical:10,minHeight:44,justifyContent:'center'}}><Text style={{color:C.bg,fontSize:12,fontWeight:'800',letterSpacing:0.5,textTransform:'uppercase'}}>{cur<caseData.steps.length-1?'Next Step →':'See Results →'}</Text></Pressable>
        </View>}
        {!done[step.id]&&(()=>{const ok=canSubmit(step.id);return(
          <Pressable onPress={()=>{if(!ok){Alert.alert('Answer required',step.type==='rank'?'Arrange the items into your chosen order before submitting.':step.type==='classify'?'Classify every option before submitting.':'Select at least one option before submitting.');return;}submit(step.id);}}
            accessibilityRole="button"
            accessibilityLabel="Submit answer"
            accessibilityState={{disabled:!ok}}
            accessibilityHint={ok?'Double tap to submit this step':'Complete your selections before submitting'}
            style={{backgroundColor:ok?C.ac:C.bd,borderRadius:10,paddingVertical:12,alignItems:'center',marginTop:14,minHeight:44,opacity:ok?1:0.55}}>
            <Text style={{color:ok?C.bg:C.t3,fontSize:13,fontWeight:'800',letterSpacing:1,textTransform:'uppercase'}}>Submit Answer</Text>
          </Pressable>);})()}
        {!!caseData.reference&&<View accessible={true} accessibilityLabel={`Content alignment. ${caseData.reference}`} style={{marginTop:14,paddingTop:10,borderTopWidth:1,borderTopColor:C.bd}}><Text style={{color:C.t3,fontSize:9,fontWeight:'700',letterSpacing:1,textTransform:'uppercase',marginBottom:3}}>Content alignment</Text><Text style={{color:C.t3,fontSize:10,lineHeight:15}}>{caseData.reference}</Text></View>}
      </View>
    </View>
  </ScrollView>);
}

// ═══════════════════════════════════════════════════════════
// LPT MULTIPLE-CHOICE SCREEN
// California LPT (Psychiatric Technician) cases are tested as standalone
// single-best-answer items, not as the 6-step NCJMM arc. Cases flagged
// format:'mc' route here: no patient chart, one question at a time, pick one.
// Shares the onFinish(correct,total,wrongs,stepScores) contract with CaseScreen,
// but passes [] for stepScores so MC results don't pollute NCJMM step analytics.
// ═══════════════════════════════════════════════════════════
function McCaseScreen({caseData,onFinish,onBack,anxMode,startIndex=0}){
  const scrollRef=useRef(null);
  const Q=caseData.steps;const N=Q.length;
  const[cur,setCur]=useState(Math.min(Math.max(0,startIndex),Math.max(0,N-1)));
  const[picks,setPicks]=useState({});const[done,setDone]=useState({});
  const[scores,setScores]=useState({});const[wrongLog,setWrongLog]=useState([]);const[timedOut,setTimedOut]=useState(false);
  const q=Q[cur];

  const pick=(qid,oid)=>{if(done[qid])return;setPicks(p=>({...p,[qid]:oid}));};
  const submit=qid=>{
    const item=Q.find(x=>x.id===qid);const pid=picks[qid];
    const ans=item.opts.find(o=>o.c===true);const isC=pid===ans?.id;
    setScores(p=>({...p,[qid]:{correct:isC?1:0,total:1}}));setDone(p=>({...p,[qid]:true}));
    if(!isC){const chosen=item.opts.find(o=>o.id===pid);
      setWrongLog(p=>[...p,{stepId:item.id,stepTitle:item.stepTitle||item.domain||'Question',stepType:'single',chosen:chosen?chosen.text:'No answer',correct:ans?ans.text:'',optionText:item.q}]);}
  };
  const next=()=>{if(cur<N-1){setCur(cur+1);scrollRef.current?.scrollTo({y:0,animated:true});}};
  const finish=()=>{
    const tc=Object.values(scores).reduce((a,v)=>a+v.correct,0);
    const tp=Object.values(scores).reduce((a,v)=>a+v.total,0);
    onFinish(tc,tp,wrongLog,[]); // [] — MC items are not NCJMM steps
  };
  const handleBack=()=>{if(Object.keys(done).length>0)Alert.alert('Leave?','Progress will not be saved.',[{text:'Stay',style:'cancel'},{text:'Leave',style:'destructive',onPress:onBack}]);else onBack();};

  const isDone=!!done[q.id];const ok=!!picks[q.id];

  return(<ScrollView ref={scrollRef} style={{flex:1,backgroundColor:C.bg}} contentContainerStyle={{paddingBottom:80}} showsVerticalScrollIndicator={false}><StatusBar barStyle="light-content"/>
    <View style={{flexDirection:'row',alignItems:'center',paddingHorizontal:14,paddingTop:SAFE_TOP,paddingBottom:10,borderBottomWidth:1,borderBottomColor:C.bd,backgroundColor:C.bg,gap:10}}>
      <Pressable onPress={handleBack} accessibilityRole="button" accessibilityLabel="Back" accessibilityHint="Leaves this case and returns to the list" style={{minWidth:44,minHeight:44,justifyContent:'center'}}><Text style={{color:C.ac,fontSize:14,fontWeight:'700'}}>← Back</Text></Pressable>
      <Text style={{color:C.t1,fontSize:15,fontWeight:'700',flex:1}} numberOfLines={1}>{caseData.title}</Text>
      <Text style={{color:C.t2,fontSize:12,fontWeight:'600'}}>{cur+1}/{N}</Text>
    </View>
    <View style={{paddingHorizontal:14}}>
      {(anxMode||caseData.timed)&&!timedOut&&<ExamTimer totalSeconds={N*60} onTimeUp={()=>{setTimedOut(true);Alert.alert('⏱ Time!','Submitting progress.',[{text:'Results',onPress:()=>{Q.forEach(it=>{if(!done[it.id])submit(it.id);});setTimeout(finish,100);}}]);}}/>}
      {!!caseData.scenario&&<View style={{backgroundColor:C.sf,borderWidth:1,borderColor:C.bd,borderRadius:12,padding:12,marginTop:10,marginBottom:10}}>
        <Text style={{color:C.ac,fontSize:9,fontWeight:'800',letterSpacing:1,textTransform:'uppercase',marginBottom:4}}>Clinical Scenario</Text>
        <Text style={{color:C.t1,fontSize:13,lineHeight:19}}>{caseData.scenario}</Text>
      </View>}
      <View style={{marginBottom:10}}>
        <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:5}}>
          <Text style={{color:C.t2,fontSize:9,fontWeight:'700',letterSpacing:1,textTransform:'uppercase'}}>Progress</Text>
          <Text style={{color:C.t3,fontSize:9,fontWeight:'700'}}>Question {cur+1} of {N}</Text>
        </View>
        {N<=24
          ?<View style={{flexDirection:'row',gap:4}}>
            {Q.map((it,i)=>{const isCur=i===cur;const d=!!done[it.id];const canJump=i<=cur;
              return(<Pressable key={it.id} onPress={()=>{if(canJump)setCur(i);}} disabled={!canJump} style={{flex:1,paddingVertical:4}}>
                <View style={{height:5,borderRadius:3,backgroundColor:isCur?C.ac:d?C.gbd:C.bd}}/>
              </Pressable>);})}
          </View>
          :<View style={{height:6,borderRadius:3,backgroundColor:C.bd,overflow:'hidden'}}>
            <View style={{height:6,borderRadius:3,backgroundColor:C.ac,width:`${Math.round((cur+1)/N*100)}%`}}/>
          </View>}
      </View>
      <View style={{backgroundColor:C.sf,borderWidth:1,borderColor:C.bd,borderRadius:14,padding:14}}>
        <View style={{flexDirection:'row',gap:6,marginBottom:10,flexWrap:'wrap'}}>
          <View style={{backgroundColor:C.acd,paddingHorizontal:8,paddingVertical:3,borderRadius:4}}><Text style={{color:C.ac,fontSize:9,fontWeight:'700',letterSpacing:0.5,textTransform:'uppercase'}}>Question {cur+1}</Text></View>
          {!!q.domain&&<View style={{backgroundColor:C.purpleDim,paddingHorizontal:8,paddingVertical:3,borderRadius:4}}><Text style={{color:C.purple,fontSize:9,fontWeight:'700'}}>{q.domain}</Text></View>}
        </View>
        <Text style={{color:C.t1,fontSize:15,fontWeight:'700',lineHeight:21,marginBottom:14}}>{q.q}</Text>

        {q.opts.map(opt=>{
          const sel=picks[q.id]===opt.id;const isC=opt.c===true;
          const showG=isDone&&isC;const showR=isDone&&sel&&!isC;
          let bg=C.sf,bd=C.bd;if(!isDone&&sel){bg=C.acd;bd=C.ac;}if(showG){bg=C.gbg;bd=C.gbd;}if(showR){bg=C.rbg;bd=C.rbd;}
          return(<View key={opt.id} style={{marginBottom:6}}>
            <Pressable onPress={()=>!isDone&&pick(q.id,opt.id)} disabled={isDone}
              accessible={true}
              accessibilityRole="radio"
              accessibilityState={{checked:sel,disabled:isDone,selected:sel}}
              accessibilityLabel={`Option ${opt.id.toUpperCase()}. ${opt.text}${isDone?(isC?'. This is the correct answer':(sel?'. This was your answer, which is incorrect':'')):''}`}
              accessibilityHint={isDone?undefined:'Double tap to choose this answer'}
              style={{flexDirection:'row',alignItems:'flex-start',padding:11,borderRadius:10,borderWidth:2,minHeight:44,gap:8,backgroundColor:bg,borderColor:bd,opacity:isDone&&!sel&&!showG?0.45:1}}>
              <View style={{width:22,height:22,borderRadius:11,borderWidth:2,borderColor:showG?C.gbd:showR?C.rbd:sel?C.ac:C.bd,alignItems:'center',justifyContent:'center'}}>
                {(sel||showG)&&<View style={{width:10,height:10,borderRadius:5,backgroundColor:showG?C.gbd:showR?C.rbd:C.ac}}/>}
              </View>
              <Text style={{color:C.ac,fontSize:13,fontWeight:'800'}}>{opt.id.toUpperCase()}.</Text>
              <Text style={{color:C.t1,fontSize:13,lineHeight:18,flex:1}}>{opt.text}</Text>
            </Pressable>
            {isDone&&(showG||showR)&&!!opt.rat&&<View accessible={true} accessibilityLabel={`${isC?'Correct answer':'Your answer'}. Rationale: ${opt.rat}`} style={{marginLeft:12,paddingLeft:8,paddingVertical:4,borderLeftWidth:3,borderLeftColor:isC?C.gbd:C.rbd,marginTop:2}}>
              <Text style={{color:isC?C.gbd:C.rbd,fontSize:11,fontWeight:'700'}}>{isC?'✓ Correct answer':'✗ Your answer'}</Text>
              <Text style={{color:C.t2,fontSize:11,lineHeight:16}}>{opt.rat}</Text>
            </View>}
          </View>);
        })}

        {isDone&&scores[q.id]&&<View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:14,paddingTop:12,borderTopWidth:1,borderTopColor:C.bd}}>
          <View accessible={true} accessibilityLiveRegion="polite" accessibilityLabel={`${scores[q.id].correct?'Correct':'Incorrect'}. Score so far ${Object.values(scores).reduce((a,v)=>a+v.correct,0)} of ${Object.keys(scores).length}.`}><Text style={{color:scores[q.id].correct?C.gbd:C.rbd,fontSize:20,fontWeight:'800'}}>{scores[q.id].correct?'Correct':'Incorrect'}</Text><Text style={{color:C.t2,fontSize:9,fontWeight:'600',textTransform:'uppercase'}}>{Object.values(scores).reduce((a,v)=>a+v.correct,0)}/{Object.keys(scores).length} so far</Text></View>
          <Pressable onPress={cur<N-1?next:finish} accessibilityRole="button" accessibilityLabel={cur<N-1?`Next question. Question ${cur+2} of ${N}`:'See results'} style={{backgroundColor:C.ac,borderRadius:8,paddingHorizontal:18,paddingVertical:10,minHeight:44,justifyContent:'center'}}><Text style={{color:C.bg,fontSize:12,fontWeight:'800',letterSpacing:0.5,textTransform:'uppercase'}}>{cur<N-1?'Next Question →':'See Results →'}</Text></Pressable>
        </View>}
        {!isDone&&<Pressable onPress={()=>{if(!ok){Alert.alert('Answer required','Select an option before submitting.');return;}submit(q.id);}}
          accessibilityRole="button"
          accessibilityLabel="Submit answer"
          accessibilityState={{disabled:!ok}}
          accessibilityHint={ok?'Double tap to submit your selected answer':'Select an option before submitting'}
          style={{backgroundColor:ok?C.ac:C.bd,borderRadius:10,paddingVertical:12,alignItems:'center',marginTop:14,minHeight:44,opacity:ok?1:0.55}}>
          <Text style={{color:ok?C.bg:C.t3,fontSize:13,fontWeight:'800',letterSpacing:1,textTransform:'uppercase'}}>Submit Answer</Text>
        </Pressable>}
        {!!caseData.reference&&<View accessible={true} accessibilityLabel={`Content alignment. ${caseData.reference}`} style={{marginTop:14,paddingTop:10,borderTopWidth:1,borderTopColor:C.bd}}><Text style={{color:C.t3,fontSize:9,fontWeight:'700',letterSpacing:1,textTransform:'uppercase',marginBottom:3}}>Content alignment</Text><Text style={{color:C.t3,fontSize:10,lineHeight:15}}>{caseData.reference}</Text></View>}
      </View>
    </View>
  </ScrollView>);
}

// ═══════════════════════════════════════════════════════════
// RESULTS SCREEN
// ═══════════════════════════════════════════════════════════
function ResultsScreen({score,caseTitle,wrongs,perf,streak,isPro,onRetry,onHome,onShare}){
  const pct=score.total>0?Math.round(score.correct/score.total*100):0;
  const[aiText,setAiText]=useState(null);const[aiLoading,setAiLoading]=useState(false);
  const readCol={Low:C.rbd,Borderline:C.high,High:C.ac,'Very High':C.gbd};
  let tier,tierCol,tierIcon;
  if(pct>=90){tier='Exceptional';tierCol=C.gbd;tierIcon='🏆';}
  else if(pct>=75){tier='Proficient';tierCol=C.ac;tierIcon='⭐';}
  else if(pct>=60){tier='Developing';tierCol=C.high;tierIcon='📈';}
  else{tier='Building';tierCol=C.rbd;tierIcon='📚';}

  return(<ScrollView style={{flex:1,backgroundColor:C.bg}} contentContainerStyle={{padding:16,paddingTop:56,paddingBottom:80,alignItems:'center'}} showsVerticalScrollIndicator={false}><StatusBar barStyle="light-content"/>
    <Text style={{fontSize:44,marginBottom:6}}>{tierIcon}</Text>
    <Text style={{color:C.t1,fontSize:28,fontWeight:'900'}}>Case Complete</Text>
    <Text style={{color:tierCol,fontSize:15,fontWeight:'700',letterSpacing:2,textTransform:'uppercase',marginBottom:16}}>{tier}</Text>
    <View style={{width:100,height:100,borderRadius:50,borderWidth:4,borderColor:tierCol,backgroundColor:C.sfr,alignItems:'center',justifyContent:'center',marginBottom:8}}>
      <Text style={{color:tierCol,fontSize:32,fontWeight:'900'}}>{pct}%</Text>
      <Text style={{color:C.t2,fontSize:10}}>{score.correct}/{score.total}</Text>
    </View>
    <Text style={{color:C.amber,fontSize:12,fontWeight:'700',marginBottom:16}}>🔥 {streak.current}-day streak</Text>

    {perf&&<View style={{backgroundColor:C.sf,borderWidth:1.5,borderColor:readCol[perf.readiness]||C.bd,borderRadius:14,padding:16,width:'100%',marginBottom:14,alignItems:'center'}}>
      <Text style={{color:C.t3,fontSize:9,fontWeight:'600',letterSpacing:1,textTransform:'uppercase'}}>NCLEX Readiness</Text>
      <Text style={{color:readCol[perf.readiness],fontSize:24,fontWeight:'900'}}>{perf.readiness}</Text>
      <Text style={{color:C.t2,fontSize:12}}>{perf.overallPct}% overall • {perf.totalAttempts} attempts</Text>
    </View>}

    <ResultShareRow title={caseTitle||'Case Study'} pct={pct} correct={score.correct} total={score.total} streak={streak?.current||0} subtitle={perf?`Readiness: ${perf.readiness}`:undefined}/>

    {isPro&&<View style={{backgroundColor:C.sf,borderWidth:1.5,borderColor:C.purple,borderRadius:14,padding:16,width:'100%',marginBottom:14}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:8}}>
        <Text style={{fontSize:18}}>🧠</Text>
        <View style={{flex:1}}><Text style={{color:C.t1,fontSize:14,fontWeight:'800'}}>AI Error Analysis</Text><Text style={{color:C.purple,fontSize:10,fontWeight:'600'}}>"Why I'm Wrong" Diagnostic</Text></View>
      </View>
      {!aiText&&!aiLoading&&<View>
        <Text style={{color:C.t2,fontSize:12,marginBottom:10}}>{wrongs.length===0?'Perfect! No errors.':` ${wrongs.length} error${wrongs.length>1?'s':''} detected.`}</Text>
        <Pressable onPress={async()=>{setAiLoading(true);setAiText(await fetchAI(wrongs,caseTitle));setAiLoading(false);}} style={{backgroundColor:C.purpleDim,borderWidth:1,borderColor:C.purple,borderRadius:10,paddingVertical:10,alignItems:'center',minHeight:44}}>
          <Text style={{color:C.purple,fontSize:12,fontWeight:'800'}}>🔍 Analyze My Mistakes</Text>
        </Pressable>
      </View>}
      {aiLoading&&<View style={{alignItems:'center',padding:16}}><ActivityIndicator color={C.purple}/><Text style={{color:C.purple,fontSize:11,marginTop:6}}>Analyzing...</Text></View>}
      {aiText&&<View style={{backgroundColor:C.sfr,borderRadius:10,padding:12,borderLeftWidth:3,borderLeftColor:C.purple}}><Text style={{color:C.t1,fontSize:12,lineHeight:19}}>{aiText}</Text></View>}
    </View>}
    {!isPro&&wrongs.length>0&&<Pressable style={{backgroundColor:C.goldDim,borderWidth:1,borderColor:C.gold,borderRadius:10,padding:14,width:'100%',marginBottom:14,alignItems:'center'}}>
      <Text style={{color:C.gold,fontSize:12,fontWeight:'800'}}>⭐ Upgrade to Pro for AI Error Analysis</Text>
    </Pressable>}

    <Pressable onPress={onRetry} style={{backgroundColor:C.ac,borderRadius:10,paddingVertical:14,alignItems:'center',width:'100%',minHeight:44,marginBottom:8}}><Text style={{color:C.bg,fontSize:14,fontWeight:'800',letterSpacing:1,textTransform:'uppercase'}}>Retry This Case</Text></Pressable>
    <Pressable onPress={onHome} style={{backgroundColor:C.sf,borderRadius:10,borderWidth:1,borderColor:C.bd,paddingVertical:14,alignItems:'center',width:'100%',minHeight:44}}><Text style={{color:C.ac,fontSize:14,fontWeight:'800',letterSpacing:1,textTransform:'uppercase'}}>← Dashboard</Text></Pressable>
    <Text style={{color:C.t3,fontSize:9,textAlign:'center',marginTop:20,letterSpacing:0.8,textTransform:'uppercase'}}>Educational tool only. Not medical advice.</Text>
  </ScrollView>);
}

// ═══════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════
const s=StyleSheet.create({
  loadWrap:{flex:1,backgroundColor:C.bg,alignItems:'center',justifyContent:'center'},
});