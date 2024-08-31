const fs = require('fs');
const crypto = require('crypto');

// Hash a word using SHA-256 and return binary representation
const hashWord = (word, maxBits = 32) => {
  const hash = crypto.createHash('sha256').update(word).digest();
  let binaryHash = [...hash].map(byte => byte.toString(2).padStart(8, '0')).join('');
  return parseInt(binaryHash.slice(0, bits), 2);
}

class Vocabulary {
  constructor({ file, maxBits = 24 }) {
    this.file = file;
    this.wordMap = new Map(); // For quick lookups
    this.words = []; // Sparse array for storing vocabulary records
    if (this.file) this.open()
  }

  open() {
    if (fs.existsSync(this.file)) {
      const data = fs.readFileSync(this.file, 'utf8');
      const lines = data.split('\n').filter(line => line.trim() !== '');
      for (const line of lines) {
        const record = JSON.parse(line);
        this.wordMap.set(record.word, record);
        this.words[record.hash] = record;
      }
    } else console.log(this.file, 'Not found.')
  }

  save() {
    const data = this.words
      .filter(Boolean)
      .map(record => JSON.stringify(record))
      .join('\n');
    fs.writeFileSync(this.file, data, 'utf-8');
  }

  // Add a word to the vocabulary
  addWord(word, count) {
    const hash = hashWord(word);
    const record = { word, hash, count };
    this.wordMap.set(word, record);
    this.words[hash] = record;
  }
  getSlot(hash) {
    for (let i = this.currentLevel; i <= this.maxBits; i++) {
      const slot = hash >>> (this.maxBits - i);
      if (!this.words[slot]) return slot;
    }
    return hash;
  }

  optimizeGroupPlacement(rootHash) {
    const sameHashGroup = this.sameHashRoot(rootHash);
    sameHashGroup.sort((a, b) => a.hash - b.hash).forEach(({ word, count, hash }) => {
      const slot = this.getSlot(hash);
      this.words[slot] = { word, count, hash };
    });
  }

  sameHashRoot(word, firstLevel = this.currentLevel + 1, lastLevel = this.currentLevel) {
    const hash = hashWord(word, this.maxBits);
    const matches = [];
    for (let i = firstLevel; i <= lastLevel; i++) {
      const candidate = this.words[hash >>> (this.maxBits - i)];
      if (candidate) matches.push(candidate);
    }
    return matches;
  }

  loadVocab(vocabFile) {
    const newVocab = fs.readFileSync(vocabFile, 'utf8').trim().split('\n');
    newVocab.forEach((line, i) => {
      const [word, count] = line.split(',');
      const existing = this.lookup(word);
      if (existing) {
        existing.count += parseInt(count || (newVocab.length - i), 10);
      } else {
        this.addWord(word, parseInt(count || (newVocab.length - i), 10));
      }
    });
  }

  bitCount(value) {
    return value.toString(2).length;
  }

  // Create a vocabulary from a word-count CSV file
  loadCorpus(corpusFileName) {
    const data = fs.readFileSync(corpusFileName, 'utf-8');
    const lines = data.split('\n').filter(line => line.trim() !== '');
    for (const line of lines) {
      const [word, count] = line.split(',');
      if (word && count) {
        this.addWord(word, parseInt(count, 10));
      }
    }
    this.save();
  }

  // Load vocabulary from a frequency-ordered file
  loadVocab(vocabFileName) {
    const data = fs.readFileSync(vocabFileName, 'utf-8');
    const lines = data.split('\n').filter(line => line.trim() !== '');
    for (const line of lines) {
      const [word, count] = line.split(',');
      if (word && count) {
        this.addWord(word, parseInt(count, 10));
      }
    }
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
    const wordMap = new Map(this.words.filter(record => record).map(record => [record.hash.toString(2), record.word]));
    return wordMap.get(bits) || String.fromCharCode(parseInt(bits, 2));
  }

  // Lookup a word using the sparse array
  lookup(word) {
    const record = this.wordMap.get(word);
    return record ? record.count : -1; // Return count as an example
  }
}

module.exports = Vocabulary;
