const fs = require('fs').promises;
const path = require('path');

class SimpleWordNet {
  constructor(dbPath) {
    this.dbPath = dbPath;
  }

  async lookup(word) {
    const pos = ['noun', 'verb', 'adj', 'adv'];
    let results = [];

    for (let p of pos) {
      try {
        const indexFile = await fs.readFile(path.join(this.dbPath, `index.${p}`), 'utf8');
        const lines = indexFile.split('\n');
        const wordLine = lines.find(line => line.startsWith(word + ' '));

        if (wordLine) {
          const parts = wordLine.split(' ');
          const synsetOffsets = parts.slice(parts.indexOf('synset_cnt') + 1);

          for (let offset of synsetOffsets) {
            const dataFile = await fs.readFile(path.join(this.dbPath, `data.${p}`), 'utf8');
            const dataLines = dataFile.split('\n');
            const synsetLine = dataLines.find(line => line.startsWith(offset));

            if (synsetLine) {
              const [, gloss] = synsetLine.split('| ');
              results.push({ word, pos: p, synsetOffset: offset, def: gloss });
            }
          }
        }
      } catch (error) {
        console.error(`Error processing ${p} for word "${word}":`, error);
      }
    }

    return results;
  }
}

// Usage
async function testSimpleWordNet() {
  const wordnet = new SimpleWordNet('/home/bittnkr/vocabia/data/wn3.1.dict');
  const words = ['dog', 'run', 'happy', 'computer', 'science'];

  for (const word of words) {
    try {
      const results = await wordnet.lookup(word);
      console.log(`Results for "${word}":`, results);
    } catch (error) {
      console.error(`Error looking up "${word}":`, error);
    }
  }
}

testSimpleWordNet();