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
import {SanKhauKhongGian} from '../khonggian/SanKhauKhongGian';
import type {KhongGianVao} from '../khonggian/kieu';
import type {SanKhau2DVao} from '../sankhau2d/kieu';
import {SanKhauTuSinh, type TuSinhVao} from '../sankhau2d/SanKhauTuSinh';
import {NenKhiQuyen} from './NenKhiQuyen';
import {layTheme, type TenTheme} from './nen_v99';
import {BAT_CTA_THONG_MINH_OUTRO} from './cauHinhTinhChinh';

const NGOC = '#2EE6A8';
const SAN_HO = '#FF5A5F';
const NEN = '#0E1014';

// đáp án dạng "a/b" -> phân số
const texDapAn = (s0: string) => { const s = s0.replace(/(\d),(\d)/g, '$1{,}$2'); return (/^\s*-?\d+(?:[.,]\d+)?\s*\/\s*-?\d+(?:[.,]\d+)?\s*$/.test(s) ? `\\frac{${s.split('/')[0].trim()}}{${s.split('/')[1].trim()}}` : s); };

// v95: nút CTA = nhãn ngữ nghĩa của LỜI ĐỌC (chuanbi.py cta_tu_loi: ĐĂNG KÝ KÊNH! / LƯU LẠI NGAY! / BÌNH LUẬN NGAY!...)
const IconCta: React.FC<{cta: string}> = ({cta}) => {
  if (/BÌNH LUẬN/.test(cta)) return <svg width={36} height={36} viewBox="0 0 24 24"><path d="M4 4h16v11H9l-5 4z" fill="#fff" /></svg>;
  if (/ĐĂNG KÝ|THEO DÕI/.test(cta)) return <svg width={36} height={36} viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" fill="#fff" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" fill="#fff" /></svg>;
  if (/CHIA SẺ/.test(cta)) return <svg width={36} height={36} viewBox="0 0 24 24"><path d="M14 4l7 7-7 7v-4c-5 0-8 1.5-10 5 1-5 4-9 10-10z" fill="#fff" /></svg>;
  if (/TIM/.test(cta)) return <svg width={36} height={36} viewBox="0 0 24 24"><path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z" fill="#fff" /></svg>;
  return <svg width={36} height={36} viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4z" fill="#fff" /></svg>;
};

