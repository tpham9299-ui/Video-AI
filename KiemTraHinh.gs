/**
 * KIỂM TRA HÌNH MINH HỌA TRONG KỊCH BẢN (dán thành tệp KiemTraHinh.gs, cùng dự án với Code.gs)
 * Mục đích: bắt kịch bản mà phần mô tả hình minh họa thiếu/sai dạng NGAY khi viết, rồi buộc Gemini viết lại,
 * thay vì để bộ phận dựng video phải thay bằng "thẻ mô tả" nhàm chán.
 * Quy tắc phải khớp với src/bocuc.ts và src/sankhau/dulieu.ts của bộ phận dựng video.
 * Bản này thêm: kiểm tra "san_khau" (vật thật + hành động), tiêu đề cảnh, và tuSuaKichBan_() tự sửa lỗi vặt để đỡ gọi lại Gemini.
 */

var LOAI_VAT_ = ['nguoi', 'the', 'the_bai', 'xuc_xac', 'dong_xu', 'hop_bi', 'tui', 'hop_qua', 'dong_ho', 'dien_thoai', 'bong_bay',
  'dong_ho_do', 'bieu_do_cot', 'thanh', 'vong_quay', 'cua', 'banh', 'nhan', 'chu', 'so_dem', 'mui_ten', 'bieu_tuong', 'luoi_o', 'danh_sach'];
var KIEU_HANH_DONG_ = ['chon', 'loai_bo', 'sang', 'rung', 'quay', 'mo', 'lay_ra', 'dat_gia_tri', 'bung_ra', 'di_chuyen', 'phong_to', 'thu_nho', 'an', 'doi_chu', 'goc_3d'];
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
    if (h.kieu !== 'thu_nho' && h.kieu !== 'phong_to' && h.kieu !== 'goc_3d' && !ids[h.vat] && !(idCu && idCu[h.vat])) return 'HINH_' + cn + ', hanh_dong[' + k + ']: "vat" = "' + h.vat + '" không phải id của vật nào trên sân khấu.';
  }
  if (!hd.length && !(idCu && Object.keys(idCu).length)) return 'HINH_IT_CHUYEN_DONG_' + cn + ': mỗi cảnh san_khau cần ít nhất 1 hành động (chon, quay, mo, lay_ra, rung, bung_ra, phong_to...) ăn khớp lời thoại.';
  return '';
}

