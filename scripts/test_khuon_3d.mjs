// v92 — Test 8 KHUÔN 3D THAM SỐ + nâng cấp sân khấu: node scripts/test_khuon_3d.mjs
// Mỗi khuôn: dựng được, không đối tượng nào bị bỏ, MỖI PHA có thay đổi hình (không đứng im), mọi khung nằm trong sân khấu,
// pha trải đủ các bước. Kèm: tên trường cũ (ds/dinh/tam_day), khuôn dự phòng, chữ trộn toán, BBT tên hàm, chống suy biến máy.
import {build} from 'esbuild';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {pathToFileURL} from 'url';

const kq = await build({entryPoints: [path.resolve('src/3d-vector/index.ts')], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'error'});
const tepTam = path.join(os.tmpdir(), `khuon3d_test_${process.pid}.mjs`);
fs.writeFileSync(tepTam, kq.outputFiles[0].text);
const E = await import(pathToFileURL(tepTam).href);
fs.unlinkSync(tepTam);

let dat = 0, hong = 0;
const thu = (ten, dk, them = '') => {
  if (dk) dat++;
  else hong++;
  console.log(`${dk ? 'ĐẠT ' : 'HỎNG'} ${ten}${dk || !them ? '' : ' — ' + them}`);
};

const W = 1080, H = 748;
const MOC_BUOC = [0, 9, 21, 34, 47];
const TONG = 62;
const MAU = {
  tam_bia_gap_hop: {a: 12, b: 12, x: 2},
  tru_non_toi_uu: {loai: 'tru', V: 512, phoi: true},
  luoi_the_bi_xac_suat: {vat: 'the', N: 12, k: 3},
  parabol_quy_dao: {ham: '-5t+20', t: [0, 4], ten_ham: 'v'},
  hai_mat_cau_oxyz: {tam1: [1, 2, 3], r1: 3, tam2: [5, 0, 1], r2: 2},
  khung_day_cap: {so_cap: 4, goc: 30},
  mat_phang_cat_khoi: {khoi: 'hop', kich_thuoc: [4, 3, 3]},
  chop_lang_tru: {loai: 'chop_tu_giac', a: 2, h: 3},
};

// chữ ký trạng thái hình (3D, trước chiếu) + góc máy đích tại t: hai pha khác chữ ký = có thay đổi thật (không tính máy "thở")
function chuKy(canh, t) {
  const {manh} = E.dungCanh(canh, t, null);
  const moc = E.mocMay(canh.buoc);
  const m = [...moc].reverse().find((x) => x.t <= t) || moc[0];
  const r = (x) => Math.round(x * 20) / 20;
  return JSON.stringify([m.n, m.c, m.zoom, manh.map((x) => [x.k, Math.round(x.op * 10), Math.round((x.sang || 0) * 10),
    ...(x.k === 'net' ? [...x.a, ...x.b] : x.k === 'mat' ? x.p.flat() : x.p).map(r)])]);
}

