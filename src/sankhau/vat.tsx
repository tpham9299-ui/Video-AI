// Thư viện VẬT THẬT cho sân khấu, phong cách neon như video mẫu: viền phát sáng trên nền tối, bật lên có độ nảy,
// mỗi vật có chuyển động riêng (xúc xắc lăn, đồng xu lật, vòng quay quay, hộp quà mở, kim đồng hồ đo xác suất chạy...).
import React from 'react';
import {Img, staticFile} from 'remotion';
import {FONT, FONT_DAM, BONG_CHU, vienChu, laMoi, GIAO_DIEN} from '../theme';
import {GachTay} from '../dong/DiemNhan';
import {CoChuSan} from '../dong/KhongGian';
import {Toan} from '../Toan';
import {texSangChu} from '../chu';
import {NguoiCuDong} from './NguoiCuDong';
import {bamChuoi, easeInOut, easeOut, kep, lerp, nay, NEN_VAT, NEN_VAT_2, neon, ngauNhien, popOut, tienDo, VONG_MAU} from './donghieu';
import {Vat} from './dulieu';
import {boCucDanhSach, cotThe, kichBanTron, kichThe, TrangThai} from './trangthai';
import {Goc3D} from './chieu3d';
import {DoThi, HinhHoc} from './hinhhoc';
import {HinhTuDo} from './hinhtudo';
import {Cau, Cay, KhoiHop, Thang, ToaNha, Tru, Xe} from './vat3d';

const phatSang = (c: string, r = 10) => `drop-shadow(0 0 ${r}px ${c}) drop-shadow(0 0 ${Math.max(1, r / 5)}px ${c})`;
const XAM_MO = 'rgba(160,170,170,0.35)';

export const ChuNhanMau: React.FC<{chu: string; tuKhoa: string; mau: string}> = ({chu, tuKhoa, mau}) => {
  if (!tuKhoa) return <>{chu}</>;
  const i = chu.toLowerCase().indexOf(tuKhoa.toLowerCase());
  if (i < 0) return <>{chu}</>;
  return (
    <>
      {chu.slice(0, i)}
      <span style={{color: mau}}>{chu.slice(i, i + tuKhoa.length)}</span>
      {chu.slice(i + tuKhoa.length)}
    </>
  );
};

// nhãn dưới vật: chữ ĐỦ TO để đọc trên điện thoại (sân khấu bị thu nhỏ thì hệ số chữ bù lại), TeX đổi sang chữ thường đọc được
const Nhan: React.FC<{chu: string; co?: number; mau?: string; mo?: number}> = ({chu, co = 42, mau = '#fff', mo = 1}) => {
  const t = texSangChu(chu);
  return t ? (
    <div style={{marginTop: 12, fontFamily: FONT_DAM, fontWeight: 800, fontSize: co * KC, color: mau, opacity: mo, background: 'rgba(4,14,14,0.78)', border: '2px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '4px 18px', whiteSpace: t.length > 26 ? 'normal' : 'nowrap', maxWidth: 860, textAlign: 'center', lineHeight: 1.2}}>
      {t}
    </div>
  ) : null;
};

const DauTich: React.FC<{p: number; mau: string; co?: number; style?: React.CSSProperties}> = ({p, mau, co = 46, style}) =>
  p > 0 ? (
    <svg width={co} height={co} viewBox="0 0 50 50" style={{position: 'absolute', transform: `scale(${popOut(p, 2.4)})`, filter: phatSang(mau, 8), ...style}}>
      <circle cx={25} cy={25} r={22} fill={mau} />
      <path d="M14 26 L22 34 L37 17" stroke="#0b1a14" strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - kep(p * 1.6 - 0.4)} />
    </svg>
  ) : null;

const DauX: React.FC<{p: number; co?: number; style?: React.CSSProperties}> = ({p, co = 120, style}) =>
  p > 0 ? (
    <svg width={co} height={co} viewBox="0 0 100 100" style={{position: 'absolute', filter: phatSang('#FF5C61', 6), ...style}}>
      <path d="M18 18 L82 82" stroke="#FF5C61" strokeWidth={10} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - kep(p * 2)} />
      <path d="M82 18 L18 82" stroke="#FF5C61" strokeWidth={10} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - kep(p * 2 - 1)} />
    </svg>
  ) : null;

// trạng thái của phần tử thứ i (từ 1) trong nhóm: được chọn / bị loại / bị làm mờ vì phần tử khác được chọn
function phanTu(st: TrangThai, i: number, mauGoc: string) {
  const c = st.chon.get(i);
  const l = st.loai.get(i) || st.loaiCa;
  const pc = c ? c.p : st.chonCa;
  const mauC = neon(c ? c.mau : st.mauChon || 'xanh_la');
  const mo = (1 - 0.6 * Math.max(0, st.coChon - pc)) * (1 - 0.65 * l);
  return {pc, l, mau: pc > 0.01 ? mauC : mauGoc, mo, xam: l > 0.5 || st.coChon - pc > 0.5};
}

// vào lần lượt: phần tử i xuất hiện trễ hơn một chút
const vaoLanLuot = (st: TrangThai, i: number, n: number) => kep((st.t - st.ta - (i * Math.min(0.12, 0.9 / Math.max(1, n)))) / 0.4);

type Ve = (v: Vat, st: TrangThai, frame: number, fps: number) => React.ReactNode;
// hệ số bù cỡ chữ của sân khấu (sân khấu bị thu nhỏ để vừa khung -> chữ phóng lại cho đủ đọc): SanKhau đặt trước khi vẽ
let KC = 1;
export const datHeSoChu = (k: number) => { KC = Math.max(1, Math.min(1.6, k || 1)); };
const tc = texSangChu;

/* ---------------- BÀN TRÒN: ghế xếp quanh bàn, mỗi ghế một người (đề "ngồi quanh bàn tròn", "xếp vòng tròn") ----------------
   ds: nhãn từng ghế theo chiều kim đồng hồ từ ghế trên cùng ("Nam", "Nữ", tên; "_" = ghế trống). Áo theo nhãn: nữ hồng, nam xanh.
   chon/loai_bo theo số ghế; quay = cả vòng dịch đi gia_tri ghế (minh họa "xoay vòng vẫn là một cách xếp"). */
