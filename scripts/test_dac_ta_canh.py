"""Kiểm thử đặc tả cảnh (dac_ta_canh): thư viện, xếp chỗ, kiểm bám đề, fallback vật mới. Chạy: python scripts/test_dac_ta_canh.py"""

import copy
import json
import math
import re
import sys
import tempfile
import unittest
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from canh_3d import bien_dang_loi, ke_hoach, ke_hoach_dac_ta, luoi_hop_le, phan_vai  # noqa: E402
from kiem_bam_de import kiem_anh, kiem_dac_ta  # noqa: E402
from nang_cap_dinh_dang import gan_moi_truong  # noqa: E402
from thu_vien_3d import moi_truong, vat, xep_cho  # noqa: E402
from thu_vien_3d.khop import DANH_MUC, khop_moi_truong, khop_vat  # noqa: E402
from tao_mo_hinh import bo_sung_dac_ta, sinh_vat_moi  # noqa: E402


def doc(name):
    return json.loads((ROOT / "mau" / f"kich_ban_{name}.json").read_text(encoding="utf8"))


def dem_ban_sao(plan, the_id):
    return len({p["ban"] for p in plan["chi_tiet"] if p["the"] == the_id})


class ThuVienTest(unittest.TestCase):
    def test_danh_muc_khop_ham_dung_va_apps_script(self):
        self.assertEqual(set(DANH_MUC["vat"]), set(vat.DUNG))
        self.assertEqual(set(DANH_MUC["moi_truong"]), set(moi_truong.DUNG))
        gs = (ROOT / "PromptKichBan.gs").read_text(encoding="utf8")
        block = gs[gs.index("var DANH_MUC_3D_"):gs.index("};", gs.index("var DANH_MUC_3D_"))]
        vat_gs = re.findall(r"'([a-z_]+)'", block.split("moi_truong:")[0])
        mt_gs = re.findall(r"'([a-z_]+)'", block.split("moi_truong:")[1])
        self.assertEqual(vat_gs, list(DANH_MUC["vat"]))
        self.assertEqual(mt_gs, list(DANH_MUC["moi_truong"]))

    def test_hdri_co_san(self):
        for key, info in DANH_MUC["moi_truong"].items():
            self.assertTrue((ROOT / "assets/hdri" / f"{info['hdri']}_1k.hdr").exists(), key)

    def test_moi_mau_vat_hop_le(self):
        for key, info in DANH_MUC["vat"].items():
            parts = vat.dung_vat(key, info["co"], info["mau"], {})
            self.assertTrue(parts, key)
            for p in parts:
                self.assertEqual(len(p["tam"]), 3)
                self.assertTrue(min(p["co"]) > 0, key)
                if p["hinh"] == "luoi_tam_giac":
                    self.assertTrue(luoi_hop_le(p), key)
                if p["hinh"] == "lang_tru":
                    self.assertTrue(bien_dang_loi(p["day"]), key)
            lo, hi = vat.hop_bao(parts)
            # Vật dựng ra phải đúng cỡ khai báo (sai lệch do chi tiết nhô ra tối đa 35%).
            for k in range(3):
                self.assertLess(abs((hi[k] - lo[k]) - info["co"][k]), info["co"][k] * 0.35 + 0.15, (key, k))

    def test_moi_boi_canh_dung_quanh_vat_nho_va_lon(self):
        for key in moi_truong.DUNG:
            for lo, hi in (([-0.1, -0.1, 0], [0.1, 0.1, 0.1]), ([-10, -2, 0], [10, 2, 3])):
                env = moi_truong.dung_moi_truong(key, lo, hi)
                self.assertTrue(env["chi_tiet"], key)
                self.assertIn("troi", env)
        small = moi_truong.dung_moi_truong("ban_thi_nghiem", [-0.05, -0.05, 0], [0.05, 0.05, 0.05])
        self.assertTrue(small["tren_ban"])   # xúc xắc nằm trên mặt bàn, không lơ lửng trên sàn

    def test_khop_ten_tieng_viet(self):
        self.assertEqual(khop_vat({"ten": "téc nước"}), "be_tru")
        self.assertEqual(khop_vat({"ten": "xe o to"}), "o_to")
        self.assertEqual(khop_vat({"ten": "chiếc xe tải chở cát"}), "xe_tai")
        self.assertEqual(khop_vat({"ten": "lọ hoa thủy tinh"}), "chai")
        self.assertIsNone(khop_vat({"ten": "cái nêm gỗ"}))
        self.assertEqual(khop_moi_truong("bãi gửi xe của chung cư"), "bai_do_xe")
        self.assertEqual(khop_moi_truong("Một xưởng may có 3 dây chuyền"), "nha_xuong")
        self.assertEqual(khop_moi_truong("", ngoai_troi=True), "ngoai_troi")


