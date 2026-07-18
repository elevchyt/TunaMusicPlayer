/**
 * Greek <-> Latin ("greeklish") normalisation.
 *
 * The goal is NOT to produce a pretty transliteration — it is to project both
 * Greek and Latin text into one small phonetic alphabet so that a query typed
 * in either script matches an entry written in either script.
 *
 * The key property is *consistency*: the exact same transform runs over the
 * indexed text and over the query. So even where the mapping is lossy
 * (see the merges below), Latin-to-Latin and Greek-to-Greek matching are
 * unaffected — only cross-script precision pays for it, and we deliberately
 * trade precision for recall here since the user still picks from a result list.
 *
 * Deliberate merges, and why:
 *   - β / μπ / b / v      -> f-class   (β is written "v" or "b"; μπ is "b" or "mp")
 *   - φ / f  and the above merge into one class, which makes the αυ/ευ
 *     diphthongs ("af"/"av", "ef"/"ev") fall out for free.
 *   - χ / ξ / x / ch / kh / 3 -> "ks"  (covers every common spelling of both)
 *     Note the direction: we expand to "ks" rather than collapsing "ks" to a
 *     single symbol, so a genuine k+s boundary in Latin text ("dar[k s]ide"
 *     typed without the space) is left untouched instead of being rewritten
 *     into a Greek chi that the indexed title could never contain.
 *   - η ι υ ει οι υι h y u j       -> i  (all the /i/ sounds greeklish conflates)
 *   - ο ω o w                      -> o
 *   - ε αι e                       -> e
 *   - δ / ντ / d / nt              -> d
 *   - γ / γκ / γγ / g              -> g
 */

/** Digraphs and trigraphs, longest-first. Order within this array matters. */
const MULTI: Array<[string, string]> = [
  // --- Greek clusters ---
  ['ου', 'u'],
  ['αυ', 'af'],
  ['ευ', 'ef'],
  ['ηυ', 'if'],
  ['αι', 'e'],
  ['ει', 'i'],
  ['οι', 'i'],
  ['υι', 'i'],
  ['μπ', 'f'],
  ['ντ', 'd'],
  ['γκ', 'g'],
  ['γγ', 'g'],
  ['τσ', 'ts'],
  ['τζ', 'tz'],
  // --- Latin clusters ---
  ['ou', 'u'],
  ['th', 'q'],
  ['ch', 'ks'],
  ['kh', 'ks'],
  ['ps', 'ps'],
  ['mp', 'f'],
  ['nt', 'd'],
  ['gk', 'g'],
  ['gg', 'g'],
  ['ai', 'e'],
  ['ei', 'i'],
  ['oi', 'i'],
  ['ay', 'af'],
  ['av', 'af'],
  ['ey', 'ef'],
  ['ev', 'ef']
]

/** Single characters. Applied after MULTI. */
const SINGLE: Record<string, string> = {
  // Greek
  α: 'a',
  β: 'f',
  γ: 'g',
  δ: 'd',
  ε: 'e',
  ζ: 'z',
  η: 'i',
  θ: 'q',
  ι: 'i',
  κ: 'k',
  λ: 'l',
  μ: 'm',
  ν: 'n',
  ξ: 'ks',
  ο: 'o',
  π: 'p',
  ρ: 'r',
  σ: 's',
  ς: 's',
  τ: 't',
  υ: 'i',
  φ: 'f',
  χ: 'ks',
  ψ: 'ps',
  ω: 'o',
  // Latin
  a: 'a',
  b: 'f',
  c: 'k',
  d: 'd',
  e: 'e',
  f: 'f',
  g: 'g',
  h: 'i',
  i: 'i',
  j: 'i',
  k: 'k',
  l: 'l',
  m: 'm',
  n: 'n',
  o: 'o',
  p: 'p',
  q: 'k',
  r: 'r',
  s: 's',
  t: 't',
  u: 'i',
  v: 'f',
  w: 'o',
  x: 'ks',
  y: 'i',
  z: 'z',
  // greeklish leetspeak
  '8': 'q',
  '9': 'q',
  '3': 'ks',
  '4': 'a',
  '0': 'o'
}

/** Strip diacritics (Greek tonos/dialytika and Latin accents alike). */
export function stripDiacritics(input: string): string {
  return input.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

const cache = new Map<string, string>()
const CACHE_LIMIT = 20000

/**
 * Project a string into the shared phonetic alphabet.
 * Non-alphanumeric characters become a single space; digits are preserved so
 * album titles like "Vol 2" stay searchable. Runs of the same output character
 * collapse (Greek doubles λλ/ππ and typo-doubling both fall away).
 */
export function canonical(input: string): string {
  if (!input) return ''
  const hit = cache.get(input)
  if (hit !== undefined) return hit

  const src = stripDiacritics(input.toLowerCase())
  let out = ''
  let i = 0

  outer: while (i < src.length) {
    // Try the longest multi-character mapping first.
    if (i + 1 < src.length) {
      const pair = src.slice(i, i + 2)
      for (let m = 0; m < MULTI.length; m++) {
        if (MULTI[m][0] === pair) {
          out = append(out, MULTI[m][1])
          i += 2
          continue outer
        }
      }
    }
    const ch = src[i]
    const mapped = SINGLE[ch]
    if (mapped !== undefined) {
      out = append(out, mapped)
    } else if (ch >= '0' && ch <= '9') {
      out = append(out, ch)
    } else if (out.length > 0 && out[out.length - 1] !== ' ') {
      out += ' '
    }
    i++
  }

  const result = out.trim()
  if (cache.size > CACHE_LIMIT) cache.clear()
  cache.set(input, result)
  return result
}

/** Append `add` to `out`, collapsing a repeated final character. */
function append(out: string, add: string): string {
  if (out.length > 0 && add.length > 0 && out[out.length - 1] === add[0]) {
    return out + add.slice(1)
  }
  return out + add
}
