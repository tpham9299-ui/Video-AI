// v99.5 — SỐ ĐẾM CHẠY (rolling counter) cho đáp số đơn giản. Hàm thuần: chỉ đổi PHẦN SỐ NGUYÊN (hoặc TỬ SỐ phân số a/b) trong
// 8–10 khung đầu rồi trả đúng chuỗi gốc. Biểu thức phức tạp (căn, lũy thừa, số thập phân, nhiều số...) -> trả NGUYÊN chuỗi gốc.
const TIEN = String.raw`((?:[^\d\\{}^_/]|\\,|\\;|\\text\{[^}]*\})*?)`;
const HAU = String.raw`((?:\\,|\\;|\\%|\s|%|\\text\{[^}]*\})*)`;
const RE_NGUYEN = new RegExp(`^${TIEN}(\\d{1,9})${HAU}$`);
const RE_PS_TEX = new RegExp(`^${TIEN}\\\\[dt]?frac\\{(\\d{1,9})\\}\\{(\\d{1,9})\\}${HAU}$`);
const RE_PS_GACH = new RegExp(`^${TIEN}(\\d{1,9})\\/(\\d{1,9})${HAU}$`);

const kep = (x: number) => Math.min(1, Math.max(0, x));
const emRa = (x: number) => 1 - Math.pow(1 - kep(x), 3);

// giay = số giây kể từ lúc mở khóa; soKhung = độ dài chạy (mặc định 9 khung @30 fps). < 0 hoặc xong -> chuỗi gốc.
export function chaySo(tex: string, giay: number, soKhung = 9, fps = 30): string {
  if (!(giay >= 0) || !Number.isFinite(giay)) return tex;
  const u = (giay * fps) / soKhung;
  if (u >= 1) return tex;
  const s = String(tex || '').trim();
  if (!s || /sqrt|pi|infty|\\(?:left|right|begin|sum|int|lim|log|ln|sin|cos|tan|cdot|times)/.test(s)) return tex;
  const cuon = (n: string) => String(Math.round(parseInt(n, 10) * emRa(u)));
  let m = s.match(RE_NGUYEN);
  if (m) return `${m[1]}${cuon(m[2])}${m[3]}`;
  m = s.match(RE_PS_TEX);
  if (m) return `${m[1]}\\tfrac{${cuon(m[2])}}{${m[3]}}${m[4]}`;
  m = s.match(RE_PS_GACH);
  if (m) return `${m[1]}${cuon(m[2])}/${m[3]}${m[4]}`;
  return tex;
}
