// v96 — Test sân khấu 2D + VÙNG AN TOÀN TIKTOK 4 CẠNH: node scripts/test_san_khau_2d.mjs
// Kiểm: SAFE_ZONE_TIKTOK (top >= 11 %, phải >= 12 %, đáy >= 18 %) cho 4 tầng / Intro / Outro; mọi phần tử quan trọng của 4 mẫu
// (thẻ rút mẫu, khay, dải kết quả, nút cây + tích cuối nhánh, lưới Bayes, cột) nằm trong vùng an toàn ở cả vị trí T2 lẫn lúc Intro;
// hook 2 giây đầu (pha đầu <= 0,5 s), chống đứng hình (không khoảng > 4 s thiếu pha / nhịp), biến kéo về điểm tối ưu,
// khóa màu ẩn số, đồ thị không NaN.
import {build} from 'esbuild';
import fs from 'fs';
import {execFileSync, spawnSync} from 'node:child_process';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {dungImXacSuat} from './dung_im_xs.mjs';
import path from 'path';
import {pathToFileURL} from 'url';

const nap = async (tep) => {
  const kq = await build({entryPoints: [path.resolve(tep)], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'error',
    external: ['react', 'remotion', 'katex', 'react/jsx-runtime'], jsx: 'automatic'});
  fs.mkdirSync('out', {recursive: true});
  const tam = path.join(path.resolve('out'), `sk2d_test_${process.pid}_${path.basename(tep)}.mjs`);
  fs.writeFileSync(tam, kq.outputFiles[0].text);
  const m = await import(pathToFileURL(tam).href);
  fs.unlinkSync(tam);
  return m;
};
const C = await nap('src/sankhau2d/chung.ts');
const V = await nap('src/khung4tang/vung.ts');
const B = await nap('src/khung4tang/bo_cuc_v93.ts');

let dat = 0, hong = 0;
const thu = (ten, dk, them = '') => {
  if (dk) dat++;
  else hong++;
  console.log(`${dk ? 'ĐẠT ' : 'HỎNG'} ${ten}${dk || !them ? '' : ' — ' + them}`);
};