const BanTron: Ve = (v, st) => {
  const n = Math.max(3, Math.min(16, v.soLuong || v.ds.length || 6));
  const kb = kichBanTron(n, v.co);
  const o = kb.o, Rg = kb.Rg, Rb = kb.Rb;     // ô mỗi người, bán kính vòng ghế, bán kính mặt bàn (người to, bàn vừa đủ)
  const buocQuay = Number(v.giaTri) || 1;
  const xoay = st.quay < 0 ? 0 : easeInOut(Math.min(1, st.quay)) * (360 / n) * buocQuay;
  const goc = neon(v.mau, neon('xanh_la'));
  const S = (Rg + o) * 2 + 20;
  const MAU_KHAC = ['#3BF29A', '#FFD54A', '#B79CFF', '#FF8A3D'];
  return (
    <div style={{position: 'relative', width: S, height: S + 10}}>
      {/* mặt bàn */}
      <div style={{position: 'absolute', left: S / 2 - Rb, top: S / 2 - Rb, width: Rb * 2, height: Rb * 2, borderRadius: '50%',
        background: 'radial-gradient(circle at 40% 35%, #3a2a1c 0%, #22170e 70%)', border: `5px solid ${goc}`, boxShadow: `0 0 26px ${goc}66, inset 0 0 30px rgba(0,0,0,0.6)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24, boxSizing: 'border-box',
        fontFamily: FONT_DAM, fontWeight: 900, fontSize: Math.max(30 * KC, Rb * 0.2), color: '#fff', opacity: kep(st.vao * 2)}}>{tc(st.noiDung || '')}</div>
      {Array.from({length: n}, (_, k) => {
        const i = k + 1;
        const a = vaoLanLuot(st, k, n);
        const s = phanTu(st, i, goc);
        const nhan = v.ds[k] || '';
        const trong = nhan === '_' || nhan === '';
        const rad = ((-90 + (k * 360) / n + xoay) * Math.PI) / 180;
        const x = S / 2 + Rg * Math.cos(rad), y = S / 2 + Rg * Math.sin(rad);
        const mau = /nữ|nu\b|gái/i.test(nhan) ? '#FF7EB6' : /nam|trai/i.test(nhan) ? '#4FC3F7' : MAU_KHAC[k % 4];
        return (
          <div key={k} style={{position: 'absolute', left: x - o / 2, top: y - o * 0.62, width: o, display: 'flex', flexDirection: 'column', alignItems: 'center',
            opacity: kep(a * 2) * s.mo, transform: `scale(${popOut(a) * (1 + 0.1 * s.pc)})`, filter: s.xam ? 'grayscale(1)' : 'none'}}>
            {/* ghế */}
            <div style={{position: 'absolute', top: o * 0.28, width: o * 0.62, height: o * 0.62, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: `3px solid ${s.pc > 0.01 ? s.mau : 'rgba(255,255,255,0.28)'}`}} />
            {trong ? <div style={{height: o * 0.9}} /> : (
              <svg width={o * 0.56} height={o * 0.9} viewBox="-32 -108 64 114" style={{position: 'relative', overflow: 'visible', filter: s.pc > 0.01 ? phatSang(s.mau, 4 + 10 * s.pc) : 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))'}}>
                <NguoiCuDong t={st.t + k * 0.41} hat={k * 1.3} toc={['#2b1c12', '#4a2c17', '#1d1d1d', '#6b3e1f'][k % 4]} dongTac={s.pc > 0.01 ? 'gio_tay' : 'dung'} sang={s.pc} mauAo={s.pc > 0.01 ? s.mau : mau} />
              </svg>
            )}
            {!trong ? <div style={{fontFamily: FONT_DAM, fontWeight: 800, fontSize: Math.min(Math.max(26 * KC, o * 0.24), (o * 1.05) / Math.max(2, tc(nhan).length * 0.66)), color: '#fff', whiteSpace: 'nowrap', textShadow: '0 2px 6px rgba(0,0,0,0.8)'}}>{tc(nhan)}</div> : null}
            <DauTich p={s.pc} mau={s.mau} co={o * 0.3} style={{right: 0, top: -2}} />
          </div>
        );
      })}
      {v.nhan ? <div style={{position: 'absolute', left: 0, right: 0, bottom: -8, textAlign: 'center'}}><Nhan chu={v.nhan} /></div> : null}
    </div>
  );
};

/* ---------------- NGƯỜI ---------------- */
const Nguoi: Ve = (v, st) => {
  const n = v.soLuong;
  const cot = n <= 6 ? n : Math.ceil(n / 2);
  const o = Math.min(190, 900 / cot) * v.co;
  const goc = neon(v.mau, neon('xanh_la'));
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      <div style={{display: 'grid', gridTemplateColumns: `repeat(${cot}, ${o}px)`, rowGap: 14, justifyItems: 'center'}}>
        {Array.from({length: n}, (_, k) => {
          const i = k + 1;
          const a = vaoLanLuot(st, k, n);
          const s = phanTu(st, i, goc);
          return (
            <div key={k} style={{position: 'relative', width: o, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: kep(a * 2) * s.mo, transform: `translateY(${(1 - easeOut(a)) * 40}px) scale(${popOut(a) * (1 + 0.08 * s.pc)})`, filter: s.xam ? 'grayscale(1)' : 'none'}}>
              {/* NGƯỜI CỬ ĐỘNG: đứng thở + đung đưa tay; được CHỌN thì giơ tay; đang di chuyển thì bước đi vung tay chân; kịch bản ghi dong_tac thì theo đó */}
              <svg width={o * 0.62} height={o * 1.1} viewBox="-32 -108 64 114" style={{overflow: 'visible', filter: s.pc > 0.01 ? phatSang(s.mau, 4 + 10 * s.pc) : 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))'}}>
                <NguoiCuDong t={st.t + k * 0.37} hat={k * 1.7} toc={['#2b1c12', '#4a2c17', '#1d1d1d', '#6b3e1f'][k % 4]}
                  dongTac={st.nghiengDi ? 'di' : s.pc > 0.01 ? 'gio_tay' : v.kieu || 'dung'} sang={s.pc}
                  mauAo={s.pc > 0.01 ? s.mau : ['#3BF29A', '#4FC3F7', '#FF8A3D', '#B79CFF', '#FFD54A', '#FF7EB6'][k % 6]} />
              </svg>
              <DauTich p={s.pc} mau={s.mau} co={o * 0.34} style={{right: o * 0.06, top: -4}} />
              <DauX p={s.l} co={o * 0.8} style={{top: o * 0.08}} />
              {v.ds[k] ? <div style={{fontFamily: FONT_DAM, fontWeight: 800, fontSize: Math.min(Math.max(32 * KC, o * 0.22), (o * 0.92) / Math.max(2, tc(v.ds[k]).length * 0.7)), color: '#fff', marginTop: 4, textAlign: 'center', lineHeight: 1.1, whiteSpace: 'nowrap'}}>{v.ds[k]}</div> : null}
            </div>
          );
        })}
      </div>
      <Nhan chu={v.nhan} />
    </div>
  );
};

/* ---------------- THẺ THÔNG TIN ---------------- */
const The: Ve = (v, st) => {
  const n = v.soLuong;
  const kt = kichThe(v, KC);
  const w = kt.w;
  const h = kt.h;
  const goc = neon(v.mau, neon('cam'));
  const r = ngauNhien(bamChuoi(v.id));
  // nhiều hơn 6 thẻ: 2 hàng, thẻ không chồng lên nhau
  const cot = cotThe(n), hang = Math.ceil(n / cot);
  const khoang = w + 26;
  return (
    <div style={{position: 'relative', width: Math.max(w, khoang * cot), height: hang * (h + 26) + (v.nhan ? 60 : 10)}}>
      {Array.from({length: n}, (_, k) => {
        const i = k + 1;
        const a = vaoLanLuot(st, k, n);
        const s = phanTu(st, i, goc);
        const ck = k % cot, hk = Math.floor(k / cot);
        const goc0 = (ck - (Math.min(cot, n - hk * cot) - 1) / 2) * khoang;
        const y0 = hk * (h + 26);
        const gocBung = (k / n) * Math.PI * 2 + r() * 0.6;
        const bx = Math.cos(gocBung) * (230 + r() * 70) * Math.max(0.7, v.co);
        const by = Math.sin(gocBung) * (150 + r() * 50) * Math.max(0.7, v.co);
        const xoayBung = (r() - 0.5) * 50;
        const x = lerp(goc0, bx, st.bung);
        const y = lerp(y0, by, st.bung);
        const tieuDe = v.ds[k] || (n === 1 ? st.noiDung : '');
        // Manim DrawBorderThenFill: viền vẽ dần quanh thẻ trước, nền và chữ hiện sau
        const ve = kep((st.t - st.ta - k * Math.min(0.12, 0.9 / Math.max(1, n))) / 0.5);
        return (
          <div key={k} style={{position: 'absolute', left: '50%', top: 0, width: w, height: h, marginLeft: -w / 2, opacity: kep(a * 2) * s.mo,
            transform: `translate(${x}px, ${y + (1 - easeOut(a)) * 60}px) rotate(${lerp(n > 6 ? 0 : (k - (n - 1) / 2) * (n > 3 ? 2.5 : 0), xoayBung, st.bung)}deg) scale(${popOut(a) * (1 + 0.07 * s.pc)})`,
            border: `5px solid ${ve > 0.85 ? s.mau : 'transparent'}`, borderRadius: 22, background: `linear-gradient(160deg, ${NEN_VAT_2}, ${NEN_VAT})`, backgroundClip: 'padding-box', boxShadow: ve > 0.85 ? `0 0 ${10 + 18 * s.pc}px ${s.mau}` : 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: FONT, color: '#fff', filter: s.xam ? 'grayscale(1)' : 'none'}}>
            {tieuDe ? <div style={{opacity: kep((ve - 0.35) / 0.4), fontWeight: 900, fontSize: kt.co, textAlign: 'center', padding: '0 22px', lineHeight: 1.18, textShadow: '0 2px 10px rgba(0,0,0,0.6)'}}>{laToanNhan(tieuDe) ? <Toan tex={texNhan(tieuDe)} size={kt.co} color="#ffffff" maxWidth={w - 40} /> : tieuDe}</div> : null}
            {n === 1 && st.giaTriChu ? <div style={{fontWeight: 900, fontSize: 54 * v.co, color: s.mau}}>{tc(st.giaTriChu)}</div> : null}
            {n > 1 && !tieuDe ? <svg width={w * 0.5} height={h * 0.3} viewBox="0 0 100 40"><circle cx={20} cy={20} r={14} fill="none" stroke={s.mau} strokeWidth={5} /><rect x={42} y={10} width={52} height={7} rx={3} fill={s.mau} opacity={0.7} /><rect x={42} y={24} width={36} height={7} rx={3} fill="#ffffff" opacity={0.35} /></svg> : null}
            {ve < 1 ? (
              <svg width={w} height={h} style={{position: 'absolute', left: -5, top: -5, overflow: 'visible'}}>
                <rect x={2.5} y={2.5} width={w - 5} height={h - 5} rx={20} fill="none" stroke={s.mau} strokeWidth={5} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - easeOut(ve / 0.85)} style={{filter: `drop-shadow(0 0 8px ${s.mau})`}} />
              </svg>
            ) : null}
            <DauTich p={s.pc} mau={s.mau} co={46} style={{right: -16, top: -16}} />
            <DauX p={s.l} co={h * 0.8} />
          </div>
        );
      })}
      {v.nhan ? <div style={{position: 'absolute', left: 0, right: 0, top: h + 4, display: 'flex', justifyContent: 'center'}}><Nhan chu={v.nhan} /></div> : null}
    </div>
  );
};

/* ---------------- LÁ BÀI ---------------- */
const CHAT_DO = /[♥♦]/;
const LaBai: Ve = (v, st) => {
  const ds = v.ds.length ? v.ds : [st.giaTriChu || 'A♥'];
  const n = Math.min(6, Math.max(v.soLuong, ds.length));
  const w = 170 * v.co;
  const h = 240 * v.co;
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      <div style={{display: 'flex', gap: n > 4 ? 10 : 22}}>
        {Array.from({length: n}, (_, k) => {
          const i = k + 1;
          const a = vaoLanLuot(st, k, n);
          const s = phanTu(st, i, '#ffffff');
          const lat = st.quay >= 0 ? st.quay : kep((st.t - st.ta - k * 0.12 - 0.35) / 0.45);
          const goc = lat * 180;
          const mat = goc > 90;
          const nd = ds[k % ds.length] || 'A♥';
          const mauChu = CHAT_DO.test(nd) ? '#E0374A' : '#151515';
          return (
            <div key={k} style={{position: 'relative', width: w, height: h, opacity: kep(a * 2) * s.mo, transform: `translateY(${(1 - easeOut(a)) * -120}px) rotate(${(k - (n - 1) / 2) * 5 * (1 - easeOut(a)) * 3}deg) scale(${1 + 0.08 * s.pc})`}}>
              <div style={{position: 'absolute', inset: 0, borderRadius: 16, transform: `perspective(900px) rotateY(${mat ? goc - 180 : goc}deg)`,
                background: mat ? '#FAFAF5' : `repeating-linear-gradient(45deg, #13302b 0 10px, #0d211e 10px 20px)`, border: `4px solid ${s.pc > 0.01 ? s.mau : mat ? '#ddd' : neon('xanh_la')}`,
                boxShadow: `0 0 ${8 + 18 * s.pc}px ${s.pc > 0.01 ? s.mau : 'rgba(59,242,154,0.5)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_DAM, fontWeight: 900, color: mauChu}}>
                {mat ? (
                  <>
                    <div style={{position: 'absolute', left: 10, top: 6, fontSize: 30 * v.co, lineHeight: 1}}>{nd}</div>
                    <div style={{fontSize: 64 * v.co}}>{nd.replace(/^[^♥♦♣♠]*/, '') || nd}</div>
                  </>
                ) : null}
              </div>
              <DauTich p={s.pc} mau={s.mau} co={44} style={{right: -14, top: -14}} />
              <DauX p={s.l} co={w} style={{top: (h - w) / 2}} />
            </div>
          );
        })}
      </div>
      <Nhan chu={v.nhan} />
    </div>
  );
};

/* ---------------- XÚC XẮC ---------------- */
const CHAM: Record<number, number[][]> = {
  1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]], 6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};
export const MatXuc: React.FC<{mat: number; co: number; vien: string}> = ({mat, co, vien}) => (
  <svg width={co} height={co} viewBox="0 0 100 100">
    <rect x={4} y={4} width={92} height={92} rx={20} fill="#F7F7F2" stroke={vien} strokeWidth={5} />
    {(CHAM[mat] || CHAM[1]).map(([r, c], i) => (
      <circle key={i} cx={26 + c * 24} cy={26 + r * 24} r={9} fill={mat === 1 ? '#E0374A' : '#1b1b1b'} />
    ))}
  </svg>
);
// Khối lập phương 3D: mặt 1 trước, 6 sau, 3 phải, 4 trái, 2 trên, 5 dưới (hai mặt đối nhau cộng bằng 7 như xúc xắc thật).
const GOC_MAT: Record<number, [number, number]> = {1: [0, 0], 6: [0, 180], 3: [0, -90], 4: [0, 90], 2: [-90, 0], 5: [90, 0]};
const MAT_KHOI: [number, string][] = [
  [1, 'rotateY(0deg)'], [6, 'rotateY(180deg)'], [3, 'rotateY(90deg)'], [4, 'rotateY(-90deg)'], [2, 'rotateX(90deg)'], [5, 'rotateX(-90deg)'],
];
export const Xuc3D: React.FC<{co: number; rx: number; ry: number; vien: string}> = ({co, rx, ry, vien}) => {
  const g = React.useContext(Goc3D); // camera nghiêng -> thấy mặt trên khối; camera xoay -> khối xoay theo
  return (
  <div style={{width: co, height: co, perspective: co * 5}}>
    <div style={{position: 'relative', width: co, height: co, transformStyle: 'preserve-3d', transform: `rotateX(${-g.n * 0.6}deg) rotateY(${g.r}deg) rotateX(${rx}deg) rotateY(${ry}deg)`}}>
      {MAT_KHOI.map(([m, xoay]) => (
        <div key={m} style={{position: 'absolute', inset: 0, transform: `${xoay} translateZ(${co / 2}px)`, backfaceVisibility: 'hidden', borderRadius: co * 0.16, overflow: 'hidden', boxShadow: `inset 0 0 ${co * 0.12}px rgba(0,0,0,0.25), 0 0 ${co * 0.08}px ${vien}`}}>
          <MatXuc mat={m} co={co} vien={vien} />
        </div>
      ))}
    </div>
  </div>
  );
};
const XucXac: Ve = (v, st) => {
  const n = v.soLuong;
  const co = 160 * v.co;
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      <div style={{display: 'flex', gap: 60}}>
        {Array.from({length: n}, (_, k) => {
          const kq = v.ketQua[k] || ((k * 3 + 2) % 6) + 1;
          const a = vaoLanLuot(st, k, n);
          const s = phanTu(st, k + 1, neon(v.mau, neon('xanh_la')));
          const q = st.quay;
          const dangLan = q >= 0 && q < 1;
          const truocQuay = st.coQuay && q < 0;
          const mat = truocQuay ? ((kq + 2) % 6) + 1 : kq;
          const [gx, gy] = GOC_MAT[mat];
          // dừng hơi nghiêng để thấy rõ khối 3D; khi lăn: lộn nhiều vòng trên 2 trục, chậm dần (easeOut), nảy trên sàn
          const e = dangLan ? easeOut(q) : 1;
          const rx = gx - 16 + (1 - e) * (720 + k * 180);
          const ry = gy + 22 + (1 - e) * (540 + k * 90);
          const nhay = dangLan ? -nay(q, 3) * 170 : 0;
          return (
            <div key={k} style={{position: 'relative', opacity: kep(a * 2) * s.mo, transform: `translateY(${nhay + (1 - easeOut(a)) * -200}px) scale(${popOut(a) * (1 + 0.1 * s.pc)})`}}>
              <Xuc3D co={co} rx={rx} ry={ry} vien={s.mau} />
              <div style={{position: 'absolute', left: '10%', right: '10%', bottom: -26 + nhay * -0.0, height: 20, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(0,0,0,0.6), transparent 70%)', transform: `translateY(${-nhay}px) scale(${1 + nhay / 400})`}} />
              <DauTich p={s.pc} mau={s.mau} style={{right: -16, top: -16}} />
            </div>
          );
        })}
      </div>
      <Nhan chu={v.nhan} />
    </div>
  );
};

/* ---------------- ĐỒNG XU ---------------- */
// Khối preserve-3d tự thêm góc camera (đọc từ ngữ cảnh) trước phép xoay riêng của vật.
export const XoayTheoCam: React.FC<{style?: React.CSSProperties; sau: string; heSo?: number; children: React.ReactNode}> = ({style, sau, heSo = 0.6, children}) => {
  const g = React.useContext(Goc3D);
  return <div style={{...style, transform: `rotateX(${-g.n * heSo}deg) rotateY(${g.r}deg) ${sau}`}}>{children}</div>;
};
const MatXu: React.FC<{chu: string; co: number; id: string}> = ({chu, co, id}) => (
  <svg width={co} height={co} viewBox="0 0 100 100">
    <defs>
      <radialGradient id={id} cx="35%" cy="30%" r="75%">
        <stop offset="0%" stopColor="#FFF3B0" />
        <stop offset="55%" stopColor="#F5B82E" />
        <stop offset="100%" stopColor="#B7791F" />
      </radialGradient>
    </defs>
    <circle cx={50} cy={50} r={48} fill={`url(#${id})`} stroke="#8a5a12" strokeWidth={3} />
    <circle cx={50} cy={50} r={37} fill="none" stroke="#a86e16" strokeWidth={3} strokeDasharray="4 4" />
    <text x={50} y={64} textAnchor="middle" fontFamily="Montserrat, Liberation Sans, sans-serif" fontWeight={900} fontSize={42} fill="#6b420b">{chu}</text>
  </svg>
);
// Đồng xu 3D: đĩa có 2 mặt (S trước, N sau) và viền dày; tung = lật quanh trục ngang nhiều vòng rồi dừng đúng mặt.
const DongXu: Ve = (v, st) => {
  const n = v.soLuong;
  const co = 180 * v.co;
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      <div style={{display: 'flex', gap: 44}}>
        {Array.from({length: n}, (_, k) => {
          const kq = (v.ds[k] || 'S').toUpperCase().startsWith('N') ? 'N' : 'S';
          const a = vaoLanLuot(st, k, n);
          const s = phanTu(st, k + 1, '#FFD54A');
          const q = st.quay;
          const dangLat = q >= 0 && q < 1;
          const dich = kq === 'S' ? 0 : 180;
          const goc = (st.coQuay && q < 0 ? 0 : dich) + (dangLat ? (1 - easeOut(q)) * 1440 : 0);
          const len = dangLat ? -Math.sin(q * Math.PI) * 220 * v.co : 0;
          return (
            <div key={k} style={{position: 'relative', opacity: kep(a * 2) * s.mo, transform: `translateY(${len}px) scale(${popOut(a) * (1 + 0.1 * s.pc)})`}}>
              <div style={{width: co, height: co, perspective: co * 4}}>
                <XoayTheoCam style={{position: 'relative', width: co, height: co, transformStyle: 'preserve-3d'}} sau={`rotateY(-26deg) rotateX(${goc + 30}deg)`}>
                  {[-6, -4.5, -3, -1.5, 0, 1.5, 3, 4.5, 6].map((z) => (
                    <div key={z} style={{position: 'absolute', inset: 0, borderRadius: '50%', background: '#a86e16', transform: `translateZ(${z * v.co}px)`}} />
                  ))}
                  <div style={{position: 'absolute', inset: 0, transform: `translateZ(${6 * v.co}px)`, backfaceVisibility: 'hidden'}}><MatXu chu="S" co={co} id={`xs${v.id}${k}`} /></div>
                  <div style={{position: 'absolute', inset: 0, transform: `rotateX(180deg) translateZ(${6 * v.co}px)`, backfaceVisibility: 'hidden'}}><MatXu chu="N" co={co} id={`xn${v.id}${k}`} /></div>
                </XoayTheoCam>
              </div>
              <DauTich p={s.pc} mau={s.mau} style={{right: -10, top: -10}} />
            </div>
          );
        })}
      </div>
      <Nhan chu={v.nhan || 'S = sấp · N = ngửa'} co={24} />
    </div>
  );
};

/* ---------------- HỘP BI / TÚI ---------------- */
const laMauToi = (hex: string) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return false;
  const n = parseInt(m[1], 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) < 70;
};
const Bi: React.FC<{mau: string; r: number; sang?: number}> = ({mau, r, sang = 0}) => (
  <svg width={r * 2} height={r * 2} viewBox="0 0 40 40" style={{overflow: 'visible', filter: sang ? phatSang(mau, 6 + 10 * sang) : 'none'}}>
    <defs>
      <radialGradient id={`bi${mau.replace('#', '')}`} cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity={0.95} />
        <stop offset="30%" stopColor={mau} />
        <stop offset="100%" stopColor={mau} stopOpacity={0.55} />
      </radialGradient>
    </defs>
    {/* bi màu tối (đen, xám đậm) có viền sáng để nhìn rõ trên nền tối - không bị nhầm thành bi đỏ hay mất hút */}
    <circle cx={20} cy={20} r={18} fill={`url(#bi${mau.replace('#', '')})`} stroke={laMauToi(mau) ? '#d7e3e6' : 'rgba(0,0,0,0.35)'} strokeWidth={laMauToi(mau) ? 2.4 : 1.5} />
  </svg>
);
const HopBi: Ve = (v, st) => {
  const tui = v.loai === 'tui';
  const W = 400 * v.co;
  const H = 320 * v.co;
  const r = 23 * v.co;
  const tat: string[] = [];
  v.nhom.forEach((g) => {
    for (let i = 0; i < g.so; i++) tat.push(g.mau);
  });
  // các viên đã được lấy ra (theo từng lần lay_ra), lấy viên cùng màu cuối cùng trong hộp
  const daLay: {idx: number; p: number; thu: number; k: number}[] = [];
  const conLai = tat.map(() => true);
  st.layRa.forEach((l) => {
    for (let k = 0; k < l.so; k++) {
      let idx = -1;
      for (let j = tat.length - 1; j >= 0; j--) if (conLai[j] && (!l.mau || tat[j] === l.mau)) { idx = j; break; }
      if (idx < 0) for (let j = tat.length - 1; j >= 0; j--) if (conLai[j]) { idx = j; break; }
      if (idx < 0) break;
      conLai[idx] = false;
      daLay.push({idx, p: kep((l.p - k * 0.15) / 0.85), thu: l.thu, k: daLay.length});
    }
  });
  const cot = Math.max(4, Math.floor((W - 40) / (r * 2.3)));
  const viTri = (j: number) => ({x: 30 + (j % cot) * r * 2.3 + r, y: H - 26 - Math.floor(j / cot) * r * 2.1 - r});
  const goc = neon(v.mau, neon('xanh_la'));
  const khay = (k: number) => ({x: W + 40 + (k % 3) * r * 2.6, y: H * 0.25 + Math.floor(k / 3) * r * 2.6});
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      <div style={{position: 'relative', width: W, height: H}}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', overflow: 'visible', filter: phatSang(goc, 8 + 10 * st.sang)}}>
          {tui ? (
            <path d={`M${W * 0.28} ${H * 0.12} Q${W * 0.5} ${H * 0.2} ${W * 0.72} ${H * 0.12} L${W * 0.8} ${H * 0.3} Q${W * 1.02} ${H * 0.62} ${W * 0.86} ${H * 0.96} Q${W * 0.5} ${H * 1.04} ${W * 0.14} ${H * 0.96} Q${-W * 0.02} ${H * 0.62} ${W * 0.2} ${H * 0.3} Z`}
              fill={NEN_VAT_2} stroke={goc} strokeWidth={6} strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - easeOut(st.vao)} />
          ) : (
            <path d={`M8 ${H * 0.08} L8 ${H - 18} Q8 ${H - 4} 24 ${H - 4} L${W - 24} ${H - 4} Q${W - 8} ${H - 4} ${W - 8} ${H - 18} L${W - 8} ${H * 0.08}`}
              fill="rgba(79,195,247,0.07)" stroke={goc} strokeWidth={6} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - easeOut(st.vao)} />
          )}
          {tui ? <path d={`M${W * 0.26} ${H * 0.2} Q${W * 0.5} ${H * 0.3} ${W * 0.74} ${H * 0.2}`} stroke={goc} strokeWidth={5} fill="none" strokeDasharray="6 8" /> : null}
        </svg>
        {!tui
          ? tat.map((m, j) => {
              if (!conLai[j]) return null;
              const a = kep((st.t - st.ta - 0.25 - j * Math.min(0.06, 1 / tat.length)) / 0.45);
              const p = viTri(j);
              return (
                <div key={j} style={{position: 'absolute', left: p.x - r, top: p.y - r - (1 - easeOut(a)) * 260 - nay(a, 2) * 18, opacity: kep(a * 3)}}>
                  <Bi mau={neon(m)} r={r} />
                </div>
              );
            })
          : (
            <div style={{position: 'absolute', left: 0, right: 0, top: H * 0.45, display: 'flex', justifyContent: 'center', gap: 16, opacity: kep((st.vao - 0.4) * 2)}}>
              {v.nhom.map((g, i) => (
                <div key={i} style={{display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT_DAM, fontWeight: 900, fontSize: 40 * v.co, color: '#fff'}}>
                  <Bi mau={neon(g.mau)} r={r} />×{g.so}
                </div>
              ))}
            </div>
          )}
        {daLay.map((d) => {
          const tu = tui ? {x: W / 2, y: H * 0.15} : viTri(d.idx);
          const den = khay(d.k);
          const p = easeInOut(d.p);
          if (d.p <= 0) return null;
          const x = lerp(tu.x, den.x, p);
          const y = lerp(tu.y, den.y, p) - Math.sin(p * Math.PI) * 170;
          return (
            <div key={`l${d.k}`} style={{position: 'absolute', left: x - r * 1.15, top: y - r * 1.15, transform: `scale(${1 + 0.15 * p})`}}>
              <Bi mau={neon(tat[d.idx])} r={r * 1.15} sang={p} />
            </div>
          );
        })}
      </div>
      <Nhan chu={v.nhan} />
    </div>
  );
};