class XepChoTest(unittest.TestCase):
    def test_trai_ca_dung_so_luong_kich_thuoc_va_boi_canh(self):
        kb = doc("trai_ca")
        plan = ke_hoach_dac_ta(kb)
        self.assertEqual(plan["loai"], "dac_ta")
        self.assertEqual(plan["moi_truong"]["mau"], "trai_ca")
        self.assertEqual(dem_ban_sao(plan, "be"), 3)
        self.assertEqual(dem_ban_sao(plan, "bac_ba"), 1)
        lengths = sorted(round(math.dist(d["a"], d["b"]), 3) for d in plan["doan_toan"])
        self.assertEqual(lengths, [1.2, 2.0])
        # Cá nằm trong lòng bể (không lơ lửng ngoài trời).
        tanks = [p for p in plan["chi_tiet"] if p["the"] == "be" and p["hinh"] == "luoi_tam_giac"]
        for fish in (p for p in plan["chi_tiet"] if p["the"] == "ca"):
            self.assertTrue(any(abs(fish["tam"][0] - t["tam"][0]) < 1 and abs(fish["tam"][1] - t["tam"][1]) < 1 and
                                0 < fish["tam"][2] < 1.2 for t in tanks))
        self.assertEqual(plan["huong_may"], xep_cho.HUONG_MAY["toan_canh"])

    def test_bai_xe_hai_nhom_mau_va_xe_do_song_song(self):
        plan = ke_hoach_dac_ta(doc("bai_xe"))
        self.assertEqual(plan["moi_truong"]["mau"], "bai_do_xe")
        bodies = [p for p in plan["chi_tiet"] if p["the"].startswith("xe_") and p["hinh"] == "hop" and p["co"][0] > 4]
        self.assertEqual(Counter(p["vat_lieu"] for p in bodies), {"do": 4, "trang": 3})
        self.assertTrue(all(p.get("xoay", [0, 0, 0])[2] == 90 for p in bodies))
        reds = max(p["tam"][0] for p in bodies if p["vat_lieu"] == "do")
        self.assertTrue(all(p["tam"][0] > reds for p in bodies if p["vat_lieu"] == "trang"))  # xe trắng bên phải xe đỏ
        self.assertEqual(plan["huong_may"], xep_cho.HUONG_MAY["tu_tren"])
        self.assertTrue(plan["giu_vat"])

    def test_vat_trong_hop_va_tren_ban(self):
        kb = {"de_bai": "Trong hộp có 6 viên bi đỏ và 4 viên bi xanh đặt trên bàn.", "canh": [{"loi_thoai": "x"}],
              "dac_ta_canh": {"phien_ban": 1, "boi_canh": {"mau": "ban_thi_nghiem"}, "thuc_the": [
                  {"id": "hop", "ten": "hộp", "lop": "do_choi_xac_suat", "mau_tv": "hop_bi", "so_luong": 1, "vai_tro": "chinh"},
                  {"id": "do", "ten": "bi", "tu_de": "6 viên bi đỏ", "lop": "do_choi_xac_suat", "so_luong": 6, "mau_sac": "do", "vai_tro": "chinh"},
                  {"id": "xanh", "ten": "bi", "tu_de": "4 viên bi xanh", "lop": "do_choi_xac_suat", "so_luong": 4, "mau_sac": "xanh_duong", "vai_tro": "chinh"},
                  {"id": "ban", "ten": "bàn", "lop": "noi_that", "so_luong": 1, "vai_tro": "phu"}],
                  "quan_he": [{"kieu": "trong", "a": "do", "b": "hop"}, {"kieu": "trong", "a": "xanh", "b": "hop"},
                              {"kieu": "tren", "a": "hop", "b": "ban"}]}}
        self.assertEqual(kiem_dac_ta(kb)[0], [])
        plan = ke_hoach_dac_ta(kb)
        box = [p for p in plan["chi_tiet"] if p["the"] == "hop"]
        blo, bhi = vat.hop_bao(box)
        table_top = max(p["tam"][2] + p["co"][2] / 2 for p in plan["chi_tiet"] if p["the"] == "ban")
        self.assertAlmostEqual(blo[2], table_top, places=3)
        balls = [p for p in plan["chi_tiet"] if p["the"] in ("do", "xanh")]
        self.assertEqual(len(balls), 10)
        for b in balls:
            self.assertTrue(all(blo[k] - 1e-6 <= b["tam"][k] <= bhi[k] + 1e-6 for k in range(3)))

    def test_so_lieu_sai_kich_thuoc_bi_chan(self):
        kb = doc("trai_ca")
        kb["dac_ta_canh"]["so_lieu"][1]["nhan"] = "1,5 m"
        with self.assertRaisesRegex(ValueError, "1,5 m"):
            ke_hoach_dac_ta(kb)

    def test_vuot_gioi_han_ban_sao(self):
        kb = {"de_bai": "Một vườn có 120 cây cam.", "canh": [{}], "dac_ta_canh": {"phien_ban": 1, "boi_canh": {},
              "thuc_the": [{"id": "cay", "ten": "cây cam", "tu_de": "120 cây cam", "lop": "cay", "mau_tv": "cay", "so_luong": 120, "vai_tro": "chinh"}]}}
        plan = xep_cho.lap_ke_hoach_dac_ta(kb)
        self.assertEqual(dem_ban_sao(plan, "cay"), xep_cho.HIEN_TOI_DA)
        self.assertTrue(any("120" in w for w in plan["canh_bao"]))
        self.assertEqual(plan["moi_truong"]["mau"], "nong_trai")   # "vườn" -> nông trại


