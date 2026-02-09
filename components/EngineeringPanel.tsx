import React, { useState } from 'react';
import { IndustrialButton } from './IndustrialComponents';
import G12PolyhedronWrapper from './G12PolyhedronWrapper';
import TolerancesApp from './TolerancesApp';
import RightTriangleApp from './RightTriangleApp';

const EngineeringPanel: React.FC = () => {
  const [showG121, setShowG121] = useState(false);
  const [showTolerances, setShowTolerances] = useState(false);
  const [showTriangle, setShowTriangle] = useState(false);
  const [showChamferModal, setShowChamferModal] = useState(false);

  const handleG121 = () => {
    setShowG121(true);
  };

  const handleBack = () => {
    setShowG121(false);
    setShowTolerances(false);
    setShowTriangle(false);
  };

  const handleRectangular = () => {
    setShowTriangle(true);
  };

  const handleTolerances = () => {
    setShowTolerances(true);
  };

  const handleChamfers = () => {
    setShowChamferModal(true);
  };

  const closeChamferModal = () => {
    setShowChamferModal(false);
  };

  // Если показываем допуски
  if (showTolerances) {
    return <TolerancesApp onBack={handleBack} />;
  }

  // Если показываем Треугольник
  if (showTriangle) {
    return <RightTriangleApp onBack={handleBack} />;
  }

  // Если показываем G12.1
  if (showG121) {
    return (
      <div className="flex flex-col h-full bg-zinc-900 p-4 border-2 border-zinc-700 rounded shadow-inner relative overflow-hidden">
        <G12PolyhedronWrapper onBack={handleBack} />
      </div>
    );
  }

  // Иначе показываем список модулей
  return (
    <div
      className="flex flex-col h-full bg-zinc-900 p-4 border-2 border-zinc-700 rounded shadow-inner relative overflow-hidden"
      style={{
        backgroundImage: `
          radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)
        `,
        backgroundSize: '20px 20px'
      }}
    >
      {/* Дополнительный слой текстуры для эффекта "рябчика" */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0),
            radial-gradient(circle at 18px 18px, rgba(255,255,255,0.08) 1px, transparent 0)
          `,
          backgroundSize: '20px 20px, 25px 25px',
          backgroundPosition: '0 0, 10px 10px'
        }}
      />

      <div className="flex-1 flex flex-col gap-4 justify-center relative z-10">
        {/* Modal Overlay for "In Development" */}
        {showChamferModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-zinc-800 border-4 border-fanuc-yellow p-6 rounded shadow-[0_0_50px_rgba(255,236,0,0.3)] max-w-sm w-full text-center relative">
              {/* Bolts */}
              <div className="absolute top-2 left-2 w-3 h-3 rounded-full bg-zinc-400 border border-zinc-600 flex items-center justify-center"><div className="w-full h-0.5 bg-zinc-700 rotate-45"></div></div>
              <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-zinc-400 border border-zinc-600 flex items-center justify-center"><div className="w-full h-0.5 bg-zinc-700 rotate-45"></div></div>
              <div className="absolute bottom-2 left-2 w-3 h-3 rounded-full bg-zinc-400 border border-zinc-600 flex items-center justify-center"><div className="w-full h-0.5 bg-zinc-700 rotate-45"></div></div>
              <div className="absolute bottom-2 right-2 w-3 h-3 rounded-full bg-zinc-400 border border-zinc-600 flex items-center justify-center"><div className="w-full h-0.5 bg-zinc-700 rotate-45"></div></div>

              <h3 className="text-fanuc-yellow font-black text-2xl mb-4 tracking-widest uppercase italic drop-shadow-md">ВНИМАНИЕ</h3>

              <div className="bg-black/50 border border-zinc-600 p-4 mb-6 rounded">
                <p className="text-white font-mono text-lg mb-2">РАЗДЕЛЫ В РАЗРАБОТКЕ</p>
                <p className="text-zinc-400 font-mono text-xs">ПОЯВИТСЯ ПОСЛЕ</p>
                <p className="text-green-400 font-mono text-xl font-bold mt-1 tracking-widest">14.02.2026</p>
              </div>

              <IndustrialButton
                label="ПОНЯТНО"
                onClick={closeChamferModal}
                className="w-full h-12 text-base border-fanuc-yellow/50 hover:bg-fanuc-yellow/20"
              />
            </div>
          </div>
        )}

        {/* Кнопки в стиле калькулятора */}
        <div className="grid grid-cols-1 gap-4">
          <IndustrialButton
            label="G12.1"
            subLabel="МНОГОГРАННИК"
            onClick={handleG121}
            className="bg-zinc-800 text-zinc-100 border-2 border-zinc-600 h-20 text-xl font-bold shadow-lg hover:bg-zinc-700 hover:border-fanuc-yellow hover:shadow-[0_0_12px_rgba(255,236,0,0.6)] transition-all duration-200"
          />

          <IndustrialButton
            label="Прямоугольный"
            subLabel="ТРЕУГОЛЬНИК"
            onClick={handleRectangular}
            className="bg-zinc-800 text-zinc-100 border-2 border-zinc-600 h-20 text-xl font-bold shadow-lg hover:bg-zinc-700 hover:border-fanuc-yellow hover:shadow-[0_0_12px_rgba(255,236,0,0.6)] transition-all duration-200"
          />

          <IndustrialButton
            label="ДОПУСКИ"
            onClick={handleTolerances}
            className="bg-zinc-800 text-zinc-100 border-2 border-zinc-600 h-20 text-xl font-bold shadow-lg hover:bg-zinc-700 hover:border-fanuc-yellow hover:shadow-[0_0_12px_rgba(255,236,0,0.6)] transition-all duration-200"
          />

          <IndustrialButton
            label="ФАСКИ И"
            subLabel="ПРИТУПЛЕНИЯ"
            onClick={handleChamfers}
            className="bg-zinc-800 text-zinc-100 border-2 border-zinc-600 h-20 text-xl font-bold shadow-lg hover:bg-zinc-700 hover:border-fanuc-yellow hover:shadow-[0_0_12px_rgba(255,236,0,0.6)] transition-all duration-200"
          />
        </div>
      </div>
    </div>
  );
};

export default EngineeringPanel;