/* ---------------- HỘP QUÀ ---------------- */
const HopQua: Ve = (v, st) => {
  const W = 280 * v.co;
  const H = 244 * v.co;
  const q = st.quay < 0 ? 0 : easeOut(st.quay);
  const mau = neon(v.mau, neon('cam'));
  const r = ngauNhien(bamChuoi(v.id));
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      <div style={{position: 'relative', width: W, height: H + 60}}>
        {/* tia lấp lánh */}
        {q > 0 && q < 1
          ? Array.from({length: 10}, (_, i) => {
              const g = (i / 10) * Math.PI * 2 + r();
              const d = 40 + q * 170;
              return <div key={i} style={{position: 'absolute', left: W / 2 + Math.cos(g) * d - 6, top: 60 + Math.sin(g) * d * 0.7 - 6, width: 12, height: 12, borderRadius: 6, background: i % 2 ? '#FFD54A' : mau, opacity: 1 - q, boxShadow: `0 0 12px ${mau}`}} />;
            })
          : null}
        {/* phần quà hiện lên */}
        {q > 0 ? (
          <div style={{position: 'absolute', left: 0, right: 0, top: 70 - q * 150, display: 'flex', justifyContent: 'center', opacity: q, transform: `scale(${popOut(q)})`}}>
            <div style={{fontFamily: FONT_DAM, fontWeight: 900, fontSize: 58 * v.co, color: '#FFD54A', textShadow: `0 0 18px ${mau}`, whiteSpace: 'nowrap'}}>{v.emoji ? v.emoji + ' ' : ''}{tc(st.giaTriChu || st.noiDung)}</div>
          </div>
        ) : null}
        <svg width={W} height={H} viewBox="0 0 230 200" style={{position: 'absolute', top: 60, overflow: 'visible', filter: phatSang(mau, 8 + 8 * st.sang)}}>
          <rect x={20} y={70} width={190} height={125} rx={12} fill={NEN_VAT_2} stroke={mau} strokeWidth={6} />
          <rect x={102} y={70} width={26} height={125} fill={mau} opacity={0.85} />
          <g transform={`translate(${q * 150} ${-q * 120}) rotate(${q * 35} 115 60)`}>
            <rect x={8} y={44} width={214} height={36} rx={10} fill={NEN_VAT_2} stroke={mau} strokeWidth={6} />
            <rect x={102} y={44} width={26} height={36} fill={mau} opacity={0.85} />
            <path d="M115 44 C 80 0, 60 30, 112 44 M115 44 C 150 0, 170 30, 118 44" stroke={mau} strokeWidth={7} fill="none" strokeLinecap="round" />
          </g>
        </svg>
      </div>
      <Nhan chu={v.nhan} />
    </div>
  );
};

