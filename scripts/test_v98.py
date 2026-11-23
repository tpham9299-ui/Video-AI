#!/usr/bin/env python3
"""v98 — test chống lộ đáp án (scripts/khung4tang_v98.py) + đường dữ kiện sơ đồ tư duy. python scripts/test_v98.py"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import khung4tang_v98 as V  # noqa: E402
import khung4tang_v95 as V95  # noqa: E402

dat = hong = 0


def thu(ten, dk, them=""):
    global dat, hong
    if dk:
        dat += 1
    else:
        hong += 1
    print(("ĐẠT  " if dk else "HỎNG ") + ten + ("" if dk or not them else " — " + str(them)))


thu("so_bang: 6,07 ~ 6,0711 ; 6 ~ 6,07 (bản làm tròn vẫn là lộ đáp số) ; 6 !~ 7,2", V.so_bang("6,07", "6,0711") and V.so_bang("6", "6,07") and not V.so_bang("6", "7,2"))
ghim = [{"id": "a", "nhan": "AB = 6"}, {"id": "x", "nhan": "x = 6,07"}, {"id": "v", "nhan": "V_{max} \\approx 144"}, {"id": "k", "nhan": "x = ?"}]
moi, n = V.che_dap_an_ghim(ghim, "x ≈ 6,07 cm, V lớn nhất = 144 cm³")
thu("ô 'x = 6,07' và 'V_max ≈ 144' bị che thành '= ?' (2 ô)", n == 2 and moi[1]["nhan"] == "x = ?" and moi[2]["nhan"] == "V_{max} = ?", moi)
thu("dữ kiện đề (AB = 6) và ô đã có '?' giữ nguyên", moi[0]["nhan"] == "AB = 6" and moi[3]["nhan"] == "x = ?")
doi = V95.de_ghim_doi(moi, "x ≈ 6,07 cm, V lớn nhất = 144 cm³", 30.0)
thu("sau khi che, ô đổi lại sang đáp số ĐÚNG mốc chốt (30 s)", doi[1].get("doi", {}).get("t") == 30.0 and "6{,}07" in doi[1]["doi"]["nhan"], doi[1])
moi2, n2 = V.che_dap_an_ghim([{"id": "x", "nhan": "x = 5"}], "", {"x": ("5", "")})
thu("đáp số chỉ có từ máy tính (sân khấu 2D) cũng che được", n2 == 1 and moi2[0]["nhan"] == "x = ?")
moi3, n3 = V.che_dap_an_ghim([{"id": "n", "nhan": "n = 5"}], "x = 5")
thu("đại lượng khác tên (n = 5 khi đáp án x = 5) không bị che nhầm", n3 == 0 and moi3[0]["nhan"] == "n = 5")
thu("hộp dữ kiện sơ đồ tư duy cũng che", V.che_dap_an_chuoi(["4^x - 3 \\cdot 2^x + 2 = 0", "x = 0; 1"], "x = 0 hoặc x = 1") == ["4^x - 3 \\cdot 2^x + 2 = 0", "x = ?"])

print(f"\nKẾT QUẢ: {dat} đạt, {hong} hỏng")
sys.exit(1 if hong else 0)
