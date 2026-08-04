export function secureRandomInt(maxExclusive: number): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new Error(`maxExclusive must be a positive integer, got ${maxExclusive}`)
  }
  // rejection sampling으로 modulo bias 제거
  const limit = Math.floor(0x1_0000_0000 / maxExclusive) * maxExclusive
  const buf = new Uint32Array(1)
  let x: number
  do {
    crypto.getRandomValues(buf)
    x = buf[0]
  } while (x >= limit)
  return x % maxExclusive
}

export function drawOne(
  entryCount: number,
  exclude: ReadonlySet<number>,
  randInt: (maxExclusive: number) => number = secureRandomInt,
): number {
  const pool: number[] = []
  for (let n = 1; n <= entryCount; n++) {
    if (!exclude.has(n)) pool.push(n)
  }
  if (pool.length === 0) {
    throw new Error('no numbers left to draw')
  }
  return pool[randInt(pool.length)]
}
