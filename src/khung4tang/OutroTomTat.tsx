import {KhoaThuongHieu} from './KhoaThuongHieu';
// v93 — OUTRO "TÓM TẮT 3 BƯỚC CHIẾN THUẬT" của khung 4 tầng (thay ManKetChuyenNghiep khi có props.khung4tang.tomTat).
// Trên: đáp án lớn xanh ngọc phát sáng | giữa: mô hình 3D gọn ở trạng thái cuối, máy "thở" chậm |
// dưới: 3 dòng 1·2·3 (trái tên chiến thuật màu nhấn, phải công thức KaTeX) | nút LƯU LẠI NGAY!.
// Mỗi vùng có chiều cao cố định, công thức tự co bằng Toan maxWidth -> không dòng nào lấn vào vùng mô hình.
import React from 'react';
import {AbsoluteFill, Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT, SO_DEU} from '../theme';
import {KieuToan, NapPhongToan, Toan} from '../Toan';
import {SanKhau3DVector} from '../3d-vector/SanKhau3DVector';
import {Canh3DV, MAU_3DV} from '../3d-vector/kieu';
import {emRa, kep01} from '../3d-vector/toan3d';
import {NenTramToanHoc} from './NenTramToanHoc';
import type {DongTomTat} from './kieu';
import {LE_ND_V93, RONG_ND_V93, VUNG_OUTRO} from './bo_cuc_v93';
import {ChuTron} from './ChuTron';
import {SanKhau2D} from '../sankhau2d/SanKhau2D';
import {RutTheoBuoc} from '../sankhau2d/RutTheoBuoc';
import {SanKhauKhongGian} from '../khonggian/SanKhauKhongGian';
import type {KhongGianVao} from '../khonggian/kieu';
import type {SanKhau2DVao} from '../sankhau2d/kieu';
import {SanKhauTuSinh, type TuSinhVao} from '../sankhau2d/SanKhauTuSinh';
import {NenKhiQuyen, THEME_DEEP_SPACE_BLUEPRINT} from './NenKhiQuyen';
import {layTheme, THEME_V99, type TenTheme} from './nen_v99';
import {BAT_CTA_THONG_MINH_OUTRO} from './cauHinhTinhChinh';
import {chuanTexHinhHoc, VanBanToan} from '../hinhhoc/KhungHinhHoc';

const NGOC = '#2EE6A8';
const SAN_HO = '#FF5A5F';
const NEN = '#0E1014';
const KHOANG_HO = 20; // v102: khoảng hở tối thiểu (px) giữa đáy sân khấu thu nhỏ và dải nhãn phía trên 3 hộp tóm tắt

// đáp án dạng "a/b" -> phân số; xóa khoảng trắng thừa trước dấu phẩy/dấu chấm; với Hình học chuẩn hóa căn/phân số/ký hiệu KaTeX
export const texDapAn = (s0: string, laHinhHoc = false) => {
  const sach = String(s0 || '').replace(/\s+([,.;:!?])/g, '$1').replace(/\s{2,}/g, ' ').trim();
  if (laHinhHoc) return chuanTexHinhHoc(sach);
  const s = sach.replace(/(\d),(\d)/g, '$1{,}$2');
  return (/^\s*-?\d+(?:[.,]\d+)?\s*\/\s*-?\d+(?:[.,]\d+)?\s*$/.test(s) ? `\\frac{${s.split('/')[0].trim()}}{${s.split('/')[1].trim()}}` : s);
};

// Dọn nhãn bước tóm tắt Outro bị cắt dở giữa ngoặc / giữa cụm từ (VD "Biến cố đối Ā (3" -> "Biến cố đối Ā", "Hàm lợi nhuận bậc" -> "Hàm lợi nhuận").
const TU_TREO_CUOI = /\s+(?:bậc|đường|của|và|với|tại|theo|cho|trong|trên|dưới|giữa|để|khi|vì|do|bằng|là|có|các|những|một)$/iu;
export function chuanNhanTomTat(raw: string): string {
  let s = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  // Xóa đoạn mở ngoặc chưa đóng ở cuối chuỗi ("Biến cố đối Ā (3", "Khóa mặt phụ (S...")
  s = s.replace(/\s*\([^)]*$/, '').trim();
  // Xóa dấu ba chấm cắt thô hoặc dấu câu treo ở cuối
  s = s.replace(/(?:\.{2,}|…)+$/, '').replace(/[,.;:–—-]+$/, '').trim();
  // Xóa từ treo chưa hoàn chỉnh ở cuối cụm khi phần còn lại vẫn đủ nghĩa (>= 2 từ)
  for (let k = 0; k < 2; k++) {
    const next = s.replace(TU_TREO_CUOI, '').trim();
    if (next === s || next.split(/\s+/).length < 2) break;
    s = next;
  }
  return s;
}

