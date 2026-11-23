// v99.2 — Nhãn phụ sau viên thuốc "BƯỚC n" ở T1 (TangTieuDe.tsx). Hàm THUẦN, bản đôi của
// scripts/khung4tang_v99.py nhan_phu_buoc và KiemTraHinh.gs nhanPhuBuoc_ (test so khớp ở test_v99_2_gs.cjs).
// Kịch bản ghi nhan = "Bước 1" -> T1 từng hiện "BƯỚC 2 | BƯỚC 1": bỏ tiền tố "Bước n" (giữ phần tên pha sau dấu ":"),
// rỗng -> tên pha ngắn (bước đầu "Đề bài", bước cuối "Kết luận", giữa để trống = chỉ còn viên thuốc).

const RE_LA_BUOC = /^(?:bước|buoc|step)\s*(?:\d|[:.\-–—·|/]|$)/i;   // "Bước ngoặt" là cụm có nghĩa -> giữ
const RE_TIEN_TO = /^\s*(?:bước|buoc|step)\s*\d*\s*[:.\-–—·|/]*\s*/i;

export function nhanPhuBuoc(nhan: string | undefined | null, j = 0, n = 0): string {
  const s = String(nhan ?? '').trim();
  if (!RE_LA_BUOC.test(s)) return s;
  const con = s.replace(RE_TIEN_TO, '').trim();
  if (con) return con.charAt(0).toUpperCase() + con.slice(1);
  if (n && j === 0) return 'Đề bài';
  if (n && j === n - 1) return 'Kết luận';
  return '';
}
