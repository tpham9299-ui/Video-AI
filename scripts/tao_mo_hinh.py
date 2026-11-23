"""Sinh bản vẽ tham số theo đề khi bộ lập cảnh chưa có mô hình."""
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile

from canh_3d import mo_hinh_tu_de

QUY_UOC = """Trả một đối tượng JSON {chi_tiet:[...],doan_toan:[...]} cho Blender.
Dựng đúng các vật, số lượng, quan hệ, tỉ lệ, màu, hướng chuyển động của cảnh.
Vật lạ: phân tích thành bộ phận, dựng thân/viền bằng tiết diện thay đổi theo chiều cao,
đế hoặc mặt cắt đa giác bằng lăng trụ; không thay cả vật bằng một khối hộp.
Mỗi phần có id duy nhất, tu_de trích nguyên văn đề, hinh (hop, tru, non, cau, lang_tru,
khoi_tiet_dien, thuyen, bang_chuyen, lon, bon_vom), tam và co [x,y,z] theo mét, xoay theo độ,
lon = lon nước giống thật (co=[đường kính, đường kính, cao]); bon_vom = bồn trụ đứng có mái vòm bán cầu và chân đế
(co=[đường kính, đường kính, tổng chiều cao]); vật dùng hằng ngày phải đúng tỉ lệ thật (lon 6,6 x 12 cm),
vat_lieu (go, thep, kinh, nuoc, do, trang, da, vang, toi), dich_chuyen [dx,dy,dz] nếu chuyển động.
lang_tru có day gồm 3–24 đỉnh XY của đa giác lồi theo chu vi. khoi_tiet_dien có tang gồm
2–16 hàng [z,tâm_x,tâm_y,bán_kính_x,bán_kính_y] với z tăng, bán kính dương.
Dùng luoi_tam_giac cho hình tự do: dinh gồm 3–256 điểm XYZ và mat gồm 1–512 bộ ba chỉ số
đỉnh từ 0, thứ tự nhìn từ ngoài ngược chiều kim đồng hồ; Blender co theo co. Tối đa 80 phần. Dùng cùng hệ trục; kích thước mỹ thuật không được ghi thành dữ kiện.
doan_toan tối đa 12 đoạn {a:[x,y,z],b:[x,y,z],tu_de,do_dai}; độ dài và đơn vị
phải khớp trích dẫn. Không tự chọn một kết quả ngẫu nhiên làm đáp án. Nếu đề thiếu
dữ kiện thiết yếu để phân biệt các tình huống, trả {"thieu":"dữ kiện cần bổ sung"}."""


def hoi_json(prompt, anh=None):
    """Gọi Gemini trả JSON; anh = đường dẫn ảnh PNG/JPG gửi kèm (AI nhìn hình)."""
    keys = re.split(r"[\s,;]+", " ".join(os.getenv(k, "") for k in ("GEMINI_KEYS","GEMINI_API_KEY")).strip())
    if not any(keys):
        raise ValueError("Chưa có khóa Gemini để tạo bản vẽ mới")
    parts = [{"text": prompt}]
    if anh:
        import base64
        mime = "image/jpeg" if str(anh).lower().endswith((".jpg", ".jpeg")) else "image/png"
        parts.append({"inline_data": {"mime_type": mime, "data": base64.b64encode(Path(anh).read_bytes()).decode()}})
    # v98.2: model = "" -> goi_gemini.js tự chọn model sống (ListModels, chế độ 'nang')
    request = {"keys": keys, "model": os.getenv("MO_HINH_MODEL", ""), "cheDo": "nang", "gioiHanGiay": 60,
               "bodies": [{"contents": [{"parts": parts}],
                           "generationConfig": {"temperature": 0.1, "responseMimeType":"application/json"}}]}
    # delete=False: Windows không cho tiến trình khác mở tệp tạm đang mở.
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False, encoding="utf8") as f:
        json.dump(request, f)
    try:
        result = subprocess.run(["node", str(Path(__file__).parent / "bophan1/goi_gemini.js"), f.name],
                                capture_output=True, text=True, encoding="utf8", check=True, timeout=90)
        response = json.loads(result.stdout)[0]
        if not response.get("ok"):
            raise ValueError("Gemini chưa tạo được bản vẽ")
        out = json.loads(response["raw"])["candidates"][0]["content"]["parts"]
        return json.loads("".join(p.get("text","") for p in out if not p.get("thought")))
    except (subprocess.SubprocessError, KeyError, IndexError, json.JSONDecodeError) as e:
        raise ValueError("Không đọc được bản vẽ JSON từ Gemini") from e
    finally:
        Path(f.name).unlink(missing_ok=True)


QUY_UOC_VAT = """Phân tích vật thật thành 2–40 bộ phận để Blender dựng. Trả JSON
{"co_chuan":[ngang,sâu,cao theo mét ở kích thước thật],"bo_phan":[{"ten":"tên bộ phận","hinh":"hop|tru|cau|non|lang_tru|khoi_tiet_dien",
"tam":[x,y,z],"co":[x,y,z],"xoay":[độ,độ,độ],"vat_lieu":"chinh|go|thep|kinh|nuoc|trang|den|do|vang|da|toi|nhom"}]}.
Tọa độ trong KHUNG CHUẨN của vật: x,y từ -0.5 đến 0.5, z từ 0 (đáy) đến 1 (đỉnh); co là kích thước bộ phận theo tỉ lệ khung (0–1).
Các bộ phận phải chạm nhau thành một vật liền, phủ kín khung; dáng phải nhận ra ngay là vật này (không thay cả vật bằng một hộp).
vat_lieu "chinh" = màu chính của vật. lang_tru có "day" 3–24 đỉnh XY đa giác lồi; khoi_tiet_dien có "tang" 2–16 hàng
[z, tâm_x, tâm_y, bán_kính_x, bán_kính_y] z tăng dần. Không trả tọa độ thế giới, không thêm vật khác."""


