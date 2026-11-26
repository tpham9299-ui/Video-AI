// v93 — TẦNG 2 CHẾ ĐỘ ĐỐI CHIẾU "HÌNH ĐỘNG ↔ ĐỒ THỊ NGƯỠNG" (bài tối ưu): 2 cột ngang trong đúng vùng T2.
//   Trái: hình 2D đổi kích thước theo biến (tấm bìa cắt góc | mặt cắt trụ | tam giác lực | thanh đo).
//   Phải: đồ thị hàm số + điểm sáng chạy theo biến; ngưỡng vi phạm -> đỏ "⚠ VƯỢT NGƯỠNG", đạt / tại tối ưu -> xanh "✓ ĐẠT CHUẨN".
// Chống lộ đáp án: khi điểm đã dừng ở tối ưu mà chưa tới cảnh đáp án (hienSo = false) chỉ ghi ký hiệu x*, V_max, không ghi số.
// v95: điểm sáng chỉ CHỐT đúng lúc giọng đọc giải ra nghiệm (t_giai) và khi đó ghi số thật lên 2 trục; badge ★ CỰC ĐẠI khi
// không có ngưỡng; ✕ VƯỢT NGƯỠNG thay ⚠.
// Không dùng filter blur: phát sáng = vòng tròn đồng tâm mờ dần.
import React from 'react';
import {FONT, SO_DEU} from '../theme';
import {Toan} from '../Toan';
import {emRa, kep01} from '../3d-vector/toan3d';
import {chuHuyHieu, DoiChieu, nhipTheoLoi, soViet} from './doi_chieu';

const CHU = '#E6EDF5';
const MO = 'rgba(230,237,245,0.42)';
const VANG = '#FACC15';
const CYAN = '#38BDF8';
const HONG = '#FB7185';
const DAT = '#2EE6A8';
const VUOT = '#FF4D5E';

type TrangThai = {mau: string; chu: string; dat: boolean | null};

export function trangThaiDoiChieu(d: DoiChieu, x: number, pha: string): TrangThai {
  const y = d.f(x);
  const gan = Math.abs(x - d.xTot) <= 0.015 * (d.b - d.a);
  // v95: ✓/✕ chỉ khi có ngưỡng thật; bài cực trị thuần -> ★ CỰC ĐẠI / ★ CỰC TIỂU khi điểm sáng đã chốt
  const h = chuHuyHieu(d, y, pha, gan);
  if (h.loai === 'dat') return {mau: DAT, chu: h.chu, dat: true};
  if (h.loai === 'vuot') return {mau: VUOT, chu: h.chu, dat: false};
  if (h.loai === 'cuc') return {mau: DAT, chu: h.chu, dat: true};
  return {mau: VANG, chu: h.chu, dat: null};
}

const Nhan: React.FC<{x: number; y: number; tex: string; mau: string; co?: number; neo?: 'giua' | 'trai' | 'phai'}> = ({x, y, tex, mau, co = 28, neo = 'giua'}) => (
  <div style={{position: 'absolute', left: x, top: y, transform: `translate(${neo === 'giua' ? '-50%' : neo === 'phai' ? '-100%' : '0'}, -50%)`, textShadow: '0 0 6px #0E1014, 0 0 3px #0E1014', whiteSpace: 'nowrap'}}>
    <Toan tex={tex} size={co} color={mau} />
  </div>
);

