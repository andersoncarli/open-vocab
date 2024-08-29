const fs = require('fs');
const crypto = require('crypto');
const readline = require('readline');

class Vocabulary {
  constructor() {
    this.vocab = [];
    this.wordMap = new Map(); // Map for quick lookup
  }

  // Add a word with its count to the vocabulary and generate its hash
  addWord(word, count) {
    const hash = this.hashWord(word);
    const index = this.findSparseIndex(hash);
    const bits = hash.length;

    if (!this.vocab[bits]) this.vocab[bits] = [];
    this.vocab[bits][index] = { word, hash: index, position: this.vocab[bits].length, count };

    this.wordMap.set(word, { hash: index, bits });
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
      if (!this.vocab[depth] || this.vocab[depth][index] === undefined) return index;
      depth++;
    }
  }

  // Generate hashes for words in a vocabulary file
  async generateHashes(inputFile, outputFile, maxLevel) {
    const rl = readline.createInterface({ input: fs.createReadStream(inputFile), crlfDelay: Infinity });

    for await (const line of rl) {
      if (line) {
        let [word, count] = line.split(',');
        count = parseInt(count);
        this.addWord(word, count);
      }
    }

    fs.writeFileSync(outputFile, JSON.stringify(this.vocab));
  }

  // Encode a text string into a bitstream based on vocabulary
  encode(text) {
    return text.split(/\s+/).map(token => this.encodeWord(token)).join('.');
  }

  // Decode a bitstream back to string using vocabulary
  decode(bitstream) {
    return bitstream.split('.').map(bits => this.decodeWord(bits)).join('');
  }

  // Encode a single word into its bit representation
  encodeWord(word) {
    const record = this.wordMap.get(word);
    return record ? record.hash.toString(2) : word.split('').map(char => char.charCodeAt(0).toString(2).padStart(8, '0')).join('');
  }

  // Decode a bit representation into the original word or character
  decodeWord(bits) {
    const wordMap = new Map(this.vocab.flatMap(level => level.map(record => [record.hash.toString(2), record.word])));
    return wordMap.get(bits) || String.fromCharCode(parseInt(bits, 2));
  }git@github.com:andersoncarli/open-vocab.git
}

module.exports = Vocabulary;