for (const [ten, ts] of Object.entries(MAU)) {
  const tho = E.dungKhuon({khuon: ten, tham_so: ts}, MOC_BUOC, TONG);
  thu(`${ten}: dựng được`, !!tho);
  if (!tho) continue;
  const {canh, loi} = E.chuanHoaCanh3DV(tho, MOC_BUOC, TONG);
  thu(`${ten}: không đối tượng/hành động nào bị bỏ`, !!canh && canh.doiTuong.length === tho.doi_tuong.length && !loi.length, loi.join('; '));
  if (!canh) continue;
  const tPha = canh.buoc.map((b) => b.t);
  thu(`${ten}: pha tăng dần, phủ mọi bước giải`, tPha.every((x, i) => !i || x > tPha[i - 1]) &&
    MOC_BUOC.every((a, i) => tPha.some((t) => t >= a - 1e-6 && t < (MOC_BUOC[i + 1] ?? TONG))), tPha.map((x) => x.toFixed(1)).join(', '));
  // mỗi pha: chữ ký cuối pha khác chữ ký cuối pha trước (hình thật sự đổi)
  const cuoi = tPha.map((t, i) => Math.min((tPha[i + 1] ?? TONG) - 0.05, t + 5));
  const ky = cuoi.map((t) => chuKy(canh, t));
  const dungIm = ky.map((k, i) => (i && k === ky[i - 1] ? i : -1)).filter((i) => i >= 0);
  thu(`${ten}: mỗi pha đều có thay đổi hình (${canh.buoc.length} pha)`, !dungIm.length, 'pha đứng im: ' + dungIm.join(','));
  // trong sân khấu ở mọi thời điểm
  const kc = E.tinhKhung(canh, W, H, TONG);
  let ra = 0, tong = 0;
  for (let t = 0; t < TONG; t += 1.3) {
    const may = E.mayTai(kc, t, true);
    const h = E.heTruc(may);
    for (const m of E.dungCanh(canh, t, h.viTri).manh) {
      const ds = m.k === 'net' ? [m.a, m.b] : m.k === 'mat' ? m.p : [m.p];
      for (const p of ds) {
        const s = E.chieuDiem(p, may, h);
        tong++;
        if (s.x < -2 || s.x > W + 2 || s.y < -2 || s.y > H + 2) ra++;
      }
    }
  }
  thu(`${ten}: hình luôn nằm trong sân khấu`, tong > 0 && ra === 0, `${ra}/${tong} điểm ra ngoài`);
}

// hành động riêng của khuôn: gập vạt, nhấc thẻ, dịch mặt cắt, vẽ dần đồ thị
{
  const c = E.chuanHoaCanh3DV(E.dungKhuon({khuon: 'tam_bia_gap_hop', tham_so: {a: 12, x: 2}}, MOC_BUOC, TONG), MOC_BUOC, TONG).canh;
  const tGap = c.buoc[3].t;
  const cao = (t) => Math.max(...E.dungCanh(c, t, null).manh.filter((m) => m.k === 'net').flatMap((m) => [m.a[2], m.b[2]]));
  thu('tấm bìa: trước gập phẳng (z = 0), sau gập vạt dựng lên (z > 0)', Math.abs(cao(tGap - 0.2)) < 1e-6 && cao(tGap + 4) > 0.5, `${cao(tGap - 0.2)} / ${cao(tGap + 4)}`);
  const l = E.chuanHoaCanh3DV(E.dungKhuon({khuon: 'luoi_the_bi_xac_suat', tham_so: {N: 12, chon: [[2, 4, 6]]}}, MOC_BUOC, TONG), MOC_BUOC, TONG).canh;
  const tChon = l.buoc[2].t + 2;
  const ctx = new E.NguCanh(l, tChon, null);
  thu('lưới thẻ: thẻ được chọn (2, 4, 6) nhấc nổi, thẻ khác giữ nguyên', ctx.nangPhanTu('luoi', 1).h > 0.3 && ctx.nangPhanTu('luoi', 0).h === 0 && ctx.nangPhanTu('luoi', 5).mau === 'vang');
  const p = E.chuanHoaCanh3DV(E.dungKhuon({khuon: 'parabol_quy_dao', tham_so: {ham: '-5t+20', t: [0, 4]}}, MOC_BUOC, TONG), MOC_BUOC, TONG).canh;
  const tv = (t) => new E.NguCanh(p, t, null).tienVe('do_thi');
  thu('đồ thị: vẽ dần từ 0 đến 1 theo thời gian', tv(p.buoc[1].t) === 0 && tv(p.buoc[1].t + 1.2) > 0.2 && tv(p.buoc[1].t + 1.2) < 1 && tv(p.buoc[2].t + 1) === 1);
  const m = E.chuanHoaCanh3DV(E.dungKhuon({khuon: 'mat_phang_cat_khoi', tham_so: {}}, MOC_BUOC, TONG), MOC_BUOC, TONG).canh;
  const z = (t) => new E.NguCanh(m, t, null).doi('mat_phang')[2];
  thu('mặt phẳng cắt: trượt lên theo thời gian', z(m.buoc[2].t) === 0 && z(m.buoc[2].t + 5) > 0.5);
}

