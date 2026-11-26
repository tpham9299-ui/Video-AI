// Khung 4 tầng dùng chung cho luồng HÌNH PHẲNG (HINH_PHANG) và HÌNH KHÔNG GIAN (HINH_KHONG_GIAN).
// Toàn bộ UI khóa chặt trong SAFE_ZONE_TIKTOK (x: 130..950, y: 212..1574), font Be Vietnam Pro + KaTeX 100%,
// tái sử dụng trực tiếp KhoaThuongHieu ("Story Math") và NenBanVeHinhHoc (blueprint / deep_space_blueprint).
import React, {useMemo} from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT, SO_DEU} from '../theme';
import {KieuToan, NapPhongToan, Toan} from '../Toan';
import {chuanTex} from '../chu';
import {MAU_3DV} from '../3d-vector/kieu';
import {emRa, kep01} from '../3d-vector/toan3d';
import {SanKhauKhongGian} from '../khonggian/SanKhauKhongGian';
import type {KhongGianVao} from '../khonggian/kieu';
import {KhoaThuongHieu} from '../khung4tang/KhoaThuongHieu';
import {NenBanVeHinhHoc} from '../khung4tang/NenKhiQuyen';
import {LopSafeZoneDebug} from '../khung4tang/LopSafeZoneDebug';
import {boCuc4Tang, LE_ND, RONG_ND} from '../khung4tang/vung';
import {caoDongTex, coVuaCao} from '../khung4tang/do_tex';
import {giayIntro, INTRO_SAN, IntroMocCau, raIntro} from '../khung4tang/IntroMocCau';
import {tHienThe, theDangGiang} from '../khung4tang/toi_gian';
import type {BuocGiai, DuKienGhim, MocCau, TheGiai} from '../khung4tang/kieu';

export type CheDoHinhHoc = 'HINH_PHANG' | 'HINH_KHONG_GIAN';

export type ChipKetQua = {
  id: string;
  tex: string;
  t: number;
};

export type KhungHinhHocProps = {
  cheDo: CheDoHinhHoc;
  mon?: string;
  fps?: number;
  tongFrame: number;
  deBai?: {cho: string[]; tim: string} | null;
  deGoc?: string;
  deGhim?: DuKienGhim[];
  buoc?: BuocGiai[];
  chipTrungGian?: ChipKetQua[];
  khongGian?: KhongGianVao | null;
  tCongBo?: number;
  dapAn?: string;
  cau?: {text: string; bat: number; ket: number}[];
  phuDe?: 'tat' | 'gon';
  mocCau?: MocCau | null;
  mauNhan?: string;
  children?: React.ReactNode;
};

const MAU_CYAN = '#38BDF8';
const MAU_VANG = '#FBBF24';
const MAU_NGOC = '#2EE6A8';
const CHU_SANG = '#F1F5F9';
const CHU_PHU = '#CBD5E1';

const MACRO_MAU: Record<string, string> = {
  mvang: '#FACC15',
  mdo: '#F87171',
  mngoc: '#2EE6A8',
  mcam: '#FB923C',
  mla: '#4ADE80',
};

const SO_CHU_MAP: Record<string, string> = {
  'không': '0', 'một': '1', 'hai': '2', 'ba': '3', 'bốn': '4', 'tư': '4',
  'năm': '5', 'sáu': '6', 'bảy': '7', 'tám': '8', 'chín': '9', 'mười': '10',
};

const doiSoChu = (tok: string): string => SO_CHU_MAP[tok.toLowerCase()] ?? tok;

