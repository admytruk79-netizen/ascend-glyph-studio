export class BitWriter {
  private bits: number[] = [];
  write(value: number, width: number): this {
    if (!Number.isInteger(value) || value < 0 || value >= 2 ** width) throw new Error(`bits: ${value} does not fit in ${width} bits`);
    for (let i = width - 1; i >= 0; i--) this.bits.push(Math.floor(value / 2 ** i) % 2);
    return this;
  }
  bytes(): Uint8Array {
    const out = new Uint8Array(Math.ceil(this.bits.length / 8));
    this.bits.forEach((b, i) => { if (b) out[i >> 3]! |= 0x80 >> (i & 7); });
    return out;
  }
  get length() { return this.bits.length; }
}

export class BitReader {
  private pos = 0;
  constructor(private readonly buf: Uint8Array) {}
  read(width: number): number {
    let v = 0;
    for (let i = 0; i < width; i++, this.pos++) {
      const byte = this.buf[this.pos >> 3];
      if (byte === undefined) throw new Error("bits: read past end");
      v = v * 2 + ((byte >> (7 - (this.pos & 7))) & 1);
    }
    return v;
  }
}
