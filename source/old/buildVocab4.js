// buildVocab4.js
const fs = require('fs');
const crypto = require('crypto');
const readline = require('readline');

// Function to compute SHA-256 hash and return binary representation
const hashWord = (word) => {
  const hash = crypto.createHash('sha256').update(word).digest();
  return [...hash].map(byte => byte.toString(2).padStart(8, '0')).join('');
};

// Function to find the index for the word's hash within the level
const findSparseIndex = (binaryHash, array, bits) => {
  const index = parseInt(binaryHash.slice(0, bits), 2);
  const adjustedIndex = index - (1 << (bits - 1)); // Adjust index for the current bit level
  return array[adjustedIndex] === undefined ? adjustedIndex : null;
};

async function transformFile() {
  const input = fs.createReadStream('../data/unigram_freq.csv');
  const rl = readline.createInterface({ input, crlfDelay: Infinity });

  const vocab = {};
  let maxLevel = 0;

  for await (const line of rl) {
    if (line) {
      let [word, count] = line.split(',');
      const binaryHash = hashWord(word);
      let level = 1;

      while (true) {
        const adjustedIndex = findSparseIndex(binaryHash, vocab[level] || [], level);

        if (adjustedIndex !== null) {
          if (!vocab[level]) vocab[level] = [];

          vocab[level][adjustedIndex] = { word, hash: parseInt(binaryHash.slice(0, level), 2), position: adjustedIndex, count: parseInt(count) };

          if (level > maxLevel) maxLevel = level;
          break;
        }
        level++;
      }
    }
  }

  // Write the vocab object to a JSON file
  fs.writeFileSync('../data/english.vocab.json', JSON.stringify(vocab, null, 2));
  console.log(`Vocabulary generated with max level: ${maxLevel}`);
}

transformFile().catch(err => console.error(err));
