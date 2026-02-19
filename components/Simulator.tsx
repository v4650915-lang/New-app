import React, { useEffect, useRef, useState } from 'react';
import { IndustrialButton } from './IndustrialComponents';

interface SimulatorProps {
    onBack: () => void;
}

const Simulator: React.FC<SimulatorProps> = ({ onBack }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const editorModalRef = useRef<HTMLDivElement>(null);
    const gcode1Ref = useRef<HTMLTextAreaElement>(null);
    const gcode2Ref = useRef<HTMLTextAreaElement>(null);

    // State for UI updates that were previously direct DOM manipulations
    const [isPlaying, setIsPlaying] = useState(false);
    const [speedVal, setSpeedVal] = useState(30);
    const [zoomVal, setZoomVal] = useState(1);
    const [isOptStop, setIsOptStop] = useState(false);
    const [isSingleBlock, setIsSingleBlock] = useState(false);
    const [currentTab, setCurrentTab] = useState(1);
    const [modeChipText, setModeChipText] = useState("MEM");
    const [modeChipClass, setModeChipClass] = useState("chip chip-amber");

    // HUD State
    const [posX, setPosX] = useState("0.000");
    const [posZ, setPosZ] = useState("0.000");
    const [posF, setPosF] = useState("0.000");
    const [hudCurr, setHudCurr] = useState("");
    const [hudNext, setHudNext] = useState("");
    const [showCodeHud, setShowCodeHud] = useState(false);

    // Refs for engine variables to avoid stale closures in animation loop
    const engineRef = useRef({
        points: [] as any[],
        gcodeLines: [] as string[],
        animIdx: 0,
        animTimer: null as any,
        speedMult: 1.0,
        zoomMult: 1.0,
        baseSCL: 10,
        panOffX: 0,
        panOffY: 0,
        bounds: { xMin: 0, xMax: 50, zMin: -20, zMax: 5 },
        scl: 10,
        W: 0,
        H: 0,
        PAD: { l: 36, t: 50, r: 14, b: 108 },
        isPlaying: false
    });

    const TEMPLATES: Record<string, string> = {
        g71outer: `; G71 Черновой цикл
O0010
T0101
G97 S600 M03
G0 X65 Z3
G71 U1 R0.5
G71 P1 Q2 U1.0 W0.2 F0.25
N1 G0 X20 W0
G1 Z0 F0.15
G1 X24 Z-2
G1 Z-15
G3 X30 Z-18 R3
G1 Z-28
G1 X40 Z-33
G1 Z-45
G1 X60
N2 G1 Z-50
G0 X65 Z3
G70 P1 Q2
G0 X65 Z5
M30`
    };

    useEffect(() => {
        // Initial setup
        if (gcode1Ref.current) {
            gcode1Ref.current.value = TEMPLATES.g71outer;
        }

        // Delay to ensure DOM layout is computed for correct sizing
        const timer = setTimeout(() => {
            resizeCanvas();
            parseAndPrepare();
        }, 100);

        const handleResize = () => resizeCanvas();
        window.addEventListener('resize', handleResize);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', handleResize);
            if (engineRef.current.animTimer) clearTimeout(engineRef.current.animTimer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- Engine Logic ported ---

    const drawFrame = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { W, H, points, animIdx, bounds, scl, panOffX, panOffY, PAD } = engineRef.current;

        if (!W || !H) return;

        // Helper w2c
        const w2c = (xW: number, zW: number) => {
            const radius = xW / 2;
            const cx = PAD.l + (zW - bounds.zMin) * scl + panOffX;
            const cy = H - PAD.b - radius * scl + panOffY;
            return [cx, cy];
        };

        ctx.clearRect(0, 0, W, H);
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#0b0e12'); g.addColorStop(1, '#0e1218');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

        // Grid Z
        const step = 5;
        ctx.strokeStyle = 'rgba(42,48,60,0.6)'; ctx.lineWidth = 1;
        const zSt = Math.ceil(bounds.zMin / step) * step;
        for (let z = zSt; z <= bounds.zMax; z += step) {
            const [cx] = w2c(0, z); if (cx < 0 || cx > W) continue;
            ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();
        }
        // Spindle Axis
        const [, spindleY] = w2c(0, 0);
        ctx.strokeStyle = 'rgba(255,149,0,0.3)'; ctx.setLineDash([8, 5]);
        ctx.beginPath(); ctx.moveTo(0, spindleY); ctx.lineTo(W, spindleY); ctx.stroke();
        ctx.setLineDash([]);
        // Z=0 Line
        const [z0x] = w2c(0, 0);
        if (z0x >= 0 && z0x <= W) {
            ctx.strokeStyle = 'rgba(80,100,120,0.9)'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(z0x, 0); ctx.lineTo(z0x, H); ctx.stroke();
        }

        if (!points.length) return;
        for (let i = 1; i < points.length; i++) {
            const p1 = points[i - 1], p2 = points[i];
            const [x1, y1] = w2c(p1.x, p1.z), [x2, y2] = w2c(p2.x, p2.z);
            ctx.strokeStyle = '#555'; ctx.lineWidth = 1; ctx.globalAlpha = 0.2;
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        }
        ctx.globalAlpha = 1;

        const end = Math.min(animIdx, points.length - 1);
        for (let i = 1; i <= end; i++) {
            const p1 = points[i - 1], p2 = points[i];
            const [x1, y1] = w2c(p1.x, p1.z), [x2, y2] = w2c(p2.x, p2.z);
            let s: any = { color: '#888', w: 1 };
            switch (p2.type) {
                case 'rapid': s = { color: '#ffd60a', w: 1, dash: [4, 4] }; break;
                case 'feed': s = { color: '#ff6ac1', w: 2 }; break;
                case 'arc_cw':
                case 'arc_ccw': s = { color: '#ff2d55', w: 2.5 }; break;
                case 'g71rough': s = { color: '#ff9500', w: 1.5, dash: [3, 3] }; break;
                case 'g70feed': s = { color: '#e8b4e8', w: 2.5 }; break;
                case 'allowance': s = { color: '#00d4ff', w: 1, dash: [5, 3] }; break;
            }
            if ((p2.type === 'arc_cw' || p2.type === 'arc_ccw') && p2.lineIdx >= 0 && points[i].feed > 0) {
                s = { color: '#ff453a', w: 3 };
            }
            ctx.strokeStyle = s.color; ctx.lineWidth = s.w; ctx.setLineDash(s.dash || []);
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        }
        ctx.setLineDash([]);
        const cp = points[end];
        if (cp) {
            const [tx, ty] = w2c(cp.x, cp.z);
            ctx.beginPath(); ctx.arc(tx, ty, 4, 0, 2 * Math.PI);
            ctx.fillStyle = '#ff453a'; ctx.fill();
        }
    };

    const computeScale = () => {
        const { points, W, H, PAD, zoomMult } = engineRef.current;
        if (!points.length) {
            engineRef.current.bounds = { xMin: 0, xMax: 50, zMin: -20, zMax: 5 };
            engineRef.current.baseSCL = 10;
            engineRef.current.scl = 10;
            engineRef.current.panOffX = 0;
            engineRef.current.panOffY = 0;
            return;
        }
        let xMn = Infinity, xMx = -Infinity, zMn = Infinity, zMx = -Infinity;
        for (const p of points) {
            xMn = Math.min(xMn, p.x); xMx = Math.max(xMx, p.x);
            zMn = Math.min(zMn, p.z); zMx = Math.max(zMx, p.z);
        }
        xMn = Math.min(xMn, 0); xMx = Math.max(xMx, 4);
        zMn -= 4; zMx += 4; xMx += 4;
        const availW = W - PAD.l - PAD.r, availH = H - PAD.t - PAD.b;
        const sZ = availW / Math.max(zMx - zMn, 1);
        const sX = availH / Math.max(xMx / 2, 1);
        engineRef.current.baseSCL = Math.min(sZ, sX, 40);
        engineRef.current.scl = engineRef.current.baseSCL * zoomMult;
        engineRef.current.panOffX = 0;
        engineRef.current.panOffY = 0;
        engineRef.current.bounds = { xMin: xMn, xMax: xMx, zMin: zMn, zMax: zMx };
    };

    const resizeCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const parent = canvas.parentElement;
        if (!parent) return;

        // Use parent dimensions
        const W = parent.clientWidth;
        const H = parent.clientHeight;

        engineRef.current.W = W;
        engineRef.current.H = H;

        canvas.width = W * window.devicePixelRatio;
        canvas.height = H * window.devicePixelRatio;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';

        const ctx = canvas.getContext('2d');
        if (ctx) ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        if (engineRef.current.points.length) {
            computeScale();
            drawFrame();
        }
    };

    const parseAndPrepare = () => {
        const code = gcode1Ref.current ? gcode1Ref.current.value : "";
        engineRef.current.gcodeLines = code.split('\n');
        try {
            const res = parseGCode(code);
            engineRef.current.points = densify(res.pts, 0.4);
            engineRef.current.animIdx = 0;
            resetSim();
            computeScale();
            drawFrame();
        } catch (e) {
            console.error(e);
        }
    };

    // ... G-Code Parsing Helpers ...
    const parseGCode = (code: string) => {
        const raw = code.split('\n');
        const pts = [];
        let cx = 0, cz = 0, cG = 0, cF = 0, nMap: any = {};
        let isFirstMove = true;
        let skipToLi = -1;
        let blkCounter = 0;

        for (let i = 0; i < raw.length; i++) {
            const nM = raw[i].match(/N(\d+)/i);
            if (nM) nMap[parseInt(nM[1])] = i;
        }

        let g71UcutR: any = null;

        for (let li = 0; li < raw.length; li++) {
            if (li <= skipToLi) continue;
            let line = raw[li].replace(/;.*$/, '').replace(/\(.*?\)/g, '').trim().toUpperCase();
            if (!line) continue;
            blkCounter++;
            const gMs = [...line.matchAll(/G(\d+(?:\.\d+)?)/g)].map(m => parseFloat(m[1]));
            const mMs = [...line.matchAll(/M(\d+)/g)].map(m => parseInt(m[1]));
            const xM = line.match(/X([-\d.]+)/), zM = line.match(/Z([-\d.]+)/);
            const rM = line.match(/R([-\d.]+)/), fM = line.match(/F([-\d.]+)/);
            const pM = line.match(/P(\d+)/), qM = line.match(/Q(\d+)/);
            const uM = line.match(/U([-\d.]+)/), wM = line.match(/W([-\d.]+)/);

            let cM = mMs.length ? mMs[0] : null;
            if (fM) cF = parseFloat(fM[1]);

            const nx = xM ? parseFloat(xM[1]) : cx, nz = zM ? parseFloat(zM[1]) : cz;
            if (isFirstMove && (xM || zM)) {
                cx = nx; cz = nz;
                pts.push({ x: cx, z: cz, type: 'start', lineIdx: li, blk: blkCounter, feed: cF, mCode: cM });
                isFirstMove = false;
                continue;
            }

            if (cM !== null && !gMs.length && !xM && !zM && !isFirstMove) {
                pts.push({ x: cx, z: cz, type: 'rapid', lineIdx: li, blk: blkCounter, feed: cF, mCode: cM });
                continue;
            }

            if (gMs.includes(71) && !pM && uM) {
                g71UcutR = { uCut: Math.abs(parseFloat(uM[1])), retract: rM ? Math.abs(parseFloat(rM[1])) : 0.5 };
                continue;
            }

            if (gMs.includes(71) && pM && qM) {
                const ns = parseInt(pM[1]), nf = parseInt(qM[1]);
                const xStock = uM ? parseFloat(uM[1]) : 0;
                const zStock = wM ? parseFloat(wM[1]) : 0;
                const roughFeed = fM ? parseFloat(fM[1]) : (cF || 0.3);
                const uCut = g71UcutR ? g71UcutR.uCut : 2;
                const retract = g71UcutR ? g71UcutR.retract : 0.5;

                const profPts = extractProfile(raw, nMap, ns, nf);
                if (profPts.length >= 2) {
                    const g71pts = generateG71(cx, cz, profPts, uCut, retract, xStock, zStock, roughFeed, li, blkCounter, raw);
                    for (const p of g71pts) pts.push({ ...p, mCode: cM });
                    if (g71pts.length) {
                        cx = g71pts[g71pts.length - 1].x; cz = g71pts[g71pts.length - 1].z;
                        blkCounter = g71pts[g71pts.length - 1].blk;
                    }
                }
                g71UcutR = null;
                if (nMap[nf] !== undefined) skipToLi = nMap[nf];
                continue;
            }

            if (gMs.includes(70) && pM && qM) {
                const ns = parseInt(pM[1]), nf = parseInt(qM[1]);
                const profPts = extractProfile(raw, nMap, ns, nf);
                const startX = cx, startZ = cz;
                if (profPts.length) {
                    pts.push({ x: profPts[0].x, z: profPts[0].z, type: 'rapid', lineIdx: li, blk: ++blkCounter, feed: 0, mCode: cM });
                    for (let i = 1; i < profPts.length; i++) {
                        const pp = profPts[i];
                        const t = pp.type === 'arc_cw' || pp.type === 'arc_ccw' ? pp.type : 'g70feed';
                        pts.push({ x: pp.x, z: pp.z, type: t, lineIdx: li, blk: ++blkCounter, feed: cF, mCode: cM });
                    }
                    pts.push({ x: startX, z: startZ, type: 'rapid', lineIdx: li, blk: ++blkCounter, feed: 0, mCode: null });
                    cx = startX; cz = startZ;
                }
                continue;
            }

            const motionG = gMs.filter(g => [0, 1, 2, 3].includes(g));
            if (!motionG.length && !xM && !zM) continue;
            if (motionG.length) cG = motionG[0];
            const r = rM ? parseFloat(rM[1]) : 0;

            if (nx === cx && nz === cz) continue;

            let btype = cG === 0 ? 'rapid' : cG === 1 ? 'feed' : cG === 2 ? 'arc_cw' : 'arc_ccw';
            if (cG === 2 || cG === 3) {
                const aPts = arcPoints(cx, cz, nx, nz, r, cG);
                for (const ap of aPts) pts.push({ x: ap[0], z: ap[1], type: btype, lineIdx: li, blk: blkCounter, feed: cF, mCode: cM });
            } else {
                pts.push({ x: nx, z: nz, type: btype, lineIdx: li, blk: blkCounter, feed: cF, mCode: cM });
            }
            cx = nx; cz = nz;
        }
        return { pts };
    };

    const extractProfile = (rawLines: string[], nMap: any, ns: number, nf: number) => {
        const startLi = nMap[ns], endLi = nMap[nf];
        if (startLi === undefined || endLi === undefined) return [];
        const profPts = [];
        let pcx = 0, pcz = 0, pcG = 0;
        for (let li = startLi; li <= endLi && li < rawLines.length; li++) {
            let line = rawLines[li].replace(/;.*$/, '').replace(/\(.*?\)/g, '').trim().toUpperCase();
            if (!line) continue;
            const gMs = [...line.matchAll(/G(\d+)/g)].map(m => parseInt(m[1])).filter(g => [0, 1, 2, 3].includes(g));
            const xM = line.match(/X([-\d.]+)/), zM = line.match(/Z([-\d.]+)/), rM = line.match(/R([-\d.]+)/);
            if (!xM && !zM) continue;
            if (gMs.length) pcG = gMs[0];
            const nx = xM ? parseFloat(xM[1]) : pcx, nz = zM ? parseFloat(zM[1]) : pcz, r = rM ? parseFloat(rM[1]) : 0;
            if (profPts.length === 0) { pcx = nx; pcz = nz; profPts.push({ x: nx, z: nz, type: 'feed' }); continue; }

            if (pcG === 2 || pcG === 3) {
                const btype = pcG === 2 ? 'arc_cw' : 'arc_ccw';
                const aPts = arcPoints(pcx, pcz, nx, nz, r, pcG);
                for (const ap of aPts) profPts.push({ x: ap[0], z: ap[1], type: btype });
            } else {
                profPts.push({ x: nx, z: nz, type: pcG === 0 ? 'rapid' : 'feed' });
            }
            pcx = nx; pcz = nz;
        }
        return profPts;
    };

    const generateG71 = (startX: number, startZ: number, profPts: any[], uCut: number, retract: number, xStock: number, zStock: number, feed: number, li: number, blkStart: number, raw: string[]) => {
        const pts = [];
        if (!profPts.length) return pts;
        const profXMin = Math.min(...profPts.map(p => p.x));
        const zFace = profPts[0].z;
        const zDeep = Math.min(...profPts.map(p => p.z));
        const finishDiam = profXMin + Math.abs(xStock);
        const stockDiam = startX;
        const diamPerPass = uCut * 2;
        const nPasses = Math.max(1, Math.ceil((stockDiam - finishDiam) / diamPerPass));

        const profileStopZ = (targetX: number) => {
            const effX = targetX - Math.abs(xStock);
            let foundZ = null;
            for (let j = 0; j < profPts.length - 1; j++) {
                const p1 = profPts[j], p2 = profPts[j + 1];
                const x1 = p1.x, x2 = p2.x;
                if ((x1 - effX) * (x2 - effX) <= 0 && Math.abs(x2 - x1) > 0.001) {
                    const t = (effX - x1) / (x2 - x1);
                    foundZ = p1.z + t * (p2.z - p1.z);
                    break;
                }
            }
            if (foundZ === null) {
                if (effX <= profXMin) foundZ = zDeep;
                else foundZ = zFace;
            }
            return foundZ + Math.abs(zStock);
        };

        let blk = blkStart;
        for (let i = 1; i <= nPasses; i++) {
            blk++;
            const cutDiam = Math.max(stockDiam - i * diamPerPass, finishDiam);
            const stopZ = profileStopZ(cutDiam);
            if (stopZ >= zFace - 0.001) continue;
            pts.push({ x: stockDiam + retract * 2, z: startZ, type: 'rapid', lineIdx: li, blk, feed: 0 });
            pts.push({ x: cutDiam + retract * 2, z: startZ, type: 'rapid', lineIdx: li, blk, feed: 0 });
            pts.push({ x: cutDiam, z: startZ, type: 'rapid', lineIdx: li, blk, feed: 0 });
            pts.push({ x: cutDiam, z: stopZ, type: 'g71rough', lineIdx: li, blk, feed: feed });
            pts.push({ x: cutDiam + retract * 2, z: stopZ + retract, type: 'rapid', lineIdx: li, blk, feed: 0 });
            pts.push({ x: cutDiam + retract * 2, z: startZ, type: 'rapid', lineIdx: li, blk, feed: 0 });
        }
        blk++;
        pts.push({ x: finishDiam, z: startZ, type: 'rapid', lineIdx: li, blk, feed: 0 });
        for (const pp of profPts) {
            pts.push({ x: pp.x + Math.abs(xStock), z: pp.z + Math.abs(zStock), type: 'allowance', lineIdx: li, blk, feed: 0 });
        }
        blk++;
        pts.push({ x: stockDiam, z: startZ, type: 'rapid', lineIdx: li, blk, feed: 0 });
        return pts;
    };

    const arcPoints = (x1: number, z1: number, x2: number, z2: number, r: number, gCode: number) => {
        const rx1 = x1 / 2, rx2 = x2 / 2;
        const dx = rx2 - rx1, dz = z2 - z1;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < 0.0001 || Math.abs(r) < 0.0001 || Math.abs(r) < dist / 2 - 0.001) return [[x2, z2]];
        const mx = (rx1 + rx2) / 2, mz = (z1 + z2) / 2;
        const pLen = Math.sqrt(dz * dz + dx * dx);
        const px = -dz / pLen, pz = dx / pLen;
        const h = Math.sqrt(Math.max(0, r * r - (dist / 2) * (dist / 2)));
        const c1x = mx + px * h, c1z = mz + pz * h;
        const c2x = mx - px * h, c2z = mz - pz * h;
        const ang = (cx: number, cz: number) => {
            let da = Math.atan2(rx2 - cx, z2 - cz) - Math.atan2(rx1 - cx, z1 - cz);
            if (gCode === 2) { if (da > 0) da -= 2 * Math.PI; } else { if (da < 0) da += 2 * Math.PI; }
            return Math.abs(da);
        };
        const [ccx, ccz] = ang(c1x, c1z) <= ang(c2x, c2z) ? [c1x, c1z] : [c2x, c2z];
        const sa = Math.atan2(rx1 - ccx, z1 - ccz);
        let sw = Math.atan2(rx2 - ccx, z2 - ccz) - sa;
        if (gCode === 2) { if (sw > 0) sw -= 2 * Math.PI; } else { if (sw < 0) sw += 2 * Math.PI; }
        const N = Math.max(24, Math.ceil(Math.abs(sw) / (Math.PI / 32)));
        const res = [];
        for (let i = 1; i <= N; i++) {
            const a = sa + sw * (i / N);
            res.push([(ccx + Math.abs(r) * Math.sin(a)) * 2, ccz + Math.abs(r) * Math.cos(a)]);
        }
        return res;
    };

    const densify = (pts: any[], maxSeg: number) => {
        if (!pts.length) return pts;
        const out = [pts[0]];
        for (let i = 1; i < pts.length; i++) {
            const a = pts[i - 1], b = pts[i];
            const dx = (b.x - a.x) * 0.5, dz = b.z - a.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist > maxSeg) {
                const n = Math.ceil(dist / maxSeg);
                for (let k = 1; k <= n; k++) {
                    const t = k / n;
                    out.push({ ...b, x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
                }
            } else {
                out.push(b);
            }
        }
        return out;
    };

    const ptDist = (a: any, b: any) => {
        const dx = (a.x - b.x) * 0.5;
        const dz = a.z - b.z;
        return Math.sqrt(dx * dx + dz * dz);
    };

    const BASE_SPD = 0.4;

    const stepAnim = () => {
        if (!engineRef.current.isPlaying) return;
        const { points } = engineRef.current;

        if (engineRef.current.animIdx >= points.length - 1) {
            pauseSim();
            setModeChipText("FIN");
            updateStatus();
            return;
        }

        const distPerFrame = BASE_SPD * engineRef.current.speedMult;
        let traveled = 0;
        let shouldPause = false;
        let prevBlk = points[engineRef.current.animIdx].blk;

        while (traveled < distPerFrame && engineRef.current.animIdx < points.length - 1) {
            const from = points[engineRef.current.animIdx];
            const to = points[engineRef.current.animIdx + 1];
            const seg = ptDist(from, to);
            traveled += Math.max(seg, 0.001);
            engineRef.current.animIdx++;

            const currBlk = points[engineRef.current.animIdx].blk;
            const mCode = points[engineRef.current.animIdx].mCode;

            if (mCode === 0) { shouldPause = true; break; }
            if (mCode === 1 && isOptStop) { shouldPause = true; break; }
            if (mCode === 30) { shouldPause = true; break; }
            if (isSingleBlock && currBlk !== prevBlk) { shouldPause = true; break; }
            prevBlk = currBlk;
        }

        drawFrame();
        updateStatus();

        if (shouldPause) {
            pauseSim();
            setModeChipText(isSingleBlock ? "SBLO" : "PAUSE");
            setModeChipClass("chip chip-amber");
            return;
        }

        engineRef.current.animTimer = setTimeout(stepAnim, 16);
    };

    const runSimulation = () => {
        if (!engineRef.current.points.length) parseAndPrepare();
        if (engineRef.current.points.length < 2) return;
        if (engineRef.current.animIdx >= engineRef.current.points.length - 1) engineRef.current.animIdx = 0;

        const p = engineRef.current.points[engineRef.current.animIdx];
        if (p && (p.mCode === 0 || (p.mCode === 1 && isOptStop))) {
            engineRef.current.animIdx++;
        }

        engineRef.current.isPlaying = true;
        setIsPlaying(true);
        setModeChipText("RUN");
        setModeChipClass("chip chip-green");
        setShowCodeHud(true);
        stepAnim();
    };

    const pauseSim = () => {
        engineRef.current.isPlaying = false;
        setIsPlaying(false);
        clearTimeout(engineRef.current.animTimer);
        setModeChipText("PAUSE");
        setModeChipClass("chip chip-amber");
    };

    const resetSim = () => {
        pauseSim();
        engineRef.current.animIdx = 0;
        drawFrame();
        updateStatus();
        setModeChipText("MEM");
        setModeChipClass("chip chip-amber");
        setShowCodeHud(false);
    };

    const updateStatus = () => {
        const { points, animIdx, gcodeLines } = engineRef.current;
        const p = points[animIdx];
        if (!p) return;

        setPosX(p.x.toFixed(3));
        setPosZ(p.z.toFixed(3));
        setPosF((p.feed || 0).toFixed(3));

        if (p.lineIdx >= 0 && p.lineIdx < gcodeLines.length) {
            setHudCurr(gcodeLines[p.lineIdx].trim());
            let nextIdx = p.lineIdx + 1;
            while (nextIdx < gcodeLines.length && !gcodeLines[nextIdx].trim()) nextIdx++;
            setHudNext(nextIdx < gcodeLines.length ? gcodeLines[nextIdx].trim() : "M30");
        }
    };

    // UI Handlers (proxies to engine or state)
    const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value);
        setSpeedVal(val);
        engineRef.current.speedMult = Math.pow(5000, (val - 1) / 99) / 100;
    };

    // --- Pan / Drag Logic ---
    const dragRef = useRef({
        isDown: false,
        lastX: 0,
        lastY: 0
    });

    const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
        const cx = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const cy = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        dragRef.current.isDown = true;
        dragRef.current.lastX = cx;
        dragRef.current.lastY = cy;
    };

    const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!dragRef.current.isDown) return;
        const cx = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const cy = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        const dx = cx - dragRef.current.lastX;
        const dy = cy - dragRef.current.lastY;

        engineRef.current.panOffX += dx;
        engineRef.current.panOffY += dy;

        dragRef.current.lastX = cx;
        dragRef.current.lastY = cy;

        drawFrame();
    };

    const handlePointerUp = () => {
        dragRef.current.isDown = false;
    };

    const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setZoomVal(val);
        if (val <= 1.0) {
            engineRef.current.zoomMult = 1.0;
            engineRef.current.panOffX = 0;
            engineRef.current.panOffY = 0;
        } else {
            engineRef.current.zoomMult = val;
        }
        engineRef.current.scl = engineRef.current.baseSCL * engineRef.current.zoomMult;
        drawFrame();
    };

    const openEditor = () => {
        pauseSim();
        if (editorModalRef.current) editorModalRef.current.classList.add('open');
    };

    const closeEditor = (save: boolean) => {
        if (editorModalRef.current) editorModalRef.current.classList.remove('open');
        if (save) parseAndPrepare();
    };

    const switchTab = (num: number) => {
        setCurrentTab(num);
    };

    const loadTpl = (key: string) => {
        const ta = currentTab === 1 ? gcode1Ref.current : gcode2Ref.current;
        if (ta) ta.value = TEMPLATES[key];
    };

    return (
        <div className="w-full h-full flex flex-col relative bg-[#0e1014] text-[#dde3ef] font-mono overflow-hidden">
            <style>{`
        .viz-area { flex: 1; position: relative; background: #0e1014; width: 100%; height: 100%; }
        .hdr {
          flex-shrink: 0; background: rgba(20, 24, 31, 0.9); border-bottom: 1px solid #2a303c;
          height: 48px; display: flex; align-items: center; justify-content: space-between; padding: 0 10px;
          position: absolute; top: 0; width: 100%; z-index: 10; backdrop-filter: blur(5px);
        }
        .hdr-brand { display: flex; align-items: center; gap: 8px; }
        .hdr-logo {
          width: 26px; height: 26px; background: #ff9500; border-radius: 5px;
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 11px; color: #000;
        }
        .hdr-title { font-weight: 700; font-size: 16px; color: #dde3ef; }
        .chip {
          font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
          padding: 4px 8px; border-radius: 4px; border: 1px solid; text-transform: uppercase;
        }
        .chip-amber { background: rgba(255,149,0,0.15); color: #ff9500; border-color: rgba(255,149,0,0.3); }
        .chip-green { background: rgba(48,209,88,0.15); color: #30d158; border-color: rgba(48,209,88,0.3); }

        .hud-container {
            position: absolute; top: 56px; left: 8px; right: 8px; pointer-events: none;
            display: flex; flex-direction: column; gap: 5px; z-index: 5;
        }
        .pos-badge {
            background: rgba(14,16,20,0.85); border: 1px solid #353d4a;
            border-radius: 6px; padding: 8px 14px; font-size: 16px; 
            display: inline-block; align-self: flex-start; backdrop-filter: blur(4px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .pos-row { display: flex; gap: 12px; margin-bottom: 4px; align-items: center; }
        .pos-lbl { color: #8892a4; width: 20px; font-weight: 800; font-size: 16px; }
        .pos-val { color: #00d4ff; font-weight: 700; min-width: 80px; text-align: right; font-size: 18px; letter-spacing: 0.05em; }
        
        .code-monitor {
            background: rgba(14,16,20,0.85); border: 1px solid #353d4a; border-radius: 5px;
            padding: 4px 10px; backdrop-filter: blur(4px); display: flex; flex-direction: column; gap: 2px;
        }
        .hud-line { font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .hud-curr { color: #ff9500; font-weight: 700; border-left: 3px solid #ff9500; padding-left: 6px; }
        .hud-next { color: #4f5a6a; padding-left: 9px; font-size: 10px; }

        .floating-controls {
            position: absolute; bottom: 14px; left: 8px; right: 8px; z-index: 10;
            display: flex; flex-direction: column; gap: 5px;
        }
        .sliders-row { display: flex; gap: 5px; }
        .speed-bar {
            background: rgba(14,16,20,0.88); border: 1px solid #353d4a; border-radius: 7px;
            padding: 5px 10px; display: flex; align-items: center; gap: 8px; backdrop-filter: blur(4px); flex: 1;
        }
        .speed-lbl { color: #8892a4; font-size: 11px; font-weight: 700; white-space: nowrap; }
        input[type=range] { flex: 1; accent-color: #ff9500; height: 18px; min-width: 40px; }

        .ctrl-bar {
            display: flex; gap: 5px; background: rgba(14,16,20,0.88); border: 1px solid #353d4a;
            padding: 6px; border-radius: 7px; backdrop-filter: blur(4px);
        }
        .btn-main {
            height: 42px; border: none; border-radius: 6px;
            font-weight: 700; font-size: 13px; cursor: pointer; display: flex; flex-direction: row;
            align-items: center; justify-content: center; gap: 4px; transition: transform 0.1s;
        }
        .btn-main:active { transform: scale(0.95); }
        .btn-run { background: #30d158; color: #000; flex: 2; font-size: 14px; letter-spacing: 0.05em; box-shadow: 0 0 12px rgba(48,209,88,0.25); }
        .btn-pause { background: #ff9500; color: #000; flex: 1; }
        .btn-reset { background: #ff453a; color: #fff; width: 42px; flex-shrink: 0; }
        .btn-edit { 
            background: #0a84ff; color: #fff; border: 1px solid #0063c7; width: 56px; flex-shrink: 0; 
            box-shadow: 0 0 15px rgba(10, 132, 255, 0.4); 
            animation: pulse-blue 2s infinite;
        }
        @keyframes pulse-blue {
            0% { box-shadow: 0 0 0 0 rgba(10, 132, 255, 0.4); }
            70% { box-shadow: 0 0 0 6px rgba(10, 132, 255, 0); }
            100% { box-shadow: 0 0 0 0 rgba(10, 132, 255, 0); }
        }

        .toggle-btn {
            background: #1a1f28; color: #4f5a6a; border: 1px solid #353d4a;
            flex: 1; font-size: 11px; flex-direction: column; gap: 1px;
        }
        .toggle-btn.active { background: #00d4ff; color: #000; border-color: #00d4ff; box-shadow: 0 0 10px rgba(0,212,255,0.3); }

        .editor-overlay {
            position: absolute; inset: 0; background: #0e1014; z-index: 100;
            display: flex; flex-direction: column; transform: translateY(100%); transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .editor-overlay.open { transform: translateY(0); }
        .editor-hdr {
            height: 56px; background: #14181f; border-bottom: 1px solid #2a303c;
            display: flex; align-items: center; justify-content: space-between; padding: 0 10px;
        }
        .tabs { display: flex; gap: 4px; flex: 1; }
        .tab {
            padding: 8px 16px; font-weight: 700; font-size: 14px;
            color: #4f5a6a; background: transparent; border: none; border-bottom: 2px solid transparent; cursor: pointer;
        }
        .tab.active { color: #ff9500; border-bottom-color: #ff9500; }
        .editor-toolbar {
            height: 40px; background: #1a1f28; border-bottom: 1px solid #2a303c;
            display: flex; align-items: center; padding: 0 10px;
        }
        .tpl-btn {
            background: #212730; border: 1px solid #353d4a; color: #dde3ef;
            font-size: 12px; padding: 4px 12px; border-radius: 4px; cursor: pointer;
        }
        .editor-body { flex: 1; position: relative; display: flex; background: #000; }
        .code-ta {
            flex: 1; background: transparent; border: none; outline: none; resize: none;
            color: #56d983; font-size: 14px; line-height: 22px;
            padding: 12px; white-space: pre; overflow-y: auto; width: 100%;
        }
        .code-ta.hidden { display: none; }
      `}</style>

            {/* Header */}
            <div className="hdr">
                <div className="flex items-center gap-4">
                    {/* Back Button Integrated */}
                    <button
                        onClick={onBack}
                        className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded text-sm font-bold border border-zinc-500 flex items-center gap-1"
                    >
                        <span>←</span> назад
                    </button>
                    <div className="hdr-brand">
                        <div className="hdr-logo">FC</div>
                        <div className="hdr-title hidden sm:block">MASTER CNC PRO</div>
                    </div>
                </div>
                <div className="hdr-right">
                    <span className={modeChipClass}>{modeChipText}</span>
                </div>
            </div>

            {/* Vis Area */}
            <div className="viz-area">
                <canvas
                    ref={canvasRef}
                    id="simCanvas"
                    className="absolute inset-0 w-full h-full cursor-move"
                    onMouseDown={handlePointerDown}
                    onMouseMove={handlePointerMove}
                    onMouseUp={handlePointerUp}
                    onMouseLeave={handlePointerUp}
                    onTouchStart={handlePointerDown}
                    onTouchMove={handlePointerMove}
                    onTouchEnd={handlePointerUp}
                />

                <div className="hud-container">
                    {showCodeHud && (
                        <div className="code-monitor" id="codeHud">
                            <div className="hud-line hud-curr">{hudCurr}</div>
                            <div className="hud-line hud-next">{hudNext}</div>
                        </div>
                    )}
                    <div className="pos-badge">
                        <div className="pos-row"><span className="pos-lbl">X</span><span className="pos-val">{posX}</span></div>
                        <div className="pos-row"><span className="pos-lbl">Z</span><span className="pos-val">{posZ}</span></div>
                        <div className="pos-row"><span className="pos-lbl">F</span><span className="pos-val" style={{ color: '#ff9500' }}>{posF}</span></div>
                    </div>
                </div>

                <div className="floating-controls">
                    <div className="sliders-row">
                        <div className="speed-bar">
                            <span className="speed-lbl">SPEED</span>
                            <input type="range" min="1" max="100" value={speedVal} onInput={handleSpeedChange} />
                        </div>
                        <div className="speed-bar">
                            <span className="speed-lbl">ZOOM</span>
                            <input type="range" min="0.5" max="5" step="0.1" value={zoomVal} onInput={handleZoomChange} />
                        </div>
                    </div>
                    <div className="ctrl-bar">
                        <button className={`btn-main toggle-btn ${isOptStop ? 'active' : ''}`} onClick={() => setIsOptStop(!isOptStop)}>OPT<br />STOP</button>
                        <button className={`btn-main toggle-btn ${isSingleBlock ? 'active' : ''}`} onClick={() => setIsSingleBlock(!isSingleBlock)}>S.<br />BLOCK</button>
                        <button className="btn-main btn-pause" onClick={pauseSim}>
                            <svg width="15" height="15" viewBox="0 0 15 15" fill="currentColor">
                                <rect x="1.5" y="1.5" width="4" height="12" rx="1.2" />
                                <rect x="9.5" y="1.5" width="4" height="12" rx="1.2" />
                            </svg>
                        </button>
                        <button className="btn-main btn-run" onClick={runSimulation}>
                            <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor">
                                <polygon points="1,1 12,6.5 1,12" />
                            </svg>
                            PLAY
                        </button>
                        <button className="btn-main btn-reset" onClick={resetSim}>
                            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                                <line x1="2" y1="2" x2="13" y2="13" /><line x1="13" y1="2" x2="2" y2="13" />
                            </svg>
                        </button>
                        <button className="btn-main btn-edit" onClick={openEditor}>
                            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10.5 2l2.5 2.5-7.5 7.5H3v-2.5l7.5-7.5z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Editor Modal */}
            <div className="editor-overlay" ref={editorModalRef}>
                <div className="editor-hdr">
                    <div className="tabs">
                        <button className={`tab ${currentTab === 1 ? 'active' : ''}`} onClick={() => switchTab(1)}>ПРОГРАММА 1</button>
                        <button className={`tab ${currentTab === 2 ? 'active' : ''}`} onClick={() => switchTab(2)}>БУФЕР 2</button>
                    </div>
                    <button className="btn-main btn-run" style={{ height: '36px', padding: '0 16px', flex: '0 0 auto' }} onClick={() => closeEditor(true)}>ПРИМЕНИТЬ</button>
                </div>
                <div className="editor-toolbar">
                    <button className="tpl-btn" onClick={() => loadTpl('g71outer')}>Шаблон G71</button>
                </div>
                <div className="editor-body">
                    <textarea
                        ref={gcode1Ref}
                        className={`code-ta ${currentTab !== 1 ? 'hidden' : ''}`}
                        spellCheck={false}
                        defaultValue={TEMPLATES.g71outer}
                    />
                    <textarea
                        ref={gcode2Ref}
                        className={`code-ta ${currentTab !== 2 ? 'hidden' : ''}`}
                        spellCheck={false}
                    />
                </div>
            </div>
        </div>
    );
};

export default Simulator;
