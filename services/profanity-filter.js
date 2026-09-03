'use strict';

const db = require('../startup/database');

/**
 * Multi-language banned-word detector built on the Aho-Corasick algorithm.
 *
 * Checks text against banned words loaded from the `blockwords` table.
 * Aho-Corasick builds one automaton from the entire dictionary and scans text in
 * O(text length) time, independent of how many words exist in the dictionary.
 */

const ZERO_WIDTH_RE = /[\u200B-\u200D\uFEFF\u00AD]/g;
const REPEAT_RE = /(.)\1{2,}/g;

const LEET_MAP = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  '$': 's',
};

function normalize(str, { leetSpeak = false } = {}) {
  if (!str) return '';
  let s = String(str).normalize('NFC').toLowerCase();
  s = s.replace(ZERO_WIDTH_RE, '');
  if (leetSpeak) s = s.replace(/[013457@$]/g, (c) => LEET_MAP[c] || c);
  s = s.replace(REPEAT_RE, '$1');
  return s;
}

const BOUNDARY = new Set([
  ' ', '\t', '\n', '\r', '.', ',', '!', '?', ';', ':',
  '"', "'", '(', ')', '[', ']', '{', '}', '-', '_', '/', '\\',
]);

function isBoundary(ch) {
  if (ch === undefined) return true;
  if (BOUNDARY.has(ch)) return true;
  const code = ch.codePointAt(0);
  if (code >= 0xd800 && code <= 0xdfff) return true;
  return false;
}

class TrieNode {
  constructor() {
    this.children = new Map();
    this.fail = null;
    this.output = [];
  }
}

class ProfanityFilter {
  constructor(options = {}) {
    this.options = { leetSpeak: false, ...options };
    this.root = new TrieNode();
    this.patterns = [];
    this.built = false;
  }

  build(words) {
    const root = new TrieNode();
    const patterns = [];

    for (const w of words) {
      const raw = typeof w === 'string' ? { word: w } : w;
      const normalized = normalize(raw.word, this.options);
      if (!normalized) continue;
      patterns.push({
        word: raw.word,
        normalized,
        length: normalized.length,
        wholeWordOnly: raw.wholeWordOnly !== false,
        meta: raw,
        idx: patterns.length,
      });
    }

    for (const p of patterns) {
      let node = root;
      for (const ch of p.normalized) {
        if (!node.children.has(ch)) node.children.set(ch, new TrieNode());
        node = node.children.get(ch);
      }
      node.output.push(p.idx);
    }

    const queue = [];
    for (const child of root.children.values()) {
      child.fail = root;
      queue.push(child);
    }
    while (queue.length) {
      const current = queue.shift();
      for (const [ch, child] of current.children) {
        let failNode = current.fail;
        while (failNode !== root && !failNode.children.has(ch)) failNode = failNode.fail;
        const candidate = failNode.children.get(ch);
        child.fail = candidate && candidate !== child ? candidate : root;
        child.output = child.output.concat(child.fail.output);
        queue.push(child);
      }
    }

    this.root = root;
    this.patterns = patterns;
    this.built = true;
    return this;
  }

  scan(text) {
    if (!this.built) throw new Error('ProfanityFilter.build() must be called before scan()');
    const normalized = normalize(text, this.options);
    const matches = [];
    let node = this.root;

    for (let i = 0; i < normalized.length; i++) {
      const ch = normalized[i];
      while (node !== this.root && !node.children.has(ch)) node = node.fail;
      node = node.children.get(ch) || this.root;

      if (node.output.length) {
        for (const idx of node.output) {
          const p = this.patterns[idx];
          const start = i - p.length + 1;
          const end = i + 1;
          matches.push({ word: p.word, start, end, wholeWordOnly: p.wholeWordOnly, meta: p.meta });
        }
      }
    }
    return { normalized, matches };
  }

  test(text) {
    if (!text || typeof text !== 'string') return false;
    const { normalized, matches } = this.scan(text);
    return matches.some(
      (m) => !m.wholeWordOnly || (isBoundary(normalized[m.start - 1]) && isBoundary(normalized[m.end]))
    );
  }
}

// ------------------- CACHE & AUTO-REFRESH -------------------
const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let filter = new ProfanityFilter();
let lastBuiltAt = 0;
let inFlight = null;

async function getFilter() {
  const isFresh = Date.now() - lastBuiltAt < REFRESH_INTERVAL_MS && filter.built;
  if (isFresh) return filter;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const rows = await new Promise((resolve) => {
        db.plantcare.query(
          `SELECT word FROM blockwords WHERE word IS NOT NULL AND TRIM(word) != ''`,
          (err, results) => {
            if (err) {
              console.warn('[ProfanityFilter] Warning reading blockwords table:', err.message);
              return resolve([]);
            }
            resolve(results || []);
          }
        );
      });

      const next = new ProfanityFilter();
      next.build(rows.map((r) => ({ word: r.word, wholeWordOnly: true })));
      filter = next;
      lastBuiltAt = Date.now();
      return filter;
    } catch (error) {
      console.error('[ProfanityFilter] Failed to rebuild filter:', error);
      return filter;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

function invalidate() {
  lastBuiltAt = 0;
}

module.exports = { ProfanityFilter, getFilter, invalidate, normalize };
