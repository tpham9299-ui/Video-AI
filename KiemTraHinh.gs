/**
 * KIỂM TRA HÌNH MINH HỌA TRONG KỊCH BẢN (dán thành tệp KiemTraHinh.gs, cùng dự án với Code.gs)
 * Mục đích: bắt kịch bản mà phần mô tả hình minh họa thiếu/sai dạng NGAY khi viết, rồi buộc Gemini viết lại,
 * thay vì để bộ phận dựng video phải thay bằng "thẻ mô tả" nhàm chán.
 * Quy tắc phải khớp với src/bocuc.ts và src/sankhau/dulieu.ts của bộ phận dựng video.
 * Bản này thêm: kiểm tra "san_khau" (vật thật + hành động), tiêu đề cảnh, và tuSuaKichBan_() tự sửa lỗi vặt để đỡ gọi lại Gemini.
 */

var LOAI_VAT_ = ['nguoi', 'the', 'the_bai', 'xuc_xac', 'dong_xu', 'hop_bi', 'tui', 'hop_qua', 'dong_ho', 'dien_thoai', 'bong_bay',
  'dong_ho_do', 'bieu_do_cot', 'thanh', 'vong_quay', 'cua', 'banh', 'nhan', 'chu', 'so_dem', 'mui_ten', 'bieu_tuong', 'luoi_o', 'danh_sach',
  'khoi_hop', 'tru', 'non', 'cau', 'toa_nha', 'xe', 'cay', 'thang', 'hinh_hoc', 'do_thi', 'hinh_tu_do'];
var VAT_3D_ = ['khoi_hop', 'tru', 'non', 'cau', 'toa_nha', 'xe', 'cay', 'thang', 'xuc_xac', 'hop_bi', 'hop_qua', 'cua'];   // vật 3D thật (cảnh đời thực)
var VAT_MO_HINH_ = ['hinh_hoc', 'do_thi', 'hinh_tu_do'];
var TU_VAT_3D_ = {
  khoi_hop: /hộp|bể|thùng|phòng|khối|lăng trụ|container|tủ/, tru: /trụ|lon|cốc|bồn|ống nước|bình|thùng phi|cột tròn/, non: /nón|phễu|chóp nón/,
  cau: /cầu|quả bóng|bóng/, toa_nha: /nhà|tòa|tháp|cột|building/, thang: /thang/, xe: /xe|ô tô|tàu/, cay: /cây/
};
var KIEU_NET_ = ['da_giac', 'duong', 'mui_ten', 'tron', 'cung', 'chu', 'svg', 'da_giac_deu', 'koch', 'sierpinski', 'tham_so', 'lap', 'xep_chong'];
var KIEU_HANH_DONG_ = ['chon', 'loai_bo', 'sang', 'rung', 'quay', 'mo', 'lay_ra', 'dat_gia_tri', 'bung_ra', 'di_chuyen', 'phong_to', 'thu_nho', 'an', 'doi_chu', 'goc_3d', 'bien_hinh', 'tach', 'ghep', 'dem_tang'];
var VAT_PHU_ = ['nhan', 'chu', 'mui_ten', 'bieu_tuong', 'so_dem'];   // vật phụ trợ (chữ, nhãn): không tính là "vật thật"

// Kiểm tra sân khấu của một cảnh. idCu: id các vật đang có trên sân khấu từ cảnh trước (khi giu_san_khau). Trả '' nếu hợp lệ.
function kiemTraSanKhau_(du, cn, idCu) {
  if (!laDT_(du) || !Array.isArray(du.vat) || !du.vat.length) return 'HINH_' + cn + ': san_khau cần du_lieu.vat là mảng 1-16 vật {id, loai, x, y, buoc...}.';
  if (du.vat.length > 16) return 'HINH_' + cn + ': tối đa 16 vật mỗi cảnh (nên 1-5).';
  var ids = {}, coVatThat = !!(idCu && Object.keys(idCu).length);
  for (var i = 0; i < du.vat.length; i++) {
    var v = du.vat[i], ev = cn + ', vat[' + i + ']';
    if (!laDT_(v) || LOAI_VAT_.indexOf(v.loai) < 0) return 'HINH_' + ev + ': "loai" phải thuộc: ' + LOAI_VAT_.join(', ') + '.';
    if (!laChuoi_(v.id)) return 'HINH_' + ev + ': mỗi vật cần "id" (chuỗi ngắn, duy nhất).';
    if (ids[v.id]) return 'HINH_' + ev + ': id "' + v.id + '" bị trùng.';
    ids[v.id] = v;
    if (v.loai !== 'mui_ten' && (!laSo_(v.x) || !laSo_(v.y) || v.x < 0 || v.x > 100 || v.y < 0 || v.y > 100)) return 'HINH_' + ev + ': ' + v.loai + ' cần x, y là số 0-100 (tâm vật).';
    if ((v.loai === 'nhan' || v.loai === 'chu') && !laChuoi_(v.noi_dung)) return 'HINH_' + ev + ': "' + v.loai + '" cần "noi_dung".';
    if (v.loai === 'bieu_tuong' && !laChuoi_(v.emoji)) return 'HINH_' + ev + ': "bieu_tuong" cần "emoji".';
    if (v.loai === 'bieu_do_cot' && (!Array.isArray(v.ds_so) || !v.ds_so.length || v.ds_so.some(function (x) { return !(Number(x) >= 0); }))) return 'HINH_' + ev + ': bieu_do_cot cần "ds_so" là mảng số không âm (và "ds" là nhãn cột).';
    if (v.loai === 'vong_quay' && (!Array.isArray(v.ds) || v.ds.length < 2 || v.ds.length > 12)) return 'HINH_' + ev + ': vong_quay cần "ds" là 2-12 nhãn ô.';
    if ((v.loai === 'dong_ho_do' || v.loai === 'thanh') && v.gia_tri !== undefined && !(Number(v.gia_tri) >= 0 && Number(v.gia_tri) <= 1)) return 'HINH_' + ev + ': "gia_tri" của ' + v.loai + ' là xác suất 0-1 (ví dụ 0.4643); ghi phân số vào "gia_tri_chu".';
    if (v.loai === 'danh_sach' && (!Array.isArray(v.ds) || v.ds.length < 1 || v.ds.length > 6)) return 'HINH_' + ev + ': danh_sach cần "ds" là 1-6 dòng ngắn.';
    if (v.loai === 'luoi_o' && v.so_luong !== undefined && !(Number(v.so_luong) >= 1 && Number(v.so_luong) <= 64)) return 'HINH_' + ev + ': luoi_o có tối đa 64 ô ("so_luong").';
    if ((v.loai === 'hop_bi' || v.loai === 'tui') && (!Array.isArray(v.nhom) || !v.nhom.length)) return 'HINH_' + ev + ': ' + v.loai + ' cần "nhom" là mảng {mau, so}.';
    var loiVat = kiemTraVatThucTe_(v, ev);
    if (loiVat) return loiVat;
    if (VAT_PHU_.indexOf(v.loai) < 0) coVatThat = true;
  }
  for (var j = 0; j < du.vat.length; j++) {
    var m = du.vat[j];
    if (m.loai === 'mui_ten' && ((m.tu && !ids[m.tu] && !(idCu && idCu[m.tu])) || (m.den && !ids[m.den] && !(idCu && idCu[m.den])))) return 'HINH_' + cn + ': mũi tên "' + m.id + '" nối tới id không có trên sân khấu.';
  }
  if (!coVatThat) return 'HINH_QUA_DON_GIAN_' + cn + ': sân khấu chỉ có chữ/nhãn/emoji. Hãy dùng vật thật (nguoi, the, hop_bi, xuc_xac, vong_quay, dong_ho_do...) diễn tả tình huống.';
  var hd = du.hanh_dong || [];
  if (!Array.isArray(hd)) return 'HINH_' + cn + ': "hanh_dong" phải là mảng.';
  for (var k = 0; k < hd.length; k++) {
    var h = hd[k];
    if (!laDT_(h) || KIEU_HANH_DONG_.indexOf(h.kieu) < 0) return 'HINH_' + cn + ', hanh_dong[' + k + ']: "kieu" phải thuộc: ' + KIEU_HANH_DONG_.join(', ') + '.';
    if (h.kieu === 'dat_gia_tri' && h.gia_tri !== undefined && !laSo_(Number(h.gia_tri))) return 'HINH_' + cn + ', hanh_dong[' + k + ']: "gia_tri" của dat_gia_tri phải là số.';
    if (h.kieu !== 'thu_nho' && h.kieu !== 'phong_to' && h.kieu !== 'goc_3d' && !ids[h.vat] && !(idCu && idCu[h.vat])) return 'HINH_' + cn + ', hanh_dong[' + k + ']: "vat" = "' + h.vat + '" không phải id của vật nào trên sân khấu.';
  }
  if (!hd.length && !(idCu && Object.keys(idCu).length)) return 'HINH_IT_CHUYEN_DONG_' + cn + ': mỗi cảnh san_khau cần ít nhất 1 hành động (chon, quay, mo, lay_ra, rung, bung_ra, phong_to...) ăn khớp lời thoại.';
  return '';
}

// Tự sửa lỗi vặt (không đổi nội dung bài): kẹp tọa độ, bỏ từ khóa không khớp tiêu đề, bỏ vật/hành động lạ, cắt chú thích dài.
function tuSuaKichBan_(kb, ctx) {
  if (!kb || !Array.isArray(kb.canh)) return [];
  kb.canh = kb.canh.filter(laDT_);
  var loaiTheoId = {};   // id vật -> loại (giữ qua các cảnh giu_san_khau)
  if (Array.isArray(kb.du_kien)) kb.du_kien = kb.du_kien.map(function (x) { return String(x).replace(/\s+/g, ' ').trim().slice(0, 30); }).filter(Boolean).slice(0, 4);
  else delete kb.du_kien;
  kb.canh.forEach(function (c, i) {
    if (!c) return;
    if (c.tieu_de_canh) c.tieu_de_canh = String(c.tieu_de_canh).replace(/\s+/g, ' ').trim().slice(0, 60);
    if (c.tu_khoa && (!c.tieu_de_canh || String(c.tieu_de_canh).toLowerCase().indexOf(String(c.tu_khoa).toLowerCase()) < 0)) c.tu_khoa = '';
    if (i === 0) c.giu_san_khau = false;
    if (Array.isArray(kb.bai_hoc_rut_ra)) kb.bai_hoc_rut_ra = kb.bai_hoc_rut_ra.slice(0, 3).map(function (x) { return String(x).slice(0, 90); });
    if (c.chuyen_canh && ['mo', 'truot_len', 'phong', 'luot_ngang', 'truot_xuong', 'lat_3d'].indexOf(c.chuyen_canh) < 0) delete c.chuyen_canh;
    if (c.giong_doc) c.giong_doc = String(c.giong_doc).replace(/\s+/g, ' ').trim().slice(0, 120);
    // bỏ lời mở máy móc "Cảnh 3:", "Bước 2:" ở đầu lời thoại (nhãn bước đã hiện trên màn hình)
    if (i > 0 && c.loi_thoai) {
      var gon = String(c.loi_thoai).replace(/^\s*(cảnh\s+\d+|bước\s+(\d+|một|hai|ba|bốn|năm))\s*[:.,-]\s*/i, '');
      if (gon.length >= 15) c.loi_thoai = gon.charAt(0).toUpperCase() + gon.slice(1);
    }
    if (Array.isArray(c.chu_thich)) c.chu_thich = c.chu_thich.slice(0, 3).map(function (x) { return String(x).slice(0, 60); });
    var mh = c.minh_hoa;
    if (!laDT_(mh) || mh.loai !== 'san_khau' || !laDT_(mh.du_lieu)) return;
    var du = mh.du_lieu;
    if (Array.isArray(du.vat)) {
      du.vat = du.vat.map(function (v) { return laDT_(v) ? doiTenVat_(v) : v; }).filter(function (v) { return laDT_(v) && LOAI_VAT_.indexOf(v.loai) >= 0; });
      du.vat.forEach(function (v, k) {
        if (!laChuoi_(v.id)) v.id = 'v' + (i + 1) + '_' + k;
        ['x', 'y', 'x2', 'y2'].forEach(function (t) { if (v[t] !== undefined && laSo_(Number(v[t]))) v[t] = Math.min(98, Math.max(2, Number(v[t]))); });
        if ((v.loai === 'dong_ho_do' || v.loai === 'thanh' || v.loai === 'bong_bay') && Number(v.gia_tri) > 1 && Number(v.gia_tri) <= 100) v.gia_tri = Number(v.gia_tri) / 100;
        if (v.muc_nuoc !== undefined && Number(v.muc_nuoc) > 1 && Number(v.muc_nuoc) <= 100) v.muc_nuoc = Number(v.muc_nuoc) / 100;
        if (v.loai === 'do_thi' && typeof v.ham === 'string') v.ham = v.ham.replace(/^\s*[a-zA-Z]\s*\(\s*x\s*\)\s*=\s*|^\s*y\s*=\s*/, '').replace(/\\cdot|\\times/g, '*').replace(/[{}]/g, function (c) { return c === '{' ? '(' : ')'; });
        loaiTheoId[v.id] = v.loai;
      });
    }
    if (Array.isArray(du.hanh_dong)) {
      du.hanh_dong.forEach(function (h) { if (laDT_(h) && BI_DANH_HANH_DONG_[h.kieu]) h.kieu = BI_DANH_HANH_DONG_[h.kieu]; });
      du.hanh_dong = du.hanh_dong.filter(function (h) { return laDT_(h) && KIEU_HANH_DONG_.indexOf(h.kieu) >= 0; });
      du.hanh_dong.forEach(function (h) {
        var lv = loaiTheoId[h.vat];
        // mực nước / xác suất ghi theo phần trăm -> đổi về 0-1
        if (h.kieu === 'dat_gia_tri' && ['khoi_hop', 'tru', 'non', 'dong_ho_do', 'thanh', 'bong_bay'].indexOf(lv) >= 0 && Number(h.gia_tri) > 1 && Number(h.gia_tri) <= 100) h.gia_tri = Number(h.gia_tri) / 100;
      });
    }
  });
  return tuSuaSau_(kb, ctx);
}

