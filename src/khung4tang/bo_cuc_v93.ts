// v93 — HẰNG SỐ BỐ CỤC Intro móc câu / Outro tóm tắt (thuần TS, không React -> test Node đọc được).
// Mọi vùng có tọa độ cố định nên chữ không bao giờ đè vùng mô hình 3D; cỡ chữ tự co theo độ dài (ước lượng tất định).
import {emRa} from '../3d-vector/toan3d';
import type {MocCau} from './kieu';

// v96: cùng cao T2 mới (648) và nằm trọn vùng an toàn TikTok (top 11 %, đáy 18 %, phải 12 %)
export const INTRO_SAN = {y: 560, h: 648}; // vùng mô hình lúc intro (cùng cao T2 -> trượt về T2 không đổi tỉ lệ)
export const GIAY_INTRO_MD = 5;
// thời lượng intro: trong [3,6 ; 5] giây và không quá 40% phần nội dung
export const giayIntro = (m: MocCau | null | undefined, tong: number) =>
  m ? Math.max(3.6, Math.min(m.giay || GIAY_INTRO_MD, GIAY_INTRO_MD, tong * 0.4)) : 0;
// mức "ra" của intro (0 -> 1) trong 0,6 s cuối: chữ tan, sân khấu về tầng 2, các tầng khác hiện vào
export const raIntro = (t: number, G: number) => (G > 0 ? emRa((t - (G - 0.6)) / 0.6) : 1);

// v96: chữ intro/outro trong khung an toàn TikTok; v98: khung ĐỐI XỨNG 130..950 (lề 12 % hai bên, tâm 540)
export const LE_ND_V93 = 130;
export const RONG_ND_V93 = 820;
export const RONG_CHU = RONG_ND_V93 - 2 * 48;
// Be Vietnam Pro 900 IN HOA: bề rộng trung bình ~0,68 em/ký tự (kể cả khoảng trắng) -> cỡ chữ vừa một dòng
export const coVua = (s: string, max: number, min: number, rong = RONG_CHU, he = 0.68) =>
  Math.max(min, Math.min(max, Math.floor(rong / (Math.max(1, s.length) * he))));

// Dọn ký tự rác vỡ chuỗi ở tiêu đề Intro (VD dấu ngoặc kép lệch cặp, cụm "/?", "?\"", "?°", "A√?" từ bước che đáp án).
export function lamSachTieuDeIntro(raw: string): string {
  let s = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  // Xóa dấu ngoặc kép lệch cặp (số lượng lẻ) hoặc ngoặc kép dính cụm rác ?" / /?"
  s = s.replace(/([/?√°º])\s*["“”]+/g, '$1').replace(/["“”]+\s*([/?])/g, '$1');
  if ((s.match(/"/g) || []).length % 2 === 1) s = s.replace(/"/g, '');
  if ((s.match(/“/g) || []).length !== (s.match(/”/g) || []).length) s = s.replace(/[“”]/g, '');
  // Xóa cụm che đáp án vỡ chuỗi: "?°", "°?", "A√?", "A/?", "/?", "√?"
  s = s
    .replace(/(?:^|\s)[A-Za-z]?\s*(?:\/|√)\s*\?+(?=\s|$|[,.:;!–—-])/g, ' ')
    .replace(/\?+\s*[°º]|[°º]\s*\?+/g, ' ')
    .replace(/(?:^|\s)\?+(?=\s|$)/g, ' ')
    .replace(/\s+([,.:;!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .replace(/[:–—-]\s*$/, '')
    .trim();
  return s;
}

// tách tối đa 2 dòng, cắt ở khoảng trắng gần giữa nhất
export function haiDong(s: string, motDong = 16): string[] {
  const x = s.replace(/\s+/g, ' ').trim();
  if (x.length <= motDong || !x.includes(' ')) return [x];
  let tot = -1;
  for (let i = 0; i < x.length; i++) if (x[i] === ' ' && (tot < 0 || Math.abs(i - x.length / 2) < Math.abs(tot - x.length / 2))) tot = i;
  return [x.slice(0, tot), x.slice(tot + 1)];
}
// v98: khung đối xứng hẹp hơn (724 px chữ) -> cho co tới 44 px để dòng dài vẫn MỘT dòng (không tự xuống dòng chồng chữ)
export const coTieuDeIntro = (dong: string[]) => coVua(dong.reduce((a, b) => (b.length > a.length ? b : a), ''), 92, 1, RONG_CHU, 0.82);

// Outro: đáp án | mô hình 3D | 3 dòng tóm tắt | nút lưu. v96: trọn vùng an toàn TikTok (đỉnh >= 212, đáy nút <= 1574)
export const VUNG_OUTRO = {dapAn: {y: 216, h: 220}, san: {y: 450, h: 560}, dong: {y: 1024, h: 116, cach: 14}, nut: {y: 1440}};
