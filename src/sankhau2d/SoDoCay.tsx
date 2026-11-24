// v96 — SƠ ĐỒ CÂY ĐỘNG; v98.1 — "CÂY DÒNG CHẢY" (Animated Flow Tree); v98.3 — CÂY THOÁNG, KHÔNG SÂN KHẤU TRỐNG:
//  • CÂY MỜ (ghost) hiện sẵn từ khung 0 (cả Intro + bước đọc đề): mọi nhánh + nút ở ~20 %, chấm màu bi của các hộp tầng 1
//    rõ hơn (~70 %) -> người xem thấy ngay "có mấy hộp, mỗi hộp bi gì"; tới bước nào nhánh đó mọc sáng lên đè lên bóng mờ,
//    kèm MỘT hạt sáng chạy dọc đường cong ngay khi nhánh vừa mọc xong;
//  • nhánh là đường cong chữ S (Bézier bậc 3, hình học dùng chung chung.ts -> kiểm va chạm cùng tọa độ), dày 1,8–4,2 px theo xác suất;
//  • nhãn xác suất là VIÊN MẢNH MỘT DÒNG "1/15" (phân số nằm ngang, cao 28 px ~ nửa phân số xếp tầng) đặt ở 62 % nhánh (76 % khi >= 3 nhánh anh em),
//    nền tối đặc che đoạn nét phía sau; nút co theo khe dọc khi tầng 1 có 3–4 hộp;
//  • KHÔNG còn dòng công thức dưới chân cây (thẻ kính T3 đã trình bày) -> cây cao thêm ~108 px;
//  • diễn hoạt theo pha lời đọc: tầng 1 -> tầng 2 -> (Bayes) toàn phần: nhánh ngoài mẫu số ~25 % + hạt sáng chạy; Bayes: tử số
//    hổ phách, phần còn lại mẫu số ~55 %; cây thường (lớp 11): pha `duong` tô đường thỏa, phần còn lại ~25 %.
import React from 'react';
import type {NutCay, SoDoCayVao} from './kieu';
import {boCucCay, CAO_VIEN_CAY, CO_NHAN_CAY, daQua, diemBz, em, kep, NHAN_U_CAY, nhipNhan, phangTex, tho, tienDo} from './chung';
import type {Bz} from './chung';
import {CHU, MO, ThanhTienDo} from './GiaoDien';
import {Toan} from '../Toan';
import {ChuTron} from '../khung4tang/ChuTron';
import {CYAN, HO_PHACH, XAM} from '../khung4tang/mau_v981';

const duongBz = ([p0, p1, p2, p3]: Bz) => `M${p0.x},${p0.y} C${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`;

// giá trị số của nhãn xác suất TeX ("\dfrac{3}{10}", "0,3", "1/2", "30\%") -> độ dày nét; không đọc được -> 0,5
export const soCuaTex = (tex: string): number => {
  const s = String(tex || '').replace(/\s+/g, '');
  const f = s.match(/\\[dt]?frac\{(\d+(?:[.,]\d+)?)\}\{(\d+(?:[.,]\d+)?)\}/) || s.match(/^(\d+(?:[.,]\d+)?)\/(\d+(?:[.,]\d+)?)$/);
  if (f) {
    const a = parseFloat(f[1].replace(',', '.')), b = parseFloat(f[2].replace(',', '.'));
    return b > 0 ? kep(a / b) : 0.5;
  }
  const pt = s.match(/^(\d+(?:[.,]\d+)?)\\?%$/);
  if (pt) return kep(parseFloat(pt[1].replace(',', '.')) / 100);
  const d = s.match(/^(\d+(?:[.,]\d+)?)$/);
  return d ? kep(parseFloat(d[1].replace(',', '.'))) : 0.5;
};
export const doDayNhanh = (p: number) => 1.8 + 2.4 * kep(p);

// chấm màu bi: CHỈ khi nhãn có TỪ MÀU viết đủ ("2 đỏ", "bi xanh"); chữ viết tắt ("2Đ") không suy để khỏi nhầm
const MAU_BI: [RegExp, string][] = [[/đỏ/, '#F87171'], [/xanh/, '#60A5FA'], [/vàng/, '#FBBF24'], [/trắng/, '#F1F5F9'], [/đen/, '#2B3240'], [/tím/, '#A78BFA']];
export const chamMauNut = (nhan: string, toiDa = 6): string[] => {
  const s = String(nhan || '').toLowerCase().replace(/\\text\{([^}]*)\}/g, '$1');
  const ra: string[] = [];
  for (const m of s.matchAll(/(?:(\d+)\s*)?(?:bi\s+|viên\s+|quả\s+)?(đỏ|xanh|vàng|trắng|đen|tím)/g)) {
    const mau = MAU_BI.find(([re]) => re.test(m[2]))![1];
    const n = Math.min(toiDa, Math.max(1, m[1] ? parseInt(m[1], 10) : 1));
    for (let k = 0; k < n && ra.length < toiDa; k++) ra.push(mau);
  }
  return ra;
};

