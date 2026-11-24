// v90 — TẦNG 3: KHU THẺ GIẢI TOÁN. Thẻ nền tối bo góc, viền 1px sáng theo màu nhấn của bước, đánh số theo thứ tự
// trong bước (nội dung là chuỗi bước thật). Mỗi dòng công thức hiện đúng mốc; đổi bước thì thẻ cũ mờ đi trước.
import React from 'react';
import {FONT} from '../theme';
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
import {texSangChu} from '../chu';

const TOI_DA_THE = 3;
const CHOT = '#FBBF24';   // v98.1: hổ phách (kỷ luật 2 màu nhấn; trước đây viền ngọc)
// v96: khung nội dung dừng ở ranh phải 12 % (vùng an toàn TikTok); v98: tầng đối xứng 130..950, thẻ cách mép tầng 12 px
// v99.3: tăng đệm ngang an toàn trong hộp công thức (34 px mỗi bên) để công thức không sát mép hộp
const LE_THE = 12;
const DEM_NGANG_THE = 34;
const RONG_TRONG = RONG_ND - 2 * LE_THE - 2 * DEM_NGANG_THE;

// v99.3: auto-fit cỡ chữ cho thẻ chữ và nhãn thẻ theo độ dài chuỗi hiển thị
export function coChuTheChu(noiDung: string, chot = false): number {
  const n = Math.max(1, texSangChu(String(noiDung || '')).length);
  const max = chot ? 46 : 38;
  const min = chot ? 28 : 24;
  if (n <= 26) return max;
  return Math.max(min, Math.min(max, Math.floor((RONG_TRONG * 1.85) / (n * 0.58))));
}

export function coNhanThe(nhan?: string): number {
  const n = Math.max(1, texSangChu(String(nhan || '')).length);
  return Math.max(20, Math.min(27, Math.floor((RONG_TRONG - 130) / (n * 0.62))));
}

// mốc xuất hiện của thẻ j trong bước b
export const tTheCua = (b: BuocGiai, j: number) => (b.the[j].t !== undefined ? b.the[j].t! : b.t + 0.35 + j * 0.7);

