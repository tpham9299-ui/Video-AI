import {KhoaThuongHieu} from './KhoaThuongHieu';
// v97 — BỐ CỤC TỐI GIẢN cho luồng hình KHÔNG GIAN (chỉ khi props.khung4tang.khongGian; luồng v95/v96 giữ bố cục 4 tầng cũ):
//  T1  : MỘT dòng tiêu đề căn giữa ngay dưới Top 11 % ("02 · Giao tuyến ở đáy"), không viên thuốc / không 2 tầng chữ
//  T2  : sân khấu TRÀN VIỀN 16 %..62 % chiều cao (không khung kính bo góc) — khối hình + lưới sàn hòa vào nền chung
//  T3  : MỘT khối công thức đang giảng, căn giữa tuyệt đối, nền mờ + 2 vạch nhấn mảnh trên/dưới theo màu bước;
//        sang ý mới thì thay tại chỗ. Khối chỉ hiện khi dòng đầu đã tới mốc (không bao giờ có vỏ thẻ trống)
//  Đáy : chỉ 1 dòng phụ đề đậm trên Bottom 18 % (ẩn thanh ĐỀ nhiều viên thuốc)
import React from 'react';
import {FONT} from '../theme';
import {Toan} from '../Toan';
import {chuanTieuDe} from '../chu';
import {emRa, kep01} from '../3d-vector/toan3d';
import {BuocGiai, TheGiai} from './kieu';
import {ChuTron} from './ChuTron';
import {RONG_ND} from './vung';
import {tHienThe, theDangGiang, VUNG_TOI_GIAN} from './toi_gian';
import {RA_TIEU_DE, VAO_TIEU_DE} from './TangTieuDe';

export {VUNG_TOI_GIAN, tHienThe, theDangGiang};

const NGOC = '#2EE6A8';

/* ---------------- T1: một dòng ---------------- */
function DongTieuDe({b, so, mau, a, lech}: {b: BuocGiai; so: number; mau: string; a: number; lech: number}) {
  const td = chuanTieuDe(b.tieu_de || b.nhan || '');
  const co = td.length > 30 ? 40 : td.length > 22 ? 46 : 52;
  return (
    <div data-tieu-de-toi-gian style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, opacity: a, transform: `translateY(${lech}px)`,
      fontFamily: FONT, whiteSpace: 'nowrap'}}>
      <span style={{color: mau, fontWeight: 900, fontSize: co, letterSpacing: 1, fontVariantNumeric: 'tabular-nums'}}>{String(so).padStart(2, '0')}</span>
      <span style={{color: 'rgba(244,247,251,0.35)', fontWeight: 700, fontSize: co * 0.8}}>·</span>
      <span style={{color: '#F4F7FB', fontWeight: 800, fontSize: co, letterSpacing: -0.3, maxWidth: 760, overflow: 'hidden'}}><ChuTron s={td} co={co} mau="#F4F7FB" dam={800} /></span>
    </div>
  );
}

export const TieuDeMotDong: React.FC<{buoc: BuocGiai[]; i: number; t: number; mau: (b: BuocGiai) => string}> = ({buoc, i, t, mau}) => {
  if (i < 0) return null;
  const b = buoc[i], truoc = i > 0 ? buoc[i - 1] : null;
  const dt = t - b.t;
  if (truoc && dt < RA_TIEU_DE) {
    const ra = kep01(dt / RA_TIEU_DE);
    return <DongTieuDe b={truoc} so={i} mau={mau(truoc)} a={1 - ra} lech={-10 * emRa(ra)} />;
  }
  const vao = i === 0 ? emRa(t / 0.4) : emRa((dt - RA_TIEU_DE) / VAO_TIEU_DE);
  return <DongTieuDe b={b} so={i + 1} mau={mau(b)} a={vao} lech={i === 0 ? 0 : 10 * (1 - vao)} />;
};

/* ---------------- T3: một khối công thức ---------------- */
const dongCua = (th: TheGiai): {tex: string[]; chu: string | null} => {
  if (th.loai === 'cong_thuc') return {tex: th.dong.slice(0, 3), chu: null};
  if (th.loai === 'chu') return {tex: [], chu: th.noi_dung};
  if (th.loai === 'casio') return {tex: [], chu: th.ket_qua};
  return {tex: [], chu: th.nhan || ''};
};

