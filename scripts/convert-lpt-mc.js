#!/usr/bin/env node
/*
 * convert-lpt-mc.js — Convert LPT-track cases from the 6-step NGN/NCJMM format
 * into the California LPT exam format: a set of STANDALONE single-best-answer
 * multiple-choice questions (PSI 240-item style).
 *
 * AUTO-DISCOVERS every case whose tracks include "LPT" and is not already MC.
 * For each one it:
 *   1. writes an MC sibling "<id>-lpt" (tracks:["LPT"], format:"mc"), and
 *   2. narrows the NGN source to ["RN","LVN"] (LPT is served by the MC sibling).
 * RN/LVN keep the NGN case; the app hard-locks the LPT track to format:"mc".
 *
 * Anti-hallucination: reuses the AUTHORED option text and rationales verbatim.
 * No new clinical content is invented — NGN steps are only re-framed:
 *   multi step      -> one "best answer" item (a true option + authored false distractors)
 *   rank step       -> one "FIRST / MOST likely" item (the cr:1 option + ranked distractors)
 *   classify step   -> up to 3 items "<finding> -> which category?" using the step's cats
 *
 * Idempotent: re-running skips sources that already have an MC sibling.
 */
const fs = require('fs');
const path = require('path');

const CASES_DIR = path.join(__dirname, '..', 'src', 'data', 'cases');

