// v102.1 — Kiểm thử hồi quy KIẾN TRÚC BP2 bền vững (0 gọi API thật, Gemini giả lập):
//  1. Cửa cứng / Cửa mềm: 76–86 %, 0 lỗi cứng, quy_tac_hoc = 6 -> ĐẬU; sai đáp án / lệch minh họa nghiêm trọng -> RỚT.
//  2. Vệ sinh tĩnh 0-API: mo_ta_minh_hoa lặp rác được khử; đề "3 trạm phát tín hiệu A, B, C" KHÔNG rơi vào hop_bi; thu_lai khóa tại schema.
//  3. Hình học: "Ax" xử lý sạch (hoặc báo rõ ngay vòng tĩnh), moc_xoay sai -> góc toan_canh; trần sửa = 1 (không còn vòng 3 lần).
//  4. Cầu dao BP2: 5 bài trượt liên tiếp hoặc quỹ key < 20 % -> tạm dừng 3 giờ, 1 tin Zalo; reset khi có bài đậu; /mobp2.
// Chạy: node scripts/test_kien_truc_bp2.cjs
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const GOC = path.join(__dirname, '..');
const doc = (f) => fs.readFileSync(path.join(GOC, f), 'utf8');
let dat = 0;
const hong = [];
const t = (ten, fn) => { try { fn(); dat++; console.log('  ✓', ten); } catch (e) { hong.push(ten); console.log('  ✗', ten, '—', String(e.message).split('\n')[0]); } };
const J = (x) => JSON.parse(JSON.stringify(x));

/* ---------------- ngữ cảnh Apps Script giả ---------------- */
const props = {};
const zalo = [];
const nhatKy = [];
const cauHinh = {};
let traLoiGemini = null;
const ctx = vm.createContext({
  console, Date, JSON, Math,
  PropertiesService: {getScriptProperties: () => ({getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: (k) => { delete props[k]; }, getProperties: () => ({...props})})},
  CacheService: {getScriptCache: () => ({get: () => null, put() {}, remove() {}})},
  Utilities: {formatDate: (d, tz, f) => {
    const v = new Date(new Date(d).getTime() + 7 * 3600e3).toISOString();
    return f === 'HH:mm' ? v.slice(11, 16) : f === 'HH' ? v.slice(11, 13) : v.slice(0, 10).replace(/-/g, '');
  }, getUuid: () => 'u'},
  SpreadsheetApp: {getActiveSpreadsheet: () => ({getSheetByName: () => null}), flush() {}},
});
for (const f of ['BoPhan1.gs', 'NangCao.gs', 'KiemTraHinh.gs', 'HinhHoc.gs', 'PromptKichBan.gs', 'SanKhau.gs', 'BoNaoDieuPhoi.gs']) vm.runInContext(doc(f), ctx, {filename: f});
// dịch vụ phụ thay bằng bản giả (định nghĩa SAU khi nạp .gs để đè bản thật đọc Sheets / gọi mạng)
Object.assign(ctx, {
  cauHinh_: (k) => cauHinh[k] || '', chNC_: (k) => cauHinh[k] || '',
  nhatKy_: (m, n) => nhatKy.push(m + ': ' + n), guiZalo_: (s) => zalo.push(s), guiZaloMotLan_: (k, s) => zalo.push(s),
  quyTacHocChoKiemDuyet_: () => ['Không lặp câu mở đầu', 'Mỗi cảnh một thẻ nhắc khác nhau'],
  tuyChonBienKich_: () => ({}), goiGemini_: () => J(traLoiGemini),
});

const ds = ctx.tieuChiYeuCau_(false, 'kb');
const ids = ds.map((x) => x.id);
const diemCho = (base, doi) => Object.fromEntries(ids.map((id) => [id, id in doi ? doi[id] : base]));
const tinhPT = (d) => { let tg = 0, w = 0; ds.forEach((x) => { tg += d[x.id] * x.w; w += x.w; }); return Math.round(tg / w * 10); };

