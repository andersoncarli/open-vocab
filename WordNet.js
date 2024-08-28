const fs = require('fs').promises;
const path = require('path');

class WordNet {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.data = {
      noun: { index: {}, data: {} },
      verb: { index: {}, data: {} },
      adj: { index: {}, data: {} },
      adv: { index: {}, data: {} }
    };
  }

  async initialize() {
    const pos = ['noun', 'verb', 'adj', 'adv'];
    for (let p of pos) {
      await this.loadIndex(p);
      await this.loadData(p);
    }
    console.log('WordNet database loaded into memory.');
  }

  async loadIndex(pos) {
    const indexContent = await fs.readFile(path.join(this.dbPath, `index.${pos}`), 'utf8');
    const lines = indexContent.split('\n');
    for (let line of lines) {
      if (line.trim() && !line.startsWith(' ')) {
        const [word, ...rest] = line.split(' ');
        const synsetOffsets = rest.slice(rest.indexOf('synset_cnt') + 1);
        this.data[pos].index[word] = synsetOffsets;
      }
    }
  }

  async loadData(pos) {
    const dataContent = await fs.readFile(path.join(this.dbPath, `data.${pos}`), 'utf8');
    const lines = dataContent.split('\n');
    for (let line of lines) {
      if (line.trim()) {
        const [offset, ...rest] = line.split(' ');
        const [synsetPart, glossPart] = rest.join(' ').split('| ');
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

  lookup(word) {
    let results = [];
    for (let pos in this.data) {
      const synsetOffsets = this.data[pos].index[word] || [];
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
    return results;
  }

  getSynonyms(word) {
    return this.lookup(word).flatMap(r => r.synonyms);
  }

  getDefinitions(word) {
    return this.lookup(word).map(r => ({ pos: r.pos, def: r.def }));
  }

  getExamples(word) {
    return this.lookup(word).flatMap(r => r.examples);
  }
}

// Usage
async function testSimpleWordNet() {
  const wn = new WordNet('./data/wn3.1.dict');
  await wn.initialize();  // This will take some time to load all data

  const words = ['dog', 'run', 'happy', 'computer', 'science'];

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
}

testSimpleWordNet().catch(console.error);