// v98.1 — KỶ LUẬT BẢNG MÀU khung 4 tầng (luồng 2D / Xác suất / Đại số / khuôn 3D Vector): tối đa 2 màu nhấn.
// Cyan = dữ kiện / nhánh phụ / bước đang giải; Vàng hổ phách = mục tiêu / kết luận / đáp số; xám trung tính = phần loại trừ.
// Màu DỮ LIỆU (bi đỏ/xanh theo giá trị, khóa màu \mvang \mdo … trong KaTeX, ✓/✕ đúng-sai) KHÔNG đi qua bảng này.
import type {BuocGiai} from './kieu';

export const CYAN = '#38BDF8';
export const HO_PHACH = '#FBBF24';
export const XAM = '#8A94A6';
export const CHU_SANG = '#E6EDF5';

// bước "chốt" = bước có thẻ chốt đáp án -> hổ phách; còn lại cyan (KHÔNG dựa b.mau: chuanbi xoay vòng màu bước, có cả 'vang')
export const laBuocChot = (b: BuocGiai) => (b.the || []).some((th) => th.chot);
export const mauBuocV981 = (b: BuocGiai) => (laBuocChot(b) ? HO_PHACH : CYAN);
