// Công cụ cho hiệu ứng kiểu Manim: hàm làm mượt, tách công thức LaTeX thành các "thành phần", và ghép thành phần giữa hai dòng (TransformMatchingTex).
// Thuần (không phụ thuộc React) nên kiểm thử được.

const sig = (x: number) => 1 / (1 + Math.exp(-x));
// Hàm "smooth" của Manim (rate_func mặc định): chậm lúc đầu và cuối, nhanh ở giữa.
export const smooth = (t: number, k = 10): number => {
  const e = sig(-k / 2);
  return Math.min(1, Math.max(0, (sig(k * (t - 0.5)) - e) / (1 - 2 * e)));
};
export const kep01 = (t: number) => Math.min(1, Math.max(0, t));

export type LoaiTu = 'quanhe' | 'toantu' | 'khac';
export type Tu = {s: string; loai: LoaiTu};

const QUAN_HE = new Set(['=', '<', '>', '\\approx', '\\neq', '\\ne', '\\le', '\\leq', '\\ge', '\\geq', '\\Rightarrow', '\\Leftrightarrow', '\\to', '\\rightarrow', '\\in', '\\notin', '\\subset', '\\subseteq']);
const TOAN_TU = new Set(['+', '-', '\\times', '\\cdot', '\\div', '\\cup', '\\cap', '\\pm', '\\setminus']);

const hetNhom = (s: string, i: number, mo: string, dong: string): number => {
  // s[i] === mo; trả về chỉ số của ký tự đóng tương ứng (hoặc cuối chuỗi nếu thiếu)
  let d = 0;
  for (let k = i; k < s.length; k++) {
    if (s[k] === '\\') {
      k++;
      continue;
    }
    if (s[k] === mo) d++;
    else if (s[k] === dong) {
      d--;
      if (d === 0) return k;
    }
  }
  return s.length - 1;
};

// gắn các chỉ số trên/dưới ^{..} ^x _{..} _x ngay sau vị trí k
const ganChiSo = (s: string, k: number): number => {
  while (k < s.length && (s[k] === '^' || s[k] === '_')) {
    k++;
    if (s[k] === '{') k = hetNhom(s, k, '{', '}') + 1;
    else if (s[k] === '\\') {
      let j = k + 1;
      while (j < s.length && /[A-Za-z]/.test(s[j])) j++;
      k = Math.max(j, k + 2);
    } else k++;
  }
  return k;
};

export function tachTu(nguon: string): Tu[] {
  const s = String(nguon).replace(/\s+/g, ' ').trim();
  const kq: Tu[] = [];
  const them = (t: string) => {
    const x = t.trim();
    if (x) kq.push({s: x, loai: QUAN_HE.has(x) ? 'quanhe' : TOAN_TU.has(x) ? 'toantu' : 'khac'});
  };
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === ' ') {
      i++;
      continue;
    }
    if (c === '\\') {
      let j = i + 1;
      while (j < s.length && /[A-Za-z]/.test(s[j])) j++;
      if (j === i + 1) j = i + 2; // \, \; \{ ...
      const lenh = s.slice(i, j);
      if (QUAN_HE.has(lenh) || TOAN_TU.has(lenh)) {
        them(lenh);
        i = j;
        continue;
      }
      if (lenh === '\\left') {
        let d = 1;
        let k = j;
        while (k < s.length && d > 0) {
          if (s.startsWith('\\left', k)) {
            d++;
            k += 5;
          } else if (s.startsWith('\\right', k)) {
            d--;
            k += 6;
          } else k++;
        }
        k = Math.min(s.length, k + 1);
        k = ganChiSo(s, k);
        them(s.slice(i, k));
        i = k;
        continue;
      }
      let k = j;
      for (;;) {
        let m = k;
        while (s[m] === ' ') m++;
        if (s[m] === '{') k = hetNhom(s, m, '{', '}') + 1;
        else if (s[m] === '[' && lenh === '\\sqrt') k = hetNhom(s, m, '[', ']') + 1;
        else break;
      }
      k = ganChiSo(s, k);
      them(s.slice(i, k));
      i = k;
      continue;
    }
    if (c === '(' || c === '[') {
      const dong = c === '(' ? ')' : ']';
      let k = hetNhom(s, i, c, dong) + 1;
      k = ganChiSo(s, k);
      them(s.slice(i, k));
      i = k;
      continue;
    }
    if (c === '{') {
      let k = hetNhom(s, i, '{', '}') + 1;
      k = ganChiSo(s, k);
      them(s.slice(i, k));
      i = k;
      continue;
    }
    if (/[A-Za-z0-9.]/.test(c)) {
      let j = i;
      while (j < s.length) {
        if (/[A-Za-z0-9.]/.test(s[j])) j++;
        else if (s.startsWith('{,}', j)) j += 3;
        else if (s[j] === ',' && /\d/.test(s[j - 1] || '') && /\d/.test(s[j + 1] || '')) j++;
        else break;
      }
      j = ganChiSo(s, j);
      them(s.slice(i, j));
      i = j;
      continue;
    }
    them(c);
    i++;
  }
  return kq;
}

