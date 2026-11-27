#!/usr/bin/env python3
"""Kiểm thử Việc 1 — Thông tuyến BP2 & Tự cứu Tầng 2 / TeX / Đáp số (0 tốn API).

Tái hiện đủ 4 ca lỗi thực tế từ log sản xuất:
  1. KHUNG4TANG_3D_RONG tự chuyển tuyến `tu_sinh_svg`, số lần gọi AI sửa <= 1 (không hủy BO_KHONG_DAT).
  2. `t2_trong` (ngay từ cảnh 2 `de_bai`) và `hinh_dung_im` được `du_phong_t2.py` tự cứu sạch,
     chạy qua hộp cát `tu_sinh_svg.py` 0 lỗi (gồm mọi từ khóa + nhánh không khớp từ khóa `so_do_du_kien` + chốt cuối `chuanbi.py`).
  3. Cả 3 chuỗi TeX vỡ thực tế (`\\text{Chứng minh ba điểm K, H, M thẳng`, `2\\text{`,
     `\\text{Cố định An }|\\color{#FACC15}t|\\te`) được tự vá sạch trước bước kiểm duyệt `TEX_LENH_CUT`,
     các hàm cắt gọn không cắt ngang lệnh `\\` hay ngoặc `{...}`/`(...)`, và trần sửa AI cú pháp TeX <= 1.
  4. Cảnh `dap_an` thiếu đáp số `0.8165` (kể cả khi có số `1` gây nhiễu) tự được điền đáp số bằng code thuần.

Chạy: python -X utf8 scripts/test_viec1_tu_cuu.py
"""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

GOC = Path(__file__).resolve().parent.parent
SCRIPTS = GOC / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

import du_phong_t2
import khung4tang_v93 as v93
import khung4tang_v96 as v96
import tu_sinh_svg

DAT = 0
HONG = []


def thu(ten, fn):
    global DAT
    try:
        fn()
        DAT += 1
        print(f"  ✓ {ten}")
    except Exception as e:
        HONG.append(f"{ten}: {e}")
        print(f"  ✗ {ten} — {e}")


def _chay_node(ma_js):
    r = subprocess.run(
        ["node", "-e", ma_js],
        cwd=str(GOC),
        capture_output=True,
        text=True,
        encoding="utf8",
        timeout=45,
    )
    if r.returncode != 0:
        raise AssertionError(f"Node exit {r.returncode}: {(r.stderr or r.stdout)[-400:]}")
    return r.stdout.strip()


def _kb_mau(mon="THUC_TE", de_bai="", dap_an="0.8165", so_buoc=4):
    canh = [
        {"so": 1, "loai": "mo_dau", "tieu_de_canh": "Bài toán mở đầu", "loi_thoai": "Bài toán thực tế này giải thế nào cho nhanh nhất?", "noi_dung_man_hinh": []},
        {"so": 2, "loai": "de_bai", "tieu_de_canh": "Tóm tắt đề bài", "loi_thoai": "Đề bài cho số liệu rõ ràng và yêu cầu tìm giá trị tối ưu.", "noi_dung_man_hinh": []},
        {"so": 3, "loai": "tinh_toan", "tieu_de_canh": "Thiết lập công thức", "loi_thoai": "Ta gọi ẩn và lập biểu thức theo điều kiện của đề bài.", "noi_dung_man_hinh": ["f(x) = 2x + 1"]},
        {"so": 4, "loai": "dap_an", "tieu_de_canh": "Chốt kết quả", "loi_thoai": "Kết quả tính ra là không phẩy tám một sáu năm.", "noi_dung_man_hinh": ["P = 1 - P(\\overline{A})"]},
        {"so": 5, "loai": "ket_luan", "tieu_de_canh": "Tổng kết", "loi_thoai": "Lưu lại ngay để áp dụng nhé!", "noi_dung_man_hinh": []},
    ]
    buoc = []
    for i in range(so_buoc):
        ci = min(len(canh) - 1, i + 1)
        buoc.append({
            "canh": ci + 1,
            "nhan": ["Đề bài", "Thiết lập", "Bẫy & tính", "Kết luận"][min(i, 3)],
            "tieu_de": f"Bước phân tích {i + 1}",
            "khi_noi": " ".join(canh[ci]["loi_thoai"].split()[:4]),
            "the": [{"loai": "cong_thuc", "dong": [f"x_{i + 1} = {i + 1}"]}],
        })
    return {
        "id": "TT-VIEC1-TEST",
        "mon": mon,
        "lop": "12",
        "de_bai": de_bai or "Một cửa hàng thiết kế khu trưng bày đặc biệt theo quy tắc riêng, tính thông số tối ưu.",
        "dap_an": dap_an,
        "dap_an_cuoi": dap_an,
        "canh": canh,
        "khung4tang": {
            "de_ghim": [{"id": "d1", "nhan": "x > 0"}],
            "buoc": buoc,
        },
    }


