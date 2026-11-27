// v92 — 8 KHUÔN 3D THAM SỐ: AI (hoặc Auto-fix) chỉ ghi {khuon, tham_so} gọn; máy tự dựng toàn bộ đối tượng + chuỗi pha
// chuyển động bằng toán học thuần (không cần AI tính tay tọa độ). Mỗi khuôn trả các PHA có tên; mỗi pha là một bước 3D
// (hiện/ẩn/nhấn mạnh/góc máy/hành động). Mốc pha: lấy `pha[i].t` (chuanbi.py đổi từ khi_noi) hoặc trải theo mốc các bước
// của khung 4 tầng -> mọi bước giải đều có hình thay đổi, không bao giờ đứng im.
// Đầu ra là đặc tả thô snake_case (cùng schema `canh_3d_vector`) để đi tiếp qua chuanHoaCanh3DV như 10 mảnh tự do.
import {phanTichBieuThuc} from '../../dung_chung/bieuthuc';

type R = Record<string, unknown>;
type V = [number, number, number];
export type HanhDongKhuon = R & {loai: string; vat: string; tre?: number; d?: number};
export type PhaKhuon = {ten: string; camera?: unknown; hien?: string[]; an?: string[]; nhan_manh?: string[]; hanh_dong?: HanhDongKhuon[]};
export type KetQuaKhuon = {doi_tuong: R[]; pha: PhaKhuon[]};

export const TEN_KHUON = [
  'hai_mat_cau_oxyz', 'khung_day_cap', 'tam_bia_gap_hop', 'tru_non_toi_uu',
  'parabol_quy_dao', 'mat_phang_cat_khoi', 'chop_lang_tru', 'luoi_the_bi_xac_suat',
] as const;
export type TenKhuon = (typeof TEN_KHUON)[number];

const laDT = (v: unknown): v is R => typeof v === 'object' && v !== null && !Array.isArray(v);
export const soTS = (v: unknown, md: number, min = -1e6, max = 1e6): number => {
  const x = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v.replace(',', '.')) : NaN;
  return isFinite(x) ? Math.min(max, Math.max(min, x)) : md;
};
const chuoiTS = (v: unknown, md: string) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 24) : md);
const v3TS = (v: unknown, md: V): V => (Array.isArray(v) && v.length === 3 && v.every((x) => typeof x === 'number' && isFinite(x)) ? [v[0], v[1], v[2]] : md);
// số kiểu Việt cho nhãn KaTeX: 4.5 -> 4{,}5
const fm = (x: number) => String(Math.round(x * 100) / 100).replace('.', '{,}');
const da = (ds: V[]) => ds.map((p) => p.map((x) => Math.round(x * 1000) / 1000) as V);
const vong = (o: V, r: number, n = 28): V[] => Array.from({length: n}, (_, i): V => [o[0] + r * Math.cos((i / n) * 2 * Math.PI), o[1] + r * Math.sin((i / n) * 2 * Math.PI), o[2]]);

