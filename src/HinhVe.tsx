import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {DuLieuHinhVe, MAU_TEN, PhanTu} from './bocuc';
import {kep01, smooth} from './manim';
import {FONT_DAM, GIAO_DIEN, MAU} from './theme';
import {Toan} from './Toan';
import {Bai3D, Xu3D, Xuc3D} from './Vat3D';

const W = 960;
const H = 640;
const px = (x: number) => (x / 100) * W;
const py = (y: number) => (y / 100) * H;
const mau = (m: string, mac: string) => MAU_TEN[m] || mac;
const CO: Record<string, number> = {nho: 30, vua: 40, lon: 56};
const CHAM: Record<number, number[][]> = {
  1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]], 6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};
const CHAT: Record<string, {k: string; c: string}> = {
  co: {k: '♥', c: MAU.vang}, ro: {k: '♦', c: MAU.vang}, chuong: {k: '♣', c: '#ffffff'}, bich: {k: '♠', c: '#ffffff'},
};
const NET = {fill: 'none', strokeLinecap: 'round' as const, pathLength: 1, strokeDasharray: 1};

// Hình vẽ tự do theo mô tả của AI, kiểu Manim: nét phẳng vẽ dần (Create), chữ nhãn phông LaTeX, nhấn mạnh màu cam vàng.
// Mỗi phần tử có "buoc" (thứ tự xuất hiện); các bước trải đều theo lời đọc.
export const HinhVe: React.FC<{du: DuLieuHinhVe; giayAm: number}> = ({du, giayAm}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const buoc = Math.min(1.1, Math.max(0.4, (giayAm * 0.7) / Math.max(1, du.soBuoc)));
  const tbd = (b: number) => 0.25 + (b - 1) * buoc;
  const prog = (b: number, dur = 0.7) => smooth(kep01((t - tbd(b)) / dur));
  const that = GIAO_DIEN.kieuHinh === 'that';

  const ve: React.ReactNode[] = [];
  const chu: React.ReactNode[] = [];

  du.phanTu.forEach((e: PhanTu, i: number) => {
    const p = prog(e.buoc);
    if (p <= 0.001) return;
    const nhap = e.nhap ? 1 + 0.05 * Math.sin(frame / 6) : 1;
    const cx = px(e.x);
    const cy = py(e.y);
    const nhan = (x: number, y: number, tx: string, size: number, rong: number, color = '#ffffff') =>
      tx ? (
        <div key={`n${i}-${x}`} style={{position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)', opacity: smooth(kep01((p - 0.5) / 0.5))}}>
          <Toan tex={tx} size={size} color={color} maxWidth={rong} />
        </div>
      ) : null;
    const goi = (n: React.ReactNode, ox = cx, oy = cy) => (
      <g key={`g${i}`} transform={`translate(${ox} ${oy}) scale(${nhap}) translate(${-ox} ${-oy})`}>{n}</g>
    );

    switch (e.kieu) {
      case 'tron': {
        const m = mau(e.mau, '#ffffff');
        const r = px(e.r);
        ve.push(goi(<circle cx={cx} cy={cy} r={r} stroke={m} strokeWidth={5} {...NET} strokeDashoffset={1 - p} style={{fill: m + '1c'}} />));
        chu.push(nhan(cx, cy, e.nhan, 38, r * 1.7, m === '#ffffff' ? '#ffffff' : m));
        break;
      }
      case 'chu_nhat': {
        const m = mau(e.mau, '#ffffff');
        const w = px(e.rong);
        const h = py(e.cao);
        ve.push(goi(<rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={10} stroke={m} strokeWidth={5} {...NET} strokeDashoffset={1 - p} style={{fill: m + '14'}} />));
        chu.push(nhan(cx, cy, e.nhan, 38, w - 20, m));
        break;
      }
      case 'chu': {
        const rong = Math.min(900, Math.max(260, W - Math.abs(cx - W / 2) * 2 - 20));
        chu.push(
          <div key={`c${i}`} style={{position: 'absolute', left: cx, top: cy, transform: `translate(-50%, -50%) scale(${nhap})`, opacity: p}}>
            <Toan tex={e.noiDung} size={CO[e.co] || 40} color={mau(e.mau, '#ffffff')} maxWidth={rong} />
          </div>
        );
        break;
      }
      case 'mui_ten':
      case 'duong': {
        const x1 = px(e.x), y1 = py(e.y), x2 = px(e.x2), y2 = py(e.y2);
        const m = mau(e.mau, e.kieu === 'mui_ten' ? MAU.vang : '#ffffff');
        const goc = Math.atan2(y2 - y1, x2 - x1);
        const dai = 26;
        ve.push(
          <g key={`g${i}`}>
            <line x1={x1} y1={y1} x2={x1 + (x2 - x1) * p} y2={y1 + (y2 - y1) * p} stroke={m} strokeWidth={6} strokeLinecap="round" strokeDasharray={e.netDut ? '14 12' : undefined} />
            {e.kieu === 'mui_ten' && p > 0.9 ? (
              <polygon points={`${x2},${y2} ${x2 - dai * Math.cos(goc - 0.42)},${y2 - dai * Math.sin(goc - 0.42)} ${x2 - dai * Math.cos(goc + 0.42)},${y2 - dai * Math.sin(goc + 0.42)}`} fill={m} />
            ) : null}
          </g>
        );
        chu.push(nhan((x1 + x2) / 2, (y1 + y2) / 2 - 30, e.nhan, 34, 240, m));
        break;
      }
      case 'bi': {
        const m = mau(e.mau, MAU.hong);
        ve.push(goi(<circle cx={cx} cy={cy} r={36 * p} fill={m} stroke="#ffffff" strokeWidth={3} />));
        chu.push(nhan(cx, cy + 66, e.nhan, 30, 120));
        break;
      }
      case 'xuc_xac': {
        if (that) {
          const q = Math.min(1, (t - tbd(e.buoc)) / 1.0);
          chu.push(<div key={`v${i}`} style={{position: 'absolute', left: cx - 75, top: cy - 75}}><Xuc3D L={150} mat={e.mat} q={q} /></div>);
        } else {
          const L = 140;
          ve.push(
            goi(
              <>
                <rect x={cx - L / 2} y={cy - L / 2} width={L} height={L} rx={22} stroke="#ffffff" strokeWidth={6} {...NET} strokeDashoffset={1 - p} style={{fill: 'rgba(255,255,255,0.05)'}} />
                {(CHAM[e.mat] || []).map((c, k) => (
                  <circle key={k} cx={cx - L / 3 + (c[1] * L) / 3} cy={cy - L / 3 + (c[0] * L) / 3} r={11 * smooth(kep01((p - 0.6) / 0.4))} fill={MAU.vang} />
                ))}
              </>
            )
          );
        }
        chu.push(nhan(cx, cy + 70 + 36, e.nhan, 30, 180));
        break;
      }
      case 'the_bai': {
        if (that) {
          const q = Math.min(1, (t - tbd(e.buoc)) / 0.9);
          chu.push(<div key={`v${i}`} style={{position: 'absolute', left: cx - 60, top: cy - 85}}><Bai3D W={120} giaTri={e.giaTri} chat={e.chat} q={q} /></div>);
        } else {
          const w = 112, h = 158;
          const ch = CHAT[e.chat] || CHAT.co;
          ve.push(
            goi(
              <>
                <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={12} stroke="#ffffff" strokeWidth={5} {...NET} strokeDashoffset={1 - p} style={{fill: 'rgba(255,255,255,0.05)'}} />
                <g opacity={smooth(kep01((p - 0.6) / 0.4))}>
                  <text x={cx - w / 2 + 14} y={cy - h / 2 + 40} fontFamily={FONT_DAM} fontStyle="italic" fontSize={38} fill={ch.c}>{e.giaTri}</text>
                  <text x={cx} y={cy + 26} textAnchor="middle" fontFamily={FONT_DAM} fontSize={74} fill={ch.c}>{ch.k}</text>
                </g>
              </>
            )
          );
        }
        break;
      }
      case 'dong_xu': {
        if (that) {
          const q = Math.min(1, (t - tbd(e.buoc)) / 1.1);
          chu.push(<div key={`v${i}`} style={{position: 'absolute', left: cx - 62, top: cy - 62}}><Xu3D R={62} mat={e.giaTri === 'N' ? 'N' : 'S'} q={q} /></div>);
        } else {
          ve.push(
            goi(
              <>
                <circle cx={cx} cy={cy} r={58} stroke={MAU.vang} strokeWidth={6} {...NET} strokeDashoffset={1 - p} style={{fill: 'rgba(245,166,35,0.1)'}} />
                <text x={cx} y={cy + 20} textAnchor="middle" fontFamily={FONT_DAM} fontStyle="italic" fontSize={58} fill={MAU.vang} opacity={smooth(kep01((p - 0.6) / 0.4))}>{e.giaTri}</text>
              </>
            )
          );
        }
        break;
      }
      case 'bieu_tuong': {
        const co = e.co === 'nho' ? 56 : e.co === 'lon' ? 120 : 84;
        chu.push(<div key={`b${i}`} style={{position: 'absolute', left: cx, top: cy, fontSize: co, lineHeight: 1, transform: `translate(-50%, -50%) scale(${(0.6 + 0.4 * p) * nhap})`, opacity: p}}>{e.emoji}</div>);
        chu.push(nhan(cx, cy + co / 2 + 26, e.nhan, 30, 200));
        break;
      }
      case 'luoi': {
        const w = px(e.rong), h = py(e.cao);
        const ow = w / e.cot, oh = h / e.hang;
        const m = mau(e.mau, MAU.vang);
        const o: React.ReactNode[] = [];
        for (let r = 1; r <= e.hang; r++) {
          for (let c = 1; c <= e.cot; c++) {
            if (e.to.some((q) => q[0] === r && q[1] === c)) o.push(<rect key={`f${r}-${c}`} x={cx + (c - 1) * ow} y={cy + (r - 1) * oh} width={ow} height={oh} fill={m} opacity={0.5 * smooth(kep01((p - 0.5) / 0.5))} />);
          }
        }
        for (let r = 0; r <= e.hang; r++) o.push(<line key={`h${r}`} x1={cx} y1={cy + r * oh} x2={cx + w * p} y2={cy + r * oh} stroke="#ffffff" strokeWidth={3} strokeLinecap="round" />);
        for (let c = 0; c <= e.cot; c++) o.push(<line key={`v${c}`} x1={cx + c * ow} y1={cy} x2={cx + c * ow} y2={cy + h * p} stroke="#ffffff" strokeWidth={3} strokeLinecap="round" />);
        ve.push(<g key={`g${i}`}>{o}</g>);
        break;
      }
      case 'truc_so': {
        const x1 = cx, x2 = cx + px(e.rong);
        const vi = (v: number) => x1 + ((v - e.tu) / Math.max(1e-9, e.den - e.tu)) * (x2 - x1);
        const soVach = Math.min(10, Math.max(1, Math.round(e.den - e.tu)));
        const dau = x1 + (x2 - x1) * p;
        ve.push(
          <g key={`g${i}`}>
            <line x1={x1} y1={cy} x2={dau} y2={cy} stroke="#ffffff" strokeWidth={5} strokeLinecap="round" />
            {p > 0.95 ? <polygon points={`${x2 + 22},${cy} ${x2 + 2},${cy - 11} ${x2 + 2},${cy + 11}`} fill="#ffffff" /> : null}
            {Array.from({length: soVach + 1}, (_, k) => {
              const v = e.tu + (k * (e.den - e.tu)) / soVach;
              return vi(v) <= dau ? <line key={k} x1={vi(v)} y1={cy - 11} x2={vi(v)} y2={cy + 11} stroke="#ffffff" strokeWidth={3} /> : null;
            })}
            {e.diem.map((d, k) => <circle key={`d${k}`} cx={vi(d.v)} cy={cy} r={12 * smooth(kep01((p - 0.7) / 0.3))} fill={mau(d.mau, MAU.vang)} />)}
          </g>
        );
        e.diem.forEach((d, k) => chu.push(nhan(vi(d.v), cy - 40, d.nhan || String(d.v), 36, 130, mau(d.mau, MAU.vang))));
        chu.push(nhan(x1, cy + 38, String(e.tu), 30, 90, MAU.mo));
        chu.push(nhan(x2, cy + 38, String(e.den), 30, 90, MAU.mo));
        break;
      }
    }
  });

  return (
    <div style={{position: 'relative', width: W, height: H}}>
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>{ve}</svg>
      {chu}
    </div>
  );
};
