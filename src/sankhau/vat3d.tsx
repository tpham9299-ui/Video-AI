// VẬT 3D CHO TOÁN THỰC TẾ: khối hộp (bể nước, thùng hàng, phòng), tòa nhà, ô tô (khối CSS 3D thật, xoay theo camera),
// hình trụ, hình nón, hình cầu (vẽ 2.5D theo góc nhìn của camera), cây, thang. Kích thước ghi bằng nhãn trên cạnh.
import React from 'react';
import {FONT_DAM} from '../theme';
import {Toan} from '../Toan';
import {Goc3D} from './chieu3d';
import {easeOut, kep, neon, ngauNhien, bamChuoi} from './donghieu';
import {Vat} from './dulieu';
import {TrangThai} from './trangthai';

const TRANG = '#EAF2F4';
const NHAT = '#9FE7FF';

// góc nhìn của vật = góc mặc định (hơi chéo từ trên xuống để luôn thấy rõ khối) + góc camera của cảnh
const useGocVat = () => {
  const g = React.useContext(Goc3D);
  return {pitch: 20 + g.n * 0.65, yaw: -32 + g.r};
};

const NhanKT: React.FC<{chu: string; style?: React.CSSProperties; mau?: string}> = ({chu, style, mau = NHAT}) =>
  chu ? (
    <div style={{position: 'absolute', whiteSpace: 'nowrap', background: 'rgba(6,14,18,0.85)', border: `2px solid ${mau}88`, borderRadius: 10, padding: '1px 10px', ...style}}>
      <Toan tex={chu} size={28} color={mau} />
    </div>
  ) : null;

type Mat = {nen: string; vien?: string; con?: React.ReactNode; anMatSau?: boolean};
// Khối hộp CSS 3D: rộng w (trục x), sâu d (trục z), cao h (trục y). Mỗi mặt có thể chứa nội dung (cửa sổ, nhãn...).
export const Khoi3D: React.FC<{w: number; d: number; h: number; mat: Partial<Record<'truoc' | 'sau' | 'trai' | 'phai' | 'tren' | 'duoi', Mat>>; macDinh: Mat; dichY?: number; dichX?: number; dichZ?: number}> = ({w, d, h, mat, macDinh, dichY = 0, dichX = 0, dichZ = 0}) => {
  const mt = (k: keyof typeof mat, fw: number, fh: number, tf: string) => {
    const m = {...macDinh, ...(mat[k] || {})};
    return (
      <div key={k} style={{position: 'absolute', left: -fw / 2, top: -fh / 2, width: fw, height: fh, background: m.nen, border: m.vien ? `3px solid ${m.vien}` : undefined, boxSizing: 'border-box', transform: tf, backfaceVisibility: m.anMatSau === false ? 'visible' : 'hidden'}}>
        {m.con}
      </div>
    );
  };
  return (
    <div style={{position: 'absolute', left: 0, top: 0, transformStyle: 'preserve-3d', transform: `translate3d(${dichX}px, ${dichY}px, ${dichZ}px)`}}>
      {mt('truoc', w, h, `translateZ(${d / 2}px)`)}
      {mt('sau', w, h, `rotateY(180deg) translateZ(${d / 2}px)`)}
      {mt('phai', d, h, `rotateY(90deg) translateZ(${w / 2}px)`)}
      {mt('trai', d, h, `rotateY(-90deg) translateZ(${w / 2}px)`)}
      {mt('tren', w, d, `rotateX(90deg) translateZ(${h / 2}px)`)}
      {mt('duoi', w, d, `rotateX(-90deg) translateZ(${h / 2}px)`)}
    </div>
  );
};

