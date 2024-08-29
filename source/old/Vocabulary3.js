const fs = require('fs');
const crypto = require('crypto');
const readline = require('readline');

class Vocabulary {
  constructor(vocabFileName) {
    this.vocab = new Map();
    this.wordMap = new Map(); // Map for quick lookup
    this.vocabFileName = vocabFileName;
  }

  // Open the vocabulary file and load its contents
  open() {
    if (fs.existsSync(this.vocabFileName)) {
      const data = fs.readFileSync(this.vocabFileName, 'utf-8').split('\n');
      data.forEach(line => {
        if (line) {
          const { word, hash, count } = JSON.parse(line);
          this.addWord(word, count, hash);
        }
      });
    }
  }

  // Save the vocabulary to a file
  save() {
    const stream = fs.createWriteStream(this.vocabFileName);
    for (const [word, record] of this.wordMap.entries()) {
      stream.write(`${JSON.stringify({ word, hash: record.hash, count: record.count })}\n`);
    }
    stream.end();
  }

  // Add a word with its count and optionally a precomputed hash
  addWord(word, count, hash = null) {
    if (!hash) hash = this.hashWord(word);
    const index = this.findSparseIndex(hash);
    const bits = hash.length;

    if (!this.vocab.has(bits)) this.vocab.set(bits, new Array(2 ** bits));
    this.vocab.get(bits)[index] = { word, hash: index, position: this.vocab.get(bits).length, count };

    this.wordMap.set(word, { hash: index, bits, count });
  }

  // Hash a word using SHA-256 and return binary representation limited to 'bits' length
  hashWord(word, bits = Infinity) {
    const hash = crypto.createHash('sha256').update(word).digest();
    let binaryHash = [...hash].map(byte => byte.toString(2).padStart(8, '0')).join('');
    return binaryHash.slice(0, bits);
  }

  // Find a free index in the sparse array based on binary hash
  findSparseIndex(binaryHash) {
    let depth = 1;
    while (true) {
      const index = parseInt(binaryHash.slice(0, depth), 2);
      if (!this.vocab.has(depth) || this.vocab.get(depth)[index] === undefined) return index;
      depth++;
    }
  }

  // Generate hashes for words in a vocabulary file
  async loadCorpus(inputFile) {
    const rl = readline.createInterface({ input: fs.createReadStream(inputFile), crlfDelay: Infinity });

    for await (const line of rl) {
      if (line) {
        let [word, count] = line.split(',');
        count = parseInt(count);
        this.addWord(word, count);
      }
    }

    this.save();
  }

  // Encode a text string into a bitstream based on vocabulary
  encode(text) {
    return text.split(/\s+/).map(token => this.encodeWord(token)).join('');
  }

  // Decode a bitstream back to string using vocabulary
  decode(bitstream) {
    let decoded = '';
    let currentBits = '';
    for (let bit of bitstream) {
      currentBits += bit;
      const word = this.decodeWord(currentBits);
      if (word) {
        decoded += word + ' ';
        currentBits = '';
      }
    }
    return decoded.trim();
  }

  // Encode a single word into its bit representation
  encodeWord(word) {
    const record = this.wordMap.get(word);
    return record ? record.hash.toString(2) : word.split('').map(char => char.charCodeAt(0).toString(2).padStart(8, '0')).join('');
  }

  // Decode a bit representation into the original word or character
  decodeWord(bits) {
    for (let [level, array] of this.vocab.entries()) {
      const index = parseInt(bits, 2);
      if (array[index]) return array[index].word;
    }
    return null;
  }

  // Look up a word and return its numeric hash
  lookup(word) {
    const record = this.wordMap.get(word);
    return record ? record.hash : null;
  }
}

module.exports = Vocabulary;
