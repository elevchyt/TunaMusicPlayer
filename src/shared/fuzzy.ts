import { canonical, stripDiacritics } from './greeklish'

export interface SearchDoc<T> {
  item: T
  /** Canonical form of the primary label (title). */
  primary: string
  /** Canonical form of every searchable field joined, including the primary. */
  haystack: string
  /** First character of each canonical word, for acronym matching. */
  startsStr: string
  /**
   * First character of each *raw* word. Kept alongside `startsStr` because the
   * canonical form rewrites digraphs — "The Dark Side…" canonicalises with
   * th->q, so its canonical initials are "qdsoqm" and a user typing "dsotm"
   * would never match. Raw initials preserve what people actually type.
   */
  initials: string
}

export interface SearchHit<T> {
  item: T
  score: number
}

/** Build the immutable index once; searching never re-canonicalises documents. */
export function buildDocs<T>(items: T[], fields: (item: T) => string[]): Array<SearchDoc<T>> {
  const docs: Array<SearchDoc<T>> = new Array(items.length)
  for (let i = 0; i < items.length; i++) {
    const parts = fields(items[i])
    const primary = canonical(parts[0] ?? '')
    const haystack = parts.map((p) => canonical(p)).join(' ')

    let startsStr = ''
    for (let j = 0; j < haystack.length; j++) {
      if (j === 0 || haystack[j - 1] === ' ') startsStr += haystack[j]
    }

    docs[i] = {
      item: items[i],
      primary,
      haystack,
      startsStr,
      initials: wordInitials(parts.join(' '))
    }
  }
  return docs
}

const WORD_SPLIT = /[^\p{L}\p{N}]+/u

function wordInitials(text: string): string {
  const words = stripDiacritics(text.toLowerCase()).split(WORD_SPLIT)
  let out = ''
  for (const word of words) if (word) out += word[0]
  return out
}

/** Lowercased, diacritic-free, punctuation-free form of the query. */
function compact(text: string): string {
  return stripDiacritics(text.toLowerCase()).split(WORD_SPLIT).join('')
}

const SCORE_EXACT = 1000
const SCORE_PRIMARY_PREFIX = 900
const SCORE_WORD_PREFIX = 800
const SCORE_SUBSTRING = 700
const SCORE_ACRONYM = 600
const SCORE_SUBSEQUENCE = 300

/**
 * Rank `docs` against `rawQuery`.
 *
 * Two-stage for speed: a cheap in-order character scan rejects the bulk of the
 * library first, and only survivors get the (more expensive) positional score.
 * Every query term must match, so multi-word queries narrow rather than widen.
 */
export function search<T>(
  docs: Array<SearchDoc<T>>,
  rawQuery: string,
  limit = 500
): Array<SearchHit<T>> {
  const q = canonical(rawQuery)
  if (!q) return []
  const terms = q.split(' ').filter(Boolean)
  if (terms.length === 0) return []

  // Whole-query acronym form, matched against raw initials. Requires 3+ chars
  // and a contiguous run so it stays a shortcut rather than a noise source.
  const acronym = compact(rawQuery)
  const useAcronym = acronym.length >= 3

  const hits: Array<SearchHit<T>> = []

  for (let d = 0; d < docs.length; d++) {
    const doc = docs[d]
    let total = 0
    let ok = true

    for (let t = 0; t < terms.length; t++) {
      const s = scoreTerm(doc, terms[t])
      if (s <= 0) {
        ok = false
        break
      }
      total += s
    }

    if (!ok) {
      if (!useAcronym || doc.initials.indexOf(acronym) < 0) continue
      total = SCORE_ACRONYM * terms.length
    }

    // Prefer shorter titles when scores tie — "Zoo" should beat "Zoo Station".
    total = total / terms.length - Math.min(doc.primary.length, 200) * 0.15
    hits.push({ item: doc.item, score: total })
  }

  hits.sort((a, b) => b.score - a.score)
  return hits.length > limit ? hits.slice(0, limit) : hits
}

function scoreTerm<T>(doc: SearchDoc<T>, term: string): number {
  const hay = doc.haystack
  if (term.length === 0) return 0

  // Exact / prefix hits on the primary field rank highest.
  if (doc.primary === term) return SCORE_EXACT
  if (doc.primary.startsWith(term)) return SCORE_PRIMARY_PREFIX

  const idx = hay.indexOf(term)
  if (idx === 0) return SCORE_WORD_PREFIX
  if (idx > 0) {
    // A hit at a word boundary is worth more than one mid-word.
    const atWordStart = hay[idx - 1] === ' '
    const base = atWordStart ? SCORE_WORD_PREFIX : SCORE_SUBSTRING
    return base - Math.min(idx, 100) * 0.5
  }

  // Acronym over canonical word initials, e.g. "ea" -> "Ελευθερία Αρβανιτάκη".
  if (term.length >= 3 && doc.startsStr.indexOf(term) >= 0) return SCORE_ACRONYM

  // Fall back to a gap-penalised in-order subsequence.
  return subsequenceScore(hay, term)
}

function subsequenceScore(hay: string, term: string): number {
  let hi = 0
  let ti = 0
  let gaps = 0
  let lastMatch = -1

  while (hi < hay.length && ti < term.length) {
    if (hay[hi] === term[ti]) {
      if (lastMatch >= 0) gaps += hi - lastMatch - 1
      lastMatch = hi
      ti++
    }
    hi++
  }
  if (ti < term.length) return 0

  // Dense matches near the front of the string score best.
  return Math.max(1, SCORE_SUBSEQUENCE - gaps * 4 - lastMatch * 0.5)
}
