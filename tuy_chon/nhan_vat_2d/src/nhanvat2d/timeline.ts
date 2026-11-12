// Đường đi và trạng thái của nhân vật 2D theo số khung hình (thuần, không phụ thuộc React để dễ kiểm thử).
export type CanhNV = {batDau: number; soFrame: number; camXuc: string; coHinh: boolean; bienDo: number[]; leadFrame: number};

export const VAO = 40; // số khung hình nhân vật nhảy bước vào
export const RA = 34; // số khung hình nhân vật nhảy bước ra
const kep = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const dungCham = (t: number) => 1 - Math.pow(1 - kep(t), 3);

export type TrangThaiNV = {
  i: number;
  local: number;
  cam: string;
  camTruoc: string;
  dang: 'vao' | 'dung' | 'ra';
  x: number; // dịch ngang (px, dương = sang phải, ra ngoài mép màn hình)
  hop: number; // độ cao nhảy (px)
  nghieng: number; // độ nghiêng người (độ)
  chamDat: number; // 0..1: sát đất (ép dẹp người lại khi tiếp đất)
  chi: boolean; // đang chỉ tay vào hình
  bienDo: number; // độ lớn giọng 0..1
  doi: number; // 0..1 tiến độ đổi dáng ở đầu cảnh
  doiDang: boolean; // cảnh này khác cảm xúc cảnh trước
};

export function tinhNV(canh: CanhNV[], frame: number, tong: number): TrangThaiNV {
  let i = canh.findIndex((c) => frame >= c.batDau && frame < c.batDau + c.soFrame);
  if (i < 0) i = frame < 0 ? 0 : canh.length - 1;
  const c = canh[i];
  const local = frame - c.batDau;
  const cam = c.camXuc || 'nghi';
  const camTruoc = i > 0 ? canh[i - 1].camXuc || 'nghi' : cam;

  let dang: TrangThaiNV['dang'] = 'dung';
  let x = 0;
  let hop = 0;
  let nghieng = 0;
  let chamDat = 0;
  const buocNhay = (p: number, soNhay: number, cao: number) => {
    const pha = p * soNhay * Math.PI;
    hop = Math.abs(Math.sin(pha)) * cao * (1 - 0.55 * p);
    chamDat = 1 - Math.abs(Math.sin(pha));
    nghieng = 5 * Math.sin(pha * 1) * (1 - p * 0.5);
  };
  if (frame < VAO) {
    dang = 'vao';
    const p = frame / VAO;
    x = 540 * (1 - dungCham(p));
    buocNhay(p, 5, 34);
  } else if (frame >= tong - RA) {
    dang = 'ra';
    const p = (frame - (tong - RA)) / RA;
    x = 560 * Math.pow(kep(p), 2);
    buocNhay(p, 5, 34);
  }
  const f = local / Math.max(1, c.soFrame);
  return {
    i, local, cam, camTruoc, dang, x, hop, nghieng, chamDat,
    chi: dang === 'dung' && c.coHinh && f > 0.2 && f < 0.78,
    bienDo: dang === 'dung' && c.bienDo && c.bienDo[local] ? c.bienDo[local] : 0,
    doi: kep(local / 8),
    doiDang: cam !== camTruoc && i > 0,
  };
}
