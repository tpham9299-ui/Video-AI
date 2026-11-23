// v89: LÀM VỪA KHUNG BẰNG CỠ CHỮ THẬT (không dùng transform: scale).
// Lỗi cũ: scale() quanh tâm không thu nhỏ hộp bố cục -> hộp vẫn tràn, chữ bị dồn vào giữa hộp tràn (thụt sang phải)
// rồi bị overflow:hidden của hàng cắt mép ("v' = -2(30 -", "Không thỏa mãn (L").
// Thứ tự: (1) giảm cỡ chữ tới HE_SO_MIN để giữ MỘT dòng; (2) vẫn dài -> cho xuống dòng, chỉ ngắt GIỮA CÁC VẾ (sau =, ⇒, <, ...);
// (3) có vế đơn lẻ vẫn tràn -> giảm tiếp (tối thiểu 0,45).
export const HE_SO_MIN = 0.72;

const doRong = (el: HTMLElement) => Math.max(el.offsetWidth, el.scrollWidth);

function datCo(el: HTMLElement, k: number) {
  const goc = Number(el.dataset.co || 0);
  if (goc > 0) el.style.fontSize = `calc(${(goc * k).toFixed(2)}px * var(--k, 1))`;
}

// vế rộng nhất (một .toan-ve không bao giờ ngắt bên trong)
const veRongNhat = (el: HTMLElement) => {
  let m = 0;
  el.querySelectorAll<HTMLElement>('.toan-ve').forEach((v) => (m = Math.max(m, v.offsetWidth)));
  return m;
};

// v98: maxHeight (tùy chọn) — phân số nhiều tầng cao hơn hộp -> co tiếp theo CHIỀU CAO (tối thiểu 0,5), không bao giờ cắt nửa tử/mẫu
export function khopVua(el: HTMLElement, maxWidth: number, maxHeight?: number): void {
  khopRong(el, maxWidth);
  if (!maxHeight) return;
  const h = el.offsetHeight;
  if (h > maxHeight + 1) {
    const m = /\(([\d.]+)px/.exec(el.style.fontSize || '');
    const goc = Number(el.dataset.co || 0);
    const kNay = m && goc > 0 ? Number(m[1]) / goc : 1;
    datCo(el, Math.max(0.5, (kNay * maxHeight) / h));
  }
}

function khopRong(el: HTMLElement, maxWidth: number): void {
  el.style.transform = '';
  el.style.maxWidth = '';
  el.classList.remove('toan-ngat');
  datCo(el, 1);
  const w0 = doRong(el);
  if (w0 <= maxWidth + 1) return;
  if (w0 * HE_SO_MIN <= maxWidth) {
    datCo(el, maxWidth / w0);
    return;
  }
  datCo(el, HE_SO_MIN);
  el.classList.add('toan-ngat');
  el.style.maxWidth = maxWidth + 'px';
  const ve = veRongNhat(el) || doRong(el);
  if (ve > maxWidth + 1) datCo(el, Math.max(0.45, (HE_SO_MIN * maxWidth) / ve));
}

// MỘT CỠ CHỮ CHUNG CHO CẢ HỘP DANH SÁCH: đo mọi dòng ở cỡ gốc (--k = 1), lấy hệ số nhỏ nhất để dòng dài nhất vừa khung
// (không nhỏ hơn HE_SO_MIN), đặt --k cho cả hộp. Dòng nào vẫn tràn ở cỡ chung thì xuống dòng giữa các vế, không co riêng.
export function khopNhom(hop: HTMLElement): void {
  hop.style.setProperty('--k', '1');
  const ds = Array.from(hop.querySelectorAll<HTMLElement>('[data-vua-nhom]'));
  ds.forEach((el) => {
    el.classList.remove('toan-ngat');
    el.style.maxWidth = '';
    el.style.transform = '';
    datCo(el, 1);
  });
  let k = 1;
  ds.forEach((el) => {
    const mx = Number(el.dataset.maxw || 0);
    const w = doRong(el);
    if (mx > 0 && w > mx + 1) k = Math.min(k, Math.max(HE_SO_MIN, mx / w));
  });
  hop.style.setProperty('--k', k.toFixed(3));
  ds.forEach((el) => {
    const mx = Number(el.dataset.maxw || 0);
    if (mx > 0 && doRong(el) > mx + 1) {
      el.classList.add('toan-ngat');
      el.style.maxWidth = mx + 'px';
    }
  });
}