/* ---------------- ĐỒNG HỒ ---------------- */
const DongHo: Ve = (v, st) => {
  const R = 150 * v.co;
  const mau = neon(v.mau, neon('xanh_la'));
  const q = st.quay < 0 ? 0 : st.quay;
  const phut = 60 + easeInOut(q) * 360 * 3 + st.t * 6;
  const gio = 300 + easeInOut(q) * 90 + st.t * 0.5;
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      <svg width={R * 2 + 20} height={R * 2 + 20} viewBox="-130 -130 260 260" style={{overflow: 'visible', filter: phatSang(mau, 12 + 10 * st.sang)}}>
        <circle r={118} fill={NEN_VAT} stroke={mau} strokeWidth={9} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - easeOut(st.vao)} />
        {Array.from({length: 12}, (_, i) => {
          const g = (i / 12) * Math.PI * 2;
          return <line key={i} x1={Math.sin(g) * 96} y1={-Math.cos(g) * 96} x2={Math.sin(g) * (i % 3 ? 104 : 88)} y2={-Math.cos(g) * (i % 3 ? 104 : 88)} stroke="#fff" strokeOpacity={0.8} strokeWidth={i % 3 ? 4 : 7} strokeLinecap="round" />;
        })}
        <line x1={0} y1={0} x2={Math.sin((gio * Math.PI) / 180) * 52} y2={-Math.cos((gio * Math.PI) / 180) * 52} stroke="#fff" strokeWidth={10} strokeLinecap="round" />
        <line x1={0} y1={0} x2={Math.sin((phut * Math.PI) / 180) * 82} y2={-Math.cos((phut * Math.PI) / 180) * 82} stroke={mau} strokeWidth={7} strokeLinecap="round" />
        <circle r={10} fill="#fff" />
      </svg>
      <Nhan chu={st.giaTriChu || v.nhan} />
    </div>
  );
};