# =============================================================================
# 1. CA 1: KHUNG4TANG_3D_RONG tự chuyển tuyến tu_sinh_svg, số lần gọi AI sửa <= 1
# =============================================================================
print("1. Ca 1 — Chặn định tuyến 3D nhầm & tự chuyển tuyến KHUNG4TANG_3D_RONG (AI <= 1 lần)")


def test_dinh_tuyen_3d_khong_nham():
    # Bài THUC_TE không khớp 8 khuôn 3D (kể cả khi AI gắn nhầm canh_3d_vector) -> tu_sinh_svg ở cả Python & JS
    kb_la = {
        "id": "TT-LA-01",
        "mon": "THUC_TE",
        "lop": "12",
        "de_bai": "Bác Nam chia mảnh vườn hình chữ nhật rộng 20 m thành ba luống hoa có lối đi rộng x m, tìm diện tích trồng hoa.",
        "khung4tang": {"canh_3d_vector": {"khuon": "tam_bia_gap_hop", "tham_so": {}}, "buoc": []},
    }
    q_py = v96.chon_san_khau(kb_la)
    assert q_py["loai"] == "tu_sinh_svg", f"Python định tuyến nhầm: {q_py}"

    # Bài khớp rõ 1 trong 8 khuôn 3D -> vẫn giữ 3d_vector
    kb_hop = {
        "id": "TT-HOP-01",
        "mon": "THUC_TE",
        "lop": "12",
        "de_bai": "Từ tấm bìa hình chữ nhật 30 cm x 20 cm, cắt bỏ 4 hình vuông cạnh x ở bốn góc rồi gấp thành hộp không nắp. Tìm x để thể tích lớn nhất.",
        "khung4tang": {"buoc": []},
    }
    q_hop = v96.chon_san_khau(kb_hop)
    assert q_hop["loai"] == "3d_vector", f"Python mất khuôn 3D chuẩn: {q_hop}"

    # Đối chiếu bản JS (SanKhau.gs + KiemTraHinh.gs)
    out = _chay_node(r"""
      const fs = require('fs'), vm = require('vm');
      const ctx = {console, JSON, Math, Date, RegExp, Object, Array, String, Number};
      vm.createContext(ctx);
      for (const f of ['KiemTraHinh.gs', 'SanKhau.gs']) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, {filename: f});
      const kbLa = %s;
      const kbHop = %s;
      const r1 = ctx.chonSanKhau_(kbLa, {});
      const r2 = ctx.chonSanKhau_(kbHop, {});
      console.log(JSON.stringify({r1, r2}));
    """ % (json.dumps(kb_la, ensure_ascii=False), json.dumps(kb_hop, ensure_ascii=False)))
    kq = json.loads(out)
    assert kq["r1"]["loai"] == "tu_sinh_svg", f"JS định tuyến nhầm: {kq['r1']}"
    assert kq["r2"]["loai"] == "3d_vector", f"JS mất khuôn 3D chuẩn: {kq['r2']}"