class BamDeTest(unittest.TestCase):
    def test_mau_hop_le(self):
        for name in ("trai_ca", "bai_xe"):
            self.assertEqual(kiem_dac_ta(doc(name))[0], [], name)

    def test_bat_loi_lech_de(self):
        kb = doc("bai_xe")
        bad = copy.deepcopy(kb)
        bad["dac_ta_canh"]["thuc_the"][0]["so_luong"] = 5
        bad["dac_ta_canh"]["thuc_the"][1]["mau_sac"] = "xanh_duong"
        errors = " | ".join(kiem_dac_ta(bad)[0])
        self.assertIn("so_luong 5", errors)
        self.assertIn("trang", errors)
        bad = copy.deepcopy(doc("trai_ca"))
        bad["dac_ta_canh"]["thuc_the"][0]["kich_thuoc"]["cao"]["gt"] = 1.5
        bad["dac_ta_canh"]["quay"][1]["hanh_dong"][0]["khi_noi"] = "đổ đầy"
        bad["dac_ta_canh"]["thuc_the"][0]["tu_de"] = "bể kính"
        errors = " | ".join(kiem_dac_ta(bad)[0])
        for want in ("1.5 m không có trong đề", "khi_noi", "nguyên văn đề"):
            self.assertIn(want, errors)
        bad = copy.deepcopy(kb)
        bad["dac_ta_canh"]["thuc_the"][0]["tam"] = [0, 0, 0]    # AI không được ghi tọa độ
        self.assertTrue(kiem_dac_ta(bad)[0])

    def test_canh_bao_vat_de_nhac_ma_bo_sot(self):
        kb = doc("trai_ca")
        kb["de_bai"] += " Cạnh bể có một chiếc thang."
        warnings = kiem_dac_ta(kb)[1]
        self.assertTrue(any("thang" in w for w in warnings))

    def test_ai_nhin_hinh(self):
        kb = doc("trai_ca")
        ok, _ = kiem_anh("x.png", kb, lambda p, a: {"thieu_chinh": [], "boi_canh_khop": True})
        self.assertTrue(ok)
        ok, _ = kiem_anh("x.png", kb, lambda p, a: {"thieu_chinh": ["be"], "boi_canh_khop": True})
        self.assertFalse(ok)


