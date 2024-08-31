const stateMachineGrammar = {
  start: {
    none: () => 0,
    some: {
      level: {
        down: () => { while (this.readBit() === 0 && this.level > 0) this.level--; }, // 1.0.0 some.level.down
        up: () => { while (this.readBit() === 1 && this.level < this.maxLevel) this.level++; }, // 1.0.1 some.level.up
      },
      value: {
        fixed: {
          uint: { // Unsigned integers
            u1: () => this.readBits(1),    // 1-bit unsigned integer
            u2: () => this.readBits(2),
            u4: () => this.readBits(4),
            u8: () => this.readBits(8),
            u16: () => this.readBits(16),
            u32: () => this.readBits(32),
            u64: () => this.readBits(64),
            u128: () => this.readBits(128),  // 128-bit unsigned integer
          },
          int: { // Signed integers
            i1: () => this.readBits(1) | (-(this.readBit() & 1)),   // 1-bit signed integer
            i2: () => this.readBits(2) | (-(this.readBit() & 1)),
            i4: () => this.readBits(4) | (-(this.readBit() & 1)),
            i8: () => this.readBits(8) | (-(this.readBit() & 1)),
            i16: () => this.readBits(16) | (-(this.readBit() & 1)),
            i32: () => this.readBits(32) | (-(this.readBit() & 1)),
            i64: () => this.readBits(64) | (-(this.readBit() & 1)),
            i128: () => this.readBits(128) | (-(this.readBit() & 1)), // 128-bit signed integer
          },
          char: { // Character encoding
            digit: (bits) => bits >= 0 && bits <= 9,     // 0-9 digits
            letter: (bits) => bits >= 10 && bits <= 61,  // a-z, A-Z
            space: (bits) => bits === 62,                // space
            point: (bits) => bits === 63,                // '.'
            symbol: (bits) => bits >= 64 && bits <= 127, // symbols
            unicode: (bits) => bits >= 128,              // Unicode character (extend to handle multibyte chars)
          },
          real: { // Floating-point and decimal numbers
            float: {
              f1: () => this.readBits(1),
              f2: () => this.readBits(2),
              f4: () => this.readBits(4),
              f8: () => this.readBits(8),
              f16: () => this.readBits(16),
              f32: () => this.readBits(32),
              f64: () => this.readBits(64),
              f128: () => this.readBits(128), // 128-bit floating point
            },
            decimal: {
              d1: (places) => parseInt(this.readBits(1), 2) / Math.pow(10, places),
              d2: (places) => parseInt(this.readBits(2), 2) / Math.pow(10, places),
              d4: (places) => parseInt(this.readBits(4), 2) / Math.pow(10, places),
              d8: (places) => parseInt(this.readBits(8), 2) / Math.pow(10, places),
              d16: (places) => parseInt(this.readBits(16), 2) / Math.pow(10, places),
              d32: (places) => parseInt(this.readBits(32), 2) / Math.pow(10, places),
              d64: (places) => parseInt(this.readBits(64), 2) / Math.pow(10, places),
              d128: (places) => parseInt(this.readBits(128), 2) / Math.pow(10, places), // 128-bit decimal
            }
          }
        },
        variable: { // Variable-length structures
          array: () => {
            const length = this.nextToken('some.value.fixed.uint');
            const elements = [];
            for (let i = 0; i < length; i++) {
              elements.push(this.nextToken('some.value.fixed.uint'));
            }
            return elements;
          },
          string: () => {
            const length = this.nextToken('some.value.fixed.uint');
            let result = '';
            for (let i = 0; i < length; i++) {
              result += String.fromCharCode(this.nextToken('some.value.fixed.char'));
            }
            return result;
          },
          list: () => {
            const length = this.nextToken('some.value.fixed.uint');
            const elements = [];
            for (let i = 0; i < length; i++) {
              elements.push(this.nextToken('some.value.variable'));
            }
            return elements;
          },
          object: () => {
            const keys = this.nextToken('some.value.fixed.uint');
            const obj = {};
            for (let i = 0; i < keys; i++) {
              const key = this.nextToken('some.value.variable.string');
              const value = this.nextToken('some.value.variable');
              obj[key] = value;
            }
            return obj;
          },
          code: () => { /* Implementation pending */ },
          set: () => { /* Implementation pending */ },
          map: () => { /* Implementation pending */ },
          bignumber: () => { /* Implementation pending */ },
        }
      }
    }
  },
};