def test_bp2_chuyen_tuyen_va_tu_cuu_khung3d_rong():
    # Tái hiện vòng lặp BP2 (xuLyKichBan_) khi AI trả kịch bản thiếu canh_3d_vector -> KHUNG4TANG_3D_RONG
    # và AI viết tu_sinh bị lỗi hộp cát -> kiểm tra: chuyển sang tu_sinh_svg, gọi AI sửa hình <= 1 lần,
    # sau đó tự cứu bằng du_phong_t2.py (tu_cuu_t2: true) và lưu CO_KICH_BAN (KHÔNG vứt BO_KHONG_DAT).
    out = _chay_node(r"""
      const fs = require('fs'), path = require('path'), vm = require('vm');
      const {execFileSync} = require('child_process');
      const GOC = process.cwd();
      let soLanGoiViet = 0, soLanGoiTuSinh = 0, soLanGoiSuaChung = 0;
      const logs = [];
      const driveFiles = {};
      const props = {};
      const cache = {};
      function taoSheet(ten, data) {
        return {
          data,
          getLastRow: () => data.length,
          getDataRange: () => ({getValues: () => data.map(r => r.slice())}),
          getRange: (r, c, nr=1, nc=1) => ({
            setValue: (v) => { while (data.length < r) data.push([]); data[r-1][c-1] = v; },
            setValues: (vs) => vs.forEach((row, i) => row.forEach((v, j) => { while (data.length < r+i) data.push([]); data[r+i-1][c+j-1] = v; })),
            getValues: () => Array.from({length: nr}, (_, i) => Array.from({length: nc}, (_, j) => (data[r+i-1] || [])[c+j-1] ?? '')),
            getValue: () => (data[r-1] || [])[c-1] ?? '',
          }),
          appendRow: (r) => data.push(r.slice()),
          getName: () => ten,
        };
      }
      const thuMuc = {
        getFilesByName: (n) => { let d = false; return {hasNext: () => n in driveFiles && !d, next: () => { d = true; return {setContent: c => driveFiles[n]=c, getBlob: () => ({getDataAsString: () => driveFiles[n]}), setTrashed: () => delete driveFiles[n], getId: () => n}; }}; },
        createFile: (n, c) => { driveFiles[n] = c; return {getId: () => n}; },
      };
      const ctx = {
        console, JSON, Math, Date, RegExp, Object, Array, String, Number, Buffer,
        PropertiesService: {getScriptProperties: () => ({getProperty: k => props[k] ?? null, setProperty: (k,v) => props[k]=String(v), deleteProperty: k => delete props[k], getProperties: () => ({...props})})},
        CacheService: {getScriptCache: () => ({get: k => cache[k] || null, put: (k,v) => cache[k]=String(v), remove: k => delete cache[k]})},
        LockService: {getScriptLock: () => ({tryLock: () => true, releaseLock: () => {}})},
        Utilities: {sleep: () => {}, formatDate: () => '2026-11-27'},
        Logger: {log: () => {}},
        MimeType: {PLAIN_TEXT: 'text/plain'},
        DriveApp: {getFileById: () => ({setTrashed: () => {}})},
        kiemTuSinhMay_: (kb) => {
          try {
            const ra = execFileSync('python', ['-X', 'utf8', path.join(GOC, 'scripts', 'tu_sinh_svg.py'), '-', '--chi-kiem'],
              {input: JSON.stringify(kb), encoding: 'utf8', timeout: 25000});
            return JSON.parse(ra);
          } catch (e) {
            if (e.status === 2 && e.stdout) return JSON.parse(e.stdout);
            return {ok: false, loi: 'ERR'};
          }
        },
        duPhongT2May_: (kb) => {
          const ra = execFileSync('python', ['-X', 'utf8', path.join(GOC, 'scripts', 'du_phong_t2.py'), '-'],
            {input: JSON.stringify(kb), encoding: 'utf8', timeout: 25000});
          return JSON.parse(ra);
        },
      };
      vm.createContext(ctx);
      for (const f of ['BoPhan1.gs', 'PromptKichBan.gs', 'KiemTraHinh.gs', 'NangCao.gs', 'HinhHoc.gs', 'SanKhau.gs']) {
        vm.runInContext(fs.readFileSync(path.join(GOC, f), 'utf8'), ctx, {filename: f});
      }
      const COT = ctx.COT;
      const hang = {
        id: 'TT-3DRONG', trang_thai: 'DA_GIAI', lop: '12', mon: 'THUC_TE',
        de_bai: 'Thiết kế bồn hoa hình thang với lối đi cắt ngang rộng x mét để diện tích trồng hoa đạt giá trị tối ưu.',
        dap_an: '12.5', dap_an_hien: '12,5 m²',
        cach_1: JSON.stringify({dap_an: '12.5', cac_buoc: ['Đặt ẩn x > 0', 'Lập diện tích S(x)', 'Tìm giá trị lớn nhất', 'Chốt 12,5 m²']}),
        cach_2: JSON.stringify({dap_an: '12.5', y_tuong: 'Biểu diễn diện tích theo x rồi tìm cực đại', cac_buoc: ['Đặt x', 'Lập S(x)', 'Đỉnh 12,5']}),
        so_lan_loi: 0,
      };
      const shHD = taoSheet('HANG_DOI', [COT.slice(), COT.map(k => hang[k] ?? '')]);
      const shCH = taoSheet('CAU_HINH', [['khoa', 'gia_tri'], ['AUTO_FIX_KICH_BAN', 'BAT'], ['AI_DUYET_KICH_BAN', 'TAT'], ['SO_LAN_SUA_KICH_BAN', '2']]);
      ctx.SpreadsheetApp = {getActiveSpreadsheet: () => ({getSheetByName: n => n === 'HANG_DOI' ? shHD : n === 'CAU_HINH' ? shCH : null}), flush: () => {}};
      ctx.nhatKy_ = (m, s) => logs.push(m + ': ' + s);
      ctx.thuMucKichBan_ = () => thuMuc;
      ctx.conDuGoiGemini_ = () => true;
      ctx.capNhatTb_ = () => {};
      ctx.aiDuyetKichBan_ = () => ({dat: true, phan_tram: 95, van_de: [], nang: [], gop_y: '', chi_tiet: {}});
      ctx.boSungGiaiThichCongThuc_ = () => null;
      ctx.goiGemini_ = (p) => {
        if (/họa sĩ minh họa toán 2\.5D/i.test(p)) {
          soLanGoiTuSinh++;
          // Cố tình trả mã lỗi hộp cát (import os) để buộc hệ thống tự cứu bằng du_phong_t2.py sau tối đa 1 lượt sửa
          return {ma: 'import os\ndef ve(): return []', mo_ta: 'mã lỗi cố tình'};
        }
        if (/NHIỆM VỤ BÂY GIỜ: SỬA KỊCH BẢN/.test(p)) {
          soLanGoiSuaChung++;
        } else {
          soLanGoiViet++;
        }
        return {
          tieu_de: 'Tối ưu bồn hoa', tieu_de_bia: 'Tối ưu bồn hoa',
          hook: 'Bồn hoa tối ưu bao nhiêu?', hook_chu: 'Bồn hoa tối ưu?', hook_kieu: 'cau_hoi',
          nhan_manh: ['tối ưu'], dap_an_cuoi: '12.5',
          de_cho: ['Chiều rộng lối đi x'], can_tim: 'Diện tích tối ưu',
          bai_hoc_rut_ra: ['Đặt ẩn theo điều kiện đề bài.', 'Tìm cực trị bằng bảng biến thiên.'],
          canh: [
            {so: 1, loai: 'mo_dau', tieu_de_canh: 'Đặt vấn đề', loi_thoai: 'Làm sao thiết kế bồn hoa có diện tích tối ưu?', noi_dung_man_hinh: []},
            {so: 2, loai: 'de_bai', tieu_de_canh: 'Phân tích đề', loi_thoai: 'Đề cho bồn hoa có lối đi cắt ngang rộng x mét cần tìm diện tích tối ưu.', noi_dung_man_hinh: []},
            {so: 3, loai: 'tinh_toan', tieu_de_canh: 'Đặt ẩn và lập hàm', loi_thoai: 'Gọi ẩn x dương rồi lập hàm diện tích theo x và xét dấu đổi từ dương sang âm.', noi_dung_man_hinh: ['S(x) = 25 - 2x']},
            {so: 4, loai: 'dap_an', tieu_de_canh: 'Chốt đáp án', loi_thoai: 'Vậy diện tích lớn nhất là 12,5 mét vuông.', noi_dung_man_hinh: ['S_{max} = 12{,}5']},
            {so: 5, loai: 'ket_luan', tieu_de_canh: 'Ghi nhớ', loi_thoai: 'Lưu lại ngay mẹo này nhé!', noi_dung_man_hinh: []},
          ],
          khung4tang: {
            de_ghim: [{id: 'd1', nhan: 'x > 0'}],
            canh_3d_vector: {doi_tuong: [], buoc: []},
            buoc: [
              {canh: 2, nhan: 'Đề bài', tieu_de: 'Đọc dữ kiện', khi_noi: 'Đề cho bồn hoa', the: [{loai: 'cong_thuc', dong: ['x > 0']}, {loai: 'chu', noi_dung: 'Tìm S max'}]},
              {canh: 3, nhan: 'Lập hàm', tieu_de: 'Gọi ẩn x và lập hàm', khi_noi: 'Gọi ẩn x dương', the: [{loai: 'cong_thuc', dong: ['S(x) = 25 - 2x']}, {loai: 'chu', noi_dung: 'Xét dấu đổi dấu'}]},
              {canh: 4, nhan: 'Kết luận', tieu_de: 'Chốt kết quả', khi_noi: 'Vậy diện tích lớn nhất', the: [{loai: 'cong_thuc', dong: ['S_{max} = 12{,}5']}, {loai: 'chu', noi_dung: 'Đạt cực đại'}]},
            ],
          },
        };
      };
      const bc = {kich_ban: 0, loai: 0, loi: 0};
      ctx.xuLyKichBan_(shHD, bc, Date.now(), false, ['TT-3DRONG']);
      const st = shHD.data[1][COT.indexOf('trang_thai')];
      const gc = shHD.data[1][COT.indexOf('ghi_chu')];
      const kbSaved = driveFiles['TT-3DRONG.json'] ? JSON.parse(driveFiles['TT-3DRONG.json']) : null;
      console.log(JSON.stringify({
        st, gc, bc, soLanGoiViet, soLanGoiTuSinh, soLanGoiSuaChung,
        san_khau_dich: kbSaved && kbSaved.san_khau_dich,
        tu_cuu_t2: kbSaved && kbSaved.tu_cuu_t2,
        co_ma: Boolean(kbSaved && kbSaved.khung4tang && kbSaved.khung4tang.tu_sinh && kbSaved.khung4tang.tu_sinh.ma),
        co_log_tu_cuu: logs.some(x => /tu_cuu_t2: true/.test(x)),
      }));
    """)
    kq = json.loads(out)
    assert kq["st"] == "CO_KICH_BAN", f"Không lưu được CO_KICH_BAN: {kq}"
    assert "BO_KHONG_DAT" not in str(kq["gc"]), f"Bị hủy oan BO_KHONG_DAT: {kq}"
    assert kq["san_khau_dich"] == "tu_sinh_svg", f"Chưa chuyển tuyến tu_sinh_svg: {kq}"
    assert kq["tu_cuu_t2"] is True and kq["co_log_tu_cuu"], f"Thiếu cờ tu_cuu_t2: {kq}"
    assert kq["co_ma"] is True, f"Thiếu mã tu_sinh tự cứu: {kq}"
    # Số lần AI sửa (sau lần tạo đầu) <= 1 (tổng soLanGoiTuSinh <= 2: 1 tạo + 1 sửa, soLanGoiSuaChung == 0)
    assert kq["soLanGoiTuSinh"] <= 2 and kq["soLanGoiSuaChung"] == 0, f"Gọi AI sửa quá nhiều: {kq}"


