// v92 — CHỮ TRỘN TOÁN cho tiêu đề bước / nhãn thẻ / thẻ chữ của khung 4 tầng: tách câu thành từng cụm, cụm nào là ký hiệu
// toán (Omega, C(12,3), S_A, S'(r), P(\overline{A})...) đổi sang TeX để KaTeX dựng; còn lại giữ chữ thường.
// Hàm thuần (không React) để test bằng Node.
const HY_LAP = 'Omega|omega|Delta|delta|alpha|beta|gamma|varphi|lambda|sigma|Sigma|theta';

export type CumChu = {tex: boolean; s: string};

export function texHoaCum(w: string): string | null {
  // v96: cụm đã là ký hiệu Unicode (n(Ω), Ā, ⋮) mà không có lệnh TeX -> giữ chữ thường (KaTeX bỏ ký tự Unicode lạ trong chế độ toán)
  if (/[^\x00-\x7F]/.test(w) && !/\\/.test(w)) return null;
  let x = w;
  const goc = x;
  x = x.replace(new RegExp(`(^|[^\\\\A-Za-z])(${HY_LAP})(?![A-Za-z])`, 'g'), '$1\\$2');
  x = x.replace(/\b([CA])\(\s*([\w{}]+)\s*,\s*([\w{}]+)\s*\)/g, '$1_{$2}^{$3}');
  x = x.replace(/\b([A-Za-z])_([A-Za-z0-9]{2,4})(?![A-Za-z0-9{])/g, '$1_{$2}');
  const laToan = x !== goc || /\\[a-zA-Z]|[_^]/.test(x) || /^[A-Za-z]'*\([^()\s]*\)[,.:;!?]?$/.test(x) || /^[A-Za-z]'+[,.:;!?]?$/.test(x);
  if (!laToan) return null;
  // dấu câu dính cuối cụm để ngoài công thức
  return x;
}

export function tachChuToan(s0: string): CumChu[] {
  // gộp "C(12, 3)" / "P( A )" trước khi tách theo khoảng trắng
  const s = String(s0 ?? '').replace(/\(\s*([^()]*?)\s*\)/g, (_, a: string) => `(${a.replace(/\s*,\s*/g, ',')})`).replace(/\s+/g, ' ').trim();
  if (!s) return [];
  const ra: CumChu[] = [];
  // Tách ở khoảng trắng ngoài nhóm. Giữ cả đối số kế tiếp của \frac{a} {b}.
  const words: string[] = [];
  let word = '', depth = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '\\' && i + 1 < s.length) { word += ch + s[++i]; continue; }
    if (ch === '{') depth++;
    if (ch === '}') depth = Math.max(0, depth - 1);
    if (ch === ' ' && !depth && !(s[i + 1] === '{' && /\\[A-Za-z]+|[{}_^]/.test(word))) {
      if (word) words.push(word);
      word = '';
    } else word += ch;
  }
  if (word) words.push(word);
  for (const w of words) {
    const m = /^(.*?)([,.:;!?]*)$/.exec(w)!;
    const tex = texHoaCum(m[1]);
    if (tex) {
      ra.push({tex: true, s: tex});
      if (m[2]) ra.push({tex: false, s: m[2]});
    } else ra.push({tex: false, s: w});
  }
  // nối các cụm chữ thường liền nhau
  const gop: CumChu[] = [];
  for (const c of ra) {
    const cuoi = gop[gop.length - 1];
    if (cuoi && !cuoi.tex && !c.tex) cuoi.s += (/^[,.:;!?]+$/.test(c.s) ? '' : ' ') + c.s;
    else gop.push({...c});
  }
  return gop;
}

// "V(x)" / "S'(r)" / "f" -> [tên hàm, biến] cho bảng biến thiên
export function tachHam(ham?: string, bien?: string): [string, string] {
  const m = /^\s*([A-Za-z])\s*'*\s*(?:\(\s*([a-z])\s*\))?\s*$/.exec(String(ham || ''));
  return [m ? m[1] : 'f', (bien && /^[a-z]$/.test(bien.trim()) ? bien.trim() : m && m[2]) || 'x'];
}
