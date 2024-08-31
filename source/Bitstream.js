const utils = require("./utils")
const { EventEmitter } = require('events')

class BitStream extends EventEmitter {
  constructor(op = { grammar }) {
    super()
    this.op = op
    this.level = 0
    this.autoLevel = true
    this.maxLevel = 65536 // 64kbits/8kbytes
    this.mask = 0 // start at one bit
    this.length = 0
    this.currentBit = undefined
    if (grammar)
      this.parser = new Parser(grammar, { binary: true })
    if (this.connect) this.connect()
  }

  levelUp() { this.emit('levelUp', { level: ++this.level, pos: this.pos++ }) }
  levelDn() { this.emit('levelDn', { level: --this.level, pos: this.pos++ }) }

  readBlock() {
    if (this.currentBit == 0) {
      if (this.autoLevel)
        while (this.nextBit(0) && this.level > 0)
          this.levelUp()
      return 0
    } else {  // currentBit == 1
      if (this.autoLevel)
        while (this.nextBit(1) & this.level < this.maxLevel)
          this.levelDn()
      return this.readBits(this.level)
    }
  }

  readToken() {
    let token = this.readBlock() //
    this.emit('token', { token })
  }

  readValue() {
    let block = this.readToken()
  }

  writeValue(value) {
    if (this.eof()) { // appending

    } else { // updating the stream
      let block = value
      this.writeBits(this.level, block)
      // this zero bit indicates the value written is just the maximum value that fits in the block; the next block should not be upleveled
      if (block == this.mask) this.writeBits(0)
      // this one bit indicates the value written is just the minimum value that fits in the block; the next block should not be downleveled
      if (block == 0) this.writeBits(1)
    }
  }

  values(blockSize = this.level) {
    let values = []
    let value = 0
    let level = 0
    while (!this.eof()) {
      let bit = this.nextBit()
      if (bit == 1) {
        value = (value << 1) | bit
        level++
        if (level == this.level) {
          values.push(value)
          value = 0
          level = 0
        }
      } else {
        values.push(value)
        value = 0
        level = 0
      }
    }
    return values
  }

  nextBit(expected) { throw new Error("Must be implemented by a subclass") }// read the next bit if it is equal to expected
  readBits(count) { throw new Error("Must be implemented by a subclass") } // read a number of bits from the stream
  writeBits(count, value) { throw new Error("Must be implemented by a subclass") } // write a number of bits to the stream

  // only one cursor, used by read and write. When ahead of this.size means eof()
  get cursor() { throw new Error("Must be implemented by a subclass") }
  set cursor(pos) { throw new Error("Must be implemented by a subclass") }

  eof() { return true }


  loadGrammar(grammar) {
    const validateNode = (node, path) => {
      if (!(['function', 'object'][typeof node]))
        throw new Error(`Grammar error: node at path "${path}" is neither a function nor an object`)

      let children = Object.keys(node).length;
      if ((children & (children - 1)) == 0)
        throw new Error(`Grammar error: node at path "${path}" should have 2^N children`);

      for (let key in node)
        validateNode(node[key], `${path}.${key}`);
    }
    validateNode(grammar, 'start');
    this.grammar = grammar;
  }

  nextToken(expectedType) {

    let currentNode = this.state;
    let bits = Math.ceil(Math.log2(Object.keys(currentNode).length));
    if (typeof currentNode === 'function')
      return { type: this.state, bits: currentNode(bits) };
    else { // typeof currentNode === 'object'
      let nextState = this.readBits(bits);
      this.enter(Object.keys(currentNode)[nextState]);
    }
  }
}

class BitStreamPage extends BitStream {
  constructor(op = { pageSize: 8 * 1024 }) {
    super(...arguments)

    this.op = op
    this.pageCursor = 0

    this.header = {
      wordSize: 32,
      pageIndex: 0,
      bitIndex: 0,
      tokenIndex: 0,
      prevHash: '',
    }

    this.footer = {
      dataSize: 0,
      tokenCount: 0,
      blockHash: '',
      dataHash: '',
      dataBits: 0,
      controlBits: 0
    }

    this.words = new Uint32Array(op.buffer)
  }

  get pageSize() { return this.op.pageSize }
  set pageSize(size) { utils.check(size % this.header.wordSize) }

  get wordSize() { return this.header.wordSize }
  set wordSize(size) {
    utils.check(size % this.header.wordSize)
    this.header.wordSize
  }

