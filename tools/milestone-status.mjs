/** Historical claims must be inside explicitly delimited superseded blocks. */
export function validateMilestoneStatus(text, phase) {
  let historical = false;
  const current = [];
  for (const [index, line] of text.split('\n').entries()) {
    if (line.trim() === '<!-- historical/superseded:start -->') {
      if (historical) throw new Error('Nested milestone history block');
      historical = true; continue;
    }
    if (line.trim() === '<!-- historical/superseded:end -->') {
      if (!historical) throw new Error('Unmatched milestone history end');
      historical = false; continue;
    }
    if (historical) continue;
    current.push(line);
    if (phase === 'M3' && /未实施\s*M3|只实施\s*M2|M2\s*可以开始|不进入\s*M3/.test(line))
      throw new Error(`Contradictory current milestone at line ${index + 1}: ${line}`);
  }
  if (historical) throw new Error('Unclosed milestone history block');
  const headers = current.join('\n').match(/当前：M\d+/g) ?? [];
  if (headers.length !== 1 || headers[0] !== `当前：${phase}`)
    throw new Error(`Milestone must declare exactly one current phase ${phase}`);
}