// Tự sửa lỗi vặt (không đổi nội dung bài): kẹp tọa độ, bỏ từ khóa không khớp tiêu đề, bỏ vật/hành động lạ, cắt chú thích dài.
function tuSuaKichBan_(kb) {
  if (!kb || !Array.isArray(kb.canh)) return;
  kb.canh.forEach(function (c, i) {
    if (!c) return;
    if (c.tieu_de_canh) c.tieu_de_canh = String(c.tieu_de_canh).replace(/\s+/g, ' ').trim().slice(0, 60);
    if (c.tu_khoa && (!c.tieu_de_canh || String(c.tieu_de_canh).toLowerCase().indexOf(String(c.tu_khoa).toLowerCase()) < 0)) c.tu_khoa = '';
    if (i === 0) c.giu_san_khau = false;
    if (Array.isArray(kb.bai_hoc_rut_ra)) kb.bai_hoc_rut_ra = kb.bai_hoc_rut_ra.slice(0, 3).map(function (x) { return String(x).slice(0, 90); });
    if (c.chuyen_canh && ['truot_len', 'phong', 'luot_ngang', 'truot_xuong', 'lat_3d'].indexOf(c.chuyen_canh) < 0) delete c.chuyen_canh;
    if (Array.isArray(c.chu_thich)) c.chu_thich = c.chu_thich.slice(0, 3).map(function (x) { return String(x).slice(0, 60); });
    var mh = c.minh_hoa;
    if (!laDT_(mh) || mh.loai !== 'san_khau' || !laDT_(mh.du_lieu)) return;
    var du = mh.du_lieu;
    if (Array.isArray(du.vat)) {
      du.vat = du.vat.filter(function (v) { return laDT_(v) && LOAI_VAT_.indexOf(v.loai) >= 0; });
      du.vat.forEach(function (v, k) {
        if (!laChuoi_(v.id)) v.id = 'v' + (i + 1) + '_' + k;
        ['x', 'y', 'x2', 'y2'].forEach(function (t) { if (v[t] !== undefined && laSo_(Number(v[t]))) v[t] = Math.min(98, Math.max(2, Number(v[t]))); });
        if ((v.loai === 'dong_ho_do' || v.loai === 'thanh' || v.loai === 'bong_bay') && Number(v.gia_tri) > 1 && Number(v.gia_tri) <= 100) v.gia_tri = Number(v.gia_tri) / 100;
      });
    }
    if (Array.isArray(du.hanh_dong)) du.hanh_dong = du.hanh_dong.filter(function (h) { return laDT_(h) && KIEU_HANH_DONG_.indexOf(h.kieu) >= 0; });
  });
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
  if (/^\s*(các bạn|mọi người|hôm nay|xin chào|chào|hello|hi\b)/i.test(c1.loi_thoai) || /^\s*(các bạn|mọi người|hôm nay)/i.test(kb.hook_chu)) return 'HOOK_YEU: hook không được mở bằng lời chào hay "hôm nay", "các bạn", "mọi người". Hãy mở bằng mâu thuẫn, tình huống hoặc câu hỏi cụ thể.';
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
  var m = /^(\d+)\/(\d+)$/.exec(String(dapAn).replace(/\s/g, ''));
  if (!m || !kb || !Array.isArray(kb.canh) || !kb.canh.length) return;
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
    if (/y_do|diem_chot/i.test(l)) co = true;
    if (/huong|tinh|thu_nho|diem_chot/i.test(l) && /^\s*(áp dụng|dùng|sử dụng|ta có)\s+(công thức|định lý|quy tắc)/i.test(String(c.loi_thoai || ''))) {
      return 'RAP_KHUON_CANH_' + (i + 1) + ': cảnh không được mở bằng "áp dụng công thức". Hãy nói vì sao nghĩ tới hướng này (ý đồ bài toán, quan sát) rồi mới nhắc công thức nếu cần.';
    }
  }
  if (!co) return 'THIEU_CANH_Y_DO: phải có ít nhất một cảnh loai "y_do" (bài toán thật sự hỏi gì) hoặc "diem_chot" (ý tưởng then chốt).';
  return '';
}

