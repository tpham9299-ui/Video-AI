// v97 — KIỂM DUYỆT CỨNG CHẤT LƯỢNG HÌNH KHÔNG GIAN: node scripts/test_hinh_3d_chat_luong.mjs [props.json ...]
// Tại MỌI góc dừng camera (góc mở đề + sau mỗi cú xoay + giữa đoạn giữ góc) của từng mẫu:
//  - 2 đỉnh phân biệt cách nhau < 26 px -> LỖI (miễn cặp điểm cùng thuộc mặt đang ép mép ep_mep_mat);
//  - hộp nhãn chồng nhau (overlap > 0) / nhãn đè chấm điểm khác -> LỖI;
//  - nhãn hoặc đỉnh ra ngoài vùng an toàn SAFE_ZONE_TIKTOK của tầng 2 -> LỖI;
//  - nét liền / đứt khác phép thử bắn tia chuẩn (lấy mẫu dày, mọi mặt) -> LỖI;
//  - trong đoạn giữ góc (máy khóa, chỉ trôi ±0,6°) trạng thái liền / đứt của mọi nét KHÔNG đổi (chống nhấp nháy).
// Không tham số: tự dựng props hai mẫu mau/v97/*.json bằng chuanbi.py --gia-lap.
import {build} from 'esbuild';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {execFileSync} from 'child_process';
import {pathToFileURL} from 'url';

const kq = await build({entryPoints: [path.resolve('src/khonggian/index.ts')], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'error'});
const tep = path.join(os.tmpdir(), `khonggian_cl_${process.pid}.mjs`);
fs.writeFileSync(tep, kq.outputFiles[0].text);
const E = await import(pathToFileURL(tep).href);
fs.unlinkSync(tep);

let dat = 0, hong = 0;
const thu = (ten, dk, them = '') => {
  if (dk) dat++;
  else hong++;
  console.log(`${dk ? 'ĐẠT ' : 'HỎNG'} ${ten}${dk || !them ? '' : ' — ' + them}`);
};

const W = 950, H = 883; // v97 tối giản: tầng 2 tràn viền 16 %..62 % chiều cao (VUNG_TOI_GIAN.t2), rộng 950 (vùng an toàn TikTok)
const VUNG = {x0: 46, y0: 6, x1: W - 8, y1: H - 6};
const KC_TOI_THIEU = 26;

let dsProps = process.argv.slice(2);
if (!dsProps.length) {
  const py = process.platform === 'win32' ? 'python' : 'python3';
  for (const ten of ['giao_diem_mnp', 'vuong_goc_sa']) {
    const ra = path.join(os.tmpdir(), `v97_cl_${ten}.json`);
    execFileSync(py, ['scripts/chuanbi.py', `mau/v97/${ten}.json`, '--gia-lap', '--props-ra', ra], {env: {...process.env, PYTHONIOENCODING: 'utf-8'}, stdio: 'pipe'});
    dsProps.push(ra);
  }
}

const hop = (n) => ({x0: n.x - n.w / 2, y0: n.y - n.h / 2, x1: n.x + n.w / 2, y1: n.y + n.h / 2});
const chong = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));

