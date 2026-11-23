// v98.3 — Sơ đồ cây thoáng (Remotion, không render): node scripts/test_v98_3.mjs
//  - mọi cặp hộp (gốc / nút / viên nhãn nhánh / viên tích) KHÔNG giao nhau với cây 2, 3, 4 hộp tầng 1 (kể cả 4 hộp x 3 kết quả);
//  - viên nhãn nhánh không đè lên đường cong của nhánh KHÁC (lấy mẫu 60 điểm / nhánh, trừ đoạn sát gốc chung);
//  - viên nhãn một dòng: cao 28 px (~ nửa phân số xếp tầng 54 px), phân số đổi sang a/b;
//  - mọi hộp nằm trong sân khấu (không tràn T2), không còn dải 'ket_qua' dưới chân cây.
import {build} from 'esbuild';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {pathToFileURL} from 'url';

const nap = async (vao) => {
  const kq = await build({entryPoints: [path.resolve(vao)], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'error', external: ['react', 'remotion', 'katex']});
  const tep = path.join(os.tmpdir(), `v983_${path.basename(vao)}_${process.pid}.mjs`);
  fs.writeFileSync(tep, kq.outputFiles[0].text);
  const m = await import(pathToFileURL(tep).href);
  fs.unlinkSync(tep);
  return m;
};
const C = await nap('src/sankhau2d/chung.ts');
let dat = 0, hong = 0;
const kiem = (dk, ten) => { if (dk) dat++; else hong++; console.log((dk ? 'ĐẠT  ' : 'HỎNG ') + ten); };

const dungCay = (soHop, soKq, ps) => {
  const nut = [], canh = [];
  for (let i = 0; i < soHop; i++) {
    const id = nut.length;
    nut.push({id, nhan: `Hộp ${i + 1}`, tang: 1, cha: -1, duong: [i], p: `\\dfrac{1}{${soHop}}`, tich: null, la: false, sang: false});
    canh.push({tu: -1, den: id});
    for (let j = 0; j < soKq; j++) {
      const k = nut.length;
      nut.push({id: k, nhan: j ? 'Khác' : '2 đỏ', tang: 2, cha: id, duong: [i, j], p: ps[(i + j) % ps.length], tich: `\\dfrac{14}{${45 + i}}`, la: true, sang: false});
      canh.push({tu: id, den: k});
    }
  }
  return {loai: 'so_do_cay', tang: ['Chọn hộp', 'Lấy 2 bi'], nut, canh, pha: []};
};
const giao = (a, b, pad = 2) => a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;
// T2 khung 4 tầng: rộng 820, cao ~ 648 (398..1046)
const W = 820, H = 648;
const PS = ['\\dfrac{14}{15}', '\\dfrac{1}{15}', '\\dfrac{3}{10}', '\\dfrac{7}{10}'];
for (const [soHop, soKq] of [[2, 2], [3, 2], [4, 2], [4, 3]]) {
  const sk = dungCay(soHop, soKq, PS);
  const b = C.boCucCay(sk, W, H);
  const hop = b.hop;
  const ten = `${soHop} hộp x ${soKq}`;
  const dung = [];
  for (let i = 0; i < hop.length; i++) for (let j = i + 1; j < hop.length; j++) if (giao(hop[i], hop[j])) dung.push(`${hop[i].ten}~${hop[j].ten}`);
  kiem(!dung.length, `${ten}: không hộp nào chạm nhau (${dung.slice(0, 4).join(', ') || 'ok'})`);
  kiem(hop.every((h) => h.x >= 0 && h.y >= 0 && h.x + h.w <= W && h.y + h.h <= H), `${ten}: mọi hộp trong sân khấu ${W}x${H}`);
  kiem(!hop.some((h) => h.ten === 'ket_qua'), `${ten}: không còn dải kết quả dưới chân cây`);
  // viên nhãn không đè nhánh khác
  let de = [];
  for (const h of hop.filter((x) => x.ten.startsWith('nhan_'))) {
    const id = +h.ten.slice(5);
    const n = sk.nut.find((x) => x.id === id);
    for (const c of sk.canh) {
      if (c.den === id) continue;
      if (n.tang === 1 && c.tu === -1) {
        // anh em cùng xuất phát từ gốc: chỉ xét đoạn đã tách xa (u > 0,35)
      }
      const bz = b.nhanh.get(c.den);
      for (let s = 0; s <= 60; s++) {
        const u = s / 60;
        if (c.tu === n.cha && u < 0.3) continue; // đoạn sát nút cha chung
        const p = C.diemBz(bz, u);
        if (p.x > h.x - 1 && p.x < h.x + h.w + 1 && p.y > h.y - 1 && p.y < h.y + h.h + 1) { de.push(`${h.ten}/nhánh ${c.den}`); break; }
      }
    }
  }
  kiem(!de.length, `${ten}: viên nhãn không đè nhánh khác (${de.slice(0, 3).join(', ') || 'ok'})`);
  kiem(b.caoNut >= 34 && b.caoNut <= 48, `${ten}: nút cao ${b.caoNut} px (co theo khe dọc)`);
}
kiem(C.CAO_VIEN_CAY <= 28, `viên nhãn một dòng cao ${C.CAO_VIEN_CAY} px`);
kiem(C.phangTex('\\dfrac{14}{15}') === '14/15' && C.phangTex('= \\dfrac{3}{20}') === '= 3/20', 'phân số -> a/b nằm ngang');
kiem(C.rongVienCay('\\dfrac{14}{15}') < C.rongVienCay('\\dfrac{14}{150}'), 'bề rộng viên theo số ký tự');
const mau = JSON.parse(fs.readFileSync('out/v98_3/cay_bayes_3hop/props.json', 'utf8')).khung4tang.sanKhau;
kiem(mau.kieu_so === 'phan_so' && mau.nut.filter((n) => n.tang === 1).every((n) => n.bi), 'mẫu 3 hộp: phân số đồng nhất + bi đủ 3 hộp');
console.log(`\nKẾT QUẢ: ${dat} đạt, ${hong} hỏng`);
process.exit(hong ? 1 : 0);
