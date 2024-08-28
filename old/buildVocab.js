const fs = require('fs');
const crypto = require('crypto');
const readline = require('readline');

// Function to compute SHA-256 hash with optional cropping to specified bits
const hashWord = (word, bits = 256) => {
  const fullHash = crypto.createHash('sha256').update(word).digest('hex');
  return bits < 256 ? fullHash.slice(0, bits / 4) : fullHash;
};
console.log(process.cwd())

// Transform word by word using two file streams
async function transformFile() {
  const input = fs.createReadStream('./data/unigram_freq.csv');
  const output = fs.createWriteStream('./data/english.vocab.json');
  const rl = readline.createInterface({
    input,
    crlfDelay: Infinity
  });

  output.write('['); // Start of JSON array

  let first = true;
  for await (const line of rl) {
    if (line) {
      const [word, count] = line.split(',');
      const data = { count: parseInt(count), hash: hashWord(word) };

      if (!first) output.write(',\n'); // Add a comma before new entry except the first
      first = false;

      output.write(JSON.stringify({ [word]: data }));
      // output.flush()
    }
  }

  output.write(']\n'); // End of JSON array
  output.end();
}

transformFile().catch(err => console.error(err));