/* ---------------- ĐIỆN THOẠI ---------------- */
const DienThoai: Ve = (v, st) => {
  const W = 360 * v.co;
  const H = 640 * v.co;
  const mau = neon(v.mau, neon('xanh_la'));
  return (
    <div style={{position: 'relative', width: W, height: H, borderRadius: 44 * v.co, border: `6px solid ${mau}`, background: '#081312', boxShadow: `0 0 22px ${mau}`, padding: 22 * v.co, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 14, fontFamily: FONT, color: '#fff'}}>
      <div style={{alignSelf: 'center', width: W * 0.3, height: 10, borderRadius: 5, background: '#26403c'}} />
      {st.noiDung ? <div style={{fontWeight: 900, fontSize: Math.max(34 * KC, 32 * v.co), textAlign: 'center', marginTop: 6}}>{tc(st.noiDung)}</div> : null}
      {v.ds.map((d, k) => {
        const a = kep((st.t - st.ta - 0.3 - k * 0.35) / 0.4);
        const s = phanTu(st, k + 1, '#2E4B47');
        return (
          <div key={k} style={{position: 'relative', opacity: kep(a * 2) * Math.max(0.35, s.mo), transform: `translateX(${(1 - easeOut(a)) * (k % 2 ? 60 : -60)}px) scale(${1 + 0.05 * s.pc})`, background: s.pc > 0.01 ? s.mau + '33' : '#13241f', border: `3px solid ${s.pc > 0.01 ? s.mau : '#2E4B47'}`, borderRadius: 18, padding: '10px 14px', fontWeight: 800, fontSize: 28 * v.co}}>
            {d}
            <DauTich p={s.pc} mau={s.mau} co={36} style={{right: -12, top: -12}} />
          </div>
        );
      })}
      {st.giaTriChu ? <div style={{marginTop: 'auto', alignSelf: 'center', background: mau, color: '#06231a', fontWeight: 900, fontSize: Math.max(34 * KC, 30 * v.co), padding: '8px 26px', borderRadius: 14}}>{tc(st.giaTriChu)}</div> : null}
    </div>
  );
};

/* ---------------- BÓNG BAY ---------------- */
const BongBay: Ve = (v, st, frame) => {
  const mau = neon(v.mau, neon('cam'));
  const k = 0.55 + 0.75 * st.giaTri;
  const R = 130 * v.co * k;
  const lac = Math.sin(frame / 18) * 4;
  return (
    <div style={{position: 'relative', width: 260 * v.co * 1.4, height: 420 * v.co, display: 'flex', justifyContent: 'center'}}>
      <svg width={260 * v.co * 1.4} height={420 * v.co} viewBox="-130 -60 260 420" style={{overflow: 'visible', transform: `rotate(${lac}deg)`, transformOrigin: '50% 100%'}}>
        <defs>
          <radialGradient id={`bb${v.id}`} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#fff" stopOpacity={0.8} />
            <stop offset="35%" stopColor={mau} />
            <stop offset="100%" stopColor={mau} stopOpacity={0.75} />
          </radialGradient>
        </defs>
        <path d={`M0 ${R * 1.2 + 40} C 30 ${R * 1.2 + 100}, -30 ${R * 1.2 + 160}, 0 340`} stroke="#ddd" strokeWidth={3} fill="none" />
        <ellipse cx={0} cy={60} rx={R} ry={R * 1.2} fill={`url(#bb${v.id})`} style={{filter: phatSang(mau, 14)}} />
        <path d={`M-10 ${60 + R * 1.2} L10 ${60 + R * 1.2} L0 ${60 + R * 1.2 + 14} Z`} fill={mau} />
        <text x={0} y={72} textAnchor="middle" fontFamily="Liberation Sans, sans-serif" fontWeight={900} fontSize={Math.max(30, R * 0.36)} fill="#fff">{tc(st.giaTriChu || v.nhan)}</text>
      </svg>
    </div>
  );
};

/* ---------------- ĐỒNG HỒ ĐO XÁC SUẤT ---------------- */
const DongHoDo: Ve = (v, st) => {
  const R = 210 * v.co;
  const val = st.giaTri * easeInOut(kep((st.t - st.ta - 0.2) / 1.0));
  const g = Math.PI * (1 - val);
  const mau = val < 0.33 ? NEON_DO : val < 0.66 ? '#FFD54A' : neon('xanh_la');
  const cung = (a0: number, a1: number, r: number) => `M${Math.cos(Math.PI * (1 - a0)) * r} ${-Math.sin(Math.PI * (1 - a0)) * r} A${r} ${r} 0 0 1 ${Math.cos(Math.PI * (1 - a1)) * r} ${-Math.sin(Math.PI * (1 - a1)) * r}`;
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      {v.nhan ? <div style={{fontFamily: FONT_DAM, fontWeight: 900, fontSize: 46 * KC, color: '#fff', marginBottom: 6, textAlign: 'center'}}>{v.nhan}</div> : null}
      <svg width={R * 2 + 60} height={R + 70} viewBox={`${-R - 30} ${-R - 20} ${2 * R + 60} ${R + 70}`} style={{overflow: 'visible'}}>
        <defs>
          <linearGradient id={`dh${v.id}`} x1="0" x2="1">
            <stop offset="0%" stopColor={NEON_DO} />
            <stop offset="50%" stopColor="#FFD54A" />
            <stop offset="100%" stopColor="#3BF29A" />
          </linearGradient>
        </defs>
        <path d={cung(0, 1, R)} stroke="#203431" strokeWidth={26} fill="none" strokeLinecap="round" />
        <path d={cung(0, Math.max(0.001, val), R)} stroke={`url(#dh${v.id})`} strokeWidth={26} fill="none" strokeLinecap="round" style={{filter: phatSang(mau, 10)}} />
        <line x1={0} y1={0} x2={Math.cos(g) * (R - 30)} y2={-Math.sin(g) * (R - 30)} stroke="#fff" strokeWidth={9} strokeLinecap="round" />
        <circle r={16} fill="#fff" />
        <text x={-R} y={40} textAnchor="middle" fill="#9fb3b0" fontFamily="Liberation Sans, sans-serif" fontWeight={800} fontSize={30}>0</text>
        <text x={R} y={40} textAnchor="middle" fill="#9fb3b0" fontFamily="Liberation Sans, sans-serif" fontWeight={800} fontSize={30}>1</text>
      </svg>
      <div style={{fontFamily: FONT_DAM, fontWeight: 900, fontSize: Math.max(64 * v.co, 60 * KC), color: mau, textShadow: `0 0 16px ${mau}`, marginTop: -14}}>{tc(st.giaTriChu) || `${Math.round(val * 100)}%`}</div>
    </div>
  );
};
const NEON_DO = '#FF5C61';

/* ---------------- BIỂU ĐỒ CỘT ---------------- */
const BieuDoCot: Ve = (v, st) => {
  const n = v.dsSo.length;
  const W = Math.min(900, 220 * n) * v.co;
  const H = 420 * v.co;
  const max = Math.max(...v.dsSo, 1e-9);
  const bw = (W / n) * 0.6;
  const goc = neon(v.mau, neon('xanh_la'));
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      <div style={{position: 'relative', width: W, height: H, borderBottom: '4px solid rgba(255,255,255,0.6)'}}>
        {v.dsSo.map((x, k) => {
          const a = easeOut(kep((st.t - st.ta - 0.15 - k * 0.2) / 0.7));
          const s = phanTu(st, k + 1, goc);
          const h = (x / max) * (H - 60) * a;
          return (
            <div key={k} style={{position: 'absolute', left: (k + 0.5) * (W / n) - bw / 2, bottom: 0, width: bw, height: h, background: `linear-gradient(180deg, ${s.mau}, ${s.mau}55)`, border: `3px solid ${s.mau}`, borderBottom: 'none', borderRadius: '10px 10px 0 0', boxShadow: `0 0 ${10 + 16 * s.pc}px ${s.mau}`, opacity: s.mo}}>
              <div style={{position: 'absolute', top: -58 * KC, left: -40, right: -40, textAlign: 'center', fontFamily: FONT_DAM, fontWeight: 900, fontSize: Math.min(42 * KC, (W / n) / (0.62 * Math.max(2, String(Number.isInteger(x) ? x : x.toFixed(2)).length))), color: '#fff', opacity: a, textShadow: '0 2px 10px rgba(0,0,0,0.8)', whiteSpace: 'nowrap'}}>{Number.isInteger(x) ? x : x.toFixed(2)}</div>
            </div>
          );
        })}
      </div>
      <div style={{display: 'flex', width: W}}>
        {v.dsSo.map((_, k) => (
          <div key={k} style={{flex: 1, textAlign: 'center', fontFamily: FONT_DAM, fontWeight: 800, fontSize: 36 * KC, color: '#e6fff7', marginTop: 10, lineHeight: 1.1, padding: '0 4px'}}>{v.ds[k] || ''}</div>
        ))}
      </div>
      <Nhan chu={v.nhan} />
    </div>
  );
};

