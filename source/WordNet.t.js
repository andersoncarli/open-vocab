// WordNet.t.js
const { test, check, debug, log } = require('../utils/core2.js')
const fs = require('fs'); const path = require('path');
const WordNet = require('./WordNet.js');

const wn = new WordNet('./data/wn3.1.dict');

test('Database&files', () => {
  const dbPath = './data/wn3.1.dict';
  try {
    let files = fs.readdirSync(wn.dbPath)
    check(files.includes('index.noun')); // log('Files in database directory:', files)
    const data = fs.readFileSync(path.join(dbPath, 'index.verb'), 'utf8');
    check(data.slice(0, 55).trim(), '1 This software and database is being provided to you');
  } catch (error) {
    console.error('Error accessing files:', error);
  }
})();

// function testOtherFunctions() {
//   try {
//     const result = wn.get(1846);  // todo: implement wn.get to get a specific synset
//     log('Get result:', result);

//     const morphResult = wn.morph('better');  // Try morphological processing
//     log('Morph result:', morphResult);
//   } catch (error) {
//     console.error('Error:', error);
//   }
// }; testOtherFunctions();

function testMultipleWords() {
  const words = ['dog']//, 'run', 'happy', 'computer', 'science'];
  for (const word of words) {
    try {
      const results = wn.lookup(word);
      log(`Results for "${word}":`, results);
    } catch (error) {
      console.error(`Error looking up "${word}":`, error);
    }
  }
}; testMultipleWords();

const lookup = (word) => wn.lookup(word)

test('PartsOfSpeech', (word) => {
  const results = lookup(word);
  const pos = new Set(results.map(r => r.pos));
  log(`"${word}" can be used as: ${Array.from(pos).join(', ')}`);
})('run')

test('Meanings', (word) => {
  const results = lookup(word);
  log(`"${word}" has ${results.length} different meanings:`);
  results.forEach((result, index) => {
    log(`${index + 1}. (${result.pos}) ${result.def}`);
  })
})('bank')

// Synonyms are words with similar meanings, while antonyms are words with opposite meanings.
test('RelatedWords', (word) => {
  const results = lookup(word);
  for (let result of results) {
    log(`\nFor "${word}" as ${result.pos}:`);
    const synonyms = wn.lookupSynonyms(result.synsetOffset, result.pos);
    log("Synonyms:", synonyms.map(s => s.lemma).join(', '));
    const antonyms = wn.lookupAntonyms(result.synsetOffset, result.pos);
    log("Antonyms:", antonyms.map(a => a.lemma).join(', '));
  }
})('good')

// Hypernymy and Hyponymy (Is-A Relationships):
// Represent hierarchical relationships between words. A hypernym is a more general term, while a hyponym is a more specific term.
test('Hierarchy', (word) => {
  const results = lookup(word);
  for (let result of results) {
    log(`\nFor "${word}" as ${result.pos}:`);
    const hypernyms = wn.lookupHypernyms(result.synsetOffset, result.pos);
    log("Hypernyms (more general):", hypernyms.map(h => h.lemma).join(', '));
    const hyponyms = wn.lookupHyponyms(result.synsetOffset, result.pos);
    log("Hyponyms (more specific):", hyponyms.map(h => h.lemma).join(', '));
  }
})('dog')

// Meronymy and Holonymy (Part-Whole Relationships):
// These represent part-whole relationships. A meronym is a part of something, while a holonym is the whole.
test('PartWhole', (word) => {
  const results = lookup(word);
  for (let result of results) {
    log(`\nFor "${word}" as ${result.pos}:`);
    const meronyms = wn.lookupMeronyms(result.synsetOffset, result.pos);
    log("Meronyms (parts):", meronyms.map(m => m.lemma).join(', '));
    const holonyms = wn.lookupHolonyms(result.synsetOffset, result.pos);
    log("Holonyms (wholes):", holonyms.map(h => h.lemma).join(', '));
  }
})('tree')
}) ()