/* ---------- 1. tấm bìa a×b cắt 4 góc x -> gập hộp không nắp ---------- */
function tamBia(ts: R): KetQuaKhuon {
  const a = soTS(ts.a, 12, 0.1), b = soTS(ts.b, a, 0.1);
  const x = soTS(ts.x, Math.min(a, b) / 6, 0.01, Math.min(a, b) / 2 - 0.01);
  const tx = chuoiTS(ts.ten_x, 'x');
  const S = 5 / Math.max(a, b);
  const A = (a * S) / 2, B = (b * S) / 2, X = Math.min(x * S, Math.min(A, B) * 0.8);
  const goc = (sx: number, sy: number): V[] => da([[sx * A, sy * B, 0], [sx * (A - X), sy * B, 0], [sx * (A - X), sy * (B - X), 0], [sx * A, sy * (B - X), 0]]);
  const nhanA = chuoiTS(ts.nhan_a, fm(a)), nhanB = chuoiTS(ts.nhan_b, fm(b));
  const ds: R[] = [
    {id: 'bia', loai: 'da_giac', diem: da([[-A, -B, 0], [A, -B, 0], [A, B, 0], [-A, B, 0]]), mau: 'cyan', mo: 0.14, nhan: nhanA, nhan_canh: 0, che: false},
    ...(Math.abs(a - b) > 1e-9 ? [{id: 'canh_b', loai: 'doan_thang', tu: [-A, -B, 0], den: [-A, B, 0], mau: 'cyan', nhan: nhanB}] : []),
    ...[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy], i) => ({id: `goc${i + 1}`, loai: 'da_giac', diem: goc(sx, sy), mau: 'hong', mo: 0.38, net: 'dut', nhan: '', che: false})),
    {id: 'x_cat', loai: 'doan_thang', tu: [-A, -B - 0.02, 0], den: [-A + X, -B - 0.02, 0], mau: 'hong', nhan: tx},
    {id: 'day', loai: 'da_giac', diem: da([[-A + X, -B + X, 0], [A - X, -B + X, 0], [A - X, B - X, 0], [-A + X, B - X, 0]]), mau: 'cyan', mo: 0.16, nhan: ''},
    {id: 'vat_truoc', loai: 'da_giac', diem: da([[-A + X, -B, 0], [A - X, -B, 0], [A - X, -B + X, 0], [-A + X, -B + X, 0]]), ban_le: [[-A + X, -B + X, 0], [A - X, -B + X, 0]], mau: 'cyan', mo: 0.2},
    {id: 'vat_sau', loai: 'da_giac', diem: da([[-A + X, B, 0], [A - X, B, 0], [A - X, B - X, 0], [-A + X, B - X, 0]]), ban_le: [[-A + X, B - X, 0], [A - X, B - X, 0]], mau: 'cyan', mo: 0.2},
    {id: 'vat_trai', loai: 'da_giac', diem: da([[-A, -B + X, 0], [-A + X, -B + X, 0], [-A + X, B - X, 0], [-A, B - X, 0]]), ban_le: [[-A + X, -B + X, 0], [-A + X, B - X, 0]], mau: 'cyan', mo: 0.2},
    {id: 'vat_phai', loai: 'da_giac', diem: da([[A, -B + X, 0], [A - X, -B + X, 0], [A - X, B - X, 0], [A, B - X, 0]]), ban_le: [[A - X, -B + X, 0], [A - X, B - X, 0]], mau: 'cyan', mo: 0.2},
    {id: 'canh_dai', loai: 'doan_thang', tu: [-A + X, -B + X, 0], den: [A - X, -B + X, 0], mau: 'vang', nhan: `${nhanA}-2${tx}`},
    {id: 'canh_rong', loai: 'doan_thang', tu: [A - X, -B + X, 0], den: [A - X, B - X, 0], mau: 'vang', nhan: `${nhanB}-2${tx}`},
    {id: 'canh_cao', loai: 'doan_thang', tu: [-A + X, -B + X, 0], den: [-A + X, -B + X, X], mau: 'hong', nhan: tx},
  ];
  const vat = ['vat_truoc', 'vat_sau', 'vat_trai', 'vat_phai'];
  const gocs = ['goc1', 'goc2', 'goc3', 'goc4'];
  return {
    doi_tuong: ds,
    pha: [
      {ten: 'nguyen_ven', camera: [28, 58, 1], hien: ['bia', ...(ds.some((d) => d.id === 'canh_b') ? ['canh_b'] : [])], nhan_manh: ['bia']},
      {ten: 'to_goc', hien: [...gocs, 'x_cat'], nhan_manh: [...gocs, 'x_cat']},
      {ten: 'an_goc', an: ['bia', ...(ds.some((d) => d.id === 'canh_b') ? ['canh_b'] : []), ...gocs, 'x_cat'], hien: ['day', ...vat], nhan_manh: ['day']},
      {ten: 'gap', camera: [34, 30, 1.05], nhan_manh: vat, hanh_dong: vat.map((v, i) => ({loai: 'gap_mat', vat: v, tu: 0, den: 90, tre: 0.3 + i * 0.35, d: 1.6}))},
      {ten: 'nhan_canh', hien: ['canh_dai', 'canh_rong', 'canh_cao'], nhan_manh: ['canh_dai', 'canh_rong', 'canh_cao']},
      {ten: 'the_tich', camera: [-36, 34, 1.02], nhan_manh: ['day', ...vat]},
    ],
  };
}