// v95: nút CTA = nhãn ngữ nghĩa của LỜI ĐỌC (chuanbi.py cta_tu_loi: ĐĂNG KÝ KÊNH! / LƯU LẠI NGAY! / BÌNH LUẬN NGAY!...)
const IconCta: React.FC<{cta: string}> = ({cta}) => {
  if (/BÌNH LUẬN/.test(cta)) return <svg width={36} height={36} viewBox="0 0 24 24"><path d="M4 4h16v11H9l-5 4z" fill="#fff" /></svg>;
  if (/ĐĂNG KÝ|THEO DÕI/.test(cta)) return <svg width={36} height={36} viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" fill="#fff" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" fill="#fff" /></svg>;
  if (/CHIA SẺ/.test(cta)) return <svg width={36} height={36} viewBox="0 0 24 24"><path d="M14 4l7 7-7 7v-4c-5 0-8 1.5-10 5 1-5 4-9 10-10z" fill="#fff" /></svg>;
  if (/TIM/.test(cta)) return <svg width={36} height={36} viewBox="0 0 24 24"><path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z" fill="#fff" /></svg>;
  return <svg width={36} height={36} viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4z" fill="#fff" /></svg>;
};

// v100.3: chọn câu gợi tương tác theo dạng bài (thứ tự: dãy số -> xác suất -> hàm số -> hình học -> mặc định)
const cauGoiTheoDang = (van: string, khongGian: boolean, loai?: string, hinhPhang = false): string => {
  const s = van.toLowerCase();
  if (/cấp số|dãy số|bông tuyết|koch|u_n|u_\{n/.test(s)) return 'Đổi số bước n lớn hơn thì sao? Bình luận suy nghĩ của bạn!';
  if (/xác suất|tổ hợp|chỉnh hợp|hoán vị|đếm|binom|\\binom|\bc\(|\ba_n\^|p\(a/.test(s) || /rut_mau|so_do_cay|luoi_bayes|cot_phan_phoi/.test(loai || '')) return 'Có ai bị đếm lặp ở bước này không? Comment đáp án của bạn!';
  if (/parabol|hàm số|đồ thị|bậc hai|y\s*=|f\(x\)/.test(s) || /kinh_te_do_thi/.test(loai || '')) return 'Bạn còn cách lập hàm nào nhanh hơn không? Bình luận bên dưới!';
  // T8 kiểm toán phiên 3: "mặt phẳng phụ" CHỈ cho hình không gian; hình phẳng (tam giác, đường tròn, tứ giác…) có câu gợi riêng
  if (khongGian || (!hinhPhang && /mặt phẳng|hình chóp|lăng trụ|thiết diện/.test(s))) return 'Bạn nhìn ra mặt phẳng phụ trong mấy giây? Bình luận nhé!';
  if (hinhPhang || /tam giác|đường tròn|tứ giác|nội tiếp|vuông góc|song song/.test(s)) return 'Bạn thấy hướng chứng minh sau mấy giây? Bình luận nhé!';
  return 'Lưu lại ôn nhanh • Bình luận dạng bài bạn muốn giải tiếp!';
};

export const OutroTomTat: React.FC<{mon?: string; giuHinh?: boolean; dapAn: string; nhanKetQua?: string; tomTat: DongTomTat[]; canh: Canh3DV | null; sanKhau?: SanKhau2DVao | null; khongGian?: KhongGianVao | null; tCuoi: number; thuongHieu?: string; cta?: string; tuSinh?: TuSinhVao | null; theme?: TenTheme}> = ({mon, giuHinh, dapAn, nhanKetQua, tomTat, canh: canhVao, sanKhau, khongGian, tCuoi, thuongHieu, cta = 'LƯU LẠI NGAY!', tuSinh, theme}) => {
  if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(dapAn)) throw new Error('DAP_AN_NGAY: kiểm tra phân số gốc');
  const laHinhHoc = !!khongGian || /HINH_|hình học/i.test(mon || '');
  const laKhongGian = !!khongGian || /HINH_KHONG_GIAN/i.test(mon || '');
  const th = laKhongGian ? THEME_DEEP_SPACE_BLUEPRINT : laHinhHoc ? (layTheme(theme) || THEME_V99.blueprint) : layTheme(theme);
  // v95: Outro không làm mờ phần nào của mô hình (bỏ nhấn mạnh 30 %) -> mọi nhãn kích thước sáng rõ
  const canh = React.useMemo(() => (canhVao ? {...canhVao, buoc: canhVao.buoc.map((b) => ({...b, nhanManh: []}))} : null), [canhVao]);
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const vao = (tu: number, d = 0.4) => emRa((t - tu) / d);
  const aDap = spring({frame: f - 3, fps, config: {damping: 15, stiffness: 140, mass: 0.8}});
  const tDong = (k: number) => (laHinhHoc ? 0.35 + k * 0.24 : 0.9 + k * 0.45);
  const tNut = laHinhHoc ? tDong(Math.min(3, tomTat.length)) + 0.18 : tDong(Math.min(3, tomTat.length)) + 0.3;
  const sNut = spring({frame: f - Math.round(tNut * fps), fps, config: {damping: 12, stiffness: 160, mass: 0.7}});
  const sGoi = spring({frame: f - Math.round((tNut + (laHinhHoc ? 0.2 : 0.35)) * fps), fps, config: {damping: 16, stiffness: 120, mass: 0.8}});
  const sLuu = spring({frame: f - Math.round((laHinhHoc ? 0.22 : 0.6) * fps), fps, config: {damping: 16, stiffness: 130, mass: 0.8}});
  // v100.3: câu gợi bình luận khớp dạng bài (suy từ đáp án + tóm tắt + loại sân khấu); 2 icon nảy 1 lần khi thanh vào
  const cauGoi = React.useMemo(() => cauGoiTheoDang(`${dapAn} ${tomTat.map((d) => `${d.chien_thuat} ${d.cong_thuc || ''}`).join(' ')}`, laKhongGian, (sanKhau as {loai?: string} | null | undefined)?.loai, laHinhHoc && !laKhongGian), [dapAn, tomTat, laKhongGian, laHinhHoc, sanKhau]);
  const tNayIcon = (t - (tNut + 0.35) - 0.25) / 0.5;
  const nayIcon = tNayIcon > 0 && tNayIcon < 1 ? 1 + 0.28 * Math.sin(Math.PI * tNayIcon) : 1;
  const nhun = t > tNut + 0.5? 1 + 0.04 * Math.max(0, Math.sin(((t - tNut - 0.5) * 2 * Math.PI) / 0.9)) : 1;
  const sang = 0.8 + 0.2 * Math.sin((t * 2 * Math.PI) / 2.2);
  const V = VUNG_OUTRO;
  // v102: một sân khấu chính duy nhất + khoảng hở cứng giữa đáy sân khấu và nhãn "LƯU LẠI ÔN NHANH" (đỉnh nhãn = V.dong.y - 46)
  const coTuSinhHopLe = Boolean(tuSinh?.lop?.some((l) => Boolean(l.svg && l.svg.trim())));
  const chon: 'tu_sinh' | 'khong_gian' | 'san_khau' | 'canh' | null = coTuSinhHopLe ? 'tu_sinh' : khongGian ? 'khong_gian' : sanKhau ? 'san_khau' : canh ? 'canh' : null;
  const coNhanLuu = BAT_CTA_THONG_MINH_OUTRO && tomTat.length > 0;
  // Hình học không có sân khấu 3D (HINH_PHANG): nâng cụm thẻ tóm tắt lên giữa khung, tăng chiều cao thẻ để cân đối, không thừa khoảng trống đáy
  const laHinhPhangOutro = laHinhHoc && !chon;
  const yDong = laHinhPhangOutro ? 560 : V.dong.y;
  const hDong = laHinhPhangOutro ? 186 : V.dong.h;
  const cachDong = laHinhPhangOutro ? 22 : V.dong.cach;
  const yNut = laHinhPhangOutro ? 1368 : khongGian ? 1420 : V.nut.y;
  const caoSan = coNhanLuu ? Math.min(V.san.h, yDong - 46 - KHOANG_HO - V.san.y) : V.san.h;
  const monHien = laKhongGian ? 'HINH_KHONG_GIAN' : mon;
  // v102: vào Outro nối liền Khung4Tang (khung cuối còn 35 % độ đậm: 1 - 0,65 * thoat) -> không còn nháy nền đen 1-2 khung
  return (
    <AbsoluteFill data-vung="outro" style={{fontFamily: FONT, background: laHinhHoc ? (laKhongGian ? '#050C1B' : '#081A3A') : NEN, opacity: 0.35 + 0.65 * kep01(f / 6), ...SO_DEU}}>
      <KieuToan />
      <NapPhongToan />
      {/* v99.1: Outro dùng cùng nền khí quyển với phần giải (đứng yên, không vệt quét) */}
      {th ? <NenKhiQuyen th={th} t={tCuoi + t} mocBuoc={[]} tamSanKhau={V.san.y + V.san.h / 2} mauNhan={NGOC} phoiCanh3D={laKhongGian} />
        : <NenTramToanHoc t={tCuoi + t} mauNhan={khongGian ? MAU_3DV.ngoc : '#FBBF24'} tamSanKhau={V.san.y + V.san.h / 2} kieu={khongGian ? 'v95' : 'v981'} />}
      {/* v96: nội dung trong khung 0..950 (vùng an toàn TikTok: phải 12 %, trên 11 %, đáy 18 %) */}
      <div style={{position: 'absolute', left: LE_ND_V93, top: 0, width: RONG_ND_V93, height: '100%'}}>
      <KhoaThuongHieu viTri="outro" mon={monHien} />

      {/* đáp án phát sáng — cố định căn từ trên xuống dưới Story Math để không bao giờ đè dòng thương hiệu khi đáp án là phân số cao */}
      <div style={{position: 'absolute', left: 60, right: 60, top: V.dapAn.y + 52, height: V.dapAn.h - 46, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', gap: laHinhHoc ? 10 : 8,
        opacity: kep01(aDap * 1.5), transform: `scale(${0.88 + 0.12 * aDap})`}}>
        <div data-va-cham="outro_nhan_dap_an" style={{height: 38, padding: '0 22px', borderRadius: 22, display: 'flex', alignItems: 'center', color: NGOC, border: `1.5px solid ${NGOC}`, background: `${NGOC}18`, fontWeight: 900, fontSize: 22, letterSpacing: 1.2, flexShrink: 0}}>{nhanKetQua ? nhanKetQua.toUpperCase() : 'ĐÁP ÁN'}</div>
        <div data-va-cham="outro_dap_an" style={{padding: laHinhHoc ? '8px 30px' : '8px 34px', borderRadius: 24, background: `${NGOC}12`, border: `2px solid ${NGOC}AA`, boxShadow: `0 0 ${30 * sang}px ${NGOC}55, inset 0 0 24px ${NGOC}18`, textShadow: `0 0 18px ${NGOC}88`}}>
          {laHinhHoc ? (
            <VanBanToan raw={texDapAn(dapAn || '?', true)} size={48} minSize={32} color="#F4FFFB" fontWeight={800} maxWidth={690} align="center" />
          ) : (
            <Toan tex={texDapAn(dapAn || '?')} size={60} color="#F4FFFB" maxWidth={690} maxHeight={106} />
          )}
        </div>
      </div>

      {/* v102: Outro chỉ dựng ĐÚNG MỘT sân khấu chính (ưu tiên tự sinh hợp lệ > hình không gian > sân khấu 2D > khuôn 3D), thu vừa vùng giữa
          và chừa >= KHOANG_HO px trên nhãn "LƯU LẠI ÔN NHANH" -> không bao giờ ghép chồng hai sân khấu hay đè nhãn. */}
      {chon ? (
        <div data-vung="outro_san" data-outro-san-khau={chon} style={{position: 'absolute', left: 0, top: V.san.y, width: RONG_ND_V93, height: caoSan, overflow: 'hidden', opacity: giuHinh ? 1 : vao(0.3, 0.6)}}>
          {chon === 'tu_sinh' && tuSinh ? <SanKhauTuSinh ts={tuSinh} t={tCuoi + 30 + t} fps={fps} rong={RONG_ND_V93} cao={caoSan} /> : null}
          {chon === 'khong_gian' && khongGian ? <SanKhauKhongGian kg={khongGian} t={tCuoi} rong={RONG_ND_V93} cao={caoSan} lechMay={{k: 0.92}} /> : null}
          {chon === 'san_khau' && sanKhau ? (
            <div style={{position: 'absolute', left: 0, top: 0, width: RONG_ND_V93, height: 648, transform: `scale(${caoSan / 648})`, transformOrigin: 'center top', marginLeft: 0}}>
              {sanKhau.loai === 'rut_mau' && sanKhau.mode ? <RutTheoBuoc sk={sanKhau} t={tCuoi} W={RONG_ND_V93} H={648} final /> :
                <SanKhau2D sk={sanKhau} t={tCuoi + t} rong={RONG_ND_V93} cao={648} mauNhan={MAU_3DV.ngoc} />}
            </div>
          ) : null}
          {chon === 'canh' && canh ? <SanKhau3DVector canh={canh} t={tCuoi + t} rong={RONG_ND_V93} cao={caoSan} tongGiay={tCuoi} lechMay={{n: 6 * Math.sin((t * 2 * Math.PI) / 7), k: 0.86}} /> : null}
        </div>
      ) : null}

      {/* v100.3: thẻ nhắc Lưu / chụp màn hình phía trên cụm 3 hộp (không đổi vị trí 3 hộp cho THUC_TE/XAC_SUAT) */}
      {BAT_CTA_THONG_MINH_OUTRO && tomTat.length ? (
        <div data-nhac-luu style={{position: 'absolute', left: 0, right: 0, top: yDong - 46, height: 34, display: 'flex', justifyContent: 'center', alignItems: 'center',
          opacity: kep01(sLuu * 1.6), transform: `translateY(${(1 - sLuu) * 10}px)`}}>
          <div data-va-cham="outro_nhac_luu" style={{height: 34, padding: '0 16px', borderRadius: 17, display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', background: 'rgba(10,12,18,0.86)',
            border: '1px solid rgba(251,191,36,0.62)', color: '#FBBF24', fontWeight: 800, fontSize: 18, letterSpacing: 0.6}}>
            <svg width={18} height={18} viewBox="0 0 24 24" style={{flexShrink: 0}}><path d="M6 3h12v18l-6-4-6 4z" fill="#FBBF24" /></svg>
            LƯU LẠI ÔN NHANH • CHỤP MÀN HÌNH CÔNG THỨC
          </div>
        </div>
      ) : null}
      {/* v97 hình không gian: 3 ý tóm tắt trên MỘT thẻ HUD kính có mật độ cân đối, đầy đủ 3 dòng */}
      {khongGian ? (
        <div data-tom-tat-gop style={{position: 'absolute', left: 0, right: 0, top: yDong, height: 3 * hDong + 2 * cachDong - 12, display: 'flex', flexDirection: 'column',
          borderRadius: 22, background: 'linear-gradient(180deg, rgba(11,29,62,0.92), rgba(6,17,38,0.95))',
          border: '1px solid rgba(125,211,252,0.30)', boxShadow: '0 14px 30px rgba(2,8,20,0.48), inset 0 1px 0 rgba(191,219,254,0.18)',
          overflow: 'hidden', opacity: Math.max(0.9, vao(tDong(0)))}}>
          {tomTat.slice(0, 3).map((d, k) => {
            const a = vao(tDong(k));
            const mau = MAU_3DV[d.mau || (['cyan', 'vang', 'ngoc'] as const)[k]] || MAU_3DV.cyan;
            const nhanSach = chuanNhanTomTat(d.chien_thuat);
            const coNhan = nhanSach.length > 15 ? 24 : 28;
            return (
              <div key={k} data-tom-tat data-va-cham="outro_tom_tat" style={{position: 'relative', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '6px 24px 6px 28px', opacity: a,
                borderTop: k ? '1px solid rgba(147,197,253,0.14)' : 'none', transform: `translateY(${(1 - a) * 8}px)`}}>
                <div style={{position: 'absolute', left: 0, top: 14, bottom: 14, width: 4, borderRadius: '0 3px 3px 0', background: mau}} />
                <div style={{display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: '0 1 330px', maxWidth: 336}}>
                  <span style={{padding: '3px 10px', borderRadius: 9, flexShrink: 0, background: `${mau}22`, border: `1px solid ${mau}66`, color: mau, fontWeight: 900, fontSize: 23, fontVariantNumeric: 'tabular-nums'}}>{String(k + 1).padStart(2, '0')}</span>
                  <span style={{color: mau, fontWeight: 800, fontSize: coNhan, lineHeight: 1.15, whiteSpace: 'normal', textWrap: 'balance', overflow: 'hidden', maxHeight: 2 * 1.18 * coNhan}}>
                    <ChuTron s={nhanSach} co={coNhan} mau={mau} dam={800} />
                  </span>
                </div>
                {d.cong_thuc ? (
                  <div style={{flex: 1, minWidth: 0, display: 'flex', justifyContent: 'flex-end', overflow: 'hidden'}}>
                    <VanBanToan raw={chuanTexHinhHoc(d.cong_thuc)} size={33} minSize={25} color="#F4F7FB" fontWeight={700} maxWidth={410} align="left" />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
      {/* 3 dòng tóm tắt */}
      {(khongGian ? [] : tomTat.slice(0, 3)).map((d, k) => {
        const a = vao(tDong(k));
        const mau = MAU_3DV[d.mau || (laHinhPhangOutro ? (['cyan', 'vang', 'ngoc'] as const)[k] : (['cyan', 'vang', 'hong'] as const)[k])] || MAU_3DV.cyan;
        const nhanSach = chuanNhanTomTat(d.chien_thuat);
        return (
          <div key={k} data-tom-tat data-va-cham="outro_tom_tat" style={{position: 'absolute', left: 0, right: 0, top: yDong + k * (hDong + cachDong), height: hDong, display: 'flex', flexDirection: laHinhPhangOutro ? 'column' : 'row', justifyContent: laHinhPhangOutro ? 'center' : 'flex-start', alignItems: laHinhPhangOutro ? 'flex-start' : 'center', gap: laHinhPhangOutro ? 10 : 22,
            padding: laHinhPhangOutro ? '16px 26px 16px 32px' : '0 26px', borderRadius: 20,
            background: laHinhPhangOutro ? 'linear-gradient(180deg, rgba(11,29,62,0.92), rgba(6,17,38,0.95))' : 'rgba(20,24,32,0.92)',
            border: `1px solid ${mau}66`, boxShadow: `0 10px 26px rgba(2,8,20,0.42), 0 0 18px ${mau}1F`,
            opacity: a, transform: `translateX(${(1 - a) * -26}px)`, boxSizing: 'border-box'}}>
            {laHinhPhangOutro ? (
              <>
                <div style={{position: 'absolute', left: 0, top: 16, bottom: 16, width: 5, borderRadius: '0 3px 3px 0', background: mau, boxShadow: `0 0 12px ${mau}99`}} />
                <div style={{display: 'flex', alignItems: 'center', gap: 12, width: '100%'}}>
                  <span style={{padding: '3px 12px', borderRadius: 10, background: `${mau}24`, border: `1px solid ${mau}77`, color: mau, fontWeight: 900, fontSize: 24, ...SO_DEU}}>{String(k + 1).padStart(2, '0')}</span>
                  <VanBanToan raw={nhanSach} size={32} minSize={26} color={mau} fontWeight={800} maxWidth={RONG_ND_V93 - 130} wrap align="left" />
                </div>
                {d.cong_thuc ? (
                  <div style={{width: '100%', paddingLeft: 4}}>
                    <VanBanToan raw={chuanTexHinhHoc(d.cong_thuc)} size={34} minSize={26} color="#F4F7FB" fontWeight={700} maxWidth={RONG_ND_V93 - 70} wrap align="left" />
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <span style={{width: 54, height: 54, flexShrink: 0, borderRadius: 27, background: mau, color: NEN, fontWeight: 900, fontSize: 28, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{k + 1}</span>
                {/* v99.1: nhãn dài xuống tối đa 2 dòng gọn (không cắt "..."): <= 14 ký tự 30 px một dòng, dài hơn 26 px hai dòng */}
                <span style={{width: giuHinh && nhanSach.length < 12 ? 194 : 268, flexShrink: 0, color: mau, fontWeight: 800, fontSize: nhanSach.length > 14 ? 26 : 30, lineHeight: 1.15,
                  whiteSpace: nhanSach.length > 14 ? 'normal' : 'nowrap', textWrap: 'balance', overflow: 'hidden', maxHeight: 2 * 1.18 * 30}}><ChuTron s={nhanSach} co={nhanSach.length > 14 ? 26 : 30} mau={mau} dam={800} /></span>
                <span style={{flex: 1, minWidth: 0, display: 'flex', justifyContent: 'flex-end', overflow: 'hidden'}}>
                  {d.cong_thuc ? <Toan tex={d.cong_thuc} size={38} color="#F4F7FB" maxWidth={380} maxHeight={hDong - 22} /> : null}
                </span>
              </>
            )}
          </div>
        );
      })}

      {/* nút lưu */}
      {/* v99.6: dòng gợi tương tác, nằm trọn trong vùng an toàn (đáy <= 1574, trái/phải 130..950); nút nhích lên 16 px nhường chỗ */}
      {BAT_CTA_THONG_MINH_OUTRO ? (
        <div data-goi-tuong-tac style={{position: 'absolute', left: 0, right: 0, top: laHinhHoc ? (khongGian ? 1424 : 1244) : yNut + 88, height: 44, display: 'flex', justifyContent: 'center', alignItems: 'center',
          opacity: kep01(sGoi * 1.6), transform: `translateY(${(1 - sGoi) * 12}px)`}}>
          <div data-va-cham="outro_cta" style={{height: 44, maxWidth: 780, padding: '0 20px', borderRadius: 22, display: 'flex', alignItems: 'center', gap: 10, boxSizing: 'border-box', whiteSpace: 'nowrap',
            background: 'linear-gradient(180deg, rgba(34,40,52,0.9), rgba(12,14,20,0.94))', border: '1px solid rgba(56,189,248,0.5)', boxShadow: '0 0 16px rgba(56,189,248,0.18)',
            color: '#F1F5FA', fontWeight: 800, fontSize: cauGoi.length > 50 ? 20 : 22}}>
            <svg width={26} height={26} viewBox="0 0 24 24" style={{flexShrink: 0, transform: `scale(${nayIcon})`}}><path d="M4 4h16v12H9l-5 4z" fill="#38BDF8" /></svg>
            <span>{cauGoi}</span>
            <svg width={26} height={26} viewBox="0 0 24 24" style={{flexShrink: 0, transform: `scale(${nayIcon})`}}><path d="M6 3h12v18l-6-4-6 4z" fill="#FBBF24" /></svg>
          </div>
        </div>
      ) : (
      <div data-goi-tuong-tac data-va-cham="outro_cta" style={{position: 'absolute', left: 0, right: 0, top: laHinhHoc ? (khongGian ? 1428 : 1252) : yNut + 98, height: 30, display: 'flex', justifyContent: 'center', alignItems: 'center',
        opacity: kep01(sGoi * 1.6), transform: `translateY(${(1 - sGoi) * 12}px)`, color: 'rgba(230,237,245,0.82)', fontWeight: 700, fontSize: 24, whiteSpace: 'nowrap'}}>
        Lưu lại ôn nhanh • Bình luận dạng bài bạn muốn giải tiếp!
      </div>
      )}
      {/* Hình học đã có tiêu đề Story Math • Chuyên mục ở đầu màn hình -> bỏ dòng lặp phía trên hộp CTA */}
      {laHinhHoc ? null : (
        <div style={{position: 'absolute', left: 0, right: 0, top: yNut - 16, display: 'flex', justifyContent: 'center', opacity: kep01(sNut * 2)}}>
          <div data-va-cham="outro_cta" style={{height: 96, padding: '0 54px', borderRadius: 48, display: 'flex', alignItems: 'center', gap: 16, background: `linear-gradient(180deg, #FF7A7E, ${SAN_HO} 55%, #E2393F)`,
            boxShadow: `0 7px 0 #9E1F25, 0 0 34px rgba(255,90,95,0.45)`, transform: `scale(${(0.6 + 0.4 * sNut) * nhun})`, color: '#fff', fontWeight: 900, fontSize: 38, letterSpacing: 0.8, whiteSpace: 'nowrap'}}>
            <IconCta cta={cta} />
            {cta}
          </div>
        </div>
      )}
      {/* v95: whoosh gọn khi bật Outro + chime sáng lúc đáp án nổi lên (SFX ~ -13 dB so với giọng) */}
      </div>
      <Sequence from={0} durationInFrames={20} layout="none"><Audio src={staticFile('sfx/whoosh.wav')} volume={0.2} /></Sequence>
      <Sequence from={4} durationInFrames={70} layout="none"><Audio src={staticFile('sfx/ting.wav')} volume={0.24} /></Sequence>
      <Sequence from={Math.round(tNut * fps)} durationInFrames={20} layout="none"><Audio src={staticFile('sfx/pop.wav')} volume={0.22} /></Sequence>
    </AbsoluteFill>
  );
};
