// ═══════════════════════════════════════════════════════════
// useCases — NCJMM Clinical Trainer dynamic case loader
//
// Bundled-first, then merges remote cases from GitHub Pages.
// Validates every remote case against the real NCJMM schema.
// Network/parse failures are non-fatal — bundled cases still display.
//
// Place at: src/data/useCases.js
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────
// CONFIG — edit REMOTE_CASES_URL to your GitHub Pages URL
// Format: 'https://rxmazda06-alt.github.io/My-nursing-app/cases.json';
// ─────────────────────────────────────────────
const REMOTE_CASES_URL = 'https://rxmazda06-alt.github.io/My-nursing-app/cases.json';
const CACHE_KEY = '@v3_remote_cases';
const ETAG_KEY = '@v3_remote_cases_etag';
const FETCH_TIMEOUT_MS = 8000;

// ─────────────────────────────────────────────
// SCHEMA VALIDATOR — matches the EXACT NCJMM case shape in App.js
// ─────────────────────────────────────────────
const VALID_FLAGS = ['critical', 'high', 'low', 'normal'];
const VALID_STEP_TYPES = ['multi', 'rank', 'classify'];
const REQUIRED_PATIENT_KEYS = ['name', 'age', 'sex', 'code', 'allergies', 'admitDate', 'room'];

const isStr = v => typeof v === 'string' && v.length > 0;
const isNum = v => typeof v === 'number' && !Number.isNaN(v);
const isBool = v => typeof v === 'boolean';
const isArr = v => Array.isArray(v);
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);

function validateOpts(opts, type, cats) {
  if (!isArr(opts) || opts.length === 0) return false;
  for (const opt of opts) {
    if (!isObj(opt)) return false;
    if (!isStr(opt.id) || !isStr(opt.text) || !isStr(opt.rat)) return false;
    if (type === 'multi') {
      if (!isBool(opt.c)) return false;
    } else if (type === 'rank') {
      if (!isNum(opt.cr) || opt.cr < 1) return false;
    } else if (type === 'classify') {
      if (!isStr(opt.c)) return false;
      if (!isArr(cats) || !cats.includes(opt.c)) return false;
    }
  }
  return true;
}

function validateStep(step, expectedId) {
  if (!isObj(step)) return false;
  if (step.id !== expectedId) return false;
  if (!isStr(step.title) || !isStr(step.sub) || !isStr(step.icon) || !isStr(step.inst)) return false;
  if (!VALID_STEP_TYPES.includes(step.type)) return false;
  if (step.type === 'classify') {
    if (!isArr(step.cats) || step.cats.length < 2) return false;
  }
  if (!validateOpts(step.opts, step.type, step.cats)) return false;
  return true;
}

export function validateCase(c) {
  if (!isObj(c)) return false;
  if (!isStr(c.id) || !isStr(c.title) || !isStr(c.subtitle)) return false;
  if (!isBool(c.isFree)) return false;
  if (!isStr(c.category) || !isStr(c.nursesNote)) return false;
  if (!isObj(c.patient)) return false;
  for (const k of REQUIRED_PATIENT_KEYS) {
    if (c.patient[k] === undefined || c.patient[k] === null) return false;
  }
  if (!isArr(c.vitals) || c.vitals.length === 0) return false;
  for (const v of c.vitals) {
    if (!isObj(v)) return false;
    if (!isStr(v.time) || !isStr(v.hr) || !isStr(v.bp) || !isStr(v.rr) || !isStr(v.spo2)) return false;
  }
  if (!isArr(c.labs) || c.labs.length === 0) return false;
  for (const l of c.labs) {
    if (!isObj(l)) return false;
    if (!isStr(l.n) || !isStr(l.v) || !isStr(l.r)) return false;
    if (!VALID_FLAGS.includes(l.f)) return false;
  }
  if (!isArr(c.steps) || c.steps.length !== 6) return false;
  for (let i = 0; i < 6; i++) {
    if (!validateStep(c.steps[i], i + 1)) return false;
  }
  return true;
}

export function validateCaseList(cases) {
  const valid = [];
  const rejected = [];
  if (!isArr(cases)) return { valid, rejected };
  for (const c of cases) {
    if (validateCase(c)) valid.push(c);
    else rejected.push(c?.id || 'unknown');
  }
  return { valid, rejected };
}

// ─────────────────────────────────────────────
// MERGE — bundled order preserved; remote can override by id;
// brand-new remote cases append at the end.
// ─────────────────────────────────────────────
function mergeCases(bundled, remote) {
  const remoteById = new Map(remote.map(c => [c.id, c]));
  const merged = [];
  const seenIds = new Set();
  for (const c of bundled) {
    merged.push(remoteById.get(c.id) || c);
    seenIds.add(c.id);
  }
  for (const c of remote) {
    if (!seenIds.has(c.id)) merged.push(c);
  }
  return merged;
}

// ─────────────────────────────────────────────
// FETCH WITH TIMEOUT + ETAG
// ─────────────────────────────────────────────
async function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchRemoteCases() {
  let etag = null;
  try { etag = await AsyncStorage.getItem(ETAG_KEY); } catch {}
  const headers = { Accept: 'application/json' };
  if (etag) headers['If-None-Match'] = etag;
  const response = await fetchWithTimeout(REMOTE_CASES_URL, { headers });
  if (response.status === 304) return { changed: false, cases: null };
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const newEtag = response.headers.get('etag') || response.headers.get('ETag');
  const data = await response.json();
  if (newEtag) {
    try { await AsyncStorage.setItem(ETAG_KEY, newEtag); } catch {}
  }
  return { changed: true, cases: data };
}

// ─────────────────────────────────────────────
// MAIN HOOK
//
// Usage:
//   const { cases, loading, error, refresh } = useCases(BUNDLED_CASES);
//
// IMPORTANT: BUNDLED_CASES must be at module scope (outside the component)
// so its reference is stable across renders.
// ─────────────────────────────────────────────
export function useCases(bundledCases) {
  const [cases, setCases] = useState(bundledCases);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const bundledRef = useRef(bundledCases);
  bundledRef.current = bundledCases;

  const loadFromCacheAndFetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    // 1. Load cached cases immediately, re-validate, merge with bundled
    try {
      const cachedRaw = await AsyncStorage.getItem(CACHE_KEY);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        if (Array.isArray(cached)) {
          const { valid } = validateCaseList(cached);
          setCases(mergeCases(bundledRef.current, valid));
        }
      }
    } catch (e) {
      console.warn('[useCases] cache read failed:', e?.message);
    }

    // 2. Background fetch from GitHub Pages
    try {
      const { changed, cases: remoteData } = await fetchRemoteCases();
      if (!changed) {
        setLoading(false);
        return;
      }
      const { valid, rejected } = validateCaseList(remoteData);
      if (rejected.length > 0) {
        console.warn(`[useCases] rejected ${rejected.length} malformed remote cases:`, rejected);
      }
      try {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(valid));
      } catch (e) {
        console.warn('[useCases] cache write failed:', e?.message);
      }
      setCases(mergeCases(bundledRef.current, valid));
      setLastUpdate(new Date().toISOString());
    } catch (e) {
      console.warn('[useCases] remote fetch failed:', e?.message);
      setError(e?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFromCacheAndFetch();
  }, [loadFromCacheAndFetch]);

  return { cases, loading, error, lastUpdate, refresh: loadFromCacheAndFetch };
}

export default useCases;