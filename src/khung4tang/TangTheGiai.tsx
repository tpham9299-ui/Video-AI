import {KhoaThuongHieu} from './KhoaThuongHieu';
// v90 — TẦNG 3: KHU THẺ GIẢI TOÁN. Thẻ nền tối bo góc, viền 1px sáng theo màu nhấn của bước, đánh số theo thứ tự
// trong bước (nội dung là chuỗi bước thật). Mỗi dòng công thức hiện đúng mốc; đổi bước thì thẻ cũ mờ đi trước.
import React from 'react';
import {spring} from 'remotion';
import {FONT} from '../theme';
import {texSangChu} from '../chu';
import {Toan} from '../Toan';
import {BangBienThien} from '../sankhau/BangBienThien';
import type {Vat} from '../sankhau/dulieu';
import type {TrangThai} from '../sankhau/trangthai';
import {emRa, kep01} from '../3d-vector/toan3d';
import {TheCasio} from './TheCasio';
import {BuocGiai, TheGiai} from './kieu';
import {RA_TIEU_DE} from './TangTieuDe';
import {ChuTron} from './ChuTron';
import {RONG_ND} from './vung';
import {tachHam} from './chu_tron';
import {caoDongTex, coVuaCao} from './do_tex';
import {chaySo} from './chay_so';
import {BAT_THANH_TIEN_DO_THE} from './cauHinhTinhChinh';

const TOI_DA_THE = 3;
const CHOT = '#FBBF24';   // v98.1: hổ phách (kỷ luật 2 màu nhấn; trước đây viền ngọc)
// v96: khung nội dung dừng ở ranh phải 12 % (vùng an toàn TikTok); v98: tầng đối xứng 130..950, thẻ cách mép tầng 12 px
const LE_THE = 12;
const RONG_TRONG = RONG_ND - 2 * LE_THE - 2 * 28;

// mốc xuất hiện của thẻ j trong bước b
export const tTheCua = (b: BuocGiai, j: number) => {
  const th = b.the[j];
  return Math.max(th.t ?? b.t + 0.35 + j * 0.7, th.loai === 'cong_thuc' ? th.moc?.[0] ?? 0 : 0);
};

// v99.4: lò xo nảy gọn (damping 15, không rung thừa) theo giây -> khung (30 fps); pure, không phụ thuộc hook
const loXo = (t: number, t0: number, delayKhung = 0) =>
  spring({frame: Math.max(0, (t - t0) * 30 - delayKhung), fps: 30, config: {damping: 15, stiffness: 140, mass: 0.8}});
// v99.4: giả kính nổi khối (KHÔNG backdrop-filter): viền trên sáng 1px + viền dưới tối bằng inset shadow (không đổi kích thước)
const VIEN_KINH = 'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.45)';