def sinh_vat_moi(the, de, hoi=hoi_json, luu=True):
    """Fallback cho thực thể chưa có mẫu: AI ghép bộ phận -> kiểm -> AI đối chiếu -> lưu thư viện sinh/."""
    from thu_vien_3d.xep_cho import THU_MUC_SINH, bo_phan_hop_le, doc_sinh, khoa_sinh
    cached = doc_sinh(the)
    if cached:
        return cached
    context = json.dumps({"de": de, "vat": {k: the.get(k) for k in ("ten", "tu_de", "lop", "kich_thuoc", "mau_sac")}}, ensure_ascii=False)
    problem = ""
    for _ in range(2):
        asset = hoi(QUY_UOC_VAT + "\n" + context + (("\nBản trước bị loại: " + problem) if problem else ""))
        if not isinstance(asset, dict):
            problem = "không phải JSON đối tượng"
            continue
        problem = bo_phan_hop_le(asset.get("bo_phan")) or ""
        co = asset.get("co_chuan")
        if not problem and not (isinstance(co, list) and len(co) == 3 and all(type(v) in (int, float) and 0 < v <= 500 for v in co)):
            problem = "co_chuan cần ba số dương (mét)"
        if problem:
            continue
        review = hoi('Bản ghép bộ phận này có nhận ra đúng là "' + str(the.get("ten")) + '" trong đề không? Kiểm hình dáng, tỉ lệ, '
                     'bộ phận đặc trưng. Trả JSON {"dat":true|false,"loi":"sai ở đâu"}.\n' + context + "\nBản ghép: " +
                     json.dumps(asset, ensure_ascii=False))
        if isinstance(review, dict) and review.get("dat") is True:
            asset = {"ten": the.get("ten"), "lop": the.get("lop"), "co_chuan": co, "bo_phan": asset["bo_phan"]}
            if luu:
                THU_MUC_SINH.mkdir(exist_ok=True)
                (THU_MUC_SINH / (khoa_sinh(the) + ".json")).write_text(json.dumps(asset, ensure_ascii=False, indent=1), encoding="utf8")
            return asset
        problem = str(review.get("loi") if isinstance(review, dict) else "") or "chưa được xác nhận"
    raise ValueError(f"Không sinh được mẫu 3D cho '{the.get('ten')}': {problem}")


def bo_sung_dac_ta(kb, hoi=hoi_json):
    """Gắn bo_phan (AI sinh) vào mọi thực thể CHÍNH chưa có mẫu. Trả True nếu kb đã đổi."""
    from thu_vien_3d.khop import khop_vat
    spec = kb.get("dac_ta_canh")
    if not isinstance(spec, dict):
        return False
    changed = False
    for the in spec.get("thuc_the") or []:
        if the.get("vai_tro") == "chinh" and not the.get("bo_phan") and khop_vat(the) is None:
            asset = sinh_vat_moi(the, kb.get("de_bai"), hoi)
            the["bo_phan"], the["co_chuan"] = asset["bo_phan"], asset["co_chuan"]
            changed = True
    return changed


def bo_sung_mo_hinh(kb, lap_ke_hoach, loi_thieu, hoi=hoi_json):
    repaired = set()
    while True:
        try:
            lap_ke_hoach(kb)
            return bool(repaired)
        except loi_thieu as error:
            index = error.index
            problem = str(error)
        scene = kb["canh"][index if index is not None else 0]
        target = kb if index is None else scene
        position = "Mô hình chung" if index is None else f"Cảnh {index+1}"
        if index in repaired:
            raise ValueError(problem)
        context = json.dumps({"de":kb["de_bai"], "canh":scene, "mon":kb.get("mon"), "ban_ve_cu":target.get("mo_hinh_3d")}, ensure_ascii=False)
        for _ in range(2):
            try:
                model = hoi(QUY_UOC + "\n" + context + "\nCần xử lý: " + problem)
                errors = []
                if not mo_hinh_tu_de(dict(kb, mo_hinh_3d=model), errors):
                    problem = (model.get("thieu") if isinstance(model,dict) else "") or errors[0]
                    continue
                review = hoi("Đối chiếu bản vẽ với đề và đúng cảnh. Kiểm số lượng, đơn vị, vị trí, "
                             "hình dáng có nhận ra đúng vật, hướng chuyển động, các đoạn đo. "
                             'Trả JSON {"dat":true hoặc false,"loi":"sai ở đâu"}.\n' +
                             context + "\nBản vẽ: " + json.dumps(model,ensure_ascii=False))
            except ValueError as e:
                raise ValueError(f"{position}: {e}") from e
            if isinstance(review,dict) and review.get("dat") is True and not review.get("loi"):
                target["mo_hinh_3d"] = model
                repaired.add(index)
                break
            problem = str(review.get("loi") or "Bản vẽ chưa được xác nhận") if isinstance(review,dict) else "Thiếu kết quả đối chiếu"
        else:
            raise ValueError(f"{position}: {problem}")