thu("chonSanKhau_ (Python + JS): THUC_TE không khớp 8 khuôn 3D -> tu_sinh_svg, khớp rõ -> 3d_vector", test_dinh_tuyen_3d_khong_nham)
thu("BP2 xuLyKichBan_: KHUNG4TANG_3D_RONG tự chuyển tuyến tu_sinh_svg, AI sửa <= 1 lần, tự cứu -> CO_KICH_BAN", test_bp2_chuyen_tuyen_va_tu_cuu_khung3d_rong)


# =============================================================================
# 2. CA 2: t2_trong (ngay từ cảnh de_bai) & hinh_dung_im -> du_phong_t2.py + hộp cát 0 lỗi
# =============================================================================
print("2. Ca 2 — du_phong_t2.py tự cứu t2_trong (từ cảnh de_bai) & hinh_dung_im qua hộp cát 0 lỗi")


def test_du_phong_moi_tu_khoa_va_khong_khop():
    ca_de = [
        ("THUC_TE", "Quán bán trà sữa lợi nhuận tối đa khi giảm giá vé.", "bieu_do_loi_nhuan"),
        ("THUC_TE", "Bể nước có vòi chảy vào làm mực nước dâng dần theo thời gian.", "be_nuoc_muc_chat_long"),
        ("THUC_TE", "Một ô tô đang chuyển động với vận tốc 20 m/s thì hãm phanh.", "xe_di_chuyen"),
        ("THUC_TE", "Gửi tiết kiệm ngân hàng với lãi suất kép 6% mỗi năm.", "tui_tien_lai_suat"),
        ("THUC_TE", "Khu vườn hình chữ nhật có hàng rào và lối đi bao quanh.", "hop_chu_nhat_3d"),
        ("THUC_TE", "Đồng hồ kim giờ và kim phút gặp nhau sau bao nhiêu phút?", "dong_ho_thoi_gian"),
        ("THUC_TE", "Một kiến trúc sư phân bổ 5 điểm phát sóng theo quy tắc riêng.", "so_do_du_kien"),
        ("XAC_SUAT", "Hộp kín chứa 4 viên bi đỏ và 5 viên bi xanh, chọn ngẫu nhiên 2 bi.", "hop_bi_mau"),
        ("XAC_SUAT", "Gieo hai con xúc xắc cân đối đồng chất, tính xác suất tổng bằng 7.", "xuc_xac_1_6"),
        ("XAC_SUAT", "Tung đồng xu 3 lần liên tiếp, tính xác suất có ít nhất 2 mặt ngửa.", "dong_xu"),
        ("XAC_SUAT", "Rút ngẫu nhiên 3 tấm thẻ đánh số từ 1 đến 12.", "la_bai_the_so"),
        ("XAC_SUAT", "Xét nghiệm y tế bằng công thức Bayes với tỉ lệ dương tính giả 5%.", "nut_cay_xac_suat"),
        ("XAC_SUAT", "Xếp 6 học sinh ngồi vào một hàng ghế sao cho An và Bình ngồi cạnh nhau.", "so_do_du_kien"),
    ]
    for mon, de, manh_mong in ca_de:
        kb = _kb_mau(mon=mon, de_bai=de, dap_an="0.8165", so_buoc=4)
        kq = du_phong_t2.cuu_kb_t2(kb)
        assert kq["ok"] is True, f"cuu_kb_t2 lỗi với {mon}/{manh_mong}"
        assert kq["manh"] == manh_mong, f"Chọn sai mảnh cho '{de}': {kq['manh']} != {manh_mong}"
        assert kq["tu_cuu_t2"] is True and kb.get("tu_cuu_t2") is True
        ma = kb["khung4tang"]["tu_sinh"]["ma"]
        lop = tu_sinh_svg.dung(ma, 4, tham_my=True, can_hinh=True, can_vat=True)
        assert len(lop) == 4, f"Số lớp sai: {len(lop)}"
        # Kiểm tra bước 0 có hình hợp lệ (không bị t2_trong ngay từ cảnh 2 de_bai)
        assert tu_sinh_svg.co_hinh_t2([lop[0]], can_vat=True), f"Bước 0 thiếu hình T2: {manh_mong}"
        # Kiểm tra biểu cảm người que đổi đủ chuỗi gai_dau -> chi_bang -> aha/canh_bao -> hoan_ho và SVG đổi ở MỌI bước (chống hinh_dung_im)
        svgs = [l["svg"] for l in lop]
        assert len(set(svgs)) == 4, f"Có bước trùng hình (hinh_dung_im): {manh_mong}"
        assert "nguoi_que_gai_dau" in svgs[0]
        assert "nguoi_que_chi_bang" in svgs[1]
        assert ("nguoi_que_aha" in svgs[2] or "nguoi_que_canh_bao" in svgs[2])
        assert "nguoi_que_hoan_ho" in svgs[3]

    # Kiểm tra bài nhiều bước (8 bước) vẫn <= TOI_DA_LOP (14) và qua hộp cát 0 lỗi
    kb8 = _kb_mau(mon="THUC_TE", de_bai="Bài tối ưu lợi nhuận cửa hàng 8 bước.", so_buoc=8)
    kq8 = du_phong_t2.cuu_kb_t2(kb8)
    assert kq8["ok"] and kq8["so_lop"] == 8


