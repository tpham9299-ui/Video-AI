// v90 — Test nhanh động cơ 3D Vector (phần thuần TS): node scripts/test_canh_3d_vector.mjs
// esbuild (đi kèm Remotion) dịch src/3d-vector/index.ts trong bộ nhớ rồi nạp để kiểm.
import {build} from 'esbuild';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {pathToFileURL} from 'url';

const kq = await build({entryPoints: [path.resolve('src/3d-vector/index.ts')], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'error'});
const tepTam = path.join(os.tmpdir(), `canh3dv_test_${process.pid}.mjs`);
fs.writeFileSync(tepTam, kq.outputFiles[0].text);
const E = await import(pathToFileURL(tepTam).href);
fs.unlinkSync(tepTam);

let dat = 0, hong = 0;
const thu = (ten, dk, them = '') => {
  if (dk) dat++;
  else hong++;
  console.log(`${dk ? 'ĐẠT ' : 'HỎNG'} ${ten}${dk || !them ? '' : ' — ' + them}`);
};
const gan = (a, b, e = 1e-6) => Math.abs(a - b) < e;

// 1. Máy quay: chính diện thấy x sang phải, z lên; nhìn từ trên xuống (c = 90) không suy biến
{
  const may = {n: 0, c: 0, zoom: 1, muc: [0, 0, 0], D: 10, k: 1, ox: 0, oy: 0};
  const h = E.heTruc(may);
  const px = E.chieuDiem([1, 0, 0], may, h), pz = E.chieuDiem([0, 0, 1], may, h);
  thu('chính diện: +x sang phải, +z lên', px.x > 0 && gan(px.y, 0) && pz.y < 0 && gan(pz.x, 0));
  const tren = {...may, c: 90};
  const h2 = E.heTruc(tren);
  const py = E.chieuDiem([0, 1, 0], tren, h2), qx = E.chieuDiem([1, 0, 0], tren, h2);
  thu('từ trên xuống: +y lên màn hình, +x sang phải, không NaN', py.y < 0 && qx.x > 0 && [py.x, py.y, qx.x, qx.y].every(Number.isFinite));
  thu('phối cảnh: điểm gần máy to hơn', E.chieuDiem([0, -3, 0], may, h).s > E.chieuDiem([0, 3, 0], may, h).s);
}

// 2. Chuẩn hóa đặc tả: bỏ phần tử sai, không làm hỏng
{
  const r = E.chuanHoaCanh3DV({doi_tuong: [{id: 'A', loai: 'diem', toa_do: [0, 0, 0]}, {id: 'X', loai: 'khong_co'}, {id: 'A', loai: 'diem', toa_do: [1, 1, 1]}, {id: 'h', loai: 'hinh_hop', kich_thuoc: [1, -1, 1]}],
    buoc: [{t: 0, camera: 'tu_tren', hien: ['A', 'ma']}]});
  thu('chuẩn hóa: giữ 1 vật hợp lệ, ghi lỗi', r.canh && r.canh.doiTuong.length === 1 && r.loi.length >= 3, r.loi.join('; '));
  thu('chuẩn hóa: tên góc "tu_tren" giữ góc ngang mặc định', r.canh && r.canh.buoc[0].camera[1] === 88 && r.canh.buoc[0].camera[0] === 32);
  thu('chuẩn hóa: dữ liệu rác -> null', E.chuanHoaCanh3DV(42).canh === null);
}

