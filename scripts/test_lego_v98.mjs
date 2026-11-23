// v98 — Test ĐỘNG CƠ LEGO (src/khonggian, phienBan 2): node scripts/test_lego_v98.mjs
//  - nét liền/đứt NHIỀU KHỐI (2 tháp trụ + điểm sau tháp) khớp chân lý bắn tia dày trên lưới góc máy;
//  - đường viền trụ: đúng 2 đường sinh biên mỗi khung, đổi theo góc máy;
//  - phang_2d: nhìn từ trên + gần trực giao (xa = 14) rồi xoay ra 3D; xa nội suy liền;
//  - 5 động tác: tinh_tien / doi_xung_mat (ảnh chạy từ gốc tới đích đúng mốc), truot_toi_uu (dừng ở cực tiểu),
//    co_lap (nền còn 20 %), số đọc AM + MB đúng giá trị thật; khớp màu đối tượng; mũi tên trục / vector / gióng;
//  - mọi nhãn + đỉnh trong sân khấu (vùng an toàn) ở mọi góc dừng; tất định.
import {build} from 'esbuild';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {execFileSync} from 'child_process';
import {pathToFileURL} from 'url';

const kq = await build({entryPoints: [path.resolve('src/khonggian/index.ts')], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'error'});
const tep = path.join(os.tmpdir(), `khonggian_lego_${process.pid}.mjs`);
fs.writeFileSync(tep, kq.outputFiles[0].text);
const E = await import(pathToFileURL(tep).href);
fs.unlinkSync(tep);

let dat = 0, hong = 0;
const thu = (ten, dk, them = '') => {
  if (dk) dat++;
  else hong++;
  console.log(`${dk ? 'ĐẠT ' : 'HỎNG'} ${ten}${dk || !them ? '' : ' — ' + them}`);
};
const py = process.platform === 'win32' ? 'python' : 'python3';
const PROPS = 'out/v98/oxyz_thap/props.json';
execFileSync(py, ['scripts/chuanbi.py', 'mau/v98/thap_flycam_oxyz.json', '--gia-lap', '--props-ra', PROPS], {env: {...process.env, PYTHONIOENCODING: 'utf-8'}, stdio: 'pipe'});
const props = JSON.parse(fs.readFileSync(PROPS, 'utf8'));
const kg = props.khung4tang.khongGian;
const d = kg.dung;
const W = 820, H = 883;

thu('props: phienBan 2 + khoiDs 2 trụ + sàn Oxy + hệ trục', kg.phienBan === 2 && d.khoiDs.length === 2 && d.khoiDs.every((k) => k.loai === 'tru') && d.kinh.some((k) => k.san) && d.heTruc === 'oxyz');
thu('bố cục khung 4 tầng tối giản (khongGian) + nhạc cyber_study', !!props.khung4tang.khongGian && props.nhacPreset === 'cyber_study', props.nhacPreset);

// ---- nét khuất nhiều khối ----
const bc = E.boiCanh(kg, W, H);
const vo = bc.vo;
thu('vỏ = mặt của mọi khối (2 × (36 + 2))', vo.length === 2 * 38, String(vo.length));
let saiMax = 0, soThu = 0;
// cạnh vành trụ nằm TRÊN mặt cong rất mảnh (mặt 2 m / 36 cạnh): chân lý bắn tia có vùng mù ε gần mép mặt -> kiểm riêng bên dưới
const doanThu = d.doan.filter((x) => ['dich', 'phu', 'truc', 'gion', 'vector'].includes(x.vai));
for (let n = 0; n < 360; n += 30) {
  for (const c of [8, 22, 40]) {
    const C = E.heMay({n, c, muc: bc.muc, R: bc.R, k: 1, ox: 0, oy: 0}).viTri;
    const truoc = E.phanLoaiMat(vo, C, null);
    for (const x of doanThu) {
      const P = d.diem[x.a], Q = d.diem[x.b];
      if (!P || !Q) continue;
      const manh = E.tachDoan({id: x.id, a: P, b: Q, vai: x.vai}, C, vo, truoc, [], bc.R);
      const N = 240;
      const chuan = E.khuatMauDay(P, Q, C, vo, N);
      let sai = 0;
      for (let i = 0; i < N; i++) {
        const u = (i + 0.5) / N;
        const m = manh.find((y) => u >= y.u0 - 1e-9 && u <= y.u1 + 1e-9);
        if (m && m.khuat !== chuan[i]) {
          // bỏ qua mẫu sát biên mảnh (sai số lấy mẫu)
          const sat = manh.some((y) => Math.abs(y.u0 - u) < 1.5 / N || Math.abs(y.u1 - u) < 1.5 / N);
          if (!sat) sai++;
        }
      }
      saiMax = Math.max(saiMax, sai / N);
      soThu++;
    }
  }
}
thu(`nét khuất nhiều khối khớp bắn tia dày (${soThu} đoạn × góc, sai tối đa ${(saiMax * 100).toFixed(2)} %)`, saiMax <= 0.01);
// điểm nằm sau tháp B nhìn từ phía +x phải khuất; nhìn từ phía -y thì thấy
{
  const sauThap = [d.diem.H[0] + 0.0, d.diem.H[1] + 0.0, d.diem.A_1[2]]; // trên trục tháp B: luôn trong khối -> khuất ở mọi góc
  const C1 = E.heMay({n: 90, c: 15, muc: bc.muc, R: bc.R, k: 1, ox: 0, oy: 0}).viTri;
  thu('điểm trong lòng tháp (A₁ trên trục tháp B) khuất', E.diemKhuat(sauThap, C1, vo, E.phanLoaiMat(vo, C1, null), bc.R) === true);
  const ngoai = [d.diem.H[0] - 0.5, d.diem.H[1], d.diem.A_1[2]];
  const C2 = E.heMay({n: 270, c: 15, muc: bc.muc, R: bc.R, k: 1, ox: 0, oy: 0}).viTri; // máy phía -x nhìn qua tháp A? (điểm trước tháp B)
  thu('điểm trống giữa hai tháp không bị khuất khi không có gì che', E.diemKhuat(ngoai, C2, vo, E.phanLoaiMat(vo, C2, null), bc.R) === false);
}