/* ---------- 2. hình trụ / nón tối ưu (lon, cốc, bồn) ---------- */
function truNon(ts: R): KetQuaKhuon {
  const non = chuoiTS(ts.loai, 'tru') === 'non';
  const Vt = soTS(ts.V ?? ts.the_tich, 0, 0);
  let r = soTS(ts.r, 0, 0), h = soTS(ts.h, 0, 0);
  if (!(r > 0) && Vt > 0) r = non ? Math.cbrt((3 * Vt) / (Math.PI * 2 * Math.SQRT2)) : Math.cbrt(Vt / (2 * Math.PI));
  if (!(r > 0)) r = 4;
  if (!(h > 0)) h = Vt > 0 ? (non ? (3 * Vt) / (Math.PI * r * r) : Vt / (Math.PI * r * r)) : 2 * r;
  const S = 4.2 / Math.max(2 * r, h);
  const Rr = r * S, H = h * S, z0 = -H / 2;
  const tr = chuoiTS(ts.ten_r, 'r'), th = chuoiTS(ts.ten_h, 'h');
  const phoi = ts.phoi === true;
  const ds: R[] = [
    {id: 'khoi', loai: non ? 'hinh_non' : 'hinh_tru', day: [0, 0, z0], ban_kinh: Rr, cao: H, mau: 'cyan', mo: 0.1},
    {id: 'tam_day', loai: 'diem', toa_do: [0, 0, z0], mau: 'trang', nhan: ''},
    {id: 'ban_kinh', loai: 'doan_thang', tu: [0, 0, z0], den: [Rr, 0, z0], mau: 'vang', nhan: tr},
    {id: 'chieu_cao', loai: 'doan_thang', tu: non ? [0, 0, z0] : [-Rr, 0, z0], den: non ? [0, 0, -z0] : [-Rr, 0, -z0], mau: 'hong', nhan: th},
    ...(!non ? [{id: 'mat_cat', loai: 'da_giac', diem: da(vong([0, 0, z0 + 0.01], Rr)), mau: 'vang', mo: 0.3, che: false}] : []),
    ...(non ? [{id: 'duong_sinh', loai: 'doan_thang', tu: [Rr, 0, z0], den: [0, 0, -z0], mau: 'vang', nhan: 'l'}] : []),
    ...(phoi
      ? [
          {id: 'phoi_day', loai: 'da_giac', diem: da([[-Rr, -Rr, z0], [Rr, -Rr, z0], [Rr, Rr, z0], [-Rr, Rr, z0]]), mau: 'xam', mo: 0.08, net: 'dut', che: false, nhan: `2${tr}`, nhan_canh: 0},
          ...(!non ? [{id: 'phoi_nap', loai: 'da_giac', diem: da([[-Rr, -Rr, -z0], [Rr, -Rr, -z0], [Rr, Rr, -z0], [-Rr, Rr, -z0]]), mau: 'xam', mo: 0.08, net: 'dut', che: false}] : []),
        ]
      : []),
  ];
  const pha: PhaKhuon[] = [
    {ten: 'khoi', camera: [30, 22, 1], hien: ['khoi'], nhan_manh: ['khoi']},
    {ten: 'kich_thuoc', hien: ['tam_day', 'ban_kinh', 'chieu_cao'], nhan_manh: ['ban_kinh', 'chieu_cao']},
    non
      ? {ten: 'duong_sinh', hien: ['duong_sinh'], nhan_manh: ['duong_sinh'], camera: [55, 14, 1.05]}
      : {ten: 'quet', hien: ['mat_cat'], nhan_manh: ['mat_cat'], hanh_dong: [{loai: 'dich', vat: 'mat_cat', vec: [0, 0, H - 0.02], tre: 0.3, d: 3.2}]},
    phoi
      ? {ten: 'phoi', hien: ['phoi_day', ...(!non ? ['phoi_nap'] : [])], nhan_manh: ['phoi_day', 'phoi_nap'], camera: [24, 52, 1]}
      : {ten: 'be_mat', camera: [0, 58, 1], nhan_manh: ['khoi']},
    {ten: 'ket', camera: [-32, 24, 1.04], nhan_manh: ['khoi', 'ban_kinh', 'chieu_cao']},
  ];
  return {doi_tuong: ds, pha};
}

/* ---------- 3. lưới thẻ số / cụm bi xác suất ---------- */
function luoiTheBi(ts: R): KetQuaKhuon {
  const bi = chuoiTS(ts.vat, 'the') === 'bi';
  const nhom = Array.isArray(ts.nhom) ? ts.nhom.filter(laDT).slice(0, 4) : [];
  const tongNhom = nhom.reduce((s, g) => s + Math.round(soTS(g.so, 0, 0, 40)), 0);
  const N = Math.round(soTS(ts.N ?? ts.so, tongNhom || (bi ? 8 : 12), 1, 40));
  const mauTung: string[] = [];
  nhom.forEach((g) => {
    for (let i = 0; i < Math.round(soTS(g.so, 0, 0, 40)); i++) mauTung.push(chuoiTS(g.mau, 'cyan'));
  });
  const nhanTung = Array.isArray(ts.nhan_tung) ? ts.nhan_tung.map((x) => String(x).slice(0, 6)) : bi ? [] : Array.from({length: N}, (_, i) => String(i + 1));
  // các lần chọn: chon = [[số thẻ 1-based...], ...] hoặc k = số phần tử chọn
  let chon: number[][] = Array.isArray(ts.chon) ? ts.chon.filter(Array.isArray).map((c) => (c as unknown[]).map((x) => Math.round(soTS(x, 0)) - 1).filter((x) => x >= 0 && x < N)).filter((c) => c.length) : [];
  if (!chon.length) {
    const k = Math.round(soTS(ts.k, Math.min(3, N), 1, N));
    chon = [Array.from({length: k}, (_, i) => i), Array.from({length: k}, (_, i) => (N - k + i + Math.floor(N / 3)) % N)];
  }
  const ds: R[] = [{
    id: 'luoi', loai: 'nhom_lap', vat: bi ? 'bi' : 'the', so: N, xep: bi && N <= 10 ? 'vong' : 'luoi', tam: [0, 0, 0], khoang: bi ? 1.05 : 1.3,
    mau: 'cyan', mau_tung: mauTung, nhan_tung: nhanTung,
  }];
  const pha: PhaKhuon[] = [
    {ten: 'hien', camera: [18, 52, 1], hien: ['luoi']},
    {ten: 'khong_gian_mau', camera: [0, 72, 1], nhan_manh: ['luoi']},
    ...chon.slice(0, 4).map((c, i): PhaKhuon => ({
      ten: `chon_${i + 1}`, camera: i % 2 ? [-22, 46, 1.04] : [22, 46, 1.04],
      hanh_dong: [{loai: 'nang', vat: 'luoi', chi_so: c, mau: i % 2 ? 'ngoc' : 'vang', cao: 0.5, tre: 0.2, d: 0.7}],
    })),
    {ten: 'ket', camera: [10, 36, 1.02], hanh_dong: [{loai: 'nang', vat: 'luoi', chi_so: chon[0], mau: 'vang', cao: 0.5, tre: 0.2, d: 0.7}]},
  ];
  return {doi_tuong: ds, pha};
}