var KIEU_HINH_VE_ = ['tron', 'chu_nhat', 'chu', 'mui_ten', 'duong', 'bi', 'xuc_xac', 'the_bai', 'dong_xu', 'bieu_tuong', 'luoi', 'truc_so'];

function laSo_(v) { return typeof v === 'number' && isFinite(v); }
function laChuoi_(v) { return typeof v === 'string' && v.trim() !== ''; }
function laDT_(v) { return v && typeof v === 'object' && !Array.isArray(v); }

// Trả về '' nếu hợp lệ, hoặc câu mô tả lỗi (dùng làm lời nhắc sửa cho Gemini).
function kiemTraMinhHoa_(mh, so, idCu) {
  var cn = 'CANH_' + so;
  if (!laDT_(mh)) return 'THIEU_MINH_HOA_' + cn + ': mỗi cảnh phải có đối tượng "minh_hoa".';
  var loai = String(mh.loai || '');
  if (loai === '' || loai === 'khong') return '';
  var du = mh.du_lieu;
  if (loai === 'san_khau') return kiemTraSanKhau_(du, cn, idCu);
  if (!laDT_(du)) return 'HINH_' + cn + ': minh_hoa.loai là "' + loai + '" nhưng "du_lieu" là null/thiếu. Phải có du_lieu đúng dạng, hoặc đổi loai thành "khong".';

  if (loai === 'so_do_cay') {
    if (!Array.isArray(du.nhanh) || !du.nhanh.length) return 'HINH_' + cn + ': so_do_cay cần "nhanh" là mảng có ít nhất 1 nhánh {nhan, xs}.';
    for (var i = 0; i < du.nhanh.length; i++) if (!laDT_(du.nhanh[i]) || !laChuoi_(du.nhanh[i].nhan)) return 'HINH_' + cn + ': mỗi nhánh của so_do_cay phải có "nhan" là chuỗi.';
    return '';
  }
  if (loai === 'bang') {
    if (!Array.isArray(du.cot) || !du.cot.length || !Array.isArray(du.hang) || !du.hang.length) return 'HINH_' + cn + ': bang cần "cot" (mảng tiêu đề) và "hang" (mảng các hàng, mỗi hàng là mảng ô).';
    for (var h = 0; h < du.hang.length; h++) if (!Array.isArray(du.hang[h])) return 'HINH_' + cn + ': mỗi phần tử của "hang" phải là một mảng ô.';
    return '';
  }
  if (loai === 'venn') {
    if (!laChuoi_(du.A) || !laChuoi_(du.B)) return 'HINH_' + cn + ': venn cần "A" và "B" là chuỗi tên hai tập hợp.';
    if (du.dem !== undefined) {
      if (!laDT_(du.dem)) return 'HINH_' + cn + ': "dem" của venn là đối tượng {chiA, giao, chiB, ngoai} số phần tử mỗi vùng (0-36).';
      var vv = ['chiA', 'giao', 'chiB', 'ngoai'];
      for (var z = 0; z < vv.length; z++) if (du.dem[vv[z]] !== undefined && !(Number(du.dem[vv[z]]) >= 0 && Number(du.dem[vv[z]]) <= 36)) return 'HINH_' + cn + ': số phần tử mỗi vùng của venn tối đa 36.';
    }
    return '';
  }
  if (loai === 'bi_hop') {
    if (!Array.isArray(du.nhom) || !du.nhom.length) return 'HINH_' + cn + ': bi_hop cần "nhom" là mảng {ten, so}.';
    for (var g = 0; g < du.nhom.length; g++) {
      var n = du.nhom[g];
      if (!laDT_(n) || !laChuoi_(n.ten) || !laSo_(Number(n.so)) || Number(n.so) < 1 || Number(n.so) > 60) return 'HINH_' + cn + ': mỗi nhóm bi cần "ten" (chuỗi) và "so" (số nguyên 1-60).';
    }
    return '';
  }
  if (loai === 'luoi_mau') {
    if (!Array.isArray(du.hang_nhan) || !du.hang_nhan.length || du.hang_nhan.length > 8 || !Array.isArray(du.cot_nhan) || !du.cot_nhan.length || du.cot_nhan.length > 8) return 'HINH_' + cn + ': luoi_mau cần "hang_nhan" và "cot_nhan" là mảng 1-8 chuỗi (ví dụ ["1","2","3","4","5","6"]).';
    if (du.su_kien !== undefined) {
      if (!Array.isArray(du.su_kien) || du.su_kien.length > 3) return 'HINH_' + cn + ': "su_kien" của luoi_mau là mảng tối đa 3 sự kiện {ten, mau, o:[[hàng,cột],...], xs}.';
      for (var q = 0; q < du.su_kien.length; q++) {
        var sk = du.su_kien[q];
        if (!laDT_(sk) || !laChuoi_(sk.ten) || !Array.isArray(sk.o) || !sk.o.length) return 'HINH_' + cn + ': mỗi sự kiện của luoi_mau cần "ten" (ký hiệu ngắn như A) và "o" là mảng các cặp [hàng,cột] tính từ 1.';
        for (var w = 0; w < sk.o.length; w++) {
          var oc = sk.o[w];
          if (!Array.isArray(oc) || oc.length < 2 || !(oc[0] >= 1 && oc[0] <= du.hang_nhan.length) || !(oc[1] >= 1 && oc[1] <= du.cot_nhan.length)) return 'HINH_' + cn + ': ô [' + String(oc) + '] của luoi_mau nằm ngoài lưới (hàng 1-' + du.hang_nhan.length + ', cột 1-' + du.cot_nhan.length + ').';
        }
      }
    }
    return '';
  }
  if (loai === 'dien_tich') {
    if (!Array.isArray(du.cot) || !du.cot.length || du.cot.length > 4) return 'HINH_' + cn + ': dien_tich cần "cot" là mảng 1-4 cột {nhan, xs, gia_tri, mau, hang:[...]}.';
    for (var c2 = 0; c2 < du.cot.length; c2++) {
      var cc = du.cot[c2];
      if (!laDT_(cc) || !laChuoi_(cc.nhan) || !Array.isArray(cc.hang) || !cc.hang.length || cc.hang.length > 4) return 'HINH_' + cn + ': mỗi cột của dien_tich cần "nhan" và "hang" là mảng 1-4 ô {nhan, xs, gia_tri, mau, kq, to}.';
      if (cc.gia_tri !== undefined && !(Number(cc.gia_tri) > 0)) return 'HINH_' + cn + ': "gia_tri" của cột dien_tich phải là số dương (xác suất, ví dụ 0.625).';
      for (var h2 = 0; h2 < cc.hang.length; h2++) {
        if (!laDT_(cc.hang[h2]) || !laChuoi_(cc.hang[h2].nhan)) return 'HINH_' + cn + ': mỗi ô của dien_tich cần "nhan".';
        if (cc.hang[h2].gia_tri !== undefined && !(Number(cc.hang[h2].gia_tri) > 0)) return 'HINH_' + cn + ': "gia_tri" của ô dien_tich phải là số dương (xác suất có điều kiện).';
      }
    }
    return '';
  }
  if (loai === 'thuc_nghiem') {
    if (!(Number(du.p) > 0 && Number(du.p) < 1)) return 'HINH_' + cn + ': thuc_nghiem cần "p" là xác suất lý thuyết trong khoảng (0,1), ví dụ 0.4643.';
    if (du.n !== undefined && !(Number(du.n) >= 20 && Number(du.n) <= 1000)) return 'HINH_' + cn + ': "n" của thuc_nghiem là số lần thử từ 20 đến 1000.';
    return '';
  }
  // Mọi loại còn lại (xuc_xac, the_bai, luoi, day_so, khac...) phải dùng danh sách "phan_tu" (hình vẽ tự do).
  if (!Array.isArray(du.phan_tu) || !du.phan_tu.length) return 'HINH_' + cn + ': loại "' + loai + '" phải có du_lieu.phan_tu là mảng các phần tử hình vẽ.';
  if (du.phan_tu.length > 40) return 'HINH_' + cn + ': tối đa 40 phần tử hình vẽ mỗi cảnh.';
  for (var k = 0; k < du.phan_tu.length; k++) {
    var e = du.phan_tu[k];
    var ev = cn + ', phan_tu[' + k + ']';
    if (!laDT_(e) || KIEU_HINH_VE_.indexOf(e.kieu) < 0) return 'HINH_' + ev + ': "kieu" phải thuộc: ' + KIEU_HINH_VE_.join(', ') + '.';
    if (e.kieu === 'mui_ten' || e.kieu === 'duong') {
      if (!laSo_(e.x1) || !laSo_(e.y1) || !laSo_(e.x2) || !laSo_(e.y2)) return 'HINH_' + ev + ': ' + e.kieu + ' cần các số x1, y1, x2, y2 (0-100).';
    } else {
      if (!laSo_(e.x) || !laSo_(e.y) || e.x < 0 || e.x > 100 || e.y < 0 || e.y > 100) return 'HINH_' + ev + ': ' + e.kieu + ' cần x, y là số trong 0-100.';
    }
    if (e.kieu === 'chu' && !laChuoi_(e.noi_dung)) return 'HINH_' + ev + ': "chu" cần "noi_dung".';
    if (e.kieu === 'bieu_tuong' && !laChuoi_(e.emoji)) return 'HINH_' + ev + ': "bieu_tuong" cần "emoji".';
    if (e.kieu === 'xuc_xac' && !(Number(e.mat) >= 1 && Number(e.mat) <= 6)) return 'HINH_' + ev + ': "xuc_xac" cần "mat" từ 1 đến 6.';
    if (e.kieu === 'luoi' && !(Number(e.hang) >= 1 && Number(e.cot) >= 1)) return 'HINH_' + ev + ': "luoi" cần "hang" và "cot".';
    if (e.kieu === 'truc_so' && !(laSo_(e.tu) && laSo_(e.den) && e.den > e.tu)) return 'HINH_' + ev + ': "truc_so" cần "tu" < "den" (số).';
  }
  return '';
}

var HOOK_KIEU_ = ['sai_lam', 'thach_thuc', 'bat_ngo', 'ket_qua_truoc', 'cau_hoi'];
var CAM_XUC_ = ['ngac_nhien', 'nghi', 'boi_roi', 'y_tuong', 'thao_tac', 'vui', 'tu_tin'];

function demTu_(t) { return String(t || '').trim().split(/\s+/).filter(Boolean).length; }