// Chuẩn hóa 100% chuỗi hình học sang TeX hợp lệ cho KaTeX:
// - Bỏ tuyệt đối chữ thô "căn", "phần", ký hiệu Unicode hình học, macro màu Manim (\mvang -> \textcolor).
// - Bảo toàn chỉ số S_0, A_1, H_1... để KaTeX dựng chỉ số dưới thay vì in thô.
export function chuanTexHinhHoc(raw: string): string {
  let s = chuanTex(String(raw || ''));
  if (!s) return '';
  // Macro màu Manim -> \textcolor hợp lệ trong KaTeX
  s = s.replace(/\\(mvang|mdo|mngoc|mcam|mla)\s*\{/g, (_, m: string) => `\\textcolor{${MACRO_MAU[m] || MAU_CYAN}}{`);
  // Đổi cụm đọc chữ thô "căn bậc hai (của) X" / "căn X" -> \sqrt{X}
  s = s.replace(/\bcăn(?:\s+bậc\s+hai)?(?:\s+của)?\s+(\d+(?:[.,]\d+)?|không|một|hai|ba|bốn|tư|năm|sáu|bảy|tám|chín|mười|[a-zA-Z])\b/giu,
    (_, v: string) => `\\sqrt{${doiSoChu(v)}}`);
  // Đổi ký hiệu Unicode căn -> \sqrt{...}
  s = s.replace(/√\s*\(([^()]+)\)/g, '\\sqrt{$1}').replace(/√\s*(\d+(?:[.,]\d+)?|[a-zA-Z])/g, '\\sqrt{$1}');
  // Đổi cụm đọc chữ thô "<tử> phần <mẫu>" -> \dfrac{<tử>}{<mẫu>}
  s = s.replace(/((?:\d*[a-zA-Z]?\s*\\sqrt\{[^{}]+\})|\d+[a-zA-Z]?|[a-zA-Z](?:_[a-zA-Z0-9]+)?)\s+phần\s+(\d+(?:[.,]\d+)?|không|một|hai|ba|bốn|tư|năm|sáu|bảy|tám|chín|mười|[a-zA-Z]|\\sqrt\{[^{}]+\})/giu,
    (_, tu: string, mau: string) => `\\dfrac{${tu.replace(/\s+/g, '')}}{${doiSoChu(mau)}}`);
  // Đổi phân số gạch chéo gắn căn/biến/số đơn giản (vd a\sqrt{3}/2, a\sqrt{6}/3, 1/2) -> \dfrac{...}{...}
  s = s.replace(/(?<![\\A-Za-z0-9}])((?:\d*[a-zA-Z]?\\sqrt\{[^{}]+\})|\d+[a-zA-Z]?|[a-zA-Z]\^?\d?)\s*\/\s*(\d+|\\sqrt\{[^{}]+\})(?![A-Za-z0-9_])/g,
    '\\dfrac{$1}{$2}');
  // Ký hiệu Unicode hình học -> lệnh KaTeX chuẩn
  s = s
    .replace(/⊥/g, ' \\perp ')
    .replace(/∥/g, ' \\parallel ')
    .replace(/△/g, '\\triangle ')
    .replace(/∠/g, '\\angle ')
    .replace(/∼/g, ' \\sim ')
    .replace(/≅/g, ' \\cong ')
    .replace(/⇒/g, ' \\Rightarrow ')
    .replace(/⇔/g, ' \\Leftrightarrow ')
    .replace(/→/g, ' \\rightarrow ')
    .replace(/∈/g, ' \\in ')
    .replace(/∉/g, ' \\notin ')
    .replace(/∩/g, ' \\cap ')
    .replace(/∪/g, ' \\cup ')
    .replace(/≤/g, ' \\le ')
    .replace(/≥/g, ' \\ge ')
    .replace(/≠/g, ' \\ne ')
    .replace(/≈/g, ' \\approx ')
    .replace(/°/g, '^\\circ')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3');
  // Chỉ số nhiều ký tự & đơn ký tự chuẩn hóa nhẹ: giữ S_0, A_1, d_1 nguyên dạng KaTeX
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

const gonSoSanh = (s: string) => chuanTexHinhHoc(s).replace(/\\(?:text|mathrm|textcolor\{[^}]*\}|[,;:! ])|\s|\{|\}/g, '').toLowerCase();

const laDapAnCuoi = (chu: string, dapAn?: string): boolean => {
  const da = String(dapAn || '').trim();
  if (!da || /^cm$/i.test(da) || da.includes('?')) return false;
  const gChu = gonSoSanh(chu);
  const cacPhan = da.split(/[;,]|\bvà\b/i).map((x) => gonSoSanh(x)).filter((x) => x.length >= 2);
  return cacPhan.some((p) => p && gChu.includes(p));
};