/* ---------------- THANH XÁC SUẤT ---------------- */
const Thanh: Ve = (v, st) => {
  const W = 760 * v.co;
  const mau = neon(v.mau, neon('cam'));
  const val = st.giaTri * easeInOut(kep((st.t - st.ta - 0.2) / 0.9));
  return (
    <div style={{width: W, fontFamily: FONT, color: '#fff'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, fontWeight: 900, fontSize: 42 * KC, marginBottom: 10, textShadow: '0 2px 10px rgba(0,0,0,0.8)'}}>
        <span>{v.nhan}</span>
        <span style={{color: mau}}>{tc(st.giaTriChu)}</span>
      </div>
      <div style={{position: 'relative', height: 56 * v.co, borderRadius: 30, border: `4px solid ${mau}`, background: '#0c1a19', overflow: 'hidden', boxShadow: `0 0 16px ${mau}66`}}>
        <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${val * 100}%`, background: `linear-gradient(90deg, ${mau}88, ${mau})`, borderRadius: 30, boxShadow: `0 0 20px ${mau}`}} />
      </div>
    </div>
  );
};

/* ---------------- VÒNG QUAY MAY MẮN ---------------- */
const VongQuay: Ve = (v, st) => {
  const n = v.ds.length;
  const R = 240 * v.co;
  const k = (v.ketQua[0] || 1) - 1;
  const dich = 360 * 5 + (360 - (k + 0.5) * (360 / n));
  const q = st.quay < 0 ? 0 : st.quay;
  const goc = (1 - Math.pow(1 - q, 3.2)) * dich + (st.quay < 0 ? st.t * 8 : 0);
  const xong = st.quay >= 1;
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      <div style={{position: 'relative', width: R * 2 + 30, height: R * 2 + 50}}>
        <svg width={R * 2 + 30} height={R * 2 + 30} viewBox="-115 -115 230 230" style={{position: 'absolute', top: 20, overflow: 'visible', filter: phatSang(neon('xanh_la'), 10)}}>
          <g transform={`rotate(${goc})`}>
            {v.ds.map((d, i) => {
              const a0 = (i / n) * Math.PI * 2 - Math.PI / 2;
              const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
              const am = (a0 + a1) / 2;
              const mau = neon(VONG_MAU[i % VONG_MAU.length]);
              const sang = xong && i === k;
              return (
                <g key={i}>
                  <path d={`M0 0 L${Math.cos(a0) * 104} ${Math.sin(a0) * 104} A104 104 0 0 1 ${Math.cos(a1) * 104} ${Math.sin(a1) * 104} Z`} fill={sang ? mau : mau + '55'} stroke="#0b1514" strokeWidth={2} />
                  <text x={Math.cos(am) * 68} y={Math.sin(am) * 68 + 6} textAnchor="middle" fontFamily="Liberation Sans, sans-serif" fontWeight={900} fontSize={Math.max(n > 8 ? 15 : 20, ((n > 8 ? 30 : 36) * KC) / ((R * 2 + 30) / 230))} fill="#fff" transform={`rotate(${(am * 180) / Math.PI + 90} ${Math.cos(am) * 68} ${Math.sin(am) * 68})`}>{d}</text>
                </g>
              );
            })}
          </g>
          <circle r={104} fill="none" stroke={neon('xanh_la')} strokeWidth={5} />
          <circle r={14} fill="#fff" />
        </svg>
        <svg width={50} height={50} viewBox="0 0 50 50" style={{position: 'absolute', left: R + 15 - 25, top: 0, filter: phatSang('#FFD54A', 6)}}>
          <path d="M5 4 L45 4 L25 44 Z" fill="#FFD54A" stroke="#7a5a00" strokeWidth={3} />
        </svg>
      </div>
      <Nhan chu={v.nhan} />
    </div>
  );
};

/* ---------------- CỬA ---------------- */
const Cua: Ve = (v, st) => {
  const n = v.soLuong;
  const w = Math.min(230, 880 / n - 26) * v.co;
  const h = w * 1.5;
  const goc = neon(v.mau, neon('cam'));
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      <div style={{display: 'flex', gap: 26}}>
        {Array.from({length: n}, (_, k) => {
          const a = vaoLanLuot(st, k, n);
          const s = phanTu(st, k + 1, goc);
          const mo = st.mo.get(k + 1) || 0;
          return (
            <div key={k} style={{position: 'relative', width: w, height: h, opacity: kep(a * 2) * Math.max(0.4, s.mo), transform: `scale(${popOut(a) * (1 + 0.06 * s.pc)})`, perspective: 800}}>
              <div style={{position: 'absolute', inset: 0, borderRadius: 12, background: '#081312', border: `4px solid ${s.mau}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_DAM, fontWeight: 900, fontSize: w * 0.3, color: '#FFD54A', textShadow: '0 0 14px #FFB300'}}>
                {mo > 0.3 ? v.ds[k] || '' : ''}
              </div>
              <div style={{position: 'absolute', inset: 0, borderRadius: 12, background: `linear-gradient(160deg, ${NEN_VAT_2}, ${NEN_VAT})`, border: `5px solid ${s.mau}`, boxShadow: `0 0 ${10 + 16 * s.pc}px ${s.mau}`, transformOrigin: '0% 50%', transform: `rotateY(${-mo * 78}deg)`, opacity: 1 - 0.75 * mo, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_DAM, fontWeight: 900, fontSize: w * 0.42, color: s.mau}}>
                <div style={{position: 'absolute', left: w * 0.12, right: w * 0.12, top: h * 0.08, height: h * 0.36, border: `3px solid ${s.mau}66`, borderRadius: 8}} />
                <div style={{position: 'absolute', left: w * 0.12, right: w * 0.12, bottom: h * 0.08, height: h * 0.36, border: `3px solid ${s.mau}66`, borderRadius: 8}} />
                <span style={{position: 'relative', textShadow: `0 0 18px ${s.mau}`}}>{k + 1}</span>
                <div style={{position: 'absolute', right: w * 0.1, top: h * 0.5, width: 16, height: 16, borderRadius: 8, background: s.mau, boxShadow: `0 0 10px ${s.mau}`}} />
              </div>
              <DauTich p={s.pc} mau={s.mau} style={{right: -14, top: -14}} />
            </div>
          );
        })}
      </div>
      <Nhan chu={v.nhan} />
    </div>
  );
};

/* ---------------- BÁNH CHIA PHẦN ---------------- */
const Banh: Ve = (v, st) => {
  const n = v.soLuong;
  const R = 210 * v.co;
  const goc = neon(v.mau, neon('cam'));
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      <svg width={R * 2 + 40} height={R * 2 + 40} viewBox="-120 -120 240 240" style={{overflow: 'visible'}}>
        {Array.from({length: n}, (_, i) => {
          const a = vaoLanLuot(st, i, n);
          const s = phanTu(st, i + 1, goc);
          const a0 = (i / n) * Math.PI * 2 - Math.PI / 2;
          const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
          const am = (a0 + a1) / 2;
          const ra = 10 * s.pc;
          return (
            <g key={i} transform={`translate(${Math.cos(am) * ra} ${Math.sin(am) * ra}) scale(${popOut(a)})`} opacity={kep(a * 2)}>
              <path d={`M0 0 L${Math.cos(a0) * 100} ${Math.sin(a0) * 100} A100 100 0 0 1 ${Math.cos(a1) * 100} ${Math.sin(a1) * 100} Z`} fill={s.pc > 0.01 ? s.mau : NEN_VAT_2} stroke={s.mau} strokeWidth={3} style={{filter: s.pc > 0.01 ? phatSang(s.mau, 8) : 'none'}} />
              {v.ds[i] ? <text x={Math.cos(am) * 62} y={Math.sin(am) * 62 + 8} textAnchor="middle" fontFamily="Liberation Sans, sans-serif" fontWeight={900} fontSize={Math.max(n > 6 ? 17 : 23, (40 * KC) / ((R * 2 + 40) / 240))} fill="#fff" stroke="rgba(0,0,0,0.55)" strokeWidth={3} paintOrder="stroke">{v.ds[i]}</text> : null}
            </g>
          );
        })}
      </svg>
      <Nhan chu={st.giaTriChu ? `${v.nhan} ${st.giaTriChu}`.trim() : v.nhan} />
    </div>
  );
};