def test_chuanbi_tu_cuu_t2_trong_tu_canh_de_bai():
    # Chạy thật scripts/chuanbi.py --gia-lap trên kịch bản THUC_TE bị thiếu hình T2 (t2_trong) + thiếu đáp số dap_an
    kb = _kb_mau(
        mon="THUC_TE",
        de_bai="Một kỹ sư tối ưu thiết bị theo quy tắc đặc biệt để đạt chỉ số tối ưu.",
        dap_an="0.8165",
        so_buoc=4,
    )
    # Cố tình để thiếu tu_sinh / san_khau / canh_3d_vector (gây t2_trong)
    with tempfile.TemporaryDirectory(prefix="viec1_cb_") as td:
        kb_p = Path(td) / "kb_thieu_t2.json"
        props_p = Path(td) / "props.json"
        kb_p.write_text(json.dumps(kb, ensure_ascii=False), encoding="utf8")
        r = subprocess.run(
            [sys.executable, "-X", "utf8", str(SCRIPTS / "chuanbi.py"), str(kb_p), "--gia-lap", "--props-ra", str(props_p), "--out-dir", td],
            cwd=str(GOC),
            capture_output=True,
            text=True,
            encoding="utf8",
            timeout=60,
        )
        assert r.returncode == 0, f"chuanbi.py thất bại (rc={r.returncode}): {(r.stderr or r.stdout)[-400:]}"
        assert "tu_cuu_t2: true" in (r.stdout or ""), f"Thiếu log tu_cuu_t2: true trong stdout: {(r.stdout or '')[-300:]}"
        props = json.loads(props_p.read_text(encoding="utf8"))
        k4 = props.get("khung4tang") or {}
        ts = k4.get("tuSinh") or {}
        assert ts.get("tuCuuT2") is True, f"props.khung4tang.tuSinh thiếu tuCuuT2: {ts.keys()}"
        assert not k4.get("tuSinhHong"), f"Vẫn còn cờ tuSinhHong: {k4.get('tuSinhHong')}"
        lop = ts.get("lop") or []
        assert len(lop) >= 3, f"Quá ít lớp tuSinh: {len(lop)}"
        # Cảnh 2 (de_bai) bắt buộc có hình ở t = 0
        assert lop[0]["t"] == 0, f"Lớp bước 0 chưa hiển thị ngay từ cảnh de_bai (t={lop[0]['t']})"
        assert len({l["svg"] for l in lop}) == len(lop), "Có lớp trùng hình gây hinh_dung_im"


