import React, { useState, useEffect } from 'react';

interface GroovesAppProps {
    onBack: () => void;
}

type ModuleType = 'outer' | 'face';
type EdgeOuter = 'left' | 'right';
type EdgeFace = 'top' | 'bottom';

export default function GroovesApp({ onBack }: GroovesAppProps) {
    const [activeModule, setActiveModule] = useState<ModuleType>('outer');
    const [edgeOuter, setEdgeOuter] = useState<EdgeOuter>('left');
    const [edgeFace, setEdgeFace] = useState<EdgeFace>('top');

    // Данные формы наружной канавки
    const [outerMater, setOuterMater] = useState(90); // Vc
    const [outerK, setOuterK] = useState(3);
    const [outerF, setOuterF] = useState(0.035);
    const [outerX, setOuterX] = useState(50);
    const [outerZ, setOuterZ] = useState(-30);
    const [outerL, setOuterL] = useState(10);
    const [outerD, setOuterD] = useState(40);

    // Данные формы торцевой канавки
    const [faceMater, setFaceMater] = useState(90);
    const [faceK, setFaceK] = useState(3);
    const [faceF, setFaceF] = useState(0.035);
    const [faceX, setFaceX] = useState(50);
    const [faceZ, setFaceZ] = useState(2);
    const [faceM, setFaceM] = useState(10);
    const [faceL, setFaceL] = useState(5);

    const [gcode, setGcode] = useState<React.ReactNode | null>(null);
    const [copied, setCopied] = useState(false);
    const [pulseOuter, setPulseOuter] = useState(false);
    const [pulseFace, setPulseFace] = useState(false);

    // Обработчики кнопок-табов
    const handleOuterClick = () => {
        setActiveModule('outer');
        setGcode(null);
    };

    const handleFaceClick = () => {
        setActiveModule('face');
        setGcode(null);
    };

    // Обработчики кнопок кромок
    const handleOuterEdgeClick = (edge: EdgeOuter) => {
        setEdgeOuter(edge);
        setPulseOuter(true);
        setTimeout(() => setPulseOuter(false), 400); // время анимации pulse
    };

    const handleFaceEdgeClick = (edge: EdgeFace) => {
        setEdgeFace(edge);
        setPulseFace(true);
        setTimeout(() => setPulseFace(false), 400);
    };

    // ----- Расчет Наружной Канавки (G75) -----
    const calcOuter = () => {
        if ([outerK, outerX, outerZ, outerL, outerD, outerF].some(isNaN)) {
            alert('Заполните все поля!');
            return;
        }

        const Vc = outerMater;
        const K = outerK;
        const X = outerX;
        const Z = outerZ;
        const L = outerL;
        const D = outerD;
        const F = outerF;

        const S = Math.round((Vc * 1000) / (D * Math.PI));

        // Xstart с безопасным зазором 2 мм (X + 2)
        const Xstart = X + 2;
        const Xtarget = D;

        let Zstart, Ztarget;
        if (edgeOuter === 'left') {
            Zstart = Z;
            Ztarget = Z + (L - K);
        } else {
            Zstart = Z + (L - K);
            Ztarget = Z;
        }

        Zstart = Math.round(Zstart * 10000) / 10000;
        Ztarget = Math.round(Ztarget * 10000) / 10000;

        const P = 600; // фиксированный шаг
        const Q = Math.round((K - 0.5) * 1000);

        const edgeText = edgeOuter === 'right' ? 'KROMKA/RIGHT' : 'KROMKA/LEFT';

        const code = (
            <>
                <span className="text-zinc-500">{`(GROOVE OUTER — Tool K=${K}mm)`}</span>{'\n'}
                <span className="text-zinc-500">{`(${edgeText})`}</span>{'\n'}
                <span className="text-zinc-400">G40G80G99</span>{'\n'}
                <span className="text-zinc-400">T0202 M8</span>{'\n'}
                <span className="text-zinc-400">G50 S{S}</span>{'\n'}
                <span className="text-zinc-400">G96 S{Vc} M03</span>{'\n'}
                <span className="text-red-500">G0 X{Xstart}. Z{Zstart}.</span>{'\n'}
                <span className="text-green-500">G75 R0.05</span>{'\n'}
                <span className="text-green-500">G75 X{Xtarget}. Z{Ztarget}. P{P} Q{Q} F{F}</span>{'\n'}
                <span className="text-red-500">G0 Z10. M9</span>{'\n'}
                <span className="text-zinc-400">G28U0.</span>{'\n'}
                <span className="text-zinc-400">M5</span>{'\n'}
                <span className="text-zinc-400">M1</span>
            </>
        );

        setGcode(code);
    };

    // ----- Расчет Торцевой Канавки (G74) -----
    const calcFace = () => {
        if ([faceK, faceX, faceZ, faceL, faceM, faceF].some(isNaN)) {
            alert('Заполните все поля!');
            return;
        }

        const Vc = faceMater;
        const K = faceK;
        const X = faceX;
        const Z = faceZ;
        const L = faceL;
        const M = faceM;
        const F = faceF;

        const Dwork = X - L * 2;
        const S = Math.round((Vc * 1000) / (Dwork * Math.PI));

        const Xstart = edgeFace === 'bottom' ? X - K * 2 : X;
        const Xtarget = edgeFace === 'bottom' ? Dwork : Dwork + K * 2;

        const Zstart = Z;
        const Ztarget = -M;

        const P = Math.round((K - 0.5) * 1000);

        const edgeText = edgeFace === 'top' ? 'KROMKA/VERH' : 'KROMKA/NIZ';

        const code = (
            <>
                <span className="text-zinc-500">{`(GROOVE FACE — Tool K=${K}mm)`}</span>{'\n'}
                <span className="text-zinc-500">{`(${edgeText})`}</span>{'\n'}
                <span className="text-zinc-400">G40G80G99</span>{'\n'}
                <span className="text-zinc-400">G28U0</span>{'\n'}
                <span className="text-zinc-400">T0202 M8</span>{'\n'}
                <span className="text-zinc-400">G50 S{S}</span>{'\n'}
                <span className="text-zinc-400">G96 S{Vc} M03</span>{'\n'}
                <span className="text-red-500">G0 X{Math.round(Xstart * 10000) / 10000}. Z{Math.round(Zstart * 10000) / 10000}.</span>{'\n'}
                <span className="text-green-500">G74 R0.05</span>{'\n'}
                <span className="text-green-500">G74 X{Math.round(Xtarget * 10000) / 10000}. Z{Math.round(Ztarget * 10000) / 10000}. P{P} Q1500 F{F}</span>{'\n'}
                <span className="text-red-500">G0 Z10. M9</span>{'\n'}
                <span className="text-zinc-400">G28U0.</span>{'\n'}
                <span className="text-zinc-400">M5</span>{'\n'}
                <span className="text-zinc-400">M1</span>
            </>
        );

        setGcode(code);
    };

    const copyCode = () => {
        // В React мы можем извлечь текст из DOM-элемента или собрать его сами.
        // Проще будет создать временный div в памяти с рендером
        const block = document.getElementById('groove-gcode-output');
        if (!block) return;
        const text = block.innerText;

        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const outerDInnerPreview = Math.round((faceX - faceL * 2) * 1000) / 1000;

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

            {/* TABS */}
            <div className="flex gap-1 mt-4 border-b border-zinc-200">
                <button
                    onClick={handleOuterClick}
                    className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors border-b-2 ${activeModule === 'outer'
                        ? 'text-blue-600 border-blue-600 bg-blue-50/50'
                        : 'text-zinc-500 border-transparent hover:bg-zinc-100 hover:text-zinc-800'
                        }`}
                >
                    ⟳ Наружная канавка (G75)
                </button>
                <button
                    onClick={handleFaceClick}
                    className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors border-b-2 ${activeModule === 'face'
                        ? 'text-blue-600 border-blue-600 bg-blue-50/50'
                        : 'text-zinc-500 border-transparent hover:bg-zinc-100 hover:text-zinc-800'
                        }`}
                >
                    ◫ Торцевая канавка (G74)
                </button>
            </div>

            <div className="flex-1 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* СХЕМА И ПЕРЕКЛЮЧАТЕЛЬ ===== */}
                    <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6 flex flex-col gap-4">
                        <div className="text-xs font-semibold tracking-wider uppercase text-zinc-500 mb-2">Схема инструмента</div>

                        {/* Toggles Outer */}
                        {activeModule === 'outer' && (
                            <div className="flex gap-1 bg-white border border-zinc-200 rounded-lg p-1">
                                <button
                                    onClick={() => handleOuterEdgeClick('left')}
                                    className={`flex-1 py-2 rounded-md text-sm font-semibold flex items-center justify-center gap-2 transition-all ${edgeOuter === 'left' ? 'bg-zinc-100 text-blue-600 shadow-sm' : 'text-zinc-500 hover:bg-zinc-50'
                                        }`}
                                >
                                    <span className="w-2 h-2 rounded-full bg-current"></span>Левая кромка
                                </button>
                                <button
                                    onClick={() => handleOuterEdgeClick('right')}
                                    className={`flex-1 py-2 rounded-md text-sm font-semibold flex items-center justify-center gap-2 transition-all ${edgeOuter === 'right' ? 'bg-zinc-100 text-blue-600 shadow-sm' : 'text-zinc-500 hover:bg-zinc-50'
                                        }`}
                                >
                                    <span className="w-2 h-2 rounded-full bg-current"></span>Правая кромка
                                </button>
                            </div>
                        )}

                        {/* Toggles Face */}
                        {activeModule === 'face' && (
                            <div className="flex gap-1 bg-white border border-zinc-200 rounded-lg p-1">
                                <button
                                    onClick={() => handleFaceEdgeClick('top')}
                                    className={`flex-1 py-2 rounded-md text-sm font-semibold flex items-center justify-center gap-2 transition-all ${edgeFace === 'top' ? 'bg-zinc-100 text-blue-600 shadow-sm' : 'text-zinc-500 hover:bg-zinc-50'
                                        }`}
                                >
                                    <span className="w-2 h-2 rounded-full bg-current"></span>Верхняя кромка
                                </button>
                                <button
                                    onClick={() => handleFaceEdgeClick('bottom')}
                                    className={`flex-1 py-2 rounded-md text-sm font-semibold flex items-center justify-center gap-2 transition-all ${edgeFace === 'bottom' ? 'bg-zinc-100 text-blue-600 shadow-sm' : 'text-zinc-500 hover:bg-zinc-50'
                                        }`}
                                >
                                    <span className="w-2 h-2 rounded-full bg-current"></span>Нижняя кромка
                                </button>
                            </div>
                        )}

                        {/* SVG OUTER */}
                        {activeModule === 'outer' && (
                            <svg className="w-full h-auto mt-4" viewBox="0 0 800 850">
                                <defs>
                                    <marker id="arrow-end" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#2d3748" />
                                    </marker>
                                    <marker id="arrow-start" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                                        <path d="M 10 0 L 0 5 L 10 10 z" fill="#2d3748" />
                                    </marker>
                                </defs>

                                <path d="M 120 650 L 680 650 L 680 450 L 500 450 L 500 550 L 300 550 L 300 450 L 120 450 Z" fill="#4a5568" stroke="#2d3748" strokeWidth="4" strokeLinejoin="round" />

                                {/* Tool */}
                                <rect x="360" y="200" width="80" height="260" fill="#D4AF37" stroke="#2d3748" strokeWidth="4" strokeLinejoin="round" />

                                {/* Axis D */}
                                <line x1="50" y1="780" x2="750" y2="780" stroke="#2d3748" strokeWidth="2" strokeDasharray="40 10 10 10" fill="none" />
                                <line x1="400" y1="740" x2="400" y2="562" stroke="#2d3748" strokeWidth="3" markerEnd="url(#arrow-end)" fill="none" />
                                <rect x="375" y="755" width="50" height="45" fill="#f8fafc" />
                                <text x="400" y="792" textAnchor="middle" fontSize="36" fontWeight="500" fill="#2d3748" fontFamily="Inter">D</text>

                                {/* L */}
                                <line x1="315" y1="500" x2="485" y2="500" stroke="#2d3748" strokeWidth="3" markerStart="url(#arrow-start)" markerEnd="url(#arrow-end)" fill="none" />
                                <text x="400" y="480" textAnchor="middle" fontSize="36" fontWeight="500" fill="#2d3748" fontFamily="Inter">L</text>

                                {/* K */}
                                <line x1="260" y1="250" x2="352" y2="250" stroke="#2d3748" strokeWidth="3" markerEnd="url(#arrow-end)" fill="none" />
                                <line x1="540" y1="250" x2="448" y2="250" stroke="#2d3748" strokeWidth="3" markerEnd="url(#arrow-end)" fill="none" />
                                <text x="570" y="262" fontSize="36" fontWeight="500" fill="#2d3748" fontFamily="Inter">K</text>

                                {/* XZ Animation Outer */}
                                <g style={{ transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)', transform: edgeOuter === 'right' ? 'translateX(80px)' : 'translateX(0)' }}>
                                    <circle cx="360" cy="452" r={pulseOuter ? "12" : "8"} fill="#ea4335" style={{ transition: 'r 0.2s ease-out' }} />
                                </g>

                                <g>
                                    <text x={edgeOuter === 'right' ? "456" : "344"} y="420" textAnchor={edgeOuter === 'right' ? "start" : "end"} fontSize="36" fontWeight="500" fill="#2d3748" fontFamily="Inter" style={{ transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>XZ</text>
                                    <text x={edgeOuter === 'right' ? "456" : "344"} y="448" textAnchor={edgeOuter === 'right' ? "start" : "end"} fontSize="24" fill="#2d3748" fontFamily="Inter" style={{ transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>start</text>
                                </g>

                                {/* Podvod Dot - Fixed Base */}
                                <g>
                                    <circle cx="300" cy="452" r="8" fill="#5A9EED" opacity="0.8" />
                                </g>
                                <g>
                                    <text x="290" y="435" textAnchor="end" fill="#2d3748" fontFamily="Inter" fontSize="22" fontWeight="600" opacity="0.8">подвод</text>
                                </g>
                            </svg>
                        )}

                        {/* SVG FACE */}
                        {activeModule === 'face' && (
                            <svg className="w-full h-auto mt-4" viewBox="0 0 800 800">
                                <defs>
                                    <marker id="ah-f" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="7" markerHeight="7" orient="auto">
                                        <path d="M2,2 L10,6 L2,10" fill="none" stroke="#2d3748" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </marker>
                                    <marker id="at-f" viewBox="0 0 12 12" refX="2" refY="6" markerWidth="7" markerHeight="7" orient="auto">
                                        <path d="M10,2 L2,6 L10,10" fill="none" stroke="#2d3748" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </marker>
                                </defs>

                                <path d="M 80,80 L 320,80 L 320,310 L 200,310 L 200,490 L 320,490 L 320,720 L 80,720 Z" fill="#4a5568" stroke="#2d3748" strokeWidth="4" strokeLinejoin="round" />

                                {/* Tool */}
                                <rect x="336" y="355" width="280" height="90" fill="#D4AF37" stroke="#2d3748" strokeWidth="4" strokeLinejoin="round" />

                                {/* M */}
                                <line x1="200" y1="468" x2="320" y2="468" stroke="#2d3748" strokeWidth="3" markerStart="url(#at-f)" markerEnd="url(#ah-f)" fill="none" />
                                <text x="260" y="458" textAnchor="middle" fontSize="40" fontWeight="500" fill="#2d3748" fontFamily="Inter">M</text>

                                {/* L */}
                                <line x1="55" y1="310" x2="55" y2="490" stroke="#2d3748" strokeWidth="3" markerStart="url(#at-f)" markerEnd="url(#ah-f)" fill="none" />
                                <line x1="55" y1="310" x2="80" y2="310" stroke="#2d3748" strokeWidth="3" fill="none" />
                                <line x1="55" y1="490" x2="80" y2="490" stroke="#2d3748" strokeWidth="3" fill="none" />
                                <text x="22" y="415" textAnchor="middle" fontSize="40" fontWeight="500" fill="#2d3748" fontFamily="Inter">L</text>

                                {/* K */}
                                <line x1="616" y1="355" x2="700" y2="355" stroke="#2d3748" strokeWidth="3" fill="none" />
                                <line x1="616" y1="445" x2="700" y2="445" stroke="#2d3748" strokeWidth="3" fill="none" />
                                <line x1="668" y1="355" x2="668" y2="445" stroke="#2d3748" strokeWidth="3" markerStart="url(#at-f)" markerEnd="url(#ah-f)" fill="none" />
                                <text x="716" y="408" textAnchor="start" fontSize="40" fontWeight="500" fill="#2d3748" fontFamily="Inter">K</text>

                                {/* Animations */}
                                <g>
                                    <circle cx="336" cy={edgeFace === 'bottom' ? "445" : "355"} r={pulseFace ? "13" : "9"} fill="#ea4335" style={{ transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
                                </g>
                                <g>
                                    <text x="460" y={edgeFace === 'bottom' ? "510" : "210"} fontSize="40" fontWeight="500" fill="#2d3748" fontFamily="Inter" style={{ transition: 'y 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>X Z</text>
                                    <text x="460" y={edgeFace === 'bottom' ? "545" : "245"} fontSize="26" fill="#2d3748" fontFamily="Inter" style={{ transition: 'y 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>start</text>
                                    <text x="460" y={edgeFace === 'bottom' ? "577" : "277"} fontSize="26" fill="#2d3748" fontFamily="Inter" style={{ transition: 'y 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>point</text>
                                    <line x1={edgeFace === 'bottom' ? "460" : "470"} y1={edgeFace === 'bottom' ? "488" : "285"} x2="339" y2={edgeFace === 'bottom' ? "448" : "352"} stroke="#2d3748" strokeWidth="3" fill="none" style={{ transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
                                </g>

                                {/* Podvod Face */}
                                <g>
                                    <circle cx={edgeFace === 'bottom' ? "336" : "336"} cy={edgeFace === 'bottom' ? "445" : "355"} r="8" fill="#5A9EED" opacity="0.8" style={{ transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
                                </g>
                                <g>
                                    <text x="320" y={edgeFace === 'bottom' ? "470" : "170"} textAnchor="end" fill="#2d3748" fontFamily="Inter" fontSize="22" fontWeight="600" opacity="0.8" style={{ transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>подвод</text>
                                    <line x1="324" y1={edgeFace === 'bottom' ? "480" : "180"} x2="336" y2={edgeFace === 'bottom' ? "448" : "352"} stroke="#5A9EED" strokeWidth="2" opacity="0.8" style={{ transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
                                </g>
                            </svg>
                        )}
                    </div>

                    {/* ФОРМА И ВЫВОД ===== */}
                    <div className="flex flex-col gap-6">
                        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6">
                            <div className="text-xs font-semibold tracking-wider uppercase text-zinc-500 mb-4">Параметры инструмента</div>

                            {activeModule === 'outer' && (
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-semibold text-zinc-500">Материал заготовки</label>
                                        <select
                                            className="bg-white border border-zinc-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 cursor-pointer"
                                            value={outerMater}
                                            onChange={(e) => setOuterMater(Number(e.target.value))}
                                        >
                                            <option value="280">Алюминиевые сплавы — Vc=280</option>
                                            <option value="180">Сплавы Al-Si — Vc=180</option>
                                            <option value="140">Инструментальные стали — Vc=140</option>
                                            <option value="130">Конструкционные жар-проч. — Vc=130</option>
                                            <option value="110">Легированные стали — Vc=110</option>
                                            <option value="100">Легированные трудообраб. — Vc=100</option>
                                            <option value="90">Нержавеющие стали — Vc=90</option>
                                            <option value="150">Чугун Lamellar — Vc=150</option>
                                            <option value="130">Чугун Nodular — Vc=130</option>
                                            <option value="300">Цветные металлы — Vc=300</option>
                                            <option value="170">Медные сплавы — Vc=170</option>
                                            <option value="550">Пластики/Полимеры — Vc=550</option>
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-semibold text-zinc-500 flex items-center gap-1.5"><span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold text-[10px]">K</span> Ширина резца (мм)</label>
                                            <input type="number" step="0.5" min="0.5" className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none" value={outerK} onChange={e => setOuterK(Number(e.target.value))} />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-semibold text-zinc-500 flex items-center gap-1.5"><span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold text-[10px]">F</span> Подача (мм/об)</label>
                                            <input type="number" step="0.005" min="0.01" className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none" value={outerF} onChange={e => setOuterF(Number(e.target.value))} />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-semibold text-zinc-500 flex items-center gap-1.5"><span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold text-[10px]">X</span> X start point</label>
                                            <input type="number" step="1" className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none" value={outerX} onChange={e => setOuterX(Number(e.target.value))} />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-semibold text-zinc-500 flex items-center gap-1.5"><span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold text-[10px]">Z</span> Z start point</label>
                                            <input type="number" step="0.1" className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none" value={outerZ} onChange={e => setOuterZ(Number(e.target.value))} />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-semibold text-zinc-500 flex items-center gap-1.5"><span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold text-[10px]">L</span> Глубина паза</label>
                                            <input type="number" step="0.5" className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none" value={outerL} onChange={e => setOuterL(Number(e.target.value))} />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-semibold text-zinc-500 flex items-center gap-1.5"><span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold text-[10px]">D</span> Диаметр дна</label>
                                            <input type="number" step="1" className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none" value={outerD} onChange={e => setOuterD(Number(e.target.value))} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeModule === 'face' && (
                                <div className="flex flex-col gap-4">
                                    {/* Form face */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-semibold text-zinc-500">Материал заготовки</label>
                                        <select
                                            className="bg-white border border-zinc-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 cursor-pointer"
                                            value={faceMater}
                                            onChange={(e) => setFaceMater(Number(e.target.value))}
                                        >
                                            <option value="280">Алюминиевые сплавы — Vc=280</option>
                                            <option value="180">Сплавы Al-Si — Vc=180</option>
                                            <option value="140">Инструментальные стали — Vc=140</option>
                                            <option value="130">Конструкционные жар-проч. — Vc=130</option>
                                            <option value="110">Легированные стали — Vc=110</option>
                                            <option value="100">Легированные трудообраб. — Vc=100</option>
                                            <option value="90">Нержавеющие стали — Vc=90</option>
                                            <option value="150">Чугун Lamellar — Vc=150</option>
                                            <option value="130">Чугун Nodular — Vc=130</option>
                                            <option value="300">Цветные металлы — Vc=300</option>
                                            <option value="550">Пластики/Полимеры — Vc=550</option>
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-semibold text-zinc-500 flex items-center gap-1.5"><span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold text-[10px]">K</span> Ширина резца (мм)</label>
                                            <input type="number" step="0.5" min="0.5" className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none" value={faceK} onChange={e => setFaceK(Number(e.target.value))} />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-semibold text-zinc-500 flex items-center gap-1.5"><span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold text-[10px]">F</span> Подача (мм/об)</label>
                                            <input type="number" step="0.005" min="0.01" className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none" value={faceF} onChange={e => setFaceF(Number(e.target.value))} />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-semibold text-zinc-500 flex items-center gap-1.5"><span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold text-[10px]">X</span> X start (外D)</label>
                                            <input type="number" step="1" className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none" value={faceX} onChange={e => setFaceX(Number(e.target.value))} />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-semibold text-zinc-500 flex items-center gap-1.5"><span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold text-[10px]">Z</span> Z start point</label>
                                            <input type="number" step="0.1" className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none" value={faceZ} onChange={e => setFaceZ(Number(e.target.value))} />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-semibold text-zinc-500 flex items-center gap-1.5"><span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold text-[10px]">M</span> Глубина паза (Z)</label>
                                            <input type="number" step="0.5" className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none" value={faceM} onChange={e => setFaceM(Number(e.target.value))} />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-semibold text-zinc-500 flex items-center gap-1.5"><span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold text-[10px]">L</span> Ширина паза (X)</label>
                                            <input type="number" step="0.5" className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none" value={faceL} onChange={e => setFaceL(Number(e.target.value))} />
                                        </div>
                                    </div>
                                    <div className="bg-blue-50 border border-blue-100 rounded-lg py-2 px-3 text-xs text-blue-800">
                                        D внутренний = X − 2×L = <strong className="text-blue-600 font-bold">{outerDInnerPreview}</strong> мм
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={activeModule === 'outer' ? calcOuter : calcFace}
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
                                    {copied ? (
                                        <>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg> Скопировано
                                        </>
                                    ) : (
                                        <>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg> Скопировать
                                        </>
                                    )}
                                </button>
                            </div>

                            <div
                                id="groove-gcode-output"
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
