// v96 — LƯỚI DIỆN TÍCH BAYES (hình vuông đơn vị, lớp 12): cắt dọc theo P(A), cắt ngang theo P(B|A) và P(B|Ā) đúng tỉ lệ;
// pha giao tô sáng hai mảng thuộc B, pha kết tách mảng A∩B sang phải và dựng P(A|B) = P(A∩B) / P(B).
// Cột A quá hẹp (vd tỉ lệ mắc bệnh 1 %) được phóng lên 10 % bề rộng và gắn nhãn "phóng to" (không giả vờ đúng tỉ lệ).
import React from 'react';
import {CYAN as CYAN_, HO_PHACH, XAM} from '../khung4tang/mau_v981';
import {FONT} from '../theme';
import type {LuoiBayesVao} from './kieu';
import {boCucBayes, daQua, em, nhipNhan, noi, tho, tienDo} from './chung';
import {CHU, DongKetQua, mau, MO, NhanTex, ThanhTienDo} from './GiaoDien';
import {ChuTron} from '../khung4tang/ChuTron';
import {Toan} from '../Toan';

export const LuoiBayes: React.FC<{sk: LuoiBayesVao; t: number; W: number; H: number; mauNhan: string}> = ({sk, t, W, H, mauNhan}) => {
  const b = React.useMemo(() => boCucBayes(sk, W, H), [sk, W, H]);
  const nh = nhipNhan(sk.nhip, sk.pha, t);
  const {x, y, S, ua} = {...b.vuong, S: b.S, ua: b.ua};
  const dV = daQua(sk.pha, 'vuong', t), dD = daQua(sk.pha, 'cat_doc', t), dN = daQua(sk.pha, 'cat_ngang', t), dG = daQua(sk.pha, 'giao', t), dK = daQua(sk.pha, 'ket', t);
  const aV = em(dV / 0.6), uD = em(dD / 0.8), uN = em(dN / 0.8), aG = em(dG / 0.5), aK = em(dK / 0.7);
  const xCat = x + S * ua * uD;
  const hA = S * sk.pba * uN, hNA = S * sk.pbna * uN;
  // v98.1: 2 màu nhấn — A = cyan, Ā = xám trung tính, B / A∩B (mục tiêu) = hổ phách
  const HONG = CYAN_, CYAN = XAM, VANG = HO_PHACH;
  const mo = (laB: boolean) => (laB ? 1 : 1 - 0.65 * aG);
  const nhanA = sk.nhan_a, nhanB = sk.nhan_b;
  const congThuc = [
    {tex: `P(A) = ${sk.tex.pa}`, m: HONG, a: em((dD - 0.4) / 0.4)},
    {tex: `P(B \\mid A) = ${sk.tex.pba}`, m: VANG, a: em((dN - 0.3) / 0.4)},
    {tex: `P(B \\mid \\overline{A}) = ${sk.tex.pbna}`, m: CYAN, a: em((dN - 0.7) / 0.4)},
    {tex: `P(B) = ${sk.tex.pab} + ${sk.tex.pnab}`, m: CHU, a: em((dG - 0.4) / 0.4)},
  ];
  const tex = dK >= 0 && sk.p ? (sk.hoi === 'B' ? `P(B) = ${sk.tex.pab} + ${sk.tex.pnab} = ${sk.tex.pb}` : `P(A \\mid B) = \\dfrac{${sk.tex.pab}}{${sk.tex.pb}} \\approx ${sk.p}`) : '';
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <div data-sk2d="vuong" style={{position: 'absolute', left: x, top: y, width: S, height: S, opacity: aV, transform: `scale(${0.92 + 0.08 * aV})`, transformOrigin: 'left top'}}>
        {/* nền hai cột A | Ā */}
        <div style={{position: 'absolute', left: 0, top: 0, width: xCat - x, height: S, background: `${HONG}38`, opacity: mo(false)}} />
        <div style={{position: 'absolute', left: xCat - x, top: 0, width: S - (xCat - x), height: S, background: `${CYAN}2E`, opacity: mo(false)}} />
        {/* phần B trong từng cột (cắt ngang từ đáy lên) */}
        {uN > 0 ? <>
          <div style={{position: 'absolute', left: 0, top: S - hA, width: S * ua, height: hA, background: `${HONG}${aG > 0 ? 'EE' : '99'}`,
            opacity: aK > 0 ? 1 - 0.65 * aK : 1}} />
          <div style={{position: 'absolute', left: S * ua, top: S - hNA, width: S * (1 - ua), height: hNA, background: `${CYAN}${aG > 0 ? 'DD' : '88'}`}} />
        </> : null}
        <div style={{position: 'absolute', inset: 0, border: `2px solid ${CHU}`, borderRadius: 4}} />
        {uD > 0 ? <div style={{position: 'absolute', left: xCat - x - 1, top: 0, width: 2.5, height: S, background: CHU}} /> : null}
        {uN > 0 ? <>
          <div style={{position: 'absolute', left: 0, top: S - hA - 1, width: S * ua, height: 2.5, background: VANG}} />
          <div style={{position: 'absolute', left: S * ua, top: S - hNA - 1, width: S * (1 - ua), height: 2.5, background: VANG}} />
        </> : null}
      </div>
      {/* nhãn cột + phóng to */}
      {uD > 0.3 ? <>
        <NhanTex x={x + (S * ua) / 2} y={y - 22} tex="A" mau={HONG} co={28} a={em((dD - 0.3) / 0.3)} />
        <NhanTex x={x + S * ua + (S * (1 - ua)) / 2} y={y - 22} tex="\overline{A}" mau={CYAN} co={28} a={em((dD - 0.3) / 0.3)} />
        {b.phongTo && aK <= 0 ? <div style={{position: 'absolute', left: b.bang.x, top: y + S - 26, color: MO, fontFamily: FONT, fontWeight: 700, fontSize: 19, whiteSpace: 'nowrap'}}>cột A phóng to cho dễ nhìn ({sk.tex.pa.replace('{,}', ',')})</div> : null}
      </> : null}
      {uN > 0.4 && aK < 0.5 ? <>
        {/* v96: nhãn tách khỏi nét khung — cột A hẹp: nhãn đặt bên phải cột (trong vùng Ā, cách nét 14 px); Ā ∩ B: ngay TRÊN dải dương tính */}
        <NhanTex x={ua < 0.25 ? x + S * ua + 14 : x + (S * ua) / 2} y={y + S - Math.max(hA * 0.5, 40)} tex="A \cap B" mau={ua < 0.25 ? HONG : '#fff'} co={22} neo={ua < 0.25 ? 'trai' : 'giua'} a={em((dG + 0.2) / 0.3) || 0.001} dam={800} />
        <NhanTex x={x + S * ua + (S * (1 - ua)) / 2} y={y + S - hNA - 22} tex="\overline{A} \cap B" mau={CYAN} co={22} a={em((dG + 0.2) / 0.3) || 0.001} dam={800} />
      </> : null}
      {/* mảng A∩B tách ra ở pha kết */}
      {aK > 0 ? <div data-sk2d="tach_giao" style={{position: 'absolute', left: noi(x, b.bang.x + 8, aK), top: noi(y + S - hA, b.bang.y + b.bang.h - 70, aK), width: Math.max(26, S * ua), height: Math.max(26, Math.min(hA, 60)),
        transform: `scale(${1 + 0.05 * nh})`, background: VANG, borderRadius: 6, boxShadow: `0 0 ${18 + 10 * tho(t)}px ${VANG}88`}} /> : null}
      {aK > 0.6 ? <NhanTex x={b.bang.x + 8 + Math.max(26, S * ua) + 14} y={b.bang.y + b.bang.h - 70 + Math.max(26, Math.min(hA, 60)) / 2} tex={`A \\cap B = ${sk.tex.pab}`} mau={VANG} co={24} neo="trai" a={em((aK - 0.6) / 0.4)} /> : null}
      {/* bảng công thức bên phải */}
      <div data-sk2d="bang_cong_thuc" style={{position: 'absolute', left: b.bang.x, top: b.bang.y, width: b.bang.w, display: 'flex', flexDirection: 'column', gap: 18}}>
        <div style={{color: MO, fontWeight: 800, fontSize: 22, fontFamily: FONT, whiteSpace: 'nowrap', overflow: 'hidden'}}>
          <ChuTron s={`A: ${nhanA}`} co={22} mau={HONG} /> <span style={{margin: '0 6px'}}>·</span> <ChuTron s={`B: ${nhanB}`} co={22} mau={VANG} />
        </div>
        {congThuc.map((c, k) => (c.a > 0 ? <div key={k} style={{opacity: c.a, transform: `translateX(${(1 - c.a) * 14}px)`}}><Toan tex={c.tex} size={28} color={c.m} maxWidth={b.bang.w} can="trai" /></div> : null))}
      </div>
      <DongKetQua x={b.ketQua.x} y={b.ketQua.y} w={b.ketQua.w} h={b.ketQua.h} tex={tex} a={em(dK / 0.4)} mau={VANG} nhan={nh * 0.6} co={38} />
      <ThanhTienDo W={W} H={H} u={tienDo(sk.pha, t)} mau={mauNhan} />
    </div>
  );
};
