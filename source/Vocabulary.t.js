const fs = require('fs')
const utils = require('../utils/core2.js')
const { Vocabulary, hashWord, buildVocab } = require('./Vocabulary.js')

// Unit test for Vocabulary class
utils.test('Vocabulary', ({ log, check }) => {
  log.clear()

  const file = './test_vocab.csv'
  if (fs.existsSync(file)) fs.unlinkSync(file)

  // Create a new vocabulary instance
  var words = new Vocabulary({ file })
  // addWord and searchWord
  words.add('hello', 100)
  words.add('world', 50)
  words.save()

  words = new Vocabulary({ file }); // open it again
  // Test if words are correctly added
  let r = words.search('hello')
  check(r, { word: 'hello', count: 100 })
  check(words.search('world'), { word: 'world', count: 50 })

  // encoding and decoding
  let enc = words.encodeWord('hello');
  check(enc, 0); check(words.decodeWord(enc), 'hello')
  enc = words.encodeWord('world');
  check(enc, 2); check(words.decodeWord(enc), 'world')

  // handling of unknown words
  check(words.encodeWord('unknown'), 1)
  check(words.decodeWord(1), 'unknown')

  // Test encoding and decoding a string
  const text = 'hello world'
  const encodedText = words.encode(text)
  const decodedText = words.decode(encodedText)
  check(decodedText, text)

  // Test buildVocab
  const corpusFileName = './test_corpus.csv'
  fs.writeFileSync(corpusFileName, 'hello,100\nworld,50\n')
  const builtVocab = buildVocab(corpusFileName, 24)
  check(builtVocab.search('hello'), { word: 'hello', count: 100 })
  check(builtVocab.search('world'), { word: 'world', count: 50 })

  // Clean up test files
  fs.unlinkSync(file)

  // failure and exceptions
  checkFail(words.search('nonexistent')); // Should fail since the word is not in vocab
  checkException(() => words.decodeWord('1'.repeat(25))); // Should throw an exception for invalid bit length
})(utils)
