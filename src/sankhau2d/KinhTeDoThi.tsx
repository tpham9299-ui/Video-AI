// v96 — KINH TẾ & TỐI ƯU GIÁ (nhánh 2d_thuc_te): thanh gạt biến chạy qua lại, đại lượng phụ (giá bán, số khách) cập nhật
// sống, điểm sáng trên đồ thị lợi nhuận; pha tối ưu trượt về điểm máy đã tính. Số cụ thể chỉ ghi ở pha kết (trước đó x*).
import React from 'react';
import {CYAN as CYAN_, HO_PHACH, XAM} from '../khung4tang/mau_v981';
import {Toan} from '../Toan';
import type {KinhTeVao} from './kieu';
import {bienTheoPha, CAO_DONG_KQ, daQua, em, hamMotBien, LE, nhipNhan, soVN, thangDoThi, tho, tienDo} from './chung';
import {CHU, DongKetQua, mau, MO, NEN_THE, NhanTex, ThanhTienDo} from './GiaoDien';
import {ChuTron} from '../khung4tang/ChuTron';

// v98.1: đơn vị tiếng Việt có dấu ("nghìn đồng") để Toan tự tách thành chữ thường; bọc \text{} thì bocChuViet chẻ đôi
// lệnh -> KaTeX lỗi, hiện cụt "L_{max} = 4500\ \text{" (lỗi tồn từ v96). Đơn vị ASCII (k, ly) giữ \text{}.
const dvTex = (dv?: string) => (!dv ? '' : /^[\x00-\x7F]*$/.test(dv) ? `\\ \\text{${dv}}` : ` ${dv}`);