// Sân khấu nhỏ cho một vật 3D: phối cảnh riêng + xoay theo góc nhìn
const PHOI_CANH = 1600;
// Chiếu một điểm (x, y, z) trong hệ tọa độ của vật (y hướng xuống, z hướng về người xem) ra tọa độ khung, đúng như CSS làm.
export const chieuVat = (x: number, y: number, z: number, pitch: number, yaw: number, rong: number, cao: number) => {
  const a = (yaw * Math.PI) / 180;
  const b = (-pitch * Math.PI) / 180;
  const x1 = x * Math.cos(a) + z * Math.sin(a);
  const z1 = -x * Math.sin(a) + z * Math.cos(a);
  const y2 = y * Math.cos(b) - z1 * Math.sin(b);
  const z2 = y * Math.sin(b) + z1 * Math.cos(b);
  const s = PHOI_CANH / (PHOI_CANH - z2);
  return {x: rong / 2 + x1 * s, y: cao / 2 + (cao * 0.05 + y2) * s, z: z2};
};
const Khung3D: React.FC<{rong: number; cao: number; children: React.ReactNode; phu?: (pitch: number, yaw: number) => React.ReactNode}> = ({rong, cao, children, phu}) => {
  const {pitch, yaw} = useGocVat();
  return (
    <div style={{position: 'relative', width: rong, height: cao, perspective: PHOI_CANH}}>
      <div style={{position: 'absolute', left: '50%', top: '55%', transformStyle: 'preserve-3d', transform: `rotateX(${-pitch}deg) rotateY(${yaw}deg)`}}>{children}</div>
      {phu ? phu(pitch, yaw) : null}
    </div>
  );
};

// Nhãn ba kích thước của khối hộp: chọn cạnh đang nhìn thấy rõ nhất (gần người xem nhất) cho mỗi chiều, đặt nhãn phẳng lệch ra ngoài khối.
const nhanKhoi = (w: number, d: number, h: number, nhan: string[], pitch: number, yaw: number, rong: number, cao: number, mo: number) => {
  const P = (x: number, y: number, z: number) => chieuVat(x, y, z, pitch, yaw, rong, cao);
  const tam = P(0, 0, 0);
  const chon = (ds: [number, number, number][]) => ds.map((q) => P(...q)).sort((m, n) => n.z - m.z)[0];
  const canh = [
    chon([[0, h / 2, d / 2], [0, h / 2, -d / 2]]), // dài (trục x), cạnh đáy
    chon([[w / 2, h / 2, 0], [-w / 2, h / 2, 0]]), // rộng (trục z), cạnh đáy
    chon([[w / 2, 0, d / 2], [-w / 2, 0, d / 2], [w / 2, 0, -d / 2], [-w / 2, 0, -d / 2]]), // cao, cạnh đứng
  ];
  // vị trí nhãn: lệch ra ngoài khối; nếu hai nhãn quá gần nhau thì đẩy nhãn sau ra xa hơn theo hướng của nó
  const vt = canh.map((c) => {
    const dx = c.x - tam.x;
    const dy = c.y - tam.y;
    const L = Math.hypot(dx, dy) || 1;
    return {x: c.x + (dx / L) * 40, y: c.y + (dy / L) * 40, ux: dx / L, uy: dy / L};
  });
  for (let lan = 0; lan < 6; lan++) {
    for (let i = 0; i < vt.length; i++) for (let j = 0; j < i; j++) {
      if (!nhan[i] || !nhan[j]) continue;
      if (Math.abs(vt[i].x - vt[j].x) < 110 && Math.abs(vt[i].y - vt[j].y) < 56) {
        vt[i].x += vt[i].ux * 40 + (vt[i].x >= vt[j].x ? 30 : -30);
        vt[i].y += vt[i].uy * 40 + (vt[i].y >= vt[j].y ? 26 : -26);
      }
    }
  }
  return canh.map((c, i) => {
    if (!nhan[i]) return null;
    return (
      <div key={i} style={{position: 'absolute', left: vt[i].x, top: vt[i].y, transform: `translate(-50%, -50%) scale(${0.6 + 0.4 * mo})`, opacity: mo, background: 'rgba(6,14,18,0.88)', border: `3px solid ${i === 2 ? '#FFD54A' : NHAT}`, borderRadius: 12, padding: '2px 12px', whiteSpace: 'nowrap', boxShadow: '0 4px 14px rgba(0,0,0,0.5)'}}>
        <Toan tex={nhan[i]} size={34} color={i === 2 ? '#FFD54A' : NHAT} />
      </div>
    );
  });
};

