// Làm cho một phần tử chữ/công thức vừa bề rộng maxWidth.
// Thứ tự: (1) thu nhỏ nhẹ (tối đa còn 70%) để giữ trên MỘT dòng; (2) vẫn dài hơn thì cho xuống dòng rồi thu nhỏ nếu còn tràn.
// Đo bằng offsetWidth/scrollWidth (bố cục) nên không bị ảnh hưởng bởi hiệu ứng phóng to của khung cha.
export function khopVua(el: HTMLElement, maxWidth: number): void {
  el.style.transform = '';
  el.style.maxWidth = '';
  el.classList.remove('toan-ngat');
  const w0 = Math.max(el.offsetWidth, el.scrollWidth);
  if (w0 <= maxWidth + 1) return;
  if (w0 * 0.6 <= maxWidth) {   // công thức: ưu tiên thu nhỏ (tới 60%) hơn là ngắt dòng giữa chừng
    el.style.transform = `scale(${maxWidth / w0})`;
    el.style.transformOrigin = 'center center';
    return;
  }
  el.classList.add('toan-ngat');
  el.style.maxWidth = maxWidth + 'px';
  const w = Math.max(el.scrollWidth, el.offsetWidth);
  if (w > maxWidth + 1) {
    el.style.transform = `scale(${Math.max(0.4, maxWidth / w)})`;
    el.style.transformOrigin = 'center center';
  }
}