for (const tp of dsProps) {
  const P = JSON.parse(fs.readFileSync(tp, 'utf8'));
  const kg = P.khung4tang?.khongGian;
  const ten = path.basename(tp);
  if (!kg) { thu(`${ten}: có khongGian`, false); continue; }
  const cb = E.chuanBi(kg, W, H);
  const moc = cb.lich.moc;
  const tong = kg.tongGiay;
  // các thời điểm dừng: góc mở đề (sau hook) + 0,4 s sau mỗi cú xoay + giữa đoạn giữ
  const dung = [{t: Math.min(4, (moc[0]?.t0 ?? tong) - 0.4), che: 'mo_de', mien: null}];
  moc.forEach((x, i) => {
    const ke = i + 1 < moc.length ? moc[i + 1].t0 : tong;
    const mien = x.che_do === 'ep_mep_mat' ? E.diemTrongMat(cb.bc, x.doi) : null;
    dung.push({t: x.t1 + 0.4, che: x.che_do, mien, ke, t1: x.t1});
    if (ke - x.t1 > 2) dung.push({t: (x.t1 + ke) / 2, che: x.che_do + '(giữa)', mien});
  });
  for (const d of dung) {
    const f = E.veKhung(kg, cb, d.t, W, H, VUNG);
    const nhan = `${ten} t=${d.t.toFixed(1)}s ${d.che}`;
    const ch = f.cham.filter((c) => c.op > 0.08);
    let kcMin = Infinity, cap = '';
    for (let i = 0; i < ch.length; i++) for (let j = i + 1; j < ch.length; j++) {
      if (d.mien && d.mien.has(ch[i].ten) && d.mien.has(ch[j].ten)) continue;
      const k = Math.hypot(ch[i].x - ch[j].x, ch[i].y - ch[j].y);
      if (k < kcMin) { kcMin = k; cap = ch[i].ten + ch[j].ten; }
    }
    thu(`${nhan}: đỉnh cách nhau >= ${KC_TOI_THIEU} px`, kcMin >= KC_TOI_THIEU, `${cap} ${kcMin.toFixed(1)} px`);
    const nh = f.nhan.filter((n) => n.op > 0.08);
    let ov = 0, ds = [];
    for (let i = 0; i < nh.length; i++) for (let j = i + 1; j < nh.length; j++) {
      const o = chong(hop(nh[i]), hop(nh[j]));
      if (o > 0) { ov += o; ds.push(nh[i].ten + '/' + nh[j].ten); }
    }
    thu(`${nhan}: hộp nhãn không chồng nhau`, ov === 0, ds.join(' '));
    const deCham = [];
    for (const n of nh) for (const c of ch) {
      if (c.ten === n.ten) continue;
      const b = hop(n);
      const qx = Math.max(b.x0, Math.min(c.x, b.x1)), qy = Math.max(b.y0, Math.min(c.y, b.y1));
      if (Math.hypot(c.x - qx, c.y - qy) < c.r) deCham.push(n.ten + '>' + c.ten);
    }
    thu(`${nhan}: nhãn không đè chấm điểm khác`, !deCham.length, deCham.join(' '));
    const ngoai = nh.filter((n) => { const b = hop(n); return b.x0 < VUNG.x0 - 0.5 || b.x1 > VUNG.x1 + 0.5 || b.y0 < VUNG.y0 - 0.5 || b.y1 > VUNG.y1 + 0.5; }).map((n) => n.ten)
      .concat(ch.filter((c) => c.x < VUNG.x0 || c.x > VUNG.x1 || c.y < VUNG.y0 || c.y > VUNG.y1).map((c) => '•' + c.ten));
    thu(`${nhan}: nhãn + đỉnh trong SAFE_ZONE_TIKTOK`, !ngoai.length, ngoai.join(' '));
    // nét liền / đứt so với bắn tia chuẩn
    const C = E.heMay(f.may).viTri;
    const suot = cb.vo.some((m) => Math.abs(E.doTruoc(m, C)) < E.NGUONG_SUOT);
    let sai = [];
    if (!suot) for (const m of f.manh) {
      const L = m.u1 - m.u0;
      if (L < 0.02) continue;
      const mau = E.khuatMauDay(m.a, m.b, C, cb.vo, 24).slice(2, 22);
      const lech = mau.filter((k) => k !== m.khuat).length;
      if (lech > 0) sai.push(`${m.id}[${m.u0.toFixed(2)}-${m.u1.toFixed(2)}]`);
    }
    thu(`${nhan}: nét liền/đứt khớp phép thử bắn tia chuẩn${suot ? ' (mặt sượt: theo luật ổn định)' : ''}`, !sai.length, sai.slice(0, 5).join(' '));
  }
  // chống nhấp nháy trong từng đoạn giữ góc
  moc.forEach((x, i) => {
    const ke = i + 1 < moc.length ? moc[i + 1].t0 : tong;
    if (ke - x.t1 < 1) return;
    // trạng thái liền/đứt lấy mẫu dọc nét (20 điểm, bỏ sát biên mảnh) — số mảnh có thể đổi khi mặt kính hiện (tách lớp sau kính)
    // nhưng trạng thái che không được đổi; bỏ nét đang vẽ dần (vừa hiện < 0,75 s)
    const hien = kg.hien || {};
    const vuaHien = (id, t) => Object.entries(hien).some(([k, th]) => (k === id || E.khoaId(k) === E.khoaId(id)) && t - th < 0.75 && t >= th - 0.05);
    const trang = (t) => {
      const f = E.veKhung(kg, cb, t, W, H, VUNG);
      const m = new Map();
      const theoId = new Map();
      for (const p of f.manh) theoId.set(p.id, [...(theoId.get(p.id) || []), p]);
      for (const [id, ds] of theoId) {
        if (vuaHien(id, t)) continue;
        let s = '';
        for (let k = 0; k < 20; k++) {
          const u = (k + 0.5) / 20;
          const p = ds.find((x) => x.u0 <= u && u <= x.u1);
          s += !p || ds.some((x) => Math.abs(x.u0 - u) < 0.03 || Math.abs(x.u1 - u) < 0.03) ? '?' : p.khuat ? 'D' : 'L';
        }
        m.set(id, s);
      }
      return m;
    };
    const giongNhau = (a, b) => a.length === b.length && [...a].every((c, k) => c === '?' || b[k] === '?' || c === b[k]);
    let doi = [];
    let truocDo = trang(x.t1 + 0.05);
    for (let k = 1; k <= 24; k++) {
      const t = x.t1 + 0.05 + ((ke - 0.05 - x.t1 - 0.05) * k) / 24;
      const nay = trang(t);
      for (const [id, s] of nay) if (truocDo.has(id) && !giongNhau(truocDo.get(id), s)) doi.push(`${id}@${t.toFixed(2)}`);
      truocDo = nay;
    }
    thu(`${ten}: giữ góc ${x.che_do} (${x.t1.toFixed(1)}-${ke.toFixed(1)}s) không nhấp nháy nét`, !doi.length, doi.slice(0, 5).join(' '));
  });
  // máy không xoay trước mốc: trước t0 của mỗi cú xoay, tư thế = tư thế trước đó (bỏ trôi chậm)
  let som = [];
  moc.forEach((x) => {
    const a = E.mayTai(cb.lich, x.t0 - 0.02, tong).on, b = x.A;
    if (Math.abs(a.n - b.n) > 1e-6 || Math.abs(a.c - b.c) > 1e-6) som.push(x.che_do);
  });
  thu(`${ten}: không cú nào xoay trước mốc`, !som.length, som.join(','));
}

