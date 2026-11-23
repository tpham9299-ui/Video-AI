// v96 — SƠ ĐỒ CÂY ĐỘNG; v98.1 — "CÂY DÒNG CHẢY" (Animated Flow Tree):
//  • nhánh là đường cong chữ S (Bézier bậc 3), độ dày tỉ lệ nhẹ với xác suất nhánh (1,8–4,2 px, kiểu Sankey-lite);
//  • nhãn xác suất nằm trong VIÊN THUỐC nền tối đặt ĐÚNG giữa nhánh -> che trọn đoạn nét phía sau (không gạch ngang phân số);
//  • diễn hoạt theo pha lời đọc: tầng 1 mọc kèm chấm sáng chạy đầu nhánh -> tầng 2 mọc -> (cây Bayes) bước toàn phần P(D):
//    nhánh nhiễu dìm còn ~25 %, đường dẫn tới D sáng + hạt sáng chạy dọc -> bước Bayes P(H|D): CHỈ nhánh tử số sáng hổ phách,
//    nhánh còn lại của mẫu số dịu ~55 %; cây thường (lớp 11): pha `duong` tô đường thỏa, phần còn lại ~25 %.
//  • màu: cyan (nhánh / dữ kiện) + hổ phách (mục tiêu); nhãn nút nhắc màu bi (đỏ, xanh…) -> chấm màu nhỏ dưới nút.
import React from 'react';
import type {NutCay, SoDoCayVao} from './kieu';
import {boCucCay, daQua, em, kep, LE, nhipNhan, phaTai, tho, tienDo} from './chung';
import {CHU, DongKetQua, MO, ThanhTienDo} from './GiaoDien';
import {Toan} from '../Toan';
import {ChuTron} from '../khung4tang/ChuTron';
import {CYAN, HO_PHACH, XAM} from '../khung4tang/mau_v981';

type D = {x: number; y: number};
// nhánh chữ S: hai điểm điều khiển nằm ngang ở 55 % khoảng cách -> rời nút cha và vào nút con theo phương ngang
const dieuKhien = (a: D, b: D): [D, D, D, D] => {
  const dx = (b.x - a.x) * 0.55;
  return [a, {x: a.x + dx, y: a.y}, {x: b.x - dx, y: b.y}, b];
};
const diemBz = ([p0, p1, p2, p3]: [D, D, D, D], u: number): D => {
  const v = 1 - u;
  return {
    x: v * v * v * p0.x + 3 * v * v * u * p1.x + 3 * v * u * u * p2.x + u * u * u * p3.x,
    y: v * v * v * p0.y + 3 * v * v * u * p1.y + 3 * v * u * u * p2.y + u * u * u * p3.y,
  };
};
const duongBz = ([p0, p1, p2, p3]: [D, D, D, D]) => `M${p0.x},${p0.y} C${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`;

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
// phân số lồng trong tử / mẫu của phép chia Bayes -> viết ngang a/b (tránh \dfrac trong \dfrac 3 tầng)
const phang = (s?: string) => String(s || '').replace(/\\[dt]?frac\{([^{}]+)\}\{([^{}]+)\}/g, '$1/$2');
export const doDayNhanh = (p: number) => 1.8 + 2.4 * kep(p);

// chấm màu bi: CHỈ khi nhãn có TỪ MÀU viết đủ ("2 đỏ", "bi xanh"); chữ viết tắt ("2Đ") không suy để khỏi nhầm
const MAU_BI: [RegExp, string][] = [[/đỏ/, '#F87171'], [/xanh/, '#60A5FA'], [/vàng/, '#FBBF24'], [/trắng/, '#F1F5F9'], [/đen/, '#2B3240'], [/tím/, '#A78BFA']];
export const chamMauNut = (nhan: string): string[] => {
  const s = String(nhan || '').toLowerCase().replace(/\\text\{([^}]*)\}/g, '$1');
  const ra: string[] = [];
  for (const m of s.matchAll(/(?:(\d+)\s*)?(?:bi\s+|viên\s+|quả\s+)?(đỏ|xanh|vàng|trắng|đen|tím)/g)) {
    const mau = MAU_BI.find(([re]) => re.test(m[2]))![1];
    const n = Math.min(5, Math.max(1, m[1] ? parseInt(m[1], 10) : 1));
    for (let k = 0; k < n && ra.length < 6; k++) ra.push(mau);
  }
  return ra;
};

