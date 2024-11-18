import { decode, encode } from "./asm";

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
);

export class Machine {
  program: (Instruction | number)[] = [];
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

  reset(program: (Instruction | number)[], input: string): void {
    this.pc = 0;
    this.flag = 0;
    this.lnk = 0;
    this.regs.fill(0);
    this.memory.fill(0);

    this.input = Array.from(new TextEncoder().encode(input));
    this.inputpos = 0;
    this.output = [];

    this.program = program;
    this.progmem = program.flatMap(encode);
  }

  __fetchInput(): number {
    if (this.inputpos >= this.input.length) {
      return 0;
    } else {
      return this.input[this.inputpos++];
    }
  }

  step(): void {
    console.log(this);
    const bin = this.progmem[this.pc];
    if (bin === undefined) {
      // console.warn("out of program");
      alert("out of program");
      return;
    }
    const inst = decode(bin);

    switch (inst.op) {
      case "nop": break;
      case "inc": this.regs[inst.reg] = (this.regs[inst.reg] + 1) & 0xff; break;
      case "dec": this.regs[inst.reg] = (this.regs[inst.reg] + 0xff) & 0xff; break;
      case "mvlnk": this.regs[inst.reg] = this.lnk; break;
      case "j": this.pc = this.regs[inst.reg]; return;
      case "jlnk":
        this.lnk = (this.pc + 1) % this.progmem.length;
        this.pc = this.regs[inst.reg];
        return;
      case "in": this.regs[inst.reg] = this.__fetchInput(); break;
      case "out": this.output.push(this.regs[inst.reg]); break;
      case "lshft": this.regs[inst.reg] = (this.regs[inst.reg] << 1) & 0xff; break;
      case "rshft": this.regs[inst.reg] = (this.regs[inst.reg] >> 1) & 0xff; break;
      case "and": this.regs[(inst.reg + 1) % 4] = this.regs[inst.reg] & this.regs[(inst.reg + 1) % 4]; break;
      case "set":
        const value = parseInt(this.progmem[(this.pc + 1) % this.progmem.length], 2);
        this.regs[inst.reg] = value;
        this.pc = (this.pc + 2) % this.progmem.length;
        return; // early return
      case "mv": this.regs[inst.reg1] = this.regs[inst.reg2]; break;
      case "add": this.regs[inst.reg1] = (this.regs[inst.reg1] + this.regs[inst.reg2]) & 0xff; break;
      case "sub": this.regs[inst.reg1] = (this.regs[inst.reg1] - this.regs[inst.reg2] + 0x100) & 0xff; break;
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
        break;
      case "st":
        this.memory[(this.regs[inst.reg2] - inst.ofs) & 0xff] = this.regs[inst.reg1];
    }
    this.pc = (this.pc + 1) % this.progmem.length;
  }
}