// kích thước thật -> px: cạnh lớn nhất = goc px, cạnh nhỏ không dưới 18% để vẫn nhìn ra khối
const quyDoi = (kt: number[], so: number, goc: number) => {
  const ds = Array.from({length: so}, (_, i) => kt[i] || kt[0] || 1);
  const max = Math.max(...ds);
  return ds.map((x) => Math.max(goc * 0.18, (x / max) * goc));
};

/* ---------------- KHỐI HỘP: bể nước / thùng / hộp, có mực nước dâng ---------------- */
// Quy tắc hình học không gian: các mặt phía trước vẽ cạnh nhìn thấy bằng NÉT LIỀN (anMatSau: true ẩn 3 mặt khuất phía sau),
// còn 3 cạnh khuất giao tại đỉnh xa nhất phía sau được vẽ bằng NÉT ĐỨT (strokeDasharray="10 8").
const canhKhuatHop = (w: number, d: number, h: number, pitch: number, yaw: number, rong: number, cao: number, mau: string, vao: number) => {
  if (vao <= 0.05) return null;
  const hh = h * vao;
  const P = (sx: number, sy: number, sz: number) => chieuVat((sx * w) / 2, (sy * hh) / 2, (sz * d) / 2, pitch, yaw, rong, cao);
  const dinh: {sx: number; sy: number; sz: number; x: number; y: number; z: number}[] = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) dinh.push({sx, sy, sz, ...P(sx, sy, sz)});
  // Đỉnh xa người xem nhất (z nhỏ nhất trong hệ tọa độ sau xoay) là đỉnh bị khuất hoàn toàn phía sau khối hộp
  const xaNhat = dinh.slice().sort((a, b) => a.z - b.z)[0];
  const lcm = [
    P(-xaNhat.sx, xaNhat.sy, xaNhat.sz),
    P(xaNhat.sx, -xaNhat.sy, xaNhat.sz),
    P(xaNhat.sx, xaNhat.sy, -xaNhat.sz),
  ];
  return (
    <svg width={rong} height={cao} style={{position: 'absolute', left: 0, top: 0, pointerEvents: 'none', overflow: 'visible'}}>
      {lcm.map((q, idx) => (
        <line key={idx} x1={xaNhat.x} y1={xaNhat.y} x2={q.x} y2={q.y} stroke={mau} strokeWidth={2.8} strokeDasharray="10 8" strokeOpacity={0.68 * vao} strokeLinecap="round" />
      ))}
    </svg>
  );
};

export const KhoiHop: React.FC<{v: Vat; st: TrangThai}> = ({v, st}) => {
  const [w, d, h] = quyDoi(v.kichThuoc.length ? v.kichThuoc : [3, 2, 1.5], 3, 330 * v.co);
  const mau = neon(v.mau, '#4FC3F7');
  const kinh = v.kieu !== 'dac'; // mặc định trong suốt (bể kính) để thấy nước bên trong
  const muc = kep(st.giaTri);
  const hn = h * muc;
  const vao = easeOut(kep((st.t - st.ta) / 0.8));
  const rong = w + d * 0.9 + 80;
  const cao = h + d * 0.6 + 120;
  // anMatSau: true để 3 mặt khuất phía sau không vẽ viền nét liền; 3 cạnh khuất phía sau được vẽ nét đứt bằng canhKhuatHop
  const mat: Mat = kinh ? {nen: `${mau}14`, vien: mau, anMatSau: true} : {nen: `${mau}cc`, vien: '#0b1418', anMatSau: true};
  return (
    <Khung3D
      rong={rong}
      cao={cao}
      phu={(pitch, yaw) => (
        <>
          {kinh ? canhKhuatHop(w, d, h, pitch, yaw, rong, cao, mau, vao) : null}
          {nhanKhoi(w, d, h, v.nhanKT, pitch, yaw, rong, cao, kep((st.t - st.ta - 0.6) / 0.4))}
        </>
      )}
    >
      <div style={{transformStyle: 'preserve-3d', transform: `scaleY(${vao})`}}>
        {hn > 1 ? (
          <Khoi3D w={w - 6} d={d - 6} h={hn} dichY={(h - hn) / 2} macDinh={{nen: 'rgba(79,195,247,0.42)', vien: 'rgba(160,230,255,0.6)', anMatSau: true}} mat={{tren: {nen: 'rgba(140,220,255,0.55)', vien: '#bff0ff', anMatSau: false}}} />
        ) : null}
        <Khoi3D w={w} d={d} h={h} macDinh={mat} mat={{}} />
      </div>
    </Khung3D>
  );
};

