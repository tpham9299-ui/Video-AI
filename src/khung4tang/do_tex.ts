// v98 — ƯỚC LƯỢNG CHIỀU CAO CÔNG THỨC (hàm thuần, tất định, test Node đọc được).
// Lỗi thực chiến: thẻ T3 / ô tu_duy_dai_so cấp cố định 84 px cho MỌI dòng có \frac -> phân số 2-3 tầng (\frac{\frac{a}{b}}{c},
// \dfrac, \binom chồng) cao hơn hộp và bị overflow:hidden cắt nửa tử / mẫu. Ở đây đo ĐỘ SÂU phân số để cấp chiều cao thật,
// còn Toan maxHeight (vua.ts) là lớp chặn cuối khi ước lượng vẫn thiếu.

// đọc nhóm {...} bắt đầu tại s[i] === '{' -> [nội dung, chỉ số sau '}']
function nhom(s: string, i: number): [string, number] {
  if (s[i] !== '{') {
    // đối số một ký tự: \frac12
    return [s[i] || '', i + 1];
  }
  let sau = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === '{' && s[j - 1] !== '\\') sau++;
    else if (s[j] === '}' && s[j - 1] !== '\\') {
      sau--;
      if (sau === 0) return [s.slice(i + 1, j), j + 1];
    }
  }
  return [s.slice(i + 1), s.length];
}

const RE_PHAN_SO = /\\(d|t|c)?frac|\\(d|t)?binom/g;

// độ sâu phân số: "a+b" -> 0, "\frac{a}{b}" -> 1, "\frac{\frac{a}{b}}{c}" -> 2; \dfrac tính thêm 0,25 (cỡ hiển thị lớn)
export function doSauPhanSo(tex: string): number {
  const s = String(tex || '');
  let m = 0;
  RE_PHAN_SO.lastIndex = 0;
  let k: RegExpExecArray | null;
  while ((k = RE_PHAN_SO.exec(s))) {
    let i = k.index + k[0].length;
    while (s[i] === ' ') i++;
    const [tu, j] = nhom(s, i);
    let i2 = j;
    while (s[i2] === ' ') i2++;
    const [mau, j2] = nhom(s, i2);
    const d = 1 + (k[1] === 'd' ? 0.25 : 0) + Math.max(doSauPhanSo(tu), doSauPhanSo(mau));
    m = Math.max(m, d);
    RE_PHAN_SO.lastIndex = j2;
  }
  return m;
}

// chiều cao một dòng KaTeX cỡ `co` px: dòng thường ~1,38 em; mỗi tầng phân số thêm ~0,78 em; mũ / căn cao thêm 0,2 em
export function caoDongTex(tex: string, co: number): number {
  const d = doSauPhanSo(tex);
  const phu = /\^\{[^}]*\\frac|\\sqrt\{[^}]*\\frac|\\sum|\\int|\\prod/.test(tex) ? 0.35 : /\^|\\sqrt/.test(tex) ? 0.18 : 0;
  return Math.ceil(co * (1.38 + 0.78 * d + phu));
}

// cỡ chữ lớn nhất (<= co, >= coMin) để danh sách dòng vừa `caoToiDa` (kể cả khoảng cách dòng `gian`)
export function coVuaCao(dong: string[], co: number, caoToiDa: number, gian = 10, coMin = 26): number {
  const tong = (c: number) => dong.reduce((s, d) => s + caoDongTex(d, c), 0) + gian * Math.max(0, dong.length - 1);
  let c = co;
  while (c > coMin && tong(c) > caoToiDa) c -= 1;
  return c;
}
