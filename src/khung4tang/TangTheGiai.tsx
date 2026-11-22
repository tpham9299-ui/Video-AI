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
import {tachHam} from './chu_tron';

const TOI_DA_THE = 3;
const RONG_TRONG = 1080 - 2 * 44 - 2 * 28;

// mốc xuất hiện của thẻ j trong bước b
export const tTheCua = (b: BuocGiai, j: number) => (b.the[j].t !== undefined ? b.the[j].t! : b.t + 0.35 + j * 0.7);

function NoiDung({th, t0, t, mau}: {th: TheGiai; t0: number; t: number; mau: string}) {
  if (th.loai === 'cong_thuc') {
    return (
      <div style={{display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start'}}>
        {th.dong.slice(0, 5).map((d, k) => {
          const tk = th.moc?.[k] ?? t0 + k * 0.45;
          const a = emRa((t - tk) / 0.35);
          return (
            <div key={k} style={{opacity: a, transform: `translateX(${(1 - a) * -12}px)`}}>
              <Toan tex={d} size={42} color={k === th.dong.length - 1 && th.dong.length > 1 ? mau : '#F4F7FB'} maxWidth={RONG_TRONG} can="trai" />
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
      <div style={{transform: 'scale(0.96)', transformOrigin: 'left top'}}>
        <BangBienThien v={v} st={{t, ta: t0} as unknown as TrangThai} />
      </div>
    );
  }
  return <div style={{color: '#DCE3EC', fontFamily: FONT, fontWeight: 600, fontSize: 38, lineHeight: 1.3}}><ChuTron s={th.noi_dung} co={38} mau="#DCE3EC" dam={600} /></div>;
}

// Cụm thẻ căn GIỮA tầng 3 theo chiều dọc. Thẻ chưa tới lượt vẫn giữ chỗ (ẩn) nên cụm không nhảy khi thẻ mới vào.
// v92: chiều cao ước lượng của thẻ -> cửa sổ thẻ theo NGÂN SÁCH CHIỀU CAO tầng 3 (3 thẻ nhiều dòng không còn tràn/cắt mép)
const CAO_T3 = 450;
export const caoThe = (th: TheGiai) => {
  const vo = 38 + (th.nhan || th.loai !== 'chu' ? 46 : 0);
  if (th.loai === 'cong_thuc') return vo + th.dong.slice(0, 5).reduce((s, d) => s + (/\\d?frac/.test(d) ? 84 : 58), 0);
  if (th.loai === 'casio') return vo + 110;
  if (th.loai === 'bang_bien_thien') return vo + 300;
  return vo + 52 * Math.max(1, Math.ceil(String(th.noi_dung || '').length / 34));
};

function DanhSachThe({b, t, mau, aChung}: {b: BuocGiai; t: number; mau: string; aChung: number}) {
  const daHien = b.the.filter((_, j) => t >= tTheCua(b, j)).length;
  // lùi từ thẻ mới nhất: giữ thẻ cũ khi còn vừa; thẻ sắp tới chỉ giữ chỗ nếu vừa (cụm không nhảy khi thẻ mới vào)
  const cuoi = Math.max(1, Math.min(daHien, b.the.length));
  let dau = cuoi - 1, tong = caoThe(b.the[dau]);
  while (dau > 0 && cuoi - dau < TOI_DA_THE && tong + 16 + caoThe(b.the[dau - 1]) <= CAO_T3) tong += 16 + caoThe(b.the[--dau]);
  let het = cuoi;
  while (het < b.the.length && het - dau < TOI_DA_THE && tong + 16 + caoThe(b.the[het]) <= CAO_T3) tong += 16 + caoThe(b.the[het++]);
  const cuaSo = b.the.map((th, j) => ({th, j})).slice(dau, het);
  return (
    <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16, padding: '0 44px', opacity: aChung}}>
      {cuaSo.map(({th, j}) => {
        const t0 = tTheCua(b, j);
        const a = emRa((t - t0) / 0.38);
        const loe = 1 - kep01((t - t0) / 0.9); // viền lóe khi thẻ vừa vào
        return (
          <div key={j} data-the-giai style={{opacity: a, transform: `translateY(${(1 - a) * 18}px)`, background: 'rgba(20,24,32,0.92)', borderRadius: 18,
            border: `1px solid ${mau}${loe > 0 ? 'CC' : '73'}`, boxShadow: `0 0 ${14 + 18 * loe}px ${mau}${loe > 0.3 ? '40' : '1F'}, inset 0 1px 0 rgba(255,255,255,0.04)`,
            padding: '18px 28px 20px', display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
              <span style={{width: 34, height: 34, borderRadius: 17, background: mau, color: '#0E1014', fontFamily: FONT, fontWeight: 900, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{j + 1}</span>
              {th.nhan ? <span style={{color: mau, fontFamily: FONT, fontWeight: 700, fontSize: 26}}><ChuTron s={th.nhan} co={26} mau={mau} dam={700} /></span> : null}
            </div>
            <NoiDung th={th} t0={t0 + 0.15} t={t} mau={mau} />
          </div>
        );
      })}
    </div>
  );
}

export const TangTheGiai: React.FC<{buoc: BuocGiai[]; i: number; t: number; mau: (b: BuocGiai) => string}> = ({buoc, i, t, mau}) => {
  if (i < 0) return null;
  const b = buoc[i];
  const truoc = i > 0 ? buoc[i - 1] : null;
  const ra = truoc ? 1 - kep01((t - b.t) / RA_TIEU_DE) : 0;
  return (
    <>
      {truoc && ra > 0 ? <DanhSachThe b={truoc} t={t} mau={mau(truoc)} aChung={ra} /> : null}
      {/* bước mới chờ thẻ cũ mờ hết rồi mới vào */}
      <DanhSachThe b={{...b, the: b.the.map((th, j) => ({...th, t: Math.max(tTheCua(b, j), b.t + (truoc ? RA_TIEU_DE : 0))}))}} t={t} mau={mau(b)} aChung={1} />
    </>
  );
};
