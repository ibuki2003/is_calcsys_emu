import { type Instruction } from "./machine";

function parseReg(reg: string): number {
  if (reg == "a" || reg == "00" || reg == "r0") return 0;
  if (reg == "b" || reg == "01" || reg == "r1") return 1;
  if (reg == "c" || reg == "10" || reg == "r2" || reg == "fp") return 2;
  if (reg == "d" || reg == "11" || reg == "r3" || reg == "sp") return 3;
  throw new Error("invalid register");
}

function parseCnd(cnd: string): number {
  if (cnd == "v" || cnd == "00") return 0;
  if (cnd == "c" || cnd == "01") return 1;
  if (cnd == "z" || cnd == "10") return 2;
  if (cnd == "n" || cnd == "11") return 3;
  throw new Error("invalid condition name");
}

const OFS_REGEX = /^-?(\d+)\[(\w+)\]$/;
export function assemble(line: string): [] | [Instruction, ...number[]] {
  line = line.trim().toLowerCase();

  if (line === "") return [];

  const pos = line.indexOf(" ");
  // let op, args;
  // if (pos === -1) {
  //   op = line;
  //   args = "";
  // } else {
  //   op = line.slice(0, pos);
  //   args = line.slice(pos + 1);
  // }
  const op = pos === -1 ? line : line.slice(0, pos);
  const args = pos === -1 ? "" : line.slice(pos + 1);

  const argv = args.split(",").map(arg => arg.trim());

  switch (op) {
    case "nop":
      return [{ op: "nop" }];
    case "inc":
      if (argv.length !== 1) throw new Error("invalid number of arguments");
      return [{ op: "inc", reg: parseReg(argv[0]) }];
    case "dec":
      if (argv.length !== 1) throw new Error("invalid number of arguments");
      return [{ op: "dec", reg: parseReg(argv[0]) }];
    case "mvlnk":
      if (argv.length !== 1) throw new Error("invalid number of arguments");
      return [{ op: "mvlnk", reg: parseReg(argv[0]) }];
    case "j":
      if (argv.length !== 1) throw new Error("invalid number of arguments");
      return [{ op: "j", reg: parseReg(argv[0]) }];
    case "jlnk":
      if (argv.length !== 1) throw new Error("invalid number of arguments");
      return [{ op: "jlnk", reg: parseReg(argv[0]) }];
    case "in":
      if (argv.length !== 1) throw new Error("invalid number of arguments");
      return [{ op: "in", reg: parseReg(argv[0]) }];
    case "out":
      if (argv.length !== 1) throw new Error("invalid number of arguments");
      return [{ op: "out", reg: parseReg(argv[0]) }];
    case "lshft":
      if (argv.length !== 1) throw new Error("invalid number of arguments");
      return [{ op: "lshft", reg: parseReg(argv[0]) }];
    case "rshft":
      if (argv.length !== 1) throw new Error("invalid number of arguments");
      return [{ op: "rshft", reg: parseReg(argv[0]) }];
    case "and":
      if (argv.length !== 1) throw new Error("invalid number of arguments");
      return [{ op: "and", reg: parseReg(argv[0]) }];
    case "set":
      if (argv.length !== 2) throw new Error("invalid number of arguments");
      return [
        { op: "set", reg: parseReg(argv[0])},
        parseInt(argv[1]) & 0xff,
      ];
    case "mv":
      if (argv.length !== 2) throw new Error("invalid number of arguments");
      return [{ op: "mv", reg1: parseReg(argv[0]), reg2: parseReg(argv[1]) }];
    case "add":
      if (argv.length !== 2) throw new Error("invalid number of arguments");
      return [{ op: "add", reg1: parseReg(argv[0]), reg2: parseReg(argv[1]) }];
    case "sub":
      if (argv.length !== 2) throw new Error("invalid number of arguments");
      return [{ op: "sub", reg1: parseReg(argv[0]), reg2: parseReg(argv[1]) }];
    case "jcnd":
      if (argv.length !== 2) throw new Error("invalid number of arguments");
      return [{ op: "jcnd", cnd: parseCnd(argv[0]), reg: parseReg(argv[1]) }];
    case "jlnkcnd":
      if (argv.length !== 2) throw new Error("invalid number of arguments");
      return [{ op: "jlnkcnd", cnd: parseCnd(argv[0]), reg: parseReg(argv[1]) }];
    case "ld":
    case "st":
      if (argv.length !== 2) throw new Error("invalid number of arguments");
      const m = OFS_REGEX.exec(argv[1]);
      if (!m) throw new Error("invalid address format");
      return [{
        op,
        reg1: parseReg(argv[0]),
        reg2: parseReg(m[2]),
        ofs: Number(m[1])
      }];
    default:
      throw new Error("unknown instruction");
  }
}

function bin(n: number, bits: number): string {
  return n.toString(2).padStart(bits, "0");
}