  get cursor() { return this.pageIndex * this.op.pageSize + this.pageCursor }
  set cursor(pos) {
    // flush page if needed.
    // load a ned page to the map.
    this._cursor = pos + 1
  }

  nextBit(expected) {
    if (this.cursor >= this.pageSize) {
      this.flushPage()
      this.loadPage(++this.pageIndex)
      this.cursor = 0
    }

    let bit = this.page[this.cursor++]
    return bit === expected
  }

  readBit() {
  }

  readBits(count) {
    let value = 0
    for (let i = 0; i < count; i++) {
      value = (value << 1) | this.readBit(1)
    }
    return value
  }

  writeBits(count, value) {
    for (let i = 0; i < count; i++) {
      let bit = (value >> i) & 1
      this.page[this.pageWriteCursor++] = bit
      if (this.pageWriteCursor >= this.pageSize) {
        this.flushPage()
        this.loadPage(++this.pageIndex)
        this.pageWriteCursor = 0
      }
    }
  }

  loadPage(index) { throw new Error('Must be implemented by a subclass') }
  flushPage() { throw new Error('Must be implemented by a subclass') }
}

class BitStreamFile extends BitStream {
  constructor(fileName, op = { mode: "rw", pageSize: 1024 }) {
    super(...arguments)
    this.fileName = fileName
    this.fileDescriptor = fs.openSync(fileName, op.mode)
  }

  connect() {
    super.connect()
    this.loadPage(0)
  }

  loadPage(index) {
    this.flushPage()
    this.page = new Uint8Array(this.pageSize)
    let start = index * this.pageSize
    let length = Math.min(this.pageSize, fs.fstatSync(this.fileDescriptor).size - start)
    fs.readSync(this.fileDescriptor, this.page, 0, length, start)
  }

  flushPage(index) {
    if (this.pageIndex === -1) return
    fs.writeSync(this.fileDescriptor, this.page, 0, this.pageWriteCursor, this.pageIndex * this.pageSize)
    this.pageIndex = -1
  }
}

class BitStreamMMFile extends BitStreamPage {
  constructor(fileName, op = { mode: "rw", pageSize: 1024 }) {
    super(op)
    this.fileName = fileName
    this.fileDescriptor = fs.openSync(fileName, op.mode)
    this.fileSize = fs.fstatSync(this.fileDescriptor).size
  }

  loadPage(pageIndex) {
    const start = pageIndex * this.pageSize
    const length = Math.min(this.pageSize, this.fileSize - start)
    this.mappedData = fs.mmapSync(this.fileDescriptor, length, 0, start, 'COW')
  }

  flushPage(index) {
    fs.msyncSync(this.mappedData, 0, this.mappedData.length, fs.MS_SYNC)
  }
}

test('BitStream', ({ check }) => {

  function levelUp({ level, pos }) { console.log(`up:${level} pos:${pos}`) }
  function levelDn({ level, pos }) { console.log(`dn:${level} pos:${pos}`) }

  const op = {
    fileName: './test.bits',
    pageSize: 1024,
    wordSize: 32
  }

  let bs = new BitStreamFile(op) // what is written here

  let mm = new BitStreamMMFile({  // will be catched here
    onToken: (token, pos, bs) => {
      utils.check(token, lastToken)
      console.log(JSON.stringity(tokens))
    }, ...op
  })

  var last = 0

  function check(token, expectedLevel, expectedTokens) {
    utils.check(bs.tokens().slice(last).join(' '), expectedTokens)
    utils.check(bs.level, expectedLevel)
    last = bs.tokens().length
  }

  check(1, '1', 1) // token, result, expectedLevel
  check(0, '0', 1)
  check(1, '1', 1)
  check(3, '001 11', 2) // to write 3 we need 2 bits, so it should uplevel.
  check(2, '10') // to write 2 we need 2 bits
  check(1, '000 1', 1) // since 1 fits in a single bit it should downlevel.
  check(0, '0', 1)
  check(1, '1', 1)
  check(0, '0', 1)
  check(4, '0011 100', 3) // since 4 dont fit in level 0  we need to uplevel to 3th level
  check(5, '101', 3) // 5 fits in three bits so it dont need releveling
  check(7, '111', 3) // 7 fits in three bits so it dont need releveling
  check(6, '110', 3) // 6 fits in three bits so it dont need releveling
  check(1, '0000 1', 1) // back to level
})(utils)


// test('Bitstream-Shakespeare', ({ check }) => { })()