// v99.6: bảng màu đồng bộ với sân khấu (SoDo2D / RutMau): thanh giằng MN = cyan, đỉnh S = hổ phách, kết quả chốt = ngọc
const MAU_MN = '#38BDF8';
const MAU_S = '#FBBF24';
const NGOC = '#2EE6A8';
const SAN_HO = '#FF5A5F';
// chỉ tô ký hiệu ĐỨNG ĐỘC LẬP (không dính lệnh TeX / tên môi trường / chữ khác); dòng đã có màu riêng thì giữ nguyên
const DA_CO_MAU = /\\(?:textcolor|color|colorbox|m(?:vang|do|ngoc|cam|la))\b/;
const toMauKyHieu = (tex: string): string => {
  if (DA_CO_MAU.test(tex)) return tex;
  return tex
    .replace(/(?<![\\A-Za-z0-9_^'])MN(?![A-Za-z0-9])/g, `\\textcolor{${MAU_MN}}{MN}`)
    .replace(/(?<![\\A-Za-z0-9_^'])(?<!\\[A-Za-z]+\{)S(?![A-Za-z0-9])/g, `\\textcolor{${MAU_S}}{S}`);
};
// v99.6: dòng rút gọn phân số đơn giản "a/b = c/d" (dạng \frac hoặc a/b) -> [vế trái, dấu, vế phải]
const PS = String.raw`(?:\\d?frac\{\d+\}\{\d+\}|\d+\s*/\s*\d+)`;
const RE_RUT_GON = new RegExp(String.raw`^\s*(${PS})\s*(=|\\to|\\rightarrow|\\Rightarrow|->)\s*(${PS})\s*$`);
// v99.6: dòng giải thích mang cảnh báo sư phạm -> huy hiệu LƯU Ý
const RE_LUU_Y = /chú ý|lưu ý|điều kiện|tránh|không lặp|bẫy|nhớ/i;

function NoiDung({th, t0, t, mau, co = 42, coDong}: {th: TheGiai; t0: number; t: number; mau: string; co?: number; coDong?: number}) {
  if (th.loai === 'cong_thuc') {
    const dongs = th.dong.slice(0, 5);
    return (
      <div style={{display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center'}}>
        {dongs.map((d, k) => {
          const tk = th.moc?.[k] ?? t0 + k * 0.45;
          const a = emRa((t - tk) / 0.35);
          // v99.6: rút gọn phân số -> nét gạch chéo ~12 khung lướt qua vế trái, rồi vế phải đổi ngọc
          const rg = RE_RUT_GON.exec(d);
          const pRut = rg ? kep01((t - tk - 0.3) / 0.4) : 0;
          const dTex = rg && pRut >= 1 ? `${rg[1]} ${rg[2]} \\textcolor{${NGOC}}{${rg[3]}}` : d;
          // lò xo lệch nhịp 4-5 frame so với thẻ; dòng cũ hạ xuống ~0.62 khi dòng kế tiếp xuất hiện
          const sp = loXo(t, tk, 4 + (k % 2));
          const tkSau = k + 1 < dongs.length ? (th.moc?.[k + 1] ?? t0 + (k + 1) * 0.45) : null;
          const mo = tkSau === null ? 1 : 1 - 0.38 * emRa((t - tkSau) / 0.3);
          // v98: căn GIỮA + co theo chiều cao (phân số nhiều tầng không bao giờ bị cắt nửa tử / mẫu)
          const coD = coDong ?? co;
          return (
            <div key={k} style={{position: 'relative', opacity: a * mo, transform: `translateY(${(1 - sp) * 14}px)`}}>
              <Toan tex={toMauKyHieu(co > 42 && k === dongs.length - 1 ? chaySo(dTex, t - tk) : dTex)} size={coD} color={k === th.dong.length - 1 && (th.dong.length > 1 || co > 42) ? mau : '#F4F7FB'} maxWidth={RONG_TRONG} maxHeight={caoDongTex(d, coD) + 6} can="giua" style={co > 42 ? {fontWeight: 800} : undefined} />
              {rg && pRut > 0 && pRut < 1.0001 ? (
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible', opacity: pRut < 1 ? 1 : 0}}>
                  <path d="M 6 88 L 44 12" pathLength={1} fill="none" stroke={SAN_HO} strokeWidth={3} strokeLinecap="round" vectorEffect="non-scaling-stroke" strokeDasharray={1} strokeDashoffset={1 - pRut} />
                </svg>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }
  if (th.loai === 'casio') return <TheCasio phim={th.phim} ketQua={th.ket_qua} t={t - t0} mau={mau} />;
  if (th.loai === 'bang_bien_thien') {
    // v92: tên hàm động theo kịch bản (V(x), S'(r)...) thay vì cứng f'(x), f(x)
    const [ham, bien] = tachHam(th.ham, th.bien);
    const v = {bbtMoc: th.moc_x, bbtDau: th.dau, bbtGiaTri: th.gia_tri, bbtHam: ham, bbtBien: bien, mocDong: [t0 + 0.6, t0 + 1.4], noiDung: ''} as unknown as Vat;
    return (
      <div style={{transform: 'scale(0.96)', transformOrigin: 'center top', alignSelf: 'center'}}>
        <BangBienThien v={v} st={{t, ta: t0} as unknown as TrangThai} />
      </div>
    );
  }
  const cc = co > 42 ? 48 : 38, mc = co > 42 ? '#F4FFFB' : '#DCE3EC';
  const luuY = RE_LUU_Y.test(String(th.noi_dung || ''));
  const spLuuY = luuY ? loXo(t, t0, 3) : 1;
  // v100.1: nhãn sư phạm có icon SVG 16x16 — BẪY HAY SAI (tam giác cảnh báo, san hô) / LƯU Ý (bóng đèn, hổ phách)
  const bay = luuY && /bẫy/i.test(String(th.noi_dung || ''));
  const mauNhan = bay ? SAN_HO : CHOT;
  const chuNhan = bay ? '#FFFFFF' : '#0E1014';
  return <div style={{color: mc, fontFamily: FONT, fontWeight: co > 42 ? 800 : 600, fontSize: cc, lineHeight: 1.3, textAlign: 'center'}}>
    {luuY ? <span style={{display: 'inline-flex', alignItems: 'center', gap: 6, verticalAlign: 'middle', marginRight: 12, padding: '2px 12px', borderRadius: 12, background: mauNhan, color: chuNhan, fontWeight: 900, fontSize: 22, letterSpacing: 0.6, lineHeight: 1.3, opacity: kep01(spLuuY * 1.5), transform: `scale(${0.6 + 0.4 * spLuuY})`}}>
      <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke={chuNhan} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{flexShrink: 0}}>
        {bay
          ? <><path d="M8 1.8 L15 14 H1 Z" /><path d="M8 6.2 V9.6" /><circle cx={8} cy={11.9} r={0.6} fill={chuNhan} /></>
          : <><path d="M5.2 10.6 C3.6 9.4 3.2 7.2 4.2 5.5 C5.2 3.8 7.4 3.2 9.2 4 C11 4.8 11.8 6.9 11 8.6 C10.6 9.4 10.1 9.9 10.1 10.6 H5.2 Z" /><path d="M6 13 H10 M6.8 15 H9.2" /></>}
      </svg>
      {bay ? 'BẪY HAY SAI' : 'LƯU Ý'}
    </span> : null}
    <ChuTron s={th.noi_dung} co={cc} mau={mc} dam={co > 42 ? 800 : 600} /></div>;
}

// Cụm thẻ căn GIỮA tầng 3 theo chiều dọc. Thẻ chưa tới lượt vẫn giữ chỗ (ẩn) nên cụm không nhảy khi thẻ mới vào.
// v92: chiều cao ước lượng của thẻ -> cửa sổ thẻ theo NGÂN SÁCH CHIỀU CAO tầng 3 (3 thẻ nhiều dòng không còn tràn/cắt mép)
const CAO_T3 = 380;   // v96: T3 426 px (vùng an toàn TikTok) trừ dải phụ đề 56 px
export const caoCongThuc = (dong: string[], co: number) => dong.reduce((s, d) => s + caoDongTex(d, co), 0) + 10 * Math.max(0, dong.length - 1);
// cỡ dòng công thức để MỘT thẻ vừa ngân sách T3 (thẻ một mình vẫn cao quá -> co chữ, tối thiểu 28 px)
export const coDongVua = (th: TheGiai, caoToiDa = CAO_T3): number | undefined => {
  if (th.loai !== 'cong_thuc') return undefined;
  const co = th.chot ? 52 : 42;
  const vo = 38 + 46 + (th.chot ? 14 : 0);
  const c = coVuaCao(th.dong.slice(0, 5), co, caoToiDa - vo, 10, 28);
  return c < co ? c : undefined;
};
export const caoThe = (th: TheGiai) => {
  const vo = 38 + (th.nhan || th.loai !== 'chu' ? 46 : 0);
  // v98: chiều cao dòng theo ĐỘ SÂU phân số thật (frac lồng frac, dfrac) thay cho 84 px cố định
  if (th.loai === 'cong_thuc') return vo + (th.chot ? 14 : 0) + caoCongThuc(th.dong.slice(0, 5), coDongVua(th) ?? (th.chot ? 52 : 42));
  if (th.chot) return vo + 14 + 64 * Math.max(1, Math.ceil(String((th as {noi_dung?: string}).noi_dung || '').length / 28));
  if (th.loai === 'casio') return vo + 110;
  if (th.loai === 'bang_bien_thien') return vo + 300;
  return vo + 52 * Math.max(1, Math.ceil(String(th.noi_dung || '').length / 34));
};

// v98.1: vạch nhấn cạnh trên thẻ kính — mảnh, glow nhẹ, lóe khi thẻ vừa vào (không filter: blur)
function VachNhan({mau, day, sang, loe}: {mau: string; day: number; sang: number; loe: number}) {
  return <div style={{position: 'absolute', left: 22, right: 22, top: 0, height: day, borderRadius: day,
    background: `linear-gradient(90deg, ${mau}00, ${mau} 18%, ${mau} 82%, ${mau}00)`, opacity: 0.7 + 0.3 * Math.max(loe, sang - 0.75),
    boxShadow: `0 0 ${8 + 10 * loe}px ${mau}${loe > 0.3 ? '99' : '66'}`}} />;
}

// v100.1: thanh viền trái 3,5 px chạy dài dần từ trên xuống theo tiến độ bước đang giảng (p 0..1); thẻ cũ: viền tĩnh dịu
function ThanhTienDo({mau, p, hoatDong}: {mau: string; p: number; hoatDong: boolean}) {
  if (!BAT_THANH_TIEN_DO_THE) return null;
  return <div style={{position: 'absolute', left: 0, top: 16, bottom: 16, width: 3.5, borderRadius: 2, pointerEvents: 'none',
    background: hoatDong ? 'rgba(255,255,255,0.08)' : `${mau}40`}}>
    {hoatDong ? <div style={{width: '100%', height: `${Math.max(0, Math.min(1, p)) * 100}%`, borderRadius: 2, background: mau, boxShadow: `0 0 8px ${mau}99`}} /> : null}
  </div>;
}
// v100.1: vệt sáng nền bán trong suốt lướt qua thẻ mới trong ~11 khung đầu (không blur)
function VetMoThe({t, t0, r}: {t: number; t0: number; r: number}) {
  const p = (t - t0) * 30 / 11;
  if (!BAT_THANH_TIEN_DO_THE || p < 0 || p > 1) return null;
  const x = -30 + 150 * p;
  return <div style={{position: 'absolute', inset: 0, borderRadius: r, pointerEvents: 'none',
    background: `linear-gradient(105deg, rgba(255,255,255,0) ${x - 14}%, rgba(255,255,255,0.12) ${x}%, rgba(255,255,255,0) ${x + 14}%)`}} />;
}

function DanhSachThe({b, t, mau, aChung, hoatDong = false, tHet}: {b: BuocGiai; t: number; mau: string; aChung: number; hoatDong?: boolean; tHet?: number}) {
  const pBuoc = (t - b.t) / Math.max(1, (tHet ?? b.t + 8) - b.t);
  // v95: số thẻ đã hiện = chỉ số thẻ CUỐI đã tới mốc + 1 (không đếm: mốc không đơn điệu từng làm cửa sổ trượt sai thẻ)
  let daHien = 0;
  b.the.forEach((_, j) => { if (t >= tTheCua(b, j)) daHien = j + 1; });
  // lùi từ thẻ mới nhất: giữ thẻ cũ khi còn vừa; thẻ sắp tới chỉ giữ chỗ nếu vừa (cụm không nhảy khi thẻ mới vào)
  if (!daHien) return null;
  const cuoi = daHien;
  let dau = cuoi - 1, tong = caoThe(b.the[dau]);
  while (dau > 0 && cuoi - dau < TOI_DA_THE && tong + 16 + caoThe(b.the[dau - 1]) <= CAO_T3) tong += 16 + caoThe(b.the[--dau]);
  let het = cuoi;
  while (het < b.the.length && het - dau < TOI_DA_THE && tong + 16 + caoThe(b.the[het]) <= CAO_T3) tong += 16 + caoThe(b.the[het++]);
  const cuaSo = b.the.map((th, j) => ({th, j})).slice(dau, het);
  return (
    <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16, padding: `0 ${LE_THE}px`, opacity: aChung}}>
      {cuaSo.map(({th, j}) => {
        const t0 = tTheCua(b, j);
        const a = emRa((t - t0) / 0.38);
        const loe = 1 - kep01((t - t0) / 0.9); // viền lóe khi thẻ vừa vào
        const sp = loXo(t, t0);   // lò xo thẻ (nảy gọn)
        if (th.chot) {
          // v98.1: THẺ CHỐT — kính mỏng ánh hổ phách, KHÔNG viền 4 cạnh; vạch sáng 3 px cạnh trên thở nhẹ; công thức lớn 52 px, nảy nhẹ khi vào
          const nay = 1 + 0.05 * Math.sin(Math.PI * kep01((t - t0) / 0.5));
          const sang = 0.75 + 0.25 * Math.sin(((t - t0) * 2 * Math.PI) / 2.4);
          return (
            <div key={j} data-the-giai data-the-chot style={{position: 'relative', opacity: a, transform: `translateY(${(1 - sp) * 22}px) scale(${nay})`, borderRadius: 20,
              background: 'linear-gradient(180deg, rgba(251,191,36,0.12), rgba(14,16,22,0.62) 55%, rgba(8,10,14,0.72))',
              boxShadow: `0 22px 48px rgba(0,0,0,0.40), 0 0 ${30 * sang + 20 * loe}px ${CHOT}1F, ${VIEN_KINH}`,
              padding: '18px 30px 22px', display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0}}>
              <VachNhan mau={CHOT} day={3} sang={sang} loe={loe} />
              <ThanhTienDo mau={CHOT} p={pBuoc} hoatDong={hoatDong} />
              <VetMoThe t={t} t0={t0} r={20} />
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12}}>
                <span style={{height: 34, padding: '0 14px', borderRadius: 17, background: CHOT, color: '#0E1014', fontFamily: FONT, fontWeight: 900, fontSize: 20, display: 'flex', alignItems: 'center', letterSpacing: 0.6}}>{j + 1} · ĐÁP ÁN</span>
                {th.nhan ? <span style={{color: CHOT, fontFamily: FONT, fontWeight: 800, fontSize: 28}}><ChuTron s={th.nhan} co={28} mau={CHOT} dam={800} /></span> : null}
              </div>
              <KhoaThuongHieu viTri="the" />
            <NoiDung th={th} t0={t0} t={t} mau={NGOC} co={52} coDong={coDongVua(th)} />
            </div>
          );
        }
        // v98.1: thẻ thường = tấm kính mờ mỏng rgba(255,255,255,0.04) + bóng mềm, bỏ viền 4 cạnh; chỉ 1 vạch sáng 2,5 px cạnh trên theo màu bước
        return (
          <div key={j} data-the-giai style={{position: 'relative', opacity: a, transform: `translateY(${(1 - sp) * 20}px)`, borderRadius: 18,
            background: 'linear-gradient(180deg, rgba(34,40,52,0.62), rgba(12,14,20,0.70))',
            boxShadow: `0 18px 40px rgba(0,0,0,0.34), ${VIEN_KINH}`,
            padding: '18px 28px 20px', display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0}}>
            <VachNhan mau={mau} day={2.5} sang={1} loe={loe} />
            <ThanhTienDo mau={mau} p={pBuoc} hoatDong={hoatDong} />
            <VetMoThe t={t} t0={t0} r={18} />
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12}}>
              <span style={{width: 34, height: 34, borderRadius: 17, background: `${mau}26`, color: mau, fontFamily: FONT, fontWeight: 900, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{j + 1}</span>
              {th.nhan ? <span style={{color: mau, fontFamily: FONT, fontWeight: 700, fontSize: 26}}><ChuTron s={th.nhan} co={26} mau={mau} dam={700} /></span> : null}
            </div>
            <KhoaThuongHieu viTri="the" />
            <NoiDung th={th} t0={t0} t={t} mau={mau} coDong={coDongVua(th)} />
          </div>
        );
      })}
    </div>
  );
}

// Khử trùng thẻ công thức / giải thích trong CÙNG 1 BƯỚC: lọc bỏ thẻ trùng vế trái (trước ":" hoặc "=")
// hoặc trùng nghĩa (VD "Ā : cả 3 viên bi vàng" vs "Ā : cả 3 bi đều vàng"). Ưu tiên giữ thẻ chot / thẻ kịch bản gốc (không phải tu_dong)
// và bảo toàn mốc xuất hiện sớm hơn để T3 không bị khoảng trống.
const TU_DEM_TRUNG = new Set(['vien', 'deu', 'la', 'co', 'cua', 'cac', 'duoc', 'thi', 'nen', 'bang', 'ra', 'nhu', 'sau', 'ta', 'suy', 'ma']);

function chuanChuSoSanh(s: string): string {
  return texSangChu(s)
    .replace(/([A-Za-z])[\u0304\u0305]/g, '$1_bar')
    .replace(/Ā/g, 'a_bar')
    .replace(/ā/g, 'a_bar')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function phanTichThe(th: TheGiai): {van: string; dau: ':' | '=' | ''; lhs: string; tu: Set<string>; tuDong: boolean} {
  const tuDong = Boolean((th as {tu_dong?: boolean}).tu_dong);
  const goc = th.loai === 'cong_thuc' ? (th.dong || []).join(' ; ') : th.loai === 'chu' ? String(th.noi_dung || '') : '';
  const van = chuanChuSoSanh(goc);
  if (!van) return {van: '', dau: '', lhs: '', tu: new Set(), tuDong};
  const dongDau = th.loai === 'cong_thuc' ? chuanChuSoSanh(th.dong?.[0] || '') : van;
  let dau: ':' | '=' | '' = '';
  let lhs = '';
  const iHaiCham = dongDau.indexOf(':');
  const iBang = dongDau.indexOf('=');
  if (iHaiCham > 0 && (iBang < 0 || iHaiCham < iBang)) {
    dau = ':';
    lhs = dongDau.slice(0, iHaiCham).replace(/[^a-z0-9_()]+/g, '').trim();
  } else if (iBang > 0) {
    dau = '=';
    lhs = dongDau.slice(0, iBang).replace(/[^a-z0-9_()]+/g, '').trim();
  }
  const tu = new Set(
    van
      .replace(/[^a-z0-9_]+/g, ' ')
      .split(/\s+/)
      .filter((w) => w && !TU_DEM_TRUNG.has(w)),
  );
  return {van, dau, lhs, tu, tuDong};
}

function laTheTrung(a: ReturnType<typeof phanTichThe>, b: ReturnType<typeof phanTichThe>, theA: TheGiai, theB: TheGiai): boolean {
  if (!a.van || !b.van) return false;
  if (a.van === b.van) return true;
  if (a.lhs && b.lhs && a.lhs === b.lhs) {
    // Cùng vế trái định nghĩa ":" (VD "Ā : ...") -> chắc chắn trùng
    if (a.dau === ':' && b.dau === ':') return true;
    // Cùng vế trái phương trình "=" trong cùng 1 bước (đặc biệt khi 1 thẻ là tu_dong hoặc cùng kiểu cong_thuc) -> khử trùng
    if (a.dau === '=' && b.dau === '=' && theA.loai === 'cong_thuc' && theB.loai === 'cong_thuc') return true;
  }
  if (a.tu.size >= 3 && b.tu.size >= 3) {
    let chung = 0;
    for (const w of a.tu) if (b.tu.has(w)) chung++;
    const jaccard = chung / Math.max(1, a.tu.size + b.tu.size - chung);
    const chua = chung / Math.min(a.tu.size, b.tu.size);
    if (jaccard >= 0.72 || (chung >= 3 && chua >= 0.85)) return true;
  }
  return false;
}

function gopMocGiu(giu: TheGiai, bo: TheGiai): TheGiai {
  const tGiu = giu.t;
  const tBo = bo.t;
  const tSom = typeof tGiu === 'number' && typeof tBo === 'number' ? Math.min(tGiu, tBo) : (tGiu ?? tBo);
  if (giu.loai === 'cong_thuc' && giu.moc?.length && typeof tSom === 'number' && giu.moc[0] > tSom + 0.25) {
    const dt = giu.moc[0] - (tSom + 0.15);
    return {...giu, t: tSom, moc: giu.moc.map((m) => Math.max(tSom, m - dt))};
  }
  return typeof tSom === 'number' ? {...giu, t: tSom} : giu;
}

export function locTheTrungTrongBuoc(the: TheGiai[]): TheGiai[] {
  if (!the || the.length <= 1) return the || [];
  const kq: {th: TheGiai; pt: ReturnType<typeof phanTichThe>}[] = [];
  for (const th of the) {
    const pt = phanTichThe(th);
    const idx = kq.findIndex((x) => laTheTrung(x.pt, pt, x.th, th));
    if (idx < 0) {
      kq.push({th, pt});
      continue;
    }
    const cu = kq[idx];
    // Ưu tiên giữ: thẻ chot > thẻ gốc (không phải tu_dong) > thẻ dài/chi tiết hơn
    const diem = (x: TheGiai, p: ReturnType<typeof phanTichThe>) =>
      (x.chot ? 100 : 0) + (!p.tuDong ? 20 : 0) + (x.loai === 'cong_thuc' ? x.dong.length * 5 : 0) + Math.min(10, p.van.length / 8);
    if (diem(th, pt) > diem(cu.th, cu.pt)) {
      kq[idx] = {th: gopMocGiu(th, cu.th), pt};
    } else {
      kq[idx] = {th: gopMocGiu(cu.th, th), pt: cu.pt};
    }
  }
  return kq.map((x) => x.th);
}

export const TangTheGiai: React.FC<{buoc: BuocGiai[]; i: number; t: number; mau: (b: BuocGiai) => string}> = ({buoc, i, t, mau}) => {
  if (i < 0) return null;
  const bGoc = buoc[i];
  const b = {...bGoc, the: locTheTrungTrongBuoc(bGoc.the)};
  const truocGoc = i > 0 ? buoc[i - 1] : null;
  const truoc = truocGoc ? {...truocGoc, the: locTheTrungTrongBuoc(truocGoc.the)} : null;
  const ra = truoc ? 1 - kep01((t - b.t) / RA_TIEU_DE) : 0;
  return (
    <>
      {truoc && ra > 0 ? <DanhSachThe b={truoc} t={t} mau={mau(truoc)} aChung={ra} /> : null}
      {/* bước mới chờ thẻ cũ mờ hết rồi mới vào */}
      <DanhSachThe b={{...b, the: b.the.map((th, j) => ({...th, t: Math.max(tTheCua(b, j), b.t + (truoc ? RA_TIEU_DE : 0))}))}} t={t} mau={mau(b)} aChung={1} hoatDong tHet={i + 1 < buoc.length ? buoc[i + 1].t : undefined} />
    </>
  );
};
