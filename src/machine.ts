import { AsmInstruction, decode, encode } from "./asm";

export type Instruction = (
  | { op: "nop" }
  | { op: "inc", reg: number }
  | { op: "dec", reg: number }
  | { op: "mvlnk", reg: number }
  | { op: "j", reg: number }
  | { op: "jlnk", reg: number }
  | { op: "in", reg: number }
  | { op: "out", reg: number }
  | { op: "lshft", reg: number }
  | { op: "rshft", reg: number }
  | { op: "and", reg: number }
  | { op: "set", reg: number }
  | { op: "mv", reg1: number, reg2: number }
  | { op: "add", reg1: number, reg2: number }
  | { op: "sub", reg1: number, reg2: number }
  | { op: "jcnd", cnd: number, reg: number }
  | { op: "jlnkcnd", cnd: number, reg: number }
  | { op: "ld", reg1: number, reg2: number, ofs: number }
  | { op: "st", reg1: number, reg2: number, ofs: number }
  | { imm: number }
);

const FLAG_V = 1;
const FLAG_C = 2;
const FLAG_Z = 4;
const FLAG_N = 8;

export class Machine {
  program: Instruction[] = [];
  progmem: string[] = [];
  memory: number[] = new Array(256).fill(0);
  pc = 0;
  regs = new Array(4).fill(0);
  flag = 0;
  lnk = 0;

  input: number[] = [];
  inputpos = 0;
  output: number[] = [];

  constructor() {
  }

  set_flag(flag: number, v: boolean) {
    if (v) {
      this.flag |= flag;
    } else {
      this.flag &= ~flag;
    }
  }

  reset(program: Instruction[], input: string): void {
    this.pc = 0;
    this.flag = 0;
    this.lnk = 0;
    this.regs.fill(0);
    this.memory.fill(0);

    this.input = Array.from(new TextEncoder().encode(input));
    this.inputpos = 0;
    this.output = [];

    this.program = program;
    this.progmem = program.map(encode).filter(Boolean) as string[];
  }

  __fetchInput(): number {
    if (this.inputpos >= this.input.length) {
      return 0;
    } else {
      return this.input[this.inputpos++];
    }
  }

  step(): void {
    const bin = this.progmem[this.pc];
    if (bin === undefined) {
      throw new Error("out of program");
    }
    const inst = decode(bin);

    // NOTE: unreachable
    if ("imm" in inst) return;

    switch (inst.op) {
      case "nop": break;
      case "inc":
        this.regs[inst.reg] = (this.regs[inst.reg] + 1) & 0xff;
        this.set_flag(FLAG_Z | FLAG_C, this.regs[inst.reg] === 0);
        this.set_flag(FLAG_N, (this.regs[inst.reg] & 0x80) != 0);
        break;
      case "dec":
        this.regs[inst.reg] = (this.regs[inst.reg] + 0xff) & 0xff;
        this.set_flag(FLAG_Z, this.regs[inst.reg] === 0);
        this.set_flag(FLAG_C, this.regs[inst.reg] === 0xff);
        this.set_flag(FLAG_N, (this.regs[inst.reg] & 0x80) != 0);
        break;
      case "mvlnk": this.regs[inst.reg] = this.lnk; break;
      case "j": this.pc = this.regs[inst.reg]; return;
      case "jlnk":
        this.lnk = (this.pc + 1) % this.progmem.length;
        this.pc = this.regs[inst.reg];
        return;
      case "in":
        this.regs[inst.reg] = this.__fetchInput();
        this.set_flag(FLAG_Z, this.regs[inst.reg] === 0);
        this.set_flag(FLAG_N, (this.regs[inst.reg] & 0x80) != 0);
        break;
      case "out": this.output.push(this.regs[inst.reg]); break;
      case "lshft":
        this.regs[inst.reg] = (this.regs[inst.reg] << 1) & 0xff;
        this.set_flag(FLAG_Z, this.regs[inst.reg] === 0);
        this.set_flag(FLAG_N, (this.regs[inst.reg] & 0x80) != 0);
        break;
      case "rshft":
        this.regs[inst.reg] = (this.regs[inst.reg] >> 1) & 0xff;
        this.set_flag(FLAG_Z, this.regs[inst.reg] === 0);
        this.set_flag(FLAG_N, (this.regs[inst.reg] & 0x80) != 0);
        break;
      case "and":
        this.regs[(inst.reg + 1) % 4] = this.regs[inst.reg] & this.regs[(inst.reg + 1) % 4];
        this.set_flag(FLAG_Z, this.regs[(inst.reg + 1) % 4] === 0);
        this.set_flag(FLAG_N, (this.regs[inst.reg] & 0x80) != 0);
        break;
      case "set":
        const value = parseInt(this.progmem[(this.pc + 1) % this.progmem.length], 2);
        this.regs[inst.reg] = value;
        this.pc = (this.pc + 2) % this.progmem.length;
        return; // early return
      case "mv": this.regs[inst.reg1] = this.regs[inst.reg2]; break;
      case "add":
        const sum = this.regs[inst.reg1] + this.regs[inst.reg2];
        this.regs[inst.reg1] = sum & 0xff;
        this.set_flag(FLAG_Z, this.regs[inst.reg1] === 0);
        this.set_flag(FLAG_C, sum > 0xff);
        this.set_flag(FLAG_N, (this.regs[inst.reg1] & 0x80) != 0);
        break;
      case "sub":
        const diff = this.regs[inst.reg1] - this.regs[inst.reg2];
        this.regs[inst.reg1] = (diff + 0x100) & 0xff;
        this.set_flag(FLAG_Z, this.regs[inst.reg1] === 0);
        this.set_flag(FLAG_C, diff < 0);
        this.set_flag(FLAG_N, (this.regs[inst.reg1] & 0x80) != 0);
        break;
      case "jcnd":
        if (this.flag & (1 << inst.cnd))
          this.pc = this.regs[inst.reg];
        else
          this.pc = (this.pc + 1) % this.progmem.length;
        return;
      case "jlnkcnd":
        if (this.flag & (1 << inst.cnd)) {
          this.lnk = (this.pc + 1) % this.progmem.length;
          this.pc = this.regs[inst.reg];
        } else
          this.pc = (this.pc + 1) % this.progmem.length;
        return;
      case "ld":
        this.regs[inst.reg1] = this.memory[(this.regs[inst.reg2] - inst.ofs) & 0xff];
        this.set_flag(FLAG_Z, this.regs[inst.reg1] === 0);
        this.set_flag(FLAG_N, (this.regs[inst.reg1] & 0x80) != 0);
        break;
      case "st":
        this.memory[(this.regs[inst.reg2] - inst.ofs) & 0xff] = this.regs[inst.reg1];
    }
    this.pc += 1;
  }
}