/* ---------------- cột trái: hình động ---------------- */
function HinhTrai({d, x, W, H, mau}: {d: DoiChieu; x: number; W: number; H: number; mau: string}) {
  const cx = W / 2;
  const b = d.bien;
  if (d.hinh === 'tam_bia') {
    const A = d.ts.a, B = d.ts.b;
    const S = Math.min((W - 120) / A, (H * 0.58) / B);
    const w = A * S, h = B * S, X = x * S;
    const x0 = cx - w / 2, y0 = 40;
    const goc = [[x0, y0], [x0 + w - X, y0], [x0, y0 + h - X], [x0 + w - X, y0 + h - X]];
    // v95: hộp gập vẽ đúng phép chiếu xiên Cavalier (cùng tỉ lệ kk cho dài / cao, sâu kk·0,5 theo 45°) -> không bẹp
    const kk = 0.62;
    const day = Math.max(0, A - 2 * x) * S * kk, sau = Math.max(0, B - 2 * x) * S * kk * 0.5, cao = X * kk;
    const dx = sau * 0.71, dy = -sau * 0.71;
    const bx = cx - (day + dx) / 2, by = y0 + h + 96 + cao - dy;
    return (
      <>
        <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
          <rect x={x0} y={y0} width={w} height={h} fill={`${CYAN}14`} stroke={CYAN} strokeWidth={2} />
          <rect x={x0 + X} y={y0 + X} width={Math.max(0, w - 2 * X)} height={Math.max(0, h - 2 * X)} fill="none" stroke={CYAN} strokeOpacity={0.6} strokeDasharray="8 7" strokeWidth={1.4} />
          {goc.map(([gx, gy], i) => (
            <rect key={i} x={gx} y={gy} width={X} height={X} fill={`${HONG}55`} stroke={HONG} strokeWidth={2} />
          ))}
          {/* hộp sau khi gập */}
          <g stroke={mau} strokeWidth={2} fill="none" strokeLinejoin="round">
            <path d={`M${bx},${by} h${day} l${dx},${dy} h${-day} z`} fill={`${mau}1F`} />
            <path d={`M${bx},${by} v${-cao} M${bx + day},${by} v${-cao} M${bx + day + dx},${by + dy} v${-cao}`} />
            <path d={`M${bx},${by - cao} h${day} l${dx},${dy} h${-day} z`} strokeOpacity={0.55} strokeDasharray="6 5" />
            <path d={`M${bx + dx},${by + dy} v${-cao}`} strokeOpacity={0.35} strokeDasharray="5 5" />
          </g>
        </svg>
        {/* v95: nhãn x đặt NGOÀI mép trái góc cắt (không đè nét đứt của đáy hộp) */}
        <Nhan x={x0 - 12} y={y0 + X / 2} tex={b} mau={HONG} co={26} neo="phai" />
        <Nhan x={cx} y={y0 + h + 22} tex={soViet(A).replace(/,/g, '{,}')} mau={MO} co={24} />
        <Nhan x={bx + day + dx + 14} y={by + dy - cao / 2} tex={b} mau={mau} co={24} neo="trai" />
      </>
    );
  }
  if (d.hinh === 'mat_cat_tru') {
    const r = Math.max(1e-6, x), hh = d.ts.V / (Math.PI * r * r);
    // vừa khung cho r từ 0,6·r* tới b (r nhỏ hơn: thân trụ cao bị chặn ở H - 150)
    const r6 = Math.max(d.a, 0.6 * d.xTot);
    const S = Math.min((W - 140) / (2 * d.b), (H - 150) / (d.ts.V / (Math.PI * r6 * r6)));
    const w = 2 * r * S, h = Math.min(H - 150, hh * S);
    const x0 = cx - w / 2, y0 = (H - h) / 2;
    const e = Math.min(26, w * 0.18);
    return (
      <>
        <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
          <rect x={x0} y={y0} width={w} height={h} fill={`${CYAN}14`} stroke={CYAN} strokeWidth={2} />
          <ellipse cx={cx} cy={y0} rx={w / 2} ry={e} fill={`${CYAN}22`} stroke={CYAN} strokeWidth={2} />
          <ellipse cx={cx} cy={y0 + h} rx={w / 2} ry={e} fill="none" stroke={CYAN} strokeWidth={2} strokeDasharray="7 6" strokeOpacity={0.7} />
          <line x1={cx} y1={y0} x2={cx} y2={y0 + h} stroke={MO} strokeDasharray="5 6" />
          <line x1={cx} y1={y0 + h} x2={cx + w / 2} y2={y0 + h} stroke={mau} strokeWidth={3} />
          <line x1={x0 - 22} y1={y0} x2={x0 - 22} y2={y0 + h} stroke={HONG} strokeWidth={2.5} />
        </svg>
        <Nhan x={cx + w / 4} y={y0 + h + 30} tex={b} mau={mau} co={26} />
        <Nhan x={x0 - 34} y={y0 + h / 2} tex="h" mau={HONG} co={26} neo="phai" />
      </>
    );
  }
  if (d.hinh === 'tam_giac_luc') {
    // góc biến thiên tại đỉnh treo: cạnh đứng cố định, cạnh xiên quay theo góc
    const g = (Math.max(0, Math.min(88, x)) * Math.PI) / 180;
    const L = Math.min(H - 150, W * 0.9);
    const ox = cx - Math.min(L * 0.45, (W - 100) / 2) * 0.2, oy = 60;
    const day = Math.min(W - 80, L * Math.tan(g));
    const px = ox + day, py = oy + L;
    return (
      <>
        <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
          <line x1={ox} y1={oy} x2={ox} y2={py} stroke={CYAN} strokeWidth={2} strokeDasharray="8 7" />
          <line x1={ox} y1={oy} x2={px} y2={py} stroke={mau} strokeWidth={3.2} strokeLinecap="round" />
          <line x1={ox} y1={py} x2={px} y2={py} stroke={HONG} strokeWidth={2.4} />
          <path d={`M${ox},${oy + 60} A60,60 0 0,0 ${ox + 60 * Math.sin(g)},${oy + 60 * Math.cos(g)}`} fill="none" stroke={VANG} strokeWidth={2} />
          <circle cx={ox} cy={oy} r={7} fill={VANG} />
        </svg>
        <Nhan x={ox + 26} y={oy + 96} tex={b} mau={VANG} co={26} neo="trai" />
      </>
    );
  }
  // thanh đo chung: chiều cao thanh = giá trị hàm hiện tại
  const y = d.f(x);
  const u = kep01((y - d.yMin) / (d.yMax - d.yMin));
  const hT = H - 150, top = 50 + hT * (1 - u);
  return (
    <>
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        <rect x={cx - 60} y={50} width={120} height={hT} rx={14} fill="rgba(230,237,245,0.04)" stroke="rgba(230,237,245,0.14)" />
        <rect x={cx - 60} y={top} width={120} height={50 + hT - top} rx={14} fill={`${mau}40`} stroke={mau} strokeWidth={2} />
      </svg>
      <Nhan x={cx} y={H - 70} tex={`${d.tenHam}(${b})`} mau={MO} co={26} />
    </>
  );
}

