export class BigMath {
  static abs(n: bigint) {
    return n < 0n ? -n : n;
  }
}