/* ---------- 4. đồ thị v(t) / s(t) / quỹ đạo parabol ---------- */
function parabol(ts: R): KetQuaKhuon {
  const bien = chuoiTS(ts.ten_bien, 't'), ten = chuoiTS(ts.ten_ham, 'v');
  const nguon = chuoiTS(ts.ham, '-t^2+4t').replace(/(?<![a-z])t(?![a-z])/gi, 'x');
  const f = phanTichBieuThuc(nguon) || phanTichBieuThuc('-x^2+4x')!;
  const kh = Array.isArray(ts.t) ? ts.t : [];
  const a = soTS(kh[0], 0), b0 = soTS(kh[1], 4);
  const b = b0 > a ? b0 : a + 4;
  const mau: [number, number][] = [];
  for (let i = 0; i <= 40; i++) {
    const u = a + ((b - a) * i) / 40;
    const y = f(u);
    if (isFinite(y)) mau.push([u, y]);
  }
  if (mau.length < 2) mau.push([a, 0], [b, 0]);
  const ymin = Math.min(0, ...mau.map((p) => p[1])), ymax = Math.max(0, ...mau.map((p) => p[1]), ymin + 1e-6);
  const sx = 5 / (b - a), sz = 3.4 / (ymax - ymin);
  const X = (u: number) => -2.5 + (u - a) * sx, Z = (y: number) => -1.7 + (y - ymin) * sz;
  const cong = mau.map(([u, y]): V => [X(u), 0, Z(y)]);
  const vungDT = ts.dien_tich !== false;
  const ds: R[] = [
    {id: 'truc_t', loai: 'vector', tu: [X(a) - 0.25, 0, Z(0)], den: [2.95, 0, Z(0)], mau: 'xam', nhan: bien},
    {id: 'truc_v', loai: 'vector', tu: [X(a), 0, Z(ymin) - 0.2], den: [X(a), 0, 2.05], mau: 'xam', nhan: ten},
    {id: 'do_thi', loai: 'duong_cong', diem: da(cong), mau: 'vang', nhan: `${ten}(${bien})`, muot: false},
    {id: 'diem_m', loai: 'diem', tren: {duong: 'do_thi', t: 0}, mau: 'hong', nhan: ''},
    ...(vungDT ? [{id: 'vung', loai: 'da_giac', diem: da([[X(a), 0, Z(0)], ...cong.filter((_, i) => i % 2 === 0), [X(b), 0, Z(0)]]), mau: 'ngoc', mo: 0.24, net: 'lien', che: false}] : []),
    {id: 'moc_a', loai: 'diem', toa_do: [X(a), 0, Z(0)], mau: 'trang', nhan: fm(a)},
    {id: 'moc_b', loai: 'diem', toa_do: [X(b), 0, Z(0)], mau: 'trang', nhan: fm(b)},
  ];
  const pha: PhaKhuon[] = [
    {ten: 'truc', camera: [0, 6, 1], hien: ['truc_t', 'truc_v', 'moc_a', 'moc_b']},
    {ten: 've', hien: ['do_thi'], nhan_manh: ['do_thi'], hanh_dong: [{loai: 've_dan', vat: 'do_thi', tu: 0, den: 1, tre: 0.2, d: 2.6}]},
    {ten: 'diem', hien: ['diem_m'], nhan_manh: ['diem_m', 'do_thi'], hanh_dong: [{loai: 'truot_diem', vat: 'diem_m', tu: 0, den: 1, tre: 0.2, d: 4}]},
    vungDT ? {ten: 'dien_tich', hien: ['vung'], nhan_manh: ['vung'], camera: [14, 12, 1]} : {ten: 'dinh', nhan_manh: ['do_thi'], camera: [14, 12, 1]},
    {ten: 'ket', camera: [-12, 10, 1.02], nhan_manh: vungDT ? ['vung', 'do_thi'] : ['do_thi']},
  ];
  return {doi_tuong: ds, pha};
}

