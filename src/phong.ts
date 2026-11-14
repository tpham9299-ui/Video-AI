import {staticFile} from 'remotion';
import {KHAI_BAO_PHONG} from './theme';

// Nạp phông đóng gói (public/fonts) và phông KaTeX MỘT lần cho cả video. Mọi lỗi đều bị bỏ qua (thiếu tệp phông riêng, v.v.),
// nên việc nạp phông không bao giờ làm hỏng video; thiếu phông nào thì trình duyệt dùng phông hệ thống.
let loi: Promise<void> | null = null;

export function napPhong(): Promise<void> {
  if (loi) return loi;
  const f: any = typeof document !== 'undefined' ? (document as any).fonts : null;
  if (!f || typeof (window as any).FontFace === 'undefined') {
    loi = Promise.resolve();
    return loi;
  }
  const viec: Promise<unknown>[] = [];
  for (const [fam, tep, weight, style, them] of KHAI_BAO_PHONG) {
    try {
      const ff = new (window as any).FontFace(fam, `url(${staticFile('fonts/' + tep)})`, {weight, style, ...(them || {})});
      viec.push(ff.load().then((x: any) => f.add(x)).catch(() => undefined));
    } catch (e) {
      /* bỏ qua */
    }
  }
  ['KaTeX_Main', 'KaTeX_Math', 'KaTeX_Size1', 'KaTeX_Size2', 'KaTeX_AMS', 'KaTeX_Caligraphic'].forEach((t) => {
    for (const k of ['16px', 'italic 16px', 'bold 16px']) viec.push(f.load(`${k} ${t}`).catch(() => undefined));
  });
  loi = Promise.all(viec)
    .then(() => f.ready)
    .catch(() => undefined)
    .then(() => undefined);
  return loi;
}
