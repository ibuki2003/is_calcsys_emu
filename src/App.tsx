import { useMemo, useState, useReducer, useEffect } from 'react'
import './App.scss'
import { parseAsm, encode, instToString, assemble } from './asm'
import { Machine } from './machine';
import xxd from './xxd';

const EXAMPLE_PROGRAM = `\
set r0, 0
in r1
out r1
j r0
`;


function App() {
  const machine = useMemo(() => new Machine(), []);
  const [program, setProgram] = useState(EXAMPLE_PROGRAM);
  const [input, setInput] = useState("");
  const [prog, hasError] = useMemo(() => {
    let hasError = false;
    const lines = program.split("\n");
    const prog = lines.map(line => {
      try {
        return parseAsm(line);
      } catch (e) {
        hasError = true;
        return "error: " + (e as any).message;
      }
    });
    return [prog, hasError];
  }, [program]);

  const [_rendertoken, rerender] = useReducer(x => x + 1, 0);

  const [highlights, setHighlights] = useState<number>(0);

  const [speed, setSpeed] = useState(500);
  const [running, setRunning] = useState<boolean>(false);

  const step = () => {
    try {
      machine.step();
      rerender();
    } catch (e) {
      if (running) {
        setRunning(false);
      }
      alert(e);
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (running) {
      const itv = Math.max(1, speed);
      const rpt = speed > 0 ? 1 : (-speed + 1);
      const timer = setInterval(() => {
        for (let i = 0; i < rpt; i++) {
          if (!step()) break;
        }
      }, itv);
      return () => clearInterval(timer);
    }
  }, [running, speed]);



  return (
    <>
      <h1>机上計算機 シミュレーター</h1>
      <div id="ui">
        <div id="programinput">
          <div className="wrap">
            <textarea
              rows={20}
              value={program}
              onChange={e => setProgram(e.target.value)}
            ></textarea>
            <div style={{whiteSpace: "pre"}}>
              {prog.map(inst => (
                inst === null ? "" :
              (typeof inst === "string")
                ? inst
                : inst.map(encode).join(" "))).join("\n") }
            </div>
          </div>
        </div>
        <div id="control">
          <p>
            <textarea value={input} onChange={e => setInput(e.target.value)}></textarea>
          </p>
          <button
            onClick={() => {
              try {
                const p = prog.filter(x => typeof x !== "string").flat();
                machine.reset(assemble(p), input);
                setRunning(false);
                rerender();
              } catch (e) {
                alert(e);
              }
            }}
            disabled={hasError}
          >start / reset</button>

          <button
            onClick={() => {
              try {
                step();
              } catch (e) {
                alert(e);
              }
            }}
          >step</button>

          <p>
            <input
              type="number"
              min={-100}
              max={10000}
              value={speed}
              disabled={running}
              onChange={e => setSpeed(parseInt(e.target.value))}
            />
            {!running ? (
              <button
                onClick={() => {
                  setRunning(true);
                  step(); // start immediately
                }}
              >start</button>
            ) : (
              <button
                onClick={() => {
                  // clearInterval(running);
                  // setRunning(null);
                  setRunning(false);
                }}
              >stop</button>
            )}
            <small>interval in ms. negative value to super fast</small>
          </p>

          <h3>Hightlight reg</h3>
          <p>
            {['R0', 'R1', 'R2', 'R3', 'LNK'].map((name, i) => (
              <>
                <input type="checkbox" onChange={e => {
                  if (e.target.checked) {
                    setHighlights(h => h | (1 << i));
                  } else {
                    setHighlights(h => h & ~(1 << i));
                  }
                }} checked={(highlights & (1 << i)) != 0} key={i} id={`highlight_${name}_check`} />
                <label htmlFor={`highlight_${i}_check`}>{name}</label>
              </>
            ))}
          </p>



        </div>
        <div id="machine">
          <section id="program">
            <h3>Program</h3>
            <div className="scroll">
              <table>
                <tbody>
                  {machine.program.map((inst, i) => {
                    const classes = [];
                    if (i === machine.pc) classes.push("running-row");
                    if (highlights & (1 << 4) && machine.lnk === i) classes.push("highlight-lnk");
                    return (
                      <tr key={i} className={classes.join(" ")}>
                        <th>{i}</th>
                        <td>{encode(inst)}</td>
                        <td>{instToString(inst)}</td>
                      </tr>
                    )})}
                </tbody>
              </table>
            </div>
          </section>
          <section id="registers">
            <h3>Registers</h3>
            <table>
              <tbody>
                <tr><th>PC</th><td>{machine.pc}</td></tr>
                <tr><th>LNK</th><td>{machine.lnk}</td></tr>
                {machine.regs.map((r, i) => ( <tr key={i}> <th>R{i}</th> <td>{r}</td> </tr>))}
                <tr><th>FLAG</th><td>
                  {machine.flag & 8 ? "N" : "-"}
                  {machine.flag & 4 ? "Z" : "-"}
                  {machine.flag & 2 ? "C" : "-"}
                  {machine.flag & 1 ? "V" : "-"}
                </td></tr>
              </tbody>
            </table>
          </section>
          <section id="memorymap">
            <h3>Memory Map</h3>

            <table>
              <tbody>
                <tr>
                  <th></th>
                  {Array.from({length: 16}, (_, i) => <th key={i}>{i.toString(16)}</th>)}
                </tr>
                {Array.from({length: 16}, (_, i) => (
                  <tr key={i}>
                    <th>{i.toString(16)}0</th>
                    {Array.from({length: 16}, (_, j) => {
                      const value = machine.memory[i * 16 + j];
                      const classes = [];
                      if (value === 0) classes.push("zero");

                      for (let k = 0; k < 4; k++) {
                        if ((highlights & (1 << k)) && machine.regs[k] === i * 16 + j) classes.push("highlight");
                      }
                      return (<td
                        key={j}
                        className={classes.join(" ")}
                      >
                        {value.toString(16).padStart(2, "0")}
                      </td>);
                    })}
                  </tr>
                ))}
                </tbody>
            </table>
          </section>

          <section id="io">
            <h3>In/Out</h3>
            <h4>Input Buffer</h4>
            <code>{xxd(machine.input.slice(machine.inputpos))}</code>
            <h4>Output</h4>
            <code>{xxd(machine.output)}</code>
          </section>

        </div>
      </div>
      <div>
        <h2>説明</h2>
        <p><a href="https://github.com/ibuki2003/is_calcsys_emu">GitHub Repo</a></p>
        <p>
          「計算機システム」の「机上計算機」のシミュレーターです。
        </p>
        <p>
          命令セットは資料の通り。<br />
          レジスタ指定は R0~R3, A~D, 00~11 のどれでも可。<br />
          条件指定は V, C, Z, N または 00, 01, 10, 11 が使えます。<br />
        </p>
        <p>
          未実装・実装予定の機能:
        </p>
        <ul>
          <li><b>コンディションコードVの動作の詳細が不明のため未実装</b></li>
          <li>Memory Mapに色をつける (お絵描きがしたい)</li>
          <li>命令拡張</li>
          <li>Undo</li>
          <li>スタックポインタをわかりやすく表示</li>
          <li>(バグ)プログラム入力画面がずれる</li>
        </ul>
      </div>
    </>
  )
}

export default App