NEM = {"co_chuan": [0.3, 0.16, 0.12], "bo_phan": [
    {"hinh": "lang_tru", "tam": [0, 0, 0.5], "co": [1, 1, 1], "day": [[0, 0], [1, 0], [0, 1]], "xoay": [90, 0, 0], "vat_lieu": "chinh"},
    {"hinh": "hop", "tam": [0, 0, 0.03], "co": [1, 0.9, 0.06], "vat_lieu": "den"}]}


class VatMoiTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.old = xep_cho.THU_MUC_SINH
        xep_cho.THU_MUC_SINH = Path(self.tmp.name)

    def tearDown(self):
        xep_cho.THU_MUC_SINH = self.old
        self.tmp.cleanup()

    def kb(self):
        return {"de_bai": "Một cái nêm chặn bánh xe cao 12 cm.", "canh": [{}], "dac_ta_canh": {"phien_ban": 1, "boi_canh": {"mau": "nha_xuong"},
                "thuc_the": [{"id": "nem", "ten": "cái nêm", "tu_de": "cái nêm chặn bánh xe", "lop": "do_vat", "so_luong": 1, "vai_tro": "chinh",
                              "mau_sac": "vang", "kich_thuoc": {"cao": {"gt": 12, "dv": "cm", "nguon": "de"}}}],
                "so_lieu": [{"gan": "nem.cao", "nhan": "12 cm", "tu_de": "cao 12 cm"}]}}

    def test_thieu_mau_quay_ve_duong_cu(self):
        self.assertIsNone(ke_hoach_dac_ta(self.kb()))

    def test_sinh_kiem_luu_va_dung_lai(self):
        floating = copy.deepcopy(NEM)
        floating["bo_phan"].append({"hinh": "cau", "tam": [0.95, 0.0, 0.5], "co": [0.05, 0.05, 0.05]})   # ngoài khung
        replies = iter([floating, NEM, {"dat": True}])
        kb = self.kb()
        self.assertTrue(bo_sung_dac_ta(kb, lambda *_: next(replies)))
        self.assertEqual(kb["dac_ta_canh"]["thuc_the"][0]["co_chuan"], NEM["co_chuan"])
        plan = ke_hoach_dac_ta(kb)
        self.assertEqual(round(math.dist(plan["doan_toan"][0]["a"], plan["doan_toan"][0]["b"]), 3), 0.12)
        self.assertTrue(any(p["vat_lieu"] == "vang" for p in plan["chi_tiet"]))
        # Lần sau đọc từ thư viện sinh/, không gọi AI.
        again = self.kb()
        self.assertEqual(sinh_vat_moi(again["dac_ta_canh"]["thuc_the"][0], "", lambda *_: self.fail("gọi lại AI"))["co_chuan"],
                         NEM["co_chuan"])
        self.assertIsNotNone(ke_hoach_dac_ta(again))

    def test_ai_tu_choi_hai_lan_thi_dung(self):
        replies = iter([NEM, {"dat": False, "loi": "không giống cái nêm"}] * 2)
        with self.assertRaisesRegex(ValueError, "không giống cái nêm"):
            sinh_vat_moi(self.kb()["dac_ta_canh"]["thuc_the"][0], "", lambda *_: next(replies))


