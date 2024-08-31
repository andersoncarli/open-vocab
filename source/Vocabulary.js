const fs = require('fs');
const crypto = require('crypto');
const { debug } = require('../utils/core2.js')

class Vocabulary extends Array {
  constructor({ file }) {
    super()
    this.file = file;
    this.wordMap = new Map(); // For quick lookups
    this.currentLevel = 1;
    // this = []; // Sparse array for storing vocabulary records
    this.levels = [0];
    this.lastFull = 0
    if (this.file && fs.existsSync(this.file)) this.open()
  }

  open() {
    const data = fs.readFileSync(this.file, 'utf8');
    data.trim().split('\n').forEach((line, index) => {
      const [word, count, id] = line.split(',');
      id = id ? parseInt(id) : index;
      this[id] = { word, count: parseInt(count || 0) };
      this.levels[this.bitCount(id)]++;
      this.wordMap.set(word, this[id]);
    });
  }

  save() {
    let index = 0
    data = 'word,count,id'
    const data = this.filter(Boolean).map((w, i) => {
      let id = (i == index) ? '' : ',' + index; index++
      return `${w.word},${w.count}${id}`
    }).join('\n');
    fs.writeFileSync(this.file, data, 'utf-8');
  }

  add(word, count = 1) {
    debug('add', word, count)
    const slot = this.getSlot(word);
    slot.count += count
    return slot
  }

  getSlot(word) {
    let slot, hash = hashWord(word), id
    debug('getSlot', hash.toString(2).padStart(32, '0'), word)

    let group = this.sameHashRoot(hash)
    let w = group.find(v => !v.slot.word || v.slot.word == word)
    if (w) slot = w.slot // found the word
    else {
      id = mask(this.currentLevel, hash);
      if (!this[id]) { // found a empty slot
        slot = { word, count: 0, id }
      } else { // find a slot bellow this.currentLevel, optimizing levels
        group = group.sort((a, b) => a.hash - b.hash)
        group.forEach(w => {
          this[w.id] = w.slot;
          if (w.slot.word == word) slot = w.slot
        });
      }
    }
    // can't accomodate the word, start a new level.
    if (!slot) {
      id = mask(this.currentLevel++, hash);
      slot = { word, count: 0, id }
      this.levels[this.currentLevel] = 0
    }

    // update level stats
    let bits = bitCount(id); this.levels[bits]++;
    if (this.levels[bits] == mask(bits)) this.lastFull = bits
    return this[id] = slot
  }

  sameHashRoot(hash, firstLevel = 1) {
    debug(hash, firstLevel)
    const matches = [];
    for (let i = firstLevel; i <= this.currentLevel; i++) {
      const id = hash & ((1 << i) - 1);
      if (this[id]) matches.push({ slot: this[id], id, hash });
    }
    return matches;
  }

  search(word) {
    const hash = hashWord(word)
    for (let i = 1; i <= this.currentLevel; i++) {
      const w = this[hash & ((1 << i) - 1)]
      if (w && w.word == word) return w;
    }
  }

  // Encode a single word into its bit representation
  encodeWord(word) { return this.search(word).id }

  // Decode a bit representation into the original word or character
  decodeWord(bits) { return this[parseInt(bits, 2)].word }

  // Encode a text string into a bitstream based on vocabulary
  encode(text) { return text.split(/\s+/).map(token => this.encodeWord(token)).join('.') }

  // Decode a bitstream back to string using vocabulary
  decode(bits) { return bits.split('.').map(id => this.decodeWord(id)).join('') }
}

function mask(bits, value) {
  let m = (1 << bits) - 1
  return value ? value & m : m
}

function bitCount(n) {
  n = n - ((n >> 1) & 0x55555555)
  n = (n & 0x33333333) + ((n >> 2) & 0x33333333)
  return ((n + (n >> 4) & 0xF0F0F0F) * 0x1010101) >> 24
}

// hash function that returns an integer up to `maxBits`
const hashWord = (word, bits) => {
  const h = crypto.createHash('sha256').update(word).digest().readUInt32BE()
  if (bits) h = h >>> (32 - bits);
  return h
};

// Builds a new Vocabulary from a corpus file
const buildVocab = (corpusFile, maxBits = 24) => {
  const vocab = new Vocabulary({ file: '', maxBits });
  const tokens = fs.readFileSync(corpusFile, 'utf8').split(/(\s+|[^\w\s])/).filter(Boolean)
  tokens.forEach((word) => vocab.add(word))
  return vocab;
};

module.exports = { Vocabulary, hashWord, buildVocab, bitCount };