function Khoi({th, t0, t, mau, a}: {th: TheGiai; t0: number; t: number; mau: string; a: number}) {
  const {tex, chu} = dongCua(th);
  const chot = !!th.chot;
  const mauNhan = chot ? NGOC : mau;
  const co = chot ? 58 : tex.length > 2 ? 44 : 52;
  const vao = emRa((t - t0) / 0.35);
  const vach = (tren: boolean) => (
    <div style={{position: 'absolute', left: '12%', right: '12%', [tren ? 'top' : 'bottom']: 0, height: chot ? 3 : 2,
      background: `linear-gradient(90deg, transparent, ${mauNhan}, transparent)`, opacity: 0.85} as React.CSSProperties} />
  );
  return (
    <div data-the-giai data-khoi-cong-thuc {...(chot ? {'data-the-chot': '1'} : {})} style={{position: 'absolute', left: 0, right: 0, top: '50%', transform: `translateY(-50%) translateY(${(1 - vao) * 14}px)`,
      opacity: a * vao, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '26px 0 28px',
      background: `linear-gradient(90deg, transparent, ${chot ? 'rgba(46,230,168,0.10)' : 'rgba(255,255,255,0.05)'} 22%, ${chot ? 'rgba(46,230,168,0.10)' : 'rgba(255,255,255,0.05)'} 78%, transparent)`}}>
      <KhoaThuongHieu viTri="the" />
      {vach(true)}
      {tex.map((d, k) => {
        const tk = th.loai === 'cong_thuc' ? Math.max(t0, th.moc?.[k] ?? t0 + k * 0.45) : t0;
        const ak = k === 0 ? 1 : emRa((t - tk) / 0.35);
        return (
          <div key={k} style={{opacity: ak, transform: `translateY(${(1 - ak) * 8}px)`}}>
            <Toan tex={d} size={co} color={k === tex.length - 1 && (tex.length > 1 || chot) ? mauNhan : '#F6F8FB'} maxWidth={RONG_ND - 40} maxHeight={Math.round(co * 1.38 + 0.78 * co * 2)} can="giua" style={{fontWeight: chot ? 800 : 600}} />
          </div>
        );
      })}
      {chu ? (
        <div style={{color: chot ? '#F4FFFB' : '#EEF2F7', fontFamily: FONT, fontWeight: 800, fontSize: 44, lineHeight: 1.2, textAlign: 'center', maxWidth: RONG_ND - 40}}>
          <ChuTron s={chu} co={44} mau={chot ? '#F4FFFB' : '#EEF2F7'} dam={800} />
        </div>
      ) : null}
      {vach(false)}
    </div>
  );
}

export const KhoiCongThuc: React.FC<{buoc: BuocGiai[]; i: number; t: number; mau: (b: BuocGiai) => string}> = ({buoc, i, t, mau}) => {
  if (i < 0) return null;
  const b = buoc[i];
  const nay = theDangGiang(b, t);
  // khối trước đó (thẻ trước cùng bước, hoặc thẻ cuối của bước trước) mờ dần 0,25 s khi khối mới vào -> thay tại chỗ, không chồng
  let cu: {b: BuocGiai; j: number; t0: number} | null = null;
  if (nay) {
    const tr = b.the.map((_, j) => ({j, t0: tHienThe(b, j)})).filter((x) => x.t0 < nay.t0).sort((x, y) => y.t0 - x.t0)[0];
    if (tr) cu = {b, ...tr};
  } else if (i > 0) {
    const bt = buoc[i - 1], x = theDangGiang(bt, b.t);
    if (x) cu = {b: bt, ...x};
  }
  const tRa = nay ? nay.t0 : b.t;
  const aCu = cu ? 1 - kep01((t - tRa) / 0.25) : 0;
  return (
    <div style={{position: 'absolute', inset: 0}}>
      {cu && aCu > 0.01 ? <Khoi th={cu.b.the[cu.j]} t0={cu.t0} t={t} mau={mau(cu.b)} a={aCu} /> : null}
      {nay ? <Khoi th={b.the[nay.j]} t0={nay.t0 + (cu ? 0.12 : 0)} t={t} mau={mau(b)} a={1} /> : null}
    </div>
  );
};

export const RONG_TOI_GIAN = RONG_ND;
