import React, { useState, useEffect } from 'react';
import { IndustrialButton, ScrewHead, InfoPlate } from './IndustrialComponents';

interface RightTriangleAppProps {
    onBack: () => void;
}

const RightTriangleApp: React.FC<RightTriangleAppProps> = ({ onBack }) => {
    const [a, setA] = useState<string>('');
    const [b, setB] = useState<string>('');
    const [c, setC] = useState<string>('');
    const [alpha, setAlpha] = useState<string>('');
    const [beta, setBeta] = useState<string>('');
    const [error, setError] = useState<string>('');

    const clearAll = () => {
        setA('');
        setB('');
        setC('');
        setAlpha('');
        setBeta('');
        setError('');
    };

    const toRad = (deg: number) => deg * (Math.PI / 180);
    const toDeg = (rad: number) => rad * (180 / Math.PI);

    const calculate = () => {
        setError('');
        let valA = parseFloat(a);
        let valB = parseFloat(b);
        let valC = parseFloat(c);
        let valAlpha = parseFloat(alpha);
        let valBeta = parseFloat(beta);

        let count = 0;
        if (!isNaN(valA)) count++;
        if (!isNaN(valB)) count++;
        if (!isNaN(valC)) count++;
        if (!isNaN(valAlpha)) count++;
        if (!isNaN(valBeta)) count++;

        if (count < 2) {
            setError('Введите минимум 2 значения');
            return;
        }

        // Solver logic
        try {
            // 1. If we have 2 sides
            if (!isNaN(valA) && !isNaN(valB)) {
                valC = Math.sqrt(valA * valA + valB * valB);
                valAlpha = toDeg(Math.atan(valA / valB));
                valBeta = 90 - valAlpha;
            } else if (!isNaN(valA) && !isNaN(valC)) {
                if (valA >= valC) throw new Error('Катет должен быть меньше гипотенузы');
                valB = Math.sqrt(valC * valC - valA * valA);
                valAlpha = toDeg(Math.asin(valA / valC));
                valBeta = 90 - valAlpha;
            } else if (!isNaN(valB) && !isNaN(valC)) {
                if (valB >= valC) throw new Error('Катет должен быть меньше гипотенузы');
                valA = Math.sqrt(valC * valC - valB * valB);
                valAlpha = toDeg(Math.acos(valB / valC));
                valBeta = 90 - valAlpha;
            }
            // 2. If we have 1 side and 1 angle
            else if (!isNaN(valA) && !isNaN(valAlpha)) {
                valBeta = 90 - valAlpha;
                valC = valA / Math.sin(toRad(valAlpha));
                valB = valA / Math.tan(toRad(valAlpha));
            } else if (!isNaN(valA) && !isNaN(valBeta)) {
                valAlpha = 90 - valBeta;
                valC = valA / Math.cos(toRad(valBeta));
                valB = valA * Math.tan(toRad(valBeta));
            } else if (!isNaN(valB) && !isNaN(valAlpha)) {
                valBeta = 90 - valAlpha;
                valA = valB * Math.tan(toRad(valAlpha));
                valC = valB / Math.cos(toRad(valAlpha));
            } else if (!isNaN(valB) && !isNaN(valBeta)) {
                valAlpha = 90 - valBeta;
                valC = valB / Math.sin(toRad(valBeta));
                valA = valB / Math.tan(toRad(valBeta));
            } else if (!isNaN(valC) && !isNaN(valAlpha)) {
                valBeta = 90 - valAlpha;
                valA = valC * Math.sin(toRad(valAlpha));
                valB = valC * Math.cos(toRad(valAlpha));
            } else if (!isNaN(valC) && !isNaN(valBeta)) {
                valAlpha = 90 - valBeta;
                valB = valC * Math.sin(toRad(valBeta));
                valA = valC * Math.cos(toRad(valBeta));
            }
            // 3. Two angles (impossible to determine scale)
            else if (!isNaN(valAlpha) && !isNaN(valBeta)) {
                setError('Недостаточно данных (только углы)');
                return;
            }

            // Update state with formatted values
            setA(valA.toFixed(3));
            setB(valB.toFixed(3));
            setC(valC.toFixed(3));
            setAlpha(valAlpha.toFixed(3));
            setBeta(valBeta.toFixed(3));

        } catch (e: any) {
            setError(e.message || 'Ошибка расчета');
        }
    };



    return (
        <div className="flex flex-col h-full bg-zinc-900 border-2 border-zinc-700 rounded shadow-inner relative overflow-hidden">
            {/* Background Texture */}
            <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                    backgroundImage: `
            radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)
          `,
                    backgroundSize: '20px 20px'
                }}
            />

            {/* Header */}
            <div className="relative z-10 bg-zinc-800 p-2 border-b border-zinc-600 flex justify-between items-center shadow-md">
                <div className="flex items-center gap-2">
                    <button
                        onClick={onBack}
                        className="w-8 h-8 rounded bg-zinc-700 border border-zinc-500 text-zinc-300 flex items-center justify-center hover:bg-zinc-600 active:translate-y-0.5"
                    >
                        ◀
                    </button>
                    <h2 className="text-zinc-200 font-bold uppercase tracking-wider text-sm sm:text-base">Прямоугольный Треугольник</h2>
                </div>
                <InfoPlate text="TRIANGLE-CALC" />
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 z-10 custom-scrollbar">

                {/* Diagram - Larger and clearer */}
                <div className="bg-zinc-800/80 rounded border border-zinc-600 p-4 mb-6 flex justify-center relative shadow-inner min-h-[220px]">
                    <ScrewHead className="absolute top-2 left-2" />
                    <ScrewHead className="absolute top-2 right-2" />
                    <ScrewHead className="absolute bottom-2 left-2" />
                    <ScrewHead className="absolute bottom-2 right-2" />

                    <svg width="280" height="180" viewBox="-20 -20 320 220" className="stroke-white fill-none stroke-2">
                        {/* The Triangle - Scaled up */}
                        <path d="M60,160 L60,40 L240,160 Z" className="stroke-fanuc-yellow stroke-[3]" />

                        {/* Right Angle Marker */}
                        <path d="M60,140 L80,140 L80,160" className="stroke-white stroke-1" />

                        {/* Labels - Sides */}
                        <text x="35" y="100" className="fill-green-400 font-mono text-xl font-bold stroke-none">A</text>
                        <text x="150" y="185" className="fill-green-400 font-mono text-xl font-bold stroke-none">B</text>
                        <text x="160" y="90" className="fill-green-400 font-mono text-xl font-bold stroke-none">C</text>

                        {/* Labels - Angles */}
                        <text x="200" y="150" className="fill-cyan-400 font-mono text-lg stroke-none">β</text>
                        <text x="70" y="70" className="fill-cyan-400 font-mono text-lg stroke-none">α</text>
                    </svg>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-900/50 border border-red-500 text-red-200 p-2 rounded mb-4 text-center text-sm animate-pulse">
                        ⚠ {error}
                    </div>
                )}

                {/* Inputs Grid */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-6">
                    <InputField label="Катет A" value={a} onChange={setA} placeholder="0.000" />
                    <InputField label="Угол Alpha α" value={alpha} onChange={setAlpha} placeholder="0.000°" />

                    <InputField label="Катет B" value={b} onChange={setB} placeholder="0.000" />
                    <InputField label="Угол Beta β" value={beta} onChange={setBeta} placeholder="0.000°" />

                    <InputField label="Гипотенуза C" value={c} onChange={setC} placeholder="0.000" />
                    <div className="flex items-end justify-center pb-2">
                        <div className="text-zinc-500 text-xs text-center">
                            Заполните 2 поля
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-4">
                    <IndustrialButton label="СБРОС" variant="danger" onClick={clearAll} className="h-12 text-base" />
                    <IndustrialButton label="РАССЧИТАТЬ" variant="action" onClick={calculate} className="h-12 text-base" />
                </div>

            </div>
        </div>
    );
};

interface InputFieldProps {
    label: string;
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
}

const InputField: React.FC<InputFieldProps> = ({ label, value, onChange, placeholder }) => (
    <div className="flex flex-col gap-1 w-full">
        <label className="text-fanuc-yellow font-bold text-xs uppercase tracking-wider">{label}</label>
        <div className="relative bg-black border-2 border-zinc-600 rounded overflow-hidden">
            {/* Background Effect like Main Calc */}
            <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 pointer-events-none bg-[length:100%_4px,6px_100%]"></div>
            <input
                type="number"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-transparent text-cyan-400 font-mono text-xl p-2 focus:outline-none text-right tracking-widest drop-shadow-[0_0_5px_rgba(34,211,238,0.6)] z-20 relative"
            />
        </div>
    </div>
);

export default RightTriangleApp;