// Che đáp án trước mốc công bố: khóa mọi vế sau dấu "=" nếu là mục tiêu tính hoặc chứa đáp số cuối.
export function khoaDapAnHinhHoc(
  yeuCauGoc: string,
  dapAn: string | undefined,
  t: number,
  mocCongBo: number,
): {loai: 'tinh' | 'chung_minh'; noiDungTex: string; daMoKhoa: boolean; dapAnTex: string | null} {
  const goc = String(yeuCauGoc || '').replace(/\s+/g, ' ').trim();
  const laCM = /^\s*(?:chứng\s*minh|cm\b|đpcm)/i.test(goc) || (/chứng\s*minh/i.test(goc) && !/\btính\b|bao nhiêu|khoảng cách|góc giữa|thể tích|diện tích/i.test(goc));
  const loai: 'tinh' | 'chung_minh' = laCM ? 'chung_minh' : 'tinh';
  let sach = goc
    .replace(/^\s*(?:yêu\s*cầu\s*:\s*)/i, '')
    .replace(/^\s*(?:chứng\s*minh(?:\s+rằng)?|cần\s+chứng\s*minh|tính|tìm)\s*:?\s*/i, '')
    .replace(/\.$/, '')
    .trim();
  const daMoKhoa = t >= mocCongBo;
  const dapAnSach = String(dapAn || '').trim();
  const coDapAnSo = !laCM && !!dapAnSach && !/^cm$/i.test(dapAnSach) && !dapAnSach.includes('?');

  if (!laCM && !daMoKhoa) {
    if (sach.includes('=')) {
      const vt = sach.slice(0, sach.lastIndexOf('=')).trim();
      sach = `${vt} = ?`;
    } else if (coDapAnSo && laDapAnCuoi(sach, dapAnSach)) {
      sach = '?';
    } else if (sach && !sach.includes('?')) {
      sach = `${sach} = ?`;
    }
  } else if (!laCM && daMoKhoa && coDapAnSo) {
    if (sach.includes('=')) {
      const vt = sach.slice(0, sach.lastIndexOf('=')).trim();
      sach = `${vt} = ${dapAnSach}`;
    } else if (sach) {
      sach = `${sach} = ${dapAnSach}`;
    }
  }

  return {
    loai,
    noiDungTex: chuanTexHinhHoc(sach || goc),
    daMoKhoa,
    dapAnTex: daMoKhoa && coDapAnSo ? chuanTexHinhHoc(dapAnSach) : null,
  };
}

// Gom tối đa 3 chip kết quả trung gian (VD ✓ AO = a√3/2) từ các bước đã giảng; không lộ đáp án cuối trước mocCongBo.
export function trichChipTrungGian(
  buoc: BuocGiai[],
  chipVao: ChipKetQua[] | undefined,
  t: number,
  mocCongBo: number,
  dapAn?: string,
): ChipKetQua[] {
  const ds: ChipKetQua[] = [];
  const daCo = new Set<string>();
  const them = (id: string, texRaw: string, moc: number, chot = false) => {
    if (t < moc) return;
    if ((chot || laDapAnCuoi(texRaw, dapAn)) && t < mocCongBo) return;
    const tex = chuanTexHinhHoc(texRaw);
    if (!tex || tex.length > 52) return;
    const k = gonSoSanh(tex);
    if (!k || daCo.has(k)) return;
    daCo.add(k);
    ds.push({id, tex, t: moc});
  };

  for (const c of chipVao || []) them(c.id, c.tex, c.t, false);

  if (!ds.length) {
    buoc.forEach((b, bi) => {
      // Chip trung gian chỉ rút từ các bước trước bước đang giảng (hoặc thẻ đã hoàn tất trong bước trước)
      const tSau = bi + 1 < buoc.length ? buoc[bi + 1].t : mocCongBo;
      if (t < tSau - 0.05) return;
      for (let j = b.the.length - 1; j >= 0; j--) {
        const th = b.the[j];
        if (th.loai === 'cong_thuc' && th.dong.length) {
          const dongCuoi = th.dong[th.dong.length - 1].replace(/^\\Rightarrow\s*|^=>\s*/, '').trim();
          if (/[=]|\\perp|\\parallel|\\sim|\\cong/.test(dongCuoi)) {
            them(`b${bi}_${j}`, dongCuoi, tSau, !!th.chot);
            break;
          }
        }
      }
    });
  }
  return ds.slice(-3);
}