// vành trụ: cạnh vành dưới / trên khuất <=> cả hai mặt kề (mặt bên + nắp) là mặt sau, khi không khối nào khác che
{
  let sai = 0, tong = 0;
  for (let n = 0; n < 360; n += 45) {
    const C = E.heMay({n, c: 22, muc: bc.muc, R: bc.R, k: 1, ox: 0, oy: 0}).viTri;
    const truoc = E.phanLoaiMat(vo, C, null);
    const vA = vo.map((f, i) => [f, i]).filter(([f]) => f.khoi === 0);
    for (const [f, i] of vA.slice(0, 36)) {
      const P = f.p[0], Q = f.p[1]; // cạnh vành dưới của mặt bên i
      const manh = E.tachDoan({id: 'v', a: P, b: Q, vai: 'khoi'}, C, vo, truoc, [], bc.R);
      const day = vo.findIndex((g) => g.khoi === 0 && g.p.length === 36 && g.n[2] < 0);
      const mongDoi = !truoc[i] && !truoc[day];
      const tuChe = manh.every((m) => m.khuat);
      if (mongDoi && !tuChe) sai++;
      tong++;
    }
  }
  thu(`vành trụ: cạnh vành trên mặt sau luôn khuất (${tong} cạnh × góc)`, sai === 0, String(sai));
}

// ---- khung vẽ: đường viền trụ, mũi tên, nhãn ----
const cb = E.chuanBi(kg, W, H);
const vung = {x0: 8, y0: 6, x1: W - 8, y1: H - 6};
const mocThu = [1, 8, 17, 22.5, 26, 29.5, 37, 41.5, 44, 49, 52];
for (const t of mocThu) {
  const f = E.veKhung(kg, cb, t, W, H, vung);
  const vien = f.net.filter((n) => n.id.endsWith(':v'));
  const soVien = new Set(vien.map((n) => n.id)).size;
  if (t === 17) {
    const vA = f.net.filter((n) => n.id === 'thapA:v');
    thu('t = 17 s: mỗi tháp có đường sinh biên (viền) theo góc máy', soVien === 2 && vA.length >= 1, `${soVien}`);
    thu('mũi tên trục x, y, z + đường gióng hai đầu', f.mui.length >= 3 + 2 * 3, String(f.mui.length));
    thu('nhãn số đo 200 m / 300 m / 600 m hiện', ['g200#n', 'g300#n', 'g600#n'].every((id) => f.nhanTu.some((x) => x.id === id && x.op > 0.5)));
  }
  const ngoai = f.nhan.filter((x) => x.op > 0.3 && (x.x - x.w / 2 < 0 || x.x + x.w / 2 > W || x.y - x.h / 2 < 0 || x.y + x.h / 2 > H));
  const chamNgoai = f.cham.filter((c) => c.op > 0.3 && (c.x < 0 || c.x > W || c.y < 0 || c.y > H));
  thu(`t = ${t} s: nhãn + điểm trong sân khấu`, !ngoai.length && !chamNgoai.length, [...ngoai.map((x) => x.ten), ...chamNgoai.map((c) => c.ten)].join(','));
}
// tất định
const f1 = JSON.stringify(E.veKhung(kg, cb, 33.3, W, H, vung).net), f2 = JSON.stringify(E.veKhung(kg, E.chuanBi(kg, W, H), 33.3, W, H, vung).net);
thu('tất định: cùng t -> cùng khung', f1 === f2);