// Kiểm tra hook ở 5 giây đầu và cảm xúc nhân vật. Trả '' nếu hợp lệ.
function kiemTraHook_(kb) {
  var c1 = kb.canh[0];
  var tu = demTu_(kb.hook_chu);
  if (tu < 3 || tu > 12) return 'HOOK_CHU_SAI: "hook_chu" phải có 3-12 từ (hiện ' + tu + '): đúng câu hook viết ngắn để in chữ lớn lên màn hình.';
  if (HOOK_KIEU_.indexOf(kb.hook_kieu) < 0) return 'HOOK_KIEU_SAI: "hook_kieu" phải thuộc: ' + HOOK_KIEU_.join(', ') + '.';
  if (!Array.isArray(kb.nhan_manh) || !kb.nhan_manh.length || kb.nhan_manh.length > 3) return 'NHAN_MANH_SAI: "nhan_manh" là mảng 1-3 cụm từ nằm nguyên văn trong hook_chu.';
  for (var i = 0; i < kb.nhan_manh.length; i++) {
    if (String(kb.hook_chu).toLowerCase().indexOf(String(kb.nhan_manh[i]).toLowerCase()) < 0) return 'NHAN_MANH_SAI: cụm "' + kb.nhan_manh[i] + '" không nằm nguyên văn trong hook_chu.';
  }
  if (!Array.isArray(kb.hook_ung_vien) || kb.hook_ung_vien.length < 3) return 'THIEU_HOOK_UNG_VIEN: cần "hook_ung_vien" gồm 3 phương án hook.';
  if (demTu_(c1.loi_thoai) > 18) return 'HOOK_QUA_DAI: lời thoại cảnh 1 có ' + demTu_(c1.loi_thoai) + ' từ, phải tối đa 16 từ để đọc trong 5 giây.';
  var choChao = typeof cauHinh_ === 'function' && cauHinh_('KIEU_MO_DAU') === 'chao_hook';
  var loiDau = String(c1.loi_thoai || '');
  if (choChao) loiDau = loiDau.replace(/^\s*(xin\s+)?chào\s+(bạn|cả nhà)\s*[!,.]?\s*/i, '');   // cho phép "Chào bạn!" rồi vào hook ngay
  if (/^\s*(các bạn|mọi người|hôm nay|xin chào|chào|hello|hi\b)/i.test(loiDau) || /^\s*(các bạn|mọi người|hôm nay)/i.test(kb.hook_chu)) return 'HOOK_YEU: hook không được mở bằng lời chào hay "hôm nay", "các bạn", "mọi người". Hãy mở bằng mâu thuẫn, tình huống hoặc câu hỏi cụ thể.';
  if (/\d+\s*%/.test(kb.hook_chu + ' ' + c1.loi_thoai)) return 'HOOK_BIA_SO_LIEU: không bịa số liệu thống kê (ví dụ "90% học sinh sai"); dùng "rất nhiều bạn", "dễ sai".';
  return '';
}


/* ===================== ĐÁP ÁN, NỘI DUNG LẠ, Ý ĐỒ BÀI TOÁN ===================== */

// Đọc số thành chữ tiếng Việt (0 đến 999999): 13 -> "mười ba", 28 -> "hai mươi tám", 105 -> "một trăm linh năm".
function soThanhChu_(n) {
  n = Math.floor(Number(n));
  var CH = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  if (!isFinite(n) || n < 0 || n >= 1000000) return String(n);
  if (n < 10) return CH[n];
  if (n < 20) return 'mười' + (n % 10 === 0 ? '' : ' ' + (n % 10 === 5 ? 'lăm' : CH[n % 10]));
  if (n < 100) {
    var c = Math.floor(n / 10), d = n % 10;
    return CH[c] + ' mươi' + (d === 0 ? '' : ' ' + (d === 1 ? 'mốt' : d === 5 ? 'lăm' : CH[d]));
  }
  if (n < 1000) {
    var tr = Math.floor(n / 100), r = n % 100;
    var s = CH[tr] + ' trăm';
    if (r === 0) return s;
    if (r < 10) return s + ' linh ' + CH[r];
    return s + ' ' + soThanhChu_(r);
  }
  var ng = Math.floor(n / 1000), r2 = n % 1000;
  var s2 = soThanhChu_(ng) + ' nghìn';
  if (r2 === 0) return s2;
  if (r2 < 10) return s2 + ' không trăm linh ' + CH[r2];
  if (r2 < 100) return s2 + ' không trăm ' + soThanhChu_(r2);
  return s2 + ' ' + soThanhChu_(r2);
}

// Mọi phân số "số nguyên / số nguyên" xuất hiện trong chuỗi: \frac{a}{b}, \dfrac{a}{b} hoặc a/b.
function cacPhanSo_(t) {
  var kq = [], m, re1 = /\\d?frac\s*\{\s*(\d+)\s*\}\s*\{\s*(\d+)\s*\}/g, re2 = /(\d+)\s*\/\s*(\d+)/g;
  while ((m = re1.exec(t)) !== null) kq.push([Number(m[1]), Number(m[2])]);
  while ((m = re2.exec(t)) !== null) kq.push([Number(m[1]), Number(m[2])]);
  return kq;
}

// Tìm cảnh đáp án: cảnh cuối cùng có loai là dap_an/ket_qua; không có thì cảnh liền trước cảnh chốt bài học.
function timCanhDapAn_(kb) {
  var idx = -1;
  for (var i = 0; i < kb.canh.length; i++) if (/dap_an|ket_qua/i.test(String(kb.canh[i].loai || ''))) idx = i;
  if (idx >= 0) return idx;
  var n = kb.canh.length;
  return /bai_hoc|ket_luan|chot/i.test(String(kb.canh[n - 1].loai || '')) && n >= 2 ? n - 2 : n - 1;
}

// Đảm bảo cảnh đáp án LUÔN ra đúng đáp án đã kiểm chứng, dù AI viết gì: gọi trước hopLeKichBan_ (xem hướng dẫn sửa Code.gs).
// Giữ nguyên cảnh nếu mọi phân số trong đó đều bằng đáp án đúng và lời thoại có đọc đúng tử/mẫu; ngược lại thay bằng bản chuẩn.
function suaDapAn_(kb, dapAn) {
  if (!kb || !Array.isArray(kb.canh) || !kb.canh.length) return;
  if (laDapSo_(dapAn)) return suaDapSo_(kb, dapAn);
  var m = /^(\d+)\/(\d+)$/.exec(String(dapAn).replace(/\s/g, ''));
  if (!m) return;
  var tu = Number(m[1]), mau = Number(m[2]);
  var c = kb.canh[timCanhDapAn_(kb)];
  c.loai = 'dap_an';
  var dsDong = c.noi_dung_man_hinh || [];
  var dong = dsDong.length ? String(dsDong[dsDong.length - 1]) : '';   // chỉ dòng CUỐI phải ra đáp án; các dòng trước là bước biến đổi
  var ps = cacPhanSo_(dong);
  // dòng cuối có thể là phần mở rộng của các dòng trước (còn các phân số trung gian), nên chỉ phân số CUỐI CÙNG phải bằng đáp án
  var dungHet = ps.length > 0 && (ps[ps.length - 1][0] * mau === ps[ps.length - 1][1] * tu);
  if (!dungHet) c.noi_dung_man_hinh = ['P = \\frac{' + tu + '}{' + mau + '}'];
  var noi = String(c.loi_thoai || '').toLowerCase();
  var coTu = noi.indexOf(soThanhChu_(tu)) >= 0 || new RegExp('(^|\\D)' + tu + '(\\D|$)').test(noi);
  var coMau = noi.indexOf(soThanhChu_(mau)) >= 0 || new RegExp('(^|\\D)' + mau + '(\\D|$)').test(noi);
  var saiSo = /\d+\s*(phần|trên)\s*\d+/.exec(noi);
  if (LA_RE_.test(noi) || LA_RE_.test(String(c.noi_dung_man_hinh).toLowerCase())) { coTu = false; c.noi_dung_man_hinh = ['P = \\frac{' + tu + '}{' + mau + '}']; }
  if (!(coTu && coMau) || (saiSo && !new RegExp('^' + tu + '\\s*(phần|trên)\\s*' + mau + '$').test(saiSo[0]))) {
    c.loi_thoai = 'Vậy xác suất cần tìm là ' + soThanhChu_(tu) + ' phần ' + soThanhChu_(mau) + '.';
  }
  kb.dap_an_cuoi = String(dapAn);
}

var LA_RE_ = /hết hạn mức|hạn mức|quota|rate limit|resource_exhausted|xin lỗi|mô hình ngôn ngữ|trí tuệ nhân tạo|là một ai|as an ai|không thể (giúp|trả lời|hoàn thành)|todo|lorem|\bundefined\b/;

// Câu thông báo của hệ thống/AI lọt vào nội dung video (ví dụ "hết hạn mức", "xin lỗi", "là một mô hình ngôn ngữ").
function noiDungLa_(kb) {
  var txt = JSON.stringify([kb.canh, kb.hook, kb.hook_chu, kb.tieu_de]).toLowerCase();
  var m = LA_RE_.exec(txt);
  return m ? 'NOI_DUNG_LA: nội dung có cụm "' + m[0] + '" (câu thông báo của hệ thống/AI, không phải lời giảng). Viết lại hoàn toàn bằng nội dung bài toán, không nhắc tới hạn mức hay xin lỗi.' : '';
}

// Cách trình bày công thức: "cong_don" = viết thêm lên bảng (dòng sau mở rộng dòng trước), "bien_doi" = các dòng biến hình thay thế nhau, "xep" = xếp chồng.
function kiemTraTrinhBay_(kb) {
  for (var i = 0; i < kb.canh.length; i++) {
    var c = kb.canh[i], tb = c.trinh_bay;
    if (tb === undefined || tb === null || tb === '') continue;
    if (tb !== 'bien_doi' && tb !== 'cong_don' && tb !== 'xep') return 'TRINH_BAY_SAI_CANH_' + (i + 1) + ': "trinh_bay" phải là "cong_don", "bien_doi" hoặc "xep".';
    if (tb === 'bien_doi' || tb === 'cong_don') {
      var d = c.noi_dung_man_hinh || [];
      var toiDa = tb === 'cong_don' ? 6 : 4;
      if (d.length < 1 || d.length > toiDa) return 'BIEN_DOI_SO_DONG_CANH_' + (i + 1) + ': "' + tb + '" cần 1-' + toiDa + ' dòng.';
      for (var j = 0; j < d.length; j++) {
        if (String(d[j]).replace(/\\[a-zA-Z]+/g, 'x').replace(/[{}\s]/g, '').length > 64) return 'BIEN_DOI_DONG_DAI_CANH_' + (i + 1) + ': mỗi dòng của "bien_doi"/"cong_don" tối đa khoảng 60 ký tự hiển thị; hãy rút gọn hoặc dùng "xep".';
      }
    }
  }
  return '';
}

// Khung chú thích: tối đa 3 dòng ngắn.
function kiemTraChuThich_(kb) {
  for (var i = 0; i < kb.canh.length; i++) {
    var ct = kb.canh[i].chu_thich;
    if (ct === undefined || ct === null) continue;
    if (!Array.isArray(ct) || ct.length > 3) return 'CHU_THICH_CANH_' + (i + 1) + ': "chu_thich" là mảng tối đa 3 dòng ngắn.';
    for (var j = 0; j < ct.length; j++) if (String(ct[j]).length > 60) return 'CHU_THICH_DAI_CANH_' + (i + 1) + ': mỗi dòng chú thích tối đa 60 ký tự.';
  }
  return '';
}

// Kiểm tra cách dạy: phải có ý tưởng then chốt, có cảnh "y_do"/"diem_chot", không mở cảnh giải bằng "áp dụng công thức".
function kiemTraCachDay_(kb) {
  if (String(kb.y_tuong_chinh || '').trim().length < 30) return 'THIEU_Y_TUONG_CHINH: "y_tuong_chinh" phải là một câu (ít nhất 30 ký tự) nêu ý tưởng then chốt làm bài toán trở nên dễ hiểu.';
  var co = false;
  for (var i = 0; i < kb.canh.length; i++) {
    var c = kb.canh[i], l = String(c.loai || '');
    if (/y_do|diem_chot|mo_hinh/i.test(l)) co = true;
    if (/huong|tinh|thu_nho|diem_chot/i.test(l) && /^\s*(áp dụng|dùng|sử dụng|ta có)\s+(công thức|định lý|quy tắc)/i.test(String(c.loi_thoai || ''))) {
      return 'RAP_KHUON_CANH_' + (i + 1) + ': cảnh không được mở bằng "áp dụng công thức". Hãy nói vì sao nghĩ tới hướng này (ý đồ bài toán, quan sát) rồi mới nhắc công thức nếu cần.';
    }
  }
  if (!co) return 'THIEU_CANH_Y_DO: phải có ít nhất một cảnh loai "y_do" (bài toán thật sự hỏi gì) hoặc "diem_chot" (ý tưởng then chốt).';
  return '';
}