/* ---------------- TÒA NHÀ: khối cao có lưới cửa sổ sáng đèn ngẫu nhiên ---------------- */
export const ToaNha: React.FC<{v: Vat; st: TrangThai; frame: number}> = ({v, st, frame}) => {
  const tang = v.soTang;
  const [w, d] = quyDoi(v.kichThuoc.length ? v.kichThuoc : [1, 0.9], 2, 170 * v.co);
  const h = Math.min(560, tang * 44) * v.co;
  const mau = neon(v.mau, '#2B3A55');
  const vao = easeOut(kep((st.t - st.ta) / 0.9));
  const r = ngauNhien(bamChuoi(v.id));
  const cuaSo = (cot: number) => (
    <div style={{position: 'absolute', inset: '10px 10px 14px', display: 'grid', gridTemplateColumns: `repeat(${cot}, 1fr)`, gridTemplateRows: `repeat(${tang}, 1fr)`, gap: 7}}>
      {Array.from({length: cot * tang}, (_, i) => {
        const sang = r() > 0.42 && (Math.floor(frame / 40 + i) % 9 !== 0);
        return <div key={i} style={{background: sang ? '#FFD54A' : '#13202e', boxShadow: sang ? '0 0 8px #FFB300' : 'none', borderRadius: 2}} />;
      })}
    </div>
  );
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      <Khung3D rong={w + d + 60} cao={h + d * 0.6 + 40}>
        <div style={{transformStyle: 'preserve-3d', transform: `translateY(${(h * (1 - vao)) / 2}px) scaleY(${vao})`}}>
          <Khoi3D w={w} d={d} h={h} macDinh={{nen: `linear-gradient(180deg, ${mau}, #141c2b)`, vien: 'rgba(160,200,255,0.25)'}} mat={{
            truoc: {nen: `linear-gradient(180deg, ${mau}, #141c2b)`, con: cuaSo(3)},
            phai: {nen: `linear-gradient(180deg, #1f2a3f, #0e141f)`, con: cuaSo(2)},
            tren: {nen: '#3a4a66', vien: '#7fa3d9'},
          }} />
        </div>
      </Khung3D>
      {v.nhan ? <div style={{marginTop: 8, fontFamily: FONT_DAM, fontWeight: 800, fontSize: 28, color: '#fff', background: 'rgba(0,0,0,0.5)', borderRadius: 10, padding: '2px 12px'}}>{v.nhan}</div> : null}
    </div>
  );
};