class TichHopTest(unittest.TestCase):
    def props(self, kb):
        return {"canh": [{"loai": c["loai"], "minhHoa": {"loai": "san_khau", "duLieu": c["minh_hoa"]["du_lieu"]},
                          "cau": [{"text": c["loi_thoai"]}]} for c in kb["canh"]]}

    def test_canh_mo_dau_dung_theo_dac_ta(self):
        for name in ("trai_ca", "bai_xe"):
            kb = doc(name)
            props = self.props(kb)
            ds = phan_vai(ke_hoach(kb, props), props, kb)
            self.assertEqual(ds[0]["loai"], "dac_ta", name)
            self.assertEqual([c["phaMinhHoa"] for c in props["canh"]][:2], ["thuc", "chuyen"])

    def test_dac_ta_sai_de_dung_lai(self):
        # tắt Auto-fix (v91) -> hành vi cũ: sai số lượng so với đề thì dừng
        import os
        os.environ["AUTO_FIX_KICH_BAN"] = "0"
        try:
            kb = doc("bai_xe")
            kb["dac_ta_canh"]["thuc_the"][0]["so_luong"] = 9
            with self.assertRaisesRegex(ValueError, "chưa bám đề"):
                ke_hoach(kb, self.props(kb))
        finally:
            os.environ.pop("AUTO_FIX_KICH_BAN", None)

    def test_auto_fix_so_luong_theo_de(self):
        # v91 Auto-fix: đề chỉ nêu một số lượng -> tự sửa theo đề, ghi cảnh báo, không dừng
        from kiem_bam_de import kiem_dac_ta_tu_sua
        kb = doc("bai_xe")
        goc = kb["dac_ta_canh"]["thuc_the"][0]["so_luong"]
        kb["dac_ta_canh"]["thuc_the"][0]["so_luong"] = 9
        loi, canh_bao = kiem_dac_ta_tu_sua(kb)
        self.assertEqual(loi, [])
        self.assertEqual(kb["dac_ta_canh"]["thuc_the"][0]["so_luong"], goc)
        self.assertTrue(any("tự sửa" in w and "so_luong" in w for w in canh_bao), canh_bao)

    def test_khoa_luong_hinh_hoc_go_dac_ta(self):
        import kiem_hinh_hoc
        self.assertIn("dac_ta_canh", kiem_hinh_hoc.KHOA_3D)
        self.assertIn("'dac_ta_canh'", (ROOT / "HinhHoc.gs").read_text(encoding="utf8").split("KHOA_3D_KICH_BAN_ =")[1][:120])
        kb = dict(doc("trai_ca"), mon="HINH_HOC")
        self.assertEqual(ke_hoach(kb, self.props(kb)), {})

    def test_ke_hoach_cu_duoc_gan_boi_canh_theo_cau_chuyen(self):
        plan = {"loai": "lap_ghep", "chi_tiet": []}
        kb = {"de_bai": "Băng chuyền dài 8 m.", "cau_chuyen": {"dia_diem": "kho hàng của công ty"}}
        self.assertEqual(gan_moi_truong(plan, kb)["moi_truong"]["mau"], "nha_xuong")
        self.assertEqual(gan_moi_truong({"loai": "xe_duong"}, kb), {"loai": "xe_duong"})
        self.assertNotIn("moi_truong", gan_moi_truong(plan, {"de_bai": "Một khối gỗ."}))