// tên trường cũ do prompt v91 dạy (trước đây bị bỏ âm thầm -> tầng 2 trống)
{
  const r = E.chuanHoaCanh3DV({doi_tuong: [
    {id: 'the', loai: 'nhom_lap', ds: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']},
    {id: 'vat', loai: 'da_giac', dinh: [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]]},
    {id: 'lon', loai: 'hinh_tru', tam_day: [0, 0, 0], ban_kinh: 1, cao: 2}], buoc: [{t: 0}]});
  thu('tên trường cũ (ds, dinh, tam_day) vẫn dựng đủ 3 đối tượng', r.canh?.doiTuong.length === 3 && r.canh.doiTuong[0].so === 12 && r.canh.doiTuong[0].xep === 'luoi', r.loi.join('; '));
  const du = E.chuanHoaCanh3DV({doi_tuong: [{id: 'x', loai: 'nhom_lap'}], khuon_du_phong: {khuon: 'luoi_the_bi_xac_suat', tham_so: {N: 8}}}, MOC_BUOC, TONG);
  thu('đặc tả tự do rỗng -> khuôn dự phòng (không bao giờ trống)', !!du.canh && du.canh.doiTuong[0].loai === 'nhom_lap' && du.canh.doiTuong[0].so === 8);
  thu('không có gì dựng được + không khuôn -> null (Mắt thần chặn)', E.chuanHoaCanh3DV({doi_tuong: []}).canh === null);
  thu('tên khuôn gần đúng (tam_bia, lon, the_so)', E.tenKhuon('tam_bia') === 'tam_bia_gap_hop' && E.tenKhuon('lon') === 'tru_non_toi_uu' && E.tenKhuon('the_so') === 'luoi_the_bi_xac_suat' && E.tenKhuon('xyz') === null);
}

// chữ trộn toán ở tiêu đề / nhãn thẻ, BBT tên hàm động
{
  const td = E.tachChuToan('Đếm n(Omega) bằng C(12, 3) rồi tính S_A');
  const tex = td.filter((c) => c.tex).map((c) => c.s);
  thu('tiêu đề: Omega, C(12,3), S_A -> TeX', tex.includes('n(\\Omega)') && tex.includes('C_{12}^{3}') && tex.includes('S_A'), JSON.stringify(td));
  thu('tiêu đề chữ thường giữ nguyên (không có mã thô)', E.tachChuToan('Lập hàm thể tích').every((c) => !c.tex));
  thu("S'(r), V(x) nhận là công thức", E.tachChuToan("Xét dấu S'(r)").some((c) => c.tex && c.s === "S'(r)"));
  thu("BBT: V(x) -> V, x | S'(r) -> S, r | trống -> f, x", JSON.stringify([E.tachHam('V(x)'), E.tachHam("S'(r)"), E.tachHam(undefined)]) === '[["V","x"],["S","r"],["f","x"]]');
}

// chống suy biến góc máy, đường dẫn nhãn, máy "thở" xuyên suốt
{
  const ps = [[0, 0, 0], [0, 0, 2]];
  thu('suy biến: hai điểm chồng thẳng đứng nhìn từ trên -> phát hiện', E.suyBien(ps, {n: 0, c: 89.5, muc: [0, 0, 1], D: 10}, 1));
  thu('không suy biến khi nhìn nghiêng', !E.suyBien(ps, {n: 30, c: 24, muc: [0, 0, 1], D: 10}, 1));
  thu('đường dẫn nhãn chỉ khi nhãn bị đẩy xa', !E.netDan({x: 0, y: 0, co: 30}, {x: 20, y: 0, w: 30, h: 36}) && !!E.netDan({x: 0, y: 0, co: 30}, {x: 120, y: 0, w: 30, h: 36}));
  const moc = E.mocMay([{t: 0, camera: [30, 88, 1], hien: [], an: [], nhanManh: [], hanhDong: []}]);
  const g = [0, 2.2, 4.5].map((t) => E.gocTai(moc, t, false).n);
  thu('máy "thở" ±2° kể cả nhìn từ trên (không khung nào đóng băng)', Math.max(...g) - Math.min(...g) > 1 && g.every((x) => Math.abs(x - 30) <= 2.01));
}

console.log(`\n${dat} đạt, ${hong} hỏng`);
process.exit(hong ? 1 : 0);