// Thay cho hopLeKichBan_ cũ trong Code.gs (xóa hàm cũ). Giữ các kiểm tra cũ, thêm kiểm tra hình minh họa.
// Đánh giá kịch bản, gom TẤT CẢ lỗi một lần và chia hai mức:
//  - nang: làm hỏng video hoặc sai nội dung (thiếu lời thoại, sai đáp án, không vẽ hình của đề, quá dài nhiều...) -> phải sửa.
//  - nhe : chỉ chưa đẹp theo quy ước (tiêu đề, hook, số cảnh có hình...) -> thử sửa một lần, còn thì vẫn dùng được.
// Gọi SAU tuSuaKichBan_ (máy đã tự sửa phần lớn lỗi vặt).
function danhGiaKichBan_(kb, dapAn, mon, coHinhDe, sanPham) {
  var nang = [], nhe = [];
  var them = function (ds, loi) { if (loi) ds.push(loi); };
  if (!kb || !Array.isArray(kb.canh) || !kb.canh.length) return { nang: ['KHONG_CO_CANH: kịch bản phải có mảng "canh" gồm 6-12 cảnh.'], nhe: [] };
  if (kb.canh.length < 6 || kb.canh.length > 12) nang.push('SO_CANH_NGOAI_6_DEN_12: hiện có ' + kb.canh.length + ' cảnh, cần 6-12 cảnh.');
  var thucTe = String(mon || '').toUpperCase() === 'THUC_TE';
  if (!Array.isArray(kb.bai_hoc_rut_ra) || kb.bai_hoc_rut_ra.filter(function (x) { return String(x).trim().length >= 8; }).length < 2) nhe.push('THIEU_BAI_HOC_RUT_RA: cần "bai_hoc_rut_ra" là mảng 3 câu ngắn (mỗi câu ≤ 12 từ).');
  if (!kb.canh.some(function (c) { return /tinh|giai/i.test(String(c.loai || '')); })) nhe.push('THIEU_CANH_TINH_TOAN: cần ít nhất một cảnh "tinh_toan".');
  if (!/bai_hoc|ket_luan|chot/i.test(String(kb.canh[kb.canh.length - 1].loai || ''))) nhe.push('THIEU_CANH_BAI_HOC: cảnh cuối phải là "bai_hoc".');
  var tong = 0;
  for (var i = 0; i < kb.canh.length; i++) {
    var c = kb.canh[i];
    if (!c.loi_thoai || !String(c.loi_thoai).trim()) { nang.push('THIEU_LOI_THOAI_CANH_' + (i + 1) + ': cảnh nào cũng phải có lời thoại.'); continue; }
    if (/[\\$]/.test(c.loi_thoai)) nang.push('LOI_THOAI_CHUA_LATEX_CANH_' + (i + 1));
    tong += uocGiayDoc_(c.loi_thoai);
  }
  if (/^\s*(xin\s+)?chào/i.test(kb.canh[0].loi_thoai) && !(typeof cauHinh_ === 'function' && cauHinh_('KIEU_MO_DAU') === 'chao_hook')) nhe.push('MO_DAU_BANG_LOI_CHAO');
  var gioiHan = Number(cauHinh_('GIAY_TOI_DA')) || 130;
  if (tong > gioiHan * 1.15) nang.push('QUA_DAI_' + tong + '_GIAY');
  else if (tong > gioiHan) nhe.push('QUA_DAI_' + tong + '_GIAY');
  if (String(kb.dap_an_cuoi).replace(/\s/g, '') !== dapAn) nang.push('DAP_AN_CUOI_SAI');

  var idTruoc = {}, soSanKhau = 0, so3D = 0, soMoHinh = 0, coHinh = 0;
  for (var j = 0; j < kb.canh.length; j++) {
    var cj = kb.canh[j];
    var laSK = cj.minh_hoa && cj.minh_hoa.loai === 'san_khau';
    var idCu = laSK && cj.giu_san_khau ? idTruoc : null;
    them(nhe, kiemTraMinhHoa_(cj.minh_hoa, j + 1, idCu));
    if (j > 0 && String(cj.tieu_de_canh || '').trim().length < 6) nhe.push('THIEU_TIEU_DE_CANH_' + (j + 1) + ': cần "tieu_de_canh" 3-8 từ.');
    if (demTu_(cj.tieu_de_canh) > 10) nhe.push('TIEU_DE_CANH_DAI_' + (j + 1));
    if (laSK && laDT_(cj.minh_hoa.du_lieu) && Array.isArray(cj.minh_hoa.du_lieu.vat)) {
      soSanKhau++;
      var moi = {};
      if (cj.giu_san_khau) Object.keys(idTruoc).forEach(function (k) { moi[k] = true; });
      cj.minh_hoa.du_lieu.vat.forEach(function (v) { if (v) moi[v.id] = true; });
      idTruoc = moi;
      if (cj.minh_hoa.du_lieu.vat.some(function (v) { return v && VAT_3D_.indexOf(v.loai) >= 0; })) so3D++;
      if (cj.minh_hoa.du_lieu.vat.some(function (v) { return v && VAT_MO_HINH_.indexOf(v.loai) >= 0; })) soMoHinh++;
    } else idTruoc = {};
    if (cj.minh_hoa && cj.minh_hoa.loai && cj.minh_hoa.loai !== 'khong') {
      coHinh++;
      if (String(cj.minh_hoa.mo_ta || '').trim().length < 40) nhe.push('MO_TA_HINH_QUA_NGAN_CANH_' + (j + 1));
    }
  }
  them(nang, noiDungLa_(kb));
  kiemTraPhepTinh_(kb).forEach(function (x) { nang.push(x); });
  kiemTraHinhDungYen_(kb).forEach(function (x) { nhe.push(x); });
  kiemTraNhanDai_(kb).forEach(function (x) { nhe.push(x); });
  them(nhe, kiemTraCachDay_(kb));
  them(nhe, kiemTraTrinhBay_(kb));
  them(nhe, kiemTraChuThich_(kb));
  them(nhe, kiemTraHook_(kb));
  them(nhe, kiemTraNoiCanh_(kb));
  if (coHinhDe) {
    // coHinhDe: chữ của đề + mô tả hình. Vật 3D chỉ được tính là "vẽ đúng hình" khi đề nhắc đúng loại vật đó.
    var chuDe = String(coHinhDe).toLowerCase();
    // đề XẾP CHỒNG (ống, lon, gạch, khúc gỗ xếp thành tầng/hàng): phải vẽ đúng chồng vật (nét xep_chong hoặc các hình tròn), không thay bằng một khối trụ/hộp
    var xepChong = /xếp|chồng|chất/.test(chuDe) && /tầng|hàng|lớp|chồng/.test(chuDe);
    var veHinh = kb.canh.slice(0, 3).some(function (c) {
      var du0 = c && c.minh_hoa && c.minh_hoa.du_lieu;
      if (xepChong) return !!(du0 && Array.isArray(du0.vat) && du0.vat.some(function (v) { return v && v.loai === 'hinh_tu_do' && Array.isArray(v.hinh) && v.hinh.some(function (h) { return h && (h.kieu === 'xep_chong' || h.kieu === 'tron' || (h.kieu === 'lap' && h.hinh && h.hinh.kieu === 'tron')); }); }));
      var du = c && c.minh_hoa && c.minh_hoa.du_lieu;
      if (!c || !c.minh_hoa || c.minh_hoa.loai !== 'san_khau' || !du || !Array.isArray(du.vat)) return false;
      return du.vat.some(function (v) {
        if (!v) return false;
        if (VAT_MO_HINH_.indexOf(v.loai) >= 0) return true;
        var tu = TU_VAT_3D_[v.loai];
        return !!tu && tu.test(chuDe);
      });
    });
    if (!veHinh && xepChong) nang.push('THIEU_HINH_DE: đề XẾP CHỒNG vật thành tầng/hàng. 3 cảnh đầu phải vẽ đúng chồng vật bằng hinh_tu_do với nét {"kieu":"xep_chong","tam":[50,55],"r":44,"hang":[số vật từng tầng từ trên xuống]} (hoặc "tren"/"duoi"), KHÔNG dùng một khối trụ/hộp thay cho cả chồng.');
    else if (!veHinh) nang.push('THIEU_HINH_DE: đề có hình (ảnh kèm hoặc hình dạng cụ thể) nhưng 3 cảnh đầu không vẽ lại hình đó. Hãy vẽ ĐÚNG hình của đề bằng "hinh_tu_do" (hoặc hinh_hoc/do_thi) ở cảnh mo_dau hoặc de_bai; không thay bằng vật khác.');
  }
  if (thucTe && so3D < 2 && !coHinhDe) nhe.push('THIEU_CANH_3D: video toán thực tế nên có ít nhất 2 cảnh có vật 3D thật dựng lại tình huống của đề.');
  if (thucTe && soMoHinh < 1) nhe.push('THIEU_MO_HINH: video toán thực tế nên có ít nhất 1 cảnh hinh_hoc, do_thi hoặc hinh_tu_do để mô hình hóa.');
  var canDA = kb.canh[timCanhDapAn_(kb)];
  var dsDA = (canDA && canDA.noi_dung_man_hinh) || [];
  if (laDapSo_(dapAn) && !coDapSo_(dsDA.length ? String(dsDA[dsDA.length - 1]) : '', dapAn)) nang.push('DAP_AN_SAI_TREN_MAN_HINH: dòng cuối của cảnh đáp án phải chứa đáp số ' + dapAn + '.');
  var psDA = cacPhanSo_(dsDA.length ? String(dsDA[dsDA.length - 1]) : '');
  var mDA = /^(\d+)\/(\d+)$/.exec(String(dapAn).replace(/\s/g, ''));
  if (mDA && psDA.length && (psDA[psDA.length - 1][0] * Number(mDA[2]) !== psDA[psDA.length - 1][1] * Number(mDA[1]))) nang.push('DAP_AN_SAI_TREN_MAN_HINH: phân số cuối ở dòng cuối của cảnh đáp án không bằng ' + dapAn + '.');
  var can = Math.max(3, Math.ceil(kb.canh.length / 2));
  if (coHinh < can) nhe.push('IT_HINH_MINH_HOA: chỉ có ' + coHinh + ' cảnh có hình, nên có ít nhất ' + can + '.');
  var canSK = Math.min(3, kb.canh.length - 2);
  if (soSanKhau < canSK) nhe.push('IT_SAN_KHAU: chỉ có ' + soSanKhau + ' cảnh dùng "san_khau", nên có ít nhất ' + canSK + '.');
  if (sanPham && typeof kiemTraSanPhamTrongKichBan_ === 'function') nang = nang.concat(kiemTraSanPhamTrongKichBan_(kb, sanPham));
  return { nang: nang, nhe: nhe };
}

// Giữ tên cũ: trả lỗi đầu tiên (nặng trước), '' nếu hoàn hảo.
function hopLeKichBan_(kb, dapAn, mon, coHinhDe) {
  var d = danhGiaKichBan_(kb, dapAn, mon, coHinhDe);
  return d.nang[0] || d.nhe[0] || '';
}


/* ===================== TOÁN THỰC TẾ: VẬT 3D, HÌNH HỌC, ĐỒ THỊ, ĐÁP SỐ ===================== */

