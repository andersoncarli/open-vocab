const fs = require('fs');
const crypto = require('crypto');

class Vocabulary {
  constructor(vocabFileName) {
    this.vocabFileName = vocabFileName;
    this.wordMap = new Map(); // For quick lookups
    this.sparseArray = []; // Sparse array for storing vocabulary records
    if(this.vocabFileName) this.open()
  }

  // Open and load vocabulary from a file
  open() {
    if (fs.existsSync(this.vocabFileName)) {
      const data = fs.readFileSync(this.vocabFileName, 'utf-8');
      const lines = data.split('\n').filter(line => line.trim() !== '');
      for (const line of lines) {
        const record = JSON.parse(line);
        this.wordMap.set(record.word, record);
        this.sparseArray[record.hash] = record;
      }
    } else console.log(this.vocabFileName, 'Not found.')
  }

  // Save the vocabulary to a file
  save() {
    const data = this.sparseArray
      .filter(record => record !== undefined)
      .map(record => JSON.stringify(record))
      .join('\n');
    fs.writeFileSync(this.vocabFileName, data, 'utf-8');
  }

  // Add a word to the vocabulary
  addWord(word, count) {
    const hash = this.hashWord(word);
    const record = { word, hash, count };
    this.wordMap.set(word, record);
    this.sparseArray[hash] = record;
  }

  // Hash a word using SHA-256 and return binary representation
  hashWord(word, bits = 32) {
    const hash = crypto.createHash('sha256').update(word).digest();
    let binaryHash = [...hash].map(byte => byte.toString(2).padStart(8, '0')).join('');
    return parseInt(binaryHash.slice(0, bits), 2);
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
    const wordMap = new Map(this.sparseArray.filter(record => record).map(record => [record.hash.toString(2), record.word]));
    return wordMap.get(bits) || String.fromCharCode(parseInt(bits, 2));
  }

  // Lookup a word using the sparse array
  lookup(word) {
    const record = this.wordMap.get(word);
    return record ? record.count : -1; // Return count as an example
  }
}

module.exports = Vocabulary;