/* ---------------- cột phải: đồ thị ---------------- */
function DoThi({d, x, W, H, tt, hienSo, choKetQua, t, dung, tDung}: {d: DoiChieu; x: number; W: number; H: number; tt: TrangThai; hienSo: boolean; choKetQua: boolean; t: number; dung: boolean; tDung: number}) {
  const L = 70, R = 26, T = 104, B = 74;
  const gw = W - L - R, gh = H - T - B;
  const X = (u: number) => L + ((u - d.a) / (d.b - d.a)) * gw;
  const Y = (v: number) => T + (1 - (v - d.yMin) / (d.yMax - d.yMin)) * gh;
  const Yk = (v: number) => Math.min(T + gh + 40, Math.max(T - 40, Y(v))); // phần vọt ra ngoài khung bị cắt bởi clipPath
  const duong = d.mau.map(([u, v], i) => `${i ? 'L' : 'M'}${X(u).toFixed(1)},${Yk(v).toFixed(1)}`).join('');
  const y = d.f(x);
  const px = X(x), py = Math.min(T + gh, Math.max(T, Y(y)));
  const nhip = 0.75 + 0.25 * Math.sin((t * 2 * Math.PI) / 1.4);
  const y0 = d.yMin <= 0 && d.yMax >= 0 ? Y(0) : T + gh;
  const daiNguong = d.nguong ? Y(d.nguong.gia_tri) : null;
  const tenY = `${d.tenHam}(${d.bien})`;
  // nhãn điểm: đang quét -> số x hiện tại; đã dừng ở tối ưu -> ký hiệu (chưa tới đáp án) hoặc số (từ cảnh đáp án)
  const sv = (v: number) => soViet(v).replace(/,/g, '{,}');
  // v95: đã chốt -> ghi SỐ THẬT lên 2 trục (x = 2 ở chân gióng đứng, V = 144 ở đầu gióng ngang) thay cho x*, V_max
  const nhanX = dung ? (hienSo ? `${d.bien} = ${sv(d.xTot)}` : `${d.bien}^{*}`) : `${d.bien} = ${sv(x)}`;
  const nhanY = dung && choKetQua ? (hienSo ? `${d.tenHam} = ${sv(d.yTot)}` : `${d.tenHam}_{${d.kieu === 'max' ? 'max' : 'min'}}`) : '';
  // vòng gợn sóng (pulse ring) lan ra 3 lần lúc chốt, sau đó nhịp chậm
  const dtD = Math.max(0, t - tDung);
  const song = dung ? [0, 0.45, 0.9].map((tre) => { const u = (dtD - tre) / 1.1; return u > 0 && u < 1 ? u : dtD > 2.2 ? ((dtD - tre) % 1.8) / 1.8 : -1; }) : [];
  return (
    <>
      {/* huy hiệu trạng thái */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 18, display: 'flex', justifyContent: 'center'}}>
        <div data-doi-chieu-tt={tt.dat === null ? 'do' : tt.dat ? 'dat' : 'vuot'} style={{height: 54, padding: '0 26px', borderRadius: 27, display: 'flex', alignItems: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 27, letterSpacing: 0.6,
          color: tt.mau, background: `${tt.mau}1F`, border: `2px solid ${tt.mau}`, boxShadow: `0 0 ${18 + 10 * nhip}px ${tt.mau}44`, whiteSpace: 'nowrap'}}>
          {tt.chu}
        </div>
      </div>
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        {/* trục */}
        <line x1={L} y1={T - 8} x2={L} y2={T + gh} stroke={MO} strokeWidth={1.6} />
        <line x1={L} y1={y0} x2={L + gw + 10} y2={y0} stroke={MO} strokeWidth={1.6} />
        {daiNguong !== null ? (
          <>
            <rect x={L} y={d.nguong!.kieu === '<=' ? T : daiNguong} width={gw} height={d.nguong!.kieu === '<=' ? daiNguong - T : T + gh - daiNguong} fill={`${VUOT}12`} />
            <line x1={L} y1={daiNguong} x2={L + gw} y2={daiNguong} stroke={VUOT} strokeWidth={2} strokeDasharray="10 8" />
          </>
        ) : null}
        <defs><clipPath id="dc-khung"><rect x={L} y={T - 6} width={gw + 6} height={gh + 6} /></clipPath></defs>
        <g clipPath="url(#dc-khung)">
          <path d={duong} fill="none" stroke={VANG} strokeWidth={9} strokeOpacity={0.12} strokeLinejoin="round" />
          <path d={duong} fill="none" stroke={VANG} strokeWidth={3.2} strokeLinejoin="round" strokeLinecap="round" />
        </g>
        {/* điểm tối ưu (đã dừng): đường gióng xuống trục */}
        {dung ? (
          <>
            <line x1={px} y1={py} x2={px} y2={y0} stroke={DAT} strokeWidth={1.6} strokeDasharray="6 6" />
            <line x1={L} y1={py} x2={px} y2={py} stroke={DAT} strokeWidth={1.6} strokeDasharray="6 6" />
          </>
        ) : (
          <line x1={px} y1={py} x2={px} y2={y0} stroke={tt.mau} strokeOpacity={0.4} strokeWidth={1.4} />
        )}
        {song.map((u, k) => (u >= 0 ? <circle key={k} cx={px} cy={py} r={12 + 46 * u} fill="none" stroke={tt.mau} strokeWidth={2.4 * (1 - u) + 0.4} opacity={(dtD < 2.2 ? 0.85 : 0.35) * (1 - u)} /> : null))}
        {dung ? (
          <>
            <circle cx={px} cy={y0} r={5} fill={DAT} />
            <circle cx={L} cy={py} r={5} fill={DAT} />
          </>
        ) : null}
        <circle cx={px} cy={py} r={30 * nhip} fill={tt.mau} opacity={0.1} />
        <circle cx={px} cy={py} r={18} fill={tt.mau} opacity={0.22} />
        <circle cx={px} cy={py} r={10} fill={tt.mau} />
        <circle cx={px} cy={py} r={4.2} fill="#fff" opacity={0.9} />
      </svg>
      <Nhan x={L - 12} y={T - 30} tex={tenY} mau={VANG} co={26} neo="trai" />
      <Nhan x={L + gw + 4} y={y0 - 24} tex={d.bien} mau={MO} co={26} neo="phai" />
      {daiNguong !== null && d.nguong!.nhan ? <Nhan x={L + gw} y={daiNguong - 22} tex={d.nguong!.nhan} mau={VUOT} co={26} neo="phai" /> : null}
      {/* nhãn x bám điểm; gần mép phải/trái thì neo vào trong để không tràn khỏi cột */}
      <Nhan x={px > L + gw * 0.65 ? Math.min(px + 30, W - 10) : px < L + gw * 0.35 ? Math.max(px - 30, 10) : px} y={Math.min(T + gh + 44, y0 + 44)} tex={nhanX} mau={tt.mau} co={26}
        neo={px > L + gw * 0.65 ? 'phai' : px < L + gw * 0.35 ? 'trai' : 'giua'} />
      {nhanY ? (
        <div style={{position: 'absolute', left: L + 10, top: Math.max(T + 4, py - 52), background: 'rgba(14,16,20,0.82)', border: `1px solid ${DAT}66`, borderRadius: 999, padding: '1px 12px 3px'}}>
          <Toan tex={nhanY} size={27} color={DAT} style={{fontWeight: 800}} />
        </div>
      ) : null}
    </>
  );
}

