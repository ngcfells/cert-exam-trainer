// SHA-512/256 (FIPS 180-4). The browser's Web Crypto has no SHA-512/256, so the content check carries its own.
// 64-bit words are kept as two 32-bit halves (high, low) so megabytes of content hash quickly on a phone.

const TWO32 = 4294967296;

/** Integer cube root, rounded down. */
function icbrt(n: bigint): bigint {
  let x = 1n << BigInt(Math.ceil(n.toString(2).length / 3));
  for (;;) {
    const y = (2n * x + n / (x * x)) / 3n;
    if (y >= x) return x;
    x = y;
  }
}

function firstPrimes(count: number): number[] {
  const out: number[] = [];
  for (let n = 2; out.length < count; n++) if (out.every((p) => n % p !== 0)) out.push(n);
  return out;
}

// The round constants are the first 64 bits of the fractional parts of the cube roots of the first 80 primes.
// Worked out once on load, which is exact and avoids 80 hand-typed numbers.
const K = new Uint32Array(160);
firstPrimes(80).forEach((p, i) => {
  const k = icbrt(BigInt(p) << 192n) & 0xffffffffffffffffn;
  K[2 * i] = Number(k >> 32n);
  K[2 * i + 1] = Number(k & 0xffffffffn);
});

// The SHA-512/256 initial hash value, as high and low halves.
const IV = [
  0x22312194, 0xfc2bf72c, 0x9f555fa3, 0xc84c64c2, 0x2393b86b, 0x6f53b151, 0x96387719, 0x5940eabd,
  0x96283ee2, 0xa88effe3, 0xbe5e1e25, 0x53863992, 0x2b0199fc, 0x2c85b8aa, 0x0eb72ddc, 0x81c52ca2,
];

function block(h: Uint32Array, w: Uint32Array, p: Uint8Array, o: number): void {
  for (let i = 0; i < 32; i++) {
    const j = o + i * 4;
    w[i] = ((p[j] << 24) | (p[j + 1] << 16) | (p[j + 2] << 8) | p[j + 3]) >>> 0;
  }
  for (let i = 32; i < 160; i += 2) {
    const xh = w[i - 30];
    const xl = w[i - 29];
    const s0h = ((xh >>> 1) | (xl << 31)) ^ ((xh >>> 8) | (xl << 24)) ^ (xh >>> 7);
    const s0l = ((xl >>> 1) | (xh << 31)) ^ ((xl >>> 8) | (xh << 24)) ^ ((xl >>> 7) | (xh << 25));
    const yh = w[i - 4];
    const yl = w[i - 3];
    const s1h = ((yh >>> 19) | (yl << 13)) ^ ((yl >>> 29) | (yh << 3)) ^ (yh >>> 6);
    const s1l = ((yl >>> 19) | (yh << 13)) ^ ((yh >>> 29) | (yl << 3)) ^ ((yl >>> 6) | (yh << 26));
    const lo = (s0l >>> 0) + (s1l >>> 0) + w[i - 13] + w[i - 31];
    w[i + 1] = lo;
    w[i] = s0h + s1h + w[i - 14] + w[i - 32] + Math.floor(lo / TWO32);
  }

  let ah = h[0], al = h[1], bh = h[2], bl = h[3], ch = h[4], cl = h[5], dh = h[6], dl = h[7];
  let eh = h[8], el = h[9], fh = h[10], fl = h[11], gh = h[12], gl = h[13], hh = h[14], hl = h[15];

  for (let i = 0; i < 160; i += 2) {
    const S1h = ((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((el >>> 9) | (eh << 23));
    const S1l = ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((eh >>> 9) | (el << 23));
    const chh = (eh & fh) ^ (~eh & gh);
    const chl = (el & fl) ^ (~el & gl);
    const t1l = hl + (S1l >>> 0) + (chl >>> 0) + K[i + 1] + w[i + 1];
    const t1h = (hh + S1h + chh + K[i] + w[i] + Math.floor(t1l / TWO32)) | 0;
    const T1l = t1l >>> 0;

    const S0h = ((ah >>> 28) | (al << 4)) ^ ((al >>> 2) | (ah << 30)) ^ ((al >>> 7) | (ah << 25));
    const S0l = ((al >>> 28) | (ah << 4)) ^ ((ah >>> 2) | (al << 30)) ^ ((ah >>> 7) | (al << 25));
    const mjh = (ah & bh) ^ (ah & ch) ^ (bh & ch);
    const mjl = (al & bl) ^ (al & cl) ^ (bl & cl);
    const t2l = (S0l >>> 0) + (mjl >>> 0);
    const t2h = (S0h + mjh + Math.floor(t2l / TWO32)) | 0;

    hh = gh; hl = gl; gh = fh; gl = fl; fh = eh; fl = el;
    const e = dl + T1l;
    el = e >>> 0;
    eh = (dh + t1h + Math.floor(e / TWO32)) | 0;
    dh = ch; dl = cl; ch = bh; cl = bl; bh = ah; bl = al;
    const a = T1l + (t2l >>> 0);
    al = a >>> 0;
    ah = (t1h + t2h + Math.floor(a / TWO32)) | 0;
  }

  const add = (i: number, hi: number, lo: number) => {
    const s = h[i + 1] + lo;
    h[i + 1] = s;
    h[i] = h[i] + hi + Math.floor(s / TWO32);
  };
  add(0, ah, al); add(2, bh, bl); add(4, ch, cl); add(6, dh, dl);
  add(8, eh, el); add(10, fh, fl); add(12, gh, gl); add(14, hh, hl);
}

/** The SHA-512/256 digest of `bytes`, as 64 lower-case hex characters. */
export function sha512_256(bytes: Uint8Array): string {
  const h = Uint32Array.from(IV);
  const w = new Uint32Array(160);
  const full = bytes.length - (bytes.length % 128);
  for (let o = 0; o < full; o += 128) block(h, w, bytes, o);

  // The last partial block, the 0x80 marker and the message length in bits (big-endian, in the last 16 bytes).
  const rest = bytes.length - full;
  const tail = new Uint8Array(rest + 17 <= 128 ? 128 : 256);
  tail.set(bytes.subarray(full));
  tail[rest] = 0x80;
  const view = new DataView(tail.buffer);
  view.setUint32(tail.length - 8, Math.floor(bytes.length / 0x20000000));
  view.setUint32(tail.length - 4, (bytes.length << 3) >>> 0);
  for (let o = 0; o < tail.length; o += 128) block(h, w, tail, o);

  let hex = '';
  for (let i = 0; i < 8; i++) hex += h[i].toString(16).padStart(8, '0');
  return hex;
}

/** The SHA-512/256 digest of `text` encoded as UTF-8. */
export function hashText(text: string): string {
  return sha512_256(new TextEncoder().encode(text));
}