/* ---------------- Ô TÔ: thân + cabin + bánh xe ---------------- */
export const Xe: React.FC<{v: Vat; st: TrangThai}> = ({v, st}) => {
  const mau = neon(v.mau, '#FF8A3D');
  const n = v.soLuong;
  const s = v.co;
  const vao = easeOut(kep((st.t - st.ta) / 0.6));
  const banh = (x: number) => <div style={{position: 'absolute', bottom: -18 * s, left: x, width: 46 * s, height: 46 * s, borderRadius: '50%', background: 'radial-gradient(circle, #555 0 30%, #111 32%)', border: '3px solid #222'}} />;
  return (
    <div style={{display: 'flex', gap: 30}}>
      {Array.from({length: n}, (_, k) => (
        <div key={k} style={{opacity: kep(vao * 2), transform: `translateX(${(1 - vao) * -200}px)`}}>
          <Khung3D rong={330 * s} cao={220 * s}>
            <Khoi3D w={280 * s} d={130 * s} h={60 * s} dichY={10 * s} macDinh={{nen: mau, vien: '#7a3a12'}} mat={{
              truoc: {nen: mau, con: <>{banh(30 * s)}{banh(200 * s)}</>},
              sau: {nen: mau, con: <>{banh(30 * s)}{banh(200 * s)}</>},
            }} />
            <Khoi3D w={150 * s} d={118 * s} h={52 * s} dichY={-46 * s} dichX={-10 * s} macDinh={{nen: '#1b2733', vien: mau}} mat={{tren: {nen: mau, vien: '#7a3a12'}}} />
          </Khung3D>
        </div>
      ))}
    </div>
  );
};

/* ---------------- HÌNH TRỤ / HÌNH NÓN / HÌNH CẦU (2.5D theo góc nhìn) ---------------- */
export const Tru: React.FC<{v: Vat; st: TrangThai}> = ({v, st}) => {
  const {pitch} = useGocVat();
  const non = v.loai === 'non';
  const [r, h] = quyDoi(v.kichThuoc.length ? v.kichThuoc : [1, 2], 2, 300 * v.co).map((x, i) => (i === 0 ? x / 1.6 : x));
  const ry = r * Math.sin((pitch * Math.PI) / 180);
  const mau = neon(v.mau, '#4FC3F7');
  const W = r * 2 + 220;
  const H = h + ry * 2 + 60;
  const cx = W / 2 - 40;
  const yTren = 30 + ry;
  const yDuoi = yTren + h;
  const vao = easeOut(kep((st.t - st.ta) / 0.8));
  const muc = kep(st.giaTri);
  const yNuoc = yDuoi - h * muc * vao;
  const rNuoc = non ? r * (1 - (yDuoi - yNuoc) / h) : r; // nón đỉnh trên: mặt nước nhỏ dần khi lên cao
  const ryN = rNuoc * Math.sin((pitch * Math.PI) / 180);
  return (
    <svg width={W} height={H} style={{overflow: 'visible'}}>
      <defs>
        <linearGradient id={`th${v.id}`} x1="0" x2="1">
          <stop offset="0" stopColor={mau} stopOpacity={0.35} />
          <stop offset="0.45" stopColor={mau} stopOpacity={0.12} />
          <stop offset="1" stopColor={mau} stopOpacity={0.4} />
        </linearGradient>
      </defs>
      <g opacity={kep(vao * 1.5)}>
        {/* thân */}
        {non ? (
          <path d={`M${cx - r} ${yDuoi} L${cx} ${yTren - ry} L${cx + r} ${yDuoi} A${r} ${ry} 0 0 1 ${cx - r} ${yDuoi} Z`} fill={`url(#th${v.id})`} stroke={mau} strokeWidth={4} />
        ) : (
          <path d={`M${cx - r} ${yTren} L${cx - r} ${yDuoi} A${r} ${ry} 0 0 0 ${cx + r} ${yDuoi} L${cx + r} ${yTren}`} fill={`url(#th${v.id})`} stroke={mau} strokeWidth={4} />
        )}
        {/* nửa sau đáy (nét đứt) */}
        <path d={`M${cx - r} ${yDuoi} A${r} ${ry} 0 0 1 ${cx + r} ${yDuoi}`} fill="none" stroke={mau} strokeWidth={3} strokeDasharray="10 8" opacity={0.7} />
        {/* nước */}
        {muc > 0.01 ? (
          non ? (
            <path d={`M${cx - r} ${yDuoi} L${cx - rNuoc} ${yNuoc} A${rNuoc} ${ryN} 0 0 1 ${cx + rNuoc} ${yNuoc} L${cx + r} ${yDuoi} A${r} ${ry} 0 0 1 ${cx - r} ${yDuoi} Z`} fill="rgba(79,195,247,0.45)" />
          ) : (
            <>
              <path d={`M${cx - r} ${yNuoc} L${cx - r} ${yDuoi} A${r} ${ry} 0 0 0 ${cx + r} ${yDuoi} L${cx + r} ${yNuoc} Z`} fill="rgba(79,195,247,0.42)" />
              <ellipse cx={cx} cy={yNuoc} rx={r} ry={ry} fill="rgba(140,220,255,0.6)" stroke="#bff0ff" strokeWidth={2} />
            </>
          )
        ) : null}
        {/* miệng trên */}
        {!non ? <ellipse cx={cx} cy={yTren} rx={r} ry={ry} fill={`${mau}22`} stroke={mau} strokeWidth={4} /> : null}
        {/* bán kính + chiều cao */}
        <line x1={cx} y1={non ? yDuoi : yTren} x2={cx + r} y2={non ? yDuoi : yTren} stroke={TRANG} strokeWidth={3} strokeDasharray="8 6" />
        <circle cx={cx} cy={non ? yDuoi : yTren} r={6} fill={TRANG} />
        {non ? <line x1={cx} y1={yDuoi} x2={cx} y2={yTren - ry} stroke={TRANG} strokeWidth={3} strokeDasharray="8 6" /> : null}
        <line x1={cx + r + 34} y1={non ? yTren - ry : yTren} x2={cx + r + 34} y2={yDuoi} stroke={NHAT} strokeWidth={3} />
        <path d={`M${cx + r + 24} ${non ? yTren - ry : yTren} h20 M${cx + r + 24} ${yDuoi} h20`} stroke={NHAT} strokeWidth={3} />
      </g>
      <foreignObject x={cx + r / 2 - 60} y={(non ? yDuoi : yTren) - 54} width={120} height={50}>
        <div style={{display: 'flex', justifyContent: 'center'}}>{v.nhanKT[0] ? <div style={{background: 'rgba(6,14,18,0.85)', borderRadius: 10, padding: '0 8px'}}><Toan tex={v.nhanKT[0]} size={26} color={TRANG} /></div> : null}</div>
      </foreignObject>
      <foreignObject x={cx + r + 44} y={(yTren + yDuoi) / 2 - 24} width={150} height={50}>
        {v.nhanKT[1] ? <div style={{display: 'inline-block', background: 'rgba(6,14,18,0.85)', borderRadius: 10, padding: '0 8px'}}><Toan tex={v.nhanKT[1]} size={26} color={NHAT} /></div> : <div />}
      </foreignObject>
    </svg>
  );
};

