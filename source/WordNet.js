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
      ';r': 'Domain of synset - REGION',
      ';u': 'Domain of synset - USAGE',
      '-c': 'Member of this domain - TOPIC',
      '-r': 'Member of this domain - REGION',
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
              synonyms: this.translateSynonyms(synset.words),
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

  translateSynonyms(synonyms) {
    const translated = [];
    let skip = 0;
    for (let i = 0; i < synonyms.length; i++) {
      if (skip > 0) {
        skip--;
        continue;
      }
      const symbol = synonyms[i];
      if (this.pointerSymbols[symbol]) {
        translated.push(this.pointerSymbols[symbol]);
      } else if (symbol === 'n' || symbol === 'v' || symbol === 'a' || symbol === 'r') {
        translated.push(this.expandPOS(symbol));
      } else if (symbol.match(/^\d+$/)) {
        translated.push(`Sense ${symbol}`);
      } else {
        translated.push(symbol);
      }
      // Skip the next symbol if it's a part of speech
      if (i + 1 < synonyms.length && (synonyms[i + 1] === 'n' || synonyms[i + 1] === 'v' || synonyms[i + 1] === 'a' || synonyms[i + 1] === 'r')) {
        skip = 1;
      }
    }
    return translated;
  }

  expandPOS(pos) {
    let t = { n: 'noun', v: 'verb', a: 'adjective', r: 'adverb' }
    return returnt[pos] || pos
    // switch (pos) {
    //   case 'n': return 'noun';
    //   case 'v': return 'verb';
    //   case 'a': return 'adjective';
    //   case 'r': return 'adverb';
    //   default: return pos;
    // }
  }

  walk(start = 0, stop = Infinity, callback) {
    let count = 0;
    for (let pos of ['noun', 'verb', 'adj', 'adv']) {
      this.loadIndex(pos);
      for (let word in this.data[pos].index) {
        if (count >= start && count < stop) {
          const result = this.lookup(word);
          callback(word, result);
        }
        count++;
        if (count >= stop) return;
      }
    }
  }
}

module.exports = WordNet;

// Test code
test('WordNet', ({ check, debug, log, toSource, cl }) => {

  const wn = new WordNet('./data/wn3.1.dict');

  log.clear(); console.clear()

  const source = (o) => toSource(o, (k, v) => (
    v instanceof Array ? toSource(v)
      : v instanceof Object ? toSource(v)
        : String(v)), 2)


  // Example of using the walk method
  log(cl.bgColor('\nWalking through WordNet:'));
  let start = Math.round(Math.random()*100000)
  wn.walk(start, start+10, (word, result) => {
    log(`${cl.color(word)}:`, source(result));
  });



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