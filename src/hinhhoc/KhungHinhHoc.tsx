// Khung 4 tầng dùng chung cho luồng HÌNH PHẲNG (HINH_PHANG) và HÌNH KHÔNG GIAN (HINH_KHONG_GIAN).
// Toàn bộ UI khóa chặt trong SAFE_ZONE_TIKTOK (x: 130..950, y: 212..1574), font Be Vietnam Pro + KaTeX chuẩn,
// tái sử dụng trực tiếp KhoaThuongHieu ("Story Math"), NenBanVeHinhHoc và DongCoSfx.
import React, {useMemo} from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT, SO_DEU, TEN_THUONG_HIEU} from '../theme';
import {KieuToan, NapPhongToan, Toan} from '../Toan';
import {chuanTex} from '../chu';
import {MAU_3DV} from '../3d-vector/kieu';
import {emRa, kep01} from '../3d-vector/toan3d';
import {SanKhauKhongGian} from '../khonggian/SanKhauKhongGian';
import type {KhongGianVao} from '../khonggian/kieu';
import {chuyenMuc, KhoaThuongHieu} from '../khung4tang/KhoaThuongHieu';
import {NenBanVeHinhHoc} from '../khung4tang/NenKhiQuyen';
import {LopSafeZoneDebug} from '../khung4tang/LopSafeZoneDebug';
import {boCuc4Tang, RONG_ND} from '../khung4tang/vung';
import {giayIntro, INTRO_SAN, IntroMocCau, raIntro} from '../khung4tang/IntroMocCau';
import {theDangGiang} from '../khung4tang/toi_gian';
import type {BuocGiai, DuKienGhim, MocCau, TheGiai} from '../khung4tang/kieu';
import type {HinhPhang2DPreview, HinhPhangDongGiai} from '../types';
import {DongCoSfx, type SuKienSfxVao} from '../amthanh/DongCoSfx';

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
  dongGiaiHinhPhang?: HinhPhangDongGiai[];
  chipTrungGian?: ChipKetQua[];
  khongGian?: KhongGianVao | null;
  hinh2d?: HinhPhang2DPreview | null;
  tCongBo?: number;
  tOutro?: number;
  dapAn?: string;
  cau?: {text: string; bat: number; ket: number}[];
  phuDe?: 'tat' | 'gon';
  mocCau?: MocCau | null;
  mauNhan?: string;
  batSfx?: boolean;
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
// - Bỏ chữ thô "căn", "phần", ký hiệu Unicode hình học, macro màu Manim (\mvang -> \textcolor).
// - Bảo toàn chỉ số S_0, A_1, H_1... để KaTeX dựng chỉ số dưới thay vì in thô.
export function chuanTexHinhHoc(raw: string): string {
  let s = chuanTex(String(raw || ''));
  if (!s) return '';
  s = s.replace(/\\(mvang|mdo|mngoc|mcam|mla)\s*\{/g, (_, m: string) => `\\textcolor{${MACRO_MAU[m] || MAU_CYAN}}{`);
  s = s.replace(
    /\bcăn(?:\s+bậc\s+hai)?(?:\s+của)?\s+(\d+(?:[.,]\d+)?|không|một|hai|ba|bốn|tư|năm|sáu|bảy|tám|chín|mười|[a-zA-Z])\b/giu,
    (_, v: string) => `\\sqrt{${doiSoChu(v)}}`,
  );
  s = s.replace(/√\s*\(([^()]+)\)/g, '\\sqrt{$1}').replace(/√\s*(\d+(?:[.,]\d+)?|[a-zA-Z])/g, '\\sqrt{$1}');
  s = s.replace(
    /((?:\d*[a-zA-Z]?\s*\\sqrt\{[^{}]+\})|\d+[a-zA-Z]?|[a-zA-Z](?:_[a-zA-Z0-9]+)?)\s+phần\s+(\d+(?:[.,]\d+)?|không|một|hai|ba|bốn|tư|năm|sáu|bảy|tám|chín|mười|[a-zA-Z]|\\sqrt\{[^{}]+\})/giu,
    (_, tu: string, mau: string) => `\\dfrac{${tu.replace(/\s+/g, '')}}{${doiSoChu(mau)}}`,
  );
  s = s.replace(
    /(?<![\\A-Za-z0-9}])((?:\d*[a-zA-Z]?\\sqrt\{[^{}]+\})|\d+[a-zA-Z]?|[a-zA-Z]\^?\d?)\s*\/\s*(\d+|\\sqrt\{[^{}]+\})(?![A-Za-z0-9_])/g,
    '\\dfrac{$1}{$2}',
  );
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
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

// Tách chuẩn văn bản tiếng Việt (đứng thẳng Be Vietnam Pro) và biểu thức toán (render KaTeX).
// Khắc phục triệt để lỗi KaTeX làm nghiêng/co chữ tiếng Việt trong T1 & T3.
export type DoanHien = {kieu: 'chu' | 'toan'; s: string};

const TU_VIET_THUONG = new Set([
  'cho', 'tính', 'tìm', 'chứng', 'minh', 'rằng', 'tại', 'và', 'của', 'với', 'có', 'là', 'nên', 'vì', 'do', 'theo',
  'từ', 'đó', 'vậy', 'khi', 'nhọn', 'tù', 'vuông', 'cân', 'đều', 'góc', 'cạnh', 'đáy', 'chóp', 'hình', 'lăng', 'trụ',
  'tứ', 'diện', 'giác', 'tam', 'đường', 'cao', 'kính', 'tròn', 'tâm', 'trung', 'điểm', 'tuyến', 'tiếp', 'nội', 'ngoại',
  'song', 'kề', 'bù', 'phụ', 'đối', 'cùng', 'chắn', 'cung', 'nửa', 'mặt', 'phẳng', 'khoảng', 'cách', 'giao', 'cắt',
  'qua', 'xuống', 'lên', 'trên', 'trong', 'ngoài', 'giữa', 'hai', 'ba', 'bốn', 'chung', 'huyền', 'nhỏ', 'lớn', 'hơn',
  'bằng', 'suy', 'ra', 'đpcm', 'đồng', 'dạng', 'khối', 'bên', 'chân', 'chiếu', 'thiết', 'trọng', 'phân', 'thẳng',
  'hàng', 'quy', 'đoạn', 'thể', 'tích', 'cần', 'biết', 'như', 'sau', 'trước', 'tổng', 'hiệu', 'tỉ', 'số', 'độ', 'dài',
]);

const coDauViet = (s: string) => /[À-ỹđĐ]/.test(s);
const laTuViet = (w: string): boolean => {
  const clean = w.replace(/^[([{"'“.,;:!?·-]+|[)\]}"'”.,;:!?·-]+$/g, '');
  if (!clean) return false;
  if (coDauViet(clean)) return true;
  if (/^[a-z]{2,}$/.test(clean) && TU_VIET_THUONG.has(clean)) return true;
  if (/^[A-Z][a-z]{2,}$/.test(clean) && TU_VIET_THUONG.has(clean.toLowerCase())) return true;
  return false;
};

function tachChuTrongManh(frag: string): DoanHien[] {
  const s = frag.replace(/\\[,;: ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!s) return [];
  // Nếu chứa lệnh TeX có ngoặc sâu (\dfrac, \textcolor, \sqrt, \widehat...) -> tách theo ranh giới chữ Việt ngoài ngoặc
  const tokens: {kieu: 'chu' | 'toan'; s: string}[] = [];
  let i = 0;
  let depth = 0;
  let cur = '';
  let mode: 'chu' | 'toan' | null = null;

  const flush = () => {
    const val = cur.trim();
    if (val && mode) tokens.push({kieu: mode, s: val});
    cur = '';
    mode = null;
  };

  while (i < s.length) {
    // Nếu đang ở độ sâu > 0 -> gom vào toán để không cắt gãy ngoặc TeX
    if (depth > 0) {
      const ch = s[i];
      if (ch === '\\' && i + 1 < s.length) {
        cur += s.slice(i, i + 2);
        i += 2;
        continue;
      }
      if (ch === '{') depth++;
      else if (ch === '}') depth = Math.max(0, depth - 1);
      cur += ch;
      i++;
      continue;
    }

    // Gặp lệnh TeX (\triangle, \perp, \dfrac{...}{...}, \textcolor{...}{...}, \angle...)
    if (s[i] === '\\') {
      if (mode === 'chu') flush();
      mode = 'toan';
      const m = /^\\([a-zA-Z]+|.)/.exec(s.slice(i));
      const cmd = m ? m[0] : '\\';
      cur += cmd;
      i += cmd.length;
      while (i < s.length && s[i] === ' ' && s[i + 1] === '{') i++;
      while (i < s.length && s[i] === '{') {
        depth++;
        cur += '{';
        i++;
        while (i < s.length && depth > 0) {
          if (s[i] === '\\' && i + 1 < s.length) { cur += s.slice(i, i + 2); i += 2; continue; }
          if (s[i] === '{') depth++;
          else if (s[i] === '}') depth--;
          cur += s[i];
          i++;
        }
      }
      continue;
    }

    // Khoảng trắng
    if (/\s/.test(s[i])) {
      cur += ' ';
      i++;
      continue;
    }

    // Cụm ngoặc tròn chứa toàn chữ tiếng Việt (vd "(kề bù)", "(g.g)", "(đpcm)")
    if (s[i] === '(') {
      const dong = s.indexOf(')', i + 1);
      if (dong > i + 1) {
        const noi = s.slice(i + 1, dong).trim();
        const laNgoacChu = !/[\\^_=<>]|^[A-Z0-9,.\s]+$/.test(noi) && (coDauViet(noi) || /^(g\.g|c\.g\.c|c\.c\.c|đpcm|cm)$/i.test(noi));
        if (laNgoacChu) {
          if (mode === 'toan') flush();
          mode = 'chu';
          cur += s.slice(i, dong + 1);
          i = dong + 1;
          continue;
        }
      }
    }

    // Đọc 1 từ/token tới khoảng trắng hoặc lệnh TeX
    let j = i;
    while (j < s.length && !/\s/.test(s[j]) && s[j] !== '\\') j++;
    const tok = s.slice(i, j);
    const laChu: boolean = laTuViet(tok) || (/^[;·•,:]$/.test(tok) && mode === 'chu');
    const nextMode: 'chu' | 'toan' = laChu ? 'chu' : 'toan';
    if (mode && mode !== nextMode) flush();
    mode = nextMode;
    cur += tok;
    i = j;
  }
  flush();

  // Gộp các đoạn liền kề cùng kiểu
  const gop: DoanHien[] = [];
  for (const tk of tokens) {
    const prev = gop[gop.length - 1];
    if (prev && prev.kieu === tk.kieu) {
      prev.s = `${prev.s} ${tk.s}`.replace(/\s+([.,;:!?)])/g, '$1').replace(/(\()\s+/g, '$1');
    } else {
      gop.push({...tk});
    }
  }
  return gop;
}

export function tachVanBanVaToan(raw: string): DoanHien[] {
  const s = chuanTexHinhHoc(raw);
  if (!s) return [];
  const ra: DoanHien[] = [];
  let i = 0;
  let depth = 0;
  let buf = '';

  const dayBuf = () => {
    if (!buf.trim()) { buf = ''; return; }
    for (const seg of tachChuTrongManh(buf)) ra.push(seg);
    buf = '';
  };

  while (i < s.length) {
    if (depth === 0 && s[i] === '\\') {
      const m = /^\\(text|textrm|mbox)\s*\{/.exec(s.slice(i));
      if (m) {
        dayBuf();
        let d = 1;
        let j = i + m[0].length;
        while (j < s.length && d > 0) {
          if (s[j] === '\\' && j + 1 < s.length) { j += 2; continue; }
          if (s[j] === '{') d++;
          else if (s[j] === '}') d--;
          j++;
        }
        const noi = s.slice(i + m[0].length, j - 1).trim();
        if (noi) {
          // Nếu ngoặc mở đứng ngay trước \text{...} và ngoặc đóng đứng ngay sau -> gộp ngoặc vào chữ Việt
          const prev = ra[ra.length - 1];
          const coMo = prev && prev.kieu === 'toan' && prev.s.endsWith('(');
          const coDong = s[j] === ')';
          if (coMo && coDong) {
            prev.s = prev.s.slice(0, -1).trim();
            if (!prev.s) ra.pop();
            ra.push({kieu: 'chu', s: `(${noi})`});
            i = j + 1;
            continue;
          }
          ra.push({kieu: 'chu', s: noi});
        }
        i = j;
        continue;
      }
    }
    if (s[i] === '\\' && i + 1 < s.length) {
      buf += s.slice(i, i + 2);
      i += 2;
      continue;
    }
    if (s[i] === '{') depth++;
    else if (s[i] === '}') depth = Math.max(0, depth - 1);
    buf += s[i];
    i++;
  }
  dayBuf();

  // Gộp đoạn liền kề cùng kiểu
  const cuoi: DoanHien[] = [];
  for (const seg of ra) {
    if (!seg.s) continue;
    const prev = cuoi[cuoi.length - 1];
    if (prev && prev.kieu === seg.kieu) {
      prev.s = `${prev.s} ${seg.s}`.replace(/\s+([.,;:!?)])/g, '$1').replace(/(\()\s+/g, '$1');
    } else {
      cuoi.push({...seg});
    }
  }
  return cuoi;
}

// Ước lượng độ dài hiển thị (bỏ lệnh TeX) để tính cỡ chữ an toàn không cắt chữ
function uocDoDaiHien(raw: string): number {
  const s = chuanTexHinhHoc(raw)
    .replace(/\\textcolor\s*\{[^{}]*\}\s*\{([^{}]*)\}/g, '$1')
    .replace(/\\(?:text|textrm|mbox)\s*\{([^{}]*)\}/g, '$1')
    .replace(/\\d?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, (_, a: string, b: string) => (a.length >= b.length ? a : b))
    .replace(/\\(?:triangle|angle|widehat|perp|parallel|sim|cong|Rightarrow|Leftrightarrow|rightarrow|cap|cup|in|notin|sqrt)/g, 'XX')
    .replace(/\\[a-zA-Z]+/g, 'X')
    .replace(/[{}^_]/g, '');
  return Math.max(1, s.replace(/\s+/g, ' ').trim().length);
}

// Tách đoạn toán chứa dấu ";" khi cho phép xuống dòng để ngắt gọn giữa các vế, và gom cặp "từ cuối + ký hiệu ngắn" (vd "cạnh\u00A0a") chống rớt mồ côi.
type MucHien =
  | {kieu: 'chu' | 'toan'; s: string}
  | {kieu: 'cum'; truoc: string; sau: string};

function taoMucHienWrap(segs: DoanHien[]): MucHien[] {
  const tach: DoanHien[] = [];
  for (const seg of segs) {
    if (seg.kieu === 'toan' && seg.s.includes(';')) {
      const phan = seg.s.split(';');
      phan.forEach((p, idx) => {
        const s = p.trim();
        const coChamPhay = idx < phan.length - 1;
        if (s) tach.push({kieu: 'toan', s: coChamPhay ? `${s};` : s});
        else if (coChamPhay && tach.length) tach[tach.length - 1].s += ';';
      });
    } else if (seg.kieu === 'chu') {
      // Giữ cụm kiểu "cạnh\u00A0a" trong cùng một đoạn chữ thường
      const s = seg.s.replace(/(\S)\s+([a-zA-Z0-9][.,;:!?]?)(?=\s|$)/g, '$1\u00A0$2');
      tach.push({kieu: 'chu', s});
    } else {
      tach.push(seg);
    }
  }
  const ra: MucHien[] = [];
  for (let i = 0; i < tach.length; i++) {
    const cur = tach[i];
    const next = tach[i + 1];
    // Nếu chữ Việt kết thúc bằng 1 từ và ngay sau là ký hiệu/biểu thức toán ngắn (vd "cạnh" + "a;" hoặc "và" + "\dfrac{a\sqrt{6}}{3}") -> dính liền trên cùng dòng
    if (cur.kieu === 'chu' && next?.kieu === 'toan' && uocDoDaiHien(next.s) <= 10) {
      const m = /^(.*\s)?(\S+)$/.exec(cur.s);
      if (m) {
        const dau = (m[1] || '').trim();
        const cuoi = m[2];
        if (dau) ra.push({kieu: 'chu', s: dau});
        ra.push({kieu: 'cum', truoc: cuoi, sau: next.s});
        i++;
        continue;
      }
    }
    ra.push(cur);
  }
  return ra;
}

// Thành phần hiển thị chuẩn Hình học: tiếng Việt đứng thẳng (Be Vietnam Pro) + biểu thức toán KaTeX
export const VanBanToan: React.FC<{
  raw: string;
  size: number;
  minSize?: number;
  color?: string;
  fontWeight?: number;
  maxWidth: number;
  wrap?: boolean;
  align?: 'left' | 'center';
  lineHeight?: number;
}> = ({raw, size, minSize = 26, color = CHU_SANG, fontWeight = 600, maxWidth, wrap = false, align = 'left', lineHeight = 1.24}) => {
  const segs = useMemo(() => tachVanBanVaToan(raw), [raw]);
  const mucHien = useMemo<MucHien[]>(() => (wrap ? taoMucHienWrap(segs) : segs), [segs, wrap]);
  const co = useMemo(() => {
    const len = uocDoDaiHien(raw);
    const heSo = wrap ? (fontWeight >= 700 ? 0.56 : 0.52) : fontWeight >= 700 ? 0.62 : 0.57;
    const uoc = wrap ? Math.floor((maxWidth * 1.88) / (len * heSo)) : Math.floor(maxWidth / (len * heSo));
    return Math.max(minSize, Math.min(size, uoc));
  }, [raw, size, minSize, maxWidth, wrap, fontWeight]);

  if (!segs.length) return null;
  if (segs.length === 1 && segs[0].kieu === 'toan' && !wrap) {
    return (
      <Toan
        tex={segs[0].s}
        size={co}
        color={color}
        maxWidth={maxWidth}
        chuThuong={false}
        can={align === 'left' ? 'trai' : 'giua'}
        style={{fontWeight, lineHeight}}
      />
    );
  }
  const gap = Math.max(5, Math.round(co * 0.22));
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: wrap ? 'wrap' : 'nowrap',
        alignItems: 'baseline',
        justifyContent: align === 'center' ? 'center' : 'flex-start',
        columnGap: gap,
        rowGap: wrap ? 2 : 3,
        maxWidth,
        lineHeight,
        overflow: 'hidden',
      }}
    >
      {mucHien.map((muc, idx) =>
        muc.kieu === 'cum' ? (
          <span
            key={idx}
            style={{
              display: 'inline-flex',
              alignItems: 'baseline',
              gap,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              lineHeight,
            }}
          >
            <span
              style={{
                fontFamily: FONT,
                fontStyle: 'normal',
                fontWeight,
                fontSize: co,
                color,
                whiteSpace: 'nowrap',
                lineHeight,
              }}
            >
              {muc.truoc}
            </span>
            <Toan
              tex={muc.sau}
              size={co}
              color={color}
              maxWidth={maxWidth}
              chuThuong={false}
              can={align === 'left' ? 'trai' : 'giua'}
              style={{fontWeight, lineHeight}}
            />
          </span>
        ) : muc.kieu === 'chu' ? (
          <span
            key={idx}
            style={{
              fontFamily: FONT,
              fontStyle: 'normal',
              fontWeight,
              fontSize: co,
              color,
              whiteSpace: wrap ? 'normal' : 'nowrap',
              lineHeight,
            }}
          >
            {muc.s}
          </span>
        ) : (
          <span key={idx} style={{display: 'inline-flex', alignItems: 'baseline', flexShrink: wrap ? 1 : 0}}>
            <Toan
              tex={muc.s}
              size={co}
              color={color}
              maxWidth={maxWidth}
              chuThuong={false}
              can={align === 'left' ? 'trai' : 'giua'}
              style={{fontWeight, lineHeight}}
            />
          </span>
        ),
      )}
    </div>
  );
};

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
  const laCM =
    /^\s*(?:chứng\s*minh|cm\b|đpcm)/i.test(goc) ||
    (/chứng\s*minh/i.test(goc) && !/\btính\b|bao nhiêu|khoảng cách|góc giữa|thể tích|diện tích/i.test(goc));
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

// Tự trích tóm tắt giả thiết ngắn gọn từ đề bài khi kịch bản cũ (vd vuong_goc_sa.json) thiếu tom_tat_gia_thiet.
export function trichGiaThietTuDe(deGoc?: string, deGhim?: DuKienGhim[]): string[] {
  const ds: string[] = [];
  const daCo = new Set<string>();
  const them = (s: string) => {
    const x = s.replace(/\s+/g, ' ').trim().replace(/[.;,]+$/, '');
    if (!x) return;
    const k = gonSoSanh(x);
    if (!k || daCo.has(k)) return;
    daCo.add(k);
    ds.push(x);
  };
  const goc = String(deGoc || '').replace(/\s+/g, ' ').trim();
  if (goc) {
    // Tách phần trước câu hỏi ("Chứng minh...", "Tính...", "Tìm...")
    const phanCho = goc.split(/\.\s*(?:Chứng minh|Tính|Tìm|Hãy|Xác định)\b/i)[0] || '';
    const sach = phanCho.replace(/^\s*Cho\s+/i, '').trim();
    // Rút gọn cụm hình khối + đáy nếu là bài hình không gian
    const mKhoi = /^(hình\s+chóp|lăng\s+trụ(?:\s+đứng)?|tứ\s+diện(?:\s+đều)?|hình\s+hộp(?:\s+chữ\s+nhật)?|hình\s+lập\s+phương)\s+([A-Z][A-Z'.]+)/i.exec(sach);
    const mDay = /đáy\s+[A-Z']*\s*là\s+(hình\s+vuông|hình\s+chữ\s+nhật|hình\s+thoi|tam\s+giác\s+(?:đều|vuông(?:\s+cân)?|cân|nhọn))(?:\s+cạnh\s+([a-zA-Z0-9\\{}^√]+))?/i.exec(sach);
    if (mKhoi) {
      const tenKhoi = mKhoi[1].replace(/^hình\s+/i, '');
      const khoiHoa = tenKhoi.charAt(0).toUpperCase() + tenKhoi.slice(1) + ' ' + mKhoi[2];
      const dayNgan = mDay ? `, đáy ${mDay[1].replace(/^hình\s+/i, '')}${mDay[2] ? ` cạnh ${mDay[2]}` : ''}` : '';
      them(khoiHoa + dayNgan);
    } else if (sach) {
      them(sach.length > 52 ? sach.slice(0, 52).replace(/\s+\S*$/, '') : sach);
    }
  }
  for (const g of deGhim || []) {
    if (!g?.nhan || g.nhan.includes('?') || g.doi) continue;
    them(g.nhan);
  }
  return ds.slice(0, 3);
}

// Rút gọn chuỗi đẳng thức nhiều vế trong chip T3: chỉ giữ "vế trái = kết quả cuối" (VD "AH = SA·AB/SB = a√6/3" -> "AH = a√6/3")
export function rutGonChipTex(raw: string): string {
  const s = chuanTexHinhHoc(raw).replace(/^\\Rightarrow\s*/, '').trim();
  if (!s) return '';
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '\\' && i + 1 < s.length) { i++; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') depth = Math.max(0, depth - 1);
    else if (depth === 0 && ch === '=') {
      const prev = s[i - 1] || '';
      const next = s[i + 1] || '';
      if (!/[<>!=\\]/.test(prev) && !/[=>]/.test(next)) {
        parts.push(s.slice(start, i).trim());
        start = i + 1;
      }
    }
  }
  parts.push(s.slice(start).trim());
  const sach = parts.filter(Boolean);
  const gon = sach.length >= 3 ? `${sach[0]} = ${sach[sach.length - 1]}` : s;
  // Trong chip 1 dòng cao 46 px, dùng \frac gọn thay vì \dfrac cao để mẫu số không chạm viền pill
  return gon.replace(/\\dfrac\b/g, '\\frac');
}

// Gom tối đa 3 chip kết quả trung gian (VD ✓ BD ⊥ (SAC), ✓ ∠SCA = 45°, ✓ AH = a√6/3) từ các bước đã giảng; không lộ đáp án cuối trước mocCongBo.
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
    const tex = rutGonChipTex(texRaw);
    if (!tex || uocDoDaiHien(tex) > 42) return;
    const k = gonSoSanh(tex);
    if (!k || daCo.has(k)) return;
    daCo.add(k);
    ds.push({id, tex, t: moc});
  };

  for (const c of chipVao || []) them(c.id, c.tex, c.t, false);

  if (ds.length < 3) {
    buoc.forEach((b, bi) => {
      const tSau = bi + 1 < buoc.length ? buoc[bi + 1].t : mocCongBo;
      if (t < tSau - 0.05) return;
      for (let j = b.the.length - 1; j >= 0; j--) {
        const th = b.the[j];
        if (th.loai === 'cong_thuc' && th.dong.length) {
          const dongCuoi = th.dong[th.dong.length - 1].replace(/^\\Rightarrow\s*|^=>\s*/, '').trim();
          if (/[=]|\\perp|\\parallel|\\sim|\\cong|nội tiếp/i.test(dongCuoi)) {
            them(`b${bi}_${j}`, dongCuoi, tSau, !!th.chot);
            break;
          }
        }
      }
    });
  }
  return ds.slice(-3);
}

// Chuyển đổi dong_giai của HINH_PHANG (từ trang_chung_minh) sang BuocGiai[] để T3 không bao giờ trống.
function doiDongGiaiSangBuoc(dongGiai?: HinhPhangDongGiai[]): BuocGiai[] {
  if (!dongGiai?.length) return [];
  return dongGiai.map((tr, idx) => {
    const isCuoi = idx === dongGiai.length - 1 || /kết\s*luận|đáp\s*án/i.test(tr.tieu_de || '');
    const dong = (tr.dong || []).map((d) => String(d.tex || '').trim()).filter(Boolean);
    const moc = (tr.dong || []).map((d) => Number(d.t ?? 0));
    const t0 = moc.length ? Math.max(0, moc[0]) : idx * 6;
    return {
      t: t0,
      nhan: isCuoi ? 'Kết luận' : idx === 0 ? 'Phân tích' : 'Suy luận',
      tieu_de: tr.tieu_de || `Bước ${idx + 1}`,
      mau: isCuoi ? 'ngoc' : idx === 0 ? 'cyan' : 'vang',
      the: [
        {
          loai: 'cong_thuc',
          dong: dong.length ? dong : [tr.tieu_de || ''],
          moc,
          t: t0,
          chot: isCuoi,
        },
      ],
    };
  });
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

// Màu pha nhất quán cho T3 (Cyan: dựng hình, Vàng: tính toán/suy luận, Ngọc: kết luận)
function mauPhaBuoc(b: BuocGiai | null, idx: number, tongBuoc: number, chot: boolean): string {
  if (chot) return MAU_NGOC;
  if (!b) return MAU_CYAN;
  const nhan = `${b.nhan || ''} ${b.tieu_de || ''}`.toLowerCase();
  if (/kết luận|đáp án|đpcm|chốt/.test(nhan) || b.mau === 'ngoc') return MAU_NGOC;
  if (idx === 0 || /đề bài|dựng hình|giả thiết|phân tích/.test(nhan) || b.mau === 'cyan') return MAU_CYAN;
  return MAU_VANG;
}

// Tầng 1: Thẻ kính HUD kỹ thuật tích hợp Header (Story Math • Chuyên mục | badge TÍNH / CHỨNG MINH) + Cho: (28-30px) + Yêu cầu: (32-36px).
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
  const mauYeuCau = kq.daMoKhoa ? MAU_NGOC : kq.loai === 'tinh' ? MAU_VANG : MAU_NGOC;
  const badgeText = kq.loai === 'tinh' ? 'TÍNH' : 'CHỨNG MINH';
  const nhanYeuCau = kq.loai === 'tinh' ? 'Yêu cầu:' : 'Chứng minh:';
  const choChuoi = cho.slice(0, 3).map((x) => x.trim()).filter(Boolean).join(' ; ');

  return (
    <div
      data-the-de-bai="1"
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 18,
        background: 'linear-gradient(180deg, rgba(11,29,62,0.95) 0%, rgba(6,17,38,0.97) 100%)',
        border: `1px solid ${kq.daMoKhoa ? 'rgba(46,230,168,0.72)' : 'rgba(125,211,252,0.36)'}`,
        boxShadow: '0 14px 32px rgba(2,8,22,0.56), inset 0 1px 0 rgba(191,219,254,0.22)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxSizing: 'border-box',
        opacity: vao,
        translate: `0px ${((1 - vao) * -10).toFixed(1)}px`,
      }}
    >
      {/* Viền sáng mảnh cạnh trên HUD */}
      <div
        style={{
          position: 'absolute',
          left: 18,
          right: 18,
          top: 0,
          height: 2,
          borderRadius: 2,
          background: `linear-gradient(90deg, transparent, ${kq.daMoKhoa ? MAU_NGOC : '#7DD3FC'}, transparent)`,
        }}
      />

      {/* Thanh Header tích hợp: Story Math • [Chuyên mục] trái | Badge TÍNH / CHỨNG MINH phải */}
      <div
        style={{
          height: 32,
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15,38,76,0.72)',
          borderBottom: '1px solid rgba(147,197,253,0.16)',
          flexShrink: 0,
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
          <span style={{width: 8, height: 8, borderRadius: 4, background: MAU_CYAN, boxShadow: `0 0 8px ${MAU_CYAN}`}} />
          <span
            data-thuong-hieu="dau"
            data-kd-bo="1"
            style={{fontFamily: FONT, fontSize: 18, fontWeight: 700, color: '#E2E8F0', whiteSpace: 'nowrap', letterSpacing: 0.2}}
          >
            {`${TEN_THUONG_HIEU} • ${chuyenMuc(mon)}`}
          </span>
        </div>
        <span
          data-kd-bo="1"
          style={{
            padding: '2px 12px',
            borderRadius: 999,
            background: kq.loai === 'tinh' ? MAU_VANG : MAU_NGOC,
            color: '#061424',
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: 15,
            letterSpacing: 0.9,
            whiteSpace: 'nowrap',
          }}
        >
          {badgeText}
        </span>
      </div>

      {/* Dòng Cho: cỡ 28-30px (sàn cứng >= 26px), tiếng Việt đứng thẳng + KaTeX chuẩn, chống rớt ký tự đơn mồ côi */}
      <div
        style={{
          flex: 1,
          padding: '3px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          minHeight: 46,
          overflow: 'hidden',
        }}
      >
        <span
          style={{
            flexShrink: 0,
            padding: '3px 10px',
            borderRadius: 8,
            background: 'rgba(56,189,248,0.16)',
            border: '1px solid rgba(56,189,248,0.44)',
            color: MAU_CYAN,
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: 22,
            whiteSpace: 'nowrap',
          }}
        >
          Cho:
        </span>
        <div style={{flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', overflow: 'hidden'}}>
          <VanBanToan
            raw={choChuoi || 'Đọc giả thiết trên hình'}
            size={28}
            minSize={26}
            color={CHU_SANG}
            fontWeight={600}
            maxWidth={RONG_ND - 118}
            wrap
            align="left"
            lineHeight={1.16}
          />
        </div>
      </div>

      {/* Dải nền nhấn ở đáy thẻ cho dòng Yêu cầu: sàn cứng >= 24px (tối đa 2 dòng gọn), luôn giữ gap >= 10px với badge Yêu cầu: */}
      <div
        style={{
          minHeight: 62,
          maxHeight: 92,
          padding: '5px 16px 6px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: kq.daMoKhoa
            ? 'linear-gradient(90deg, rgba(46,230,168,0.22), rgba(46,230,168,0.08))'
            : kq.loai === 'tinh'
              ? 'linear-gradient(90deg, rgba(251,191,36,0.18), rgba(251,191,36,0.06))'
              : 'linear-gradient(90deg, rgba(46,230,168,0.16), rgba(46,230,168,0.05))',
          borderTop: `1px solid ${mauYeuCau}40`,
          borderLeft: `4px solid ${mauYeuCau}`,
          flexShrink: 0,
          boxSizing: 'border-box',
        }}
      >
        <span
          style={{
            flexShrink: 0,
            color: mauYeuCau,
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: 24,
            whiteSpace: 'nowrap',
          }}
        >
          {nhanYeuCau}
        </span>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            overflow: 'hidden',
            transformOrigin: 'left center',
            scale: kq.daMoKhoa ? String(1 + 0.03 * Math.sin(Math.PI * Math.min(1, spMo))) : '1',
          }}
        >
          <VanBanToan
            raw={(kq.noiDungTex || '?').replace(/\\dfrac\b/g, '\\frac')}
            size={uocDoDaiHien(kq.noiDungTex || '') > 28 ? 25 : 33}
            minSize={24}
            color={kq.daMoKhoa ? MAU_NGOC : '#FFFFFF'}
            fontWeight={800}
            maxWidth={RONG_ND - (kq.loai === 'chung_minh' ? 202 : 160) - (kq.daMoKhoa && kq.loai === 'chung_minh' ? 112 : 0)}
            wrap
            align="left"
            lineHeight={1.16}
          />
          {kq.daMoKhoa && kq.loai === 'chung_minh' ? (
            <span
              data-kd-bo="1"
              style={{
                flexShrink: 0,
                padding: '3px 11px',
                borderRadius: 10,
                background: `${MAU_NGOC}26`,
                border: `1.5px solid ${MAU_NGOC}`,
                color: MAU_NGOC,
                fontFamily: FONT,
                fontWeight: 900,
                fontSize: 20,
                whiteSpace: 'nowrap',
              }}
            >
              ✓ ĐPCM
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
};

// 4 dấu ngoặc góc kỹ thuật (CAD/HUD corner brackets) quanh sân khấu T2
const NgoacGocCAD: React.FC<{rong: number; cao: number; mau: string; nhip: number}> = ({rong, cao, mau, nhip}) => {
  const m = 8;
  const d = 28;
  const op = 0.44 + 0.16 * nhip;
  return (
    <svg
      width={rong}
      height={cao}
      viewBox={`0 0 ${rong} ${cao}`}
      data-kd-bo="1"
      style={{position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4}}
    >
      <g stroke="#7DD3FC" strokeWidth={1.8} strokeOpacity={op} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Trên-trái */}
        <path d={`M ${m} ${m + d} L ${m} ${m} L ${m + d} ${m}`} />
        {/* Trên-phải */}
        <path d={`M ${rong - m - d} ${m} L ${rong - m} ${m} L ${rong - m} ${m + d}`} />
        {/* Dưới-trái */}
        <path d={`M ${m} ${cao - m - d} L ${m} ${cao - m} L ${m + d} ${cao - m}`} />
        {/* Dưới-phải */}
        <path d={`M ${rong - m - d} ${cao - m} L ${rong - m} ${cao - m} L ${rong - m} ${cao - m - d}`} />
      </g>
      <g fill={mau} opacity={0.65 + 0.25 * nhip}>
        <circle cx={m} cy={m} r={2.6} />
        <circle cx={rong - m} cy={m} r={2.6} />
        <circle cx={m} cy={cao - m} r={2.6} />
        <circle cx={rong - m} cy={cao - m} r={2.6} />
      </g>
    </svg>
  );
};

// Bản xem trước 2D hình phẳng trong T2 (CHỈ bật khi chưa ghép lớp Manim, vd preview local --gia-lap)
const XemTruocHinhPhang2D: React.FC<{hinh: HinhPhang2DPreview; t: number; rong: number; cao: number; mauNhan: string}> = ({
  hinh,
  t,
  rong,
  cao,
  mauNhan,
}) => {
  const diem = hinh.diem || {};
  const keys = Object.keys(diem);
  if (!keys.length) return null;
  const xs: number[] = [];
  const ys: number[] = [];
  for (const k of keys) { xs.push(diem[k][0]); ys.push(diem[k][1]); }
  for (const tr of hinh.tron || []) {
    xs.push(tr.tam[0] - tr.r, tr.tam[0] + tr.r);
    ys.push(tr.tam[1] - tr.r, tr.tam[1] + tr.r);
  }
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = Math.max(1e-6, maxX - minX);
  const h = Math.max(1e-6, maxY - minY);
  const pad = 68;
  const sc = Math.min((rong - 2 * pad) / w, (cao - 2 * pad) / h);
  const ox = (rong - w * sc) / 2;
  const oy = (cao - h * sc) / 2;
  const mapP = (p: [number, number]): [number, number] => [ox + (p[0] - minX) * sc, oy + (maxY - p[1]) * sc];
  const toDo = new Set(hinh.to_do || []);

  return (
    <svg width={rong} height={cao} viewBox={`0 0 ${rong} ${cao}`} data-hinh-phang-2d="1" style={{position: 'absolute', inset: 0}}>
      {/* Đường tròn chính */}
      {(hinh.tron || []).map((tr, i) => {
        const [cx, cy] = mapP(tr.tam);
        const r = tr.r * sc;
        const a = tr.t !== undefined ? Math.max(0.85, kep01((t - tr.t) / 0.5)) : 1;
        return (
          <g key={`c${i}`} opacity={a}>
            <circle cx={cx} cy={cy} r={r} fill="rgba(56,189,248,0.04)" stroke={MAU_CYAN} strokeWidth={3.2} strokeOpacity={0.85} />
          </g>
        );
      })}
      {/* Các cạnh & đường phụ */}
      {(hinh.net || []).map((n, i) => {
        const pa = diem[n.a], pb = diem[n.b];
        if (!pa || !pb) return null;
        const [x1, y1] = mapP(pa), [x2, y2] = mapP(pb);
        const laKhungDau = (n.t ?? 0) <= 6.0;
        const a = n.t !== undefined ? (laKhungDau ? Math.max(0.72, kep01((t - Math.min(n.t, 0.8)) / 0.6)) : kep01((t - n.t) / 0.45)) : 1;
        const cap = n.a + n.b;
        const capDao = n.b + n.a;
        const laToDo = toDo.has(cap) || toDo.has(capDao);
        const laPhu = n.loai === 'keo' || n.loai === 'phu';
        const mau = laToDo ? mauNhan : laPhu ? MAU_VANG : '#F8FAFC';
        return (
          <g key={`n${i}`} opacity={a}>
            {laToDo ? <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={mau} strokeWidth={9} strokeOpacity={0.18} strokeLinecap="round" /> : null}
            <line
              x1={x1}
              y1={y1}
              x2={x1 + (x2 - x1) * a}
              y2={y1 + (y2 - y1) * a}
              stroke={mau}
              strokeWidth={laToDo ? 4 : laPhu ? 2.6 : 3.2}
              strokeDasharray={laPhu ? '8 6' : undefined}
              strokeLinecap="round"
            />
          </g>
        );
      })}
      {/* Các đỉnh & nhãn */}
      {keys.map((k) => {
        const [px, py] = mapP(diem[k]);
        const nhanRaw = hinh.nhan?.[k];
        const [nx, ny] = nhanRaw ? mapP(nhanRaw) : [px + 18, py - 18];
        const laTo = toDo.has(k);
        return (
          <g key={`p${k}`}>
            {laTo ? <circle cx={px} cy={py} r={11} fill={mauNhan} opacity={0.22} /> : null}
            <circle cx={px} cy={py} r={5.2} fill={laTo ? mauNhan : '#F8FAFC'} stroke="#07142B" strokeWidth={2} />
            <text
              x={nx}
              y={ny}
              textAnchor="middle"
              dominantBaseline="central"
              fill={laTo ? mauNhan : '#F8FAFC'}
              stroke="#07142B"
              strokeWidth={5.5}
              strokeLinejoin="round"
              style={{paintOrder: 'stroke', fontFamily: FONT, fontWeight: 800, fontSize: 30}}
            >
              {k}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

// Trích 2-3 dòng suy luận có căn cứ từ thẻ bước giải
function dongSuyLuanCuaThe(th: TheGiai): string[] {
  if (th.loai === 'cong_thuc') return th.dong.slice(0, 3).map((d) => String(d || '').trim()).filter(Boolean);
  if (th.loai === 'chu') {
    const raw = String(th.noi_dung || '').trim();
    const parts = raw.split(/\n|;\s*(?=[A-ZÀ-Ỹ\\])/).map((x) => x.trim()).filter(Boolean);
    return parts.slice(0, 3);
  }
  if (th.loai === 'casio') return [String(th.ket_qua || '').trim()].filter(Boolean);
  return th.nhan ? [String(th.nhan).trim()] : [];
}

// Tầng 3: Dải chip kết quả trung gian + Thẻ bước giải có thanh nhấn dọc phát sáng + tiến trình chấm ở đáy thẻ.
// Cấm tuyệt đối render hộp rỗng: luôn giữ bước gần nhất hợp lệ.
const TangGiaiHinhHoc: React.FC<{
  buoc: BuocGiai[];
  i: number;
  t: number;
  fps: number;
  mocCongBo: number;
  dapAn?: string;
  chipVao?: ChipKetQua[];
  fallbackYeuCau?: string;
}> = ({buoc, i, t, fps, mocCongBo, dapAn, chipVao, fallbackYeuCau}) => {
  const chips = useMemo(() => trichChipTrungGian(buoc, chipVao, t, mocCongBo, dapAn), [buoc, chipVao, t, mocCongBo, dapAn]);

  // Chống hộp rỗng: tìm bước và thẻ có nội dung gần nhất
  const {bHien, iHien, thHien, t0Hien, dongHien} = useMemo(() => {
    if (!buoc.length) {
      const fb = fallbackYeuCau ? [fallbackYeuCau] : ['Phân tích giả thiết trên hình'];
      return {bHien: null, iHien: 0, thHien: null, t0Hien: 0, dongHien: fb};
    }
    const startIdx = i >= 0 ? i : 0;
    for (let idx = startIdx; idx >= 0; idx--) {
      const b = buoc[idx];
      const dang = theDangGiang(b, t);
      if (dang && b.the[dang.j]) {
        const d = dongSuyLuanCuaThe(b.the[dang.j]);
        if (d.length) return {bHien: b, iHien: idx, thHien: b.the[dang.j], t0Hien: dang.t0, dongHien: d};
      }
      // Fallback sang thẻ có nội dung đầu tiên của chính bước này (tránh rỗng ở khoảng chuyển)
      const thCo = b.the.find((x) => dongSuyLuanCuaThe(x).length > 0);
      if (thCo) return {bHien: b, iHien: idx, thHien: thCo, t0Hien: thCo.t ?? b.t, dongHien: dongSuyLuanCuaThe(thCo)};
    }
    const b0 = buoc[0];
    const th0 = b0.the[0] || null;
    const d0 = th0 ? dongSuyLuanCuaThe(th0) : [b0.tieu_de || fallbackYeuCau || 'Phân tích bài toán'];
    return {bHien: b0, iHien: 0, thHien: th0, t0Hien: b0.t, dongHien: d0.length ? d0 : ['Phân tích bài toán']};
  }, [buoc, i, t, fallbackYeuCau]);

  const chot = !!(thHien?.chot) && t >= mocCongBo;
  const mauPha = mauPhaBuoc(bHien, iHien, buoc.length, chot);
  const coChip = chips.length > 0;
  const caoTheToiDa = coChip ? 358 : 412;
  const coMacDinh = chot ? 38 : dongHien.length >= 3 ? 34 : 37;
  const spThe = spring({frame: Math.max(0, Math.round((t - t0Hien) * fps)), fps, config: {damping: 16, stiffness: 150, mass: 0.75}});
  const aThe = t >= t0Hien ? emRa((t - t0Hien) / 0.3) : 1;

  return (
    <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'flex-start', paddingTop: 2}}>
      {/* Dải chip kết quả trung gian (✓ ...) nổi rõ ngay mép trên thẻ T3 */}
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
            const maxWChip = Math.floor((RONG_ND - 10 * (chips.length - 1)) / chips.length) - 44;
            return (
              <div
                key={c.id}
                style={{
                  height: 46,
                  padding: '0 15px',
                  borderRadius: 23,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  background: 'linear-gradient(180deg, rgba(11,34,68,0.92), rgba(7,22,46,0.95))',
                  border: `1.5px solid ${MAU_NGOC}88`,
                  boxShadow: `0 4px 14px rgba(2,8,20,0.45), inset 0 1px 0 ${MAU_NGOC}33`,
                  opacity: ac,
                  translate: `0px ${((1 - ac) * 8).toFixed(1)}px`,
                  boxSizing: 'border-box',
                }}
              >
                <span style={{color: MAU_NGOC, fontFamily: FONT, fontWeight: 900, fontSize: 22}}>✓</span>
                <VanBanToan raw={c.tex} size={24} minSize={21} color={CHU_SANG} fontWeight={700} maxWidth={Math.max(120, maxWChip)} lineHeight={1.1} />
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Thẻ bước giải chính (KHÔNG BAO GIỜ RỖNG) */}
      <div
        data-the-giai="1"
        {...(chot ? {'data-the-chot': '1'} : {})}
        style={{
          position: 'relative',
          flex: 1,
          maxHeight: caoTheToiDa,
          borderRadius: 20,
          background: chot
            ? 'linear-gradient(180deg, rgba(46,230,168,0.16), rgba(9,24,52,0.93) 48%, rgba(6,16,36,0.96))'
            : 'linear-gradient(180deg, rgba(12,31,64,0.92), rgba(7,19,42,0.95))',
          border: `1px solid ${chot ? `${MAU_NGOC}AA` : `${mauPha}66`}`,
          boxShadow: '0 16px 36px rgba(2,8,20,0.52), inset 0 1px 0 rgba(191,219,254,0.18)',
          padding: '16px 24px 36px 28px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'center',
          overflow: 'hidden',
          opacity: Math.max(0.92, aThe),
          translate: `0px ${((1 - Math.min(1, spThe)) * 12).toFixed(1)}px`,
          boxSizing: 'border-box',
        }}
      >
        {/* Thanh nhấn dọc phát sáng bên trái đổi màu theo pha */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 14,
            bottom: 14,
            width: 6,
            borderRadius: '0 4px 4px 0',
            background: mauPha,
            boxShadow: `0 0 18px ${mauPha}CC`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 84,
            background: `linear-gradient(90deg, ${mauPha}1C, transparent)`,
            pointerEvents: 'none',
          }}
        />
        {/* Vạch sáng mảnh trên đỉnh thẻ */}
        <div
          style={{
            position: 'absolute',
            left: 28,
            right: 28,
            top: 0,
            height: chot ? 3 : 2,
            borderRadius: 2,
            background: `linear-gradient(90deg, transparent, ${mauPha}, transparent)`,
            opacity: 0.9,
          }}
        />

        {/* Tiêu đề [BƯỚC XX] cỡ 28px */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            maxWidth: RONG_ND - 64,
            width: '100%',
            paddingBottom: 8,
            borderBottom: '1px solid rgba(147,197,253,0.14)',
            overflow: 'hidden',
          }}
        >
          <span
            style={{
              flexShrink: 0,
              padding: '3px 12px',
              borderRadius: 10,
              background: chot ? MAU_NGOC : `${mauPha}26`,
              border: `1px solid ${mauPha}88`,
              color: chot ? '#051427' : mauPha,
              fontFamily: FONT,
              fontWeight: 900,
              fontSize: 22,
              letterSpacing: 0.4,
              whiteSpace: 'nowrap',
              ...SO_DEU,
            }}
          >
            {chot ? 'KẾT LUẬN' : `BƯỚC ${String(iHien + 1).padStart(2, '0')}`}
          </span>
          {bHien?.tieu_de ? (
            <VanBanToan
              raw={bHien.tieu_de}
              size={28}
              minSize={24}
              color={chot ? MAU_NGOC : CHU_SANG}
              fontWeight={800}
              maxWidth={RONG_ND - 220}
              align="left"
            />
          ) : null}
        </div>

        {/* Nội dung suy luận 34-38px (tiếng Việt thẳng + KaTeX chuẩn) */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: dongHien.length >= 3 ? 10 : 14,
            width: '100%',
            padding: '6px 0',
          }}
        >
          {dongHien.map((d, k) => {
            const tk =
              thHien?.loai === 'cong_thuc'
                ? Math.max(t0Hien, thHien.moc?.[k] ?? t0Hien + k * 0.4)
                : t0Hien + k * 0.35;
            const ak = k === 0 ? 1 : t >= tk ? emRa((t - tk) / 0.28) : 0.22;
            const laDongCuoi = k === dongHien.length - 1;
            const mauDong = laDongCuoi && (dongHien.length > 1 || chot) ? mauPha : CHU_SANG;
            return (
              <div
                key={k}
                style={{
                  opacity: ak,
                  translate: `0px ${((1 - ak) * 6).toFixed(1)}px`,
                  maxWidth: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <VanBanToan
                  raw={d}
                  size={coMacDinh}
                  minSize={28}
                  color={mauDong}
                  fontWeight={chot || laDongCuoi ? 800 : 600}
                  maxWidth={RONG_ND - 66}
                  wrap={dongHien.length <= 2}
                  align="center"
                />
              </div>
            );
          })}
        </div>

        {/* Dải chấm tiến trình bước ở đáy thẻ T3 */}
        {buoc.length > 1 ? (
          <div
            data-kd-bo="1"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 11,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {buoc.map((_, idx) => {
              const dang = idx === iHien;
              const qua = idx < iHien;
              return (
                <div
                  key={idx}
                  style={{
                    height: 7,
                    width: dang ? 32 : 10,
                    borderRadius: 4,
                    background: dang ? mauPha : qua ? MAU_NGOC : 'rgba(147,197,253,0.28)',
                    boxShadow: dang ? `0 0 10px ${mauPha}AA` : 'none',
                  }}
                />
              );
            })}
          </div>
        ) : null}

        <KhoaThuongHieu viTri="the" />
      </div>
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
    const co = Math.max(26, Math.min(36, Math.floor((RONG_ND - 40) / (Math.max(1, chu.length) * 0.58))));
    const a = kep01((t - cauNay.bat) / 0.14) * (1 - kep01((t - (cauNay.ket - 0.1)) / 0.12));
    return (
      <div data-vung="phu_de" style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: a}}>
        <div
          style={{
            maxWidth: RONG_ND,
            padding: '7px 18px',
            borderRadius: 14,
            background: 'rgba(5,12,27,0.88)',
            border: '1px solid rgba(147,197,253,0.26)',
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: co,
            color: CHU_SANG,
            whiteSpace: 'nowrap',
          }}
        >
          {chu}
        </div>
      </div>
    );
  }
  // Thanh tiến trình đã tích hợp ngay ở đáy thẻ T3 -> T4 chỉ hiển thị khi có phụ đề gọn (tránh lặp 2 thanh chấm)
  return null;
};

export const KhungHinhHoc: React.FC<KhungHinhHocProps> = (p) => {
  const frame = useCurrentFrame();
  const cfg = useVideoConfig();
  const fps = p.fps || cfg.fps || 30;
  const t = frame / fps;
  const bc = boCuc4Tang(true); // Khóa cứng SAFE_ZONE_TIKTOK: x 130..950, y 212..1574

  // Hợp nhất bước giải: ưu tiên p.buoc, fallback sang p.dongGiaiHinhPhang để T3 không bao giờ trống
  const buoc = useMemo(() => {
    const goc = p.buoc?.length ? p.buoc : doiDongGiaiSangBuoc(p.dongGiaiHinhPhang);
    return [...goc].sort((a, b) => a.t - b.t);
  }, [p.buoc, p.dongGiaiHinhPhang]);

  const tong = Math.max(1, p.tongFrame) / fps;
  const mocCongBo = p.tCongBo ?? tong + 1;

  let i = -1;
  buoc.forEach((b, j) => { if (b.t <= t) i = j; });
  const iHien = i >= 0 ? i : 0;
  const chotHien = iHien === buoc.length - 1 && t >= mocCongBo;
  const mauNhan = p.mauNhan || mauPhaBuoc(buoc[iHien] || null, iHien, buoc.length, chotHien);
  const monHien = p.mon || p.cheDo;

  const G = giayIntro(p.mocCau, tong);
  const ra = raIntro(t, G);
  const lechMay = G > 0 && t < G ? {k: 1 + 0.22 * (1 - emRa(t / 1.6)), n: 18 * (1 - emRa(t / 2.2))} : undefined;
  const dichIntro = G > 0 ? (INTRO_SAN.y - bc.t2.y) * (1 - ra) : 0;
  const yT2 = bc.t2.y + dichIntro;

  // Visual Beat chu kỳ 4 giây bằng useCurrentFrame / interpolate (zoom nhẹ 1.00 -> 1.032 + nhịp thở ánh sáng)
  const chuKyBeat = Math.max(30, Math.round(4 * fps));
  const phaBeat = (frame % chuKyBeat) / chuKyBeat;
  const beat = interpolate(phaBeat, [0, 0.5, 1], [0, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.sin),
  });
  const zoomBeat = ra > 0.5 ? 1 + 0.032 * beat : 1;

  // Chuẩn bị dữ kiện Cho / Yêu cầu cho T1 — luôn bảo đảm dòng Cho: có nội dung cho cả HINH_PHANG và HINH_KHONG_GIAN
  const {cho, yeuCau} = useMemo(() => {
    let dsCho = (p.deBai?.cho || []).map((x) => String(x || '').trim()).filter(Boolean);
    let tim = String(p.deBai?.tim || '').trim();
    if (!dsCho.length || !tim) {
      const ghim = p.deGhim || [];
      const mucTim = ghim.find((g) => g.nhan.includes('?') || !!g.doi);
      if (!tim && mucTim?.nhan) tim = mucTim.nhan;
      if (!dsCho.length) dsCho = trichGiaThietTuDe(p.deGoc, ghim);
    }
    if (!tim && p.deGoc) {
      const m = String(p.deGoc).match(/((?:Chứng minh|Tính|Tìm)[^.]*)/i);
      if (m) tim = m[1].trim();
    }
    return {cho: dsCho, yeuCau: tim};
  }, [p.deBai, p.deGhim, p.deGoc]);

  // Tổng hợp sự kiện SFX cho DongCoSfx (tự động khóa âm lượng 0.14-0.18 & cooldown >= 3.5s)
  const suKienSfx = useMemo<SuKienSfxVao[]>(() => {
    const ds: SuKienSfxVao[] = [];
    // 1. Nét phụ xuất hiện (draw.wav)
    if (p.khongGian?.hien) {
      const doanPhu = new Set((p.khongGian.dung?.doan || []).filter((d) => d.vai !== 'khoi').map((d) => d.id));
      for (const [id, moc] of Object.entries(p.khongGian.hien)) {
        if (typeof moc === 'number' && moc > G && (doanPhu.has(id) || /^goc_/.test(id))) {
          ds.push({id: `np_${id}`, loai: 'net_phu', t: moc});
        }
      }
    }
    // 2. Nhảy chip kết quả trung gian (pop.wav)
    for (const c of p.chipTrungGian || []) {
      if (typeof c.t === 'number' && c.t > G) ds.push({id: `chip_${c.id}`, loai: 'ket_qua_chip', t: c.t});
    }
    // 3. Chuyển pha / bước giải & cảnh báo bẫy (whoosh.wav / trap.wav)
    buoc.forEach((b, idx) => {
      if (idx > 0 && b.t > G) {
        const laBay = /bẫy|bay|sai lầm|cẩn thận/i.test(`${b.nhan || ''} ${b.tieu_de || ''}`);
        ds.push({id: `pha_${idx}`, loai: laBay ? 'bay' : 'chuyen_pha', t: b.t});
      }
    });
    // 4. Công bố đáp án (ding.wav)
    if (p.tCongBo !== undefined && p.tCongBo > G && p.tCongBo < tong) {
      ds.push({id: 'cong_bo', loai: 'moc_cong_bo', t: p.tCongBo});
    }
    // 5. Chuyển vào Outro (whoosh.wav)
    if (p.tOutro !== undefined && p.tOutro > G && p.tOutro < tong) {
      ds.push({id: 'outro', loai: 'outro', t: p.tOutro});
    }
    return ds;
  }, [p.khongGian, p.chipTrungGian, buoc, p.tCongBo, p.tOutro, G, tong]);

  const dsCau = useMemo(() => (p.cau || []).flatMap((c) => chiaPhuDeNgan(c)), [p.cau]);
  const cauNay = p.phuDe === 'gon' && ra > 0.5 ? dsCau.find((c) => t >= c.bat && t < c.ket) : undefined;
  const cheDoNen = p.cheDo === 'HINH_KHONG_GIAN' ? 'deep_space_blueprint' : 'blueprint';

  return (
    <AbsoluteFill
      className="k4t"
      data-khung-hinh-hoc={p.cheDo}
      style={{fontFamily: FONT, background: cheDoNen === 'deep_space_blueprint' ? '#050C1B' : '#081A3A', ...SO_DEU}}
    >
      <KieuToan />
      <LopSafeZoneDebug />
      <style>{'div, span { text-wrap: balance; } .katex, .katex * { text-wrap: nowrap; } .k4t .katex .mathnormal:not(:has(+ .msupsub)):not(:has(+ .msupsub) *) { margin-right: 0 !important; }'}</style>
      <NapPhongToan />

      {/* Động cơ SFX theo sự kiện (khóa volume 0.14-0.18 + cooldown cứng >= 3.5s) */}
      <DongCoSfx suKien={suKienSfx} tMin={Math.max(0.3, G - 0.1)} tMax={tong} bat={p.batSfx !== false} />

      {/* Nền bản vẽ kỹ thuật có chiều sâu */}
      <NenBanVeHinhHoc
        cheDo={cheDoNen}
        t={t}
        mocBuoc={buoc.map((b) => b.t)}
        tamSanKhau={bc.t2.y + bc.t2.h / 2}
        mauNhan={mauNhan}
      />

      {/* TẦNG 1: Thẻ kính HUD Đề bài ghim (tích hợp Header Story Math + Badge TÍNH/CHỨNG MINH + Cho + Yêu cầu) */}
      <div data-vung="t1" style={{position: 'absolute', left: bc.le, width: bc.rong, top: bc.t1.y, height: bc.t1.h, opacity: ra, zIndex: 4}}>
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

      {/* TẦNG 2: Sân khấu Hình học + Quầng sáng radial dịu + 4 ngoặc góc CAD + Visual Beat */}
      <div
        data-vung="t2"
        style={{position: 'absolute', left: bc.le, width: bc.rong, top: yT2, height: bc.t2.h, background: 'transparent', overflow: 'visible', zIndex: 2}}
      >
        {/* Quầng sáng radial dịu phía sau khối hình, thở theo Visual Beat */}
        <div
          style={{
            position: 'absolute',
            inset: 18,
            borderRadius: 32,
            background: `radial-gradient(ellipse 62% 58% at 50% 50%, ${mauNhan}22 0%, rgba(56,189,248,0.09) 46%, transparent 76%)`,
            opacity: 0.72 + 0.28 * beat,
            pointerEvents: 'none',
          }}
        />
        {/* 4 ngoặc góc kỹ thuật CAD quanh khung sân khấu (hiện mượt sau Intro) */}
        {ra > 0.25 ? (
          <div style={{position: 'absolute', inset: 0, opacity: ra, pointerEvents: 'none'}}>
            <NgoacGocCAD rong={bc.rong} cao={bc.t2.h} mau={mauNhan} nhip={beat} />
          </div>
        ) : null}

        {/* Khối sân khấu hình học với chuyển động vi mô Visual Beat (scale 1.00 -> 1.032) */}
        <div style={{position: 'absolute', inset: 0, background: 'transparent', scale: zoomBeat.toFixed(4), transformOrigin: '50% 50%'}}>
          {p.khongGian ? (
            <div style={{position: 'absolute', inset: 0, background: 'transparent'}}>
              <SanKhauKhongGian kg={p.khongGian} t={t} rong={bc.rong} cao={bc.t2.h} lechMay={lechMay} />
            </div>
          ) : null}
          {!p.khongGian && !p.children && p.hinh2d ? (
            <XemTruocHinhPhang2D hinh={p.hinh2d} t={t} rong={bc.rong} cao={bc.t2.h} mauNhan={mauNhan} />
          ) : null}
          {p.children ? (
            <div style={{position: 'absolute', inset: 0, background: 'transparent'}}>{p.children}</div>
          ) : null}
        </div>
      </div>

      {/* Watermark động "Story Math" phủ PHÍA TRÊN sân khấu hình Tầng 2 */}
      <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 6}}>
        <KhoaThuongHieu viTri="nuoc" />
      </div>

      {/* TẦNG 3: Dải chip kết quả trung gian + Thẻ bước giải đầy đủ (không bao giờ rỗng) */}
      <div data-vung="t3" style={{position: 'absolute', left: bc.le, width: bc.rong, top: bc.t3.y, height: bc.t3.h, opacity: ra, zIndex: 3}}>
        <TangGiaiHinhHoc
          buoc={buoc}
          i={i}
          t={t}
          fps={fps}
          mocCongBo={mocCongBo}
          dapAn={p.dapAn}
          chipVao={p.chipTrungGian}
          fallbackYeuCau={yeuCau}
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
