// WordNet.js
const fs = require('fs'); const path = require('path');
const utils = require('../utils/core2.js')
const { test, log, debug } = utils

class WordNet {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.data = {
      noun: { index: null, data: null },
      verb: { index: null, data: null },
      adj: { index: null, data: null },
      adv: { index: null, data: null }
    };
    this.pointerSymbols = {
      '!': 'Antonym',
      '@': 'Hypernym',
      '~': 'Hyponym',
      '#m': 'Member holonym',
      '#s': 'Substance holonym',
      '#p': 'Part holonym',
      '%m': 'Member meronym',
      '%s': 'Substance meronym',
      '%p': 'Part meronym',
      '=': 'Attribute',
      '+': 'Derivationally related form',
      ';c': 'Domain of synset - TOPIC',
      '-c': 'Member of this domain - TOPIC',
      ';r': 'Domain of synset - REGION',
      '-r': 'Member of this domain - REGION',
      ';u': 'Domain of synset - USAGE',
      '-u': 'Member of this domain - USAGE'
    };
  }

  loadIndex(pos) {
    if (this.data[pos].index) return;
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
    // debug(`Loaded index for ${pos}`);
  }

  loadData(pos) {
    if (this.data[pos].data) return;
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
            words: this.resolveWordElements(words),
            def: def.trim(),
            examples: examples.map(ex => ex.replace(/"/g, '').trim())
          };
        }
      }
    }
    // debug(`Loaded data for ${pos}`);
  }

  resolveWordElements(elements) {
    const words = [];
    for (let i = 0; i < elements.length; i += 2) {
      if (elements[i] !== '0') {
        words.push(elements[i]);
      }
    }
    return words;
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

  synonyms(word) { return this.lookup(word).flatMap(r => r.synonyms) }
  definitions(word) { return this.lookup(word).map(r => ({ pos: r.pos, def: r.def })) }
  examples(word) { return this.lookup(word).flatMap(r => r.examples) }
  hypernyms(word) { return this.related(word, '@'); }
  hyponyms(word) { return this.related(word, '~'); }
  antonyms(word) { return this.related(word, '!'); }
  derivationallyRelated(word) { return this.related(word, '+'); }

  related(word, pointerSymbol) {
    let results = [];
    for (let pos of ['noun', 'verb', 'adj', 'adv']) {
      this.loadIndex(pos);
      this.loadData(pos);
      const synsetOffsets = this.data[pos].index[word] || [];
      for (let offset of synsetOffsets) {
        const synset = this.data[pos].data[offset];
        if (synset) {
          const relatedOffsets = this.relatedOffsets(synset.words, pointerSymbol);
          for (let relatedOffset of relatedOffsets) {
            const relatedSynset = this.data[pos].data[relatedOffset];
            if (relatedSynset) results.push(...relatedSynset.words);
          }
        }
      }
    }
    return [...new Set(results)];
  }

  relatedOffsets(words, pointerSymbol) {
    const offsets = [];
    for (let i = 0; i < words.length; i++)
      if (words[i] === pointerSymbol)
        offsets.push(words[i + 2]);
    return offsets;
  }
}

module.exports = WordNet;

test('WordNet', ({ check, debug, log, toSource, cl }) => {

  const wn = new WordNet('./data/wn3.1.dict');

  log.clear(); console.clear()

  const source = (o) => toSource(o, (k, v) => (
    v instanceof Array ? toSource(v)
      : v instanceof Object ? toSource(v)
        : String(v)), 2)

  const words = ['dog', 'run', 'happy', 'computer', 'science'];
  for (const word of words) {

    log(cl.bgColor(`\nResults for "${cl('+', word)}":`), source(wn.lookup(word)))
    log(`${cl.color('Synonyms')}:`, source(wn.synonyms(word)));
    log(`${cl.color('Definitions')}:`, source(wn.definitions(word)));
    log(`${cl.color('Examples')}:`, source(wn.examples(word)));
    log(`${cl.color('Hypernyms')}:`, source(wn.hypernyms(word)));
    log(`${cl.color('Hyponyms')}:`, source(wn.hyponyms(word)));
    log(`${cl.color('Antonyms')}:`, source(wn.antonyms(word)));
    log(`${cl.color('Derivationally related forms')}:`, source(wn.derivationallyRelated(word)));
  }
})(utils)