const { Command } = require('commander');
const Vocabulary = require('./source/Vocabulary');

const program = new Command();
const vocab = new Vocabulary('./data/english.vocab.jsonl');

program
  .command('loadcorpus')
  .description('Generate vocabulary from text corpus')
  .option('-i, --input <inputFile>', 'Input text file')
  .option('-o, --output <outputFile>', 'Output vocabulary file')
  .action(({ input, output }) => {
    // Call vocab method to generate vocabulary
  });

program
  .command('hash-words')
  .description('Generate hashes for words in vocabulary')
  .option('-i, --input <inputFile>', 'Input vocabulary file')
  .option('-o, --output <outputFile>', 'Output hash file')
  .option('--maxLevel <maxLevel>', 'Maximum hash bit level')
  .action(({ input, output, maxLevel }) => {
    vocab.generateHashes(input, output, maxLevel);
  });

program
  .command('encode')
  .description('Encode text file into bitstream')
  .option('-i, --input <inputFile>', 'Input text file')
  .option('-v, --vocab <vocabFile>', 'Vocabulary file')
  .option('-o, --output <outputFile>', 'Output bitstream file')
  .action(({ input, vocab, output }) => {
    vocab.encode(input, vocab, output);
  });

program
  .command('decode')
  .description('Decode bitstream back to text')
  .option('-i, --input <inputFile>', 'Input bitstream file')
  .option('-v, --vocab <vocabFile>', 'Vocabulary file')
  .option('-o, --output <outputFile>', 'Output text file')
  .action(({ input, vocab, output }) => {
    vocab.decode(input, vocab, output);
  });

program.parse(process.argv);