// v100.3: chọn câu gợi tương tác theo dạng bài (thứ tự: dãy số -> xác suất -> hàm số -> hình học -> mặc định)
const cauGoiTheoDang = (van: string, khongGian: boolean, loai?: string): string => {
  const s = van.toLowerCase();
  if (/cấp số|dãy số|bông tuyết|koch|u_n|u_\{n/.test(s)) return 'Đổi số bước n lớn hơn thì sao? Bình luận suy nghĩ của bạn!';
  if (/xác suất|tổ hợp|chỉnh hợp|hoán vị|đếm|binom|\\binom|\bc\(|\ba_n\^|p\(a/.test(s) || /rut_mau|so_do_cay|luoi_bayes|cot_phan_phoi/.test(loai || '')) return 'Có ai bị đếm lặp ở bước này không? Comment đáp án của bạn!';
  if (/parabol|hàm số|đồ thị|bậc hai|y\s*=|f\(x\)/.test(s) || /kinh_te_do_thi/.test(loai || '')) return 'Bạn còn cách lập hàm nào nhanh hơn không? Bình luận bên dưới!';
  if (khongGian || /mặt phẳng|hình chóp|lăng trụ|hình hộp|thiết diện|vuông góc|song song|tam giác|đường tròn/.test(s)) return 'Bạn nhìn ra mặt phẳng phụ trong mấy giây? Bình luận nhé!';
  return 'Lưu lại ôn nhanh • Bình luận dạng bài bạn muốn giải tiếp!';
};

export const OutroTomTat: React.FC<{dapAn: string; tomTat: DongTomTat[]; canh: Canh3DV | null; sanKhau?: SanKhau2DVao | null; khongGian?: KhongGianVao | null; tCuoi: number; thuongHieu?: string; cta?: string; tuSinh?: TuSinhVao | null; theme?: TenTheme}> = ({dapAn, tomTat, canh: canhVao, sanKhau, khongGian, tCuoi, thuongHieu, cta = 'LƯU LẠI NGAY!', tuSinh, theme}) => {
  const th = khongGian ? null : layTheme(theme);
  // v95: Outro không làm mờ phần nào của mô hình (bỏ nhấn mạnh 30 %) -> mọi nhãn kích thước sáng rõ
  const canh = React.useMemo(() => (canhVao ? {...canhVao, buoc: canhVao.buoc.map((b) => ({...b, nhanManh: []}))} : null), [canhVao]);
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const vao = (tu: number, d = 0.4) => emRa((t - tu) / d);
  const aDap = spring({frame: f - 3, fps, config: {damping: 15, stiffness: 140, mass: 0.8}});
  const tDong = (k: number) => 0.9 + k * 0.45;
  const tNut = tDong(Math.min(3, tomTat.length)) + 0.3;
  const sNut = spring({frame: f - Math.round(tNut * fps), fps, config: {damping: 12, stiffness: 160, mass: 0.7}});
  const sGoi = spring({frame: f - Math.round((tNut + 0.35) * fps), fps, config: {damping: 16, stiffness: 120, mass: 0.8}});
  const sLuu = spring({frame: f - Math.round(0.6 * fps), fps, config: {damping: 16, stiffness: 130, mass: 0.8}});
  // v100.3: câu gợi bình luận khớp dạng bài (suy từ đáp án + tóm tắt + loại sân khấu); 2 icon nảy 1 lần khi thanh vào
  const cauGoi = React.useMemo(() => cauGoiTheoDang(`${dapAn} ${tomTat.map((d) => `${d.chien_thuat} ${d.cong_thuc || ''}`).join(' ')}`, !!khongGian, (sanKhau as {loai?: string} | null | undefined)?.loai), [dapAn, tomTat, khongGian, sanKhau]);
  const tNayIcon = (t - (tNut + 0.35) - 0.25) / 0.5;
  const nayIcon = tNayIcon > 0 && tNayIcon < 1 ? 1 + 0.28 * Math.sin(Math.PI * tNayIcon) : 1;
  const nhun = t > tNut + 0.5? 1 + 0.04 * Math.max(0, Math.sin(((t - tNut - 0.5) * 2 * Math.PI) / 0.9)) : 1;
  const sang = 0.8 + 0.2 * Math.sin((t * 2 * Math.PI) / 2.2);
  const V = VUNG_OUTRO;
  return (
    <AbsoluteFill data-vung="outro" style={{fontFamily: FONT, background: NEN, opacity: kep01(f / 8), ...SO_DEU}}>
      <KieuToan />
      <NapPhongToan />
      {/* v99.1: Outro dùng cùng nền khí quyển với phần giải (đứng yên, không vệt quét) */}
      {th ? <NenKhiQuyen th={th} t={tCuoi + t} mocBuoc={[]} tamSanKhau={V.san.y + V.san.h / 2} mauNhan={NGOC} />
        : <NenTramToanHoc t={tCuoi + t} mauNhan={khongGian ? MAU_3DV.ngoc : '#FBBF24'} tamSanKhau={V.san.y + V.san.h / 2} kieu={khongGian ? 'v95' : 'v981'} />}
      {/* v96: nội dung trong khung 0..950 (vùng an toàn TikTok: phải 12 %, trên 11 %, đáy 18 %) */}
      <div style={{position: 'absolute', left: LE_ND_V93, top: 0, width: RONG_ND_V93, height: '100%'}}>
      {thuongHieu ? <div data-kd-bo="1" style={{position: 'absolute', top: 60, right: 44, fontWeight: 800, fontSize: 22, color: 'rgba(230,237,245,0.5)'}}>{thuongHieu}</div> : null}

      {/* đáp án phát sáng */}
      <div style={{position: 'absolute', left: 60, right: 60, top: V.dapAn.y, height: V.dapAn.h, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14,
        opacity: kep01(aDap * 1.5), transform: `scale(${0.88 + 0.12 * aDap})`}}>
        <div style={{height: 44, padding: '0 22px', borderRadius: 22, display: 'flex', alignItems: 'center', color: NGOC, border: `1.5px solid ${NGOC}`, background: `${NGOC}18`, fontWeight: 900, fontSize: 24, letterSpacing: 1.2}}>ĐÁP ÁN</div>
        <div style={{padding: '12px 34px', borderRadius: 24, background: `${NGOC}12`, border: `2px solid ${NGOC}AA`, boxShadow: `0 0 ${30 * sang}px ${NGOC}55, inset 0 0 24px ${NGOC}18`, textShadow: `0 0 18px ${NGOC}88`}}>
          <Toan tex={texDapAn(dapAn || '?')} size={64} color="#F4FFFB" maxWidth={690} />
        </div>
      </div>

      {/* v96: sân khấu 2D ở trạng thái cuối (thu nhỏ vừa vùng giữa) */}
      {sanKhau ? (
        <div data-vung="outro_san" style={{position: 'absolute', left: 0, top: V.san.y, width: RONG_ND_V93, height: V.san.h, overflow: 'hidden', opacity: vao(0.3, 0.6)}}>
          <div style={{position: 'absolute', left: 0, top: 0, width: RONG_ND_V93, height: 648, transform: `scale(${V.san.h / 648})`, transformOrigin: 'center top', marginLeft: 0}}>
            <SanKhau2D sk={sanKhau} t={tCuoi + t} rong={RONG_ND_V93} cao={648} mauNhan={MAU_3DV.ngoc} />
          </div>
        </div>
      ) : null}
      {/* v99.1: sân khấu tự sinh ở trạng thái cuối (mọi lớp đã hiện, nhóm thay nhau giữ lớp cuối), thu vừa vùng giữa */}
      {tuSinh && tuSinh.lop?.length && !sanKhau ? (
        <div data-vung="outro_san" style={{position: 'absolute', left: 0, top: V.san.y, width: RONG_ND_V93, height: V.san.h, overflow: 'hidden', opacity: vao(0.3, 0.6)}}>
          <SanKhauTuSinh ts={tuSinh} t={tCuoi + 30 + t} fps={fps} rong={RONG_ND_V93} cao={V.san.h} />
        </div>
      ) : null}
      {/* v97: hình không gian ở trạng thái cuối (góc khóa cuối, không thở) */}
      {khongGian ? (
        <div data-vung="outro_san" style={{position: 'absolute', left: 0, top: V.san.y, width: RONG_ND_V93, height: V.san.h, overflow: 'hidden', opacity: vao(0.3, 0.6)}}>
          <SanKhauKhongGian kg={khongGian} t={tCuoi} rong={RONG_ND_V93} cao={V.san.h} lechMay={{k: 0.92}} />
        </div>
      ) : null}
      {/* mô hình 3D gọn, trạng thái cuối */}
      {canh ? (
        <div data-vung="outro_san" style={{position: 'absolute', left: 0, top: V.san.y, width: RONG_ND_V93, height: V.san.h, overflow: 'hidden', opacity: vao(0.3, 0.6)}}>
          <SanKhau3DVector canh={canh} t={tCuoi + t} rong={RONG_ND_V93} cao={V.san.h} tongGiay={tCuoi} lechMay={{n: 6 * Math.sin((t * 2 * Math.PI) / 7), k: 0.86}} />
        </div>
      ) : null}

      {/* v100.3: thẻ nhắc Lưu / chụp màn hình phía trên cụm 3 hộp (không đổi vị trí 3 hộp) */}
      {BAT_CTA_THONG_MINH_OUTRO && tomTat.length ? (
        <div data-nhac-luu style={{position: 'absolute', left: 0, right: 0, top: V.dong.y - 46, height: 34, display: 'flex', justifyContent: 'center', alignItems: 'center',
          opacity: kep01(sLuu * 1.6), transform: `translateY(${(1 - sLuu) * 10}px)`}}>
          <div style={{height: 34, padding: '0 16px', borderRadius: 17, display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', background: 'rgba(10,12,18,0.82)',
            border: '1px solid rgba(251,191,36,0.55)', color: '#FBBF24', fontWeight: 800, fontSize: 18, letterSpacing: 0.6}}>
            <svg width={18} height={18} viewBox="0 0 24 24" style={{flexShrink: 0}}><path d="M6 3h12v18l-6-4-6 4z" fill="#FBBF24" /></svg>
            LƯU LẠI ÔN NHANH • CHỤP MÀN HÌNH CÔNG THỨC
          </div>
        </div>
      ) : null}
      {/* v97 hình không gian: 3 ý tóm tắt trên MỘT tấm nền mờ, ngăn bằng đường kẻ siêu mảnh, căn giữa (không 3 hộp rời) */}
      {khongGian ? (
        <div data-tom-tat-gop style={{position: 'absolute', left: 0, right: 0, top: V.dong.y, height: 3 * V.dong.h + 2 * V.dong.cach, display: 'flex', flexDirection: 'column',
          borderRadius: 26, background: 'linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.03))', opacity: vao(tDong(0))}}>
          {tomTat.slice(0, 3).map((d, k) => {
            const a = vao(tDong(k));
            const mau = MAU_3DV[d.mau || (['cyan', 'vang', 'hong'] as const)[k]] || MAU_3DV.cyan;
            return (
              <div key={k} data-tom-tat style={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '0 26px', opacity: a,
                borderTop: k ? '1px solid rgba(255,255,255,0.09)' : 'none', transform: `translateY(${(1 - a) * 10}px)`}}>
                <span style={{color: mau, fontWeight: 900, fontSize: 30, fontVariantNumeric: 'tabular-nums'}}>{String(k + 1).padStart(2, '0')}</span>
                <span style={{color: mau, fontWeight: 800, fontSize: d.chien_thuat.length > 14 ? 28 : 32, whiteSpace: 'nowrap', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis'}}>
                  <ChuTron s={d.chien_thuat} co={d.chien_thuat.length > 14 ? 28 : 32} mau={mau} dam={800} />
                </span>
                {d.cong_thuc ? <Toan tex={d.cong_thuc} size={36} color="#F4F7FB" maxWidth={380} /> : null}
              </div>
            );
          })}
        </div>
      ) : null}
      {/* 3 dòng tóm tắt */}
      {(khongGian ? [] : tomTat.slice(0, 3)).map((d, k) => {
        const a = vao(tDong(k));
        const mau = MAU_3DV[d.mau || (['cyan', 'vang', 'hong'] as const)[k]] || MAU_3DV.cyan;
        return (
          <div key={k} data-tom-tat style={{position: 'absolute', left: 0, right: 0, top: V.dong.y + k * (V.dong.h + V.dong.cach), height: V.dong.h, display: 'flex', alignItems: 'center', gap: 22,
            padding: '0 26px', borderRadius: 20, background: 'rgba(20,24,32,0.92)', border: `1px solid ${mau}66`, boxShadow: `0 0 18px ${mau}1F`,
            opacity: a, transform: `translateX(${(1 - a) * -26}px)`}}>
            <span style={{width: 54, height: 54, flexShrink: 0, borderRadius: 27, background: mau, color: NEN, fontWeight: 900, fontSize: 28, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{k + 1}</span>
            {/* v99.1: nhãn dài xuống tối đa 2 dòng (không cắt "..."): <= 14 ký tự 32 px một dòng, dài hơn 27 px hai dòng */}
            <span style={{width: 262, flexShrink: 0, color: mau, fontWeight: 800, fontSize: d.chien_thuat.length > 14 ? 27 : 32, lineHeight: 1.12,
              whiteSpace: d.chien_thuat.length > 14 ? 'normal' : 'nowrap', textWrap: 'balance', overflow: 'hidden', maxHeight: 2 * 1.12 * 32}}><ChuTron s={d.chien_thuat} co={d.chien_thuat.length > 14 ? 27 : 32} mau={mau} dam={800} /></span>
            <span style={{flex: 1, minWidth: 0, display: 'flex', justifyContent: 'flex-end', overflow: 'hidden'}}>
              {d.cong_thuc ? <Toan tex={d.cong_thuc} size={38} color="#F4F7FB" maxWidth={380} /> : null}
            </span>
          </div>
        );
      })}

      {/* nút lưu */}
      {/* v99.6: dòng gợi tương tác, nằm trọn trong vùng an toàn (đáy <= 1574, trái/phải 130..950); nút nhích lên 16 px nhường chỗ */}
      {BAT_CTA_THONG_MINH_OUTRO ? (
        <div data-goi-tuong-tac style={{position: 'absolute', left: 0, right: 0, top: V.nut.y + 88, height: 44, display: 'flex', justifyContent: 'center', alignItems: 'center',
          opacity: kep01(sGoi * 1.6), transform: `translateY(${(1 - sGoi) * 12}px)`}}>
          <div style={{height: 44, maxWidth: 780, padding: '0 20px', borderRadius: 22, display: 'flex', alignItems: 'center', gap: 10, boxSizing: 'border-box', whiteSpace: 'nowrap',
            background: 'linear-gradient(180deg, rgba(34,40,52,0.9), rgba(12,14,20,0.94))', border: '1px solid rgba(56,189,248,0.5)', boxShadow: '0 0 16px rgba(56,189,248,0.18)',
            color: '#F1F5FA', fontWeight: 800, fontSize: cauGoi.length > 50 ? 20 : 22}}>
            <svg width={26} height={26} viewBox="0 0 24 24" style={{flexShrink: 0, transform: `scale(${nayIcon})`}}><path d="M4 4h16v12H9l-5 4z" fill="#38BDF8" /></svg>
            <span>{cauGoi}</span>
            <svg width={26} height={26} viewBox="0 0 24 24" style={{flexShrink: 0, transform: `scale(${nayIcon})`}}><path d="M6 3h12v18l-6-4-6 4z" fill="#FBBF24" /></svg>
          </div>
        </div>
      ) : (
      <div data-goi-tuong-tac style={{position: 'absolute', left: 0, right: 0, top: V.nut.y + 98, height: 30, display: 'flex', justifyContent: 'center', alignItems: 'center',
        opacity: kep01(sGoi * 1.6), transform: `translateY(${(1 - sGoi) * 12}px)`, color: 'rgba(230,237,245,0.82)', fontWeight: 700, fontSize: 24, whiteSpace: 'nowrap'}}>
        Lưu lại ôn nhanh • Bình luận dạng bài bạn muốn giải tiếp!
      </div>
      )}
      <div style={{position: 'absolute', left: 0, right: 0, top: V.nut.y - 16, display: 'flex', justifyContent: 'center', opacity: kep01(sNut * 2)}}>
        <div style={{height: 96, padding: '0 54px', borderRadius: 48, display: 'flex', alignItems: 'center', gap: 16, background: `linear-gradient(180deg, #FF7A7E, ${SAN_HO} 55%, #E2393F)`,
          boxShadow: `0 7px 0 #9E1F25, 0 0 34px rgba(255,90,95,0.45)`, transform: `scale(${(0.6 + 0.4 * sNut) * nhun})`, color: '#fff', fontWeight: 900, fontSize: 38, letterSpacing: 0.8, whiteSpace: 'nowrap'}}>
          <IconCta cta={cta} />
          {cta}
        </div>
      </div>
      {/* v95: whoosh gọn khi bật Outro + chime sáng lúc đáp án nổi lên (SFX ~ -13 dB so với giọng) */}
      </div>
      <Sequence from={0} durationInFrames={20} layout="none"><Audio src={staticFile('sfx/whoosh.wav')} volume={0.2} /></Sequence>
      <Sequence from={4} durationInFrames={70} layout="none"><Audio src={staticFile('sfx/ting.wav')} volume={0.24} /></Sequence>
      <Sequence from={Math.round(tNut * fps)} durationInFrames={20} layout="none"><Audio src={staticFile('sfx/pop.wav')} volume={0.22} /></Sequence>
    </AbsoluteFill>
  );
};