/* ---------------- NHÃN NEON (chữ hai màu, nghiêng nhẹ) ---------------- */
// nhãn neon: ký hiệu toán (u_n, S_n = 260, \frac...) hiện bằng công thức thật (không còn "S_n" thô);
// chữ dài thì XUỐNG DÒNG thay vì thu nhỏ đến mức không đọc được.
export const laToanNhan = (s: string) => /[_^\\]|\d\s*[=+×·*/]\s*\d|^\s*[A-Za-z](_\{?\w+\}?)?\s*=/.test(s);
// chữ thường trong nhãn toán (KaTeX bỏ dấu cách): bọc từng từ có chữ cái tiếng Việt / từ dài vào \text{}
const texNhan = (s: string) => s.split(/\s+/).filter(Boolean).map((w) => (/[À-ỹà-ỹ]/.test(w) || /^[A-Za-z]{3,}[,.:]?$/.test(w) ? `\\text{${w}}` : w)).join('\\ ');
export const NhanNeon: React.FC<{chu: string; tuKhoa: string; mau: string; mauNhan: string; co?: number; xoay?: number}> = ({chu, tuKhoa, mau, mauNhan, co = 44, xoay = 0}) => {
  const toan = laToanNhan(chu);
  const dai = chu.replace(/\\[a-zA-Z]+|[{}_^]/g, '').length > 18;
  return (
    <div style={{transform: xoay ? `rotate(${xoay}deg)` : undefined, border: `2.5px solid ${mau}cc`, borderRadius: 16, background: 'rgba(8,16,22,0.86)', backdropFilter: 'blur(6px)',
      boxShadow: `0 6px 18px rgba(0,0,0,0.45), 0 0 10px ${mau}55`, padding: `${co * 0.2}px ${co * 0.5}px`,
      fontFamily: FONT_DAM, fontWeight: 900, fontSize: co, color: '#fff', textTransform: toan ? 'none' : 'uppercase', whiteSpace: dai ? 'normal' : 'nowrap', maxWidth: dai ? 760 : undefined, textAlign: 'center', lineHeight: 1.15, letterSpacing: 0.5}}>
      {toan ? <Toan tex={texNhan(chu)} size={co * 1.05} color="#ffffff" maxWidth={720} /> : <ChuNhanMau chu={chu} tuKhoa={tuKhoa} mau={mauNhan} />}
    </div>
  );
};
const kepCo = (c: number) => Math.max(0.85, Math.min(1.2, c || 1));
const NhanSan: React.FC<{v: Parameters<Ve>[0]; chu: string}> = ({v, chu}) => {
  const k = React.useContext(CoChuSan);
  const dai = chu.replace(/\\[a-zA-Z]+|[{}_^]/g, '').length;
  const co = Math.max(34, 46 * kepCo(v.co) * (dai > 18 ? 0.86 : 1)) * k;
  return <NhanNeon chu={chu} tuKhoa={v.tuKhoa} mau={neon(v.mau, neon('xanh_la'))} mauNhan={neon('cam')} co={co} xoay={v.xoay || 0} />;
};
const NhanVat: Ve = (v, st) => <NhanSan v={v} chu={st.noiDung} />;

const ChuSan: React.FC<{v: Parameters<Ve>[0]; tex: string}> = ({v, tex}) => {
  const k = React.useContext(CoChuSan);
  return (
    <div style={{textAlign: 'center'}}>
      <Toan tex={tex} size={52 * kepCo(v.co) * k} color={neon(v.mau, '#ffffff')} maxWidth={900} />
    </div>
  );
};
const Chu: Ve = (v, st) => <ChuSan v={v} tex={st.noiDung} />;

// một cột chữ số lăn dọc (kiểu đồng hồ công-tơ-mét): g là giá trị đang chạy, k là hàng (0 = hàng đơn vị)
const CotSo: React.FC<{g: number; k: number; h: number}> = ({g, k, h}) => {
  const p10 = Math.pow(10, k);
  const nguyen = Math.floor(g / p10);
  let vt = nguyen % 10;
  const du = g - nguyen * p10; // phần lẻ của các hàng thấp hơn
  if (k === 0) vt = (g % 10);
  else if (du > p10 - 1) vt = (nguyen % 10) + (du - (p10 - 1));
  return (
    // cột hẹp theo chữ số đang hiện khi đã dừng (chữ số "1" hẹp không để lại khoảng trống như "1 2.000")
    <span style={{display: 'inline-block', height: h, overflow: 'hidden', verticalAlign: 'top', width: Math.abs(vt - Math.round(vt)) < 0.02 && Math.round(vt) % 10 === 1 ? '0.62em' : undefined}}>
      <span style={{display: 'flex', flexDirection: 'column', transform: `translateY(${-vt * h}px)`}}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d, i) => (
          <span key={i} style={{height: h, lineHeight: `${h}px`, textAlign: 'center'}}>{d}</span>
        ))}
      </span>
    </span>
  );
};
// số thập phân (37,4 m): lăn số đã nhân 10^tp rồi chèn dấu phẩy - trước đây chữ số cuối dừng lưng chừng giữa 7 và 8
const soThapPhan = (x: number) => { const m = /\.(\d+)/.exec(String(Math.round(x * 100) / 100)); return m ? Math.min(2, m[1].length) : 0; };
const SoLan: React.FC<{g: number; co: number; dich?: number}> = ({g, co, dich}) => {
  const tp = soThapPhan(dich ?? g);
  const G = Math.max(0, g) * Math.pow(10, tp);
  const n = Math.max(1 + tp, String(Math.round(G)).length);
  const h = co * 1.12;
  const cot = [];
  for (let k = n - 1; k >= 0; k--) {
    cot.push(<CotSo key={k} g={tp ? Math.round(G * 1000) / 1000 : G} k={k} h={h} />);
    if (tp && k === tp) cot.push(<span key={`p${k}`} style={{lineHeight: `${h}px`}}>,</span>);
    // số từ 10.000 trở lên: chấm ngăn hàng nghìn kiểu Việt ("12.000" thay vì "12000" dễ đọc nhầm)
    else if (n - tp >= 5 && k > tp && (k - tp) % 3 === 0) cot.push(<span key={`n${k}`} style={{lineHeight: `${h}px`}}>.</span>);
  }
  // số các bánh số ĐANG chỉ (máy kiểm duyệt đọc để đối chiếu với đáp án đã kiểm chứng)
  const hien = tp ? (Math.round(G) / Math.pow(10, tp)).toFixed(tp).replace('.', ',') : String(Math.round(G));
  return <span data-kd-so={hien} style={{display: 'inline-flex', fontVariantNumeric: 'tabular-nums'}}>{cot}</span>;
};

const SoDem: Ve = (v, st) => {
  const mau = neon(v.mau, neon('xanh_la'));
  const g = st.giaTri;
  if (v.kieu === 'vien') {
    // huy hiệu viên thuốc vàng như video mẫu ("75 Skill"): số lăn + chữ nhỏ bên cạnh
    return (
      <div style={{display: 'flex', alignItems: 'baseline', gap: 10, padding: `${10 * v.co}px ${28 * v.co}px`, borderRadius: 60, background: 'linear-gradient(180deg, #FFE27A, #F7C531)', border: '4px solid #FFF3C4', boxShadow: '0 8px 28px rgba(247,197,49,0.45)', fontFamily: FONT, color: '#2a1d00'}}>
        <span style={{fontWeight: 900, fontSize: 84 * v.co, lineHeight: 1}}><SoLan g={g} co={84 * v.co} dich={v.giaTri} /></span>
        <span style={{fontWeight: 800, fontSize: Math.max(40 * v.co, 40 * KC)}}>{v.nhan || tc(st.noiDung)}</span>
      </div>
    );
  }
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: FONT, color: '#fff'}}>
      {st.noiDung ? <div style={{fontWeight: 800, fontSize: Math.max(42 * v.co, 42 * KC), opacity: 0.92, textAlign: 'center'}}>{tc(st.noiDung)}</div> : null}
      <div style={{fontWeight: 900, fontSize: 150 * v.co, lineHeight: 1.05, color: mau, textShadow: `0 0 22px ${mau}`}}><SoLan g={g} co={150 * v.co} dich={v.giaTri} /></div>
      <Nhan chu={v.nhan} />
    </div>
  );
};

/* ---------------- LƯỚI Ô (không gian mẫu): các ô lấp đầy lần lượt, ô thuận lợi sáng màu ---------------- */
const LuoiO: Ve = (v, st) => {
  const n = v.soLuong;
  const cot = v.soCot || Math.min(12, Math.ceil(Math.sqrt(n * 1.6)));
  const hang = Math.ceil(n / cot);
  const o = Math.min(860 / cot, 560 / hang) * v.co - 8;
  const goc = neon(v.mau, neon('xanh_duong'));
  const tong = Math.min(1.4, 0.03 * n + 0.3);
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      <div style={{display: 'grid', gridTemplateColumns: `repeat(${cot}, ${o}px)`, gap: 8}}>
        {Array.from({length: n}, (_, k) => {
          const a = kep((st.t - st.ta - (k / n) * tong) / 0.25);
          const s = phanTu(st, k + 1, goc);
          const sang = s.pc > 0.01;
          return (
            <div key={k} style={{width: o, height: o, borderRadius: o * 0.2, opacity: kep(a * 2) * Math.max(0.35, s.mo), transform: `scale(${popOut(a, 2.2) * (1 + 0.1 * s.pc)})`,
              background: sang ? s.mau : `${goc}2a`, border: `3px solid ${sang ? '#fff' : goc + 'aa'}`, boxShadow: sang ? `0 0 ${14 * s.pc}px ${s.mau}` : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_DAM, fontWeight: 900, fontSize: o * 0.34, color: sang ? '#0b1a14' : '#fff'}}>
              {v.ds[k] || ''}
            </div>
          );
        })}
      </div>
      <Nhan chu={st.giaTriChu ? `${v.nhan} ${st.giaTriChu}`.trim() : v.nhan} />
    </div>
  );
};

/* ---------------- THẺ DANH SÁCH: thẻ kính tối viền neon (hợp tông video), chữ to tự xuống dòng; dòng trượt vào kèm nhòe,
   dòng được chọn sáng dải màu quét ngang + dấu tích, dòng bị loại mờ đi + nét gạch đỏ viết tay ---------------- */
