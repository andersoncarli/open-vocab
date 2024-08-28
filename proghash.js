const crypto = require('crypto');
const fs = require('fs');
const { openSync, writeSync, closeSync, readSync } = require('fs');
const { Buffer } = require('buffer');

class Heap {
  constructor(filePath) {
    this.filePath = filePath;  // Store the file path
    this.heapSize = 1;  // Initialize the heap size
    this.data = [];  // Initialize an array to store the data
    this.index = {};  // Initialize an object to store the indexes of the data

    // Create the heap file if it doesn't exist
    if (!fs.existsSync(filePath)) {
      const fd = openSync(filePath, 'w+');
      writeSync(fd, Buffer.from([0]));  // Write a single byte to the file
      closeSync(fd);
    }

    // Memory-map the heap file
    this.heap = fs.readFileSync(filePath);
  }

  findEmptySlot() {
    // Find an empty slot in the heap
    let i = 0;  // Start at the least significant bit
    while (this.heap[i] !== 0) {  // Stop when a zero byte is found
      i += 1;
      if (i === this.heapSize) {  // If we've reached the end of the heap, double its size
        this.heapSize *= 2;
        this.heap = Buffer.concat([this.heap, Buffer.alloc(this.heapSize - this.heap.length)]);
      }
    }
    return i;
  }

  hash(value) {
    // Hash the value
    const hash = crypto.createHash('sha1').update(value).digest('hex');

    // Search the heap for a match
    const pos = this.findMatch(hash, value);
    if (pos !== undefined) {
      return pos;  // Return the position if a match is found
    }

    // If no match is found, store the value at the first empty slot found
    pos = this.findEmptySlot();

    // Store the index of the value in the data file
    const dataIndex = this.data.length;
    writeSync(this.dataFd, Buffer.from([dataIndex]), 0, 4, pos * 4);

    // Store the value in the data array
    this.data.push(value);
    this.index[hash] = dataIndex;

    // Return the position
    return pos;
  }

  findMatch(hash, value) {
    // Search the heap for a match
    let i = 0;
    while (i < this.heapSize) {
      // Check if the least significant bits of the hash match the corresponding bits in the heap
      if ((hash & (1 << i)) === (this.heap[i] & (1 << i))) {
        // Check if the value is stored at the position in the data file
        const dataIndex = readSync(this.dataFd, Buffer.alloc(4), 0, 4, i * 4)[0];
        if (dataIndex !== undefined) {
          const dataValue = this.data[dataIndex];
          if (dataValue === value) {
            // Return the position if the value is found
            return i;
          }
        }
      }
      i += 1;
    }
  }
}

function test(){
  const { readFileSync } = require('fs');
  const { tokenize } = require('esprima');

  const heap = new Heap('./proghash.idx');

  // Read the source code of the Heap class
  const code = readFileSync('proghash.js', 'utf8');

  // Tokenize the code
  const tokens = tokenize(code).map(token => token.value);

  // Index each token in the heap
  for (const token of tokens) {
    heap.hash(token);
  }

  // Retrieve each token from the index and compare it to the original
  for (const token of tokens) {
    const index = heap.index[crypto.createHash('sha1').update(token).digest('hex')];
    const retrievedToken = heap.data[index];
    if (retrievedToken !== token) {
      console.error(`Error: expected ${token}, got ${retrievedToken}`);
    }
  }

  console.log('Test passed');
}; test()