// Thay cho hopLeKichBan_ cũ trong Code.gs (xóa hàm cũ). Giữ các kiểm tra cũ, thêm kiểm tra hình minh họa.
function hopLeKichBan_(kb, dapAn) {
  if (!kb || !Array.isArray(kb.canh) || kb.canh.length < 6 || kb.canh.length > 12) return 'SO_CANH_NGOAI_6_DEN_12';
  // bài giảng phải kỹ: có phần bài học rút ra (cảnh bai_hoc cuối video) và cảnh tính toán
  if (!Array.isArray(kb.bai_hoc_rut_ra) || kb.bai_hoc_rut_ra.filter(function (x) { return String(x).trim().length >= 8; }).length < 2) return 'THIEU_BAI_HOC_RUT_RA: cần "bai_hoc_rut_ra" là mảng 3 câu ngắn (mỗi câu ≤ 12 từ) nêu quy tắc làm bài rút ra từ bài này.';
  if (!kb.canh.some(function (c) { return /tinh|giai/i.test(String(c.loai || '')); })) return 'THIEU_CANH_TINH_TOAN: bài giảng cần ít nhất một cảnh "tinh_toan" trình bày từng bước tính có giải thích.';
  if (!/bai_hoc|ket_luan|chot/i.test(String(kb.canh[kb.canh.length - 1].loai || ''))) return 'THIEU_CANH_BAI_HOC: cảnh cuối phải là "bai_hoc" (điều rút ra, dấu hiệu nhận dạng, câu hỏi biến thể).';
  var tong = 0, coHinh = 0;
  for (var i = 0; i < kb.canh.length; i++) {
    var c = kb.canh[i];
    if (!c.loi_thoai || !String(c.loi_thoai).trim()) return 'THIEU_LOI_THOAI_CANH_' + (i + 1);
    if (/[\\$]/.test(c.loi_thoai)) return 'LOI_THOAI_CHUA_LATEX_CANH_' + (i + 1);
    tong += uocGiayDoc_(c.loi_thoai);
  }
  if (/^\s*(xin\s+)?chào/i.test(kb.canh[0].loi_thoai)) return 'MO_DAU_BANG_LOI_CHAO';
  if (tong > Number(cauHinh_('GIAY_TOI_DA'))) return 'QUA_DAI_' + tong + '_GIAY';
  if (String(kb.dap_an_cuoi).replace(/\s/g, '') !== dapAn) return 'DAP_AN_CUOI_SAI';

  var idTruoc = {}, soSanKhau = 0;
  for (var j = 0; j < kb.canh.length; j++) {
    var cj = kb.canh[j];
    var laSK = cj.minh_hoa && cj.minh_hoa.loai === 'san_khau';
    var idCu = laSK && cj.giu_san_khau ? idTruoc : null;
    var loi = kiemTraMinhHoa_(cj.minh_hoa, j + 1, idCu);
    if (loi) return loi;
    if (j > 0 && String(cj.tieu_de_canh || '').trim().length < 6) return 'THIEU_TIEU_DE_CANH_' + (j + 1) + ': từ cảnh 2, mỗi cảnh cần "tieu_de_canh" 3-8 từ (câu tiêu đề lớn ở đầu cảnh) và "tu_khoa" nằm nguyên văn trong đó.';
    if (demTu_(cj.tieu_de_canh) > 10) return 'TIEU_DE_CANH_DAI_' + (j + 1) + ': "tieu_de_canh" tối đa 8-10 từ.';
    if (laSK) {
      soSanKhau++;
      var moi = {};
      if (cj.giu_san_khau) Object.keys(idTruoc).forEach(function (k) { moi[k] = true; });
      cj.minh_hoa.du_lieu.vat.forEach(function (v) { moi[v.id] = true; });
      idTruoc = moi;
    } else idTruoc = {};
    if (cj.minh_hoa && cj.minh_hoa.loai && cj.minh_hoa.loai !== 'khong') {
      coHinh++;
      if (String(cj.minh_hoa.mo_ta || '').trim().length < 40) return 'MO_TA_HINH_QUA_NGAN_CANH_' + (j + 1) + ': "mo_ta" của hình phải chi tiết (ít nhất 40 ký tự): hình gồm những gì, đặt ở đâu, màu gì, hiện theo thứ tự nào, nhấn mạnh gì khi lời thoại nói tới.';
    }
  }
  var loiLa = noiDungLa_(kb);
  if (loiLa) return loiLa;
  var loiDay = kiemTraCachDay_(kb);
  if (loiDay) return loiDay;
  var loiTB = kiemTraTrinhBay_(kb);
  if (loiTB) return loiTB;
  var loiCT = kiemTraChuThich_(kb);
  if (loiCT) return loiCT;
  var loiHook = kiemTraHook_(kb);
  if (loiHook) return loiHook;
  var canDA = kb.canh[timCanhDapAn_(kb)];
  var dsDA = canDA.noi_dung_man_hinh || [];
  var psDA = cacPhanSo_(dsDA.length ? String(dsDA[dsDA.length - 1]) : '');
  var mDA = /^(\d+)\/(\d+)$/.exec(String(dapAn).replace(/\s/g, ''));
  if (mDA && psDA.length && (psDA[psDA.length - 1][0] * Number(mDA[2]) !== psDA[psDA.length - 1][1] * Number(mDA[1]))) return 'DAP_AN_SAI_TREN_MAN_HINH: phân số cuối cùng ở dòng cuối của cảnh đáp án không bằng ' + dapAn + '.';
  var can = Math.max(3, Math.ceil(kb.canh.length / 2));
  if (coHinh < can) return 'IT_HINH_MINH_HOA: chỉ có ' + coHinh + ' cảnh có hình minh họa, cần ít nhất ' + can + '. Cảnh đề bài, bẫy, hướng giải, tính toán nên có hình.';
  var canSK = Math.min(3, kb.canh.length - 2);
  if (soSanKhau < canSK) return 'IT_SAN_KHAU: chỉ có ' + soSanKhau + ' cảnh dùng "san_khau" (vật thật chuyển động), cần ít nhất ' + canSK + ' (mo_dau, de_bai, bay, dap_an nên là san_khau).';
  return '';
}