export type CapTu = {a: number | null; b: number | null; kieu: 'giu' | 'thay' | 'mat' | 'moi'};

// Ghép thành phần dòng A với dòng B: phần giống hệt giữ lại (trượt về chỗ mới), phần khác trong cùng khoảng thì "thay thế", còn dư thì biến mất hoặc xuất hiện mới.
export function ghepTu(A: Tu[], B: Tu[]): CapTu[] {
  const n = A.length;
  const m = B.length;
  const L: number[][] = Array.from({length: n + 1}, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      L[i][j] = A[i].s === B[j].s ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    }
  }
  const neo: [number, number][] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (A[i].s === B[j].s) {
      neo.push([i, j]);
      i++;
      j++;
    } else if (L[i + 1][j] >= L[i][j + 1]) i++;
    else j++;
  }
  neo.push([n, m]);
  const kq: CapTu[] = [];
  let pa = 0;
  let pb = 0;
  for (const [na, nb] of neo) {
    const ra: number[] = [];
    const rb: number[] = [];
    for (let x = pa; x < na; x++) ra.push(x);
    for (let y = pb; y < nb; y++) rb.push(y);
    const chung = Math.min(ra.length, rb.length);
    for (let k = 0; k < chung; k++) kq.push({a: ra[k], b: rb[k], kieu: 'thay'});
    for (let k = chung; k < ra.length; k++) kq.push({a: ra[k], b: null, kieu: 'mat'});
    for (let k = chung; k < rb.length; k++) kq.push({a: null, b: rb[k], kieu: 'moi'});
    if (na < n && nb < m) kq.push({a: na, b: nb, kieu: 'giu'});
    pa = na + 1;
    pb = nb + 1;
  }
  return kq;
}

// Số ký tự gần đúng của công thức (bỏ lệnh LaTeX) để quyết định có dùng hiệu ứng biến hình hay không.
export const doDaiHienThi = (tex: string) => String(tex).replace(/\\[a-zA-Z]+/g, 'x').replace(/[{}\s]/g, '').length;
export const coTheBienDoi = (dong: string[]) => dong.length >= 1 && dong.length <= 4 && dong.every((d) => doDaiHienThi(d) <= 64 && tachTu(d).length <= 24);

export type Hang = {dong: string[]; chiSo: number[]};

// Chế độ "cong_don" (như video mẫu): dòng nào là phần MỞ RỘNG của dòng trước (cùng phần đầu, nối thêm "= ...") thì lớn lên ngay tại chỗ;
// dòng khác thì xuống một hàng mới bên dưới và được "viết" ra.
export function nhomHang(dong: string[]): Hang[] {
  const hang: Hang[] = [];
  let truoc: Tu[] | null = null;
  dong.forEach((d, i) => {
    const tk = tachTu(d);
    const cuoi = hang[hang.length - 1];
    if (cuoi && truoc && truoc.length >= 2 && tk.length > truoc.length && truoc.every((x, k) => tk[k].s === x.s)) {
      cuoi.dong.push(d);
      cuoi.chiSo.push(i);
    } else hang.push({dong: [d], chiSo: [i]});
    truoc = tk;
  });
  return hang;
}
export const coTheCongDon = (dong: string[]) => dong.length >= 1 && dong.length <= 6 && dong.every((d) => doDaiHienThi(d) <= 64 && tachTu(d).length <= 26);
