const crypto = require('crypto');

class Vocabulary {
  constructor(db) {
    this.db = db;
    this.words = null;
  }

  async initialize() {
    await this.db.connect();
    await this.db.createTable('words', {
      id: 'INTEGER PRIMARY KEY',
      word: 'TEXT',
      bits: 'INTEGER',
      count: 'INTEGER',
      languages: 'TEXT',
      partOfSpeech: 'TEXT',
      labels: 'TEXT',
      synonyms: 'TEXT',
      relations: 'TEXT',
      definitions: 'TEXT',
      examples: 'TEXT',
      conceptualDomain: 'TEXT',
      difficultyLevel: 'INTEGER',
      dateAdded: 'TEXT',
      lastModified: 'TEXT'
    });
    this.words = this.db.table('words');
  }

  hashWord(word, bits = Infinity) {
    const hash = crypto.createHash('sha256').update(word).digest();
    let binaryHash = [...hash].map(byte => byte.toString(2).padStart(8, '0')).join('');
    return binaryHash.slice(0, bits);
  }

  findSparseIndex(binaryHash) {
    let depth = 1;
    while (true) {
      const index = parseInt(binaryHash.slice(0, depth), 2);
      return index;
    }
  }

  async addWord(wordData) {
    const hash = this.hashWord(wordData.word);
    const id = this.findSparseIndex(hash);
    const bits = hash.length;

    await this.words.insert({
      id,
      word: wordData.word,
      bits,
      count: wordData.count || 0,
      languages: wordData.languages || '',
      partOfSpeech: wordData.partOfSpeech || '',
      labels: wordData.labels || '',
      synonyms: wordData.synonyms || '',
      relations: wordData.relations || '',
      definitions: JSON.stringify(wordData.definitions || []),
      examples: JSON.stringify(wordData.examples || []),
      conceptualDomain: wordData.conceptualDomain || '',
      difficultyLevel: wordData.difficultyLevel || 0,
      dateAdded: new Date().toISOString(),
      lastModified: new Date().toISOString()
    });
  }

  async getWord(word) {
    return await this.words.findOne({ word });
  }

  async updateWord(word, newData) {
    const existingWord = await this.getWord(word);
    if (existingWord) {
      await this.words.update(existingWord.id, {
        ...newData,
        lastModified: new Date().toISOString()
      });
    }
  }

  async deleteWord(word) {
    const existingWord = await this.getWord(word);
    if (existingWord) {
      await this.words.delete(existingWord.id);
    }
  }

  async findRelatedWords(word, relationship) {
    const wordData = await this.getWord(word);
    if (!wordData) {
      return [];
    }
    const relations = wordData.relations.split(';');
    return relations
      .filter(relation => relation.split(':')[1] === relationship)
      .map(relation => relation.split(':')[0]);
  }

  async encode(text) {
    const words = text.split(/\s+/);
    let encodedWords = [];

    for (let word of words) {
      const wordData = await this.getWord(word);
      if (wordData) {
        encodedWords.push(parseInt(wordData.id).toString(2).padStart(wordData.bits, '0'));
      } else {
        encodedWords.push(word.split('').map(char => char.charCodeAt(0).toString(2).padStart(8, '0')).join(''));
      }
    }

    return encodedWords.join('');
  }

  async decode(bitstream) {
    let decoded = '';
    let currentBits = '';

    for (let i = 0; i < bitstream.length; i++) {
      currentBits += bitstream[i];
      const word = await this.decodeWord(currentBits);
      if (word) {
        decoded += word + ' ';
        currentBits = '';
      }
    }

    return decoded.trim();
  }

  async decodeWord(bits) {
    for (let level = 1; level <= bits.length; level++) {
      const id = parseInt(bits.slice(0, level), 2);
      const results = await this.words.find({id, bits: level});
      if (results.length > 0) {
        return results[0].word;
      }
    }
    return null;
  }
}

module.exports = Vocabulary;