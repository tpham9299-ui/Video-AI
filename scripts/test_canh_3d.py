import unittest

import numpy as np

from canh_3d import ke_hoach, tach_moi_truong
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
        shot = {"minhHoa": {"loai": "bi_hop", "duLieu": {
            "nhom": [{"ten": "đỏ", "so": 3}], "chon": [{"ten": "đỏ", "so": 2}]}}}
        plans = ke_hoach({"mon": "XAC_SUAT"}, {"canh": [shot, {"giuSanKhau": True}]})
        self.assertEqual(plans[0]["gia_tri"], ["do"] * 3)
        self.assertEqual(plans[0]["so_rut"], 2)
        self.assertEqual(plans[0], plans[1])

    def test_quyen_dung_moi_truong(self):
        props = {"fps": 30, "canh": [{"soFrame": 90, "cau": []}, {}, {"giuSanKhau": True}, {}]}
        urn = {"loai": "phep_thu", "vat": "hop_bi", "gia_tri": ["do"]}
        drawing = {"loai": "lap_ghep", "doan_toan": [{"do_dai":"2 m"}]}
        plans = {0: {"loai": "xe_duong"}, 1: urn, 2: urn, 3: drawing}
        self.assertEqual(tach_moi_truong(plans, props), {3: drawing})
        self.assertIn("nhipXe", props["canh"][0])
        self.assertTrue(props["canh"][2]["moiTruong"]["giuCuoi"])
        self.assertNotIn("moiTruong", props["canh"][3])

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
