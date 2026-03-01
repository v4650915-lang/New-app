import React, { useState, useEffect, useRef } from 'react';

const G12Polyhedron: React.FC = () => {
  const [shape, setShape] = useState('6');
  const [sides, setSides] = useState('5');
  const [S, setS] = useState('27');
  const [R, setR] = useState('0.5');
  const [depth, setDepth] = useState('10');
  const [D, setD] = useState('12');
  const [Z, setZ] = useState('4');
  const [dBase, setDBase] = useState('40'); // диаметр заготовки для лысок
  const [dir, setDir] = useState('climb');
  const [rpm, setRpm] = useState('2000');
  const [vc, setVc] = useState('75');
  const [fz, setFz] = useState('0.05');
  const [activeTab, setActiveTab] = useState('draw');
  const [gcode, setGcode] = useState('Нажмите РАССЧИТАТЬ');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animIdRef = useRef<number | null>(null);
  const pathPointsRef = useRef<Array<{ x: number, y: number }>>([]);
  const simDataRef = useRef({ N: 6, S: 27, D: 12, dBase: 40 });
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastEditedRef = useRef<'rpm' | 'vc' | null>(null);

  const vib = () => {
    if (navigator.vibrate) navigator.vibrate(5);
  };

  // Хелпер: пустая строка → дефолт при потере фокуса
  const handleBlur = (val: string, setter: (v: string) => void, def: string) => {
    if (val.trim() === '' || val === '-' || isNaN(Number(val))) setter(def);
  };

  const syncVc = () => {
    const dNum = Number(D);
    const rpmNum = Number(rpm);
    if (dNum > 0 && rpmNum > 0) {
      const val = (Math.PI * dNum * rpmNum) / 1000;
      setVc(String(Math.round(val)));
    }
  };

  const syncRpm = () => {
    const dNum = Number(D);
    const vcNum = Number(vc);
    if (dNum > 0 && vcNum > 0) {
      const val = (vcNum * 1000) / (Math.PI * dNum);
      setRpm(String(Math.round(val)));
    }
  };

  // Автоматическая синхронизация при изменении диаметра фрезы
  useEffect(() => {
    if (Number(D) > 0 && Number(rpm) > 0) {
      syncVc();
    }
  }, [D]);

  // Автоматическая синхронизация Vc при изменении оборотов (с задержкой 2.5 секунды)
  useEffect(() => {
    // Пропускаем пересчет, если последним редактировалось Vc (чтобы избежать цикла)
    if (lastEditedRef.current === 'vc') {
      return;
    }

    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
    }

    syncTimerRef.current = setTimeout(() => {
      if (Number(D) > 0 && Number(rpm) > 0) {
        lastEditedRef.current = 'rpm';
        syncVc();
        lastEditedRef.current = null;
      }
    }, 2500);

    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
    };
  }, [rpm, D]);

  // Автоматическая синхронизация оборотов при изменении Vc (с задержкой 2.5 секунды)
  useEffect(() => {
    // Пропускаем пересчет, если последним редактировались обороты (чтобы избежать цикла)
    if (lastEditedRef.current === 'rpm') {
      return;
    }

    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
    }

    syncTimerRef.current = setTimeout(() => {
      if (Number(D) > 0 && Number(vc) > 0) {
        lastEditedRef.current = 'vc';
        syncRpm();
        lastEditedRef.current = null;
      }
    }, 2500);

    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
    };
  }, [vc, D]);

  const updateStock = () => {
    let N = shape === 'custom' ? parseInt(sides) : parseInt(shape);
    const sNum = Number(S);
    let minD = (N === 2) ? sNum : sNum / Math.cos(Math.PI / N);
    return minD;
  };

  const formatGCode = (num: number): string => {
    const fixed = num.toFixed(3);
    // Парсим обратно в число, чтобы убрать ошибки округления
    const parsed = parseFloat(fixed);
    // Проверяем, является ли число целым
    if (parsed % 1 === 0) {
      return parsed + '.';
    }
    // Убираем лишние нули в конце
    return fixed.replace(/\.?0+$/, '');
  };

  const calculate = () => {
    vib();
    let N = shape === 'custom' ? parseInt(sides) : parseInt(shape);
    const rpmNum = Number(rpm);
    const fzNum = Number(fz);
    const ZNum = Number(Z);
    const DNum = Number(D);
    const SNum = Number(S);
    const RNum = Number(R);
    const depthNum = Number(depth);
    const dBaseNum = Number(dBase);

    const feed = Math.round(rpmNum * fzNum * ZNum);
    const r_tool = DNum / 2;
    const r_in = SNum / 2;
    const isClimb = (dir === 'climb');

    // ===== ЛЫСКИ (N=2): правильная стратегия =====
    if (N === 2) {
      const r_bl = dBaseNum / 2;
      // X во время реза (диам. программирование): X = S + D_FR
      const cutX = SNum + DNum;
      // Безопасный подход: X = D_BL + D_FR + 6
      const safeX = dBaseNum + DNum + 6.0;
      // C = sqrt((R_bl + r_tool)^2 - (S/2 + r_tool)^2) — точки входа/выхода
      const inner = Math.pow(r_bl + r_tool, 2) - Math.pow(SNum / 2 + r_tool, 2);
      const C_val = inner > 0 ? Math.sqrt(inner) : 0;

      let g = `%\nO0001(LISKI S=${SNum} D_BL=${dBaseNum})\n`;
      g += `G0 G40 G97 G98\n`;
      g += `T0505 M5 (Freza=${DNum})\n`;
      g += `(C axis on)\n`;
      g += `G28H0.\n`;
      g += `M3 S${rpmNum}\n`;
      g += `G0 X${formatGCode(safeX)} Z2. C0.\n`;
      g += `G1 Z-${formatGCode(depthNum)} F1000\n`;
      g += `G12.1 (POLAR-ON)\n`;
      g += `(--LISKA-1--)\n`;
      g += `G1 X${formatGCode(cutX)} C-${formatGCode(C_val)} F${formatGCode(feed)}\n`;
      g += `C${formatGCode(C_val)}\n`;
      g += `G1 Z2. F1000\n`;
      g += `G13.1 (POLAR-OFF)\n`;
      g += `G0 C180. X${formatGCode(safeX)}\n`;
      g += `G1 Z-${formatGCode(depthNum)} F1000\n`;
      g += `G12.1 (POLAR-ON)\n`;
      g += `(--LISKA-2--)\n`;
      g += `G1 X${formatGCode(cutX)} C-${formatGCode(C_val)} F${formatGCode(feed)}\n`;
      g += `C${formatGCode(C_val)}\n`;
      g += `G1 Z2. F1000\n`;
      g += `G13.1 (POLAR-OFF)\n`;
      g += `G0 Z10. M5\n`;
      g += `(C axis off)\n`;
      g += `M9\n`;
      g += `G99\n`;
      g += `G28 U0.\n`;
      g += `G28 W0.\n`;
      g += `M30\n%`;

      // Путь для анимации: два вертикальных прохода (в осях детали)
      // Лыска 1 — правая: X = +(S/2+r_tool), Y от -C_val до +C_val
      // Лыска 2 — левая: X = -(S/2+r_tool), Y от -C_val до +C_val
      pathPointsRef.current = [];
      const steps = 60;
      const toolX = SNum / 2 + r_tool;  // расстояние центра инструмента от оси
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        pathPointsRef.current.push({ x: toolX, y: -C_val + 2 * C_val * t });
      }
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        pathPointsRef.current.push({ x: -toolX, y: -C_val + 2 * C_val * t });
      }

      setGcode(g);
      simDataRef.current = { N, S: SNum, D: DNum, dBase: dBaseNum };
      startAnimation(isClimb);
      return;
    }

    // ===== МНОГОГРАННИКИ (N >= 3): стандартная стратегия =====
    const R_total = RNum + r_tool;
    let stockD = SNum / Math.cos(Math.PI / N);
    let safeX = stockD + DNum + 3.0;

    const isSharp = (RNum <= 0.001 && N >= 3);

    let g = `%\nO0001(N${N} S${SNum} D${DNum} R${RNum})\n`;
    g += `G0 G40 G97 G98\n`;
    g += `T0101 M5 (Freza=${DNum})\n`;
    g += `(C axis on)\n`;
    g += `G28H0.\n`;
    g += `M3 S${rpmNum}\n`;
    g += `G0 X${formatGCode(safeX)} Z2. C0.\n`;
    g += `G1 Z-${formatGCode(depthNum)} F1000\n`;
    g += `G12.1 (POLAR-ON)\n`;

    pathPointsRef.current = [];
    const step = (Math.PI * 2) / N;
    const halfStep = step / 2;
    const distToCenterArc = (r_in - RNum) / Math.cos(halfStep);
    const distSharpVertex = (r_in + r_tool) / Math.cos(halfStep);
    const gArc = isClimb ? 'G03' : 'G02';

    let firstPointGCode = "";

    for (let i = 0; i < N; i++) {
      let angle = isClimb ? (i * step) : (-i * step);
      let dirSign = isClimb ? 1 : -1;
      let vertexAngle = angle + halfStep * dirSign;

      if (isSharp) {
        let vx = distSharpVertex * Math.cos(vertexAngle);
        let vy = distSharpVertex * Math.sin(vertexAngle);
        let lineStr = `X${formatGCode(vx * 2)} C${formatGCode(vy)}`;
        if (i === 0) { g += `G01 ${lineStr} F${feed}\n`; firstPointGCode = lineStr; }
        else { g += `G01 ${lineStr}\n`; }
        pathPointsRef.current.push({ x: vx, y: vy });
      } else {
        let cx = distToCenterArc * Math.cos(vertexAngle);
        let cy = distToCenterArc * Math.sin(vertexAngle);
        let a1 = angle;
        let a2 = angle + step * dirSign;
        let p1x = cx + R_total * Math.cos(a1);
        let p1y = cy + R_total * Math.sin(a1);
        let p2x = cx + R_total * Math.cos(a2);
        let p2y = cy + R_total * Math.sin(a2);
        let lineStr = `X${formatGCode(p1x * 2)} C${formatGCode(p1y)}`;
        if (i === 0) { g += `G01 ${lineStr} F${feed}\n`; firstPointGCode = lineStr; }
        else { g += `G01 ${lineStr}\n`; }
        if (R_total > 0.001) {
          g += `${gArc} X${formatGCode(p2x * 2)} C${formatGCode(p2y)} R${formatGCode(R_total)}\n`;
        }
        pathPointsRef.current.push({ x: p1x, y: p1y });
        const startAng = Math.atan2(p1y - cy, p1x - cx);
        let endAng = Math.atan2(p2y - cy, p2x - cx);
        if (isClimb) { if (endAng <= startAng) endAng += Math.PI * 2; }
        else { if (endAng >= startAng) endAng -= Math.PI * 2; }
        for (let k = 1; k <= 8; k++) {
          let t = k / 8;
          let ang = startAng + (endAng - startAng) * t;
          pathPointsRef.current.push({ x: cx + R_total * Math.cos(ang), y: cy + R_total * Math.sin(ang) });
        }
      }
    }

    if (firstPointGCode) g += `G01 ${firstPointGCode} (CLOSE PROFILE)\n`;

    g += `G13.1 (POLAR-OFF)\n`;
    g += `G0 Z10. M5\n`;
    g += `(C axis off)\n`;
    g += `M9\n`;
    g += `G99\n`;
    g += `G28 U0.\n`;
    g += `G28 W0.\n`;
    g += `M30\n%`;

    setGcode(g);
    simDataRef.current = { N, S: SNum, D: DNum, dBase: dBaseNum };
    startAnimation(isClimb);
  };

  const startAnimation = (isClimb: boolean) => {
    if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    cvs.width = cvs.clientWidth;
    cvs.height = cvs.clientHeight;

    let pointIdx = 0;
    let toolRot = 0;
    const simData = simDataRef.current;
    const pathPoints = pathPointsRef.current;
    if (pathPoints.length === 0) return;

    // ===== АНИМАЦИЯ ЛЫСОК (N=2) =====
    if (simData.N === 2) {
      const canvasCX = cvs.width / 2;
      const canvasCY = cvs.height / 2;
      const r_bl = simData.dBase / 2;
      const flatHalf = simData.S / 2;  // расстояние от оси до плоскости лыски
      const rTool = simData.D / 2;
      const scale = (Math.min(canvasCX, canvasCY) - 20) / (r_bl + rTool + 4);

      function renderFlat() {
        pointIdx += 0.03;  // та же скорость что у многогранников
        if (pointIdx >= pathPoints.length) pointIdx = 0;
        const idx = Math.floor(pointIdx) % pathPoints.length;
        const nextIdx = (idx + 1) % pathPoints.length;
        const frac = pointIdx - Math.floor(pointIdx);
        const p1 = pathPoints[idx];
        const p2 = pathPoints[nextIdx];
        const curX = p1.x + (p2.x - p1.x) * frac;
        const curY = p1.y + (p2.y - p1.y) * frac;

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, cvs.width, cvs.height);
        ctx.save();
        ctx.translate(canvasCX, canvasCY);

        // Заготовка: серый круг
        ctx.beginPath();
        ctx.arc(0, 0, r_bl * scale, 0, Math.PI * 2);
        ctx.fillStyle = '#4a5568';
        ctx.fill();

        // Убираем материал лысок (чёрные прямоугольники поверх круга)
        // Лыска 1 — правая: x > flatHalf
        ctx.fillStyle = '#000';
        ctx.fillRect(flatHalf * scale, -r_bl * scale, (r_bl - flatHalf) * scale + 2, r_bl * 2 * scale);
        // Лыска 2 — левая: x < -flatHalf
        ctx.fillRect(-r_bl * scale - 2, -r_bl * scale, (r_bl - flatHalf) * scale + 2, r_bl * 2 * scale);

        // Контур заготовки и линии лысок
        ctx.strokeStyle = '#2ecc71';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(0, 0, r_bl * scale, 0, Math.PI * 2);
        ctx.stroke();
        // Вертикальные линии лысок
        ctx.beginPath();
        ctx.moveTo(flatHalf * scale, -r_bl * scale);
        ctx.lineTo(flatHalf * scale, r_bl * scale);
        ctx.moveTo(-flatHalf * scale, -r_bl * scale);
        ctx.lineTo(-flatHalf * scale, r_bl * scale);
        ctx.stroke();

        // Ось Y (пунктир)
        ctx.strokeStyle = '#333';
        ctx.setLineDash([3, 5]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -canvasCY);
        ctx.lineTo(0, canvasCY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Инструмент (canvas Y перевёрнут, поэтому y → -y)
        ctx.save();
        ctx.translate(curX * scale, -curY * scale);
        toolRot += 0.05;
        ctx.rotate(toolRot);
        const rToolPx = rTool * scale;
        ctx.fillStyle = 'rgba(241, 196, 15, 0.45)';
        ctx.strokeStyle = '#f1c40f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, rToolPx, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-rToolPx, 0); ctx.lineTo(rToolPx, 0);
        ctx.moveTo(0, -rToolPx); ctx.lineTo(0, rToolPx);
        ctx.stroke();
        ctx.restore();
        ctx.restore();

        animIdRef.current = requestAnimationFrame(renderFlat);
      }
      renderFlat();
      return;
    }

    // ===== АНИМАЦИЯ МНОГОГРАННИКОВ =====
    function render() {
      pointIdx += 0.03;
      if (pointIdx >= pathPoints.length) pointIdx = 0;

      let idx = Math.floor(pointIdx);
      let nextIdx = (idx + 1) % pathPoints.length;
      let t = pointIdx - idx;
      let p1 = pathPoints[idx];
      let p2 = pathPoints[nextIdx];

      let curX = p1.x + (p2.x - p1.x) * t;
      let curY = p1.y + (p2.y - p1.y) * t;

      let radius = Math.sqrt(curX * curX + curY * curY);
      let angle = Math.atan2(curY, curX);

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, cvs.width, cvs.height);
      const cx = cvs.width / 2;
      const cy = cvs.height / 2;
      const scale = (Math.min(cx, cy) - 30) / simData.S;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-angle - Math.PI / 2);
      ctx.strokeStyle = '#2ecc71';
      ctx.lineWidth = 3;
      ctx.setLineDash([]);
      ctx.beginPath();
      const step = (Math.PI * 2) / simData.N;
      const r_vert = (simData.S / 2) / Math.cos(step / 2);
      for (let i = 0; i <= simData.N; i++) {
        let a = i * step + step / 2;
        let px = r_vert * Math.cos(a) * scale;
        let py = r_vert * Math.sin(a) * scale;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();

      let toolScreenY = cy - radius * scale;
      ctx.save();
      ctx.translate(cx, toolScreenY);
      toolRot += 0.05;
      ctx.rotate(toolRot);
      let rToolPx = (simData.D / 2) * scale;
      ctx.fillStyle = 'rgba(241, 196, 15, 0.5)';
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, rToolPx, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-rToolPx, 0); ctx.lineTo(rToolPx, 0);
      ctx.moveTo(0, -rToolPx); ctx.lineTo(0, rToolPx);
      ctx.stroke();
      ctx.restore();

      ctx.strokeStyle = '#333';
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, cvs.height);
      ctx.stroke();

      animIdRef.current = requestAnimationFrame(render);
    }
    render();
  };

  const copyCode = () => {
    vib();
    navigator.clipboard.writeText(gcode).then(() => {
      alert("Скопировано!");
    });
  };

  useEffect(() => {
    calculate();
  }, []);

  const stockD = updateStock();

  return (
    <div style={{
      background: '#121212',
      color: '#ecf0f1',
      fontFamily: "'Roboto Mono', monospace",
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', background: '#000', borderBottom: '2px solid #444', flexShrink: 0, height: '48px' }}>
        <button
          onClick={() => { vib(); setActiveTab('draw'); }}
          style={{
            flex: 1,
            background: '#000',
            color: activeTab === 'draw' ? '#f1c40f' : '#7f8c8d',
            border: 'none',
            fontSize: 'clamp(0.75rem, 2.5vw, 1rem)',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            cursor: 'pointer',
            borderBottom: activeTab === 'draw' ? '4px solid #f1c40f' : '4px solid transparent',
            padding: '8px 4px'
          }}
        >
          НАСТРОЙКИ
        </button>
        <button
          onClick={() => { vib(); setActiveTab('code'); }}
          style={{
            flex: 1,
            background: '#000',
            color: activeTab === 'code' ? '#f1c40f' : '#7f8c8d',
            border: 'none',
            fontSize: 'clamp(0.75rem, 2.5vw, 1rem)',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            cursor: 'pointer',
            borderBottom: activeTab === 'code' ? '4px solid #f1c40f' : '4px solid transparent',
            padding: '8px 4px'
          }}
        >
          G-КОД
        </button>
      </div>

      {activeTab === 'draw' && (
        <div style={{ flex: 1, padding: 'clamp(8px, 2vw, 10px)', overflowY: 'auto', fontSize: 'clamp(0.75rem, 3vw, 0.9rem)' }}>
          <div style={{ background: '#1e1e1e', padding: 'clamp(8px, 2vw, 10px)', borderRadius: '6px', marginBottom: '8px', border: '1px solid #444' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px', flexWrap: 'wrap' }}>
              <label style={{ color: '#7f8c8d', fontSize: 'clamp(0.7rem, 2.5vw, 0.85rem)', flex: '1', minWidth: '100px' }}>ФОРМА</label>
              <select
                id="shape"
                value={shape}
                onChange={(e) => { vib(); setShape(e.target.value); }}
                style={{ background: '#2d2d2d', border: '1px solid #444', color: '#f1c40f', fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)', padding: 'clamp(6px, 1.5vw, 8px)', borderRadius: '4px', minWidth: '120px', maxWidth: '140px', fontFamily: "'Roboto Mono', monospace", flex: '1' }}
              >
                <option value="6">Шестигранник</option>
                <option value="4">Квадрат</option>
                <option value="2">Лыски (2)</option>
                <option value="custom">Кастом (N)</option>
              </select>
            </div>
            {shape === 'custom' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px', flexWrap: 'wrap' }}>
                <label style={{ color: '#7f8c8d', fontSize: 'clamp(0.7rem, 2.5vw, 0.85rem)', flex: '1', minWidth: '100px' }}>ГРАНЕЙ (N)</label>
                <input
                  type="number"
                  value={sides}
                  onChange={(e) => { vib(); setSides(e.target.value); }}
                  onBlur={() => handleBlur(sides, setSides, '5')}
                  style={{ background: '#2d2d2d', border: '1px solid #444', color: '#f1c40f', fontSize: 'clamp(0.9rem, 3vw, 1.1rem)', padding: 'clamp(6px, 1.5vw, 8px)', borderRadius: '4px', minWidth: '80px', maxWidth: '90px', textAlign: 'center', fontFamily: "'Roboto Mono', monospace", flex: '1' }}
                />
              </div>
            )}
          </div>

          <div style={{ background: '#1e1e1e', padding: 'clamp(8px, 2vw, 10px)', borderRadius: '6px', marginBottom: '8px', border: '1px solid #444' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1', minWidth: '120px' }}>
                <label style={{ color: '#7f8c8d', fontSize: 'clamp(0.7rem, 2.5vw, 0.85rem)', display: 'block' }}>S (ПОД КЛЮЧ)</label>
                {shape !== '2' && <span style={{ display: 'block', fontSize: 'clamp(0.6rem, 2vw, 0.7rem)', color: '#f1c40f' }}>ЗАГОТОВКА: ⌀{stockD.toFixed(2)}</span>}
              </div>
              <input
                type="number"
                value={S}
                step="0.1"
                onChange={(e) => { vib(); setS(e.target.value); }}
                onBlur={() => handleBlur(S, setS, '27')}
                style={{ background: '#2d2d2d', border: '1px solid #444', color: '#f1c40f', fontSize: 'clamp(0.9rem, 3vw, 1.1rem)', padding: 'clamp(6px, 1.5vw, 8px)', borderRadius: '4px', minWidth: '80px', maxWidth: '90px', textAlign: 'center', fontFamily: "'Roboto Mono', monospace", flex: '1' }}
              />
            </div>
            {/* Диаметр заготовки — только для лысок */}
            {shape === '2' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px', flexWrap: 'wrap' }}>
                <label style={{ color: '#7f8c8d', fontSize: 'clamp(0.7rem, 2.5vw, 0.85rem)', flex: '1', minWidth: '100px' }}>ДИАМЕТР ⌀</label>
                <input
                  type="number"
                  value={dBase}
                  step="1"
                  onChange={(e) => { vib(); setDBase(e.target.value); }}
                  onBlur={() => handleBlur(dBase, setDBase, '40')}
                  style={{ background: '#2d2d2d', border: '1px solid #f1c40f', color: '#f1c40f', fontSize: 'clamp(0.9rem, 3vw, 1.1rem)', padding: 'clamp(6px, 1.5vw, 8px)', borderRadius: '4px', minWidth: '80px', maxWidth: '90px', textAlign: 'center', fontFamily: "'Roboto Mono', monospace", flex: '1' }}
                />
              </div>
            )}
            {shape !== '2' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px', flexWrap: 'wrap' }}>
                <label style={{ color: '#7f8c8d', fontSize: 'clamp(0.7rem, 2.5vw, 0.85rem)', flex: '1', minWidth: '100px' }}>R (СКРУГЛЕНИЕ)</label>
                <input
                  type="number"
                  value={R}
                  step="0.1"
                  min="0"
                  onChange={(e) => { vib(); setR(e.target.value); }}
                  onBlur={() => handleBlur(R, setR, '0.5')}
                  style={{ background: '#2d2d2d', border: '1px solid #444', color: '#f1c40f', fontSize: 'clamp(0.9rem, 3vw, 1.1rem)', padding: 'clamp(6px, 1.5vw, 8px)', borderRadius: '4px', minWidth: '80px', maxWidth: '90px', textAlign: 'center', fontFamily: "'Roboto Mono', monospace", flex: '1' }}
                />
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <label style={{ color: '#7f8c8d', fontSize: 'clamp(0.7rem, 2.5vw, 0.85rem)', flex: '1', minWidth: '100px' }}>ГЛУБИНА (Z)</label>
              <input
                type="number"
                value={depth}
                step="0.5"
                onChange={(e) => { vib(); setDepth(e.target.value); }}
                onBlur={() => handleBlur(depth, setDepth, '10')}
                style={{ background: '#2d2d2d', border: '1px solid #444', color: '#f1c40f', fontSize: 'clamp(0.9rem, 3vw, 1.1rem)', padding: 'clamp(6px, 1.5vw, 8px)', borderRadius: '4px', minWidth: '80px', maxWidth: '90px', textAlign: 'center', fontFamily: "'Roboto Mono', monospace", flex: '1' }}
              />
            </div>
          </div>

          <div style={{ background: '#1e1e1e', padding: 'clamp(8px, 2vw, 10px)', borderRadius: '6px', marginBottom: '8px', border: '1px solid #444' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px', flexWrap: 'wrap' }}>
              <label style={{ color: '#7f8c8d', fontSize: 'clamp(0.7rem, 2.5vw, 0.85rem)', flex: '1', minWidth: '100px' }}>ФРЕЗА ⌀</label>
              <input
                type="number"
                value={D}
                step="0.1"
                onChange={(e) => { vib(); setD(e.target.value); }}
                onBlur={() => handleBlur(D, setD, '12')}
                style={{ background: '#2d2d2d', border: '1px solid #444', color: '#f1c40f', fontSize: 'clamp(0.9rem, 3vw, 1.1rem)', padding: 'clamp(6px, 1.5vw, 8px)', borderRadius: '4px', minWidth: '80px', maxWidth: '90px', textAlign: 'center', fontFamily: "'Roboto Mono', monospace", flex: '1' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <label style={{ color: '#7f8c8d', fontSize: 'clamp(0.7rem, 2.5vw, 0.85rem)', flex: '1', minWidth: '100px' }}>ЗУБЬЕВ</label>
              <input
                type="number"
                value={Z}
                onChange={(e) => { vib(); setZ(e.target.value); }}
                onBlur={() => handleBlur(Z, setZ, '4')}
                style={{ background: '#2d2d2d', border: '1px solid #444', color: '#f1c40f', fontSize: 'clamp(0.9rem, 3vw, 1.1rem)', padding: 'clamp(6px, 1.5vw, 8px)', borderRadius: '4px', minWidth: '80px', maxWidth: '90px', textAlign: 'center', fontFamily: "'Roboto Mono', monospace", flex: '1' }}
              />
            </div>
          </div>

          <div style={{ background: '#1e1e1e', padding: 'clamp(8px, 2vw, 10px)', borderRadius: '6px', marginBottom: '8px', border: '1px solid #444' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px', flexWrap: 'wrap' }}>
              <label style={{ color: '#7f8c8d', fontSize: 'clamp(0.7rem, 2.5vw, 0.85rem)', flex: '1', minWidth: '100px' }}>НАПРАВЛЕНИЕ</label>
              <select
                value={dir}
                onChange={(e) => { vib(); setDir(e.target.value); }}
                style={{ background: '#2d2d2d', border: '1px solid #444', color: '#f1c40f', fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)', padding: 'clamp(6px, 1.5vw, 8px)', borderRadius: '4px', minWidth: '120px', maxWidth: '140px', fontFamily: "'Roboto Mono', monospace", flex: '1' }}
              >
                <option value="climb">ПОПУТНОЕ</option>
                <option value="conv">ВСТРЕЧНОЕ</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px', flexWrap: 'wrap' }}>
              <label style={{ color: '#7f8c8d', fontSize: 'clamp(0.7rem, 2.5vw, 0.85rem)', flex: '1', minWidth: '100px' }}>ОБОРОТЫ (S)</label>
              <input
                type="number"
                value={rpm}
                onChange={(e) => { vib(); lastEditedRef.current = 'rpm'; setRpm(e.target.value); }}
                onBlur={() => handleBlur(rpm, setRpm, '2000')}
                style={{ background: '#2d2d2d', border: '1px solid #444', color: '#f1c40f', fontSize: 'clamp(0.9rem, 3vw, 1.1rem)', padding: 'clamp(6px, 1.5vw, 8px)', borderRadius: '4px', minWidth: '80px', maxWidth: '90px', textAlign: 'center', fontFamily: "'Roboto Mono', monospace", flex: '1' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px', flexWrap: 'wrap' }}>
              <label style={{ color: '#7f8c8d', fontSize: 'clamp(0.7rem, 2.5vw, 0.85rem)', flex: '1', minWidth: '100px' }}>Vc (М/МИН)</label>
              <input
                type="number"
                value={vc}
                onChange={(e) => { vib(); lastEditedRef.current = 'vc'; setVc(e.target.value); }}
                onBlur={() => handleBlur(vc, setVc, '75')}
                style={{ background: '#2d2d2d', border: '1px solid #444', color: '#f1c40f', fontSize: 'clamp(0.9rem, 3vw, 1.1rem)', padding: 'clamp(6px, 1.5vw, 8px)', borderRadius: '4px', minWidth: '80px', maxWidth: '90px', textAlign: 'center', fontFamily: "'Roboto Mono', monospace", flex: '1' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <label style={{ color: '#7f8c8d', fontSize: 'clamp(0.7rem, 2.5vw, 0.85rem)', flex: '1', minWidth: '100px' }}>Fz (НА ЗУБ)</label>
              <input
                type="number"
                value={fz}
                step="0.01"
                onChange={(e) => { vib(); setFz(e.target.value); }}
                onBlur={() => handleBlur(fz, setFz, '0.05')}
                style={{ background: '#2d2d2d', border: '1px solid #444', color: '#f1c40f', fontSize: 'clamp(0.9rem, 3vw, 1.1rem)', padding: 'clamp(6px, 1.5vw, 8px)', borderRadius: '4px', minWidth: '80px', maxWidth: '90px', textAlign: 'center', fontFamily: "'Roboto Mono', monospace", flex: '1' }}
              />
            </div>
          </div>

          <button
            onClick={() => { vib(); calculate(); }}
            style={{
              width: '100%',
              padding: 'clamp(12px, 3vw, 15px)',
              background: '#f1c40f',
              color: '#000',
              fontSize: 'clamp(0.9rem, 3vw, 1.1rem)',
              fontWeight: 'bold',
              border: 'none',
              borderRadius: '4px',
              textTransform: 'uppercase',
              marginTop: '5px',
              marginBottom: '10px',
              cursor: 'pointer',
              touchAction: 'manipulation'
            }}
          >
            РАССЧИТАТЬ
          </button>

          <div style={{ width: '100%', height: 'clamp(200px, 40vh, 250px)', background: '#000', border: '1px solid #444', borderRadius: '4px', marginTop: '10px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '5px', left: '5px', fontSize: 'clamp(0.6rem, 2vw, 0.7rem)', color: '#555', pointerEvents: 'none', zIndex: 1 }}>СИМУЛЯЦИЯ</div>
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }}></canvas>
          </div>
        </div>
      )}

      {activeTab === 'code' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0 }}>
          <textarea
            value={gcode}
            readOnly
            style={{
              flex: 1,
              background: '#000',
              color: '#2ecc71',
              fontSize: 'clamp(12px, 3.5vw, 18px)',
              fontWeight: 'bold',
              lineHeight: '1.4',
              padding: 'clamp(8px, 2vw, 10px)',
              border: 'none',
              resize: 'none',
              whiteSpace: 'pre',
              fontFamily: "'Courier New', monospace",
              overflowWrap: 'break-word',
              wordBreak: 'break-word'
            }}
          />
          <button
            onClick={copyCode}
            style={{
              background: '#f1c40f',
              color: '#000',
              fontSize: 'clamp(0.9rem, 3vw, 1.2rem)',
              fontWeight: '900',
              padding: 'clamp(15px, 4vw, 20px)',
              border: 'none',
              textTransform: 'uppercase',
              cursor: 'pointer',
              width: '100%',
              flexShrink: 0,
              touchAction: 'manipulation'
            }}
          >
            КОПИРОВАТЬ КОД
          </button>
        </div>
      )}
    </div>
  );
};

export default G12Polyhedron;