/* ---------- 5. hai mặt cầu trong Oxyz + đường thẳng Δ + điểm trượt ---------- */
function haiMatCau(ts: R): KetQuaKhuon {
  const I1 = v3TS(ts.tam1, [-1.5, 0, 0]), I2 = v3TS(ts.tam2, [2, 1, 1]);
  const r1 = soTS(ts.r1, 1.5, 0.05), r2 = soTS(ts.r2, 1, 0.05);
  const dt = laDT(ts.duong) ? ts.duong : {};
  const qua = v3TS(dt.qua, [(I1[0] + I2[0]) / 2, (I1[1] + I2[1]) / 2 - Math.max(r1, r2) - 0.5, (I1[2] + I2[2]) / 2]);
  let u = v3TS(dt.vtcp, [I2[0] - I1[0], I2[1] - I1[1], I2[2] - I1[2]]);
  const lu = Math.hypot(...u) || 1;
  u = [u[0] / lu, u[1] / lu, u[2] / lu];
  // co về khối ~[-3,3]³, tâm cảnh ở giữa hai cầu
  const C: V = [(I1[0] + I2[0]) / 2, (I1[1] + I2[1]) / 2, (I1[2] + I2[2]) / 2];
  const ext = Math.max(...[I1, I2].flatMap((p, k) => p.map((x, j) => Math.abs(x - C[j]) + (k ? r2 : r1))), 0.5);
  const S = 2.6 / ext;
  const T = (p: V): V => [(p[0] - C[0]) * S, (p[1] - C[1]) * S, (p[2] - C[2]) * S];
  const O = T([0, 0, 0]);
  const L = 3.2;
  const q = T(qua);
  const ds: R[] = [
    {id: 'truc_x', loai: 'vector', tu: O, den: [O[0] + 1.6, O[1], O[2]], mau: 'xam', nhan: 'x'},
    {id: 'truc_y', loai: 'vector', tu: O, den: [O[0], O[1] + 1.6, O[2]], mau: 'xam', nhan: 'y'},
    {id: 'truc_z', loai: 'vector', tu: O, den: [O[0], O[1], O[2] + 1.6], mau: 'xam', nhan: 'z'},
    {id: 'cau1', loai: 'mat_cau', tam: T(I1), ban_kinh: r1 * S, mau: 'cyan', luoi: [12, 7]},
    {id: 'I1', loai: 'diem', toa_do: T(I1), mau: 'cyan', nhan: 'I_1'},
    {id: 'cau2', loai: 'mat_cau', tam: T(I2), ban_kinh: r2 * S, mau: 'hong', luoi: [12, 7]},
    {id: 'I2', loai: 'diem', toa_do: T(I2), mau: 'hong', nhan: 'I_2'},
    {id: 'delta', loai: 'doan_thang', tu: [q[0] - u[0] * L, q[1] - u[1] * L, q[2] - u[2] * L], den: [q[0] + u[0] * L, q[1] + u[1] * L, q[2] + u[2] * L], mau: 'vang', nhan: '\\Delta'},
    {id: 'M', loai: 'diem', tren: {duong: 'delta', t: 0.2}, mau: 'vang', nhan: chuoiTS(ts.ten_m, 'M')},
    {id: 'MI1', loai: 'doan_thang', tu: 'M', den: 'I1', mau: 'ngoc', nhan: ''},
    {id: 'MI2', loai: 'doan_thang', tu: 'M', den: 'I2', mau: 'ngoc', nhan: ''},
  ];
  const pha: PhaKhuon[] = [
    {ten: 'truc', camera: [32, 22, 1], hien: ['truc_x', 'truc_y', 'truc_z']},
    {ten: 'cau1', hien: ['cau1', 'I1'], nhan_manh: ['cau1', 'I1']},
    {ten: 'cau2', hien: ['cau2', 'I2'], nhan_manh: ['cau2', 'I2']},
    {ten: 'duong', hien: ['delta'], nhan_manh: ['delta'], camera: [52, 26, 1]},
    {ten: 'truot', hien: ['M', 'MI1', 'MI2'], nhan_manh: ['M', 'MI1', 'MI2'],
      hanh_dong: [{loai: 'truot_diem', vat: 'M', tu: 0.2, den: 0.85, tre: 0.3, d: 2.4}, {loai: 'truot_diem', vat: 'M', den: 0.5, tre: 3, d: 1.8}]},
    {ten: 'ket', camera: [-38, 30, 1.02], nhan_manh: ['M', 'MI1', 'MI2']},
  ];
  return {doi_tuong: ds, pha};
}

/* ---------- 6. khung dây cáp treo vật: góc α, tách lực ---------- */
function dayCap(ts: R): KetQuaKhuon {
  const n = Math.round(soTS(ts.so_cap, 4, 2, 6));
  const alpha = soTS(ts.goc, 30, 5, 75);
  const H = 2.6, Rr = Math.min(2.8, H * Math.tan((alpha * Math.PI) / 180));
  const O: V = [0, 0, -1.3];
  const A = Array.from({length: n}, (_, i): V => {
    const g = (i / n) * 2 * Math.PI + Math.PI / 4;
    return [Rr * Math.cos(g), Rr * Math.sin(g), O[2] + H];
  });
  const cap = A.map((p, i) => ({id: `cap${i + 1}`, loai: 'vector', tu: O, den: da([[O[0] + (p[0] - O[0]) * 0.72, O[1] + (p[1] - O[1]) * 0.72, O[2] + (p[2] - O[2]) * 0.72]])[0], mau: 'vang', nhan: `\\vec T_${i + 1}`}));
  const day = A.map((p, i) => ({id: `day${i + 1}`, loai: 'doan_thang', tu: O, den: da([p])[0], mau: 'trang', nhan: ''}));
  const ds: R[] = [
    {id: 'tran', loai: 'da_giac', diem: da(A.length >= 3 ? A : [...A, [0, 0, O[2] + H]]), mau: 'xam', mo: 0.06, che: false, net: 'dut'},
    ...day,
    {id: 'vat', loai: 'hinh_hop', tam: [0, 0, O[2] - 0.3], kich_thuoc: [0.7, 0.7, 0.6], mau: 'cyan', mo: 0.18, nhan: ''},
    ...cap,
    {id: 'trong_luc', loai: 'vector', tu: O, den: [O[0], O[1], O[2] - 1.9], mau: 'hong', nhan: chuoiTS(ts.nhan_luc, '\\vec P')},
    {id: 'goc_a', loai: 'goc', dinh: O, canh: [da([A[0]])[0], '+z'], mau: 'vang', nhan: chuoiTS(ts.ten_goc, '\\alpha'), ban_kinh: 0.8},
  ];
  const ids = cap.map((c) => c.id);
  const pha: PhaKhuon[] = [
    {ten: 'dung', camera: [30, 16, 1], hien: ['tran', ...day.map((d) => d.id), 'vat']},
    {ten: 'goc', hien: ['goc_a'], nhan_manh: ['goc_a', 'day1']},
    {ten: 'luc', hien: [...ids, 'trong_luc'], nhan_manh: [...ids, 'trong_luc']},
    {ten: 'tach', nhan_manh: ids, hanh_dong: ids.map((v, i) => ({loai: 'tach_vector', vat: v, thanh_phan: ['ngang', 'dung'], tre: 0.3 + i * 0.3, d: 1.3}))},
    {ten: 'tu_tren', camera: [30, 88, 1], nhan_manh: ids},
    {ten: 'ket', camera: [-30, 20, 1.02], nhan_manh: ['trong_luc', ...ids]},
  ];
  return {doi_tuong: ds, pha};
}