export const Cau: React.FC<{v: Vat; st: TrangThai}> = ({v, st}) => {
  const {pitch} = useGocVat();
  const r = 150 * v.co;
  const mau = neon(v.mau, '#4FC3F7');
  const vao = easeOut(kep((st.t - st.ta) / 0.7));
  const ry = r * Math.sin((pitch * Math.PI) / 180);
  return (
    <svg width={r * 2 + 40} height={r * 2 + 40} viewBox={`${-r - 20} ${-r - 20} ${r * 2 + 40} ${r * 2 + 40}`} style={{overflow: 'visible', transform: `scale(${vao})`}}>
      <defs>
        <radialGradient id={`ca${v.id}`} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.7} />
          <stop offset="35%" stopColor={mau} stopOpacity={0.55} />
          <stop offset="100%" stopColor={mau} stopOpacity={0.15} />
        </radialGradient>
      </defs>
      <circle r={r} fill={`url(#ca${v.id})`} stroke={mau} strokeWidth={4} style={{filter: `drop-shadow(0 0 14px ${mau}88)`}} />
      <path d={`M${-r} 0 A${r} ${ry} 0 0 0 ${r} 0`} fill="none" stroke={mau} strokeWidth={3} />
      <path d={`M${-r} 0 A${r} ${ry} 0 0 1 ${r} 0`} fill="none" stroke={mau} strokeWidth={2.5} strokeDasharray="9 7" opacity={0.7} />
      <line x1={0} y1={0} x2={r} y2={0} stroke={TRANG} strokeWidth={3} strokeDasharray="8 6" />
      <circle r={6} fill={TRANG} />
      {v.nhanKT[0] ? (
        <foreignObject x={r / 2 - 60} y={-56} width={120} height={50}>
          <div style={{display: 'flex', justifyContent: 'center'}}><div style={{background: 'rgba(6,14,18,0.85)', borderRadius: 10, padding: '0 8px'}}><Toan tex={v.nhanKT[0]} size={26} color={TRANG} /></div></div>
        </foreignObject>
      ) : null}
    </svg>
  );
};