function NoiDung({th, t0, t, mau, co = 42, coDong}: {th: TheGiai; t0: number; t: number; mau: string; co?: number; coDong?: number}) {
  if (th.loai === 'cong_thuc') {
    return (
      <div style={{display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', padding: '2px 4px', overflow: 'visible'}}>
        {th.dong.slice(0, 5).map((d, k) => {
          const tk = th.moc?.[k] ?? t0 + k * 0.45;
          const a = emRa((t - tk) / 0.35);
          // v98: căn GIỮA + co theo chiều cao (phân số nhiều tầng không bao giờ bị cắt nửa tử / mẫu)
          const coD = coDong ?? co;
          return (
            <div key={k} style={{opacity: a, transform: `translateY(${(1 - a) * 8}px)`, overflow: 'visible'}}>
              <Toan tex={d} size={coD} color={k === th.dong.length - 1 && (th.dong.length > 1 || co > 42) ? mau : '#F4F7FB'} maxWidth={RONG_TRONG} maxHeight={caoDongTex(d, coD) + 8} can="giua" style={co > 42 ? {fontWeight: 800} : undefined} />
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
  const cc = coChuTheChu(th.noi_dung, co > 42), mc = co > 42 ? '#F4FFFB' : '#DCE3EC';
  return <div style={{color: mc, fontFamily: FONT, fontWeight: co > 42 ? 800 : 600, fontSize: cc, lineHeight: 1.32, padding: '2px 6px', textAlign: 'center', overflow: 'visible'}}><ChuTron s={th.noi_dung} co={cc} mau={mc} dam={co > 42 ? 800 : 600} /></div>;
}

// Cụm thẻ căn GIỮA tầng 3 theo chiều dọc. Thẻ chưa tới lượt vẫn giữ chỗ (ẩn) nên cụm không nhảy khi thẻ mới vào.
// v92/v99.3: chiều cao ước lượng của thẻ -> cửa sổ thẻ theo NGÂN SÁCH CHIỀU CAO vùng an toàn tầng 3 (tách rõ T2 và phụ đề)
const CAO_T3 = 330;
export const caoCongThuc = (dong: string[], co: number) => dong.reduce((s, d) => s + caoDongTex(d, co), 0) + 10 * Math.max(0, dong.length - 1);
// cỡ dòng công thức để MỘT thẻ vừa ngân sách T3 (thẻ một mình vẫn cao quá -> co chữ, tối thiểu 24 px)
export const coDongVua = (th: TheGiai, caoToiDa = CAO_T3): number | undefined => {
  if (th.loai !== 'cong_thuc') return undefined;
  const co = th.chot ? 52 : 42;
  const vo = 38 + 46 + (th.chot ? 14 : 0);
  const c = coVuaCao(th.dong.slice(0, 5), co, caoToiDa - vo, 10, 24);
  return c < co ? c : undefined;
};
export const caoThe = (th: TheGiai, caoToiDa = CAO_T3) => {
  const vo = 40 + (th.nhan || th.loai !== 'chu' ? 46 : 0);
  // v98: chiều cao dòng theo ĐỘ SÂU phân số thật (frac lồng frac, dfrac) thay cho 84 px cố định
  if (th.loai === 'cong_thuc') return vo + (th.chot ? 14 : 0) + caoCongThuc(th.dong.slice(0, 5), coDongVua(th, caoToiDa) ?? (th.chot ? 52 : 42));
  if (th.chot) {
    const s = String((th as {noi_dung?: string}).noi_dung || '');
    const cc = coChuTheChu(s, true);
    return vo + 14 + Math.ceil(cc * 1.36) * Math.max(1, Math.ceil((texSangChu(s).length * cc * 0.58) / RONG_TRONG));
  }
  if (th.loai === 'casio') return vo + 110;
  if (th.loai === 'bang_bien_thien') return vo + 300;
  const s = String(th.noi_dung || '');
  const cc = coChuTheChu(s, false);
  return vo + Math.ceil(cc * 1.36) * Math.max(1, Math.ceil((texSangChu(s).length * cc * 0.58) / RONG_TRONG));
};

// v98.1: vạch nhấn cạnh trên thẻ kính — mảnh, glow nhẹ, lóe khi thẻ vừa vào (không filter: blur)
function VachNhan({mau, day, sang, loe}: {mau: string; day: number; sang: number; loe: number}) {
  return <div style={{position: 'absolute', left: 22, right: 22, top: 0, height: day, borderRadius: day,
    background: `linear-gradient(90deg, ${mau}00, ${mau} 18%, ${mau} 82%, ${mau}00)`, opacity: 0.7 + 0.3 * Math.max(loe, sang - 0.75),
    boxShadow: `0 0 ${8 + 10 * loe}px ${mau}${loe > 0.3 ? '99' : '66'}`}} />;
}

function DanhSachThe({b, t, mau, aChung, caoToiDa = CAO_T3}: {b: BuocGiai; t: number; mau: string; aChung: number; caoToiDa?: number}) {
  // v95: số thẻ đã hiện = chỉ số thẻ CUỐI đã tới mốc + 1 (không đếm: mốc không đơn điệu từng làm cửa sổ trượt sai thẻ)
  let daHien = 0;
  b.the.forEach((_, j) => { if (t >= tTheCua(b, j)) daHien = j + 1; });
  // lùi từ thẻ mới nhất: giữ thẻ cũ khi còn vừa; thẻ sắp tới chỉ giữ chỗ nếu vừa (cụm không nhảy khi thẻ mới vào)
  const cuoi = Math.max(1, Math.min(daHien, b.the.length));
  let dau = cuoi - 1, tong = caoThe(b.the[dau], caoToiDa);
  while (dau > 0 && cuoi - dau < TOI_DA_THE && tong + 14 + caoThe(b.the[dau - 1], caoToiDa) <= caoToiDa) tong += 14 + caoThe(b.the[--dau], caoToiDa);
  let het = cuoi;
  while (het < b.the.length && het - dau < TOI_DA_THE && tong + 14 + caoThe(b.the[het], caoToiDa) <= caoToiDa) tong += 14 + caoThe(b.the[het++], caoToiDa);
  const cuaSo = b.the.map((th, j) => ({th, j})).slice(dau, het);
  return (
    <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12, padding: `4px ${LE_THE}px`, boxSizing: 'border-box', opacity: aChung, overflow: 'visible'}}>
      {cuaSo.map(({th, j}) => {
        const t0 = tTheCua(b, j);
        const a = emRa((t - t0) / 0.38);
        const loe = 1 - kep01((t - t0) / 0.9); // viền lóe khi thẻ vừa vào
        const coNh = coNhanThe(th.nhan);
        if (th.chot) {
          // v98.1: THẺ CHỐT — kính mỏng ánh hổ phách, KHÔNG viền 4 cạnh; vạch sáng 3 px cạnh trên thở nhẹ; công thức lớn 52 px, nảy nhẹ khi vào
          const nay = 1 + 0.04 * Math.sin(Math.PI * kep01((t - t0) / 0.5));
          const sang = 0.75 + 0.25 * Math.sin(((t - t0) * 2 * Math.PI) / 2.4);
          return (
            <div key={j} data-the-giai data-the-chot style={{position: 'relative', opacity: a, transform: `translateY(${(1 - a) * 18}px) scale(${nay})`, borderRadius: 20,
              background: 'linear-gradient(180deg, rgba(251,191,36,0.085), rgba(255,255,255,0.035) 60%)',
              boxShadow: `0 22px 48px rgba(0,0,0,0.40), 0 0 ${30 * sang + 20 * loe}px ${CHOT}1F, inset 0 1px 0 rgba(255,255,255,0.06)`,
              padding: `18px ${DEM_NGANG_THE}px 22px`, display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0, overflow: 'visible'}}>
              <VachNhan mau={CHOT} day={3} sang={sang} loe={loe} />
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, overflow: 'visible'}}>
                <span style={{minHeight: 34, padding: '2px 16px', borderRadius: 17, background: CHOT, color: '#0E1014', fontFamily: FONT, fontWeight: 900, fontSize: 20, display: 'inline-flex', alignItems: 'center', flexShrink: 0, letterSpacing: 0.6}}>{j + 1} · ĐÁP ÁN</span>
                {th.nhan ? <span style={{color: CHOT, fontFamily: FONT, fontWeight: 800, fontSize: coNh, overflow: 'visible'}}><ChuTron s={th.nhan} co={coNh} mau={CHOT} dam={800} /></span> : null}
              </div>
              <NoiDung th={th} t0={t0 + 0.15} t={t} mau={CHOT} co={52} coDong={coDongVua(th, caoToiDa)} />
            </div>
          );
        }
        // v98.1: thẻ thường = tấm kính mờ mỏng rgba(255,255,255,0.04) + bóng mềm, bỏ viền 4 cạnh; chỉ 1 vạch sáng 2,5 px cạnh trên theo màu bước
        return (
          <div key={j} data-the-giai style={{position: 'relative', opacity: a, transform: `translateY(${(1 - a) * 18}px)`, borderRadius: 18,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03))',
            boxShadow: '0 18px 40px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.05)',
            padding: `16px ${DEM_NGANG_THE}px 20px`, display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0, overflow: 'visible'}}>
            <VachNhan mau={mau} day={2.5} sang={1} loe={loe} />
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, overflow: 'visible'}}>
              <span style={{width: 34, height: 34, borderRadius: 17, background: `${mau}26`, color: mau, fontFamily: FONT, fontWeight: 900, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>{j + 1}</span>
              {th.nhan ? <span style={{color: mau, fontFamily: FONT, fontWeight: 700, fontSize: coNh, overflow: 'visible'}}><ChuTron s={th.nhan} co={coNh} mau={mau} dam={700} /></span> : null}
            </div>
            <NoiDung th={th} t0={t0 + 0.15} t={t} mau={mau} coDong={coDongVua(th, caoToiDa)} />
          </div>
        );
      })}
    </div>
  );
}

export const TangTheGiai: React.FC<{buoc: BuocGiai[]; i: number; t: number; mau: (b: BuocGiai) => string; caoToiDa?: number}> = ({buoc, i, t, mau, caoToiDa = CAO_T3}) => {
  if (i < 0) return null;
  const b = buoc[i];
  const truoc = i > 0 ? buoc[i - 1] : null;
  const ra = truoc ? 1 - kep01((t - b.t) / RA_TIEU_DE) : 0;
  return (
    <>
      {truoc && ra > 0 ? <DanhSachThe b={truoc} t={t} mau={mau(truoc)} aChung={ra} caoToiDa={caoToiDa} /> : null}
      {/* bước mới chờ thẻ cũ mờ hết rồi mới vào */}
      <DanhSachThe b={{...b, the: b.the.map((th, j) => ({...th, t: Math.max(tTheCua(b, j), b.t + (truoc ? RA_TIEU_DE : 0))}))}} t={t} mau={mau(b)} aChung={1} caoToiDa={caoToiDa} />
    </>
  );
};