export const KinhTeDoThi: React.FC<{sk: KinhTeVao; t: number; W: number; H: number; mauNhan: string}> = ({sk, t, W, H, mauNhan}) => {
  const [a, b] = sk.mien;
  const trai = {x: LE.trai, y: LE.tren + 10, w: 250};
  const r = React.useMemo(() => ({x: LE.trai + 250 + 64, y: LE.tren + 46, w: W - LE.phai - (LE.trai + 250 + 64) - 14, h: H - LE.tren - LE.duoi - CAO_DONG_KQ - 110}), [W, H]);
  const f = React.useMemo(() => hamMotBien(sk.ham, sk.bien), [sk.ham, sk.bien]);
  const phu = React.useMemo(() => sk.phu.map((p) => ({...p, f: hamMotBien(p.ham, sk.bien)})), [sk.phu, sk.bien]);
  const th = React.useMemo(() => (f ? thangDoThi(f, a, b, r, [sk.y_tot]) : null), [f, a, b, r, sk.y_tot]);
  if (!f || !th) return null;
  const nh = nhipNhan(sk.nhip, sk.pha, t);
  const aT = em((t - (sk.pha[0]?.t ?? 0.3)) / 0.5);
  const dVe = daQua(sk.pha, 've', t);
  const uVe = em((dVe > -Infinity ? dVe : t - 0.8) / 1.2);
  const x = bienTheoPha(sk.pha, t, a, b, sk.x_tot);
  const y = f(x);
  const dT = daQua(sk.pha, 'toi_uu', t), dK = daQua(sk.pha, 'ket', t);
  const chot = dT > 1.1;
  const VANG = mau('vang'), CYAN = mau('cyan'), NGOC = HO_PHACH;   // v98.1: chốt tối ưu = hổ phách (2 màu nhấn)
  const nVe = Math.max(2, Math.round(th.mau.length * uVe));
  const duong = th.mau.slice(0, nVe).map(([u, v], i) => `${i ? 'L' : 'M'}${th.X(u).toFixed(1)} ${th.Y(v).toFixed(1)}`).join(' ');
  const ten = `${sk.ten_ham}(${sk.bien})`;
  const tex = dK >= 0 ? `${sk.bien} = ${soVN(sk.x_tot)} \\Rightarrow ${sk.ten_ham}_{${sk.kieu}} = ${soVN(sk.y_tot)}${dvTex(sk.don_vi)}` : '';
  const u = (x - a) / (b - a);
  // v96: từ pha chốt đỉnh (lời đọc đã nói ra nghiệm) ghi ĐÚNG số tối ưu (x = 5, 25 k, 300 ly), không còn x* / ? giữ chỗ
  const xHien = chot || dK >= 0 ? sk.x_tot : x;
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <div data-sk2d="thanh_gat" style={{position: 'absolute', left: trai.x, top: trai.y, width: trai.w, opacity: aT}}>
        <div style={{color: MO, fontWeight: 800, fontSize: 22, marginBottom: 10, whiteSpace: 'nowrap', overflow: 'hidden'}}><ChuTron s={sk.nhan_bien} co={22} mau={MO} /></div>
        <div style={{position: 'relative', height: 44}}>
          <div style={{position: 'absolute', left: 0, right: 0, top: 18, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.10)'}} />
          <div style={{position: 'absolute', left: 0, width: `${u * 100}%`, top: 18, height: 8, borderRadius: 4, background: VANG}} />
          <div style={{position: 'absolute', left: `calc(${u * 100}% - 18px)`, top: 4, width: 36, height: 36, borderRadius: 18, background: '#0E1014', border: `3px solid ${VANG}`, boxShadow: `0 0 ${10 + 8 * nh}px ${VANG}66`}} />
        </div>
        <div style={{marginTop: 8}}><Toan tex={`${sk.bien} = ${soVN(xHien, 1)}`} size={38} color={VANG} /></div>
        {phu.map((p, k) => (p.f ? (
          <div key={k} style={{marginTop: 16, padding: '10px 16px', borderRadius: 16, background: NEN_THE, border: '1px solid rgba(255,255,255,0.10)', opacity: em((uVe - 0.2 - 0.2 * k) / 0.3)}}>
            <div style={{color: MO, fontWeight: 700, fontSize: 20, whiteSpace: 'nowrap', overflow: 'hidden'}}>{p.ten}</div>
            <Toan tex={`${soVN(p.f(xHien), 1)}${dvTex(p.don_vi)}`} size={32} color={CYAN} />
          </div>
        ) : null))}
      </div>
      <svg width={W} height={H} style={{position: 'absolute', inset: 0, opacity: aT}}>
        <line x1={r.x} y1={r.y + r.h} x2={r.x + r.w} y2={r.y + r.h} stroke={CHU} strokeWidth={2} />
        <line x1={r.x} y1={r.y + r.h} x2={r.x} y2={r.y - 10} stroke={CHU} strokeWidth={2} />
        {uVe < 1 ? <path d={th.mau.slice(0, Math.max(2, Math.round(th.mau.length * em((t - 0.3) / 1.4)))).map(([u, v], i) => `${i ? 'L' : 'M'}${th.X(u).toFixed(1)} ${th.Y(v).toFixed(1)}`).join(' ')} fill="none" stroke={CYAN} strokeOpacity={0.22 + 0.1 * nh} strokeWidth={2.4} strokeDasharray="10 8" strokeDashoffset={-t * 20} />  : null}
        <path d={duong} fill="none" stroke={CYAN} strokeWidth={3.2} strokeLinecap="round" />
        {uVe >= 1 ? <>
          <line x1={th.X(x)} y1={r.y + r.h} x2={th.X(x)} y2={th.Y(y)} stroke={VANG} strokeDasharray="6 6" strokeWidth={1.6} />
          <line x1={r.x} y1={th.Y(y)} x2={th.X(x)} y2={th.Y(y)} stroke={VANG} strokeDasharray="6 6" strokeWidth={1.6} />
          {chot ? <circle cx={th.X(x)} cy={th.Y(y)} r={16 + 10 * tho(t, 1.6)} fill="none" stroke={NGOC} strokeOpacity={0.5} strokeWidth={2} /> : null}
          <circle cx={th.X(x)} cy={th.Y(y)} r={9 + 2 * nh} fill={chot ? NGOC : VANG} stroke="#0E1014" strokeWidth={2} />
        </> : null}
      </svg>
      <NhanTex x={r.x + 8} y={r.y - 26} tex={ten} mau={CYAN} co={24} neo="trai" a={aT} />
      <div style={{position: 'absolute', left: r.x, width: r.w, top: r.y + r.h + 10, textAlign: 'right', color: MO, fontWeight: 700, fontSize: 20, opacity: aT, whiteSpace: 'nowrap', overflow: 'hidden'}}>
        <ChuTron s={sk.nhan_ham || ten} co={20} mau={MO} />
      </div>
      {chot ? (
        <div data-sk2d="huy_hieu" style={{position: 'absolute', left: Math.max(r.x, Math.min(th.X(x) - 90, r.x + r.w - 180)), top: Math.max(r.y - 8, th.Y(y) - 64), width: 180, textAlign: 'center', opacity: em((dT - 1.1) / 0.4)}}>
          <span style={{padding: '6px 14px', borderRadius: 16, background: '#0E1014', border: `1.5px solid ${NGOC}`, color: NGOC, fontWeight: 900, fontSize: 22}}>
            {sk.kieu === 'max' ? '★ CỰC ĐẠI' : '★ CỰC TIỂU'}
          </span>
        </div>
      ) : null}
      <DongKetQua x={LE.trai} y={H - LE.duoi - CAO_DONG_KQ} w={W - LE.trai - LE.phai} h={CAO_DONG_KQ} tex={tex} a={em(dK / 0.4)} mau={VANG} nhan={nh * 0.6} co={38} />
      <ThanhTienDo W={W} H={H} u={tienDo(sk.pha, t)} mau={mauNhan} />
    </div>
  );
};
