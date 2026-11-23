"""Kiểm tu_de "mềm câu chữ, chặt số liệu" của mo_hinh_tu_de (canh_3d.py)."""
import contextlib
import io
import unittest

from canh_3d import chuan_khop, khop_tu_de, mo_hinh_tu_de

DE = ("Một bồn chứa nước hình trụ đứng có đường kính $2{,}4$ mét và chiều cao 3 m. "
      "Bên cạnh là một kiện hàng hình hộp dài 1,2 m.")


def kb(parts, lines=None):
    return {"de_bai": DE, "mo_hinh_3d": {"chi_tiet": parts, "doan_toan": lines or []}}


def part(tu_de, **kw):
    return dict({"hinh": "tru", "tam": [0, 0, 1.5], "co": [2.4, 2.4, 3], "tu_de": tu_de}, **kw)


def chay(model):
    loi, err = [], io.StringIO()
    with contextlib.redirect_stderr(err):
        plan = mo_hinh_tu_de(model, loi)
    return plan, loi, err.getvalue()


class TuDeMemTest(unittest.TestCase):
    def test_chuan_hoa(self):
        self.assertEqual(chuan_khop("Đường kính $2{,}4$ Mét."), "đường kính 2.4 m")
        self.assertEqual(chuan_khop("dài 1,2m"), "dài 1.2 m")
        self.assertEqual(chuan_khop("dài 1.2 m"), "dài 1.2 m")

    def test_dien_dat_khac_duoc_gan_lai_nguyen_van(self):
        span = khop_tu_de("bồn chứa nước dạng trụ đứng, đường kính 2.4 m", DE)
        self.assertIsNotNone(span)
        self.assertIn("2{,}4", span)
        plan, loi, _ = chay(kb([part("Bồn chứa nước hình trụ đứng có đường kính 2,4 m")]))
        self.assertEqual(loi, [])
        self.assertTrue(plan["chi_tiet"][0]["tu_de"].startswith("bồn chứa nước") or
                        plan["chi_tiet"][0]["tu_de"].startswith("Một bồn"))

    def test_so_bia_khong_khop(self):
        self.assertIsNone(khop_tu_de("bồn chứa nước hình trụ đứng có đường kính 3,5 mét", DE))

    def test_chi_tiet_phu_bia_bi_bo_va_warn(self):
        plan, loi, err = chay(kb([part("bồn chứa nước hình trụ đứng"),
                                  part("một cái cây xanh to bên đường", id="cay", hinh="non")]))
        self.assertEqual(loi, [])
        self.assertEqual(len(plan["chi_tiet"]), 1)
        self.assertIn("WARN", err)

    def test_nhan_so_bia_bi_bo(self):
        plan, _, err = chay(kb([part("bồn chứa nước hình trụ đứng"),
                                part("kiện hàng hình hộp", hinh="hop", nhan="nặng 50 kg")]))
        self.assertEqual(len(plan["chi_tiet"]), 1)
        self.assertIn("50", err)

    def test_cot_loi_bia_thi_loi(self):
        plan, loi, _ = chay(kb([part("bồn chứa nước", id="bon"), part("tháp nước cao vút", id="thap", vai_tro="chinh")]))
        self.assertIsNone(plan)
        self.assertIn("cốt lõi", loi[0])
        # Chi tiết được đoạn đo tham chiếu cũng là cốt lõi.
        lines = [{"a": {"vat": "x"}, "b": {"vat": "x", "lech": [0, 0, 3]}, "tu_de": "chiều cao 3 m", "do_dai": "3 m"}]
        plan, loi, _ = chay(kb([part("ống khói nhà máy", id="x")], lines))
        self.assertIsNone(plan)

    def test_het_chi_tiet_thi_loi(self):
        plan, loi, _ = chay(kb([part("ngôi nhà mái ngói đỏ")]))
        self.assertIsNone(plan)
        self.assertIn("thiếu dữ kiện cốt lõi", loi[0])

    def test_doan_do(self):
        ok = {"a": [0, 0, 0], "b": [0, 0, 3], "tu_de": "chiều cao 3 mét", "do_dai": "3 m"}
        bia = {"a": [0, 0, 0], "b": [5, 0, 0], "tu_de": "chiều cao 5 m", "do_dai": "5 m"}
        lech = {"a": [0, 0, 0], "b": [0, 0, 3], "tu_de": "chiều cao 3 m", "do_dai": "4 m"}
        plan, loi, err = chay(kb([part("bồn chứa nước hình trụ")], [ok, bia, lech]))
        self.assertEqual(loi, [])
        self.assertEqual([l["do_dai"] for l in plan["doan_toan"]], ["3 m"])
        self.assertEqual(err.count("WARN"), 2)
        # Tọa độ lệch số đo đề vẫn là lỗi cứng.
        sai = dict(ok, b=[0, 0, 2])
        plan, loi, _ = chay(kb([part("bồn chứa nước hình trụ")], [sai]))
        self.assertIsNone(plan)


if __name__ == "__main__":
    unittest.main()
