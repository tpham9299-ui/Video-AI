"""Props thử: bài 10 thẻ số (Three.js, nền chiều sâu thay NenCauChuyen), cảnh ứng dụng bài trụ, biểu đồ cột Thử lại."""
import copy, json, sys
from pathlib import Path
sys.path.insert(0, "scripts")
from thu_vien_3d.phep_thu_nhieu import gan_cho_canh, lap_moi_truong_phep_thu

p = json.loads(Path("public/props.json").read_text(encoding="utf8"))
kb = json.loads(Path("mau/kich_ban_the_so.json").read_text(encoding="utf8"))
goc = p["canh"][1]
F = 150
def cau(ds):
    return [{"text": t, "bat": 0.2 + i * 1.6, "ket": 1.6 + i * 1.6} for i, t in enumerate(ds)]
def sk(vat):
    return {"loai": "san_khau", "moTa": "thu", "duLieu": {"vat": vat}}
canh = [
    {"loai": "mo_dau", "tieuDeCanh": "Mười tấm thẻ", "noiDung": [], "minhHoa": sk([]), "cau": cau(["Mười tấm thẻ, rút hai tấm."])},
    {"loai": "de_bai", "tieuDeCanh": "Rút hai thẻ", "noiDung": [], "minhHoa": sk([]), "cau": cau(["Rút ngẫu nhiên hai tấm thẻ", "từ mười tấm"])},
    {"loai": "tinh_toan", "tieuDeCanh": "Tích lẻ khi cả hai lẻ", "noiDung": [r"P(\overline{A}) = \frac{C_5^2}{C_{10}^2} = \frac{2}{9}"], "minhHoa": sk([]), "cau": cau(["Tích lẻ khi cả hai thẻ đều lẻ"])},
    {"loai": "kiem_tra", "tieuDeCanh": "Thử lại bằng số cách", "noiDung": [],
     "minhHoa": sk([{"id": "c", "loai": "bieu_do_cot", "x": 50, "y": 50, "ds": ["r = 1,5", "r = 2", "r = 2,5", "r = 3"], "ds_so": [1092, 1036, 1058, 1121],
                     "toi_uu": "min", "moc_dong": [0.3, 1.0, 1.7, 2.4], "nhan": "Diện tích (dm²)", "buoc": 1}]),
     "cau": cau(["r bằng một rưỡi", "r bằng hai", "r bằng hai rưỡi", "r bằng ba"])},
    {"loai": "lien_he_thuc_te", "tieuDeCanh": "Ứng dụng thực tế", "noiDung": [], "minhHoa": sk([]), "phaMinhHoa": "toan",
     "chuoi3D": {"thuMuc": "x", "netCuoi": 0, "hinhGiai": "khong_co.mov"},
     "cau": cau(["Lon nước ngọt dùng ít nhôm nhất", "bồn chứa hóa chất tiết kiệm thép", "và cả silo chứa thóc"])},
]
bd = 0
out = []
for i, c in enumerate(canh):
    r = dict(copy.deepcopy(goc), so=i + 1, chuThich=[], tuKhoa="", nhan="", giuSanKhau=False, chuyenCanh="", gocNhin=None, dongBo="",
             batDau=bd, soFrame=F, leadFrame=4)
    for k in ("mocCongThuc", "tu", "moiTruong", "phaMinhHoa", "chuoi3D", "quay", "nhipQuay"):
        r.pop(k, None)
    r.update(c)
    out.append(r)
    bd += F
p["canh"] = out
mt = lap_moi_truong_phep_thu(kb)
gan_cho_canh(kb, p, mt)
p["canh"][4].update(phaMinhHoa="toan", chuoi3D={"thuMuc": "x", "netCuoi": 0, "hinhGiai": "khong_co.mov"})
for c in p["canh"]:
    c.setdefault("soFrame", F)
p.update(tongFrame=bd, manimLop=False, luong="thuc_te_xac_suat", outro=None, intro=None, suKienManim=[], anhManimBia=None,
         phongCanh={"troi": "#2a3440", "dat": "#3b2a20", "vat": [{"ten": "hộp", "hinh": "hop", "tam": [0, 1, -4], "co": [3, 2, 2], "mau": "#7a4a2a"}]})
Path("out/thu_nen_3d/props.json").write_text(json.dumps(p, ensure_ascii=False), encoding="utf8")
print([bool(c.get("moiTruong")) for c in p["canh"]])
