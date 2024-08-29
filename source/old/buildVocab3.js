// buildVocab3.js
const fs = require('fs');
const crypto = require('crypto');
const readline = require('readline');

// Function to compute SHA-256 hash and return binary representation
const hashWord = (word) => {
  const hash = crypto.createHash('sha256').update(word).digest();
  return [...hash].map(byte => byte.toString(2).padStart(8, '0')).join('');
};

const findSparseIndex = (binaryHash, array) => {
  let depth = 1;

  while (true) {
    const index = parseInt(binaryHash.slice(0, depth), 2);
    if (array[index] === undefined) return index;
    depth++;
  }
};

async function transformFile() {
  const input = fs.createReadStream('./data/unigram_freq.csv');
  const rl = readline.createInterface({ input, crlfDelay: Infinity });

  const sparseArray = [];
  var maxLevel = 0, i = 0, maxWord = ''

  for await (const line of rl) {
    if (line) {
      let [word, count] = line.split(',');
      // count = parseInt(count)
      const binaryHash = hashWord(word);
      const index = findSparseIndex(binaryHash, sparseArray);
      const hash = index.toString(2)
      const bits = hash.length

      const o = sparseArray[index] = { word, hash: index, bits, position: i, count: parseInt(count) };

      if (bits > maxLevel) { maxLevel = bits; maxWord = word }
      if (i++ % 10000 == 0)
        console.log(JSON.stringify(sparseArray[index]), maxLevel)
    }
  }

  fs.writeFileSync('./data/english.vocab.jsonl', sparseArray.filter(Boolean).map(v => JSON.stringify(v)).join('\n'));
}

transformFile().catch(err => console.error(err));
