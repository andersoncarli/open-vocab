const fs = require('fs')
const { check, checkFail, checkException } = require('./utils/core2.js')
const Vocabulary = require('./Vocabulary.js')

// Unit test for Vocabulary class
test('Vocabulary', () => {
  console.clear()
  const vocabFileName = './test_vocab.jsonl'
  if (fs.existsSync(vocabFileName)) fs.unlinkSync(vocabFileName)

  // Create a new vocabulary instance
  var vocab = new Vocabulary(vocabFileName)

  // addWord and searchWord
  vocab.addWord('hello', 100)
  vocab.addWord('world', 50)
  vocab.save()

  vocab = new Vocabulary(vocabFileName); // open it again
  // Test if words are correctly added
  check(vocab.searchWord('hello'), { word: 'hello', count: 100 })
  check(vocab.searchWord('world'), { word: 'world', count: 50 })

  // encoding and decoding
  const encodedHello = vocab.encodeWord('hello')
  const encodedWorld = vocab.encodeWord('world')
  check(vocab.decodeWord(encodedHello), 'hello')
  check(vocab.decodeWord(encodedWorld), 'world')

  // handling of unknown words
  check(vocab.encodeWord('unknown'), 'unknown')
  check(vocab.decodeWord('unknown'), 'unknown')

  // Test tf, idf, and tfidf
  // Note: Provide an optional documents parameter if needed
  vocab.addDocument('hello world hello')
  check(vocab.tf('hello'), 2)
  check(vocab.idf('hello'), 1); // Dummy value; adjust based on actual implementation
  check(vocab.tfidf('hello'), 2); // Dummy value; adjust based on actual implementation

  // Test save and open methods
  vocab.save()
  const vocab2 = new Vocabulary(vocabFileName); vocab2.open()
  check(vocab2.searchWord('hello'), { word: 'hello', count: 100 })
  // check(vocab2.searchWord('hello'), { hash: vocab.lookup('hello'), bits: 8, count: 100 })

  check(vocab2.searchWord('world'), { word: 'world', count: 50 })
  // check(vocab2.searchWord('world'), { hash: vocab.lookup('world'), bits: 8, count: 50 })

  // Test encoding and decoding a string
  const text = 'hello world'
  const encodedText = vocab.encode(text)
  const decodedText = vocab.decode(encodedText)
  check(decodedText, text)

  // Test findSparseIndex for collision resolution
  const newWord = 'collisionTest'
  const newWordHash = vocab.hashWord(newWord, 4); // Limit to a small number of bits
  const index = vocab.findSparseIndex(newWordHash)
  check(index >= 0, true)

  // Clean up test files
  fs.unlinkSync(vocabFileName)

  // failure and exceptions
  checkFail(vocab.searchWord('nonexistent')); // Should fail since the word is not in vocab
  checkException(() => vocab.decodeWord('invalidBinary')); // Should throw an exception
})()
