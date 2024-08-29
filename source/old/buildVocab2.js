const fs = require('fs');
const crypto = require('crypto');
const readline = require('readline');

// Function to compute SHA-256 hash with optional cropping to specified bits
const hashWord = (word, bits = 256) => {
  const fullHash = crypto.createHash('sha256').update(word).digest('hex');
  return bits < 256 ? fullHash.slice(0, bits / 4) : fullHash;
};

const findSparseIndex = (hash, array) => {
  let index = parseInt(hash[0], 16); // Start with the first hex digit
  let depth = 1;

  // Continue until we find an empty slot
  while (array[index] !== undefined) {
    depth++;
    index = parseInt(hash.slice(0, depth), 16);
  }

  return index;
};

async function transformFile() {
  const input = fs.createReadStream('./data/unigram_freq.csv');
  const rl = readline.createInterface({ input, crlfDelay: Infinity });

  const sparseArray = [];

  for await (const line of rl) {
    if (line) {
      const [word, count] = line.split(',');
      const hash = hashWord(word);
      const index = findSparseIndex(hash, sparseArray);

      sparseArray[index] = { word, count: parseInt(count), hash };
    }
  }

  fs.writeFileSync('english.vocab.json', JSON.stringify(sparseArray));
}

transformFile().catch(err => console.error(err));