// 3. Nét khuất: hộp kín nhìn chéo từ trên có đúng 3 cạnh khuất (đỉnh xa nhất phía dưới)
{
  const {canh} = E.chuanHoaCanh3DV({doi_tuong: [{id: 'h', loai: 'hinh_hop', tam: [0, 0, 0], kich_thuoc: [2, 2, 2]}], buoc: [{t: 0, camera: [30, 30, 1]}]});
  const kc = E.tinhKhung(canh, 1000, 600, 2);
  const may = E.mayTai(kc, 0, false);
  const h = E.heTruc(may);
  const {manh, che} = E.dungCanh(canh, 5, h.viTri);
  const xl = E.xuLyKhuat(manh, che, h.viTri, kc.R).filter((m) => m.k === 'net');
  const canhKhuat = new Set(xl.filter((m) => m.net === 'dut').map((m) => [m.a, m.b].map((p) => p.map((x) => Math.round(x * 10)).join(',')).sort().join('|')));
  // cạnh khuất chia nhiều đoạn -> gom theo 2 đầu mút gốc: đếm theo đỉnh chung (-1,1,-1) phía sau dưới
  const daNet = xl.filter((m) => m.net === 'dut');
  const quaDinh = daNet.every((m) => [m.a, m.b].some((p) => gan(p[0], -1, 1e-6) || gan(p[1], 1, 1e-6) || gan(p[2], -1, 1e-6)));
  thu('hộp kín: có nét khuất, mọi nét khuất thuộc 3 cạnh quanh đỉnh sau-dưới', daNet.length >= 3 && quaDinh && canhKhuat.size >= 1);
  // tổng độ dài nét khuất ≈ 3 cạnh × 2
  const L = daNet.reduce((s, m) => s + Math.hypot(m.b[0] - m.a[0], m.b[1] - m.a[1], m.b[2] - m.a[2]), 0);
  thu('hộp kín: tổng độ dài nét khuất ≈ 6 (3 cạnh dài 2)', Math.abs(L - 6) < 0.6, `L = ${L.toFixed(2)}`);
}

// 4. Cầu: nửa sau lưới bị khuất, nửa trước không
{
  const {canh} = E.chuanHoaCanh3DV({doi_tuong: [{id: 'c', loai: 'mat_cau', tam: [0, 0, 0], ban_kinh: 1}], buoc: [{t: 0, camera: [0, 0, 1]}]});
  const kc = E.tinhKhung(canh, 800, 800, 2);
  const may = E.mayTai(kc, 0, false);
  const h = E.heTruc(may);
  const {manh, che} = E.dungCanh(canh, 5, h.viTri);
  const xl = E.xuLyKhuat(manh, che, h.viTri, kc.R).filter((m) => m.k === 'net');
  const sai = xl.filter((m) => {
    const y = (m.a[1] + m.b[1]) / 2; // máy ở phía -y; phối cảnh: ranh giới nhìn thấy ở y = -r²/D ≈ -0,28
    return (y < -0.4 && m.net === 'dut') || (y > 0.15 && m.net === 'lien' && m.w < 2);
  });
  thu('cầu: lưới phía trước liền, phía sau đứt', sai.length === 0, `${sai.length} đoạn sai`);
}

// 5. Auto-framing: mọi điểm nằm trong 75% khung (+ dung sai) ở mọi mốc máy
for (const tep of ['mau/canh3dv_A_oxyz.json', 'mau/canh3dv_B_cau_4cap.json', 'mau/canh3dv_C_hop_khong_nap.json']) {
  if (!fs.existsSync(tep)) continue;
  const p = JSON.parse(fs.readFileSync(tep, 'utf8'));
  const {canh, loi} = E.chuanHoaCanh3DV(p.canh3dv);
  thu(`${path.basename(tep)}: đặc tả hợp lệ`, !!canh && loi.length === 0, loi.join('; '));
  if (!canh) continue;
  const W = 1080, H = 748, tong = p.tongFrame / 30;
  const kc = E.tinhKhung(canh, W, H, tong);
  let ra = 0;
  for (let f = 0; f < p.tongFrame; f += 5) {
    const may = E.mayTai(kc, f / 30, canh.quayNhe);
    const h = E.heTruc(may);
    for (const m of E.dungCanh(canh, f / 30, h.viTri).manh) {
      const ds = m.k === 'net' ? [m.a, m.b] : m.k === 'mat' ? m.p : [m.p];
      for (const q of ds) {
        const s = E.chieuDiem(q, may, h);
        if (s.x < W * 0.06 || s.x > W * 0.94 || s.y < H * 0.04 || s.y > H * 0.96) ra++;
      }
    }
  }
  thu(`${path.basename(tep)}: hình luôn nằm trong sân khấu`, ra === 0, `${ra} điểm tràn`);
}

console.log(`\n${dat} đạt, ${hong} hỏng`);
process.exit(hong ? 1 : 0);
