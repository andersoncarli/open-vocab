const { check, checkFail, checkException, debug, log } = require('./core2.js')
const fs = require('fs').promises; const path = require('path');
const WordNet = require('node-wordnet');

(async function () {
  const wordnet = new WordNet('/home/bittnkr/vocabia/data/wn3.1.dict');

  async function checkFiles() {
    const dbPath = '/home/bittnkr/vocabia/data/wn3.1.dict';
    try {
      const files = await fs.readdir(dbPath);
      log('Files in database directory:', files);

      // Try to read the first few lines of index.verb
      const indexVerbPath = path.join(dbPath, 'index.verb');
      const data = await fs.readFile(indexVerbPath, 'utf8');
      log('First 100 characters of index.verb:', data.slice(0, 100));
    } catch (error) {
      console.error('Error accessing files:', error);
    }
  }; await checkFiles();

  async function testOtherFunctions() {
    try {
      const result = await wordnet.get(1846);  // Try to get a specific synset
      log('Get result:', result);

      const morphResult = await wordnet.morph('better');  // Try morphological processing
      log('Morph result:', morphResult);
    } catch (error) {
      console.error('Error:', error);
    }
  }; await testOtherFunctions();

  async function testMultipleWords() {
    const words = ['dog', 'run', 'happy', 'computer', 'science'];
    for (const word of words) {
      try {
        const results = await wordnet.lookup(word);
        log(`Results for "${word}":`, results);
      } catch (error) {
        console.error(`Error looking up "${word}":`, error);
      }
    }
  }; await testMultipleWords();

  // async function testWordNet() {
  //   try {
  //     const results = await wordnet.lookup('test');
  //     log(results);
  //     if (results && results.length > 0) {
  //       log("WordNet is working correctly!");
  //     } else {
  //       log("WordNet returned an empty result. Check your database.");
  //     }
  //   } catch (error) {
  //     console.error("Error occurred:", error);
  //   }
  // }; testWordNet();















  // // const wordnet = new WordNet('/home/bittnkr/vocabia/data/wn3.1.dict');
  // const lookup = async (word) => await wordnet.lookup(word)

  // test('PartsOfSpeech', async (word) => {
  //   const results = await lookup(word);
  //   const pos = new Set(results.map(r => r.pos));
  //   log(`"${word}" can be used as: ${Array.from(pos).join(', ')}`);
  // })('run')

  // test('Meanings', async (word) => {
  //   const results = await lookup(word);
  //   log(`"${word}" has ${results.length} different meanings:`);
  //   results.forEach((result, index) => {
  //     log(`${index + 1}. (${result.pos}) ${result.def}`);
  //   })
  // })('bank')

  // // Synonymy and Antonymy:
  // // Synonyms are words with similar meanings, while antonyms are words with opposite meanings.
  // test('RelatedWords', async (word) => {
  //   const results = await lookup(word);
  //   for (let result of results) {
  //     log(`\nFor "${word}" as ${result.pos}:`);
  //     const synonyms = await wordnet.lookupSynonyms(result.synsetOffset, result.pos);
  //     log("Synonyms:", synonyms.map(s => s.lemma).join(', '));
  //     const antonyms = await wordnet.lookupAntonyms(result.synsetOffset, result.pos);
  //     log("Antonyms:", antonyms.map(a => a.lemma).join(', '));
  //   }
  // })('good')

  // // Hypernymy and Hyponymy (Is-A Relationships):
  // // These represent hierarchical relationships between words. A hypernym is a more general term, while a hyponym is a more specific term.
  // test('Hierarchy', async (word) => {
  //   const results = await lookup(word);
  //   for (let result of results) {
  //     log(`\nFor "${word}" as ${result.pos}:`);
  //     const hypernyms = await wordnet.lookupHypernyms(result.synsetOffset, result.pos);
  //     log("Hypernyms (more general):", hypernyms.map(h => h.lemma).join(', '));
  //     const hyponyms = await wordnet.lookupHyponyms(result.synsetOffset, result.pos);
  //     log("Hyponyms (more specific):", hyponyms.map(h => h.lemma).join(', '));
  //   }
  // })('dog')

  // // Meronymy and Holonymy (Part-Whole Relationships):
  // // These represent part-whole relationships. A meronym is a part of something, while a holonym is the whole.
  // test('PartWhole', async (word) => {
  //   const results = await lookup(word);
  //   for (let result of results) {
  //     log(`\nFor "${word}" as ${result.pos}:`);
  //     const meronyms = await wordnet.lookupMeronyms(result.synsetOffset, result.pos);
  //     log("Meronyms (parts):", meronyms.map(m => m.lemma).join(', '));
  //     const holonyms = await wordnet.lookupHolonyms(result.synsetOffset, result.pos);
  //     log("Holonyms (wholes):", holonyms.map(h => h.lemma).join(', '));
  //   }
  // })('tree')

})()
