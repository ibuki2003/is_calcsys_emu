function xxd(b: number[]): string {
  let s = " ".repeat(4 + 16 * 3 + 2 + 16 + 1) + "\n";
  for (let i = 0; i < b.length; i += 16) {
    let hex = b.slice(i, i + 16).map(x => x.toString(16).padStart(2, "0")).join(" ");
    hex = hex.padEnd(48, " ");
    const ascii = b.slice(i, i + 16).map(x => x >= 32 && x < 127 ? String.fromCharCode(x) : ".").join("");

    s += `${i.toString(16).padStart(4, "0")}: ${hex} ${ascii}\n`;
  }
  return s;
}

export default xxd;