// Kiểm tra dữ liệu riêng của các vật toán thực tế. Trả '' nếu hợp lệ.
function kiemTraVatThucTe_(v, ev) {
  var kt = v.kich_thuoc;
  if (kt !== undefined) {
    var can = v.loai === 'khoi_hop' || v.loai === 'toa_nha' ? 3 : v.loai === 'cau' ? 1 : 2;
    if (!Array.isArray(kt) || kt.length < can || kt.slice(0, can).some(function (x) { return !(Number(x) > 0); })) return 'HINH_' + ev + ': "kich_thuoc" của ' + v.loai + ' là mảng ' + can + ' số dương (' + (can === 3 ? '[dài, rộng, cao]' : can === 2 ? '[bán kính, chiều cao]' : '[bán kính]') + '), ghi số thật của đề.';
  }
  if (v.muc_nuoc !== undefined && !(Number(v.muc_nuoc) >= 0 && Number(v.muc_nuoc) <= 1)) return 'HINH_' + ev + ': "muc_nuoc" là tỉ lệ 0-1 (0.5 = nửa bể).';
  if (v.loai === 'thang' && v.goc_nghieng !== undefined && !(Number(v.goc_nghieng) >= 5 && Number(v.goc_nghieng) <= 85)) return 'HINH_' + ev + ': "goc_nghieng" của thang là góc với mặt đất 5-85 độ.';
  if (v.loai === 'hinh_tu_do') return kiemTraHinhTuDo_(v, ev);
  if (v.loai === 'hinh_hoc') {
    if (!laDT_(v.diem) || Object.keys(v.diem).length < 2) return 'HINH_' + ev + ': hinh_hoc cần "diem" là đối tượng {"A":[x,y],...} có ít nhất 2 điểm, tọa độ 0-100.';
    var ten = Object.keys(v.diem);
    for (var i = 0; i < ten.length; i++) {
      var xy = v.diem[ten[i]];
      if (!Array.isArray(xy) || xy.length < 2 || !laSo_(Number(xy[0])) || !laSo_(Number(xy[1])) || xy[0] < -10 || xy[0] > 110 || xy[1] < -10 || xy[1] > 110) return 'HINH_' + ev + ': điểm "' + ten[i] + '" của hinh_hoc cần [x, y] là số 0-100.';
    }
    var co = function (k) { return typeof k === 'string' && !!v.diem[k]; };
    var ds = [['canh', 2], ['goc', 3], ['vuong', 3], ['to', 3]];
    for (var d = 0; d < ds.length; d++) {
      var mang = v[ds[d][0]];
      if (mang === undefined) continue;
      if (!Array.isArray(mang)) return 'HINH_' + ev + ': "' + ds[d][0] + '" của hinh_hoc phải là mảng.';
      for (var j = 0; j < mang.length; j++) {
        var it = mang[j];
        if (!Array.isArray(it) || it.length < ds[d][1]) return 'HINH_' + ev + ': mỗi phần tử "' + ds[d][0] + '" cần ít nhất ' + ds[d][1] + ' tên điểm.';
        var soDiem = ds[d][0] === 'to' ? it.length : ds[d][1];
        for (var q = 0; q < soDiem; q++) if (!co(it[q])) return 'HINH_' + ev + ': "' + ds[d][0] + '" nhắc tới điểm "' + it[q] + '" không có trong "diem".';
      }
    }
    if (!Array.isArray(v.canh) || !v.canh.length) return 'HINH_' + ev + ': hinh_hoc cần ít nhất 1 cạnh trong "canh" [["A","B","nhãn"]].';
  }
  if (v.loai === 'do_thi') {
    if (!laChuoi_(v.ham)) return 'HINH_' + ev + ': do_thi cần "ham" là biểu thức theo x (ví dụ "x^2+128/x").';
    var tu = Number(v.x_tu), den = Number(v.x_den);
    if (!laSo_(tu) || !laSo_(den) || den <= tu) return 'HINH_' + ev + ': do_thi cần "x_tu" < "x_den" (khoảng vẽ nằm trong điều kiện của ẩn).';
    var f = phanTichBieuThuc_(v.ham, v.kieu === 'do');
    if (!f) return 'HINH_' + ev + ': "ham" = "' + v.ham + '" không đọc được. Viết kiểu máy tính: dùng * ^ / ( ), sqrt, sin, cos, tan, ln, log, exp, abs; không LaTeX, không "y =".';
    var tot = 0;
    for (var k = 0; k <= 40; k++) { var y = f(tu + (den - tu) * k / 40); if (isFinite(y)) tot++; }
    if (tot < 25) return 'HINH_' + ev + ': hàm "' + v.ham + '" không xác định trên phần lớn khoảng [' + tu + ', ' + den + ']; hãy chọn khoảng vẽ nằm trong miền xác định.';
  }
  return '';
}

// Đáp số dạng số (toán thực tế) chứ không phải phân số xác suất.
function laDapSo_(dapAn) { return /^-?\d+(\.\d+)?$/.test(String(dapAn).trim()); }
// Dòng công thức có chứa đáp số không (chấp nhận 12.5, 12,5, 12{,}5).
function coDapSo_(dong, dapAn) {
  var t = String(dong).replace(/\{,\}/g, ',').replace(/\\,|\\ |~/g, '').replace(/(\d)[\s.](?=\d{3}(\D|$))/g, '$1');   // bỏ dấu phân cách nghìn "138 548"
  var dung = Number(String(dapAn).trim());
  var so = (t.match(/-?\d+(?:[.,]\d+)?/g) || []).map(function (x) { return Number(x.replace(',', '.')); });
  // khớp nếu có một số bằng đáp số, hoặc là đáp số đã làm tròn (theo số chữ số thập phân đang hiện)
  return so.some(function (x) {
    if (!isFinite(x) || !isFinite(dung)) return false;
    var le = (String(x).split('.')[1] || '').length;
    return Math.abs(x - dung) <= Math.max(1e-9, 1e-6 * Math.abs(dung)) || Math.abs(x - dung) <= 0.5 * Math.pow(10, -le) + 1e-9;
  });
}
// Đọc đáp số thành lời: 12.5 -> "mười hai phẩy năm".
function docDapSo_(dapAn) {
  var s = String(dapAn).trim(), am = s.charAt(0) === '-';
  if (am) s = s.slice(1);
  var p = s.split('.');
  var chu = soThanhChu_(Number(p[0]));
  if (p[1]) chu += ' phẩy ' + (p[1].length <= 2 && p[1].charAt(0) !== '0' ? soThanhChu_(Number(p[1])) : p[1].split('').map(function (c) { return soThanhChu_(Number(c)); }).join(' '));
  return (am ? 'âm ' : '') + chu;
}
// Bản suaDapAn_ cho đáp số: dòng cuối cảnh đáp án phải chứa đáp số, lời thoại phải đọc đúng số.
function suaDapSo_(kb, dapAn) {
  var c = kb.canh[timCanhDapAn_(kb)];
  c.loai = 'dap_an';
  var ds = Array.isArray(c.noi_dung_man_hinh) ? c.noi_dung_man_hinh : [];
  var cuoi = ds.length ? String(ds[ds.length - 1]) : '';
  var soTex = String(dapAn).replace('.', '{,}');
  if (!coDapSo_(cuoi, dapAn) || LA_RE_.test(cuoi.toLowerCase())) {
    var hien = String(kb.dap_an_hien || '').trim();
    ds = ds.slice(0, 3).concat([hien && coDapSo_(hien, dapAn) && hien.length <= 40 ? '\\text{' + hien.replace(/[{}\\]/g, '') + '}' : '\\text{Đáp số: } ' + soTex]);
    c.noi_dung_man_hinh = ds;
  }
  var noi = String(c.loi_thoai || '').toLowerCase();
  var docSo = docDapSo_(dapAn);
  var coSo = noi.indexOf(docSo) >= 0 || coDapSo_(noi, dapAn);
  if (!coSo || LA_RE_.test(noi)) c.loi_thoai = String(c.loi_thoai && !LA_RE_.test(noi) ? c.loi_thoai.replace(/\s*$/, ' ') : '') + 'Vậy đáp số là ' + docSo + '.';
  kb.dap_an_cuoi = String(dapAn);
}