thu("du_phong_t2.py: đủ 11 mô hình kho_manh_svg + sơ đồ dữ kiện (0 khớp) + 8 bước qua hộp cát 0 lỗi", test_du_phong_moi_tu_khoa_va_khong_khop)
thu("chuanbi.py --gia-lap: tự cứu t2_trong, log tu_cuu_t2: true, hiện hình ngay từ cảnh de_bai (t=0)", test_chuanbi_tu_cuu_t2_trong_tu_canh_de_bai)


# =============================================================================
# 3. CA 3: Tự vá 3 chuỗi TEX_LENH_CUT thực tế & chống cắt ngang lệnh/ngoặc
# =============================================================================
print("3. Ca 3 — Tự vá 3 chuỗi TEX_LENH_CUT thực tế, chống cắt ngang lệnh/ngoặc & trần AI <= 1")

CHUOI_TEX_THUC_TE = [
    r"\text{Chứng minh ba điểm K, H, M thẳng",
    r"2\text{",
    r"\text{Cố định An }|\color{#FACC15}t|\te",
]


def test_tu_va_3_chuoi_tex_python_va_js():
    # Bản Python (khung4tang_v96.py)
    for goc in CHUOI_TEX_THUC_TE:
        da_va = v96.va_cu_phap_tex(goc)
        assert da_va, f"Vá ra rỗng cho {goc!r}"
        assert v96.kiem_tra_tex_hop_le(da_va), f"Python vá xong vẫn không hợp lệ: {goc!r} -> {da_va!r}"
        assert "\\te" not in da_va and "\\text{" not in da_va and "\\color{" not in da_va, f"Còn lộ mã thô: {goc!r} -> {da_va!r}"

    # Công thức toán thật vẫn giữ nguyên sạch sẽ
    assert v96.va_cu_phap_tex(r"\text{Đáp số: } 0{,}8165") == r"\text{Đáp số: } 0{,}8165"
    assert v96.va_cu_phap_tex(r"P(A) = \dfrac{5}{22}") == r"P(A) = \dfrac{5}{22}"

    # Chạy cong_loc_som trên kịch bản chứa đủ 3 chuỗi vỡ -> tự vá sạch trước khi chấm, 0 lỗi TEX_
    kb = _kb_mau(mon="XAC_SUAT", de_bai="Xếp 5 bạn ngồi hàng ngang có An cố định.", dap_an="0.8165")
    kb["canh"][2]["noi_dung_man_hinh"] = list(CHUOI_TEX_THUC_TE)
    kb["khung4tang"]["buoc"][1]["the"] = [{"loai": "cong_thuc", "dong": list(CHUOI_TEX_THUC_TE)}]
    du_phong_t2.cuu_kb_t2(kb)
    loi = v96.cong_loc_som(kb)
    assert loi == "", f"cong_loc_som vẫn báo lỗi sau khi tự vá: {loi}"

    # Kiểm tra các hàm cắt gọn không cắt ngang lệnh \ hoặc cặp ngoặc (...)/{...}
    cat1 = v93.cat_tu("Tính xác suất (chọn hai bạn nữ cạnh nhau) trong lớp", 22)
    assert cat1.count("(") == cat1.count(")"), f"cat_tu cắt hở ngoặc: {cat1!r}"
    cat2 = v96.cat_bien_tu("Biến cố (An và Bình ngồi cạnh nhau) luôn đúng", 16)
    assert cat2.count("(") == cat2.count(")"), f"cat_bien_tu cắt hở ngoặc: {cat2!r}"
    assert v93.cat_nhan(r"\text{Chứng minh ba điểm K, H, M thẳng", 50) == "Chứng minh ba điểm K, H, M thẳng"

    # Bản JS (KiemTraHinh.gs + SanKhau.gs)
    out = _chay_node(r"""
      const fs = require('fs'), vm = require('vm');
      const ctx = {console, JSON, Math, Date, RegExp, Object, Array, String, Number};
      vm.createContext(ctx);
      for (const f of ['KiemTraHinh.gs', 'SanKhau.gs']) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, {filename: f});
      const ds = %s;
      const kq = ds.map(s => {
        const v = ctx.suaCuPhapTex_(s);
        return {goc: s, va: v, ok: ctx.kiemTraTexHopLe_(v).ok};
      });
      const kb = %s;
      const loiPF = ctx.congLocSomBP2_(kb, {dap_an: '0.8165', mon: 'XAC_SUAT'});
      const loiTex = ctx.kiemTraCuPhapTex_(kb);
      const catNgoac = ctx.catTheoTu_('Xét biến cố (An ngồi đầu hàng bên trái) nhé', 22);
      console.log(JSON.stringify({kq, loiPF, loiTex, catNgoac}));
    """ % (json.dumps(CHUOI_TEX_THUC_TE, ensure_ascii=False), json.dumps(kb, ensure_ascii=False)))
    j = json.loads(out)
    for item in j["kq"]:
        assert item["ok"] is True, f"JS vá xong vẫn lỗi: {item}"
        assert "\\te" not in item["va"] and "\\text{" not in item["va"] and "\\color{" not in item["va"], f"JS còn lộ mã thô: {item}"
    assert not any("TEX_" in x for x in j["loiTex"]), f"JS kiemTraCuPhapTex_ vẫn còn lỗi: {j['loiTex']}"
    assert not any("TEX_" in x for x in j["loiPF"]), f"JS congLocSomBP2_ vẫn còn lỗi TeX: {j['loiPF']}"
    assert j["catNgoac"].count("(") == j["catNgoac"].count(")"), f"JS catTheoTu_ cắt hở ngoặc: {j['catNgoac']!r}"