// viên nhãn xác suất: nền tối ĐẶC (che nét nhánh), viền mảnh, chữ KaTeX; chiều cao tự giãn theo phân số
const VienXacSuat: React.FC<{x: number; y: number; tex: string; mau: string; a: number; mo: number; trai?: boolean; ten?: string}> = ({x, y, tex, mau: m, a, mo, trai, ten = 'nhan_nhanh'}) => (
  <div data-sk2d={ten} style={{position: 'absolute', left: x, top: y, transform: `translate(${trai ? '0' : '-50%'}, -50%) scale(${0.85 + 0.15 * a})`, transformOrigin: trai ? 'left center' : 'center', opacity: a,
    padding: '5px 12px', borderRadius: 999, background: '#10141B', border: `1px solid ${m}${mo > 0.6 ? '66' : '2A'}`, whiteSpace: 'nowrap',
    boxShadow: '0 4px 12px rgba(0,0,0,0.45)'}}>
    <div style={{opacity: mo}}><Toan tex={tex} size={21} color={m} /></div>
  </div>
);

export const SoDoCay: React.FC<{sk: SoDoCayVao; t: number; W: number; H: number; mauNhan: string}> = ({sk, t, W, H, mauNhan}) => {
  const b = React.useMemo(() => boCucCay(sk, W, H), [sk, W, H]);
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
  // trạng thái cô lập: cây Bayes -> toàn phần (từ pha duong/toan_phan) rồi Bayes (pha bayes, thiếu thì pha ket); cây thường -> duong
  const dToan = bayes ? Math.max(coPha('toan_phan') ? daQua(sk.pha, 'toan_phan', t) : -Infinity, dDuong) : -Infinity;
  const dBayes = bayes ? (coPha('bayes') ? daQua(sk.pha, 'bayes', t) : dKet) : -Infinity;
  const uToan = em(dToan / 0.6), uBayes = em(dBayes / 0.6);
  const coDuong = sk.nut.some((n) => n.sang);
  const uDuong = !bayes && coDuong ? em(dDuong / 0.6) : 0;
  // độ sáng (0..1) và lượng hổ phách (0..1) của mỗi nhánh theo trạng thái
  const doSang = (n: NutCay) => {
    if (bayes) {
      let o = 1 + ((n.mau ? 1 : 0.25) - 1) * uToan;
      o += ((n.sang ? 1 : n.mau ? 0.55 : 0.25) - o) * uBayes;
      return o;
    }
    return 1 + ((n.sang ? 1 : 0.25) - 1) * uDuong;
  };
  const hoPhach = (n: NutCay) => (n.sang ? (bayes ? uBayes : uDuong) : 0);
  // nhánh đang "chảy" (hạt sáng chạy dọc): toàn phần -> đường mẫu số; Bayes / cây thường -> đường tử số / đường thỏa
  const dangChay = (n: NutCay) => (bayes ? (uBayes > 0.05 ? n.sang : uToan > 0.05 && !!n.mau) : uDuong > 0.05 && n.sang);
  const pn = phaTai(sk.pha, t);
  const vt = (id: number) => (id < 0 ? b.goc : b.viTri.get(id)!);
  const treNut = (n: NutCay) => moTang(n.tang) - (n.duong[n.duong.length - 1] || 0) * 0.12;
  let tex = '', aKq = 0, mauKq = CHU;
  if (bayes && dBayes >= 0 && sk.p) {
    tex = `P = \\dfrac{${phang(sk.tong)}}{${phang(sk.mau_so)}} = ${sk.p}`; aKq = em(dBayes / 0.4); mauKq = HO_PHACH;
  } else if (bayes && dToan >= 0 && sk.bt_mau) {
    tex = sk.bt_mau; aKq = em((dToan - 0.5) / 0.4); mauKq = CYAN;
  } else if (dKet >= 0 && sk.p) {
    tex = sk.mau_so ? `P = \\dfrac{${phang(sk.tong)}}{${phang(sk.mau_so)}} = ${sk.p}` : sk.bt_tong ? sk.bt_tong : `P = ${sk.p}`;
    aKq = em(dKet / 0.4); mauKq = pn.ten === 'ket' ? HO_PHACH : CHU;
  } else if (dTich >= 0 && sk.bt_tong) {
    tex = sk.bt_tong; aKq = em((dTich - 0.9) / 0.4);
  }
  const nhanh = sk.canh.map((c) => {
    const n = sk.nut.find((x) => x.id === c.den)!;
    const a = vt(c.tu), d = vt(c.den);
    const bz = dieuKhien({x: a.x + (c.tu < 0 ? 24 : 62), y: a.y}, {x: d.x - 62, y: d.y});
    return {n, bz, u: em(treNut(n) / 0.7), day: doDayNhanh(soCuaTex(n.p))};
  });
  return (
    <div style={{position: 'absolute', inset: 0}}>
      {/* nhãn tầng */}
      {sk.tang.map((s, k) => {
        const a = em(moTang(k + 1) / 0.4);
        return a > 0 ? <div key={k} style={{position: 'absolute', left: b.xTang(k + 1), top: 18, transform: 'translateX(-50%)', opacity: a, color: MO, fontWeight: 800, fontSize: 22, whiteSpace: 'nowrap'}}><ChuTron s={s} co={22} mau={MO} /></div> : null}
      )}
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        {nhanh.map(({n, bz, u, day}, k) => {
          if (u <= 0) return null;
          const o = doSang(n), hp = hoPhach(n);
          const dd = duongBz(bz);
          const chay = dangChay(n);
          const dau = u < 1 ? diemBz(bz, u) : null;
          const mauNet = o < 0.4 ? XAM : CYAN;
          return (
            <g key={k}>
              {/* pathLength = 1 -> mọc dần bằng dashoffset (tất định theo t, không trạng thái) */}
              <path d={dd} pathLength={1} fill="none" stroke={mauNet} strokeOpacity={0.9 * o} strokeWidth={day} strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={1 - u} />
              {hp > 0 ? <path d={dd} pathLength={1} fill="none" stroke={HO_PHACH} strokeOpacity={hp} strokeWidth={Math.min(4.2, day + 0.4 * hp + (chay ? 0.3 * nh : 0))} strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={1 - u} /> : null}
              {dau ? (
                <g>
                  <circle cx={dau.x} cy={dau.y} r={9} fill={CYAN} fillOpacity={0.22} />
                  <circle cx={dau.x} cy={dau.y} r={4} fill="#F4FBFF" />
                </g>
              ) : null}
              {chay && u >= 1 ? [0, 0.5].map((lech) => {
                // hạt sáng chạy dọc nhánh; lệch pha theo tầng -> dòng chảy liền từ gốc ra lá
                const s = (((t * 0.62 - n.tang * 0.38 + lech) % 1) + 1) % 1;
                const q = diemBz(bz, s);
                const m = hp > 0.5 ? HO_PHACH : CYAN;
                const mo = Math.sin(Math.PI * s);
                return (
                  <g key={lech} opacity={mo}>
                    <circle cx={q.x} cy={q.y} r={8} fill={m} fillOpacity={0.2} />
                    <circle cx={q.x} cy={q.y} r={3.6} fill={m} />
                  </g>
                );
              }) : null}
            </g>
          );
        })}
      </svg>
      {/* gốc */}
      {t >= tGoc ? <div style={{position: 'absolute', left: b.goc.x - 22, top: b.goc.y - 22, width: 44, height: 44, borderRadius: 22, background: '#121721', border: `2px solid ${CYAN}`,
        boxShadow: `0 0 ${10 + 8 * tho(t)}px ${CYAN}40`, transform: `scale(${em((t - tGoc) / 0.35) * (1 + 0.06 * tho(t))})`}} /> : null}
      {/* nhãn xác suất trên nhánh (vẽ SAU nét -> viên nền tối che đoạn nét phía sau) */}
      {nhanh.map(({n, bz, u}, k) => {
        const a = em((u - 0.55) / 0.35);
        if (a <= 0) return null;
        // 62 % về phía nút con: hai nhánh anh em đã tách xa nhau -> viên nhãn không chồng nhau, không đè nút
        const g = diemBz(bz, 0.62), o = doSang(n);
        return <VienXacSuat key={k} x={g.x} y={g.y} tex={n.p} mau={hoPhach(n) > 0.5 ? HO_PHACH : o < 0.4 ? XAM : CYAN} a={a} mo={Math.max(0.3, o)} />;
      })}
      {/* nút kính mờ + chấm màu bi + tích cuối nhánh */}
      {sk.nut.map((n) => {
        const d = treNut(n);
        const a = em((d - 0.45) / 0.35);
        if (a <= 0) return null;
        const v = vt(n.id);
        const o = doSang(n), hp = hoPhach(n);
        const m = hp > 0.5 ? HO_PHACH : o < 0.4 ? XAM : CYAN;
        const cham = chamMauNut(n.nhan);
        const aTich = n.la && n.tich ? em((dTich - (n.sang ? 0 : 0.4)) / 0.4) : 0;
        const chu = '#EAF1F8';
        return (
          <React.Fragment key={n.id}>
            <div data-sk2d={`nut_${n.id}`} style={{position: 'absolute', left: v.x - 62, top: v.y - 24, width: 124, height: 48, borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: hp > 0.5 ? 'rgba(251,191,36,0.10)' : 'rgba(22,27,36,0.92)', border: `1.5px solid ${m}${o > 0.6 ? 'CC' : '55'}`, opacity: a * Math.max(0.3, o),
              transform: `scale(${0.8 + 0.2 * a + (hp > 0.5 ? 0.05 * nh : 0)})`, boxShadow: hp > 0.5 ? `0 0 ${14 + 6 * tho(t)}px ${HO_PHACH}40` : '0 6px 16px rgba(0,0,0,0.35)',
              color: hp > 0.5 ? HO_PHACH : chu, fontWeight: 800, fontSize: 24, whiteSpace: 'nowrap', overflow: 'hidden'}}>
              <ChuTron s={n.nhan} co={n.nhan.length > 8 ? 19 : 24} mau={hp > 0.5 ? HO_PHACH : chu} />
            </div>
            {cham.length ? (
              <div data-kd-bo="1" style={{position: 'absolute', left: v.x - 62, width: 124, top: v.y + 29, display: 'flex', justifyContent: 'center', gap: 5, opacity: a * Math.max(0.3, o)}}>
                {cham.map((c, k) => <span key={k} style={{width: 10, height: 10, borderRadius: 5, background: c, boxShadow: c === '#2B3240' ? 'inset 0 0 0 1.5px rgba(230,237,245,0.55)' : 'none'}} />)}
              </div>
            ) : null}
            {aTich > 0 ? <VienXacSuat ten={`tich_${n.id}`} trai x={v.x + 76} y={v.y} tex={`= ${n.tich}`} mau={hp > 0.5 ? HO_PHACH : o < 0.4 ? XAM : CHU} a={aTich} mo={Math.max(0.3, o)} /> : null}
          </React.Fragment>
        );
      })}
      <DongKetQua x={LE.trai} y={H - 18 - 84} w={W - LE.trai - LE.phai} h={84} tex={tex} a={aKq} mau={mauKq} nhan={nh * 0.6} co={38} />
      <ThanhTienDo W={W} H={H} u={tienDo(sk.pha, t)} mau={mauNhan} />
    </div>
  );
};

