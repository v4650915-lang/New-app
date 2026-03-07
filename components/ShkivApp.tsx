import React, { useState } from 'react';

interface ShkivAppProps {
    onBack: () => void;
}

export default function ShkivApp({ onBack }: ShkivAppProps) {
    const [mater, setMater] = useState(55);
    const [a, setA] = useState('90'); // D1
    const [b2, setB2] = useState('0'); // D2
    const [hh, setHh] = useState('15'); // H
    const [aa, setAa] = useState('36'); // A
    const [d, setD] = useState('20'); // L
    const [r1, setR1] = useState('1');
    const [r2, setR2] = useState('1');
    const [r3, setR3] = useState('0.4');
    const [q, setQ] = useState('3'); // W
    const [b, setB] = useState('122'); // X start
    const [c, setC] = useState('-40'); // Z start
    const [i, setI] = useState('0.06'); // F

    const [gcode, setGcode] = useState<React.ReactNode | null>(null);
    const [copied, setCopied] = useState(false);

    const handleBlur = (val: string, setter: (v: string) => void) => {
        if (val.trim() === '' || val === '-') setter('0');
    };

    const calculate = () => {
        const pi = Math.PI;
        let p_a = Number(a);
        let p_b = Number(b);
        let p_c = Number(c);
        let p_d = Number(d);
        let p_q = Number(q);
        let p_Aa = Number(aa);
        let p_Hh = Number(hh);
        let p_i = Number(i);
        let p_r1 = Number(r1);
        let p_r2 = Number(r2);
        let p_r3 = Number(r3);
        let p_b2 = Number(b2);
        let Mater = mater;

        p_Aa = 90 * 1 - p_Aa / 2;
        let Rb = (p_r3 * 1 - p_r3 * (Math.sin((((p_Aa * 1) * pi) / 180)))) * 2;

        p_c = p_c * 1 - Rb * 1;
        p_d = (p_d * 1 - p_q * 1) + Rb * 1;
        p_r1 = p_r1 * 1 + p_r3 * 1;
        p_r2 = p_r2 * 1 - p_r3 * 1;

        if (p_r2 <= 0) p_r2 = 0.004;
        if (p_r1 <= 0) p_r1 = 0.004;
        if (p_b2 > 0 && 0 < p_Hh && p_a === 0) p_a = p_b2 * 1 - p_Hh * 2;
        if (p_b2 > 0 && 0 < p_a && p_Hh === 0) p_Hh = (p_b2 * 1 - p_a * 1) / 2;
        if (0 < p_a && p_Hh > 0 && p_b2 === 0) p_b2 = p_a * 1 + p_Hh * 2;

        let s = Math.round(parseFloat(((Mater * 1000) / ((1 * p_a) * 3.14)) as any) * 1) / 1;

        if (!(p_Aa > 0 && p_d > 0 && p_a > 0)) {
            alert('Пожалуйста, проверьте введённые значения.');
            return;
        }

        let Ra = p_Hh * (Math.tan((((1 * 90 - p_Aa * 1) * pi) / 180)));
        //let Rc = p_Hh / (Math.sin(((p_Aa * pi) / 180)));
        let dZ1 = p_c * 1 + Ra * 1;
        let dZ3 = (p_c * 1 + (p_d * 1 - Ra * 1));

        let Rx1 = (p_a * 1 + p_Hh * 2);
        let Rz1 = p_c * 1 - p_r1 * (Math.tan((((p_Aa / 2) * pi) / 180)));
        let Rx2 = (p_a * 1 + p_Hh * 2) - (p_r1 * 1 - p_r1 * (Math.sin((((90 * 1 - 1 * p_Aa) * pi) / 180)))) * 2;
        let Rz2 = Rz1 * 1 + p_r1 * (Math.cos((((90 * 1 - 1 * p_Aa) * pi) / 180)));

        let Rx3 = (p_a * 1) + (p_r2 * 1 - p_r2 * (Math.sin((((90 * 1 - 1 * p_Aa) * pi) / 180)))) * 2;
        let Rz3 = (p_r2 * 1 - p_r2 * (Math.sin((((90 * 1 - 1 * p_Aa) * pi) / 180))));
        Rz3 = dZ1 * 1 - Rz3 * (Math.tan((((90 * 1 - 1 * p_Aa) * pi) / 180)));

        let Rx4 = (p_a * 1);
        let Rz4 = dZ1 * 1 + p_r2 * (Math.tan((((p_Aa / 2) * pi) / 180)));

        let Rx5 = (p_a * 1);
        let Rz5 = dZ3 * 1 - p_r2 * (Math.tan((((p_Aa / 2) * pi) / 180)));

        let Rx6 = (p_a * 1) + (p_r2 * 1 - p_r2 * (Math.sin((((90 * 1 - 1 * p_Aa) * pi) / 180)))) * 2;
        let Rz6 = (p_r2 * 1 - p_r2 * (Math.sin((((90 * 1 - 1 * p_Aa) * pi) / 180))));
        Rz6 = dZ3 * 1 + Rz6 * (Math.tan((((90 * 1 - 1 * p_Aa) * pi) / 180)));

        let Rx8 = (p_a * 1 + p_Hh * 2);
        let Rz8 = (p_c * 1 + p_d * 1) + p_r1 * (Math.tan((((p_Aa / 2) * pi) / 180)));

        let Rx7 = (p_a * 1 + p_Hh * 2) - (p_r1 * 1 - p_r1 * (Math.sin((((90 * 1 - 1 * p_Aa) * pi) / 180)))) * 2;
        let Rz7 = Rz8 * 1 - p_r1 * (Math.cos((((90 * 1 - 1 * p_Aa) * pi) / 180)));

        let G75 = (Ra * 1) / (p_q / 3);
        let G7 = (p_q / 3);
        let DELTAA = 0;
        let DELTA2X = p_b2 * 1;
        let DELTA1X = p_b * 1;
        let DELTA1Z = p_c * 1;

        let msg2: React.ReactNode[] = [];
        let keyCounter = 0;

        while ((DELTA2X * 1) > (p_a * 1)) {
            DELTA1X = (p_b * 1) - DELTAA * 1;
            DELTA1Z = p_c * 1 + G7 * 1;
            DELTA2X = (p_a * 1 + p_Hh * 2) - (G7 / (Math.tan((((1 * 90 - p_Aa * 1) * pi) / 180)))) * 2;
            let DELTA2Z = p_c * 1 + (p_d * 1 - G7 * 1);
            DELTAA = (G7 / (Math.tan((((1 * 90 - p_Aa * 1) * pi) / 180)))) * 2;

            G75 = G75 * 1 - (p_q / 3);
            G7 = G7 * 1 + (p_q / 3);

            if ((DELTA2X * 1) < (p_a * 1)) {
                DELTA2X = p_a * 1;
                G75 = (p_q / 4);
            } else {
                msg2.push(
                    <React.Fragment key={keyCounter++}>
                        <span className="text-red-500">G0 X{(Math.round(DELTA1X * 10000) / 10000)} Z{(Math.round((DELTA1Z + 0.05) * 10000) / 10000)}</span>{'\n'}
                        <span className="text-teal-600">G75 R0.5</span>{'\n'}
                        <span className="text-teal-600">G75 X{(Math.round((DELTA2X + 0.1) * 10000) / 10000)} Z{(Math.round((DELTA2Z - 0.05) * 10000) / 10000)} P{Math.round((p_q / 2) * 1000)} Q{Math.round((p_q / 2) * 1000)} R0 F{p_i}</span>{'\n'}
                        <span className="text-zinc-600">G80</span>{'\n'}
                    </React.Fragment>
                );
            }
        }

        DELTA1X = DELTA1X * 1;
        DELTA1Z = Rz4 * 1;

        let res = (
            <>
                <span className="text-blue-800 font-bold">(GROOVE OUTER-SHKIV)</span>{'\n'}
                <span className="text-blue-800 font-bold">(REZEC-Shirina={p_q})</span>{'\n'}
                <span className="text-zinc-600">G40G80G99</span>{'\n'}
                <span className="text-zinc-600">G28U0</span>{'\n'}
                <span className="text-zinc-600">T0202 M8</span>{'\n'}
                <span className="text-zinc-600">G50 S{s}</span>{'\n'}
                <span className="text-zinc-600">G96 S{Mater} M03</span>{'\n'}
                {msg2}
                <span className="text-red-500">G0 X{(Math.round(DELTA1X * 10000) / 10000)} Z{(Math.round(DELTA1Z * 10000) / 10000)}</span>{'\n'}
                <span className="text-green-600">G75 R0.5</span>{'\n'}
                <span className="text-green-600">G75 X{(Math.round((p_a + 0.1) * 10000) / 10000)} Z{(Math.round(Rz5 * 10000) / 10000)} P{Math.round((p_q / 2) * 1000)} Q{Math.round((p_q / 2) * 1000)} R0 F{p_i}</span>{'\n'}
                <span className="text-zinc-600">G80</span>{'\n'}
                <span className="text-red-500">G0 X{(Math.round(p_b * 10000) / 10000)}</span>{'\n'}
                <span className="text-blue-800 font-bold">(POLU-CHISTO)</span>{'\n'}
                <span className="text-red-500">G0 X{(Math.round((Rx1 + 0.7) * 10000) / 10000)} Z{(Math.round((Rz1 - 0.67) * 10000) / 10000)}</span>{'\n'}
                <span className="text-green-600">G1 X{(Math.round(Rx1 * 10000) / 10000)} Z{(Math.round((Rz1 + 0.03) * 10000) / 10000)} F{p_i}</span>{'\n'}
                <span className="text-purple-600">G2 X{(Math.round(Rx2 * 10000) / 10000)} Z{(Math.round((Rz2 + 0.03) * 10000) / 10000)} R{(Math.round(p_r1 * 10000) / 10000)} F{p_i}</span>{'\n'}
                <span className="text-green-600">G1 X{(Math.round(Rx3 * 10000) / 10000)} Z{(Math.round((Rz3 + 0.03) * 10000) / 10000)} F{p_i}</span>{'\n'}
                <span className="text-purple-600">G3 X{(Math.round((Rx4 + 0.05) * 10000) / 10000)} Z{(Math.round((Rz4 + 0.03) * 10000) / 10000)} R{(Math.round(p_r2 * 10000) / 10000)} F{p_i}</span>{'\n'}
                <span className="text-green-600">G1 Z{(Math.round((Rz5 + 0.03) * 10000) / 10000)} F{p_i}</span>{'\n'}
                <span className="text-red-500">G0 X{(Math.round((Rx1 + 0.7) * 10000) / 10000)}</span>{'\n'}
                <span className="text-red-500">Z{(Math.round((Rz8 + 0.67) * 10000) / 10000)}</span>{'\n'}
                <span className="text-green-600">G1 X{(Math.round(Rx8 * 10000) / 10000)} Z{(Math.round((Rz8 - 0.03) * 10000) / 10000)} F{p_i}</span>{'\n'}
                <span className="text-purple-600">G3 X{(Math.round(Rx7 * 10000) / 10000)} Z{(Math.round((Rz7 - 0.03) * 10000) / 10000)} R{(Math.round(p_r1 * 10000) / 10000)} F{p_i}</span>{'\n'}
                <span className="text-green-600">G1 X{(Math.round(Rx6 * 10000) / 10000)} Z{(Math.round((Rz6 - 0.03) * 10000) / 10000)} F{p_i}</span>{'\n'}
                <span className="text-purple-600">G2 X{(Math.round((Rx5 + 0.05) * 10000) / 10000)} Z{(Math.round((Rz5 - 0.03) * 10000) / 10000)} R{(Math.round(p_r2 * 10000) / 10000)} F{p_i}</span>{'\n'}
                <span className="text-green-600">G1 Z{(Math.round((Rz5 - (p_q / 5 + 0.03)) * 10000) / 10000)} F{p_i}</span>{'\n'}
                <span className="text-red-500">G0 X{(Math.round((Rx1 + 4) * 10000) / 10000)}</span>{'\n'}
                <span className="text-zinc-600">M5</span>{'\n'}
                <span className="text-zinc-600">M9</span>{'\n'}
                <span className="text-zinc-600">G28U0</span>{'\n'}
                <span className="text-zinc-600">G0Z100.</span>{'\n'}
                <span className="text-zinc-600">M01</span>{'\n'}

                <span className="text-blue-800 font-bold">(GROOVE FINISH-SHKIV)</span>{'\n'}
                <span className="text-blue-800 font-bold">(REZEC-Shirina={p_q})</span>{'\n'}
                <span className="text-zinc-600">G40G80G99</span>{'\n'}
                <span className="text-zinc-600">G28U0</span>{'\n'}
                <span className="text-zinc-600">T0404 M8</span>{'\n'}
                <span className="text-zinc-600">G50 S{s}</span>{'\n'}
                <span className="text-zinc-600">G96 S{Mater} M03</span>{'\n'}
                <span className="text-red-500">G0 X{(Math.round((Rx1 + 0.7) * 10000) / 10000)} Z{(Math.round((Rz1 - 0.7) * 10000) / 10000)}</span>{'\n'}
                <span className="text-green-600">G1 X{(Math.round(Rx1 * 10000) / 10000)} Z{(Math.round(Rz1 * 10000) / 10000)} F{p_i}</span>{'\n'}
                <span className="text-purple-600">G2 X{(Math.round(Rx2 * 10000) / 10000)} Z{(Math.round(Rz2 * 10000) / 10000)} R{(Math.round(p_r1 * 10000) / 10000)} F{p_i}</span>{'\n'}
                <span className="text-green-600">G1 X{(Math.round(Rx3 * 10000) / 10000)} Z{(Math.round(Rz3 * 10000) / 10000)} F{p_i}</span>{'\n'}
                <span className="text-purple-600">G3 X{(Math.round(Rx4 * 10000) / 10000)} Z{(Math.round(Rz4 * 10000) / 10000)} R{(Math.round(p_r2 * 10000) / 10000)} F{p_i}</span>{'\n'}
                <span className="text-green-600">G1 Z{(Math.round(Rz5 * 10000) / 10000)} F{p_i}</span>{'\n'}
                <span className="text-red-500">G0 X{(Math.round((Rx1 + 0.7) * 10000) / 10000)}</span>{'\n'}
                <span className="text-red-500">Z{(Math.round((Rz8 + 0.7) * 10000) / 10000)}</span>{'\n'}
                <span className="text-green-600">G1 X{(Math.round(Rx8 * 10000) / 10000)} Z{(Math.round(Rz8 * 10000) / 10000)} F{p_i}</span>{'\n'}
                <span className="text-purple-600">G3 X{(Math.round(Rx7 * 10000) / 10000)} Z{(Math.round(Rz7 * 10000) / 10000)} R{(Math.round(p_r1 * 10000) / 10000)} F{p_i}</span>{'\n'}
                <span className="text-green-600">G1 X{(Math.round(Rx6 * 10000) / 10000)} Z{(Math.round(Rz6 * 10000) / 10000)} F{p_i}</span>{'\n'}
                <span className="text-purple-600">G2 X{(Math.round(Rx5 * 10000) / 10000)} Z{(Math.round(Rz5 * 10000) / 10000)} R{(Math.round(p_r2 * 10000) / 10000)} F{p_i}</span>{'\n'}
                <span className="text-green-600">G1 Z{(Math.round((Rz5 - p_q / 5) * 10000) / 10000)} F{p_i}</span>{'\n'}
                <span className="text-red-500">G0 X{(Math.round((Rx1 + 4) * 10000) / 10000)}</span>{'\n'}
                <span className="text-zinc-600">M5</span>{'\n'}
                <span className="text-zinc-600">M9</span>{'\n'}
                <span className="text-zinc-600">G28U0</span>{'\n'}
                <span className="text-zinc-600">G0Z100.</span>{'\n'}
                <span className="text-zinc-600">M1(End)</span>
            </>
        );
        setGcode(res);
    };

    const copyCode = () => {
        const block = document.getElementById('shkiv-gcode-output');
        if (!block) return;
        const text = block.innerText;
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="flex flex-col h-full bg-white text-zinc-800 font-sans p-4 overflow-y-auto">
            {/* HEADER / BACK BUTTON */}
            <div className="flex justify-start mb-6 shrink-0">
                <button
                    onClick={onBack}
                    className="relative px-6 py-2.5 bg-red-800 hover:bg-red-700 active:bg-red-900 
                     text-white font-black tracking-widest text-lg rounded shadow-machine border border-red-900/50 transition-all duration-150"
                >
                    <div className="absolute inset-1 rounded-sm border border-white/10 pointer-events-none"></div>
                    НАЗАД
                </button>
            </div>

            <div className="mb-4">
                <h2 className="text-2xl font-bold text-zinc-800 italic uppercase">Шкив (ручей) FANUC-0</h2>
                <p className="text-sm text-zinc-500">Точение канавки.</p>
            </div>

            <div className="flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* СХЕМА ===== */}
                    <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6 flex flex-col gap-4">
                        <div className="text-xs font-semibold tracking-wider uppercase text-zinc-500 mb-2">Схема инструмента</div>

                        {/* SVG SHKIV */}
                        <svg className="w-full h-auto mt-4 max-h-[300px]" viewBox="0 0 216 146" aria-label="Shkiv drawing">
                            <defs>
                                <linearGradient id="metalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#c7c7c7" />
                                    <stop offset="55%" stopColor="#f4f4f4" />
                                    <stop offset="100%" stopColor="#d6d6d6" />
                                </linearGradient>

                                <marker id="arrowBlack" viewBox="0 0 10 10" refX="8.2" refY="5" markerWidth="5.4" markerHeight="5.4" orient="auto-start-reverse">
                                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#111111" />
                                </marker>

                                <marker id="arrowRed" viewBox="0 0 10 10" refX="8.2" refY="5" markerWidth="5.8" markerHeight="5.8" orient="auto-start-reverse">
                                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#ff2020" />
                                </marker>

                                <marker id="arrowCyan" viewBox="0 0 10 10" refX="8.2" refY="5" markerWidth="5.6" markerHeight="5.6" orient="auto-start-reverse">
                                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#24c7ef" />
                                </marker>

                                <marker id="arrowBlue" viewBox="0 0 10 10" refX="8.2" refY="5" markerWidth="5.2" markerHeight="5.2" orient="auto-start-reverse">
                                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#1d2cff" />
                                </marker>
                            </defs>

                            <rect x="0" y="0" width="216" height="146" fill="#f8fafc" />

                            <text x="0" y="15" fontSize="15" fill="#111111">точка</text>
                            <text x="0" y="32" fontSize="15" fill="#111111">старта</text>

                            <text x="52" y="35" fontSize="19" fill="#111111">X</text>
                            <text x="65" y="35" fontSize="19" fill="#111111">Z</text>

                            <rect x="85" y="0.5" width="12" height="23.5" fill="#fff600" stroke="#111111" strokeWidth="1" />
                            <circle cx="86.2" cy="24.5" r="1.15" fill="#111111" />
                            <circle cx="95.8" cy="24.5" r="1.15" fill="#111111" />

                            <circle cx="84.8" cy="24.2" r="3.3" fill="#ff1b0f" stroke="#111111" strokeWidth="0.9" />

                            <line x1="79" y1="10.2" x2="85" y2="10.2" stroke="#111111" strokeWidth="1.15" markerEnd="url(#arrowBlack)" />
                            <line x1="103" y1="10.2" x2="97" y2="10.2" stroke="#111111" strokeWidth="1.15" markerEnd="url(#arrowBlack)" />
                            <line x1="103" y1="10.2" x2="130.5" y2="10.2" stroke="#666666" strokeWidth="1.05" />
                            <text x="136.6" y="15.2" fontSize="18" fill="#111111">W</text>

                            <text x="160.4" y="35.5" fill="#ffb0b0" fontSize="26">R<tspan fontSize="11" baselineShift="sub">3</tspan></text>
                            <text x="159" y="34" fill="#ff2020" fontSize="26">R<tspan fontSize="11" baselineShift="sub">3</tspan></text>
                            <line x1="156.5" y1="22.5" x2="96.8" y2="22.5" stroke="#ff2020" strokeWidth="1.35" markerEnd="url(#arrowRed)" />

                            <path d="M 55 61 L 84 61 L 96 101 L 112 101 L 124 61 L 153 61 L 153 121 L 55 121 Z" fill="url(#metalGrad)" stroke="#8b8b8b" strokeWidth="0.8" />

                            <path d="M 84 61 L 124 61 L 112 101 L 96 101 Z" fill="#ffffff" stroke="#111111" strokeWidth="0.9" />
                            <line x1="84" y1="61" x2="96" y2="101" stroke="#111111" strokeWidth="0.9" strokeDasharray="3 2" fill="none" />
                            <line x1="124" y1="61" x2="112" y2="101" stroke="#111111" strokeWidth="0.9" strokeDasharray="3 2" fill="none" />
                            <line x1="96" y1="101" x2="112" y2="101" stroke="#111111" strokeWidth="0.9" />

                            <line x1="55" y1="61" x2="153" y2="61" stroke="#8b8b8b" strokeWidth="0.7" fill="none" />
                            <line x1="153" y1="61" x2="153" y2="121" stroke="#8b8b8b" strokeWidth="0.7" fill="none" />
                            <line x1="55" y1="121" x2="153" y2="121" stroke="#8b8b8b" strokeWidth="0.7" fill="none" />

                            <line x1="85.5" y1="57.2" x2="122.5" y2="57.2" stroke="#24c7ef" strokeWidth="1.5" markerStart="url(#arrowCyan)" markerEnd="url(#arrowCyan)" />
                            <text x="101.7" y="53.2" fill="#97ecff" fontSize="18">L</text>
                            <text x="100.7" y="52.2" fill="#24c7ef" fontSize="18">L</text>

                            <path d="M 96 92 C 99 83, 109 83, 112 92" fill="none" stroke="#1d2cff" strokeWidth="1.15" markerStart="url(#arrowBlue)" markerEnd="url(#arrowBlue)" />
                            <circle cx="104" cy="92.5" r="1.4" fill="none" stroke="#1d2cff" strokeWidth="1.1" />
                            <text x="75.8" y="100.2" fill="#1d2cff" fontSize="18">A</text>

                            <line x1="55" y1="120" x2="55" y2="63.5" stroke="#111111" strokeWidth="1.35" fill="none" markerStart="url(#arrowBlack)" markerEnd="url(#arrowBlack)" />
                            <text x="31.5" y="136" fontSize="17" fill="#111111">D<tspan fontSize="11" baselineShift="sub">2</tspan><tspan fontSize="11" baselineShift="super">*</tspan></text>

                            <line x1="104" y1="121" x2="104" y2="102.6" stroke="#111111" strokeWidth="1.35" fill="none" markerStart="url(#arrowBlack)" markerEnd="url(#arrowBlack)" />
                            <text x="84.2" y="136" fontSize="17" fill="#111111">D<tspan fontSize="11" baselineShift="sub">1</tspan><tspan fontSize="11" baselineShift="super">*</tspan></text>

                            <line x1="139.5" y1="63.5" x2="139.5" y2="101.2" stroke="#111111" strokeWidth="1.35" fill="none" markerStart="url(#arrowBlack)" markerEnd="url(#arrowBlack)" />
                            <text x="154" y="89.5" fill="#fff0a0" fontSize="18">H<tspan fontSize="11" baselineShift="super">*</tspan></text>
                            <text x="153" y="88.5" fill="#f0c300" fontSize="18">H<tspan fontSize="11" baselineShift="super">*</tspan></text>

                            <text x="5.5" y="88.5" fill="#ffb0b0" fontSize="26">R<tspan fontSize="11" baselineShift="sub">1</tspan></text>
                            <text x="4" y="87" fill="#ff2020" fontSize="26">R<tspan fontSize="11" baselineShift="sub">1</tspan></text>
                            <line x1="28.5" y1="77.5" x2="82.8" y2="63" stroke="#ff2020" strokeWidth="1.25" markerEnd="url(#arrowRed)" />

                            <text x="165.5" y="135.5" fill="#ffb0b0" fontSize="26">R<tspan fontSize="11" baselineShift="sub">2</tspan></text>
                            <text x="164" y="134" fill="#ff2020" fontSize="26">R<tspan fontSize="11" baselineShift="sub">2</tspan></text>
                            <line x1="168" y1="129" x2="113.5" y2="103.5" stroke="#ff2020" strokeWidth="1.25" markerEnd="url(#arrowRed)" />
                        </svg>

                    </div>

                    {/* ФОРМА И ВЫВОД ===== */}
                    <div className="flex flex-col gap-6 ">
                        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6">
                            <div className="text-xs font-semibold tracking-wider uppercase text-zinc-500 mb-4">Параметры инструмента и детали</div>

                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-1.5 ">
                                    <label className="text-xs font-semibold text-zinc-500">Материал заготовки</label>
                                    <select
                                        className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 cursor-pointer"
                                        value={mater}
                                        onChange={(e) => setMater(Number(e.target.value))}
                                    >
                                        <option value="280">Мягкие стали — 280</option>
                                        <option value="230">Мягкие стали СТ-3 — Vc=230</option>
                                        <option value="180">Инструментальные стали — 180</option>
                                        <option value="160">Легированные Инс-ные стали — 160</option>
                                        <option value="140">Нержавеющие стали — 140</option>
                                        <option value="120">Нержавеющие Аустен-е стали — 120</option>
                                        <option value="110">Нержавеющие Мартен-е стали — 110</option>
                                        <option value="170">Чугун Lamellar — 170</option>
                                        <option value="140">Чугун Nodular — 140</option>
                                        <option value="320">Алюминиевые сплавы — 320</option>
                                        <option value="175">Медные сплавы — 175</option>
                                        <option value="650">Пластики пластмассы — 650</option>
                                        <option value="60">Жаропрочные сплавы титан — 60</option>
                                        <option value="55">Жаропрочные сплавы никель — 55</option>
                                        <option value="80">Закаленные твердые стали — 80</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-semibold text-zinc-500"><span className="bg-blue-100 text-blue-700 px-1 py-0.5 rounded font-bold text-[10px]">D1</span> Диаметр *</label>
                                        <input type="number" step="0.1" className="bg-white border rounded-lg px-2 py-1.5 text-sm outline-none" value={a} onChange={e => setA(e.target.value)} onBlur={() => handleBlur(a, setA)} />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-semibold text-zinc-500"><span className="bg-blue-100 text-blue-700 px-1 py-0.5 rounded font-bold text-[10px]">D2</span> Диаметр *</label>
                                        <input type="number" step="0.1" className="bg-white border rounded-lg px-2 py-1.5 text-sm outline-none" value={b2} onChange={e => setB2(e.target.value)} onBlur={() => handleBlur(b2, setB2)} />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-semibold text-zinc-500"><span className="bg-yellow-100 text-yellow-700 px-1 py-0.5 rounded font-bold text-[10px]">H</span> Высота *</label>
                                        <input type="number" step="0.1" className="bg-white border rounded-lg px-2 py-1.5 text-sm outline-none" value={hh} onChange={e => setHh(e.target.value)} onBlur={() => handleBlur(hh, setHh)} />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-semibold text-zinc-500"><span className="bg-blue-100 text-blue-700 px-1 py-0.5 rounded font-bold text-[10px]">A</span> Угол</label>
                                        <input type="number" step="1" className="bg-white border rounded-lg px-2 py-1.5 text-sm outline-none" value={aa} onChange={e => setAa(e.target.value)} onBlur={() => handleBlur(aa, setAa)} />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-semibold text-zinc-500"><span className="bg-cyan-100 text-cyan-700 px-1 py-0.5 rounded font-bold text-[10px]">L</span> Длина</label>
                                        <input type="number" step="1" className="bg-white border rounded-lg px-2 py-1.5 text-sm outline-none" value={d} onChange={e => setD(e.target.value)} onBlur={() => handleBlur(d, setD)} />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-semibold text-zinc-500"><span className="bg-red-100 text-red-700 px-1 py-0.5 rounded font-bold text-[10px]">R1</span> Радиус 1</label>
                                        <input type="number" step="0.1" className="bg-white border rounded-lg px-2 py-1.5 text-sm outline-none" value={r1} onChange={e => setR1(e.target.value)} onBlur={() => handleBlur(r1, setR1)} />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-semibold text-zinc-500"><span className="bg-red-100 text-red-700 px-1 py-0.5 rounded font-bold text-[10px]">R2</span> Радиус 2</label>
                                        <input type="number" step="0.1" className="bg-white border rounded-lg px-2 py-1.5 text-sm outline-none" value={r2} onChange={e => setR2(e.target.value)} onBlur={() => handleBlur(r2, setR2)} />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-semibold text-zinc-500"><span className="bg-red-100 text-red-700 px-1 py-0.5 rounded font-bold text-[10px]">R3</span> Радиус 3</label>
                                        <input type="number" step="0.1" className="bg-white border rounded-lg px-2 py-1.5 text-sm outline-none" value={r3} onChange={e => setR3(e.target.value)} onBlur={() => handleBlur(r3, setR3)} />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-semibold text-zinc-500"><span className="bg-gray-200 text-gray-700 px-1 py-0.5 rounded font-bold text-[10px]">W</span> Ширина пласт.</label>
                                        <input type="number" step="0.1" className="bg-white border rounded-lg px-2 py-1.5 text-sm outline-none" value={q} onChange={e => setQ(e.target.value)} onBlur={() => handleBlur(q, setQ)} />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-semibold text-zinc-500"><span className="bg-gray-200 text-gray-700 px-1 py-0.5 rounded font-bold text-[10px]">X</span> start pos.</label>
                                        <input type="number" step="1" className="bg-white border rounded-lg px-2 py-1.5 text-sm outline-none" value={b} onChange={e => setB(e.target.value)} onBlur={() => handleBlur(b, setB)} />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-semibold text-zinc-500"><span className="bg-gray-200 text-gray-700 px-1 py-0.5 rounded font-bold text-[10px]">Z</span> start pos.</label>
                                        <input type="number" step="1" className="bg-white border rounded-lg px-2 py-1.5 text-sm outline-none" value={c} onChange={e => setC(e.target.value)} onBlur={() => handleBlur(c, setC)} />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-semibold text-zinc-500"><span className="bg-gray-200 text-gray-700 px-1 py-0.5 rounded font-bold text-[10px]">F</span> подача</label>
                                        <input type="number" step="0.01" className="bg-white border rounded-lg px-2 py-1.5 text-sm outline-none" value={i} onChange={e => setI(e.target.value)} onBlur={() => handleBlur(i, setI)} />
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={calculate}
                                className="mt-6 w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg font-bold shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all"
                            >
                                ⚡ Рассчитать G-код
                            </button>
                        </div>

                        {/* ВЫВОД */}
                        <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm flex-1 flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                                <div className="text-xs font-semibold tracking-wider uppercase text-zinc-500">G-Code Output</div>
                                <button
                                    onClick={copyCode}
                                    className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-sm font-semibold transition-colors border ${copied ? 'bg-green-50 text-green-600 border-green-200' : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-blue-500 hover:text-blue-600'
                                        }`}
                                >
                                    {copied ? 'Скопировано' : 'Скопировать'}
                                </button>
                            </div>

                            <div
                                id="shkiv-gcode-output"
                                className={`flex-1 min-h-[140px] bg-zinc-50 border border-zinc-200 rounded-lg p-4 font-mono text-sm leading-relaxed overflow-x-auto whitespace-pre ${gcode ? 'text-zinc-800' : 'text-zinc-400 italic'}`}
                            >
                                {gcode ? gcode : '← Заполните параметры и нажмите «Рассчитать»'}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
