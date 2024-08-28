function text2bits(text, vocab) {
  const words = text.split(' ');
  let bitsSequence = [];

  words.forEach(word => {
    for (let level = 1; level <= Object.keys(vocab).length; level++) {
      const levelArray = vocab[level] || [];
      const wordObj = levelArray.find(entry => entry.word === word);

      if (wordObj) {
        bitsSequence.push(wordObj.hash.toString(2).padStart(level, '0'));
        break;
      }
    }
  });

  return bitsSequence.join('.');
}

// Sample usage
const vocab = require('./english.vocab.json'); // Load the generated vocab
const bits = text2bits('the quick brown fox', vocab);
console.log(bits); // Example output: 1.0101.1100.0111