export function encode(inst: Instruction | number): string {
  if (typeof inst === "number") return bin(inst, 8);
  switch (inst.op) {
    case "nop":     return "00000000";
    case "inc":     return "000001" + bin(inst.reg, 2);
    case "dec":     return "000010" + bin(inst.reg, 2);
    case "mvlnk":   return "000011" + bin(inst.reg, 2);
    case "j":       return "000100" + bin(inst.reg, 2);
    case "jlnk":    return "000101" + bin(inst.reg, 2);
    case "in":      return "000110" + bin(inst.reg, 2);
    case "out":     return "000111" + bin(inst.reg, 2);
    case "lshft":   return "001000" + bin(inst.reg, 2);
    case "rshft":   return "001001" + bin(inst.reg, 2);
    case "and":     return "001010" + bin(inst.reg, 2);
    case "set":     return "001011" + bin(inst.reg, 2);
    case "mv":      return "0011" + bin(inst.reg1, 2) + bin(inst.reg2, 2);
    case "add":     return "0100" + bin(inst.reg1, 2) + bin(inst.reg2, 2);
    case "sub":     return "0101" + bin(inst.reg1, 2) + bin(inst.reg2, 2);
    case "jcnd":    return "0110" + bin(inst.cnd, 2) + bin(inst.reg, 2);
    case "jlnkcnd": return "0111" + bin(inst.cnd, 2) + bin(inst.reg, 2);
    case "ld":      return "10" + bin(inst.ofs, 2) + bin(inst.reg1, 2) + bin(inst.reg2, 2);
    case "st":      return "11" + bin(inst.ofs, 2) + bin(inst.reg1, 2) + bin(inst.reg2, 2);
  }
}

function parseBin(bin: string): number {
  return parseInt(bin, 2);
}

export function decode(inst: string): Instruction {
  if (inst.length !== 8) throw new Error("invalid instruction length");
  const f = inst.split(/(..)/).filter(Boolean);
  switch (f[0]) {
    case "00":
      if (f[1] === "11") return { op: "mv", reg1: parseBin(f[2]), reg2: parseBin(f[3]) };
      switch (f[1] + f[2]) {
        case "0000": return { op: "nop" };
        case "0001": return { op: "inc", reg: parseBin(f[3]) };
        case "0010": return { op: "dec", reg: parseBin(f[3]) };
        case "0011": return { op: "mvlnk", reg: parseBin(f[3]) };
        case "0100": return { op: "j", reg: parseBin(f[3]) };
        case "0101": return { op: "jlnk", reg: parseBin(f[3]) };
        case "0110": return { op: "in", reg: parseBin(f[3]) };
        case "0111": return { op: "out", reg: parseBin(f[3]) };
        case "1000": return { op: "lshft", reg: parseBin(f[3]) };
        case "1001": return { op: "rshft", reg: parseBin(f[3]) };
        case "1010": return { op: "and", reg: parseBin(f[3]) };
        case "1011": return { op: "set", reg: parseBin(f[3]) };
        default: throw new Error("invalid instruction");
      }
    case "01":
      switch (f[1]) {
        case "00": return { op: "add", reg1: parseBin(f[2]), reg2: parseBin(f[3]) };
        case "01": return { op: "sub", reg1: parseBin(f[2]), reg2: parseBin(f[3]) };
        case "10": return { op: "jcnd", cnd: parseBin(f[2]), reg: parseBin(f[3]) };
        case "11": return { op: "jlnkcnd", cnd: parseBin(f[2]), reg: parseBin(f[3]) };
        default: throw new Error("invalid instruction");
      }
    case "10": return { op: "ld", ofs: parseBin(f[1]), reg1: parseBin(f[2]), reg2: parseBin(f[3]) };
    case "11": return { op: "st", ofs: parseBin(f[1]), reg1: parseBin(f[2]), reg2: parseBin(f[3]) };
    default:
      throw new Error("invalid instruction");
  }
}

export function instToString(prog: Instruction | number): string {
  if (typeof prog === "number") return `data ${prog}`;
  switch (prog.op) {
    case "nop":     return "NOP";
    case "inc":     return `INC R${prog.reg}`;
    case "dec":     return `DEC R${prog.reg}`;
    case "mvlnk":   return `MVLNK R${prog.reg}`;
    case "j":       return `J R${prog.reg}`;
    case "jlnk":    return `JLNK R${prog.reg}`;
    case "in":      return `IN R${prog.reg}`;
    case "out":     return `OUT R${prog.reg}`;
    case "lshft":   return `LSHFT R${prog.reg}`;
    case "rshft":   return `RSHFT R${prog.reg}`;
    case "and":     return `AND R${prog.reg}`;
    case "set":     return `SET R${prog.reg}, <imm>`;
    case "mv":      return `MV R${prog.reg1}, R${prog.reg2}`;
    case "add":     return `ADD R${prog.reg1}, R${prog.reg2}`;
    case "sub":     return `SUB R${prog.reg1}, R${prog.reg2}`;
    case "jcnd":    return `Jcnd ${prog.cnd}, R${prog.reg}`;
    case "jlnkcnd": return `JLNKcnd ${prog.cnd}, R${prog.reg}`;
    case "ld":      return `LD R${prog.reg1}, ${-prog.ofs}[R${prog.reg2}]`;
    case "st":      return `ST R${prog.reg1}, ${-prog.ofs}[R${prog.reg2}]`;
  }
}