// Bộ đọc biểu thức một biến (giống src/sankhau/bieuthuc.ts của bộ dựng video): trả hàm f(x) hoặc null nếu viết sai.
function phanTichBieuThuc_(nguon, theoDo) {
  var D = theoDo ? Math.PI / 180 : 1;
  var HAM = { sqrt: Math.sqrt, can: Math.sqrt, sin: function (a) { return Math.sin(a * D); }, cos: function (a) { return Math.cos(a * D); }, tan: function (a) { return Math.tan(a * D); },
    abs: Math.abs, ln: Math.log, log: function (a) { return Math.log(a) / Math.LN10; }, exp: Math.exp, asin: Math.asin, acos: Math.acos, atan: Math.atan };
  var tenHam = Object.keys(HAM).sort(function (a, b) { return b.length - a.length; });
  var s = String(nguon || '').toLowerCase().replace(/\s+/g, '').replace(/(\d),(\d)/g, '$1.$2').replace(/×|·/g, '*').replace(/÷|:/g, '/')
    .replace(/√/g, 'sqrt').replace(/π/g, 'pi').replace(/\*\*/g, '^');
  var i = 0;
  function nhin() { return s.charAt(i); }
  function loi() { throw new Error('bieu_thuc'); }
  function tong() {
    var a = tich();
    while (nhin() === '+' || nhin() === '-') {
      var op = s.charAt(i++), b = tich(), aa = a;
      a = op === '+' ? (function (p, q) { return function (x) { return p(x) + q(x); }; })(aa, b) : (function (p, q) { return function (x) { return p(x) - q(x); }; })(aa, b);
    }
    return a;
  }
  function tich() {
    var a = dau();
    for (;;) {
      var c = nhin();
      if (c === '*' || c === '/') {
        i++;
        var b = dau(), aa = a;
        a = c === '*' ? (function (p, q) { return function (x) { return p(x) * q(x); }; })(aa, b) : (function (p, q) { return function (x) { return p(x) / q(x); }; })(aa, b);
      } else if (c && /[0-9.a-z(]/.test(c)) {
        var b2 = dau(), a2 = a;
        a = (function (p, q) { return function (x) { return p(x) * q(x); }; })(a2, b2);
      } else break;
    }
    return a;
  }
  function dau() {
    if (nhin() === '-') { i++; var a = dau(); return function (x) { return -a(x); }; }
    if (nhin() === '+') { i++; return dau(); }
    return luyThua();
  }
  function luyThua() {
    var a = coSo();
    if (nhin() === '^') { i++; var b = dau(); return function (x) { return Math.pow(a(x), b(x)); }; }
    return a;
  }
  function coSo() {
    var c = nhin();
    if (c === '(') { i++; var a = tong(); if (nhin() !== ')') loi(); i++; return a; }
    if (c && /[0-9.]/.test(c)) {
      var m = /^[0-9]*\.?[0-9]+(e[+-]?[0-9]+)?/.exec(s.slice(i));
      if (!m) loi();
      i += m[0].length;
      var v = parseFloat(m[0]);
      return function () { return v; };
    }
    var m2 = /^[a-z]+/.exec(s.slice(i));
    if (!m2) loi();
    var ten = m2[0];
    if (ten.charAt(0) === 'x') { i += 1; return function (x) { return x; }; }
    if (ten.indexOf('pi') === 0) { i += 2; return function () { return Math.PI; }; }
    for (var k = 0; k < tenHam.length; k++) {
      if (ten.indexOf(tenHam[k]) === 0) {
        i += tenHam[k].length;
        var g = HAM[tenHam[k]], arg = luyThua();
        return function (x) { return g(arg(x)); };
      }
    }
    if (ten.charAt(0) === 'e') { i += 1; return function () { return Math.E; }; }
    return loi();
  }
  try {
    var f = tong();
    return i === s.length ? f : null;
  } catch (e) { return null; }
}


/* ===================== MẠCH NỐI GIỮA CÁC CẢNH ===================== */

var MO_MAY_MOC_ = /^\s*(bước\s+(tiếp theo|kế tiếp|đầu tiên)|tiếp theo\s*[,:]|sau đây|bây giờ\s+(chúng\s+)?(ta|mình)\s+sẽ|cảnh\s+(này|tiếp)|cái bẫy (ở đây|là)|đầu tiên\s*(,|ta|chúng ta)|ở bước này|tiếp tục\s*[,:])/i;

// Lời thoại phải nghe như một bài nói liền mạch: không được nhiều cảnh mở bằng câu chuyển máy móc, không lặp một kiểu mở đầu.
function kiemTraNoiCanh_(kb) {
  var mayMoc = [], dau = {};
  for (var i = 1; i < kb.canh.length; i++) {
    var lt = String(kb.canh[i].loi_thoai || '').trim();
    if (MO_MAY_MOC_.test(lt)) mayMoc.push(i + 1);
    var hai = lt.toLowerCase().split(/\s+/).slice(0, 2).join(' ');
    if (hai.length >= 4) dau[hai] = (dau[hai] || 0) + 1;
  }
  if (mayMoc.length >= 2) return 'NOI_CANH_MAY_MOC: các cảnh ' + mayMoc.join(', ') + ' mở bằng câu chuyển máy móc ("Bước tiếp theo", "Tiếp theo,", "Cái bẫy ở đây là"...). Hãy viết câu NỐI tự nhiên bắt từ ý cảnh trước, như một người đang nói liền mạch.';
  for (var k in dau) if (dau[k] >= 3) return 'NOI_CANH_LAP: ' + dau[k] + ' cảnh cùng mở đầu bằng "' + k + '...". Mỗi cảnh cần một câu nối khác nhau.';
  return '';
}


// Hình tự do: khung, danh sách nét hợp lệ (tọa độ là số, đa giác ≥ 3 điểm, svg chỉ gồm lệnh đường dẫn...).
function kiemTraHinhTuDo_(v, ev) {
  if (v.khung !== undefined && (!Array.isArray(v.khung) || v.khung.length < 2 || !(Number(v.khung[0]) >= 10) || !(Number(v.khung[1]) >= 10))) return 'HINH_' + ev + ': "khung" của hinh_tu_do là [rộng, cao] (ví dụ [100,100]).';
  if (!Array.isArray(v.hinh) || !v.hinh.length) return 'HINH_' + ev + ': hinh_tu_do cần "hinh" là mảng các nét {kieu, ...} (da_giac, duong, tron, koch...).';
  if (v.hinh.length > 60) return 'HINH_' + ev + ': hinh_tu_do tối đa 60 nét.';
  var laDiem = function (p) { return Array.isArray(p) && p.length >= 2 && laSo_(Number(p[0])) && laSo_(Number(p[1])); };
  for (var i = 0; i < v.hinh.length; i++) {
    var h = v.hinh[i], e = ev + ', hinh[' + i + ']';
    if (h && h.kieu === 'lap' && laDT_(h.hinh)) h = h.hinh;
    if (!laDT_(h) || KIEU_NET_.indexOf(h.kieu) < 0) return 'HINH_' + e + ': "kieu" phải thuộc: ' + KIEU_NET_.join(', ') + '.';
    if ((h.kieu === 'da_giac' && !(Array.isArray(h.diem) && h.diem.length >= 3 && h.diem.every(laDiem))) ||
        ((h.kieu === 'duong' || h.kieu === 'mui_ten') && !(Array.isArray(h.diem) && h.diem.length >= 2 && h.diem.every(laDiem)))) return 'HINH_' + e + ': ' + h.kieu + ' cần "diem" là mảng các [x, y] (đa giác ≥ 3 điểm, đường ≥ 2 điểm).';
    if ((h.kieu === 'tron' || h.kieu === 'cung' || h.kieu === 'da_giac_deu') && (!laDiem(h.tam) || !(Number(h.r) > 0))) return 'HINH_' + e + ': ' + h.kieu + ' cần "tam":[x,y] và "r" > 0.';
    if ((h.kieu === 'koch' || h.kieu === 'sierpinski') && !(laDiem(h.tam) && Number(h.r) > 0) && !(Array.isArray(h.diem) && h.diem.length >= 3)) return 'HINH_' + e + ': ' + h.kieu + ' cần "tam" + "r" (hình đều) hoặc "diem" (đa giác gốc).';
    if ((h.kieu === 'koch' || h.kieu === 'sierpinski') && h.lap !== undefined && !(Number(h.lap) >= 0 && Number(h.lap) <= 6)) return 'HINH_' + e + ': "lap" của ' + h.kieu + ' từ 0 đến 6.';
    if (h.kieu === 'svg' && !(typeof h.d === 'string' && /^[MmLlHhVvCcSsQqTtAaZz0-9.,\s\-eE+]+$/.test(h.d))) return 'HINH_' + e + ': svg cần "d" chỉ gồm lệnh đường dẫn SVG (M, L, C, Q, A, Z và số).';
    if (h.kieu === 'chu' && !laChuoi_(h.noi_dung)) return 'HINH_' + e + ': chu cần "noi_dung".';
    if (h.kieu === 'xep_chong' && !(Array.isArray(h.hang) && h.hang.length >= 1) && !(Number(h.tren) >= 1 && Number(h.duoi) >= Number(h.tren))) return 'HINH_' + e + ': xep_chong cần "hang":[số vật mỗi tầng từ trên xuống] hoặc "tren" + "duoi" (số vật tầng trên cùng / dưới cùng).';
    if (h.kieu === 'tham_so' && (!phanTichBieuThuc_(String(h.x || '').replace(/(^|[^a-z])t(?![a-z])/g, '$1x')) || !phanTichBieuThuc_(String(h.y || '').replace(/(^|[^a-z])t(?![a-z])/g, '$1x')))) return 'HINH_' + e + ': tham_so cần "x" và "y" là biểu thức theo t viết kiểu máy tính.';
  }
  return '';
}


/* ===================== TỰ SỬA SÂU (không cần gọi lại Gemini) ===================== */

var MO_MAY_MOC_PHAN_ = /^\s*(bước\s+(tiếp theo|kế tiếp|đầu tiên)\s*[,:.]?|tiếp theo\s*[,:]|sau đây\s*[,:]?|bây giờ\s+(chúng\s+)?(ta|mình)\s+sẽ\s+|cảnh\s+(này|tiếp theo)\s*[,:]?|ở bước này\s*[,:]?|tiếp tục\s*[,:])\s*/i;
var CHAO_HOOK_PHAN_ = /^\s*(xin chào|chào các bạn|chào mọi người|các bạn ơi|mọi người ơi|các bạn|mọi người|hôm nay\s+(chúng ta|mình)?\s*(sẽ)?)\s*[,!.:]?\s*/i;

// Tên vật / hành động AI hay tự đặt -> đổi về loại có sẵn (hình học đơn giản thành hinh_tu_do) thay vì bỏ.
var BI_DANH_HINH_ = {
  tam_giac: { kieu: 'da_giac_deu', so_canh: 3 }, tam_giac_deu: { kieu: 'da_giac_deu', so_canh: 3 }, hinh_vuong: { kieu: 'da_giac_deu', so_canh: 4, xoay: 45 },
  ngu_giac: { kieu: 'da_giac_deu', so_canh: 5 }, luc_giac: { kieu: 'da_giac_deu', so_canh: 6 }, da_giac_deu: { kieu: 'da_giac_deu', so_canh: 6 },
  hinh_tron: { kieu: 'tron' }, duong_tron: { kieu: 'tron' }, tron: { kieu: 'tron' }, bong_tuyet: { kieu: 'koch', lap: 3 }, koch: { kieu: 'koch', lap: 3 },
  bong_tuyet_koch: { kieu: 'koch', lap: 3 }, sierpinski: { kieu: 'sierpinski', lap: 3 }, tam_giac_sierpinski: { kieu: 'sierpinski', lap: 3 }
};
var BI_DANH_VAT_ = { hinh_hop: 'khoi_hop', hop: 'khoi_hop', be: 'khoi_hop', be_nuoc: 'khoi_hop', lon: 'tru', hinh_tru: 'tru', coc: 'tru', hinh_non: 'non', qua_cau: 'cau', hinh_cau: 'cau',
  ngoi_nha: 'toa_nha', nha: 'toa_nha', o_to: 'xe', cai_cay: 'cay', bieu_do: 'bieu_do_cot', do_thi_ham: 'do_thi', hinh_ve: 'hinh_tu_do', hinh: 'hinh_tu_do', van_ban: 'chu', so: 'so_dem' };
var BI_DANH_HANH_DONG_ = { lat: 'bien_hinh', dich: 'bien_hinh', cat_ghep: 'bien_hinh', doi_xung: 'bien_hinh', tach_ra: 'tach', no_ra: 'tach', ghep_lai: 'ghep', dem: 'dem_tang', dem_tung_tang: 'dem_tang', xoay: 'quay', lac: 'quay', hien: 'sang', nhay: 'sang', nhap_nhay: 'sang', noi_bat: 'chon', to_mau: 'chon', gach: 'loai_bo', xoa: 'loai_bo',
  zoom: 'phong_to', phong: 'phong_to', thu: 'thu_nho', doi_gia_tri: 'dat_gia_tri', tang: 'dat_gia_tri', giam: 'dat_gia_tri', dich_chuyen: 'di_chuyen', chay: 'di_chuyen', mo_ra: 'mo', camera: 'goc_3d' };
function doiTenVat_(v) {
  if (LOAI_VAT_.indexOf(v.loai) >= 0) return v;
  var ten = String(v.loai || '').toLowerCase().trim().replace(/\s+/g, '_');
  if (BI_DANH_VAT_[ten]) { v.loai = BI_DANH_VAT_[ten]; return v; }
  var h = BI_DANH_HINH_[ten];
  if (h) {
    var net = { kieu: h.kieu, tam: [50, 50], r: 38, mau: v.mau || 'xanh_duong', to: v.mau || 'xanh_duong' };
    if (h.so_canh) net.so_canh = h.so_canh;
    if (h.xoay) net.xoay = h.xoay;
    if (h.lap !== undefined) net.lap = v.lap !== undefined ? v.lap : h.lap;
    if (v.nhan) net.nhan = v.nhan;
    return { id: v.id, loai: 'hinh_tu_do', x: v.x, y: v.y, co: v.co, buoc: v.buoc, gia_tri: v.gia_tri, khung: [100, 100], hinh: [net] };
  }
  return v;
}

function hoaDau_(t) { t = String(t || '').trim(); return t ? t.charAt(0).toUpperCase() + t.slice(1) : t; }
function cauDau_(t) { var m = /^[^.!?]*[.!?]?/.exec(String(t || '').trim()); return m ? m[0].trim() : String(t || ''); }
function catTu_(t, n) { var w = String(t || '').replace(/\s+/g, ' ').trim().split(' '); return w.slice(0, n).join(' ').replace(/[,;:]+$/, ''); }
// Rút gọn còn tối đa n từ nhưng cắt ở ranh giới ý (dấu phẩy, chấm phẩy, hai chấm, gạch) để không đứt giữa cụm từ.
function rutGon_(t, n) {
  var w = String(t || '').replace(/\s+/g, ' ').trim().split(' ');
  if (w.length <= n) return w.join(' ');
  var dau = w.slice(0, n);
  for (var k = dau.length - 1; k >= 2; k--) if (/[,;:–—-]$/.test(dau[k])) return dau.slice(0, k + 1).join(' ').replace(/[,;:–—-]+$/, '');
  return dau.join(' ').replace(/[,;:]+$/, '') + '…';
}

// Đọc ký hiệu toán trong LỜI THOẠI thành chữ (giọng đọc không đọc được LaTeX): \frac{1}{3} -> "1 phần 3", x^2 -> "x bình phương".
function docLatexThanhLoi_(s) {
  s = String(s || '');
  if (!/[\\$^_]/.test(s)) return s;
  var cu;
  s = s.replace(/\$/g, '');
  do {
    cu = s;
    s = s.replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '$1 phần $2').replace(/\\sqrt\s*\{([^{}]*)\}/g, 'căn $1').replace(/\\text\s*\{([^{}]*)\}/g, '$1');
  } while (s !== cu);
  s = s.replace(/\\(cdot|times)/g, ' nhân ').replace(/\\(leq|le)\b/g, ' nhỏ hơn hoặc bằng ').replace(/\\(geq|ge)\b/g, ' lớn hơn hoặc bằng ')
    .replace(/\\neq/g, ' khác ').replace(/\\approx/g, ' xấp xỉ ').replace(/\\pi/g, ' pi ').replace(/\\(Rightarrow|implies)/g, ' suy ra ')
    .replace(/\^\s*\{?2\}?/g, ' bình phương').replace(/\^\s*\{?3\}?/g, ' lập phương').replace(/\^\s*\{([^{}]*)\}/g, ' mũ $1').replace(/\^\s*(\w)/g, ' mũ $1')
    .replace(/_\s*\{([^{}]*)\}/g, ' $1').replace(/_\s*(\w)/g, ' $1').replace(/\\[a-zA-Z]+/g, ' ').replace(/[{}\\]/g, ' ');
  return s.replace(/\s+/g, ' ').replace(/\s+([,.!?])/g, '$1').trim();
}

