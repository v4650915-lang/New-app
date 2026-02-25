import React, { useState, useEffect } from 'react';
import { calculateSphereProfile } from '../utils/math';

interface SphereAppProps {
    onBack: () => void;
}

const SphereApp: React.FC<SphereAppProps> = ({ onBack }) => {
    const [L, setL] = useState<number | string>(40);
    const [D, setD] = useState<number | string>(60);
    const [R, setR] = useState<number | string>(620);
    const [r, setr] = useState<number | string>(2);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const res = calculateSphereProfile(Number(L), Number(D), Number(R), Number(r));
        if (res && res.error) {
            setError(res.error);
            setResult(null);
        } else {
            setError(null);
            setResult(res);
        }
    }, [L, D, R, r]);

    // Visualization helper
    const drawProfile = () => {
        if (!result) return null;
        const { Cs, Cf, T1, T2, h_sagitta } = result;

        // Canvas sizing (Increased size)
        const width = 600;
        const height = 400;
        const padding = 60; // More padding for dimensions

        // Calculate scale
        // Fit L and D within width/height minus padding
        const scaleZ = (width - padding * 2) / (Number(L) * 1.2); // 1.2 factor for extra breathing room
        const scaleX = (height - padding * 2) / (Number(D) * 0.8); // Partial view usually? No, let's show half D but enough scale
        // Actually we show full rectangle or half? Usually half section is cleaner for CNC, but user saw full.
        // Let's stick to full "barrel" shape.

        // We need to fit D (vertical) and L (horizontal)
        const scale = Math.min(
            (width - 100) / Number(L),
            (height - 100) / Number(D)
        );

        const cx = width / 2;
        const cy = height / 2;

        const toSvg = (z: number, x: number) => ({
            x: cx + z * scale,
            y: cy - x * scale
        });

        const pStartFace = toSvg(Number(L) / 2, 0); // Bottom Right core
        const pEndFace = toSvg(-Number(L) / 2, 0); // Bottom Left core

        // Top Right Quadrant
        const pT2_tr = toSvg(T2.z, T2.x);
        const pT1_tr = toSvg(T1.z, T1.x);
        const pApex_top = toSvg(0, Number(D) / 2);

        // Top Left Quadrant
        const pT1_tl = toSvg(-T1.z, T1.x);
        const pT2_tl = toSvg(-T2.z, T2.x);

        // Bottom Right Quadrant (Mirror X)
        const pT2_br = toSvg(T2.z, -T2.x);
        const pT1_br = toSvg(T1.z, -T1.x);
        const pApex_bottom = toSvg(0, -Number(D) / 2);

        // Bottom Left Quadrant
        const pT1_bl = toSvg(-T1.z, -T1.x);
        const pT2_bl = toSvg(-T2.z, -T2.x);

        // Color Palette
        const cDim = "#64748b"; // Dimension lines
        const cText = "#94a3b8";
        const cHighlight = "#facc15"; // Yellow
        const cShape = "#38bdf8"; // Blue

        return (
            <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ maxHeight: '50vh' }}>
                <defs>
                    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,0 L0,6 L9,3 z" fill={cDim} />
                    </marker>
                    <marker id="arrow-yellow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,0 L0,6 L9,3 z" fill={cHighlight} />
                    </marker>
                </defs>

                {/* Grid / Centerlines */}
                <line x1={cx} y1={20} x2={cx} y2={height - 20} stroke={cDim} strokeDasharray="10,5" strokeWidth="1" opacity="0.5" />
                <line x1={20} y1={cy} x2={width - 20} y2={cy} stroke={cDim} strokeDasharray="10,5" strokeWidth="1" opacity="0.3" />

                {/* Main Shape Outline */}
                <path
                    d={`
                    M ${pT2_tr.x} ${pT2_tr.y}
                    A ${Number(r) * scale} ${Number(r) * scale} 0 0 0 ${pT1_tr.x} ${pT1_tr.y}
                    A ${Number(R) * scale} ${Number(R) * scale} 0 0 0 ${pT1_tl.x} ${pT1_tl.y}
                    A ${Number(r) * scale} ${Number(r) * scale} 0 0 0 ${pT2_tl.x} ${pT2_tl.y}
                    L ${pT2_bl.x} ${pT2_bl.y}
                    A ${Number(r) * scale} ${Number(r) * scale} 0 0 0 ${pT1_bl.x} ${pT1_bl.y}
                    A ${Number(R) * scale} ${Number(R) * scale} 0 0 0 ${pT1_br.x} ${pT1_br.y}
                    A ${Number(r) * scale} ${Number(r) * scale} 0 0 0 ${pT2_br.x} ${pT2_br.y}
                    Z
                `}
                    fill="rgba(56, 189, 248, 0.1)"
                    stroke={cShape}
                    strokeWidth="3"
                />

                {/* DIMENSIONS */}

                {/* Length (L) - Bottom */}
                <g transform={`translate(0, ${height - 40})`}>
                    <line x1={pT2_bl.x} y1={-10} x2={pT2_bl.x} y2={10} stroke={cDim} />
                    <line x1={pT2_br.x} y1={-10} x2={pT2_br.x} y2={10} stroke={cDim} />
                    <line x1={pT2_bl.x} y1={0} x2={pT2_br.x} y2={0} stroke={cDim} markerStart="url(#arrow)" markerEnd="url(#arrow)" />
                    <rect x={cx - 25} y={-10} width="50" height="20" fill="#0f172a" stroke="none" />
                    <text x={cx} y={5} fill={cText} textAnchor="middle" fontSize="14" fontWeight="bold">L {L}</text>
                </g>

                {/* Diameter (D) - Right Side */}
                <g transform={`translate(${width - 40}, 0)`}>
                    <line x1={-10} y1={pT2_tr.y} x2={10} y2={pT2_tr.y} stroke={cDim} />
                    <line x1={-10} y1={pT2_br.y} x2={10} y2={pT2_br.y} stroke={cDim} />
                    <line x1={0} y1={pT2_tr.y} x2={0} y2={pT2_br.y} stroke={cDim} markerStart="url(#arrow)" markerEnd="url(#arrow)" />
                    <rect x={-15} y={cy - 10} width="30" height="20" fill="#0f172a" stroke="none" />
                    <text x={0} y={cy + 5} fill={cText} textAnchor="middle" fontSize="14" fontWeight="bold">D {D}</text>
                </g>

                {/* Radius (R) - Leader to Top Apex */}
                <g>
                    <line x1={cx} y1={pApex_top.y} x2={cx + 60} y2={pApex_top.y - 40} stroke={cDim} strokeDasharray="4" />
                    <circle cx={cx} cy={pApex_top.y} r="3" fill={cDim} />
                    <text x={cx + 65} y={pApex_top.y - 40} fill={cText} fontSize="14">R {R}</text>
                </g>

                {/* Fillet (r) - Leader to Corner */}
                <g>
                    <line x1={pT1_tr.x} y1={pT1_tr.y} x2={pT1_tr.x + 40} y2={pT1_tr.y + 40} stroke={cHighlight} />
                    <text x={pT1_tr.x + 45} y={pT1_tr.y + 45} fill={cHighlight} fontSize="14" fontWeight="bold">r {r}</text>
                </g>

                {/* Point Highlights */}
                <g>
                    <circle cx={pT2_tr.x} cy={pT2_tr.y} r="5" fill="#facc15" stroke="white" strokeWidth="2" />
                    <text x={pT2_tr.x - 15} y={pT2_tr.y - 10} fill="#facc15" fontSize="12" fontWeight="bold">A</text>

                    <circle cx={pT1_tr.x} cy={pT1_tr.y} r="5" fill="#facc15" stroke="white" strokeWidth="2" />
                    <text x={pT1_tr.x - 15} y={pT1_tr.y + 20} fill="#facc15" fontSize="12" fontWeight="bold">B</text>
                </g>

                {/* Sagitta h */}
                <g transform={`translate(${cx}, ${pApex_top.y})`}>
                    {/* Visualized small internal dimension if needed, or just text label */}
                    <text x={0} y={20} fill="#818cf8" textAnchor="middle" fontSize="12">h = {h_sagitta}</text>
                </g>

            </svg>
        );
    };

    return (
        <div className="w-full h-full flex flex-col relative" style={{ minHeight: 0 }}>
            {/* Back Button */}
            <div className="mb-2 sm:mb-4 flex-shrink-0" style={{ padding: '0 4px' }}>
                <button
                    onClick={onBack}
                    className="px-3 sm:px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg transition-colors flex items-center gap-2 shadow-btn text-sm sm:text-base"
                    style={{ touchAction: 'manipulation' }}
                >
                    <span>←</span>
                    <span>Назад</span>
                </button>
            </div>

            <div className="flex-1 overflow-auto bg-[#0b1121] rounded-lg shadow-inner">
                <div className="w-full h-full border border-[#1e293b] rounded-xl flex flex-col pt-6 pb-6" style={{ maxWidth: '900px', margin: '0 auto', background: 'radial-gradient(circle at top, #111827 0%, #0b1121 100%)' }}>
                    <h2 className="text-xl font-medium text-[#38bdf8] text-center border-b border-[#1e293b] pb-4 mx-8 mb-6">Калькулятор Сферы</h2>

                    {/* Responsive Grid: Stacks on mobile, Side-by-side on desktop */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start px-8">

                        {/* Inputs Panel */}
                        <div className="flex flex-col gap-5 bg-[#0f172a] p-6 rounded-xl border border-[#1e293b]">
                            <h3 className="m-0 text-sm font-semibold text-[#94a3b8] text-center mb-2">Параметры</h3>

                            <div className="flex justify-between items-center">
                                <label className="text-sm text-slate-200">Длина (L)</label>
                                <input type="number" className="w-32 p-2 bg-[#1e293b] text-slate-200 border border-slate-700 rounded-md shadow-inner text-right outline-none focus:border-sky-500 transition-colors" value={L} onChange={(e) => setL(e.target.value)} />
                            </div>
                            <div className="flex justify-between items-center">
                                <label className="text-sm text-slate-200">Диаметр (D)</label>
                                <input type="number" className="w-32 p-2 bg-[#1e293b] text-slate-200 border border-slate-700 rounded-md shadow-inner text-right outline-none focus:border-sky-500 transition-colors" value={D} onChange={(e) => setD(e.target.value)} />
                            </div>
                            <div className="flex justify-between items-center">
                                <label className="text-sm text-slate-200">Радиус (R)</label>
                                <input type="number" className="w-32 p-2 bg-[#1e293b] text-slate-200 border border-slate-700 rounded-md shadow-inner text-right outline-none focus:border-sky-500 transition-colors" value={R} onChange={(e) => setR(e.target.value)} />
                            </div>
                            <div className="flex justify-between items-center">
                                <label className="text-sm text-yellow-500 font-bold">Скругление (r)</label>
                                <input type="number" className="w-32 p-2 bg-[#1e293b] text-yellow-500 border border-yellow-500/50 rounded-md shadow-inner text-right outline-none focus:border-yellow-400 font-bold transition-colors" value={r} onChange={(e) => setr(e.target.value)} />
                            </div>

                            {result && (
                                <div className="mt-2 pt-4 border-t border-[#1e293b]">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[#818cf8] font-bold text-sm">Прогиб (h)</span>
                                        <span className="text-2xl text-indigo-400 font-mono">{result.h_sagitta}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Visualization Panel */}
                        <div className="min-h-[300px] flex items-center justify-center">
                            {drawProfile()}
                        </div>
                    </div>

                    {error && <div className="text-red-400 mt-4">{error}</div>}

                    {/* Compact Technical Table */}
                    {result && (
                        <div className="mt-8 px-8">
                            <h3 className="text-sm font-semibold text-[#94a3b8] mb-4 text-center">Координаты точек сопряжения</h3>
                            <div className="overflow-x-auto border border-[#1e293b] rounded-lg bg-[#0f172a]">
                                <table className="w-full border-collapse text-xs sm:text-sm text-left">
                                    <thead className="text-[#f8fafc] border-b border-[#1e293b]">
                                        <tr>
                                            <th className="p-3 font-medium">Точка</th>
                                            <th className="p-3 font-medium">Z (От торца)</th>
                                            <th className="p-3 font-medium">Ø (Диаметр)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.tangents.map((t: any, idx: number) => (
                                            <tr key={idx} className={idx < result.tangents.length - 1 ? "border-b border-[#1e293b]" : ""}>
                                                <td className="p-3 font-medium text-[#facc15]">
                                                    {t.label}
                                                </td>
                                                <td className="p-3 font-mono text-sm text-[#e2e8f0]">
                                                    {t.z}
                                                </td>
                                                <td className="p-3 font-mono text-sm text-[#38bdf8]">
                                                    {t.diameter}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="mt-8 text-center text-[#475569] text-xs">
                        © 2026 TrigMaster Pro.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SphereApp;
