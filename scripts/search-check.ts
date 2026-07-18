/**
 * Sanity harness for the greeklish normaliser + fuzzy ranker.
 * Run with: npm run check:search
 */
import { canonical } from '../src/shared/greeklish'
import { buildDocs, search } from '../src/shared/fuzzy'

interface Album {
  title: string
  artist: string
}

const ALBUMS: Album[] = [
  { title: 'Ο Ήλιος του Μεσονυχτίου', artist: 'Χαρούλα Αλεξίου' },
  { title: 'Τα Τραγούδια της Χθεσινής Μέρας', artist: 'Γιάννης Πάριος' },
  { title: 'Αχ Έρωτα', artist: 'Ελευθερία Αρβανιτάκη' },
  { title: 'Ρεμπέτικα', artist: 'Μάρκος Βαμβακάρης' },
  { title: 'Ξημερώματα', artist: 'Δήμητρα Γαλάνη' },
  { title: 'The Dark Side of the Moon', artist: 'Pink Floyd' },
  { title: 'Kid A', artist: 'Radiohead' },
  { title: 'Ψυχή Βαθιά', artist: 'Θανάσης Παπακωνσταντίνου' },
  { title: 'Μπλε', artist: 'Δέσποινα Βανδή' },
  { title: 'Ούτε Ένα Ευχαριστώ', artist: 'Ελευθερία Αρβανιτάκη' }
]

const docs = buildDocs(ALBUMS, (a) => [a.title, a.artist])

/** query -> the album title we expect ranked first */
const CASES: Array<[string, string]> = [
  // Greek typed as Greek
  ['ρεμπετικα', 'Ρεμπέτικα'],
  ['Ξημερώματα', 'Ξημερώματα'],
  // greeklish -> Greek (the headline feature)
  ['rempetika', 'Ρεμπέτικα'],
  ['ksimeromata', 'Ξημερώματα'],
  ['3imeromata', 'Ξημερώματα'],
  ['ah erota', 'Αχ Έρωτα'],
  ['psyxi vathia', 'Ψυχή Βαθιά'],
  ['psixi bathia', 'Ψυχή Βαθιά'],
  ['ble', 'Μπλε'],
  ['mple', 'Μπλε'],
  ['o ilios tou mesonyxtiou', 'Ο Ήλιος του Μεσονυχτίου'],
  ['hlios', 'Ο Ήλιος του Μεσονυχτίου'],
  // artist field, greeklish
  ['xaroula', 'Ο Ήλιος του Μεσονυχτίου'],
  ['arvanitaki', 'Αχ Έρωτα'],
  ['vamvakaris', 'Ρεμπέτικα'],
  ['bambakaris', 'Ρεμπέτικα'],
  // accents / case ignored
  ['ELEFTHERIA', 'Αχ Έρωτα'],
  ['ελευθερια', 'Αχ Έρωτα'],
  // plain English must still behave
  ['dark side', 'The Dark Side of the Moon'],
  ['pink floyd', 'The Dark Side of the Moon'],
  ['kid a', 'Kid A'],
  ['radiohead', 'Kid A'],
  // dropped-letter tolerance via subsequence (in-order only — transpositions
  // like "dracside" are intentionally NOT matched)
  // dropped space must not manufacture a false digraph across the k|s boundary
  ['darkside', 'The Dark Side of the Moon'],
  ['drkside', 'The Dark Side of the Moon'],
  ['rmpetka', 'Ρεμπέτικα'],
  // acronym over raw initials
  ['dsotm', 'The Dark Side of the Moon'],
  // partial words across two fields
  ['ax arv', 'Αχ Έρωτα'],
  // a query that must NOT match anything
  ['zzzqqq', '(none)']
]

let failures = 0
console.log('--- normalisation samples ---')
for (const sample of ['Ρεμπέτικα', 'rempetika', 'Ψυχή Βαθιά', 'psyxi vathia', 'Μπλε', 'ble']) {
  console.log(`  ${sample.padEnd(16)} -> ${canonical(sample)}`)
}

console.log('\n--- ranking ---')
for (const [query, expected] of CASES) {
  const hits = search(docs, query, 5)
  const top = hits[0]?.item.title ?? '(none)'
  const ok = top === expected
  if (!ok) failures++
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${query.padEnd(24)} -> ${top}${ok ? '' : `   (expected ${expected})`}`)
}

// --- throughput on a synthetic large library ---
const big: Album[] = []
for (let i = 0; i < 50000; i++) {
  const base = ALBUMS[i % ALBUMS.length]
  big.push({ title: `${base.title} ${i}`, artist: base.artist })
}
const bigDocs = buildDocs(big, (a) => [a.title, a.artist])
const start = performance.now()
let n = 0
for (const q of ['rempetika', 'psyxi', 'dark', 'arvanitaki', 'xar']) {
  n += search(bigDocs, q, 500).length
}
const elapsed = performance.now() - start
console.log(`\n5 queries over ${big.length} docs: ${elapsed.toFixed(1)}ms total (${(elapsed / 5).toFixed(1)}ms each), ${n} hits`)

console.log(`\n${failures === 0 ? 'ALL RANKING CASES PASSED' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)