// Chia phụ đề gọn 1 dòng trong SAFE_ZONE_TIKTOK
function chiaPhuDeNgan(c: {text: string; bat: number; ket: number}, toiDa = 40): {text: string; bat: number; ket: number}[] {
  const chu = c.text.replace(/\s+/g, ' ').trim();
  if (chu.length <= toiDa + 2) return [c];
  const n = Math.ceil(chu.length / toiDa), muc = chu.length / n;
  const tu = chu.split(' ');
  const doan: string[] = [];
  let cur = '';
  for (const w of tu) {
    const thu = cur ? `${cur} ${w}` : w;
    if (cur && thu.length > muc + 6 && doan.length < n - 1) { doan.push(cur); cur = w; } else cur = thu;
  }
  if (cur) doan.push(cur);
  const tong = doan.reduce((s, d) => s + d.length, 0);
  let moc = c.bat;
  return doan.map((d) => {
    const dt = ((c.ket - c.bat) * d.length) / Math.max(1, tong);
    const ra = {text: d, bat: moc, ket: moc + dt};
    moc += dt;
    return ra;
  });
}

// Tầng 1: Header Story Math + Thẻ Đề bài ghim (Cho: + Yêu cầu: phân biệt Tính / Chứng minh, khóa đáp án trước mocCongBo).
const TheDeBaiGhim: React.FC<{
  mon: string;
  cho: string[];
  yeuCauGoc: string;
  dapAn?: string;
  t: number;
  mocCongBo: number;
  fps: number;
  frame: number;
}> = ({mon, cho, yeuCauGoc, dapAn, t, mocCongBo, fps, frame}) => {
  const kq = khoaDapAnHinhHoc(yeuCauGoc, dapAn, t, mocCongBo);
  const vao = interpolate(frame, [0, Math.round(0.45 * fps)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const spMo = kq.daMoKhoa
    ? spring({frame: Math.max(0, Math.round((t - mocCongBo) * fps)), fps, config: {damping: 15, stiffness: 160, mass: 0.7}})
    : 0;
  const mauYeuCau = kq.loai === 'tinh' ? MAU_VANG : MAU_NGOC;
  const nhanYeuCau = kq.loai === 'tinh' ? 'Tính:' : 'Chứng minh:';
  const choTex = cho.slice(0, 3).map((x) => chuanTexHinhHoc(x)).filter(Boolean);

  return (
    <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start'}}>
      <KhoaThuongHieu viTri="dau" mon={mon} />
      <div
        data-the-de-bai="1"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 32,
          bottom: 4,
          borderRadius: 18,
          background: 'linear-gradient(180deg, rgba(13,34,68,0.86), rgba(8,22,46,0.90))',
          border: `1px solid ${kq.daMoKhoa ? `${MAU_NGOC}88` : 'rgba(147,197,253,0.28)'}`,
          boxShadow: '0 10px 26px rgba(2,8,20,0.42), inset 0 1px 0 rgba(191,219,254,0.16)',
          padding: '12px 18px 12px 22px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 10,
          boxSizing: 'border-box',
          opacity: vao,
          translate: `0px ${((1 - vao) * -10).toFixed(1)}px`,
        }}
      >
        {/* vạch kỹ thuật trái */}
        <div style={{position: 'absolute', left: 0, top: 14, bottom: 14, width: 4, borderRadius: 2, background: kq.daMoKhoa ? MAU_NGOC : MAU_CYAN}} />

        {/* Hàng Cho: */}
        {choTex.length > 0 ? (
          <div style={{display: 'flex', alignItems: 'center', gap: 10, minHeight: 38, overflow: 'hidden'}}>
            <span style={{
              flexShrink: 0, padding: '2px 10px', borderRadius: 8, background: 'rgba(56,189,248,0.16)',
              border: '1px solid rgba(56,189,248,0.42)', color: MAU_CYAN, fontFamily: FONT, fontWeight: 800, fontSize: 22, whiteSpace: 'nowrap',
            }}>
              Cho:
            </span>
            <div style={{flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', overflow: 'hidden'}}>
              <Toan
                tex={choTex.join(' \\cdot ')}
                size={27}
                color={CHU_SANG}
                maxWidth={RONG_ND - 122}
                maxHeight={46}
                chuThuong={false}
                can="trai"
              />
            </div>
          </div>
        ) : null}

        {/* Hàng Yêu cầu: phân biệt Tính: / Chứng minh:, khóa đáp án trước mocCongBo */}
        <div style={{display: 'flex', alignItems: 'center', gap: 10, minHeight: 42, overflow: 'hidden'}}>
          <span style={{
            flexShrink: 0, padding: '3px 11px', borderRadius: 8,
            background: kq.daMoKhoa ? `${MAU_NGOC}24` : `${mauYeuCau}20`,
            border: `1px solid ${kq.daMoKhoa ? MAU_NGOC : mauYeuCau}88`,
            color: kq.daMoKhoa ? MAU_NGOC : mauYeuCau,
            fontFamily: FONT, fontWeight: 800, fontSize: 22, whiteSpace: 'nowrap',
          }}>
            {nhanYeuCau}
          </span>
          <div style={{
            flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, overflow: 'hidden',
            scale: kq.daMoKhoa ? String(1 + 0.04 * Math.sin(Math.PI * Math.min(1, spMo))) : '1',
          }}>
            <Toan
              tex={kq.noiDungTex || '?'}
              size={29}
              color={kq.daMoKhoa ? MAU_NGOC : CHU_SANG}
              maxWidth={RONG_ND - (kq.loai === 'chung_minh' ? 210 : 140) - (kq.daMoKhoa && kq.loai === 'chung_minh' ? 110 : 0)}
              maxHeight={50}
              chuThuong={false}
              can="trai"
              style={{fontWeight: 700}}
            />
            {kq.daMoKhoa && kq.loai === 'chung_minh' ? (
              <span data-kd-bo="1" style={{
                flexShrink: 0, padding: '2px 10px', borderRadius: 10, background: `${MAU_NGOC}24`,
                border: `1px solid ${MAU_NGOC}`, color: MAU_NGOC, fontFamily: FONT, fontWeight: 800, fontSize: 20, whiteSpace: 'nowrap',
              }}>
                ✓ ĐPCM
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

// Trích 2-3 dòng suy luận có căn cứ từ thẻ bước giải, chuẩn hóa KaTeX 100%
function dongSuyLuanCuaThe(th: TheGiai): string[] {
  if (th.loai === 'cong_thuc') return th.dong.slice(0, 3).map((d) => chuanTexHinhHoc(d)).filter(Boolean);
  if (th.loai === 'chu') {
    const raw = String(th.noi_dung || '').trim();
    const parts = raw.split(/\n|;\s*(?=[A-ZÀ-Ỹ\\])/).map((x) => chuanTexHinhHoc(x)).filter(Boolean);
    return parts.slice(0, 3);
  }
  if (th.loai === 'casio') return [chuanTexHinhHoc(th.ket_qua)].filter(Boolean);
  return th.nhan ? [chuanTexHinhHoc(th.nhan)] : [];
}

// Tầng 3: Dải chip kết quả trung gian + Thẻ bước giải 2–3 dòng suy luận có căn cứ + dấu thương hiệu nhỏ.
const TangGiaiHinhHoc: React.FC<{
  buoc: BuocGiai[];
  i: number;
  t: number;
  fps: number;
  mocCongBo: number;
  dapAn?: string;
  chipVao?: ChipKetQua[];
}> = ({buoc, i, t, fps, mocCongBo, dapAn, chipVao}) => {
  const chips = useMemo(() => trichChipTrungGian(buoc, chipVao, t, mocCongBo, dapAn), [buoc, chipVao, t, mocCongBo, dapAn]);
  const b = i >= 0 ? buoc[i] : null;
  const dang = b ? theDangGiang(b, t) : null;
  const th = b && dang ? b.the[dang.j] : null;
  const mau = b ? MAU_3DV[b.mau || 'cyan'] || MAU_CYAN : MAU_CYAN;
  const chot = !!(th?.chot) && t >= mocCongBo;
  const mauNhan = chot ? MAU_NGOC : mau;

  const dong = th ? dongSuyLuanCuaThe(th) : [];
  const coChip = chips.length > 0;
  const caoTheToiDa = coChip ? 356 : 412;
  const coMacDinh = chot ? 46 : dong.length >= 3 ? 34 : 40;
  const coDong = dong.length ? coVuaCao(dong, coMacDinh, caoTheToiDa - 110, 12, 26) : coMacDinh;
  const t0 = dang ? dang.t0 : (b?.t ?? 0);
  const spThe = spring({frame: Math.max(0, Math.round((t - t0) * fps)), fps, config: {damping: 16, stiffness: 150, mass: 0.75}});
  const aThe = emRa((t - t0) / 0.3);

  return (
    <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'flex-start', paddingTop: 4}}>
      {/* Dải chip kết quả trung gian (✓ AO = a√3/2) */}
      {coChip ? (
        <div
          data-chip-trung-gian="1"
          style={{
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {chips.map((c) => {
            const ac = emRa((t - c.t) / 0.28);
            const maxWChip = Math.floor((RONG_ND - 10 * (chips.length - 1)) / chips.length) - 42;
            return (
              <div
                key={c.id}
                style={{
                  height: 44,
                  padding: '0 14px',
                  borderRadius: 22,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  background: 'rgba(13,34,68,0.82)',
                  border: `1px solid ${MAU_NGOC}66`,
                  opacity: ac,
                  translate: `0px ${((1 - ac) * 8).toFixed(1)}px`,
                  boxSizing: 'border-box',
                }}
              >
                <span style={{color: MAU_NGOC, fontFamily: FONT, fontWeight: 900, fontSize: 22}}>✓</span>
                <Toan tex={c.tex} size={25} color={CHU_SANG} maxWidth={Math.max(120, maxWChip)} maxHeight={38} chuThuong={false} />
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Thẻ bước giải 2-3 dòng suy luận có căn cứ */}
      {b && th && dong.length > 0 ? (
        <div
          data-the-giai="1"
          {...(chot ? {'data-the-chot': '1'} : {})}
          style={{
            position: 'relative',
            flex: 1,
            maxHeight: caoTheToiDa,
            borderRadius: 20,
            background: chot
              ? 'linear-gradient(180deg, rgba(46,230,168,0.13), rgba(9,24,52,0.88) 52%, rgba(7,18,39,0.92))'
              : 'linear-gradient(180deg, rgba(13,34,68,0.84), rgba(8,22,46,0.90))',
            border: `1px solid ${chot ? `${MAU_NGOC}99` : `${mauNhan}55`}`,
            boxShadow: '0 14px 34px rgba(2,8,20,0.44), inset 0 1px 0 rgba(191,219,254,0.16)',
            padding: '16px 26px 26px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 12,
            opacity: aThe,
            translate: `0px ${((1 - Math.min(1, spThe)) * 16).toFixed(1)}px`,
            boxSizing: 'border-box',
          }}
        >
          {/* vạch sáng mảnh trên đỉnh thẻ */}
          <div style={{
            position: 'absolute', left: 26, right: 26, top: 0, height: chot ? 3 : 2, borderRadius: 2,
            background: `linear-gradient(90deg, transparent, ${mauNhan}, transparent)`, opacity: 0.9,
          }} />

          {/* Tiêu đề bước gọn */}
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, maxWidth: RONG_ND - 60, overflow: 'hidden'}}>
            <span style={{
              padding: '2px 11px', borderRadius: 10, background: chot ? MAU_NGOC : `${mauNhan}26`,
              color: chot ? '#051427' : mauNhan, fontFamily: FONT, fontWeight: 900, fontSize: 21, whiteSpace: 'nowrap', ...SO_DEU,
            }}>
              {chot ? 'KẾT LUẬN' : String(i + 1).padStart(2, '0')}
            </span>
            {b.tieu_de ? (
              <Toan
                tex={chuanTexHinhHoc(b.tieu_de)}
                size={26}
                color={chot ? MAU_NGOC : CHU_PHU}
                maxWidth={RONG_ND - 190}
                maxHeight={40}
                chuThuong={false}
                style={{fontWeight: 800}}
              />
            ) : null}
          </div>

          {/* 2-3 dòng suy luận có căn cứ (KaTeX 100%) */}
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%'}}>
            {dong.map((d, k) => {
              const tk = th.loai === 'cong_thuc' ? Math.max(t0, th.moc?.[k] ?? t0 + k * 0.42) : t0 + k * 0.35;
              const ak = k === 0 ? 1 : emRa((t - tk) / 0.3);
              const laDongCuoi = k === dong.length - 1;
              return (
                <div
                  key={k}
                  style={{
                    opacity: ak,
                    translate: `0px ${((1 - ak) * 8).toFixed(1)}px`,
                    maxWidth: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <Toan
                    tex={d}
                    size={coDong}
                    color={laDongCuoi && (dong.length > 1 || chot) ? mauNhan : CHU_SANG}
                    maxWidth={RONG_ND - 56}
                    maxHeight={caoDongTex(d, coDong) + 8}
                    chuThuong={false}
                    can="giua"
                    style={{fontWeight: chot || laDongCuoi ? 700 : 600}}
                  />
                </div>
              );
            })}
          </div>

          <KhoaThuongHieu viTri="the" />
        </div>
      ) : (
        /* Khi HINH_PHANG ghép đè lớp chữ Manim (chưa có buoc Remotion): khung định vị sạch + dấu thương hiệu nhỏ */
        <div
          style={{
            position: 'relative',
            flex: 1,
            maxHeight: caoTheToiDa,
            borderRadius: 20,
            background: 'linear-gradient(180deg, rgba(13,34,68,0.58), rgba(8,22,46,0.68))',
            border: '1px solid rgba(147,197,253,0.22)',
            boxSizing: 'border-box',
          }}
        >
          <KhoaThuongHieu viTri="the" />
        </div>
      )}
    </div>
  );
};

// Tầng 4: phụ đề gọn 1 dòng (khi bật) hoặc thanh tiến trình bước mảnh, khóa trong y <= 1574
const TangDayHinhHoc: React.FC<{
  buoc: BuocGiai[];
  i: number;
  cauNay?: {text: string; bat: number; ket: number};
  t: number;
  mau: string;
}> = ({buoc, i, cauNay, t, mau}) => {
  if (cauNay) {
    const chu = cauNay.text.replace(/\s+/g, ' ').trim();
    const co = Math.max(26, Math.min(38, Math.floor((RONG_ND - 40) / (Math.max(1, chu.length) * 0.6))));
    const a = kep01((t - cauNay.bat) / 0.14) * (1 - kep01((t - (cauNay.ket - 0.1)) / 0.12));
    return (
      <div data-vung="phu_de" style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: a}}>
        <div style={{
          maxWidth: RONG_ND, padding: '6px 18px', borderRadius: 14, background: 'rgba(5,12,27,0.84)',
          border: '1px solid rgba(147,197,253,0.22)', fontFamily: FONT, fontWeight: 800, fontSize: co,
          color: CHU_SANG, whiteSpace: 'nowrap',
        }}>
          {chu}
        </div>
      </div>
    );
  }
  if (!buoc.length) return null;
  return (
    <div data-kd-bo="1" style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10}}>
      {buoc.map((b, idx) => {
        const dang = idx === i;
        const qua = idx < i;
        return (
          <div
            key={idx}
            style={{
              height: 6,
              width: dang ? 44 : 18,
              borderRadius: 3,
              background: dang ? mau : qua ? MAU_NGOC : 'rgba(147,197,253,0.25)',
            }}
          />
        );
      })}
    </div>
  );
};

export const KhungHinhHoc: React.FC<KhungHinhHocProps> = (p) => {
  const frame = useCurrentFrame();
  const cfg = useVideoConfig();
  const fps = p.fps || cfg.fps || 30;
  const t = frame / fps;
  const bc = boCuc4Tang(true); // Khóa cứng SAFE_ZONE_TIKTOK: x 130..950, y 212..1574
  const buoc = useMemo(() => [...(p.buoc || [])].sort((a, b) => a.t - b.t), [p.buoc]);
  const tong = Math.max(1, p.tongFrame) / fps;
  const mocCongBo = p.tCongBo ?? tong + 1;

  let i = -1;
  buoc.forEach((b, j) => { if (b.t <= t) i = j; });
  const mauNhan = p.mauNhan || (i >= 0 ? MAU_3DV[buoc[i].mau || 'cyan'] || MAU_CYAN : MAU_CYAN);
  const monHien = p.mon || p.cheDo;

  const G = giayIntro(p.mocCau, tong);
  const ra = raIntro(t, G);
  const lechMay = G > 0 && t < G ? {k: 1 + 0.22 * (1 - emRa(t / 1.6)), n: 18 * (1 - emRa(t / 2.2))} : undefined;
  const dichIntro = G > 0 ? (INTRO_SAN.y - bc.t2.y) * (1 - ra) : 0;
  const yT2 = bc.t2.y + dichIntro;

  // Chuẩn bị dữ kiện Cho / Yêu cầu cho T1 Thẻ Đề bài ghim
  const {cho, yeuCau} = useMemo(() => {
    if (p.deBai && (p.deBai.cho?.length || p.deBai.tim)) {
      return {cho: p.deBai.cho || [], yeuCau: p.deBai.tim || ''};
    }
    const ghim = p.deGhim || [];
    if (ghim.length) {
      const mucTim = ghim.find((g) => g.nhan.includes('?') || !!g.doi);
      const dsCho = ghim.filter((g) => g !== mucTim).map((g) => g.nhan);
      return {cho: dsCho, yeuCau: mucTim?.nhan || p.deGoc || ''};
    }
    const goc = String(p.deGoc || '').trim();
    const m = goc.match(/(.+?)\.\s*((?:Chứng minh|Tính|Tìm)[^.]*)/i);
    if (m) return {cho: [m[1].trim()], yeuCau: m[2].trim()};
    return {cho: goc ? [goc] : [], yeuCau: ''};
  }, [p.deBai, p.deGhim, p.deGoc]);

  const dsCau = useMemo(() => (p.cau || []).flatMap((c) => chiaPhuDeNgan(c)), [p.cau]);
  const cauNay = p.phuDe === 'gon' && ra > 0.5 ? dsCau.find((c) => t >= c.bat && t < c.ket) : undefined;

  const cheDoNen = p.cheDo === 'HINH_KHONG_GIAN' ? 'deep_space_blueprint' : 'blueprint';

  return (
    <AbsoluteFill className="k4t" data-khung-hinh-hoc={p.cheDo} style={{fontFamily: FONT, background: cheDoNen === 'deep_space_blueprint' ? '#050C1B' : '#081A3A', ...SO_DEU}}>
      <KieuToan />
      <LopSafeZoneDebug />
      <style>{'div, span { text-wrap: balance; } .katex, .katex * { text-wrap: nowrap; } .k4t .katex .mathnormal:not(:has(+ .msupsub)):not(:has(+ .msupsub) *) { margin-right: 0 !important; }'}</style>
      <NapPhongToan />

      {/* Nền bản vẽ kỹ thuật có chiều sâu (bỏ nền đen trơn #121214) */}
      <NenBanVeHinhHoc
        cheDo={cheDoNen}
        t={t}
        mocBuoc={buoc.map((b) => b.t)}
        tamSanKhau={bc.t2.y + bc.t2.h / 2}
        mauNhan={mauNhan}
      />

      {/* TẦNG 1: Header Story Math + Thẻ Đề bài ghim */}
      <div data-vung="t1" style={{position: 'absolute', left: bc.le, width: bc.rong, top: bc.t1.y, height: bc.t1.h, opacity: ra}}>
        <TheDeBaiGhim
          mon={monHien}
          cho={cho}
          yeuCauGoc={yeuCau}
          dapAn={p.dapAn}
          t={t}
          mocCongBo={mocCongBo}
          fps={fps}
          frame={frame}
        />
      </div>

      {/* TẦNG 2: Sân khấu hình nền trong suốt */}
      <div data-vung="t2" style={{position: 'absolute', left: bc.le, width: bc.rong, top: yT2, height: bc.t2.h, background: 'transparent', overflow: 'visible', zIndex: 2}}>
        {p.khongGian ? (
          <div style={{position: 'absolute', inset: 0, background: 'transparent'}}>
            <SanKhauKhongGian kg={p.khongGian} t={t} rong={bc.rong} cao={bc.t2.h} lechMay={lechMay} />
          </div>
        ) : null}
        {p.children ? (
          <div style={{position: 'absolute', inset: 0, background: 'transparent'}}>
            {p.children}
          </div>
        ) : null}
      </div>

      {/* Watermark động "Story Math" phủ PHÍA TRÊN sân khấu hình Tầng 2 */}
      <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 6}}>
        <KhoaThuongHieu viTri="nuoc" />
      </div>

      {/* TẦNG 3: Dải chip kết quả trung gian + Thẻ bước giải 2–3 dòng suy luận có căn cứ */}
      <div data-vung="t3" style={{position: 'absolute', left: bc.le, width: bc.rong, top: bc.t3.y, height: bc.t3.h, opacity: ra, zIndex: 3}}>
        <TangGiaiHinhHoc
          buoc={buoc}
          i={i}
          t={t}
          fps={fps}
          mocCongBo={mocCongBo}
          dapAn={p.dapAn}
          chipVao={p.chipTrungGian}
        />
      </div>

      {/* TẦNG 4: Dải phụ đề gọn / thanh tiến trình bước (trong SAFE_ZONE_TIKTOK y <= 1574) */}
      <div data-vung="t4" style={{position: 'absolute', left: bc.le, width: bc.rong, top: bc.t4.y, height: bc.t4.h, opacity: ra, zIndex: 3}}>
        <TangDayHinhHoc buoc={buoc} i={i} cauNay={cauNay} t={t} mau={mauNhan} />
      </div>

      {G > 0 && t < G && p.mocCau ? (
        <div style={{position: 'absolute', inset: 0, zIndex: 8}}>
          <IntroMocCau m={p.mocCau} t={t} G={G} />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