class GiaiDoanD(unittest.TestCase):
    """Góc máy / hành động theo từng cảnh (Blender) và phép thử nhiều vật (Three.js)."""

    def test_moi_canh_mot_ke_hoach_quay(self):
        kb = doc("trai_ca_goc_may")
        p1, p2, p3 = (ke_hoach_dac_ta(kb, so) for so in (1, 2, 3))
        self.assertEqual((p1["quay"]["goc_may"], p1["quay"]["chuyen_may"]), ("toan_canh", "luot_ngang"))
        self.assertEqual(p2["tieu_diem"], ["be#1"])
        self.assertEqual(p2["quay"]["hanh_dong"][0]["dong_tu"], "rot_day")
        self.assertEqual(p3["quay"]["goc_may"], "trung")
        self.assertIsNone(ke_hoach_dac_ta(kb, 4))   # cảnh không có quay[] riêng

    def test_hanh_dong_tro_vat_khong_co_bi_bo(self):
        kb = copy.deepcopy(doc("trai_ca_goc_may"))
        kb["dac_ta_canh"]["quay"][1]["hanh_dong"].insert(0, {"vat": "be#9", "dong_tu": "roi"})
        plan = ke_hoach_dac_ta(kb, 2, kiem=False)
        self.assertEqual([(a["i"], a["dong_tu"]) for a in plan["quay"]["hanh_dong"]], [(1, "rot_day")])

    def test_quay_canh_lay_moc_khi_noi(self):
        from chuanbi import quay_canh
        kb = doc("xac_suat_nhieu_vat")
        cau = [{"text": "An lấy ngẫu nhiên một viên bi, rồi gieo xúc xắc,", "bat": 0.5, "ket": 3.5}]
        q = quay_canh(kb, 2, cau, [])
        t = {a["dongTu"] + a["vat"]: a["t"] for a in q["hanhDong"]}
        self.assertAlmostEqual(t["lay_rabi_do"], 0.5 + 3 / 11, places=2)   # từ thứ 2 trong 11 từ
        self.assertGreater(t["tungxx"], t["lay_rabi_do"])
        self.assertIsNone(t["tungxu"])                          # khi_noi chưa có trong câu này
        self.assertIsNone(quay_canh(dict(kb, luong="hinh_hoc_thuan"), 2, cau, []))

    def test_phep_thu_nhieu_vat_three(self):
        from thu_vien_3d.phep_thu_nhieu import gan_cho_canh, lap_moi_truong_phep_thu
        kb = doc("xac_suat_nhieu_vat")
        mt = lap_moi_truong_phep_thu(kb)
        kieu = Counter(v["kieu"] for v in mt["vat"])
        self.assertEqual(kieu, Counter({"bi": 5, "binh": 1, "xuc_xac": 1, "dong_xu": 1}))
        self.assertTrue(all(v.get("trong") == "hop" for v in mt["vat"] if v["kieu"] == "bi"))
        self.assertEqual(mt["boiCanh"]["mau"], "ban_thi_nghiem")
        props = {"canh": [{"so": i + 1, "loai": c["loai"], "soFrame": 150, "phaMinhHoa": "toan"} for i, c in enumerate(kb["canh"])]}
        self.assertEqual(gan_cho_canh(kb, props, mt), [0, 1])
        self.assertNotIn("phaMinhHoa", props["canh"][3])
        hd = props["canh"][1]["moiTruong"]["quay"]["hanhDong"]
        self.assertEqual([a["dongTu"] for a in hd], ["lay_ra", "tung", "tung", "danh_dau_chon"])
        self.assertTrue(all(a["t"] is not None and a["d"] >= 0.5 for a in hd))
        # vật chính không phải đồ chơi xác suất -> để Blender dựng
        self.assertIsNone(lap_moi_truong_phep_thu(doc("trai_ca")))


def hop_the(plan, the_id):
    return vat.hop_bao([p for p in plan["chi_tiet"] if p["the"] == the_id])


def giao_xy(a, b, gap=0.0):
    return all(min(a[1][k], b[1][k]) + gap > max(a[0][k], b[0][k]) for k in range(2))