// viên nhãn xác suất v98.3: MỘT dòng mảnh, phân số nằm ngang, nền tối ĐẶC (che nét nhánh), viền mảnh
const VienXacSuat: React.FC<{x: number; y: number; tex: string; mau: string; a: number; mo: number; trai?: boolean; ten?: string}> = ({x, y, tex, mau: m, a, mo, trai, ten = 'nhan_nhanh'}) => (
  <div data-sk2d={ten} style={{position: 'absolute', left: x, top: y, height: CAO_VIEN_CAY, boxSizing: 'border-box', display: 'flex', alignItems: 'center',
    transform: `translate(${trai ? '0' : '-50%'}, -50%) scale(${0.85 + 0.15 * a})`, transformOrigin: trai ? 'left center' : 'center', opacity: a,
    padding: '0 10px', borderRadius: 999, background: '#10141B', border: `1px solid ${m}${mo > 0.6 ? '66' : '2A'}`, whiteSpace: 'nowrap',
    boxShadow: '0 3px 10px rgba(0,0,0,0.45)'}}>
    <div style={{opacity: mo, lineHeight: 1}}><Toan tex={phangTex(tex)} size={CO_NHAN_CAY} color={m} /></div>
  </div>
);

const ChamBi: React.FC<{x: number; y: number; w: number; mau: string[]; o: number}> = ({x, y, w, mau, o}) => (
  <div data-kd-bo="1" style={{position: 'absolute', left: x - w / 2, width: w, top: y, display: 'flex', justifyContent: 'center', gap: 4, opacity: o}}>
    {mau.map((c, k) => <span key={k} style={{width: 9, height: 9, borderRadius: 5, background: c, boxShadow: c === '#2B3240' ? 'inset 0 0 0 1.5px rgba(230,237,245,0.55)' : 'none'}} />)}
  </div>
);

const MO_BONG = 0.2; // độ mờ cây bóng (ghost)