const DanhSach: Ve = (v, st) => {
  const b = boCucDanhSach(v, KC);
  const nhan = GIAO_DIEN.nhan || '#3BF29A';
  return (
    <div style={{position: 'relative', width: b.W, boxSizing: 'border-box', borderRadius: 28, background: 'linear-gradient(160deg, rgba(16,40,44,0.94), rgba(6,16,20,0.94))', border: `3px solid ${nhan}aa`,
      boxShadow: `0 20px 60px rgba(0,0,0,0.55), 0 0 26px ${nhan}44, inset 0 0 30px ${nhan}14`, padding: b.pad, fontFamily: FONT_DAM, color: '#fff', textAlign: 'left'}}>
      {st.noiDung ? (
        <div style={{display: 'flex', alignItems: 'center', gap: 12, fontWeight: 900, fontSize: b.coTieuDe, color: nhan, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, textShadow: `0 0 14px ${nhan}88`}}>
          <span style={{width: 10, height: b.coTieuDe * 0.9, borderRadius: 5, background: nhan, boxShadow: `0 0 10px ${nhan}`, flexShrink: 0}} />
          {tc(st.noiDung)}
        </div>
      ) : null}
      {v.ds.map((d, k) => {
        const a = kep((st.t - st.ta - 0.15 - k * 0.22) / 0.4);
        const c = st.chon.get(k + 1);
        const l = st.loai.get(k + 1) || 0;
        const quet = c ? easeOut(c.p) : 0;
        const mauChon = c ? (c.mau === 'xanh_la' ? '#3BF29A' : c.mau === 'do' ? '#FF5C61' : '#FFD54A') : nhan;
        return (
          <div key={k} style={{position: 'relative', display: 'flex', alignItems: 'center', gap: 18, padding: '12px 14px', borderRadius: 16, marginTop: 8, overflow: 'hidden',
            opacity: kep(a * 2) * (1 - 0.6 * l), transform: `translateX(${(1 - easeOut(a)) * -70}px)`, filter: a < 0.98 ? `blur(${(1 - a) * 6}px)` : undefined,
            background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.07)'}}>
            <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${quet * 100}%`, background: `linear-gradient(90deg, ${mauChon}55, ${mauChon}22)`, borderRadius: 16}} />
            {c ? <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, background: mauChon, boxShadow: `0 0 12px ${mauChon}`, opacity: quet}} /> : null}
            <div style={{position: 'relative', flexShrink: 0, width: b.huy, height: b.huy, borderRadius: '50%', border: `3px solid ${c ? mauChon : nhan}`, background: 'rgba(0,0,0,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: b.huy * 0.5, color: c ? mauChon : nhan, boxShadow: `0 0 12px ${c ? mauChon : nhan}66`}}>{k + 1}</div>
            <div style={{position: 'relative', flex: 1, fontWeight: 800, fontSize: b.co, lineHeight: 1.22, textShadow: '0 2px 8px rgba(0,0,0,0.6)'}}>
              {laToanNhan(d) ? <Toan tex={texNhan(d)} size={b.co} color="#ffffff" maxWidth={b.W - b.pad * 2 - b.huy - 90} /> : d}
              {l > 0 ? <span style={{position: 'absolute', left: -8, right: -8, top: '18%', bottom: '18%'}}><GachTay w={0} h={0} p={l} /></span> : null}
            </div>
            {c ? <DauTich p={c.p} mau={mauChon} co={44} style={{position: 'relative', flexShrink: 0}} /> : <div style={{width: 44, flexShrink: 0}} />}
          </div>
        );
      })}
    </div>
  );
};

const BieuTuong: Ve = (v, st, frame) => (
  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
    <div style={{display: 'flex', gap: 14}}>
      {Array.from({length: v.soLuong}, (_, k) => {
        const a = vaoLanLuot(st, k, v.soLuong);
        const s = phanTu(st, k + 1, '#fff');
        return (
          <div key={k} style={{fontSize: 140 * v.co, lineHeight: 1, opacity: kep(a * 2) * s.mo, transform: `translateY(${Math.sin(frame / 14 + k) * 5}px) scale(${popOut(a) * (1 + 0.12 * s.pc)})`, filter: `drop-shadow(0 0 ${8 + 14 * s.pc}px ${s.pc > 0.01 ? s.mau : 'rgba(255,255,255,0.35)'})${s.xam ? ' grayscale(1)' : ''}`}}>
            {v.emoji}
          </div>
        );
      })}
    </div>
    <Nhan chu={v.nhan} />
  </div>
);

/* ---------------- ẢNH THẬT CỦA SẢN PHẨM: khung bo góc nền sáng, viền phát sáng màu nhấn, nổi nhẹ, vệt sáng lướt qua ----------------
   anh: số thứ tự ảnh (chuanbi.py đổi thành src). gia_tri_chu: nhãn giá dán góc ("249.000đ"). nhan: dòng chữ dưới ảnh. */
const AnhThat: Ve = (v, st, frame) => {
  const goc = neon(v.mau, GIAO_DIEN.nhan || neon('vang'));
  const S = 420;
  const t = frame / 30;
  const noi = Math.sin(t * 1.6) * 5;
  const vet = ((t - st.ta) * 0.55) % 1.6;
  const chon = Math.max(st.chonCa, st.coChon);
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      <div style={{position: 'relative', width: S, height: S, transform: `translateY(${noi}px)`}}>
        <div style={{position: 'absolute', inset: 0, borderRadius: 36, overflow: 'hidden', background: 'radial-gradient(circle at 50% 38%, #ffffff 0%, #eef2f5 62%, #d9e0e6 100%)',
          boxShadow: `0 0 0 ${4 + chon * 3}px ${goc}, 0 0 ${34 + chon * 26}px ${goc}99, 0 26px 54px rgba(0,0,0,0.55)`}}>
          {v.anhSrc ? (
            <Img src={staticFile(v.anhSrc)} style={{position: 'absolute', inset: 14, width: S - 28, height: S - 28, objectFit: 'contain', transform: `scale(${1 + 0.025 * Math.sin(t * 0.9)})`}} />
          ) : (
            <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 30, fontFamily: FONT_DAM, fontWeight: 900, fontSize: 40, color: '#1b2a33'}}>🛍 {tc(v.noiDung || v.nhan || 'Sản phẩm')}</div>
          )}
          {vet < 1 ? <div style={{position: 'absolute', top: -40, bottom: -40, width: 90, left: lerp(-140, S + 60, vet), transform: 'rotate(18deg)', background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.55), rgba(255,255,255,0))'}} /> : null}
        </div>
        {v.giaTriChu ? (
          <div style={{position: 'absolute', right: -26, top: -22, transform: `rotate(10deg) scale(${popOut(kep((st.t - st.ta - 0.35) / 0.4), 2)})`, background: goc, color: '#0b1418', fontFamily: FONT_DAM, fontWeight: 900,
            fontSize: 38 * KC, padding: '8px 20px', borderRadius: 18, boxShadow: `0 0 22px ${goc}`, whiteSpace: 'nowrap'}}>{tc(v.giaTriChu)}</div>
        ) : null}
      </div>
      <Nhan chu={v.nhan} />
    </div>
  );
};

export const VE_VAT: Partial<Record<Vat['loai'], Ve>> = {
  nguoi: Nguoi, ban_tron: BanTron, anh_that: AnhThat, the: The, the_bai: LaBai, xuc_xac: XucXac, dong_xu: DongXu, hop_bi: HopBi, tui: HopBi, hop_qua: HopQua,
  dong_ho: DongHo, dien_thoai: DienThoai, bong_bay: BongBay, dong_ho_do: DongHoDo, bieu_do_cot: BieuDoCot, thanh: Thanh,
  vong_quay: VongQuay, cua: Cua, banh: Banh, nhan: NhanVat, chu: Chu, so_dem: SoDem, bieu_tuong: BieuTuong, luoi_o: LuoiO, danh_sach: DanhSach,
  khoi_hop: (v, st) => <KhoiHop v={v} st={st} />, tru: (v, st) => <Tru v={v} st={st} />, non: (v, st) => <Tru v={v} st={st} />,
  cau: (v, st) => <Cau v={v} st={st} />, toa_nha: (v, st, f) => <ToaNha v={v} st={st} frame={f} />, xe: (v, st) => <Xe v={v} st={st} />,
  cay: (v, st, f) => <Cay v={v} st={st} frame={f} />, thang: (v, st) => <Thang v={v} st={st} />,
  hinh_hoc: (v, st) => <HinhHoc v={v} st={st} />, do_thi: (v, st) => <DoThi v={v} st={st} />,
  hinh_tu_do: (v, st) => <HinhTuDo v={v} st={st} />,
};

// mũi tên cong nối hai điểm (pixel trên sân khấu), vẽ dần
export const MuiTen: React.FC<{x1: number; y1: number; x2: number; y2: number; p: number; mau: string; nhan: string}> = ({x1, y1, x2, y2, p, mau, nhan}) => {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const L = Math.hypot(dx, dy) || 1;
  const cx = mx - (dy / L) * L * 0.18;
  const cy = my + (dx / L) * L * 0.18;
  const tip = easeOut(kep((p - 0.7) / 0.3));
  const g = Math.atan2(y2 - cy, x2 - cx);
  return (
    <>
      <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', filter: phatSang(mau, 6)}} width={1} height={1}>
        <path d={`M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}`} stroke={mau} strokeWidth={7} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - easeOut(kep(p / 0.8))} />
        <path d={`M${x2} ${y2} L${x2 - Math.cos(g - 0.45) * 30 * tip} ${y2 - Math.sin(g - 0.45) * 30 * tip} M${x2} ${y2} L${x2 - Math.cos(g + 0.45) * 30 * tip} ${y2 - Math.sin(g + 0.45) * 30 * tip}`} stroke={mau} strokeWidth={7} strokeLinecap="round" />
      </svg>
      {nhan ? (
        <div style={{position: 'absolute', left: cx, top: cy, transform: 'translate(-50%,-50%)', opacity: tip}}>
          <NhanNeon chu={nhan} tuKhoa="" mau={mau} mauNhan={mau} co={28} xoay={0} />
        </div>
      ) : null}
    </>
  );
};

export {tienDo};