// Deterministic shuffle (mulberry32) so re-running produces identical output.
function rng(seed){let a=seed>>>0;return()=>{a|=0;a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
function shuffle(arr,seed){const r=rng(seed);const x=arr.slice();for(let i=x.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[x[i],x[j]]=[x[j],x[i]];}return x;}
function hash(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}

// Map a case to one of the LPT exam content domains. Test the TITLE only — it is
// the strongest signal, so incidental words ("involuntary movements", "ECT consent")
// in tags/notes don't misclassify a clinical case as a legal one.
function domainFor(c){
  const t=(c.title||'').toLowerCase();
  if(/involuntary (commitment|psychiatric|hold)|civil commitment|\blps\b|\b5150\b|\b5250\b|patient rights|guardianship|conservatorship/.test(t)) return 'Legal & Ethical (LPS Act & Patient Rights)';
  if(/developmental disab|intellectual disab|\bidd\b|autism|down syndrome/.test(t)) return 'Developmental Disabilities';
  return 'Mental Health Care';
}

// A compact, self-contained vignette so each MC item stands on its own.
function scenarioFor(c){
  let s = (c.subtitle||'').trim();
  if(!s && c.patient){const p=c.patient;s=`${p.age} y/o ${String(p.sex||'').toLowerCase()} client`;}
  return s;
}

// Stem templates keyed off the NGN step title.
function stemFor(step){
  const t=(step.title||'').toLowerCase();
  if(step.type==='multi'){
    if(t.includes('recognize')) return 'Which of the following findings is MOST important for the nurse to recognize in this client?';
    if(t.includes('analyze'))   return 'Which statement BEST explains the significance of this client’s clinical findings?';
    if(t.includes('generate')||t.includes('solution')||t.includes('intervention')) return 'Which intervention is MOST appropriate for the nurse to implement for this client?';
    if(t.includes('evaluate')||t.includes('outcome')) return 'Which finding BEST indicates that the plan of care is effective?';
    if(t.includes('prioritize')||t.includes('action')) return 'Which is the nurse’s HIGHEST priority for this client?';
    return 'Which of the following is the BEST response for the nurse in this situation?';
  }
  if(step.type==='rank'){
    if(t.includes('action')||t.includes('implement')||t.includes('take')) return 'Which action should the nurse take FIRST?';
    if(t.includes('prioritize')||t.includes('hypothes')) return 'Which is the MOST likely explanation for this client’s presentation?';
    return 'Which should the nurse address FIRST?';
  }
  return 'Select the best answer.';
}

// Build the option list for a single-best-answer item: 1 correct + distractors,
// shuffled deterministically, re-lettered a..d, keeping authored text + rat.
function buildOpts(answer, distractors, seed){
  const pool=[{text:answer.text,rat:answer.rat,_c:true},
    ...distractors.map(d=>({text:d.text,rat:d.rat,_c:false}))];
  const mixed=shuffle(pool,seed);
  return mixed.map((o,i)=>({id:String.fromCharCode(97+i),text:o.text,c:o._c,rat:o.rat||''}));
}

function convertStep(step, qid, seed){
  if(step.type==='multi'){
    const trues=(step.opts||[]).filter(o=>o.c===true);
    const falses=(step.opts||[]).filter(o=>o.c===false);
    if(!trues.length||!falses.length) return [];
    const answer=trues[0];
    const distractors=shuffle(falses,seed).slice(0,3);
    return [{id:qid,type:'single',stepTitle:step.title,q:stemFor(step),
      opts:buildOpts(answer,distractors,seed+1)}];
  }
  if(step.type==='rank'){
    const sorted=(step.opts||[]).slice().filter(o=>typeof o.cr==='number').sort((a,b)=>a.cr-b.cr);
    const answer=sorted[0];
    const distractors=sorted.slice(1,4);
    if(!answer||!distractors.length) return [];
    return [{id:qid,type:'single',stepTitle:step.title,q:stemFor(step),
      opts:buildOpts(answer,distractors,seed+1)}];
  }
  if(step.type==='classify'){
    const cats=step.cats||[];
    if(cats.length<2||!Array.isArray(step.opts)) return [];
    // Pick up to 3 source options, preferring category variety.
    const picked=[];const seenCat={};
    for(const o of shuffle(step.opts,seed)){
      if(picked.length>=3) break;
      if(!seenCat[o.c]||picked.length<cats.length){picked.push(o);seenCat[o.c]=true;}
    }
    return picked.map((o,k)=>{
      const opts=cats.map((cat,i)=>({id:String.fromCharCode(97+i),text:cat,c:cat===o.c,
        rat:cat===o.c?(o.rat||''):''}));
      return {id:qid+k,type:'single',stepTitle:step.title,
        q:`${o.text}\n\nBased on this finding, the client’s status is BEST classified as:`,
        opts};
    });
  }
  return [];
}

function convertCase(c){
  const seedBase=hash(c.id);
  const domain=domainFor(c);
  const scenario=scenarioFor(c);
  let questions=[];
  let qNum=1;
  (c.steps||[]).forEach((step,si)=>{
    const items=convertStep(step,qNum,seedBase+si*101);
    items.forEach(it=>{it.id=qNum++;it.domain=domain;});
    questions=questions.concat(items);
  });
  return {
    id:c.id+'-lpt',
    title:c.title,
    subtitle:c.subtitle,
    isFree:!!c.isFree,
    category:c.category,
    domain,
    tracks:['LPT'],
    format:'mc',
    tags:c.tags||[domain],
    scenario,
    steps:questions,
  };
}

const hasLpt = c => Array.isArray(c.tracks) && c.tracks.includes('LPT');

const files = fs.readdirSync(CASES_DIR)
  .filter(f => f.endsWith('.json') && f !== 'MANIFEST.json' && !f.startsWith('.') && !f.endsWith('-lpt.json'));

let made=0, skipped=0, empty=0, totalQ=0;
for(const f of files){
  const fp=path.join(CASES_DIR, f);
  let c;
  try { c=JSON.parse(fs.readFileSync(fp,'utf8')); } catch { continue; }
  if(c.format==='mc') continue;          // already an MC case
  if(!hasLpt(c)) continue;               // not an LPT case
  const base=f.replace(/\.json$/,'');
  const outFp=path.join(CASES_DIR, base+'-lpt.json');
  if(fs.existsSync(outFp)){ skipped++; continue; } // idempotent

  const out=convertCase(c);
  if(!out.steps.length){
    console.warn(`! ${f}: produced 0 questions (unrecognized steps) — left as-is`);
    empty++; continue;
  }
  // 1. Write the MC sibling.
  fs.writeFileSync(outFp, JSON.stringify(out,null,2)+'\n');
  // 2. Narrow the NGN source to RN/LVN (drop LPT — covered by the MC sibling).
  c.tracks=(Array.isArray(c.tracks)?c.tracks:[]).filter(t=>t!=='LPT');
  if(!c.tracks.length) c.tracks=['RN','LVN'];
  fs.writeFileSync(fp, JSON.stringify(c,null,2)+'\n');
  made++; totalQ+=out.steps.length;
  console.log(`${f} -> ${out.id}: ${out.steps.length} MC questions (${out.domain}); source tracks now ${JSON.stringify(c.tracks)}`);
}
console.log(`\nDone. Created ${made} MC siblings (${totalQ} single-best-answer questions). Skipped ${skipped} already-converted, ${empty} unconvertible.`);
