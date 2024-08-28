// WordNet.js
const fs = require('fs'); const path = require('path');

class WordNet {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.data = {
      noun: { index: null, data: null },
      verb: { index: null, data: null },
      adj: { index: null, data: null },
      adv: { index: null, data: null }
    };
  }

  loadIndex(pos) {
    if (this.data[pos].index) return
    this.data[pos].index = {};
    const indexContent = fs.readFileSync(path.join(this.dbPath, `index.${pos}`), 'utf8');
    const lines = indexContent.split('\n');
    for (let line of lines) {
      if (line.trim() && !line.startsWith(' ')) {
        const [word, ...rest] = line.split(' ');
        const synsetOffsets = rest.slice(rest.indexOf('synset_cnt') + 1);
        this.data[pos].index[word] = synsetOffsets;
      }
    }
    console.log(`Loaded index for ${pos}`);
  }

  loadData(pos) {
    if (this.data[pos].data) return
    this.data[pos].data = {};
    const dataContent = fs.readFileSync(path.join(this.dbPath, `data.${pos}`), 'utf8');
    const lines = dataContent.split('\n');
    for (let line of lines) {
      if (line.trim()) {
        const [offset, ...rest] = line.split(' ');
        const parts = rest.join(' ').split('| ');
        if (parts.length >= 2) {
          const [synsetPart, glossPart] = parts;
          const words = synsetPart.split(' ').slice(4).filter(w => !w.startsWith('('));
          const [def, ...examples] = glossPart.split('; ');
          this.data[pos].data[offset] = {
            words,
            def: def.trim(),
            examples: examples.map(ex => ex.replace(/"/g, '').trim())
          };
        }
      }
    }
    console.log(`Loaded data for ${pos}`);
  }

  lookup(word) {
    let results = [];
    for (let pos of ['noun', 'verb', 'adj', 'adv']) {
      this.loadIndex(pos);
      const synsetOffsets = this.data[pos].index[word] || [];
      if (synsetOffsets.length > 0) {
        this.loadData(pos);
        for (let offset of synsetOffsets) {
          const synset = this.data[pos].data[offset];
          if (synset) {
            results.push({
              word,
              pos,
              synsetOffset: offset,
              def: synset.def,
              synonyms: synset.words,
              examples: synset.examples
            });
          }
        }
      }
    }
    return results;
  }

  getSynonyms(word) { return this.lookup(word).flatMap(r => r.synonyms) }
  getDefinitions(word) { return this.lookup(word).map(r => ({ pos: r.pos, def: r.def })) }
  getExamples(word) { return this.lookup(word).flatMap(r => r.examples) }
}

module.exports = WordNet

// Usage
function testSimpleWordNet() {
  const wn = new WordNet('./data/wn3.1.dict');

  console.clear()

  const words = ['dog']//, 'run', 'happy', 'computer', 'science'];
  for (const word of words) {
    console.log(`\nResults for "${word}":`);
    const results = wn.lookup(word);
    console.log(JSON.stringify(results, null, 2));

    console.log(`\nSynonyms for "${word}":`);
    const synonyms = wn.getSynonyms(word);
    console.log(synonyms);

    console.log(`\nDefinitions for "${word}":`);
    const definitions = wn.getDefinitions(word);
    console.log(definitions);

    console.log(`\nExamples for "${word}":`);
    const examples = wn.getExamples(word);
    console.log(examples);
  }
}; testSimpleWordNet()