console.log('1. Cửa cứng / Cửa mềm BP2');
t('bảng tiêu chí kịch bản có quy_tac_hoc (khi đã dạy quy tắc) và các tiêu chí mềm', () => {
  for (const id of ['quy_tac_hoc', 'ke_chuyen', 'nhieu_canh', 'thu_lai', 'loi_giai', 'dap_an']) assert.ok(ids.includes(id), id);
});
t('85–86 % (VD261128-043430-0), 0 lỗi cứng, quy_tac_hoc = 6 -> ĐẬU', () => {
  const d = diemCho(9, {quy_tac_hoc: 6, ke_chuyen: 8});
  const kq = ctx.tinhDapUngKb_({diem: d, van_de: ['Câu thoại cảnh 3 chưa mượt', 'Thẻ cảnh 4 lặp thẻ cảnh 2']}, ds);
  assert.ok(kq.phan_tram >= 84 && kq.phan_tram <= 88, String(kq.phan_tram));
  assert.equal(kq.dat, true);
  assert.deepEqual(J(kq.nang), []);
  assert.ok(kq.mem.some((x) => /^quy_tac_hoc=6/.test(x)), 'quy_tac_hoc chỉ là góp ý mềm');
  assert.equal(ctx.quyetDinhKichBanBP2_(kq, []).dat, true);
  // so với cách chấm cũ (mọi tiêu chí >= 8 + bắt buộc >= 7): bản cũ ĐÁNH TRƯỢT oan
  assert.equal(ctx.tinhDapUng_({diem: d}, ds).dat, false);
});
t('76 % (biên dưới), 0 lỗi cứng, quy_tac_hoc = 6 -> ĐẬU', () => {
  const d = diemCho(8, {quy_tac_hoc: 6, ke_chuyen: 7});
  const pt = tinhPT(d);
  assert.ok(pt >= 76 && pt <= 78, 'pt=' + pt);
  const kq = ctx.tinhDapUngKb_({diem: d}, ds);
  assert.equal(kq.dat, true, JSON.stringify(kq.nang) + ' ' + kq.phan_tram);
});
t('74 % (TT261128-043740-0) -> chỉ cửa mềm chưa đạt (không phải lỗi cứng)', () => {
  const d = diemCho(7, {quy_tac_hoc: 6, ke_chuyen: 6, nhieu_canh: 7, loi_giai: 8, dap_an: 9, de_bai: 8});
  const kq = ctx.tinhDapUngKb_({diem: d}, ds);
  const qd = ctx.quyetDinhKichBanBP2_(kq, []);
  assert.ok(kq.phan_tram < 75, String(kq.phan_tram));
  assert.equal(qd.dat, false);
  assert.equal(qd.cua, 'mem');
});
t('sai đáp án (dap_an = 4) dù tổng 90 % -> RỚT ở cửa cứng', () => {
  const kq = ctx.tinhDapUngKb_({diem: diemCho(10, {dap_an: 4})}, ds);
  assert.ok(kq.phan_tram >= 88);
  assert.equal(kq.dat, false);
  assert.ok(kq.nang.includes('dap_an=4'));
  assert.equal(ctx.quyetDinhKichBanBP2_(kq, []).cua, 'cung');
});
t('sai toán (loi_giai = 5) -> RỚT; lệch hẳn minh họa (bam_de = 3) -> RỚT', () => {
  assert.equal(ctx.tinhDapUngKb_({diem: diemCho(10, {loi_giai: 5})}, ds).dat, false);
  assert.equal(ctx.tinhDapUngKb_({diem: diemCho(10, {bam_de: 3})}, ds).dat, false);
});
t('lỗi cứng tĩnh (XS_SAI_DAP_SO) -> RỚT dù AI chấm 95 %', () => {
  const kq = ctx.tinhDapUngKb_({diem: diemCho(10, {})}, ds);
  assert.equal(ctx.quyetDinhKichBanBP2_(kq, ['XS_SAI_DAP_SO: n(A) lệch']).dat, false);
});
const kbXS = {canh: [1, 2, 3, 4, 5, 6].map((i) => ({so: i, loai: i === 1 ? 'de_bai' : 'tinh_toan', loi_thoai: 'Cảnh ' + i, noi_dung_man_hinh: []})), cau_chuyen: {}};
const rXS = {id: 'TT1', mon: 'XAC_SUAT', lop: '11', de_bai: 'Ba trạm phát tín hiệu A, B, C hoạt động độc lập', dap_an: '0,994', cach_1: '{}'};
t('aiDuyetKichBan_: doi_chieu_canh chỉ có góp ý mô tả phụ (lech_ban_chat=false) -> KHÔNG đánh trượt', () => {
  traLoiGemini = {diem: diemCho(9, {quy_tac_hoc: 6}), van_de: [], gop_y: '', doi_chieu_canh: kbXS.canh.map((c) => ({canh: c.so, loi: c.so === 2 ? ['mô tả minh họa còn chung chung'] : [], lech_ban_chat: false}))};
  const kq = ctx.aiDuyetKichBan_(J(kbXS), rXS, null);
  assert.equal(kq.dat, true, JSON.stringify(kq.nang));
  assert.ok(!kq.nang.includes('doi_chieu_canh'));
});
t('aiDuyetKichBan_: thiếu / lệch số mục doi_chieu_canh -> chỉ góp ý mềm (không trượt oan 4/4 bài)', () => {
  traLoiGemini = {diem: diemCho(9, {}), van_de: [], gop_y: '', doi_chieu_canh: [{canh: 1, loi: [], lech_ban_chat: false}]};
  assert.equal(ctx.aiDuyetKichBan_(J(kbXS), rXS, null).dat, true);
});
t('aiDuyetKichBan_: cảnh vẽ hộp bi cho bài trạm phát sóng (lech_ban_chat=true) -> RỚT', () => {
  traLoiGemini = {diem: diemCho(9, {}), van_de: [], gop_y: '', doi_chieu_canh: kbXS.canh.map((c) => ({canh: c.so, loi: c.so === 1 ? ['vẽ hộp bi trong khi đề là 3 trạm phát tín hiệu'] : [], lech_ban_chat: c.so === 1}))};
  const kq = ctx.aiDuyetKichBan_(J(kbXS), rXS, null);
  assert.equal(kq.dat, false);
  assert.ok(kq.nang.includes('doi_chieu_canh'));
  assert.ok(/hộp bi/.test(kq.van_de[0]));
});
t('schema đối chiếu cảnh bắt buộc trường lech_ban_chat (để AI tách lỗi nặng / nhẹ)', () => {
  let sc = null;
  ctx.goiGemini_ = (p, nhiet, tc) => { sc = tc.schema; return J(traLoiGemini); };
  ctx.aiDuyetKichBan_(J(kbXS), rXS, null);
  ctx.goiGemini_ = () => J(traLoiGemini);
  assert.ok(sc.properties.doi_chieu_canh.items.required.includes('lech_ban_chat'));
});
t('BP2: AI chấm TỐI ĐA 1 lần, không còn vòng sửa sau chấm (toiDaYC / totNhatYC đã gỡ)', () => {
  const src = doc('BoPhan1.gs');
  const khoi = src.slice(src.indexOf('BỘ PHẬN KIỂM DUYỆT YÊU CẦU - cửa 1'), src.indexOf("if (dg.nhe.length) nhatKy_('KICH_BAN_LUU_Y'"));
  assert.equal((khoi.match(/aiDuyetKichBan_\(/g) || []).length, 1);
  assert.ok(!/while \(conDuGoiGemini_\(\)\)|toiDaYC|totNhatYC|suaKichBanBangGemini_/.test(khoi));
  assert.ok(/quyetDinhKichBanBP2_/.test(khoi));
});

console.log('2. Vệ sinh tĩnh 0-API + minh họa trung tính + khóa thu_lai');
t('khuLapVanBan_: khử câu lặp, n-gram lặp, mục "the, the, the"; giữ số thập phân 0,8', () => {
  const rac = 'Ba trạm phát sóng A, B, C. Ba trạm phát sóng A, B, C. Sân khấu gồm the, the, the, the, xuất hiện xuất hiện lần lượt lần lượt theo lời thoại. Ba trạm phát sóng A, B, C.';
  const s = ctx.khuLapVanBan_(rac, 220);
  assert.equal((s.match(/Ba trạm phát sóng/g) || []).length, 1);
  assert.ok(!/the, the/.test(s) && !/xuất hiện xuất hiện/.test(s) && !/lần lượt lần lượt/.test(s), s);
  assert.equal(ctx.khuLapVanBan_('Xác suất 0,8; 0,7 và 0,9.', 0), 'Xác suất 0,8; 0,7 và 0,9.');
});
t('veSinhVanBanKb_: mo_ta_minh_hoa / minh_hoa.mo_ta lặp rác -> sạch, ≤ 220 ký tự; dòng / thẻ trùng bị bỏ', () => {
  const lap = Array(30).fill('Hộp trong suốt chứa bi đỏ và bi xanh.').join(' ');
  const kb = {canh: [{so: 1, loai: 'de_bai', loi_thoai: 'Đề bài. Đề bài.', noi_dung_man_hinh: ['x = 1', 'x = 1'], mo_ta_minh_hoa: lap, minh_hoa: {loai: 'san_khau', mo_ta: lap}}],
    khung4tang: {buoc: [{the: [{loai: 'cong_thuc', dong: ['a', 'a']}, {loai: 'cong_thuc', dong: ['a', 'a']}]}]}};
  const sua = ctx.veSinhVanBanKb_(kb);
  assert.ok(sua.length >= 2);
  assert.equal(kb.canh[0].mo_ta_minh_hoa, 'Hộp trong suốt chứa bi đỏ và bi xanh.');
  assert.equal(kb.canh[0].minh_hoa.mo_ta, 'Hộp trong suốt chứa bi đỏ và bi xanh.');
  assert.deepEqual(J(kb.canh[0].noi_dung_man_hinh), ['x = 1']);
  assert.equal(kb.khung4tang.buoc[0].the.length, 1);
  assert.deepEqual(J(kb.khung4tang.buoc[0].the[0].dong), ['a']);
  const dai = {canh: [{mo_ta_minh_hoa: Array(60).fill(0).map((_, i) => 'chi tiết ' + i).join(' ')}]};
  ctx.veSinhVanBanKb_(dai);
  assert.ok(dai.canh[0].mo_ta_minh_hoa.length <= 221);
});
t('gốc lặp "Sân khấu gồm ..." chỉ nối 1 lần và loại vật trùng bị gộp', () => {
  const src = doc('KiemTraHinh.gs');
  assert.ok(/!\/Sân khấu gồm\/\.test/.test(src) && /tenVatMT\.indexOf\(t\) < 0/.test(src));
});
t('đề "3 trạm phát tín hiệu A, B, C" -> KHÔNG BAO GIỜ hop_bi (vật đề bài = biểu đồ thanh trung tính A/B/C)', () => {
  const de = 'Ba trạm phát tín hiệu A, B, C hoạt động độc lập với xác suất phát thành công lần lượt 0,8; 0,7; 0,9. Tính xác suất có ít nhất một trạm phát thành công.';
  const v = ctx.taoVatXacSuatTheoDe_(de, 1);
  assert.notEqual(v.loai, 'hop_bi');
  assert.equal(v.loai, 'bieu_do_cot');
  assert.deepEqual(J(v.ds), ['A', 'B', 'C']);
  assert.deepEqual(J(v.ds_so), [80, 70, 90]);
  assert.equal(ctx.kiemTraMinhHoa_({loai: 'san_khau', du_lieu: {vat: [v], hanh_dong: [{buoc: 2, vat: v.id, kieu: 'sang'}]}}, 1, null) || '', '');
  assert.ok(!/hop_bi_mau/.test(ctx.mauTuSinhToiGian_({mon: 'XAC_SUAT'}, {de_bai: de})));
  assert.ok(!/hop_bi_mau/.test(ctx.mauTuSinhToiGian_({mon: 'XAC_SUAT'}, {de_bai: 'Mạch điện có 3 bóng đèn mắc nối tiếp hoạt động độc lập'})));
});
t('đề thật sự có bi vẫn dùng hop_bi (không đổi hành vi đúng)', () => {
  assert.equal(ctx.taoVatXacSuatTheoDe_('Hộp có 5 viên bi đỏ và 3 viên bi xanh, lấy 2 viên', 1).loai, 'hop_bi');
  assert.ok(/hop_bi_mau/.test(ctx.mauTuSinhToiGian_({mon: 'XAC_SUAT'}, {de_bai: 'Hộp có 5 viên bi đỏ'})));
});
t('đề không có tên đối tượng -> biểu đồ biến cố A / Ā trung tính', () => {
  const v = ctx.taoVatXacSuatTheoDe_('Chọn ngẫu nhiên 3 học sinh trong lớp có 20 nam và 15 nữ', 2);
  assert.equal(v.loai, 'bieu_do_cot');
  assert.equal(v.ds.length, 2);
});
t('rut_mau: AI ghi vat="bi" cho đề không có bi -> bỏ, suy lại từ đề (SanKhau.gs)', () => {
  const src = doc('SanKhau.gs');
  assert.ok(/ts\.vat === 'bi' && !coBiDe/.test(src));
});
t('schema BP2 (Pha 2A + 2B, JSON ↔ nội tuyến) BẮT BUỘC trường thu_lai {phep_thu, loi_doc}', () => {
  const sc = JSON.parse(doc('schema/kich_ban_bp2.json'));
  for (const k of ['pha_2a', 'pha_2b']) {
    assert.ok(sc[k].required.includes('thu_lai'), k);
    assert.deepEqual(sc[k].properties.thu_lai.required, ['phep_thu', 'loi_doc']);
  }
  assert.ok(ctx.schemaPha2A_().required.includes('thu_lai'));
  assert.ok(/"thu_lai"/.test(ctx.taoPromptPha2A_({de_bai: 'x', lop: '11'}, {}, {})));
});
const kbThieuTL = () => ({khung4tang: {buoc: [{canh: 1}, {canh: 2}, {canh: 3}, {canh: 4}]},
  thu_lai: {phep_thu: '1 - 0{,}2 \\cdot 0{,}3 \\cdot 0{,}1 = 0{,}994', loi_doc: 'Thử lại: một trừ không phẩy không không sáu bằng 0,994, khớp đáp số.'},
  canh: [{so: 1, loai: 'de_bai'}, {so: 2, loai: 'tinh_toan'}, {so: 3, loai: 'dap_an'}, {so: 4, loai: 'ket_luan'}]});
t('chotThuLaiTuSchema_: kịch bản quên cảnh thử lại -> chèn tất định từ trường thu_lai (0 API), giữ đúng số cảnh của bước', () => {
  const kb = kbThieuTL();
  const sua = ctx.chotThuLaiTuSchema_(kb);
  assert.equal(sua.length, 1);
  assert.equal(kb.canh.length, 5);
  assert.equal(kb.canh[3].loai, 'thu_lai');
  assert.equal(kb.canh[4].loai, 'ket_luan');
  assert.equal(kb.canh[4].so, 5);
  assert.deepEqual(J(kb.khung4tang.buoc.map((b) => b.canh)), [1, 2, 3, 5]);
  const q = ctx.kiemTraQuyTrinh_(kb, '');
  assert.ok(!q.nang.some((x) => /^THU_LAI_HINH_THUC|THIEU_PHAN_QUY_TRINH: thiếu phần THỬ LẠI/.test(x)), q.nang.join(' | '));
});
t('chotThuLaiTuSchema_: đã có cảnh thử lại / khong_thu_lai / thu_lai không có số -> không đụng', () => {
  const a = kbThieuTL(); a.canh[2].loai = 'thu_lai';
  assert.equal(ctx.chotThuLaiTuSchema_(a).length, 0);
  const b = kbThieuTL(); b.khong_thu_lai = 'bài chứng minh thuần không có giá trị số để thế lại';
  assert.equal(ctx.chotThuLaiTuSchema_(b).length, 0);
  const c = kbThieuTL(); c.thu_lai = {phep_thu: 'đúng', loi_doc: 'đúng rồi'};
  assert.equal(ctx.chotThuLaiTuSchema_(c).length, 0);
});

console.log('3. Hình học: hạ cánh mềm + chuẩn hóa tại biên + trần sửa = 1');
const PD_TIA = [
  {id: 'd1', loai: 'duong_tron', tam: 'O'}, {id: 'd2', loai: 'diem_tren', ten: 'A', tren: '(O)'}, {id: 'd3', loai: 'diem_tren', ten: 'B', tren: '(O)'},
  {id: 'd4', loai: 'diem_tren', ten: 'M', tren: '(O)'}, {id: 'd5', loai: 'tiep_tuyen', tai: 'A', duong_tron: '(O)', ten_duong: 'Ax'},
  {id: 'd6', loai: 'giao_diem', ten: 'C', a: 'Ax', b: 'BM'}];
t('"Ax" sau tiếp tuyến tại A -> hợp lệ (không còn HP_DUNG_LOI "cần đúng 2 điểm")', () => {
  assert.equal(ctx.kiemThuTuPhepDungHinhPhang_(J(PD_TIA)), '');
  const khongTen = J(PD_TIA); delete khongTen[4].ten_duong;
  assert.equal(ctx.kiemThuTuPhepDungHinhPhang_(khongTen), '', 'suy theo điểm gốc A');
});
t('"Ax" không gắn với đường nào -> báo lỗi TƯỜNG MINH ngay vòng tĩnh 0-API (gợi ý 2 điểm chữ hoa)', () => {
  const pd = J(PD_TIA); pd.splice(4, 1);
  const loi = ctx.kiemThuTuPhepDungHinhPhang_(pd);
  assert.match(loi, /^HP_DUNG_LOI: phép dựng 5\/d6: ký hiệu tia "Ax" chưa gắn với đường nào/);
  assert.match(loi, /2 điểm chữ hoa/);
});
t('prompt hình phẳng nêu luật tên đường 2 điểm chữ hoa, cấm "Ax"/"By"', () => {
  assert.match(ctx.huongDanHinhPhangChuan_({lop: '9', de_bai: 'x'}), /KHÔNG dùng ký hiệu tia 1 chữ hoa \+ 1 chữ thường như "Ax", "By"/);
});
t('moc_xoay sai tên (CAM_MAT_MOC) -> tự sửa về toan_canh, kiemKhongGian_ không còn lỗi cứng camera', () => {
  const KB = JSON.parse(doc('mau/v97/giao_diem_mnp.json'));
  const kb = J(KB);
  kb.hinh_khong_gian.buoc[2].xoay[0].moc_xoay = 'câu hoàn toàn không có trong lời';
  const sua = ctx.tuSuaKhongGian_(kb, {});
  assert.ok(sua.some((x) => /toan_canh dự phòng/.test(x)));
  assert.equal(kb.hinh_khong_gian.buoc[2].xoay[0].goc_nhin, 'toan_canh');
  ctx.kiemKhongGianMay_ = undefined;
  const k = ctx.kiemKhongGian_(kb);
  assert.ok(!k.nang.some((x) => /^CAM_/.test(x)), k.nang.join(' | '));
});
t('trần sửa thống nhất = 1 cho MỌI mảng; không còn vòng "3 lần" ở cổng lọc sớm / chốt hình học / cửa AI', () => {
  assert.equal(vm.runInContext('TRAN_SUA_BP2', ctx), 1);
  assert.equal(vm.runInContext('TRAN_SUA_BP3', ctx), 1);
  const src = doc('BoPhan1.gs');
  assert.ok(!/maxLoiPF|maxLoiHH|maxLoiKB/.test(src), 'còn biến trần cũ MAX_LAN_LOI ở BP2');
});
t('xuLyLoiHang_: KICH_BAN_KHONG_HOP_LE dừng NGAY ở lượt 1 (LOI_CAN_XEM), không chờ tới lượt 3', () => {
  const ghiDong = [];
  const cu = {ghi_: ctx.ghi_, cauHinh_: ctx.cauHinh_, xoaNhapKichBan_: ctx.xoaNhapKichBan_, laUuTien_: ctx.laUuTien_};
  Object.assign(ctx, {ghi_: (sh, row, f) => ghiDong.push(f), cauHinh_: (k) => (k === 'MAX_LAN_LOI' ? '3' : ''), xoaNhapKichBan_: () => {}, laUuTien_: () => false});
  const bc = {loi: 0};
  ctx.xuLyLoiHang_({}, {id: 'HH1', _row: 2, so_lan_loi: 1}, new Error('KICH_BAN_KHONG_HOP_LE: HP_DUNG_LOI: phép dựng 9/d9: "Ax" cần đúng 2 điểm'), bc);
  Object.assign(ctx, cu);
  assert.equal(ghiDong[0].trang_thai, 'LOI_CAN_XEM');
  assert.match(ghiDong[0].ghi_chu, /sửa 1 lần vẫn lỗi/);
});

console.log('4. Cầu dao ngắt mạch BP2');
const T0 = new Date('2026-11-28T01:00:00Z');   // 08:00 giờ VN
const reset = () => { for (const k of Object.keys(props)) delete props[k]; zalo.length = 0; };
t('4 bài trượt liên tiếp -> chưa ngắt; bài thứ 5 -> ngắt 3 giờ + đúng 1 tin Zalo', () => {
  reset();
  for (let i = 0; i < 4; i++) ctx.ghiKetQuaBP2CauDao_(false, 'BO_KHONG_DAT ' + i, T0);
  assert.equal(ctx.lyDoCauDaoBP2_({tyLe: 0.6}, T0, true), '');
  ctx.ghiKetQuaBP2CauDao_(false, 'BO_KHONG_DAT 5', T0);
  const ly = ctx.lyDoCauDaoBP2_({tyLe: 0.6}, T0, true);
  assert.match(ly, /cầu dao BP2 ngắt tới 11:00/);
  assert.equal(zalo.length, 1);
  ctx.ghiKetQuaBP2CauDao_(false, 'BO_KHONG_DAT 6', T0);
  ctx.lyDoCauDaoBP2_({tyLe: 0.6}, new Date(T0.getTime() + 3600e3), true);
  assert.equal(zalo.length, 1, 'không spam Zalo');
});
t('hết 3 giờ -> tự mở lại, bộ đếm trượt về 0', () => {
  assert.equal(ctx.lyDoCauDaoBP2_({tyLe: 0.6}, new Date(T0.getTime() + 3 * 3600e3 + 1000), true), '');
  assert.equal(ctx.docCauDaoBP2_().truot, 0);
});
t('có 1 bài BP2 đậu -> reset bộ đếm trượt liên tiếp về 0', () => {
  reset();
  for (let i = 0; i < 4; i++) ctx.ghiKetQuaBP2CauDao_(false, 'x', T0);
  assert.equal(ctx.docCauDaoBP2_().truot, 4);
  ctx.ghiKetQuaBP2CauDao_(true, '', T0);
  assert.equal(ctx.docCauDaoBP2_().truot, 0);
  for (let i = 0; i < 4; i++) ctx.ghiKetQuaBP2CauDao_(false, 'x', T0);
  assert.equal(ctx.lyDoCauDaoBP2_({tyLe: 0.6}, T0, true), '', '4 trượt sau khi reset: chưa ngắt');
});
t('quỹ key < 20 % -> ngắt (1 tin Zalo); key hồi >= 25 % -> tự mở sớm', () => {
  reset();
  assert.match(ctx.lyDoCauDaoBP2_({tyLe: 0.15}, T0, true), /quỹ key Gemini còn 15%/);
  assert.equal(zalo.length, 1);
  assert.notEqual(ctx.lyDoCauDaoBP2_({tyLe: 0.22}, new Date(T0.getTime() + 600e3), true), '', '22 % chưa đủ mở');
  assert.equal(ctx.lyDoCauDaoBP2_({tyLe: 0.3}, new Date(T0.getTime() + 1200e3), true), '');
  assert.equal(zalo.length, 1);
});
t('/trangthai (ghi=false) chỉ xem, không tự ngắt / không gửi Zalo', () => {
  reset();
  assert.match(ctx.lyDoCauDaoBP2_({tyLe: 0.1}, T0, false), /quỹ key 10%/);
  assert.equal(zalo.length, 0);
  assert.equal(ctx.docCauDaoBP2_().ngat_den, 0);
});
t('sang ngày mới (giờ VN) -> tự mở lại', () => {
  reset();
  for (let i = 0; i < 5; i++) ctx.ghiKetQuaBP2CauDao_(false, 'x', new Date('2026-11-28T16:30:00Z'));   // 23:30 VN
  assert.notEqual(ctx.lyDoCauDaoBP2_({tyLe: 0.6}, new Date('2026-11-28T16:40:00Z'), true), '');
  assert.equal(ctx.lyDoCauDaoBP2_({tyLe: 0.6}, new Date('2026-11-28T17:05:00Z'), true), '');   // 00:05 VN hôm sau
});
t('/mobp2 mở cầu dao ngay + reset bộ đếm; lệnh Zalo đã đăng ký', () => {
  reset();
  for (let i = 0; i < 5; i++) ctx.ghiKetQuaBP2CauDao_(false, 'x', new Date());
  assert.notEqual(ctx.lyDoCauDaoBP2_({tyLe: 0.6}, new Date(), true), '');
  assert.match(ctx.moCauDaoBP2_(), /Đã mở lại cầu dao BP2/);
  assert.equal(ctx.lyDoCauDaoBP2_({tyLe: 0.6}, new Date(), true), '');
  assert.match(doc('ZaloDeBai.gs'), /lenh === '\/mobp2'/);
});
t('chỉ dùng 1 khóa Script Properties (BP2_CAU_DAO) cho cầu dao', () => {
  reset();
  for (let i = 0; i < 5; i++) ctx.ghiKetQuaBP2CauDao_(false, 'x', T0);
  ctx.lyDoCauDaoBP2_({tyLe: 0.1}, T0, true);
  assert.deepEqual(Object.keys(props), ['BP2_CAU_DAO']);
});
t('buocBoNao_ chặn BP2 khi cầu dao ngắt; BP4 / BP5 không bị cầu dao chặn', () => {
  const src = doc('BoNaoDieuPhoi.gs');
  assert.match(src, /if \(bp === 2 && !lyDo && ds\.length\) lyDo = lyDoCauDaoBP2_\(/);
  assert.ok(!/bp === [45] && [^\n]*lyDoCauDaoBP2_/.test(src));
});
t('webhook GitHub BP2 ghi kết quả vào cầu dao (đậu -> reset, BO_KHONG_DAT / LOI_CAN_XEM -> +1)', () => {
  const src = doc('BoPhan1.gs');
  assert.match(src, /if \(d\.kich_ban && f\.trang_thai === 'CO_KICH_BAN'\) ghiKetQuaBP2CauDao_\(true, ''\);/);
  assert.match(src, /\['XOA', 'LOI_CAN_XEM', 'LOI', 'LOAI'\]\.indexOf\(f\.trang_thai\) >= 0\) ghiKetQuaBP2CauDao_\(false/);
});

console.log('\ntest_kien_truc_bp2: ' + dat + ' đạt, ' + hong.length + ' hỏng');
if (hong.length) { console.log('Hỏng: ' + hong.join(' | ')); process.exit(1); }