thu("Tự vá sạch 3 chuỗi TEX_LENH_CUT thực tế (Python + JS) & chống cắt hở ngoặc", test_tu_va_3_chuoi_tex_python_va_js)


# =============================================================================
# 4. CA 4: Cảnh dap_an thiếu 0.8165 tự được điền đáp số bằng code thuần
# =============================================================================
print("4. Ca 4 — Tự đồng bộ đáp số 0.8165 vào noi_dung_man_hinh cảnh dap_an (Python + JS)")


def test_tu_dong_bo_dap_so_08165():
    # Bản Python: cảnh dap_an (so=4, buoc[2]) chỉ có ["P = 1 - P(\\overline{A})"] (chứa số 1 dễ đánh lừa kiểm tra lỏng) -> phải bổ sung 0{,}8165
    kb_py = _kb_mau(mon="THUC_TE", de_bai="Tính tỉ số khoảng cách đạt 0,8165.", dap_an="0.8165")
    kb_py["canh"][3]["noi_dung_man_hinh"] = [r"P = 1 - P(\overline{A})"]
    kb_py["khung4tang"]["buoc"][2]["the"] = [{"loai": "cong_thuc", "dong": [r"P = 1 - P(\overline{A})"]}]
    sua_py = v96.dong_bo_dap_so_canh_dap_an(kb_py)
    assert sua_py is True, "Python không bổ sung đáp số 0.8165"
    man_py = " | ".join(kb_py["canh"][3]["noi_dung_man_hinh"])
    assert "0{,}8165" in man_py or "0.8165" in man_py, f"Python thiếu 0.8165 trên màn hình cảnh dap_an: {man_py}"
    the_py = json.dumps(kb_py["khung4tang"]["buoc"][2]["the"], ensure_ascii=False)
    assert "0{,}8165" in the_py or "0.8165" in the_py, f"Python thiếu 0.8165 trên thẻ bước dap_an: {the_py}"

    # Bản JS (KiemTraHinh.gs): thử cả 0.8165 (dấu chấm) và 0,8165 (dấu phẩy tiếng Việt)
    out = _chay_node(r"""
      const fs = require('fs'), vm = require('vm');
      const ctx = {console, JSON, Math, Date, RegExp, Object, Array, String, Number};
      vm.createContext(ctx);
      for (const f of ['BoPhan1.gs', 'KiemTraHinh.gs', 'SanKhau.gs']) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, {filename: f});
      const kb1 = %s;
      kb1.canh[3].noi_dung_man_hinh = ['P = 1 - P(\\overline{A})'];
      kb1.khung4tang.buoc[2].the = [{loai: 'cong_thuc', dong: ['P = 1 - P(\\overline{A})']}];
      ctx.suaDapAn_(kb1, '0.8165');

      const kb2 = %s;
      kb2.canh[3].noi_dung_man_hinh = [];
      ctx.suaDapAn_(kb2, '0,8165');

      console.log(JSON.stringify({
        man1: kb1.canh[3].noi_dung_man_hinh,
        the1: kb1.khung4tang.buoc[2].the,
        man2: kb2.canh[3].noi_dung_man_hinh,
      }));
    """ % (json.dumps(kb_py, ensure_ascii=False), json.dumps(kb_py, ensure_ascii=False)))
    j = json.loads(out)
    assert any("0{,}8165" in x or "0.8165" in x for x in j["man1"]), f"JS thiếu 0.8165 ở man1: {j['man1']}"
    assert "0{,}8165" in json.dumps(j["the1"], ensure_ascii=False), f"JS thiếu 0.8165 ở thẻ bước dap_an: {j['the1']}"
    assert any("0{,}8165" in x or "0.8165" in x for x in j["man2"]), f"JS không xử lý được dấu phẩy 0,8165: {j['man2']}"


thu("Cảnh dap_an thiếu 0.8165 (kể cả chứa số 1 gây nhiễu / dấu phẩy 0,8165) tự điền đáp số", test_tu_dong_bo_dap_so_08165)


print(f"\nKẾT QUẢ TEST VIỆC 1: {DAT} đạt, {len(HONG)} hỏng")
if HONG:
    for h in HONG:
        print("  LỖI:", h)
    sys.exit(1)