export const SoDoCay: React.FC<{sk: SoDoCayVao; t: number; W: number; H: number; mauNhan: string}> = ({sk, t, W, H, mauNhan}) => {
  const b = React.useMemo(() => boCucCay(sk, W, H), [sk, W, H]);
  const {caoNut, rongNut} = b;
  const nua = rongNut / 2;
  const nh = nhipNhan(sk.nhip, sk.pha, t);
  const tGoc = sk.pha.find((p) => p.ten === 'goc')?.t ?? 0.3;
  const moTang = (k: number): number => {
    const d = daQua(sk.pha, `tang_${k}`, t);
    if (d > -Infinity) return d;
    // tầng không có pha riêng: bung nối tiếp tầng trước 0,9 s (bảo đảm hook: tầng 1 bung trong 2 s đầu)
    return k === 1 ? t - tGoc - 0.5 : moTang(k - 1) - 0.9;
  };
  const coPha = (ten: string) => sk.pha.some((p) => p.ten === ten);
  const dDuong = daQua(sk.pha, 'duong', t), dTich = daQua(sk.pha, 'tich', t), dKet = daQua(sk.pha, 'ket', t);
  const bayes = !!sk.bayes && sk.nut.some((n) => n.mau);
  const dToan = bayes ? Math.max(coPha('toan_phan') ? daQua(sk.pha, 'toan_phan', t) : -Infinity, dDuong) : -Infinity;
  const dBayes = bayes ? (coPha('bayes') ? daQua(sk.pha, 'bayes', t) : dKet) : -Infinity;
  const uToan = em(dToan / 0.6), uBayes = em(dBayes / 0.6);
  const coDuong = sk.nut.some((n) => n.sang);
  const uDuong = !bayes && coDuong ? em(dDuong / 0.6) : 0;
  const doSang = (n: NutCay) => {
    if (bayes) {
      let o = 1 + ((n.mau ? 1 : 0.25) - 1) * uToan;
      o += ((n.sang ? 1 : n.mau ? 0.55 : 0.25) - o) * uBayes;
      return o;
    }
    return 1 + ((n.sang ? 1 : 0.25) - 1) * uDuong;
  };
  const hoPhach = (n: NutCay) => (n.sang ? (bayes ? uBayes : uDuong) : 0);
  const dangChay = (n: NutCay) => (bayes ? (uBayes > 0.05 ? n.sang : uToan > 0.05 && !!n.mau) : uDuong > 0.05 && n.sang);
  const vt = (id: number) => (id < 0 ? b.goc : b.viTri.get(id)!);
  const treNut = (n: NutCay) => moTang(n.tang) - (n.duong[n.duong.length - 1] || 0) * 0.12;
  const aBong = em(t / 0.35); // cây bóng hiện ngay từ khung đầu
  const nhanh = sk.canh.map((c) => {
    const n = sk.nut.find((x) => x.id === c.den)!;
    return {n, bz: b.nhanh.get(c.den)!, u: em(treNut(n) / 0.7), tXong: treNut(n) - 0.7, day: doDayNhanh(soCuaTex(n.p))};
  });
  const chamCua = (n: NutCay) => chamMauNut(n.bi || n.nhan, n.bi ? 9 : 6);
  return (
    <div style={{position: 'absolute', inset: 0}}>
      {/* nhãn tầng (mờ từ đầu, rõ khi tầng mọc) */}
      {sk.tang.map((s, k) => {
        const a = Math.max(aBong * 0.35, em(moTang(k + 1) / 0.4));
        return <div key={k} style={{position: 'absolute', left: b.xTang(k + 1), top: 18, transform: 'translateX(-50%)', opacity: a, color: MO, fontWeight: 800, fontSize: 22, whiteSpace: 'nowrap'}}><ChuTron s={s} co={22} mau={MO} /></div>;
      })}
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        {/* CÂY BÓNG: toàn bộ khung cây ~20 % ngay từ đầu -> sân khấu không bao giờ trống */}
        <g opacity={aBong * MO_BONG}>
          {nhanh.map(({bz}, k) => <path key={k} d={duongBz(bz)} fill="none" stroke={CYAN} strokeWidth={1.6} strokeLinecap="round" />)}
        </g>
        {nhanh.map(({n, bz, u, tXong, day}, k) => {
          if (u <= 0) return null;
          const o = doSang(n), hp = hoPhach(n);
          const dd = duongBz(bz);
          const chay = dangChay(n);
          const dau = u < 1 ? diemBz(bz, u) : null;
          const mauNet = o < 0.4 ? XAM : CYAN;
          // một hạt sáng chạy hết nhánh ngay sau khi nhánh mọc xong (0,9 s) — "nhánh vừa sáng lên"
          const sMoi = tXong >= 0 && tXong < 0.9 ? tXong / 0.9 : -1;
          return (
            <g key={k}>
              <path d={dd} pathLength={1} fill="none" stroke={mauNet} strokeOpacity={0.9 * o} strokeWidth={day} strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={1 - u} />
              {hp > 0 ? <path d={dd} pathLength={1} fill="none" stroke={HO_PHACH} strokeOpacity={hp} strokeWidth={Math.min(4.2, day + 0.4 * hp + (chay ? 0.3 * nh : 0))} strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={1 - u} /> : null}
              {dau ? (
                <g>
                  <circle cx={dau.x} cy={dau.y} r={9} fill={CYAN} fillOpacity={0.22} />
                  <circle cx={dau.x} cy={dau.y} r={4} fill="#F4FBFF" />
                </g>
              ) : null}
              {sMoi >= 0 && !chay ? (() => {
                const q = diemBz(bz, sMoi);
                return (
                  <g opacity={Math.sin(Math.PI * sMoi)}>
                    <circle cx={q.x} cy={q.y} r={8} fill={CYAN} fillOpacity={0.22} />
                    <circle cx={q.x} cy={q.y} r={3.6} fill="#F4FBFF" />
                  </g>
                );
              })() : null}
              {chay && u >= 1 ? [0, 0.5].map((lech) => {
                const s = (((t * 0.62 - n.tang * 0.38 + lech) % 1) + 1) % 1;
                const q = diemBz(bz, s);
                const m = hp > 0.5 ? HO_PHACH : CYAN;
                return (
                  <g key={lech} opacity={Math.sin(Math.PI * s)}>
                    <circle cx={q.x} cy={q.y} r={8} fill={m} fillOpacity={0.2} />
                    <circle cx={q.x} cy={q.y} r={3.6} fill={m} />
                  </g>
                );
              }) : null}
            </g>
          );
        })}
      </svg>
      {/* gốc: bóng mờ từ đầu, sáng khi pha goc */}
      <div style={{position: 'absolute', left: b.goc.x - 22, top: b.goc.y - 22, width: 44, height: 44, borderRadius: 22, background: '#121721', border: `2px solid ${CYAN}`,
        opacity: t >= tGoc ? 1 : aBong * 0.45, boxShadow: t >= tGoc ? `0 0 ${10 + 8 * tho(t)}px ${CYAN}40` : 'none',
        transform: `scale(${t >= tGoc ? 0.85 + 0.15 * em((t - tGoc) / 0.35) * (1 + 0.06 * tho(t)) : 0.85})`}} />
      {/* nút bóng (khung + nhãn mờ) + chấm bi tầng 1 rõ hơn */}
      {sk.nut.map((n) => {
        const v = vt(n.id);
        const a = em((treNut(n) - 0.45) / 0.35);
        if (a >= 1) return null;
        const cham = n.tang === 1 ? chamCua(n) : [];
        return (
          <React.Fragment key={`b${n.id}`}>
            <div style={{position: 'absolute', left: v.x - nua, top: v.y - caoNut / 2, width: rongNut, height: caoNut, borderRadius: caoNut / 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1.5px solid ${CYAN}`, opacity: aBong * MO_BONG * (1 - a), color: '#EAF1F8', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden'}}>
              <ChuTron s={n.nhan} co={n.nhan.length > 8 ? 17 : 21} mau="#EAF1F8" />
            </div>
            {cham.length ? <ChamBi x={v.x} y={v.y + caoNut / 2 + 5} w={rongNut + 20} mau={cham} o={aBong * 0.7 * (1 - a)} /> : null}
          </React.Fragment>
        );
      })}
      {/* nhãn xác suất trên nhánh (vẽ SAU nét -> viên nền tối che đoạn nét phía sau) */}
      {nhanh.map(({n, bz, u}, k) => {
        const a = em((u - 0.55) / 0.35);
        if (a <= 0) return null;
        const g = diemBz(bz, b.uNhan.get(n.id) ?? NHAN_U_CAY), o = doSang(n);
        return <VienXacSuat key={k} ten={`nhan_${n.id}`} x={g.x} y={g.y} tex={n.p} mau={hoPhach(n) > 0.5 ? HO_PHACH : o < 0.4 ? XAM : CYAN} a={a} mo={Math.max(0.3, o)} />;
      })}
      {/* nút kính mờ + chấm màu bi + tích cuối nhánh */}
      {sk.nut.map((n) => {
        const d = treNut(n);
        const a = em((d - 0.45) / 0.35);
        if (a <= 0) return null;
        const v = vt(n.id);
        const o = doSang(n), hp = hoPhach(n);
        const m = hp > 0.5 ? HO_PHACH : o < 0.4 ? XAM : CYAN;
        const cham = chamCua(n);
        const aTich = n.la && n.tich ? em((dTich - (n.sang ? 0 : 0.4)) / 0.4) : 0;
        const chu = '#EAF1F8';
        return (
          <React.Fragment key={n.id}>
            <div data-sk2d={`nut_${n.id}`} style={{position: 'absolute', left: v.x - nua, top: v.y - caoNut / 2, width: rongNut, height: caoNut, borderRadius: caoNut / 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: hp > 0.5 ? 'rgba(251,191,36,0.10)' : 'rgba(22,27,36,0.92)', border: `1.5px solid ${m}${o > 0.6 ? 'CC' : '55'}`, opacity: a * Math.max(0.3, o),
              transform: `scale(${0.8 + 0.2 * a + (hp > 0.5 ? 0.05 * nh : 0)})`, boxShadow: hp > 0.5 ? `0 0 ${14 + 6 * tho(t)}px ${HO_PHACH}40` : '0 6px 16px rgba(0,0,0,0.35)',
              color: hp > 0.5 ? HO_PHACH : chu, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden'}}>
              <ChuTron s={n.nhan} co={Math.round((n.nhan.length > 8 ? 19 : 24) * Math.min(1, caoNut / 48))} mau={hp > 0.5 ? HO_PHACH : chu} />
            </div>
            {cham.length ? <ChamBi x={v.x} y={v.y + caoNut / 2 + 5} w={rongNut + 20} mau={cham} o={a * Math.max(0.3, o)} /> : null}
            {aTich > 0 ? <VienXacSuat ten={`tich_${n.id}`} trai x={v.x + nua + 14} y={v.y} tex={`= ${n.tich}`} mau={hp > 0.5 ? HO_PHACH : o < 0.4 ? XAM : CHU} a={aTich} mo={Math.max(0.3, o)} /> : null}
          </React.Fragment>
        );
      })}
      <ThanhTienDo W={W} H={H} u={tienDo(sk.pha, t)} mau={mauNhan} />
    </div>
  );
};
