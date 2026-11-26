// CHUẨN HÓA CHỮ / CÔNG THỨC dùng chung: không bao giờ để mã TeX thô ("\frac{1}{3}", "$P(A)$", "\\cdot") lọt lên màn hình.
//  - chuanTex: sửa lỗi AI hay mắc (dấu $ bao ngoài, gạch chéo bị nhân đôi "\\frac", \( \)) trước khi đưa vào KaTeX.
//  - coTex: chuỗi có ký hiệu TeX cần dựng bằng KaTeX không.
//  - texSangChu: chỗ chỉ hiện được CHỮ THƯỜNG (nhãn SVG, tiêu đề chạy từng ký tự, ảnh bìa...) thì đổi TeX sang ký tự Unicode
//    đọc được: \frac{1}{3} -> 1/3, x^2 -> x², u_{1} -> u₁, \cdot -> ·, \le -> ≤, \overline{A} -> Ā, \binom{5}{2} -> C(5,2).
//  - catChu: cắt chuỗi dài ở ranh giới từ (không cắt giữa lệnh TeX làm KaTeX báo lỗi đỏ).

export function suaChinhTaTiengViet(s: string): string {
  return s
    .replace(/\bxác\s+xuất\b/gi, (m) => (m[0] === 'X' ? 'Xác suất' : 'xác suất'))
    .replace(/\bgiả\s+thuyết\b/gi, (m) => (m[0] === 'G' ? 'Giả thiết' : 'giả thiết'))
    .replace(/\bhình\s+chiêu\b/gi, (m) => (m[0] === 'H' ? 'Hình chiếu' : 'hình chiếu'))
    .replace(/\bđường\s+thăng\b/gi, (m) => (m[0] === 'Đ' ? 'Đường thẳng' : 'đường thẳng'))
    .replace(/\btỉ\s+xuất\b/gi, (m) => (m[0] === 'T' ? 'Tỉ suất' : 'tỉ suất'))
    .replace(/\bnăng\s+xuất\b/gi, (m) => (m[0] === 'N' ? 'Năng suất' : 'năng suất'))
    .replace(/\bkhối\s+chốp\b/gi, (m) => (m[0] === 'K' ? 'Khối chóp' : 'khối chóp'))
    .replace(/\bhình\s+chốp\b/gi, (m) => (m[0] === 'H' ? 'Hình chóp' : 'hình chóp'))
    .replace(/\bvuông\s+gốc\b/gi, (m) => (m[0] === 'V' ? 'Vuông góc' : 'vuông góc'))
    .replace(/\btổng\s+số\s+kết\s+quả\b/gi, (m) => (m[0] === 'T' ? 'Tổng số kết quả' : 'tổng số kết quả'));
}

// Chỉ nhận x giữa các thừa số viết bằng số. Giữ nguyên biến x, 2x và x².
export const dauNhan = (s: string) => s.replace(/(\d)\s*[xX]\s*(?=\d)/g, '$1 × ');

// v89: lỗi escape JSON của AI: "\vdots" viết một gạch chéo -> JSON hiểu "\v" là ký tự điều khiển (vertical tab), "\frac" -> form feed,
// "\times"/"\text" -> tab, "\binom" -> backspace, "\right" -> CR. Khôi phục lại lệnh TeX trước khi dựng.
function khoiPhucEscape(x: string): string {
  return x
    .replace(/\u000B/g, '\\v')
    .replace(/\u000C/g, '\\f')
    .replace(/\u0008/g, '\\b')
    .replace(/\u0009(?=imes|ext|heta|au\b|an\b|o\b|riangle|ilde)/g, '\\t')
    .replace(/\r(?=ight|ho\b)/g, '\\r');
}