/* ---------- 7. mặt phẳng bán trong suốt trượt cắt qua khối ---------- */
function matPhangCat(ts: R): KetQuaKhuon {
  const tru = chuoiTS(ts.khoi, 'hop') === 'tru';
  const kt = v3TS(ts.kich_thuoc, [4, 3, 3]);
  const r = soTS(ts.r, 1.5, 0.05), h = soTS(ts.h, 3, 0.05);
  const S = tru ? 4.2 / Math.max(2 * r, h) : 4.4 / Math.max(...kt);
  const a = (tru ? r : kt[0] / 2) * S, b = (tru ? r : kt[1] / 2) * S, H = (tru ? h : kt[2]) * S;
  const z0 = -H / 2 + H * 0.12;
  const le = 1.45;
  const tiet = tru ? vong([0, 0, z0], a) : ([[-a, -b, z0], [a, -b, z0], [a, b, z0], [-a, b, z0]] as V[]);
  const ds: R[] = [
    tru ? {id: 'khoi', loai: 'hinh_tru', day: [0, 0, -H / 2], ban_kinh: a, cao: H, mau: 'cyan', mo: 0.08}
      : {id: 'khoi', loai: 'hinh_hop', tam: [0, 0, 0], kich_thuoc: [2 * a, 2 * b, H], mau: 'cyan', mo: 0.08, nap: true},
    {id: 'mat_phang', loai: 'da_giac', diem: da([[-a * le, -b * le, z0], [a * le, -b * le, z0], [a * le, b * le, z0], [-a * le, b * le, z0]]), mau: 'hong', mo: 0.16, che: false, nhan: '(P)', nhan_canh: 1},
    {id: 'giao', loai: 'da_giac', diem: da(tiet), mau: 'vang', mo: 0.34, che: false, nhan: chuoiTS(ts.ten_giao, '')},
  ];
  const dz = H * 0.62;
  const pha: PhaKhuon[] = [
    {ten: 'khoi', camera: [32, 24, 1], hien: ['khoi'], nhan_manh: ['khoi']},
    {ten: 'mat_phang', hien: ['mat_phang'], nhan_manh: ['mat_phang']},
    {ten: 'truot', hien: ['giao'], nhan_manh: ['mat_phang', 'giao'],
      hanh_dong: [{loai: 'dich', vat: 'mat_phang', vec: [0, 0, dz], tre: 0.3, d: 3}, {loai: 'dich', vat: 'giao', vec: [0, 0, dz], tre: 0.3, d: 3}]},
    {ten: 'giao_tuyen', camera: [20, 62, 1.05], nhan_manh: ['giao']},
    {ten: 'ket', camera: [-34, 26, 1.02], nhan_manh: ['giao', 'khoi']},
  ];
  return {doi_tuong: ds, pha};
}