/* ---------------- CÂY (billboard) ---------------- */
export const Cay: React.FC<{v: Vat; st: TrangThai; frame: number}> = ({v, st, frame}) => (
  <div style={{display: 'flex', gap: 10, alignItems: 'flex-end'}}>
    {Array.from({length: v.soLuong}, (_, k) => {
      const a = easeOut(kep((st.t - st.ta - k * 0.1) / 0.5));
      const s = v.co * (0.85 + ((k * 37) % 30) / 100);
      const lac = Math.sin(frame / 25 + k) * 2;
      return (
        <svg key={k} width={170 * s} height={240 * s} viewBox="0 0 170 240" style={{transform: `scale(${a}) rotate(${lac}deg)`, transformOrigin: '50% 100%', overflow: 'visible'}}>
          <rect x={76} y={150} width={18} height={86} rx={6} fill="#6b4a2b" />
          <circle cx={85} cy={110} r={62} fill="#1f7a4a" />
          <circle cx={55} cy={130} r={42} fill="#23935a" />
          <circle cx={118} cy={128} r={44} fill="#1c6e43" />
          <circle cx={88} cy={70} r={44} fill="#2aa866" />
          <circle cx={70} cy={60} r={14} fill="#ffffff" opacity={0.12} />
        </svg>
      );
    })}
  </div>
);

/* ---------------- THANG (dựa vào tường, góc nghiêng với mặt đất) ---------------- */
export const Thang: React.FC<{v: Vat; st: TrangThai}> = ({v, st}) => {
  const L = 460 * v.co;
  const g = (v.gocNghieng * Math.PI) / 180;
  const W = L * Math.cos(g) + 60;
  const H = L * Math.sin(g) + 60;
  const p = easeOut(kep((st.t - st.ta) / 0.8));
  const mau = neon(v.mau, '#E8C27A');
  const x0 = 30;
  const y0 = H - 30;
  const ux = Math.cos(g);
  const uy = -Math.sin(g);
  const nx = -uy * 18;
  const ny = ux * 18;
  const len = L * p;
  const bac: React.ReactNode[] = [];
  for (let s = 30; s < len - 10; s += 42) bac.push(<line key={s} x1={x0 + ux * s - nx} y1={y0 + uy * s - ny} x2={x0 + ux * s + nx} y2={y0 + uy * s + ny} stroke={mau} strokeWidth={6} strokeLinecap="round" />);
  return (
    <div style={{position: 'relative', width: W, height: H}}>
      <svg width={W} height={H} style={{overflow: 'visible'}}>
        <line x1={x0 - nx} y1={y0 - ny} x2={x0 - nx + ux * len} y2={y0 - ny + uy * len} stroke={mau} strokeWidth={9} strokeLinecap="round" style={{filter: `drop-shadow(0 0 6px ${mau}88)`}} />
        <line x1={x0 + nx} y1={y0 + ny} x2={x0 + nx + ux * len} y2={y0 + ny + uy * len} stroke={mau} strokeWidth={9} strokeLinecap="round" />
        {bac}
      </svg>
      {v.nhan ? <div style={{position: 'absolute', left: W / 2 + 20, top: H / 2 - 50, opacity: kep((p - 0.7) / 0.3)}}><NhanKT chu={v.nhan} style={{position: 'relative'}} mau="#FFD54A" /></div> : null}
    </div>
  );
};
