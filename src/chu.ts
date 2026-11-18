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

export function chuanTex(s: unknown): string {
  let x = typeof s === 'string' ? s : s === null || s === undefined ? '' : String(s);
  x = x.replace(/\\\\(?=[a-zA-Z])/g, '\\');            // "\\frac" (thừa một lớp escape) -> "\frac"
  x = x.replace(/\\\(|\\\)|\\\[|\\\]/g, ' ');           // \( ... \) \[ ... \]
  x = x.replace(/\$\$?/g, ' ');                         // $...$ / $$...$$
  return suaChinhTaTiengViet(x.replace(/\s+/g, ' ').trim());
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
  return s.replace(/(^|[^\d.\w])(\d+)\.(\d+)(?![\d.])(?!\s*(?:đ|Đ|đồng|VND|vnđ|k\b|nghìn|triệu))/g, (_, a, b, c) => `${a}${b}${tex ? '{,}' : ','}${c}`);
}

export function texSangChu(s: unknown): string {
  let x = chuanTex(s);
  if (!coTex(x) && !/[{}]/.test(x)) return thapPhanViet(x);
  const nhom = '\\{([^{}]*)\\}';
  for (let lan = 0; lan < 6; lan++) {
    const truoc = x;
    x = x.replace(new RegExp(`\\\\[dt]?frac\\s*${nhom}\\s*${nhom}`, 'g'), (_, a, b) => `${/^[\w.,]+$/.test(a) ? a : `(${a})`}/${/^[\w.,]+$/.test(b) ? b : `(${b})`}`);
    x = x.replace(new RegExp(`\\\\binom\\s*${nhom}\\s*${nhom}`, 'g'), 'C($1,$2)');
    x = x.replace(new RegExp(`\\\\sqrt\\s*\\[([^\\]]*)\\]\\s*${nhom}`, 'g'), (_, n, a) => `${doiKyTu(n, SO_TREN, '')}√${a.length > 1 ? `(${a})` : a}`);
    x = x.replace(new RegExp(`\\\\sqrt\\s*${nhom}`, 'g'), (_, a) => `√${a.length > 1 ? `(${a})` : a}`);
    x = x.replace(new RegExp(`\\\\(?:overline|bar)\\s*${nhom}`, 'g'), (_, a) => Array.from(a).map((c) => c + '̅').join(''));
    x = x.replace(new RegExp(`\\\\(?:text|mathrm|mathbf|textbf|operatorname|mathit|boldsymbol)\\s*${nhom}`, 'g'), '$1');
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
  x = x.replace(/\\([a-zA-Z]+)/g, (m, ten) => (LENH[ten] !== undefined ? LENH[ten] : ten));
  return thapPhanViet(x.replace(/[{}]/g, '').replace(/\s+/g, ' ').trim());
}

// cắt chuỗi dài: chữ thường cắt ở ranh giới từ + "…"; công thức không cắt (cắt giữa lệnh làm KaTeX báo lỗi)
export function catChu(s: string, max: number): string {
  if (s.length <= max || coTex(s)) return s;
  const cat = s.slice(0, max - 1);
  const i = cat.lastIndexOf(' ');
  return (i > max * 0.6 ? cat.slice(0, i) : cat).replace(/[\s,.;:–-]+$/, '') + '…';
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
  const re = /\\(?:text|mathrm|textbf|operatorname|mbox)\s*\{[^{}]*\}|\\[a-zA-Z]+|[A-Za-zÀ-ỹ]+(?:[ ]+[A-Za-zÀ-ỹ]+)*/g;
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
