import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Deterministic pseudo-random number generator (Mulberry32).
 * Using a fixed seed ensures the puzzle order remains consistent across rebuilds.
 */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Fisher-Yates shuffle with seeded PRNG.
 */
function seededShuffle<T>(array: T[], seed = 2024): T[] {
  const rng = mulberry32(seed)
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const temp = result[i]!
    result[i] = result[j]!
    result[j] = temp
  }
  return result
}

function build() {
  const wordListPath = resolve('src/game/wordList.json')
  const targetWordsPath = resolve('src/game/ordliste-liten.txt')

  // 1. Read existing wordList to retain allowed guesses
  const existingWordList: { solutions: number[]; list: string[] } = JSON.parse(readFileSync(wordListPath, 'utf-8'))

  // 2. Read and parse new target words
  const targetWords = readFileSync(targetWordsPath, 'utf-8')
    .split(/\r?\n/)
    .map(w => w.trim().toLowerCase())
    .filter(w => w.length === 5)

  const uniqueTargetWords = Array.from(new Set(targetWords))
  console.log(`Found ${uniqueTargetWords.length} unique target words in ${targetWordsPath}`)

  // 3. Ensure all target words are in allowed guesses list
  const allAllowedWordsSet = new Set([...existingWordList.list, ...uniqueTargetWords])
  const sortedAllowedWords = Array.from(allAllowedWordsSet).sort((a, b) => a.localeCompare(b, 'nb'))
  console.log(`Total allowed guesses in list: ${sortedAllowedWords.length}`)

  // 4. Map words to their new indices
  const wordToIndex = new Map<string, number>()
  for (let i = 0; i < sortedAllowedWords.length; i++) {
    wordToIndex.set(sortedAllowedWords[i]!, i)
  }

  // 5. Shuffle the target words deterministically
  const shuffledTargetWords = seededShuffle(uniqueTargetWords, 2024)

  const solutions = shuffledTargetWords.map(w => {
    const idx = wordToIndex.get(w)
    if (idx === undefined) {
      throw new Error(`Word not found in allowed list: ${w}`)
    }
    return idx
  })

  // 6. Write back to wordList.json
  const output = {
    solutions,
    list: sortedAllowedWords,
  }

  writeFileSync(wordListPath, JSON.stringify(output, null, 2), 'utf-8')
  console.log(`Successfully updated ${wordListPath} with ${solutions.length} solutions and ${sortedAllowedWords.length} words!`)
}

build()