// Tiêu đề cảnh lấy từ ý đầu của lời thoại (khi AI quên viết).
function tieuDeTuLoi_(t) {
  var y = String(t || '').split(/[.!?,:;]/)[0];
  var td = catTu_(y, 7).replace(/^(và|nhưng|vậy|thì|rồi)\s+/i, '');
  return hoaDau_(td.length >= 6 ? td : catTu_(t, 6));
}

// Sửa sâu các lỗi vặt. ctx: {y_tuong: ý tưởng then chốt từ lời giải}. Trả về danh sách việc đã sửa (ghi nhật ký).
function tuSuaSau_(kb, ctx) {
  ctx = ctx || {};
  var sua = [];
  if (!kb || !Array.isArray(kb.canh) || !kb.canh.length) return sua;
  // 1) lời thoại: đọc ký hiệu toán thành chữ, bỏ câu mở máy móc
  kb.canh.forEach(function (c, i) {
    if (c.loi_thoai && /[\\$]/.test(c.loi_thoai)) { c.loi_thoai = docLatexThanhLoi_(c.loi_thoai); sua.push('đọc LaTeX thành lời ở cảnh ' + (i + 1)); }
    if (i > 0 && c.loi_thoai) {
      var g = String(c.loi_thoai).replace(MO_MAY_MOC_PHAN_, '');
      if (g !== c.loi_thoai && g.length >= 15) { c.loi_thoai = hoaDau_(g); sua.push('bỏ câu mở máy móc ở cảnh ' + (i + 1)); }
    }
    if (!Array.isArray(c.noi_dung_man_hinh)) c.noi_dung_man_hinh = c.noi_dung_man_hinh ? [String(c.noi_dung_man_hinh)] : [];
    if (c.chu_thich !== undefined && !Array.isArray(c.chu_thich)) c.chu_thich = c.chu_thich ? [String(c.chu_thich).slice(0, 60)] : [];
  });
  // 2) sân khấu: bỏ vật/hành động hỏng thay vì từ chối cả kịch bản
  var idTruoc = {};
  kb.canh.forEach(function (c, i) {
    var mh = c.minh_hoa;
    if (!laDT_(mh)) { c.minh_hoa = { loai: 'khong' }; idTruoc = {}; return; }
    if (mh.loai === 'san_khau') {
      if (!laDT_(mh.du_lieu)) mh.du_lieu = { vat: [], hanh_dong: [] };
      var du = mh.du_lieu;
      if (!Array.isArray(du.vat)) du.vat = [];
      var idCu = c.giu_san_khau && i > 0 ? idTruoc : {};
      var ids = {};
      du.vat = du.vat.map(function (v) { return laDT_(v) ? doiTenVat_(v) : v; });
      if (Array.isArray(du.hanh_dong)) du.hanh_dong.forEach(function (h) { if (laDT_(h) && BI_DANH_HANH_DONG_[h.kieu]) h.kieu = BI_DANH_HANH_DONG_[h.kieu]; });
      du.vat = du.vat.filter(function (v, k) {
        if (!laDT_(v) || LOAI_VAT_.indexOf(v.loai) < 0) { if (laDT_(v)) sua.push('bỏ vật không biết vẽ "' + v.loai + '" ở cảnh ' + (i + 1)); return false; }
        if (!laChuoi_(v.id) || ids[v.id]) v.id = (laChuoi_(v.id) ? v.id : 'v') + '_' + (i + 1) + '_' + k;
        if (v.loai !== 'mui_ten') {
          v.x = laSo_(Number(v.x)) ? Math.min(98, Math.max(2, Number(v.x))) : 50;
          v.y = laSo_(Number(v.y)) ? Math.min(98, Math.max(2, Number(v.y))) : 50;
          var loi = kiemTraSanKhau_({ vat: [v], hanh_dong: [] }, 'CANH_' + (i + 1), { _: true });
          if (loi) { sua.push('bỏ vật hỏng ở cảnh ' + (i + 1) + ': ' + loi.slice(0, 80)); return false; }
        }
        ids[v.id] = true;
        return true;
      });
      du.vat = du.vat.filter(function (v) { return v.loai !== 'mui_ten' || ((!v.tu || ids[v.tu] || idCu[v.tu]) && (!v.den || ids[v.den] || idCu[v.den])); });
      du.hanh_dong = (Array.isArray(du.hanh_dong) ? du.hanh_dong : []).filter(function (h) {
        return laDT_(h) && KIEU_HANH_DONG_.indexOf(h.kieu) >= 0 && (h.kieu === 'thu_nho' || h.kieu === 'phong_to' || h.kieu === 'goc_3d' || ids[h.vat] || idCu[h.vat]);
      });
      if (!du.vat.length && !Object.keys(idCu).length) { c.minh_hoa = { loai: 'khong', mo_ta: String(mh.mo_ta || '') }; idTruoc = {}; sua.push('cảnh ' + (i + 1) + ' không còn vật hợp lệ, bỏ sân khấu'); return; }
      if (!du.hanh_dong.length && du.vat.length) du.hanh_dong.push({ buoc: 2, vat: du.vat[0].id, kieu: 'sang' });
      if (String(mh.mo_ta || '').trim().length < 40) {
        mh.mo_ta = (String(mh.mo_ta || '').trim() + ' Sân khấu gồm ' + du.vat.map(function (v) { return v.loai + (v.nhan || v.noi_dung ? ' "' + (v.nhan || v.noi_dung) + '"' : ''); }).join(', ') + ', xuất hiện lần lượt theo lời thoại.').trim();
      }
      var moi = {};
      if (c.giu_san_khau) Object.keys(idCu).forEach(function (k) { moi[k] = true; });
      du.vat.forEach(function (v) { moi[v.id] = true; });
      idTruoc = moi;
    } else {
      idTruoc = {};
      if (mh.loai && mh.loai !== 'khong') {
        var l2 = kiemTraMinhHoa_(mh, i + 1, null);
        if (l2) { c.minh_hoa = { loai: 'khong', mo_ta: String(mh.mo_ta || '') }; sua.push('hình mẫu hỏng ở cảnh ' + (i + 1) + ', bỏ: ' + l2.slice(0, 80)); }
        else if (String(mh.mo_ta || '').trim().length < 40) mh.mo_ta = (String(mh.mo_ta || '').trim() + ' Hình ' + mh.loai + ' minh họa đúng các số liệu đang nói tới.').trim();
      }
    }
  });
  // 3) tiêu đề cảnh, trình bày công thức
  kb.canh.forEach(function (c, i) {
    if (i > 0) {
      var td = String(c.tieu_de_canh || '').replace(/\s+/g, ' ').trim();
      if (td.length < 6) { td = tieuDeTuLoi_(c.loi_thoai); sua.push('tự đặt tiêu đề cảnh ' + (i + 1)); }
      if (demTu_(td) > 10) td = rutGon_(td, 9);
      c.tieu_de_canh = td;
      if (c.tu_khoa && td.toLowerCase().indexOf(String(c.tu_khoa).toLowerCase()) < 0) c.tu_khoa = '';
    }
    var tb = c.trinh_bay;
    if (tb !== undefined && tb !== null && tb !== '' && ['bien_doi', 'cong_don', 'xep'].indexOf(tb) < 0) c.trinh_bay = 'xep';
    if ((c.trinh_bay === 'bien_doi' || c.trinh_bay === 'cong_don') && kiemTraTrinhBay_({ canh: [c] })) c.trinh_bay = 'xep';
    if (c.noi_dung_man_hinh.length > 6) c.noi_dung_man_hinh = c.noi_dung_man_hinh.slice(-6);
  });
  // 4) hook
  var c1 = kb.canh[0];
  if (HOOK_KIEU_.indexOf(kb.hook_kieu) < 0) kb.hook_kieu = 'cau_hoi';
  var choChao = typeof cauHinh_ === 'function' && cauHinh_('KIEU_MO_DAU') === 'chao_hook';
  if (!choChao && c1.loi_thoai) {
    var bo = String(c1.loi_thoai).replace(CHAO_HOOK_PHAN_, '');
    if (bo !== c1.loi_thoai && bo.length >= 10) { c1.loi_thoai = hoaDau_(bo); sua.push('bỏ lời chào ở hook'); }
  }
  if (demTu_(c1.loi_thoai) > 18) {
    var hai = String(c1.loi_thoai).match(/[^.!?]+[.!?]?/g) || [];
    var gon = '';
    for (var k = 0; k < hai.length; k++) { var thu = (gon + ' ' + hai[k]).trim(); if (demTu_(thu) > 16) break; gon = thu; }
    if (demTu_(gon) >= 5) { c1.loi_thoai = gon; sua.push('rút gọn hook còn ' + demTu_(gon) + ' từ'); }
  }
  if (!laChuoi_(kb.hook)) kb.hook = c1.loi_thoai;
  var hc = String(kb.hook_chu || '').replace(CHAO_HOOK_PHAN_, '').trim();
  if (demTu_(hc) < 3 || demTu_(hc) > 12) {
    // chọn câu ngắn gọn nhất đủ 3-12 từ trong các câu móc có sẵn; không có thì rút gọn ở ranh giới ý
    var ung = [hc, cauDau_(kb.hook), cauDau_(c1.loi_thoai)].concat(Array.isArray(kb.hook_ung_vien) ? kb.hook_ung_vien.map(cauDau_) : [])
      .map(function (x) { return String(x || '').replace(CHAO_HOOK_PHAN_, '').trim(); }).filter(function (x) { return demTu_(x) >= 3 && demTu_(x) <= 12; });
    hc = ung.length ? ung[0] : rutGon_(cauDau_(kb.hook || c1.loi_thoai), 12);
    sua.push('tự đặt hook_chu');
  }
  hc = hc.replace(/\d+\s*%/g, 'rất nhiều');
  kb.hook_chu = hoaDau_(hc);
  var nm = (Array.isArray(kb.nhan_manh) ? kb.nhan_manh : []).filter(function (x) { return laChuoi_(x) && kb.hook_chu.toLowerCase().indexOf(String(x).toLowerCase()) >= 0; }).slice(0, 3);
  if (!nm.length) {
    var tuDai = kb.hook_chu.replace(/[^\wÀ-ỹ\s]/g, ' ').split(/\s+/).filter(function (w) { return w.length >= 3; }).sort(function (a, b) { return b.length - a.length; })[0];
    if (tuDai) nm = [tuDai];
  }
  kb.nhan_manh = nm;
  var uv = (Array.isArray(kb.hook_ung_vien) ? kb.hook_ung_vien : []).filter(laChuoi_);
  while (uv.length < 3) uv.push([kb.hook_chu, kb.hook, c1.loi_thoai][uv.length] || kb.hook_chu);
  kb.hook_ung_vien = uv.slice(0, 3);
  // 5) ý tưởng chính
  if (String(kb.y_tuong_chinh || '').trim().length < 30) {
    var nguon = String(ctx.y_tuong || '').trim();
    if (nguon.length < 30) {
      var cMau = kb.canh.filter(function (c) { return /diem_chot|y_do|thu_nho/i.test(String(c.loai || '')); })[0];
      nguon = cMau ? String(cMau.loi_thoai || '') : nguon;
    }
    if (nguon.length >= 30) { kb.y_tuong_chinh = nguon.slice(0, 240); sua.push('tự điền y_tuong_chinh'); }
  }
  // 6) đủ các loại cảnh cần thiết
  if (!kb.canh.some(function (c) { return /tinh|giai/i.test(String(c.loai || '')); })) {
    for (var t = 1; t < kb.canh.length - 1; t++) {
      if (kb.canh[t].noi_dung_man_hinh.length && !/dap_an|ket_qua|bai_hoc/i.test(String(kb.canh[t].loai || ''))) { kb.canh[t].loai = 'tinh_toan'; sua.push('đổi cảnh ' + (t + 1) + ' thành tinh_toan'); break; }
    }
  }
  if (!kb.canh.some(function (c) { return /y_do|diem_chot|mo_hinh/i.test(String(c.loai || '')); })) {
    for (var u = 1; u < kb.canh.length - 1; u++) {
      if (/thu_nho|phan_tich|huong|y_tuong/i.test(String(kb.canh[u].loai || ''))) { kb.canh[u].loai = 'diem_chot'; sua.push('đổi cảnh ' + (u + 1) + ' thành diem_chot'); break; }
    }
  }
  // 7) bài học rút ra + cảnh bài học cuối
  var bhr = (Array.isArray(kb.bai_hoc_rut_ra) ? kb.bai_hoc_rut_ra : []).map(function (x) { return String(x).trim(); }).filter(function (x) { return x.length >= 8; });
  if (bhr.length < 2) {
    var cuoi = kb.canh[kb.canh.length - 1];
    var dsCuoi = [];
    var duC = cuoi.minh_hoa && cuoi.minh_hoa.du_lieu;
    if (duC && Array.isArray(duC.vat)) duC.vat.forEach(function (v) { if (v.loai === 'danh_sach' && Array.isArray(v.ds)) dsCuoi = dsCuoi.concat(v.ds); });
    if (dsCuoi.length < 2) dsCuoi = (String(cuoi.loi_thoai || '').match(/[^.!?]+[.!?]/g) || []).filter(function (x) { return !/\?\s*$/.test(x); });
    bhr = dsCuoi.map(function (x) { return catTu_(String(x).replace(/^[-•\d.\s]+/, ''), 12); }).filter(function (x) { return x.length >= 8; }).slice(0, 3);
    if (bhr.length >= 2) { kb.bai_hoc_rut_ra = bhr; sua.push('tự điền bai_hoc_rut_ra'); }
  }
  var cCuoi = kb.canh[kb.canh.length - 1];
  if (!/bai_hoc|ket_luan|chot/i.test(String(cCuoi.loai || ''))) {
    if (!/dap_an|ket_qua/i.test(String(cCuoi.loai || ''))) { cCuoi.loai = 'bai_hoc'; sua.push('đổi cảnh cuối thành bai_hoc'); }
    else if (kb.canh.length < 12 && bhr.length >= 2) {
      kb.canh.push({
        so: kb.canh.length + 1, loai: 'bai_hoc', tieu_de_canh: 'Ghi nhớ từ bài này', tu_khoa: 'Ghi nhớ', giong_doc: 'thân thiện, đọng lại',
        loi_thoai: 'Vậy rút ra được gì? ' + bhr.map(function (x) { return x.replace(/[.!]+$/, ''); }).join('. ') + '. Bình luận cho mình biết bạn nghĩ gì nhé!',
        noi_dung_man_hinh: [],
        minh_hoa: { loai: 'san_khau', mo_ta: 'Thẻ ghi nhớ liệt kê các điều rút ra, từng dòng sáng lên theo lời thoại.', du_lieu: { vat: [{ id: 'ghi_nho', loai: 'danh_sach', x: 50, y: 50, noi_dung: 'Ghi nhớ', ds: bhr, buoc: 1 }], hanh_dong: [{ buoc: 2, vat: 'ghi_nho', kieu: 'chon', chi_so: [1, 2, 3] }] } }
      });
      sua.push('thêm cảnh bài học cuối');
    }
  }
  return sua;
}


