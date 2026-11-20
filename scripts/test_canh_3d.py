import unittest

import numpy as np

from canh_3d import ke_hoach, phan_vai
from kiem_tra_chuyen_dong import vung_dao_lien_tuc
from xe_3d import luat_van_toc, nhip_xe


class CanhVideoTest(unittest.TestCase):
    def test_xe_dung_va_giu_vi_tri_qua_canh(self):
        props = {"fps": 30, "deGoc": "a(t)=2t+3 m/s², v(0)=4 m/s", "canh": [
            {"soFrame": 120, "cau": [{"text": "Dừng đột ngột.", "bat": 2, "ket": 3}]},
            {"soFrame": 60, "cau": []},
        ]}
        nhip_xe(props, [0, 1])
        stop = props["canh"][0]["nhipXe"]["moc"][-1]
        self.assertAlmostEqual(stop["s"], 8 + 6 + 8/3)
        self.assertEqual((stop["t"], stop["v"], stop["a"]), (2, 0, 0))
        self.assertEqual(props["canh"][1]["nhipXe"]["moc"][0]["s"], stop["s"])
        self.assertIsNone(luat_van_toc("v(t)=sin(t) m/s"))

    def test_phep_thu_giu_nguyen_so_bi(self):
        shot = {"moHinh3D": {"chi_tiet": []}, "minhHoa": {"loai": "bi_hop", "duLieu": {
            "nhom": [{"ten": "đỏ", "so": 3}], "chon": [{"ten": "đỏ", "so": 2}]}}}
        plans = ke_hoach({"mon": "XAC_SUAT"}, {"canh": [shot, {"giuSanKhau": True}]})
        self.assertEqual(plans[0]["gia_tri"], ["do"] * 3)
        self.assertEqual(plans[0]["so_rut"], 2)
        self.assertEqual(plans[0], plans[1])

    def test_ban_ve_rieng_hong_con_du_kien(self):
        scene = {"loai":"de_bai", "moHinh3D":{"chi_tiet":[]}}
        plans = ke_hoach({"mon":"THUC_TE", "de_bai":"Băng chuyền dài 8 m."}, {"canh":[scene]})
        self.assertEqual(plans[0]["loai"], "lap_ghep")
        with self.assertRaisesRegex(ValueError, "Cảnh 1"):
            ke_hoach({"mon":"THUC_TE", "de_bai":"Kho hàng."}, {"canh":[scene]})

    def test_san_khau_cua_giu_hanh_dong(self):
        stage = {"vat":[{"id":"cua","loai":"cua","so_luong":3}],
                 "hanh_dong":[{"vat":"cua","kieu":"mo","chi_so":[3]}]}
        props = {"canh":[{"minhHoa":{"loai":"san_khau","duLieu":stage}}]}
        self.assertEqual(ke_hoach({"mon":"XAC_SUAT"},props), {})
        self.assertEqual(stage["hanh_dong"][0]["chi_so"], [3])

    def test_xuc_xac_va_nhan_di_cung_nhau(self):
        stage = {"vat":[{"id":"xx","loai":"xuc_xac","ket_qua":[3,4]},
                        {"id":"tong","loai":"nhan","noi_dung":"Tổng bằng 7"}]}
        props = {"canh":[{"minhHoa":{"loai":"san_khau","duLieu":stage}}]}
        self.assertEqual(ke_hoach({"mon":"XAC_SUAT"},props), {})
        self.assertEqual(stage["vat"][0]["ket_qua"], [3,4])

    def test_quyen_dung_moi_truong(self):
        props = {"fps": 30, "canh": [{"soFrame": 90, "cau": []}, {}, {"giuSanKhau": True}, {}]}
        urn = {"loai": "phep_thu", "vat": "hop_bi", "gia_tri": ["do"]}
        drawing = {"loai": "lap_ghep", "doan_toan": [{"do_dai":"2 m"}]}
        plans = {0: {"loai": "xe_duong"}, 1: urn, 2: urn, 3: drawing}
        result = phan_vai(plans, props, {"mon":"THUC_TE"})
        self.assertEqual(result[1],result[0])
        self.assertEqual(result[2],urn)
        self.assertEqual(result[3],drawing)
        self.assertEqual([c["phaMinhHoa"] for c in props["canh"]], ["thuc","chuyen","toan","toan"])

    def test_pha_theo_canh_doc_de_va_du_lieu_diem(self):
        props = {"canh":[{"loai":k} for k in ("hook","mo_dau","de_bai","tinh_toan")]}
        authored = [{},{},{},{"net_toan":[{"diem":[[0,0],[1,1]],"nhan":"AB"}]}]
        kb = {"mon":"THUC_TE","canh":authored}
        result = phan_vai({0:{"loai":"xe_duong"}},props,kb)
        self.assertEqual([s["phaMinhHoa"] for s in props["canh"]],["thuc","thuc","chuyen","toan"])
        self.assertEqual(result[2],result[0])
        self.assertEqual(props["canh"][-1]["netToan"],authored[-1]["net_toan"])
        props["canh"][-1]["netToan"][0]["diem"] = [[2,1]]
        with self.assertRaisesRegex(ValueError, "Cảnh 4"):
            phan_vai(result,props,kb)

    def test_chu_nhay_va_vat_di_chuyen(self):
        frames = np.zeros((16, 512, 288), np.uint8)
        frames[1::2, 40:50, 40:55] = 220
        self.assertEqual(vung_dao_lien_tuc(frames), 0)
        frames.fill(0)
        for i, frame in enumerate(frames):
            frame[40:50, 30+i:45+i] = 220
        self.assertIsNone(vung_dao_lien_tuc(frames))


if __name__ == "__main__":
    unittest.main()