/* ---------- 8. chóp / lăng trụ: nét khuất, tam giác vuông, góc 3D ---------- */
function chopLangTru(ts: R): KetQuaKhuon {
  const loai = chuoiTS(ts.loai, 'chop_tu_giac');
  const a = soTS(ts.a, 2, 0.05), h = soTS(ts.h, 3, 0.05);
  const S = 4 / Math.max(a * 1.2, h);
  const A = a * S, H = h * S, z0 = -H / 2;
  if (loai.startsWith('lang_tru')) {
    const R0 = A / Math.sqrt(3);
    const day: V[] = [0, 1, 2].map((i) => [R0 * Math.cos(-Math.PI / 2 + (i * 2 * Math.PI) / 3 + Math.PI), R0 * Math.sin(-Math.PI / 2 + (i * 2 * Math.PI) / 3 + Math.PI), z0]);
    const tren = day.map((p): V => [p[0], p[1], -z0]);
    const ten = ['A', 'B', 'C'], ten2 = ["A'", "B'", "C'"];
    const ds: R[] = [
      {id: 'day', loai: 'da_giac', diem: da(day), mau: 'cyan', mo: 0.08},
      {id: 'nap', loai: 'da_giac', diem: da(tren), mau: 'cyan', mo: 0.08},
      ...[0, 1, 2].map((i) => ({id: `ben${i}`, loai: 'doan_thang', tu: da([day[i]])[0], den: da([tren[i]])[0], mau: 'cyan', nhan: i === 0 ? 'h' : ''})),
      ...[0, 1, 2].map((i) => ({id: ten[i], loai: 'diem', toa_do: da([day[i]])[0], mau: 'trang', nhan: ten[i]})),
      ...[0, 1, 2].map((i) => ({id: `t${i}`, loai: 'diem', toa_do: da([tren[i]])[0], mau: 'trang', nhan: ten2[i]})),
      {id: 'cheo', loai: 'doan_thang', tu: 'A', den: 't1', mau: 'hong', nhan: ''},
      {id: 'tg', loai: 'da_giac', diem: ['A', 'B', 't1'], mau: 'vang', mo: 0.22, che: false},
      {id: 'goc_v', loai: 'goc', dinh: 'B', canh: ['A', 't1'], vuong: true, mau: 'vang'},
      {id: 'goc_p', loai: 'goc', dinh: 'A', canh: ['B', 't1'], mau: 'hong', nhan: '\\varphi'},
    ];
    return {doi_tuong: ds, pha: [
      {ten: 'khoi', camera: [36, 20, 1], hien: ['day', 'nap', 'ben0', 'ben1', 'ben2', 'A', 'B', 'C', 't0', 't1', 't2']},
      {ten: 'cheo', hien: ['cheo'], nhan_manh: ['cheo']},
      {ten: 'tam_giac', hien: ['tg', 'goc_v'], nhan_manh: ['tg', 'cheo', 'goc_v'], camera: [64, 16, 1.06]},
      {ten: 'goc', hien: ['goc_p'], nhan_manh: ['goc_p', 'cheo']},
      {ten: 'ket', camera: [-30, 26, 1.02], nhan_manh: ['tg']},
    ]};
  }
  const tg = loai === 'chop_tam_giac';
  const day: V[] = tg
    ? [0, 1, 2].map((i) => [(A / Math.sqrt(3)) * Math.cos(-Math.PI / 2 - (i * 2 * Math.PI) / 3), (A / Math.sqrt(3)) * Math.sin(-Math.PI / 2 - (i * 2 * Math.PI) / 3), z0])
    : [[-A / 2, -A / 2, z0], [A / 2, -A / 2, z0], [A / 2, A / 2, z0], [-A / 2, A / 2, z0]];
  const M: V = [(day[1][0] + day[2][0]) / 2, (day[1][1] + day[2][1]) / 2, z0];
  const ten = Array.isArray(ts.ten_dinh) ? ts.ten_dinh.map(String) : tg ? ['A', 'B', 'C', 'S'] : ['A', 'B', 'C', 'D', 'S'];
  const ds: R[] = [
    {id: 'chop', loai: 'hinh_chop', day: da(day), dinh: [0, 0, -z0], ten_dinh: ten, mau: 'cyan', mo: 0.07},
    {id: 'O', loai: 'diem', toa_do: [0, 0, z0], mau: 'trang', nhan: 'O'},
    {id: 'M', loai: 'diem', toa_do: da([M])[0], mau: 'trang', nhan: 'M'},
    {id: 'SO', loai: 'doan_thang', tu: [0, 0, -z0], den: [0, 0, z0], mau: 'hong', nhan: 'h'},
    {id: 'OM', loai: 'doan_thang', tu: 'O', den: 'M', mau: 'vang', nhan: ''},
    {id: 'SM', loai: 'doan_thang', tu: [0, 0, -z0], den: 'M', mau: 'vang', nhan: ''},
    {id: 'tg', loai: 'da_giac', diem: [[0, 0, -z0], 'O', 'M'], mau: 'vang', mo: 0.22, che: false},
    {id: 'goc_v', loai: 'goc', dinh: 'O', canh: ['M', [0, 0, -z0]], vuong: true, mau: 'vang'},
    {id: 'goc_p', loai: 'goc', dinh: 'M', canh: ['O', [0, 0, -z0]], mau: 'hong', nhan: '\\varphi'},
  ];
  return {doi_tuong: ds, pha: [
    {ten: 'khoi', camera: [34, 20, 1], hien: ['chop']},
    {ten: 'duong_cao', hien: ['O', 'SO'], nhan_manh: ['SO', 'O']},
    {ten: 'tam_giac', hien: ['M', 'OM', 'SM', 'tg', 'goc_v'], nhan_manh: ['tg', 'SO', 'OM', 'SM'], camera: [62, 14, 1.06]},
    {ten: 'goc', hien: ['goc_p'], nhan_manh: ['goc_p', 'SM']},
    {ten: 'ket', camera: [-32, 26, 1.02], nhan_manh: ['tg', 'chop']},
  ]};
}

const BANG: Record<TenKhuon, (ts: R) => KetQuaKhuon> = {
  tam_bia_gap_hop: tamBia,
  tru_non_toi_uu: truNon,
  luoi_the_bi_xac_suat: luoiTheBi,
  parabol_quy_dao: parabol,
  hai_mat_cau_oxyz: haiMatCau,
  khung_day_cap: dayCap,
  mat_phang_cat_khoi: matPhangCat,
  chop_lang_tru: chopLangTru,
};