class VaChamVaHinhDangTest(unittest.TestCase):
    def test_bon_kin_co_nap_khong_nuoc_va_bo_nguoi_thua(self):
        kb = doc("bon_kin")
        plan = xep_cho.lap_ke_hoach_dac_ta(kb, kb["dac_ta_canh"]["quay"][0])
        bon = [p for p in plan["chi_tiet"] if p["the"] == "bon"]
        self.assertFalse(any(p["vat_lieu"] == "nuoc" for p in bon))          # không lộ mặt nước
        self.assertTrue(any(p["hinh"] == "cau" for p in bon))                # nắp chỏm kín
        self.assertEqual(dem_ban_sao(plan, "cong_nhan"), 0)                  # đề không nhắc người -> bỏ
        self.assertEqual(plan["tieu_diem"], ["bon"])

    def test_nguoi_cach_bon_do_tu_mep_khong_chong(self):
        kb = doc("bon_kin")
        kb["de_bai"] += " Một công nhân đứng cạnh bồn."
        kb["dac_ta_canh"]["thuc_the"][1]["tu_de"] = "công nhân"
        kb["dac_ta_canh"]["quay"][0]["hanh_dong"].append({"vat": "cong_nhan", "dong_tu": "di_chuyen", "tham_so": {"den": "bon"}, "khi_noi": "kín"})
        plan = xep_cho.lap_ke_hoach_dac_ta(kb, kb["dac_ta_canh"]["quay"][0])
        self.assertEqual(dem_ban_sao(plan, "cong_nhan"), 1)
        self.assertFalse(giao_xy(hop_the(plan, "bon"), hop_the(plan, "cong_nhan"), 0.14))

    def test_vat_khong_bao_gio_dat_len_nguoi(self):
        kb = doc("bon_kin")
        kb["dac_ta_canh"]["thuc_the"].append({"id": "hop", "ten": "thùng hàng", "lop": "do_vat", "mau_tv": "hop", "so_luong": 1, "vai_tro": "phu"})
        kb["dac_ta_canh"]["thuc_the"][1]["tu_de"] = "công nhân"
        kb["de_bai"] += " Công nhân bê thùng hàng."
        kb["dac_ta_canh"]["quan_he"] = [{"kieu": "tren", "a": "hop", "b": "cong_nhan"}]
        kb["dac_ta_canh"]["quay"][0]["hanh_dong"].append({"vat": "cong_nhan", "dong_tu": "di_chuyen", "khi_noi": "kín"})
        plan = xep_cho.lap_ke_hoach_dac_ta(kb, kb["dac_ta_canh"]["quay"][0])
        ids = ["bon", "cong_nhan", "hop"]
        for i in range(3):
            for j in range(i + 1, 3):
                self.assertFalse(giao_xy(hop_the(plan, ids[i]), hop_the(plan, ids[j])), (ids[i], ids[j]))
        self.assertLess(hop_the(plan, "hop")[0][2], 0.01)                   # hộp đứng trên sàn, không trên đầu người

    def test_tam_bia_cat_goc_gap_hop(self):
        kb = doc("tam_bia")
        plan = xep_cho.lap_ke_hoach_dac_ta(kb, kb["dac_ta_canh"]["quay"][0])
        vat_bia = [p for p in plan["chi_tiet"] if p["the"] == "bia"]
        self.assertEqual(sum(1 for p in vat_bia if p.get("ban_le")), 4)      # 4 vạt có bản lề
        self.assertEqual(dem_ban_sao(plan, "an"), 0)                         # vật nhỏ trên bàn -> không nhét người
        self.assertEqual([a["dong_tu"] for a in plan["quay"]["hanh_dong"]], ["gap_hop"])
        self.assertEqual(khop_vat({"ten": "hộp không nắp"}), "hop_khong_nap")
        self.assertEqual(khop_vat({"ten": "bồn chứa", "tu_de": "bồn chứa nước hình trụ kín"}), "bon_kin")
        self.assertEqual(khop_vat({"ten": "bể cá", "tu_de": "bể cá hình trụ"}), "be_tru")


if __name__ == "__main__":
    unittest.main()
