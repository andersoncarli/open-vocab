const stateMachineGrammar = {
  start: {
    none: () => 0, // 0.
    some: {        // 1.
      level: {     // 1.0
        down: () => { while (this.readBit() === 0 && this.level > 0) this.level--; }, // 1.0.0 some.level.down
        up: () => { while (this.readBit() === 1 && this.level < this.maxLevel) this.level++; }, // 1.0.1 some.level.up
      },
      value: {       // 1.1
        fixed: {     // 1.1.0
          number: {  // 1.1.0.0
            uint: {  // 1.1.0.00 Unsigned Integers
              u1: () => this.readBits(1),
              u2: () => this.readBits(2),
              u4: () => this.readBits(4),
              u8: () => this.readBits(8),
              u16: () => this.readBits(16),
              u32: () => this.readBits(32),
              u64: () => this.readBits(64),
              u128: () => this.readBits(128),
            },
            int: {   // 1.1.0.01 Signed integers
              i1: () => this.readBits(1) | (-(this.readBit() & 1)),   // 1-bit signed integer
              i2: () => this.readBits(2) | (-(this.readBit() & 1)),
              i4: () => this.readBits(4) | (-(this.readBit() & 1)),
              i8: () => this.readBits(8) | (-(this.readBit() & 1)),
              i16: () => this.readBits(16) | (-(this.readBit() & 1)),
              i32: () => this.readBits(32) | (-(this.readBit() & 1)),
              i64: () => this.readBits(64) | (-(this.readBit() & 1)),
              i128: () => this.readBits(128) | (-(this.readBit() & 1)), // 128-bit signed integer
            },
            char: {  // 1.1.0.10 Character encoding
              digit: (bits) => bits >= 0 && bits <= 9,     // 0-9 digits
              letter: (bits) => bits >= 10 && bits <= 61,  // a-z, A-Z
              space: (bits) => bits === 62,                // space
              point: (bits) => bits === 63,                // '.'
              symbol: (bits) => bits >= 64 && bits <= 127, // symbols
              unicode: (bits) => bits >= 128,              // Unicode character (extend to handle multibyte chars)
            },
            real: { // 1.1.0.11 Floating-point and decimal numbers
              float: { // 1.1.0.11.0
                f16: () => this.readBits(16),
                f32: () => this.readBits(32),
                f64: () => this.readBits(64),
                f128: () => this.readBits(128), // 128-bit floating point
              },
              decimal: { // 1.1.0.11.1
                d16: (places) => parseInt(this.readBits(16), 2) / Math.pow(10, places),
                d32: (places) => parseInt(this.readBits(32), 2) / Math.pow(10, places),
                d64: (places) => parseInt(this.readBits(64), 2) / Math.pow(10, places),
                d128: (places) => parseInt(this.readBits(128), 2) / Math.pow(10, places), // 128-bit decimal
              }
            }
          },
          type: {    // 1.1.0.1.xxx

          }
        },
        variable: { // 1.1.1 Variable-length structures
          array: () => { // 1.1.1.00
            const length = this.nextToken('fixed.number.uint');
            const elements = [];
            for (let i = 0; i < length; i++) {
              elements.push(this.nextToken('fixed.number.uint'));
            }
            return elements;
          },
          string: () => { // 1.1.1.01
            const length = this.nextToken('fixed.number.uint');
            let result = '';
            for (let i = 0; i < length; i++) {
              result += String.fromCharCode(this.nextToken('char'));
            }
            return result;
          },
          list: () => { // 1.1.1.10
            const length = this.nextToken('uint');
            const elements = [];
            for (let i = 0; i < length; i++) {
              elements.push(this.nextToken('variable'));
            }
            return elements;
          },
          object: () => { // 1.1.1.11
            const keys = this.nextToken('fixed.uint');
            const obj = {};
            for (let i = 0; i < keys; i++) {
              const key = this.nextToken('variable.string');
              const value = this.nextToken('variable');
              obj[key] = value;
            }
            return obj;
          },
          set: () => { /* Implementation pending */ },
          map: () => { /* Implementation pending */ },
          bignumber: () => { /* Implementation pending */ },
        }
      }
    }
  },
};