/* ===================== MÁY TÍNH LẠI MỌI PHÉP TÍNH TRÊN MÀN HÌNH (lần 25) ===================== */
// Mỗi dòng công thức "A = B = C" (hoặc ≈): vế nào chỉ gồm số và phép toán thì máy tự tính; hai vế số liền nhau lệch nhau
// (quá sai số làm tròn) là LỖI NẶNG, Gemini phải sửa. Ví dụ bắt được: S_{20} = \frac{20(3+22)}{2} = 260 (thực ra 250).
function texThanhSo_(s) {
  var t = String(s || '');
  t = t.replace(/\\(text|mathrm|mbox|textbf)\s*\{[^{}]*\}(\s*\^\s*(\{[^{}]*\}|\d))?/g, ' ');
  t = t.replace(/\\left|\\right|\\displaystyle|\\,|\;|\\:|\\!|\\quad|\\qquad|~|\\ /g, ' ');
  t = t.replace(/\{,\}/g, '.').replace(/\\%/g, '%');
  // bỏ đơn vị ở cuối (m, cm², đồng, triệu đồng, ống, tầng...)
  t = t.replace(/(\s*(m|cm|mm|km|dm|kg|g|l|ml|lít|đ|đồng|vnđ|triệu|tỷ|nghìn|ngàn|giờ|phút|giây|năm|tháng|ngày|ống|tầng|cái|người|học sinh|viên|lần|°|\\circ|\^\{?\\circ\}?)(\s*\^\s*\{?\d\}?)?)+\s*$/i, '');
  t = t.replace(/\\[dt]?frac/g, '\\frac');
  // \frac{a}{b} -> ((a)/(b)), \sqrt{a} -> sqrt(a), \sqrt[n]{a} -> pow(a,1/n)
  var layNhom = function (x, i) {   // x[i] === '{'
    var sau = 0;
    for (var k = i; k < x.length; k++) { if (x[k] === '{') sau++; else if (x[k] === '}') { sau--; if (!sau) return { noi: x.slice(i + 1, k), het: k + 1 }; } }
    return null;
  };
  for (var lan = 0; lan < 30; lan++) {
    var i = t.indexOf('\\frac');
    if (i >= 0) {
      var j = i + 5; while (t[j] === ' ') j++;
      var a = t[j] === '{' ? layNhom(t, j) : null; if (!a) return null;
      var k = a.het; while (t[k] === ' ') k++;
      var b = t[k] === '{' ? layNhom(t, k) : null; if (!b) return null;
      t = t.slice(0, i) + '((' + a.noi + ')/(' + b.noi + '))' + t.slice(b.het);
      continue;
    }
    i = t.indexOf('\\sqrt');
    if (i >= 0) {
      var p = i + 5, bac = '2';
      if (t[p] === '[') { var q = t.indexOf(']', p); if (q < 0) return null; bac = t.slice(p + 1, q); p = q + 1; }
      var c = t[p] === '{' ? layNhom(t, p) : null; if (!c) return null;
      t = t.slice(0, i) + 'pow((' + c.noi + '),1/(' + bac + '))' + t.slice(c.het);
      continue;
    }
    break;
  }
  t = t.replace(/\\cdot|\\times|·|×/g, '*').replace(/\\div|:/g, '/').replace(/−/g, '-').replace(/\\pi/g, '(3.141592653589793)');
  t = t.replace(/[{}]/g, function (m) { return m === '{' ? '(' : ')'; });
  t = t.replace(/(\d),(\d)/g, '$1.$2');                 // 2,5 -> 2.5
  t = t.replace(/(\d)\s+(?=\d{3}(\D|$))/g, '$1');      // 138 548 -> 138548
  t = t.replace(/%/g, '/100');
  t = t.replace(/\^/g, '**');
  t = t.replace(/(\d|\))\s*\(/g, '$1*(').replace(/\)\s*(\d)/g, ')*$1');
  t = t.replace(/pow\*\(/g, 'pow(').replace(/(\d|\))\s*pow/g, '$1*pow');
  if (/[A-Za-zÀ-ỹ\\]/.test(t.replace(/pow/g, ''))) return null;   // còn chữ/biến -> không phải phép tính thuần số
  if (!/\d/.test(t) || !/^[\d\s.+\-*/()powe,]*$/.test(t)) return null;
  try {
    var v = Function('pow', '"use strict"; return (' + t + ');')(Math.pow);
    return typeof v === 'number' && isFinite(v) ? v : null;
  } catch (e) { return null; }
}
function soLe10_(s) { var m = /(\d)[.,]|\{,\}/.test(String(s)) ? /[.,]\s*(\d+)|\{,\}\s*(\d+)/.exec(String(s)) : null; return m ? (m[1] || m[2] || '').length : 0; }
function kiemTraPhepTinh_(kb) {
  var loi = [];
  (kb.canh || []).forEach(function (c, j) {
    (c && c.noi_dung_man_hinh || []).forEach(function (dong) {
      var s = String(dong || '');
      if (!/=|\\approx|≈/.test(s) || /\\neq|\\leq|\\geq|<|>/.test(s)) return;
      var phan = s.split(/(\\approx|≈|=)/);
      var ve = [], dau = [];
      for (var k = 0; k < phan.length; k += 2) { ve.push(phan[k]); if (k + 1 < phan.length) dau.push(phan[k + 1]); }
      for (var m = 0; m < ve.length - 1; m++) {
        var a = texThanhSo_(ve[m]), b = texThanhSo_(ve[m + 1]);
        if (a === null || b === null) continue;
        var xapXi = dau[m] !== '=';
        var tol = Math.max(0.5 * Math.pow(10, -soLe10_(ve[m + 1])) * 1.001, Math.abs(b) * (xapXi ? 0.006 : 1e-9), 1e-9);
        if (Math.abs(a - b) > tol) {
          loi.push('PHEP_TINH_SAI_CANH_' + (j + 1) + ': dòng "' + s.slice(0, 90) + '" sai: ' + ve[m].trim().slice(0, 40) + ' tính ra ' + (Math.round(a * 10000) / 10000) + ', không phải ' + (Math.round(b * 10000) / 10000) +
            '. Sửa cho đúng; nếu đề không có đáp số tròn thì nói thật điều đó, không được ép phép tính sai.');
          break;
        }
      }
    });
  });
  return loi;
}
// nhãn/chữ trên hình quá dài (chữ sẽ nhỏ, khó đọc): nên tối đa ~22 ký tự
function kiemTraNhanDai_(kb) {
  var loi = [];
  (kb.canh || []).forEach(function (c, j) {
    var du = c && c.minh_hoa && c.minh_hoa.du_lieu;
    if (!du || !Array.isArray(du.vat)) return;
    du.vat.forEach(function (v) {
      if (!v) return;
      var ds = [];
      if (v.loai === 'nhan' || v.loai === 'chu') ds.push(String(v.noi_dung || ''));
      if (v.loai === 'hinh_tu_do' && Array.isArray(v.hinh)) v.hinh.forEach(function (h) { if (h) { if (h.kieu === 'chu') ds.push(String(h.noi_dung || '')); if (h.nhan) ds.push(String(h.nhan)); } });
      ds.forEach(function (x) {
        var dai = x.replace(/\\[a-zA-Z]+|[{}_^$]/g, '').length;
        if (dai > 24) loi.push('NHAN_QUA_DAI_CANH_' + (j + 1) + ': "' + x.slice(0, 40) + '" (' + dai + ' ký tự): nhãn/chữ trên hình tối đa ~22 ký tự (vd "u_1 = 3", "Tầng 1"); ý dài đưa vào lời thoại hoặc noi_dung_man_hinh.');
      });
    });
  });
  return loi;
}


// Cảnh có hình mà KHÔNG có chuyển động nào ngoài lúc xuất hiện (hình đứng yên như khối cứng suốt cảnh) -> nhắc thêm hành động.
function kiemTraHinhDungYen_(kb) {
  var loi = [];
  (kb.canh || []).forEach(function (c, j) {
    if (!c || !/mo_dau|de_bai|mo_hinh|y_do|diem_chot|tinh|kiem_tra|thu_nho|nhac_lai/.test(String(c.loai || ''))) return;
    var du = c.minh_hoa && c.minh_hoa.loai === 'san_khau' && c.minh_hoa.du_lieu;
    if (!du || !Array.isArray(du.vat) || !du.vat.length) return;
    var soHD = (Array.isArray(du.hanh_dong) ? du.hanh_dong : []).filter(function (h) { return h && Number(h.buoc) >= 1; }).length;
    var vatSau = du.vat.filter(function (v) { return v && Number(v.buoc) >= 2; }).length;
    var netSau = 0;
    du.vat.forEach(function (v) { if (v && Array.isArray(v.hinh)) v.hinh.forEach(function (h) { if (h && Number(h.buoc) >= 2) netSau++; }); });
    var tuDong = du.vat.some(function (v) { return v && Array.isArray(v.hinh) && v.hinh.some(function (h) { return h && h.kieu === 'xep_chong'; }); }) ? 1 : 0;   // chồng vật tự xếp từng tầng
    if (soHD + vatSau + netSau + tuDong < 2) loi.push('HINH_DUNG_YEN_CANH_' + (j + 1) + ': hình gần như đứng yên suốt cảnh. Thêm ít nhất 2 hành động khớp lời thoại (bien_hinh dời/xoay mảnh, tach/ghep, dem_tang, dat_gia_tri, chon, di_chuyen...) và tả chuyển động trong "mo_ta".');
  });
  return loi;
}