// ---- phang_2d -> 3D ----
const L = cb.lich;
thu('phang_2d: máy mở đầu nhìn từ trên (c >= 88°) và gần trực giao (xa = 14)', L.P0.c >= 88 && L.P0.xa === 14, `${L.P0.c} ${L.P0.xa}`);
const x0 = L.moc[0];
const giua = E.mayTai(L, (x0.t0 + x0.t1) / 2, kg.tongGiay).m;
thu('xoay ra 3D: xa nội suy liền (1 < xa < 14 ở giữa cú xoay), về 1 khi khóa', giua.xa > 1.2 && giua.xa < 13 && (E.mayTai(L, x0.t1 + 0.5, kg.tongGiay).m.xa ?? 1) === 1, String(giua.xa));

// ---- 5 động tác ----
const bh = kg.bienHinh;
const dx = bh.find((b) => b.loai === 'doi_xung_mat'), tt2 = bh.find((b) => b.loai === 'tinh_tien');
thu('có doi_xung_mat (B -> B\') và tinh_tien (A -> A₁) theo mốc lời', !!dx && !!tt2 && dx.t > 20 && tt2.t > dx.t);
const P0 = E.trangThai(kg, dx.t - 0.2).diem, P1 = E.trangThai(kg, dx.t + dx.d / 2).diem, P2 = E.trangThai(kg, dx.t + dx.d + 0.1).diem;
const kc = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
thu('đối xứng: trước mốc B\' trùng B, giữa chừng đang xuyên sàn (z ≈ 0), sau mốc ở đúng ảnh', kc(P0["B'"], P0.B) < 1e-9 && Math.abs(P1["B'"][2]) < 0.6 * Math.abs(d.diem.B[2]) && kc(P2["B'"], d.diem["B'"]) < 1e-9);
const Q1 = E.trangThai(kg, tt2.t + tt2.d / 2).diem;
const vec = [d.diem.H[0] - d.diem.O[0], d.diem.H[1] - d.diem.O[1], d.diem.H[2] - d.diem.O[2]];
const AA = [Q1.A_1[0] - d.diem.A[0], Q1.A_1[1] - d.diem.A[1], Q1.A_1[2] - d.diem.A[2]];
thu('tịnh tiến: ảnh chạy dọc vectơ OH (cùng phương, chưa tới đích ở giữa)', Math.abs(AA[0] * vec[1] - AA[1] * vec[0]) < 1e-9 && Math.abs(AA[2]) < 1e-9 && kc(Q1.A_1, d.diem.A_1) > 0.05);
const tr = kg.chuyen.find((c) => c.diem === 'M');
const tCuoi = tr.moc[tr.moc.length - 1].t;
thu('trượt tối ưu: M quét qua lại rồi DỪNG đúng điểm cực tiểu (= giao AB\' với Oxy)', kc(E.trangThai(kg, tCuoi + 0.2).diem.M, d.diem.M) < 1e-4 && kc(E.trangThai(kg, tr.moc[1].t).diem.M, d.diem.M) > 0.2);
const fDoc = E.veKhung(kg, cb, tCuoi + 0.5, W, H, vung).nhanTu.find((x) => x.id === 'doc_M');
thu('số đọc trực tiếp: AM + MB = 781 m tại cực tiểu', !!fDoc && /781/.test(fDoc.tex) && /AM \+ MB/.test(fDoc.tex), fDoc && fDoc.tex);
const cl = kg.nhanManh.find((x) => x.coLap);
const tCl = E.trangThai(kg, cl.t + 0.8);
const nen = tCl.doan.find((x) => x.id.startsWith('thapB:')), tam = tCl.doan.find((x) => x.key === 'A|M');
thu('cô lập: nền (tháp) dìm còn 20 %, đối tượng trọng tâm sáng 100 %', nen && Math.abs(nen.nm - 0.2) < 0.02 && tam && tam.nm === 1 && tam.sang > 0.9, nen && String(nen.nm));
const sauCl = E.trangThai(kg, cl.t + 9);
thu('cô lập kết thúc khi sang bước sau', sauCl.doan.find((x) => x.id.startsWith('thapB:')).nm === 1);
// khớp màu
const dongs = props.khung4tang.buoc.flatMap((b) => b.the.filter((t) => t.loai === 'cong_thuc').flatMap((t) => t.dong));
const mauAM = d.doan.find((x) => x.id === 'AM').mau;
thu('khớp màu KaTeX ↔ 3D: AM trong công thức tô đúng màu đoạn AM trên hình', dongs.some((x) => x.includes(`\\textcolor{${mauAM}}{AM}`)), mauAM);
thu('đường gióng không khóa màu tên đoạn (OH giữ màu vector)', !dongs.some((x) => x.includes('\\textcolor{#FACC15}{OH}')));

console.log(`\ntest_lego_v98: ${dat} đạt, ${hong} hỏng`);
process.exit(hong ? 1 : 0);