// v89: DẤU CÂU LẺ: bỏ ":", ",", "?", ";" ... ở đầu chuỗi; dấu câu đứng sau dấu cách thì dính vào từ trước
// (không bao giờ rớt một mình xuống đầu dòng: ": Nhầm diện tích", "CẮT CHÍNH GIỮA ?", ", 2 thẻ lẻ").
export function chuanDauCau(s: string): string {
  return String(s ?? '')
    .replace(/^[\s:;,.?!–—-]+(?=\S)/u, '')
    .replace(/\s+([:;,?!])(?=\s|$)/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// v89: SỐ ĐỌC THÀNH CHỮ -> CHỮ SỐ ("năm mươi tư" -> 54, "mười cm" -> 10 cm) cho tiêu đề và kịch bản cũ.
const SO_DON: Record<string, number> = {'không': 0, 'zero': 0, 'một': 1, 'mốt': 1, 'hai': 2, 'ba': 3, 'bốn': 4, 'tư': 4, 'năm': 5, 'lăm': 5, 'sáu': 6, 'bảy': 7, 'tám': 8, 'chín': 9};
const laTuSo = (w: string) => w in SO_DON || ['mười', 'mươi', 'trăm', 'linh', 'lẻ', 'nghìn', 'ngàn'].includes(w);
// "mười hai" = 12, "năm mươi tư" = 54, "một trăm linh năm" = 105, "hai nghìn" = 2000; cụm không hợp lệ -> null
function giaTriCum(ws: string[]): number | null {
  let tong = 0, tram = 0, chuc = -1, dv = -1;
  for (const w of ws) {
    if (w === 'trăm') { tram += (dv >= 0 ? dv : 1) * 100; dv = -1; chuc = -1; continue; }
    if (w === 'nghìn' || w === 'ngàn') { tong += (tram + Math.max(0, chuc) * 10 + Math.max(0, dv) || 1) * 1000; tram = 0; chuc = -1; dv = -1; continue; }
    if (w === 'mười') { if (chuc >= 0 || dv >= 0) return null; chuc = 1; continue; }
    if (w === 'mươi') { if (dv < 0) return null; chuc = dv; dv = -1; continue; }
    if (w === 'linh' || w === 'lẻ') { chuc = 0; continue; }
    if (w in SO_DON) { if (dv >= 0) return null; dv = SO_DON[w]; continue; }
  }
  return ws.length ? tong + tram + Math.max(0, chuc) * 10 + Math.max(0, dv) : null;
}
const DON_VI_SAU = /^(cm|mm|m|km|kg|g|mét|xăng-ti-mét|xen-ti-mét|centimet|xentimét|độ|phần|lít|giờ|phút|giây|%|đồng|nghìn|triệu|thẻ|số)$/i;
export function chuSangSo(s: string): string {
  const tu = String(s ?? '').split(/(\s+)/);
  const ra: string[] = [];
  for (let i = 0; i < tu.length; i++) {
    const w = tu[i];
    if (!w.trim() || !laTuSo(w.toLowerCase())) { ra.push(w); continue; }
    const cum: string[] = [];
    let j = i;
    while (j < tu.length && (tu[j].trim() === '' || laTuSo(tu[j].toLowerCase()))) {
      if (tu[j].trim()) cum.push(tu[j].toLowerCase());
      j++;
    }
    while (j > i + 1 && !tu[j - 1].trim()) j--;
    const sau = (tu.slice(j).find((x) => x.trim()) || '').toLowerCase().replace(/[.,;:!?]+$/, '');
    const truoc = (ra.filter((x) => x.trim()).slice(-1)[0] || '').toLowerCase();
    const v = giaTriCum(cum);
    const doi = v !== null && (cum.length >= 2 || DON_VI_SAU.test(sau) || /^(bằng|=|là|<|>|phần|chia|nhân|cộng|trừ)$/.test(truoc) || cum[0] === 'zero');
    if (!doi) { ra.push(w); continue; }
    ra.push(String(v));
    i = j - 1;
  }
  return ra.join('')
    .replace(/\s*\b(xăng-ti-mét|xen-ti-mét|xentimét|centimet)\b/gi, ' cm')
    .replace(/(\d)\s+phần\s+(\d+)/gi, '$1/$2');
}

// v89: TIÊU ĐỀ CHUẨN TOÁN: "V PHẨY BẰNG ZERO" -> "V'(x) = 0", "MƯỜI CM" -> "10 cm", bỏ dấu câu lẻ ở đầu/đứng riêng.
export function chuanTieuDe(s: string): string {
  let x = chuanDauCau(String(s ?? ''));
  x = x.replace(/(^|\s)([A-Za-z])\s+phẩy(?=\s|$)/giu, "$1$2'");
  x = chuSangSo(x);
  x = x.replace(/\s+bằng\s+(?=[\d\-−(]|[A-Za-z](?:\s|$|'))/giu, ' = ');
  x = x.replace(/(^|\s)([A-Za-z]')\s*=\s*0(?![\d,.])/g, '$1$2(x) = 0');
  return x;
}

// v89: IN HOA nhưng giữ nguyên cụm toán / đơn vị ("Phân tích V(x) = u · v" -> "PHÂN TÍCH V(x) = u · v", không thành "V(X) = U · V").
export function inHoaGiuToan(s: string): string {
  return String(s ?? '').split(/(\s+)/).map((w) => (/[\d=<>/^²³π'()·×÷−+√⋮;]/.test(w) || /^[a-zA-Z]$/.test(w) || /^(cm|mm|m|km|kg|g|dm|ha|m²|m³|cm²|cm³)[.,:;!?]?$/.test(w) ? w : w.toUpperCase())).join('');
}

export function chuanTex(s: unknown): string {
  let x = typeof s === 'string' ? s : s === null || s === undefined ? '' : String(s);
  x = khoiPhucEscape(x);
  x = x.replace(/\\\\(?=[a-zA-Z])/g, '\\');            // "\\frac" (thừa một lớp escape) -> "\frac"
  x = x.replace(/(^|[^\\])\\:?\s*\\(?=\d)/g, '$1\\vdots ');   // "120\:\4" (lệnh \vdots bị mất chữ) -> "120 \vdots 4"
  if (/\\[a-zA-Z]|[_^{]/.test(x)) x = x.replace(/⋮/g, ' \\vdots ');
  // dấu chấm câu dùng làm PHÉP NHÂN ("4x . (30-x)^2", "(u . v)'") -> dấu nhân toán học
  x = x.replace(/([\w)\]}²³'])\s+\.\s+(?=[\w(\\])/g, (_, a) => `${a} ${/[À-ỹ]/.test(x) && !/\\/.test(x) ? '·' : '\\cdot'} `);
  x = x.replace(/\\\(|\\\)|\\\[|\\\]/g, ' ');           // \( ... \) \[ ... \]
  x = x.replace(/\$\$?/g, ' ');                         // $...$ / $$...$$
  return suaChinhTaTiengViet(dauNhan(x).replace(/\s+/g, ' ').trim());
}

export const coTex = (s: string) => /\\[a-zA-Z]+|[_^]\{|[A-Za-z0-9)][_^][A-Za-z0-9]/.test(s);

const SO_TREN: Record<string, string> = {'0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾', n: 'ⁿ', i: 'ⁱ', k: 'ᵏ', x: 'ˣ'};
const SO_DUOI: Record<string, string> = {'0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉', '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎', n: 'ₙ', i: 'ᵢ', k: 'ₖ', x: 'ₓ', a: 'ₐ', e: 'ₑ', o: 'ₒ', m: 'ₘ', t: 'ₜ'};
const doiKyTu = (s: string, bang: Record<string, string>, du: string) => (Array.from(s).every((c) => bang[c]) ? Array.from(s).map((c) => bang[c]).join('') : `${du}(${s})`);

const LENH: Record<string, string> = {
  cdot: '·', times: '×', div: '÷', pm: '±', mp: '∓', le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', neq: '≠', approx: '≈', equiv: '≡',
  infty: '∞', pi: 'π', alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', Delta: 'Δ', theta: 'θ', lambda: 'λ', mu: 'μ', sigma: 'σ', Sigma: 'Σ',
  omega: 'ω', Omega: 'Ω', varphi: 'φ', phi: 'φ', cap: '∩', cup: '∪', in: '∈', notin: '∉', subset: '⊂', emptyset: '∅', varnothing: '∅',
  Rightarrow: '⇒', rightarrow: '→', to: '→', Leftrightarrow: '⇔', iff: '⇔', angle: '∠', circ: '°', degree: '°', perp: '⊥', parallel: '∥',
  ldots: '…', cdots: '⋯', dots: '…', vdots: '⋮', sum: 'Σ', prod: 'Π', triangle: '△', sim: '~', percent: '%', quad: ' ', qquad: ' ',
};

// SỐ THẬP PHÂN KIỂU VIỆT: "3.46m" -> "3,46m" (công thức và nhãn trên hình cùng dùng dấu phẩy như "10,8").
// Chỉ đổi số có ĐÚNG MỘT dấu chấm (không đụng "1.000.000", "v1.2.3"); trong TeX viết {,} để KaTeX không chèn khoảng trắng.
export function thapPhanViet(s: string, tex = false): string {
  // tiền "249.000đ", "6.000 đồng": dấu chấm là dấu NGHÌN, giữ nguyên
  return s
    // tiền viết kiểu Anh "500,000 đồng" -> "500.000 đồng"
    .replace(/(\d{1,3})((?:,\d{3})+)(?=\s*(?:đ|Đ|đồng|VND|vnđ)(?!\p{L}))/gu, (_, a, b) => a + b.replace(/,/g, '.'))
    .replace(/(^|[^\d.\w])(\d+)\.(\d+)(?![\d.])(?!\s*(?:đ|Đ|đồng|VND|vnđ|k\b|nghìn|triệu))/g, (_, a, b, c) => {
      // 29.50 -> 29,5 (thống nhất một cách viết); "1.000" (3 chữ số sau dấu chấm, dễ là phần nghìn) giữ nguyên chữ số
      const le = String(c).length === 3 ? String(c) : String(c).replace(/0+$/, '');
      return le ? `${a}${b}${tex ? '{,}' : ','}${le}` : `${a}${b}`;
    });
}

const LENH_HAM_TEX = new Set(['sin', 'cos', 'tan', 'cot', 'log', 'ln', 'lg', 'max', 'min', 'lim', 'exp', 'det', 'mod', 'gcd']);
const LENH_KATEX_HOP_LE = new Set([
  ...Object.keys(LENH), ...LENH_HAM_TEX,
  'frac', 'dfrac', 'tfrac', 'binom', 'dbinom', 'tbinom', 'sqrt', 'overline', 'bar', 'widehat', 'vec', 'overrightarrow',
  'text', 'textrm', 'textbf', 'textit', 'mathrm', 'mathbf', 'mathit', 'boldsymbol', 'operatorname', 'mbox',
  'color', 'textcolor', 'colorbox', 'hl', 'mvang', 'mdo', 'mngoc', 'mcam', 'mla',
  'left', 'right', 'displaystyle', 'limits', 'begin', 'end', 'not', 'mid', 'nmid', 'cong', 'implies', 'Longrightarrow',
  'big', 'Big', 'bigg', 'Bigg', 'setminus', 'forall', 'exists', 'dpcm', 'Omega',
]);

export function kiemTraTexHopLe(s: unknown): boolean {
  const x = typeof s === 'string' ? s.trim() : '';
  if (!x) return true;
  if (/\$|\\\\[A-Za-z]|\\$/.test(x)) return false;
  let depth = 0;
  for (let i = 0; i < x.length; i++) {
    const ch = x[i];
    if (ch === '\\' && i + 1 < x.length) { i++; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { if (--depth < 0) return false; }
  }
  if (depth !== 0) return false;
  if (/\\(?:text|textrm|textbf|textit|mathrm|mathbf|overline|bar|sqrt|color|[dt]?frac|[dt]?binom)\s*(?:\{\s*\}|$)/.test(x)) return false;
  if (/\\(?:[dt]?frac|[dt]?binom|textcolor)\s*\{[^{}]*\}\s*(?:$|[^\{\s])/.test(x)) return false;
  const cmds = x.matchAll(/\\([A-Za-z]+)/g);
  for (const m of cmds) {
    if (!LENH_KATEX_HOP_LE.has(m[1])) return false;
  }
  return true;
}

export function texSangChu(s: unknown): string {
  let x = chuanTex(s);
  x = x.replace(/\\not\s*\\vdots|\\nmid|∤|\\not\s*⋮|(?<![\wÀ-ỹ])not\s*⋮/g, 'không ⋮ ');
  if (!coTex(x) && !/[{}\\]/.test(x)) return thapPhanViet(x.replace(/(?<![A-Za-z\\])Omega(?![A-Za-z])/g, 'Ω'));
  const nhom = '\\{([^{}]*)\\}';
  for (let lan = 0; lan < 6; lan++) {
    const truoc = x;
    x = x.replace(new RegExp(`\\\\textcolor\\s*${nhom}\\s*${nhom}`, 'g'), '$2');
    x = x.replace(new RegExp(`\\{\\s*\\\\color\\s*${nhom}\\s*([^{}]*)\\}`, 'g'), '$2');
    x = x.replace(new RegExp(`\\\\color\\s*${nhom}`, 'g'), '');
    x = x.replace(new RegExp(`\\\\[dt]?frac\\s*${nhom}\\s*${nhom}`, 'g'), (_, a, b) => `${/^[\w.,]+$/.test(a) ? a : `(${a})`}/${/^[\w.,]+$/.test(b) ? b : `(${b})`}`);
    x = x.replace(new RegExp(`\\\\[dt]?binom\\s*${nhom}\\s*${nhom}`, 'g'), 'C($1,$2)');
    x = x.replace(new RegExp(`\\\\sqrt\\s*\\[([^\\]]*)\\]\\s*${nhom}`, 'g'), (_, n, a) => `${doiKyTu(n, SO_TREN, '')}√${a.length > 1 ? `(${a})` : a}`);
    x = x.replace(new RegExp(`\\\\sqrt\\s*${nhom}`, 'g'), (_, a) => `√${a.length > 1 ? `(${a})` : a}`);
    x = x.replace(new RegExp(`\\\\(?:overline|bar)\\s*${nhom}`, 'g'), (_, a) => Array.from(a).map((c) => c + '̅').join(''));
    x = x.replace(new RegExp(`\\\\(?:text|textrm|mathrm|mathbf|textbf|textit|operatorname|mathit|boldsymbol|mbox|hl)\\s*${nhom}`, 'g'), '$1');
    x = x.replace(new RegExp(`\\^\\s*${nhom}`, 'g'), (_, a) => doiKyTu(a, SO_TREN, '^'));
    x = x.replace(new RegExp(`_\\s*${nhom}`, 'g'), (_, a) => doiKyTu(a, SO_DUOI, '_'));
    if (x === truoc) break;
  }
  // chỉ số chữ nhiều ký tự (S_max, S_min, v_tb): đổi cả cụm, không chỉ chữ đầu ("Sₘax")
  x = x.replace(/_([a-z]{2,4})(?![a-z])/g, (_, a) => (Array.from(a as string).every((c) => SO_DUOI[c]) ? Array.from(a as string).map((c) => SO_DUOI[c]).join('') : ` ${a}`));
  x = x.replace(/\^([0-9a-z+\-])/g, (_, a) => doiKyTu(a, SO_TREN, '^'));
  x = x.replace(/_([0-9a-z])/g, (_, a) => doiKyTu(a, SO_DUOI, '_'));
  x = x.replace(/\\left|\\right|\\displaystyle|\\limits/g, '');
  x = x.replace(/\\[,;:!> ]/g, ' ').replace(/\\%/g, '%').replace(/\{,\}/g, ',');
  x = x.replace(/\\([a-zA-Z]+)/g, (_, ten) => (LENH[ten] !== undefined ? LENH[ten] : LENH_HAM_TEX.has(ten) ? ten : ''));
  x = x.replace(/(?<![A-Za-z\\])Omega(?![A-Za-z])/g, 'Ω');
  return thapPhanViet(x.replace(/[{}\\]/g, '').replace(/\s+/g, ' ').trim());
}

// cắt văn bản thường theo biên từ (không bao giờ cắt giữa từ hay giữa lệnh TeX / ngoặc {...})
export function lamSachChu(s: unknown, max = 0): string {
  const sach = texSangChu(s);
  if (!max || sach.length <= max) return sach;
  const tu = sach.split(/\s+/).filter(Boolean);
  let ra = '';
  for (const w of tu) {
    const thu = ra ? `${ra} ${w}` : w;
    if (thu.length > max) {
      if (!ra) return w;
      break;
    }
    ra = thu;
  }
  return ra.replace(/[\s,.;:–-]+$/, '');
}

// cắt chuỗi dài: chữ thường cắt ở ranh giới từ + "…"; công thức/ngoặc TeX hợp lệ giữ nguyên (không cắt giữa lệnh làm KaTeX lỗi)
export function catChu(s: string, max: number): string {
  const x = String(s ?? '').trim();
  if (!max || x.length <= max) return x;
  if (/[\\{}^_$]/.test(x)) return kiemTraTexHopLe(x) ? x : lamSachChu(x, max);
  const gon = lamSachChu(x, Math.max(1, max - 1));
  return gon.length < x.length ? `${gon}…` : gon;
}

// Công thức trộn chữ tiếng Việt ("Cửa bạn chọn: \frac{1}{3}"): KaTeX coi chữ là biến (nghiêng, mất khoảng trắng) -> bọc các cụm
// chữ thường vào \text{...}. Không đụng lệnh TeX, biến 1 chữ cái, tên hàm (sin, cos, log, max...) và phần đã nằm trong \text{}.
const HAM = new Set(['sin', 'cos', 'tan', 'cot', 'log', 'ln', 'lg', 'max', 'min', 'lim', 'exp', 'det', 'mod', 'gcd']);
const TU_VIET_NGAN = new Set(['bi', 'ca', 'xe', 'so', 'la', 'co', 'ta', 'ra', 'va', 'do', 'tu', 'de', 'cm', 'dm', 'mm', 'km', 'kg', 'ha']);
export function bocChuViet(tex: string): string {
  // dấu % trong KaTeX là CHÚ THÍCH (mất cả phần sau: "Lãi 1,2%/tháng" thành "Lãi 1,2") -> phải viết \%
  // \frac thường thu tử/mẫu còn ~70% -> nhỏ hơn hẳn số bên cạnh: dùng \dfrac để tử/mẫu CÙNG CỠ với số thường
  // S_max: KaTeX chỉ hạ chữ đầu ("S" + chỉ số "m" + "ax") -> bọc cả cụm chỉ số: S_{max}
  const x = thapPhanViet(chuanTex(tex), true).replace(/(^|[^\\])%/g, '$1\\%').replace(/\\frac(?=\s*\{)/g, '\\dfrac').replace(/_([a-zA-Z]{2,4})(?![a-zA-Z{])/g, '_{$1}')
    .replace(/(\d|\})\s*\\[,;: ]\s*(km|cm|mm|m|kg|g|ha|l)(?=\^|[^a-zA-Z]|$)/g, '$1\\,\\text{$2}')   // đơn vị "30\\,m": chữ đứng, không nghiêng như biến
    .replace(/<=>/g, ' \\Leftrightarrow ').replace(/=>/g, ' \\Rightarrow ').replace(/-+>/g, ' \\rightarrow ');   // mũi tên gõ tay "->" (KaTeX hiện thành dấu trừ và dấu lớn hơn)
  if (!/[A-Za-zÀ-ỹ]{2,}/.test(x)) return x;
  let ra = '';
  let i = 0;
  const re = /\\(?:text|mathrm|textbf|operatorname|mbox|textcolor|color|begin|end)\s*\{[^{}]*\}|\\[a-zA-Z]+|[A-Za-zÀ-ỹ]+(?:[ ]+[A-Za-zÀ-ỹ]+)*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(x))) {
    ra += x.slice(i, m.index);
    const w = m[0];
    i = m.index + w.length;
    if (w[0] === '\\') { ra += w; continue; }
    const tu = w.split(/ +/);
    const laChu = /[À-ỹ]/.test(w) || tu.length > 1 || TU_VIET_NGAN.has(w.toLowerCase()) || (w.length >= 3 && !HAM.has(w) && !/^[A-Z]{3,4}$/.test(w));
    if (!laChu) { ra += w; continue; }
    // giữ khoảng trắng hai bên cụm chữ (KaTeX bỏ khoảng trắng ngoài \text)
    const truoc = /\s$/.test(x.slice(0, m.index)) && ra.trim() ? ' ' : '';
    const sau = /^\s/.test(x.slice(i)) && x.slice(i).trim() ? ' ' : '';
    ra += `\\text{${truoc}${w}${sau}}`;
  }
  return ra + x.slice(i);
}