// tên gần đúng AI hay viết -> tên khuôn chuẩn
const BIET_DANH: Record<string, TenKhuon> = {
  tam_bia: 'tam_bia_gap_hop', gap_hop: 'tam_bia_gap_hop', hop_khong_nap: 'tam_bia_gap_hop', ton_gap_thung: 'tam_bia_gap_hop',
  hinh_tru: 'tru_non_toi_uu', tru_non: 'tru_non_toi_uu', lon: 'tru_non_toi_uu', hinh_non: 'tru_non_toi_uu',
  the_so: 'luoi_the_bi_xac_suat', bi: 'luoi_the_bi_xac_suat', xac_suat: 'luoi_the_bi_xac_suat', luoi_the: 'luoi_the_bi_xac_suat',
  parabol: 'parabol_quy_dao', do_thi: 'parabol_quy_dao', van_toc: 'parabol_quy_dao', quy_dao: 'parabol_quy_dao',
  mat_cau: 'hai_mat_cau_oxyz', oxyz: 'hai_mat_cau_oxyz', day_cap: 'khung_day_cap', luc: 'khung_day_cap',
  mat_phang_cat: 'mat_phang_cat_khoi', thiet_dien: 'mat_phang_cat_khoi', chop: 'chop_lang_tru', lang_tru: 'chop_lang_tru',
};
export const tenKhuon = (v: unknown): TenKhuon | null => {
  const s = typeof v === 'string' ? v.trim().toLowerCase().replace(/[\s-]+/g, '_') : '';
  if ((TEN_KHUON as readonly string[]).includes(s)) return s as TenKhuon;
  return BIET_DANH[s] || null;
};

// Mốc từng pha: ưu tiên pha[i].t (giây, chuanbi.py đổi từ khi_noi); còn lại trải đều theo mốc bước của khung 4 tầng
// (pha i ở vị trí phân số i·nb/np giữa các mốc bước) -> mỗi bước giải có ít nhất một thay đổi hình.
export function mocPha(np: number, mocBuoc: number[], tong: number, phaVao: unknown[]): number[] {
  const T = [...mocBuoc].filter((x) => isFinite(x)).sort((a, b) => a - b);
  if (!T.length || T[0] > 0) T.unshift(0);
  const het = Math.max(T[T.length - 1] + 4, tong || 0);
  const ra: number[] = [];
  for (let i = 0; i < np; i++) {
    const p = phaVao[i];
    const tVao = laDT(p) && typeof p.t === 'number' && isFinite(p.t) ? p.t : NaN;
    let t: number;
    if (i === 0) t = 0;
    else if (isFinite(tVao)) t = tVao;
    else {
      const u = (i * T.length) / np;
      const k = Math.floor(u), fr = u - k;
      const a = T[Math.min(k, T.length - 1)], b = k + 1 < T.length ? T[k + 1] : het;
      t = a + fr * (b - a) + (fr === 0 && k > 0 ? 0.6 : 0);
    }
    ra.push(Math.max(t, i ? ra[i - 1] + 0.8 : 0));
  }
  return ra;
}

// {khuon, tham_so, pha?} -> đặc tả thô đầy đủ (doi_tuong + buoc có t). null nếu tên khuôn không hợp lệ.
export function dungKhuon(raw: unknown, mocBuoc: number[] = [], tong = 0): R | null {
  if (!laDT(raw)) return null;
  const ten = tenKhuon(raw.khuon);
  if (!ten) return null;
  const ts = laDT(raw.tham_so) ? raw.tham_so : {};
  const kq = BANG[ten](ts);
  const phaVao = Array.isArray(raw.pha) ? raw.pha : [];
  // pha khai báo theo tên: {ten, t} -> sắp lại đúng thứ tự pha của khuôn
  const theoTen = phaVao.filter(laDT).some((p) => typeof p.ten === 'string')
    ? kq.pha.map((ph) => phaVao.find((p) => laDT(p) && p.ten === ph.ten) ?? null)
    : phaVao;
  const tPha = mocPha(kq.pha.length, mocBuoc, tong, theoTen);
  const buoc = kq.pha.map((ph, i) => {
    const t = tPha[i];
    const dai = (i + 1 < tPha.length ? tPha[i + 1] : Math.max(t + 4, tong)) - t;
    const co = Math.min(1, Math.max(0.45, dai / 5)); // pha ngắn: hành động nhanh hơn để kịp xong trước pha sau
    return {
      t, camera: ph.camera, hien: ph.hien || [], an: ph.an || [], nhan_manh: ph.nhan_manh || [],
      hanh_dong: (ph.hanh_dong || []).map((h) => {
        const {tre, d, ...con} = h;
        return {...con, t: t + (tre ?? 0.2) * co, d: (d ?? 1.2) * co};
      }),
    };
  });
  return {phien_ban: 1, quay_nhe: true, khuon: ten, doi_tuong: kq.doi_tuong, buoc};
}

export const soPhaKhuon = (ten: TenKhuon, ts: R = {}) => BANG[ten](ts).pha.map((p) => p.ten);