// ---- v97 bố cục tối giản: vùng + khối công thức không bao giờ trống ----
{
  const kq2 = await build({entryPoints: [path.resolve('src/khung4tang/toi_gian.ts')], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'error'});
  const tep2 = path.join(os.tmpdir(), `toi_gian_${process.pid}.mjs`);
  fs.writeFileSync(tep2, kq2.outputFiles[0].text);
  const T = await import(pathToFileURL(tep2).href);
  fs.unlinkSync(tep2);
  const V = T.VUNG_TOI_GIAN;
  thu('tối giản: T2 tràn viền 16 %..62 % chiều cao', V.t2.y === 307 && V.t2.y + V.t2.h === 1190);
  thu('tối giản: T1 < T2 < T3 < phụ đề, không chồng, trong Top 11 % / Bottom 18 %', V.t1.y >= 212 && V.t1.y + V.t1.h <= V.t2.y && V.t2.y + V.t2.h <= V.t3.y && V.t3.y + V.t3.h <= V.phuDe && V.phuDe + 50 <= 1574);
  for (const tp of dsProps) {
    const P = JSON.parse(fs.readFileSync(tp, 'utf8'));
    const ten = path.basename(tp);
    const buoc = P.khung4tang.buoc;
    let trong = [];
    buoc.forEach((b, i) => b.the.forEach((th, j) => {
      const t0 = T.tHienThe(b, j);
      if (th.loai === 'cong_thuc' && th.moc && th.moc[0] > t0 + 1e-9) trong.push(`bước ${i + 1} thẻ ${j + 1}`);
    }));
    // quét từng khung 30 fps: khối đang giảng (nếu có) luôn có dòng đầu đã tới mốc
    for (let f = 0; f < P.khung4tang.tongFrame; f++) {
      const t = f / 30;
      let i = -1;
      buoc.forEach((b, k) => b.t <= t && (i = k));
      if (i < 0) continue;
      const x = T.theDangGiang(buoc[i], t);
      const th = x && buoc[i].the[x.j];
      if (th && th.loai === 'cong_thuc' && (!th.dong.length || (th.moc && th.moc[0] > t + 1e-9))) trong.push(`khung ${f}`);
    }
    thu(`${ten}: khối công thức không bao giờ hiện vỏ trống (mọi khung)`, !trong.length, trong.slice(0, 5).join(', '));
  }
  // tái hiện lỗi cũ: mẫu 2 khung 1140 (38,0 s) — thẻ "AH ⊥ SB" có vỏ lúc 37,919 s nhưng dòng đầu 38,069 s
  const P2 = JSON.parse(fs.readFileSync(dsProps.find((x) => /vuong_goc_sa/.test(x)) || dsProps[dsProps.length - 1], 'utf8'));
  const b4 = P2.khung4tang.buoc.find((b) => /Khoảng cách/.test(b.nhan));
  if (b4) {
    const x = T.theDangGiang(b4, 38.0);
    thu('mẫu 2 khung 1140: chưa tới dòng đầu thì không hiện khối mới (không vỏ trống)', !x || b4.the[x.j].moc[0] <= 38.0, JSON.stringify(x));
  }
}

console.log(`test_hinh_3d_chat_luong: ${dat} đạt, ${hong} hỏng`);
process.exit(hong ? 1 : 0);