export const DoiChieu2Cot: React.FC<{d: DoiChieu; dt: number; dai: number; t: number; rong: number; cao: number; hienSo: boolean; a: number; dtGiai?: number; tHuyHieu?: number; canVat?: boolean}> = ({canVat, d, dt, dai, t, rong, cao, hienSo, a, dtGiai, tHuyHieu}) => {
  if (canVat && d.hinh === 'thanh') throw new Error('t2_trong: bên trái đối chiếu chỉ có thanh giá trị');
  const {x, pha} = nhipTheoLoi(d, dt, dai, dtGiai);
  // mốc (giây toàn cục) điểm sáng đứng ở tối ưu: theo lời đọc (+0,8 s lướt) hoặc nhịp cũ
  const tDung = t - dt + (dtGiai !== undefined ? dtGiai + 0.8 : 0.6 + Math.max(1.6, Math.min(4.2, 0.45 * dai)) + Math.max(0.8, Math.min(1.6, 0.18 * dai)));
  // v99.1: huy hiệu ★ CỰC ĐẠI / ✓ chỉ bật khi giọng đọc đã công bố đáp án (trước đó giữ trạng thái đang dò)
  const tt = trangThaiDoiChieu(d, x, tHuyHieu !== undefined && t < tHuyHieu && pha === 'dung' ? 've' : pha);
  const W = rong / 2;
  const vao = emRa(a);
  const mauHinh = tt.dat === false ? VUOT : tt.dat ? DAT : VANG;
  return (
    <div data-doi-chieu style={{position: 'absolute', inset: 0, opacity: vao, fontFamily: FONT, color: CHU, ...SO_DEU}}>
      <div data-vat-the={d.hinh === 'thanh' ? undefined : true} style={{position: 'absolute', left: 0, top: 0, width: W, height: cao, transform: `translateX(${(1 - vao) * -30}px)`}}>
        <HinhTrai d={d} x={x} W={W} H={cao} mau={mauHinh} />
      </div>
      {/* vạch chia 2 cột */}
      <div style={{position: 'absolute', left: W - 1, top: 40, width: 2, height: cao - 80, background: 'linear-gradient(to bottom, transparent, rgba(230,237,245,0.16), transparent)'}} />
      <div data-do-thi style={{position: 'absolute', left: W, top: 0, width: W, height: cao, transform: `translateX(${(1 - vao) * 30}px)`}}>
        <DoThi d={d} x={x} W={W} H={cao} tt={tt} choKetQua={tHuyHieu === undefined || t >= tHuyHieu} hienSo={hienSo} t={t} dung={pha === 'dung'} tDung={tDung} />
      </div>
    </div>
  );
};