console.log('— Vùng an toàn TikTok');
thu('AN_TOAN = trái 130 (12 %, v98 đối xứng) | phải 950 (12 %) | trên 212 (11 %) | đáy 1574 (18 %)', V.AN_TOAN.x0 === 130 && V.AN_TOAN.x1 === 950 && V.AN_TOAN.y0 === 212 && V.AN_TOAN.y1 === 1574, JSON.stringify(V.AN_TOAN));
const bc = V.boCuc4Tang(true);
thu('T1 bắt đầu >= 11 % (tiêu đề góc trên không bị thanh tìm kiếm che)', bc.t1.y >= 0.11 * 1920);
thu('T4 kết thúc <= 82 % (không đè caption + thanh nhạc)', bc.t4.y + bc.t4.h <= 0.82 * 1920);
thu('4 tầng liền nhau, không chồng', bc.t1.y + bc.t1.h === bc.t2.y && bc.t2.y + bc.t2.h === bc.t3.y && bc.t3.y + bc.t3.h === bc.t4.y);
thu('bề rộng nội dung <= 88 % (tránh cột Tim / Bình luận / Lưu / Chia sẻ)', bc.rong <= 0.88 * 1080, String(bc.rong));
thu('v98: khung ĐỐI XỨNG — lề trái = lề phải = 130 px, tâm 540', bc.le === 130 && 1080 - (bc.le + bc.rong) === 130 && bc.le + bc.rong / 2 === 540, `${bc.le} + ${bc.rong}`);
thu('Intro: vùng mô hình + hook + nút CTA trong vùng an toàn', B.INTRO_SAN.y >= 212 && B.INTRO_SAN.y + B.INTRO_SAN.h + 172 + 92 <= 1574 && B.INTRO_SAN.h === bc.t2.h);
const O = B.VUNG_OUTRO;
thu('Outro: đáp án >= 11 %, nút lưu <= 82 %', O.dapAn.y >= 212 && O.nut.y + 96 <= 1574);
thu('Intro/Outro chữ trong khung đối xứng 130..950', B.LE_ND_V93 === V.AN_TOAN.x0 && B.LE_ND_V93 + B.RONG_ND_V93 === V.AN_TOAN.x1 && B.RONG_CHU + 96 <= B.RONG_ND_V93);
const src4 = fs.readFileSync('src/khung4tang/Khung4Tang.tsx', 'utf8');
thu('Khung4Tang: mọi tầng dùng bề rộng an toàn bc.rong', (src4.match(/rong=\{bc\.rong\}/g) || []).length >= 6, String((src4.match(/rong=\{bc\.rong\}/g) || []).length));
thu('phụ đề 1 dòng có viền tối + không tự xuống dòng', /textShadow: '0 2px 0 #000/.test(src4) && /textWrap: 'nowrap'/.test(src4) && /Math\.min\(42/.test(src4));

console.log('— 4 mẫu v96: phần tử quan trọng trong vùng an toàn');
const W = bc.rong, H = bc.t2.h;
const MAU = ['vd_153504', 'bayes_xet_nghiem', 'loi_nhuan_tra_sua', 'dai_so_chi_dao'];
for (const ten of MAU) {
  const tep = `out/v96/${ten}/props.json`;
  if (ten === 'dai_so_chi_dao') {
    const r = spawnSync('python', ['-X', 'utf8', 'scripts/chuanbi.py', 'mau/v96/dai_so_chi_dao.json', '--gia-lap', '--props-ra', tep], {encoding: 'utf8', env: {...process.env, PYTHONIOENCODING: 'utf-8'}});
    thu('THUC_TE cũ chỉ có hộp chữ dừng trước TTS/bundle', r.status === 42 && /t2_trong:/.test(r.stderr || ''), `rc=${r.status} ${(r.stderr || '').trim().slice(0, 120)}`);
    continue;
  }
  if (!fs.existsSync(tep)) { thu(`${ten}: có props (chạy python scripts/test_v96.py trước)`, false); continue; }
  const p = JSON.parse(fs.readFileSync(tep, 'utf8'));
  const sk = p.khung4tang?.sanKhau;
  if (!sk) { thu(`${ten}: có sanKhau`, false); continue; }
  const hop = C.hopQuanTrong(sk, W, H);
  const ngoai = (y0) => hop.filter((h) => !V.trongAnToan(bc.le + h.x, y0 + h.y, h.w, h.h));
  const n1 = ngoai(bc.t2.y), n2 = ngoai(B.INTRO_SAN.y);
  thu(`${ten} (${sk.loai}): ${hop.length} phần tử trong vùng an toàn ở tầng 2`, !n1.length, n1.map((h) => `${h.ten}@${Math.round(h.x)},${Math.round(h.y)} ${Math.round(h.w)}x${Math.round(h.h)}`).slice(0, 3).join('; '));
  thu(`${ten}: vẫn an toàn lúc Intro (sân khấu giữa màn hình)`, !n2.length, n2.map((h) => h.ten).slice(0, 3).join(', '));
  thu(`${ten}: mép phải mọi phần tử <= 950 px`, hop.every((h) => bc.le + h.x + h.w <= V.AN_TOAN.x1 + 0.5));
  thu(`${ten}: mép trên mọi phần tử >= 11 % màn hình`, hop.every((h) => bc.t2.y + h.y >= 212));
  thu(`${ten}: hook 2 giây — pha đầu ${sk.pha[0].t} s`, sk.pha[0].t <= 0.5);
  const tong = p.khung4tang.tongFrame / 30;
  const moc = [...sk.pha.map((x) => x.t), ...(sk.nhip || []), tong].sort((a, b) => a - b);
  const ho = Math.max(...moc.slice(1).map((x, i) => x - moc[i]));
  thu(`${ten}: chống đứng hình — khoảng dài nhất ${ho.toFixed(2)} s <= 4 s`, ho <= 4.0001);
  // tiến độ luôn chạy (thanh tiến độ không đứng yên giữa hai mốc)
  const a = C.tienDo(sk.pha, 3), b2 = C.tienDo(sk.pha, 3.5);
  thu(`${ten}: thanh tiến độ pha chuyển động`, b2 !== a || sk.pha.length < 2);
  if (sk.loai === 'rut_mau') {
    const nhomCua = Object.fromEntries(sk.phan_tu.map((x) => [x.gia_tri, x.nhom]));
    thu('rut_mau: 4, 8 cùng nhóm vàng; 2, 6, 10 cùng nhóm; số lẻ cùng nhóm', nhomCua[4] === nhomCua[8] && nhomCua[2] === nhomCua[6] && nhomCua[6] === nhomCua[10] && [1, 3, 5, 7, 9].every((v) => nhomCua[v] === nhomCua[1]) && nhomCua[1] !== nhomCua[2] && sk.nhom[nhomCua[4]].mau === 'vang');
    const ket = sk.pha.find((x) => x.ten === 'ket');
    thu('rut_mau: pha chốt nhấc bộ thỏa A (tích ⋮ 4)', ket && ket.thoa === true && /\\vdots 4$/.test(ket.kl) && !/không/.test(ket.kl));
    const doi = sk.pha.find((x) => x.ten === 'doi');
    thu('rut_mau: pha biến cố đối nhấc bộ thuộc Ā ("không ⋮ 4")', doi && doi.thoa === false && /text\{ không \} \\vdots 4/.test(doi.kl));
  }
  if (sk.loai === 'kinh_te_do_thi') {
    const tT = sk.pha.find((x) => x.ten === 'toi_uu').t;
    const x = C.bienTheoPha(sk.pha, tT + 1.5, sk.mien[0], sk.mien[1], sk.x_tot);
    thu('kinh tế: biến trượt về điểm tối ưu (x ≈ 5) sau pha tối ưu', Math.abs(x - 5) < 0.2, String(x));
    const xs = [2, 4, 6, 8].map((d) => C.bienTheoPha(sk.pha, sk.pha.find((q) => q.ten === 'keo').t + d, 0, 20, 5));
    thu('kinh tế: pha kéo quét qua lại (giá trị đổi liên tục)', new Set(xs.map((v) => v.toFixed(2))).size === 4, xs.join(', '));
    const f = C.hamMotBien(sk.ham, sk.bien);
    const th = C.thangDoThi(f, 0, 20, {x: 0, y: 0, w: 500, h: 300});
    thu('kinh tế: đồ thị đủ điểm, không NaN', th && th.mau.length > 100 && th.mau.every(([u, v]) => Number.isFinite(u) && Number.isFinite(v)));
  }
}

const {RutTheoBuoc} = await nap('src/sankhau2d/RutTheoBuoc.tsx');
for (const [mode, counts] of Object.entries({chia_th:[180,252],lan_luot:[10,70],phan_bu:[140,210]})) {
  const sk = JSON.parse(execFileSync('python', ['-X','utf8','-c', [
    'import sys,json; sys.path.insert(0,"scripts"); from xac_suat_dong import mo_phong',
    'k=json.load(open(sys.argv[1],encoding="utf8")); bs=k["khung4tang"]["buoc"]',
    'print(json.dumps(mo_phong(k,bs,[{"t":i*6} for i in range(len(bs))],lambda a,b:"",len(bs)*6)))'
  ].join('\n'), 'mau/xac_suat/'+mode+'.json'], {encoding:'utf8'}));
  const draw = (t,final=false) => renderToStaticMarkup(createElement(RutTheoBuoc,{sk,t,W:820,H:648,final}));
  const markup = sk.pha.map(p => draw(p.t+1.5));
  const objects = s => [...s.matchAll(/data-xs-object="([^"]+)"[^>]*>/g)].map(m => m[0]).join('|');
  thu(mode+' số cách', sk.n_a === counts[0] && sk.n_omega === counts[1]);
  thu(mode+' đổi hình qua mỗi bước', markup.every((s,i) => !i || objects(s)!==objects(markup[i-1]) || objects(draw(sk.pha[i].t+3.5))!==objects(markup[i-1])));
  thu(mode+' Outro chỉ có thanh tỉ lệ', !/data-xs-object="\d/.test(draw(0,true)) && draw(0,true).includes('data-xs-object="A"'));
  if (mode === 'phan_bu') {
    const x = [...objects(markup[0]).matchAll(/translate\(([\d.]+)/g)].map(m=>+m[1]);
    thu('tâm lưới 540 và tên An, Bình', (Math.min(...x)+Math.max(...x))/2+130===540 && ['An','Bình'].every(n=>markup[0].includes('>'+n+'<')));
  }
  if (mode === 'chia_th') thu('TH1, TH2 đúng màu và số cách', sk.pha.filter(p=>p.ten==='truong_hop').every((p,i)=>p.chon.filter(j=>j<sk.do).length===4-i && p.kl.includes(i?'120':'60')));
  if (mode === 'lan_luot') thu('khóa lượt cuối và đếm năm lượt đầu', markup.some(s=>s.includes('L6 = đỏ thứ 4') && s.includes('C(5,3) = 10')));
}
const steps = [0,4,8,12].map(t=>({t}));
thu('DOM đứng yên qua ba bước dù nhịp nền đổi', dungImXacSuat([4,8,12].map(frame=>({frame,shape:'ball@20',stars:frame})),steps,1));
thu('DOM đứng yên hơn 12 giây trong một bước', dungImXacSuat([4,17].map(frame=>({frame,shape:'ball@20'})),steps.slice(0,2),1));
console.log('— Khóa màu ẩn số (sơ đồ tư duy)');
const k = C.khoaMauAn('x^2 - 3x + \\max(x, 2) = \\dfrac{x}{2}', 'x', '#FACC15');
thu('mọi x đứng riêng được tô cùng màu, không đụng lệnh TeX (\\max)', (k.match(/\{\\color\{#FACC15\}x\}/g) || []).length === 4 && /\\max/.test(k), k);

console.log(`\nKẾT QUẢ: ${dat} đạt, ${hong} hỏng`);
process.exit(hong ? 1 : 0);
