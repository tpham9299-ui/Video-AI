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


def hoi_json(prompt):
    keys = re.split(r"[\s,;]+", " ".join(os.getenv(k, "") for k in ("GEMINI_KEYS","GEMINI_API_KEY")).strip())
    if not any(keys):
        raise ValueError("Chưa có khóa Gemini để tạo bản vẽ mới")
    request = {"keys": keys, "model": "gemini-2.5-flash", "gioiHanGiay": 60,
               "bodies": [{"contents": [{"parts": [{"text": prompt}]}],
                           "generationConfig": {"temperature": 0.1, "responseMimeType":"application/json"}}]}
    with tempfile.NamedTemporaryFile(mode="w") as f:
        json.dump(request, f)
        f.flush()
        try:
            result = subprocess.run(["node", str(Path(__file__).parent / "bophan1/goi_gemini.js"), f.name],
                                    capture_output=True, text=True, check=True, timeout=90)
            response = json.loads(result.stdout)[0]
            if not response.get("ok"):
                raise ValueError("Gemini chưa tạo được bản vẽ")
            parts = json.loads(response["raw"])["candidates"][0]["content"]["parts"]
            return json.loads("".join(p.get("text","") for p in parts if not p.get("thought")))
        except (subprocess.SubprocessError, KeyError, IndexError, json.JSONDecodeError) as e:
            raise ValueError("Không đọc được bản vẽ JSON từ Gemini") from e


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
