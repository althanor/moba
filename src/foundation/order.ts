/** Stable merge sort with a portable element-read proof. No engine sort dependency. */
export function stableMergeSort<T>(items: readonly T[], compare: (a: T, b: T) => number, visit: (count: number) => void = () => {}): T[] {
  visit(items.length); let source = items.slice();
  for (let width = 1; width < source.length; width *= 2) {
    const output: T[] = [];
    for (let start = 0; start < source.length; start += width * 2) {
      const middle = Math.min(start + width, source.length), end = Math.min(start + width * 2, source.length); let a = start, b = middle;
      while (a < middle || b < end) {
        if (a < middle && b < end) {
          visit(2); const left = source[a], right = source[b]; if (left === undefined || right === undefined) throw new Error('ordering index');
          if (compare(left, right) <= 0) { output.push(left); a++; } else { output.push(right); b++; }
        } else { visit(1); const value = source[a < middle ? a++ : b++]; if (value === undefined) throw new Error('ordering tail'); output.push(value); }
      }
    }
    source = output;
  }
  return source;
}
