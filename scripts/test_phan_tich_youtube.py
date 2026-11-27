#!/usr/bin/env python3
"""Unit test giả lập dữ liệu YouTube Data API & YouTube Analytics API cho `scripts/phan_tich_youtube.py`.

Xác nhận:
  1. Chọn đúng Top 2 bài hiệu suất cao nhất cho từng chuyên mục (HINH_PHANG, HINH_KHONG_GIAN, THUC_TE, XAC_SUAT).
  2. Bài giữ chân cao + qua 3 giây đầu tốt thắng bài câu view/giữ chân kém; chống nhiễu mẫu nhỏ (< 50 views).
  3. Lọc đúng cửa sổ 7–30 ngày gần nhất và bỏ qua bài đã có sẵn trong `mau_vang/index.json`.
  4. Chấm điểm fallback bằng `views` + `likes/views` hoạt động chuẩn khi Analytics không trả giữ chân.
  5. Báo cáo Zalo gọn (<= 1900 ký tự), đủ lệnh `/hay <ID>` 1 chạm và gửi đúng Zalo Bot API.
  6. Không crash & thoát sạch (exit_code == 0) có hướng dẫn cấp quyền rõ khi thiếu scope (403/401/invalid_grant/thiếu secret)
     hoặc khi API trả dữ liệu rỗng / lỗi 400 ở metric tùy chọn 3 giây đầu.

Chạy kiểm thử:
    python -X utf8 scripts/test_phan_tich_youtube.py
"""
import datetime
import io
import json
import os
from pathlib import Path
import sys
import tempfile
from contextlib import redirect_stdout

SCRIPTS_DIR = Path(__file__).resolve().parent
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

import phan_tich_youtube as pt  # noqa: E402

HOM_NAY = datetime.date(2026, 11, 27)


def _tao_mock_api(
    playlist_items=None,
    video_details=None,
    analytics_rows=None,
    analytics_cols=None,
    analytics_status=200,
    analytics_error=None,
    retention_curves=None,
    retention_status=200,
    oauth_status=200,
    oauth_body=None,
    channels_status=200,
    channels_body=None,
):
    """Tạo hàm `http_call` giả lập trọn bộ YouTube OAuth + Data API + Analytics API + Zalo Bot API."""
    zalo_calls = []
    api_calls = []

    def fake_http(url, method="GET", params=None, headers=None, form_data=None, json_body=None, timeout=30, **kwargs):
        api_calls.append({"url": url, "method": method, "params": params or {}, "json_body": json_body})

        if "oauth2.googleapis.com/token" in url:
            body = oauth_body if oauth_body is not None else {"access_token": "mock_access_token"}
            return oauth_status, body

        if "bot-api.zaloplatforms.com" in url:
            zalo_calls.append({"url": url, "body": json_body})
            return 200, {"ok": True, "result": {"message_id": "msg_1"}}

        if "/youtube/v3/channels" in url:
            if channels_body is not None:
                return channels_status, channels_body
            return channels_status, {
                "items": [{"contentDetails": {"relatedPlaylists": {"uploads": "UU_STORY_MATH"}}}]
            }

        if "/youtube/v3/playlistItems" in url:
            return 200, {"items": playlist_items or []}

        if "/youtube/v3/videos" in url:
            requested = set(str((params or {}).get("id") or "").split(","))
            items = [v for v in (video_details or []) if v.get("id") in requested]
            return 200, {"items": items}

        if "youtubeanalytics.googleapis.com/v2/reports" in url:
            dims = str((params or {}).get("dimensions") or "")
            if dims == "elapsedVideoTimeRatio":
                if retention_status >= 400:
                    return retention_status, {"error": {"code": retention_status, "message": "Metric unsupported"}}
                filt = str((params or {}).get("filters") or "")
                vid = filt.replace("video==", "")
                rows = (retention_curves or {}).get(vid, [])
                return 200, {
                    "columnHeaders": [{"name": "elapsedVideoTimeRatio"}, {"name": "audienceWatchRatio"}],
                    "rows": rows,
                }
            if analytics_status >= 400:
                return analytics_status, analytics_error or {"error": {"code": analytics_status}}
            cols = analytics_cols or ["video", "views", "likes", "averageViewPercentage", "averageViewDuration"]
            return 200, {
                "columnHeaders": [{"name": c} for c in cols],
                "rows": analytics_rows if analytics_rows is not None else [],
            }

        return 404, {"error": "unknown mock url: " + url}

    return fake_http, zalo_calls, api_calls


def _tao_du_lieu_mau_da_chuyen_muc():
    """Bộ dữ liệu giả lập gồm 13 video across 4 chuyên mục + bài ngoài cửa sổ 7–30 ngày + bài đã nằm kho vàng."""
    mau = [
        # --- HINH_PHANG (3 bài trong cửa sổ 7–30 ngày + 1 bài đã nằm trong mau_vang) ---
        ("YT_HP_TOP1", "2026-11-12T11:30:00Z", "Tứ giác nội tiếp kẻ 1 đường phụ #shorts", "Mã VD261112-113000-0 #hinhhoc", ["hinhhoc", "toan9"], "PT52S", 8200, 610, 98.5, 51.0, 0.84),
        ("YT_HP_TOP2", "2026-11-15T19:30:00Z", "Tam giác đồng dạng chốt nhanh góc vuông #shorts", "Mã VD261115-193000-0 #hinhhoc", ["hinhhoc"], "PT48S", 4600, 310, 89.2, 42.8, 0.76),
        ("YT_HP_LOW", "2026-11-10T11:30:00Z", "Đường tròn tiếp tuyến dài dòng #shorts", "Mã VD261110-113000-0 #hinhhoc", ["hinhhoc"], "PT55S", 6000, 90, 41.0, 22.5, 0.35),
        ("YT_HP_GOLD", "2026-11-14T11:30:00Z", "Bài đã có sẵn trong kho vàng #shorts", "Mã MV-HP-01 #hinhhoc", ["hinhhoc"], "PT50S", 50000, 4500, 115.0, 57.5, 0.92),

        # --- HINH_KHONG_GIAN (3 bài, có 1 bài mẫu siêu nhỏ 2 views phải bị hạ trọng số) ---
        ("YT_KG_TOP1", "2026-11-08T19:30:00Z", "Hình chóp S.ABCD tính khoảng cách 3 pha #shorts", "Mã VD261108-193000-0 #hinhhoc", ["hinhhoc", "toan11"], "PT54S", 9500, 740, 96.4, 52.0, 0.82),
        ("YT_KG_TOP2", "2026-11-18T11:30:00Z", "Lăng trụ đứng góc giữa đường và mặt phẳng #shorts", "Mã VD261118-113000-0 #hinhhoc", ["hinhhoc", "toan11"], "PT50S", 3200, 220, 86.0, 43.0, 0.74),
        ("YT_KG_TINY", "2026-11-16T11:30:00Z", "Tứ diện đều mới có 2 lượt xem #shorts", "Mã VD261116-113000-0 #hinhhoc", ["hinhhoc"], "PT45S", 2, 1, 118.0, 53.0, 0.95),

        # --- THUC_TE (3 bài) ---
        ("YT_TT_TOP1", "2026-11-05T11:30:00Z", "Tối ưu lợi nhuận giá vé tăng giảm #shorts", "Mã VD261105-113000-0 #toanthucte", ["toanthucte"], "PT51S", 14200, 1120, 102.0, 52.0, 0.86),
        ("YT_TT_TOP2", "2026-11-19T19:30:00Z", "Bể nước mở 2 vòi sau mấy giờ đầy #shorts", "Mã VD261119-193000-0 #toanthucte", ["toanthucte"], "PT49S", 5100, 340, 88.5, 43.4, 0.75),
        ("YT_TT_LOW", "2026-11-04T19:30:00Z", "Lãi suất kép gửi tiết kiệm #shorts", "Mã VD261104-193000-0 #toanthucte", ["toanthucte"], "PT56S", 1200, 25, 48.0, 26.8, 0.42),

        # --- XAC_SUAT (2 bài trong cửa sổ) ---
        ("YT_XS_TOP1", "2026-11-09T11:30:00Z", "Công thức Bayes 3 hộp bi đỏ xanh #shorts", "Mã VD261109-113000-0 #xacsuat", ["xacsuat", "toan12"], "PT53S", 11800, 890, 95.0, 50.3, 0.81),
        ("YT_XS_TOP2", "2026-11-17T19:30:00Z", "Xác suất tung 2 xúc xắc tổng bằng 7 #shorts", "Mã VD261117-193000-0 #xacsuat", ["xacsuat", "toan11"], "PT46S", 4100, 260, 84.0, 38.6, 0.71),

        # --- NGOÀI CỬA SỔ 7–30 NGÀY (phải bị lọc bỏ) ---
        ("YT_TOO_NEW", "2026-11-25T11:30:00Z", "Bài mới đăng 2 ngày trước #shorts", "Mã VD261125-113000-0 #xacsuat", ["xacsuat"], "PT50S", 99000, 9900, 120.0, 60.0, 0.95),
        ("YT_TOO_OLD", "2026-10-10T11:30:00Z", "Bài cũ đăng 48 ngày trước #shorts", "Mã VD261010-113000-0 #toanthucte", ["toanthucte"], "PT50S", 88000, 8800, 118.0, 59.0, 0.94),
    ]

    playlist_items = []
    video_details = []
    analytics_rows = []
    retention_curves = {}
    for vid, pub, title, desc, tags, dur, views, likes, avg_pct, avg_dur, r3s in mau:
        playlist_items.append(
            {
                "snippet": {"title": title, "description": desc, "publishedAt": pub},
                "contentDetails": {"videoId": vid, "videoPublishedAt": pub},
            }
        )
        video_details.append(
            {
                "id": vid,
                "snippet": {"title": title, "description": desc, "tags": tags, "publishedAt": pub},
                "statistics": {"viewCount": str(views), "likeCount": str(likes), "commentCount": "12"},
                "contentDetails": {"duration": dur},
            }
        )
        analytics_rows.append([vid, views, likes, avg_pct, avg_dur])
        # Đường cong giữ chân gần mốc 3s (~0.06 thời lượng)
        retention_curves[vid] = [[0.01, 0.99], [0.06, r3s], [0.50, avg_pct / 120.0], [1.0, 0.40]]

    return playlist_items, video_details, analytics_rows, retention_curves


def chay_kiem_thu():
    dat, hong = 0, []

    def kiem(ten, dk, chi_tiet=""):
        nonlocal dat
        if dk:
            dat += 1
            print(f"  ✓ {ten}")
        else:
            hong.append(ten + (f" — {chi_tiet}" if chi_tiet else ""))
            print(f"  ✗ {ten}" + (f" — {chi_tiet}" if chi_tiet else ""))

    print("1. Chọn đúng Top 2 hiệu suất cao từng chuyên mục, lọc 7–30 ngày, bỏ bài đã vàng & gửi Zalo")
    pl, vd, an_rows, curves = _tao_du_lieu_mau_da_chuyen_muc()
    fake_http, zalo_calls, _ = _tao_mock_api(
        playlist_items=pl,
        video_details=vd,
        analytics_rows=an_rows,
        retention_curves=curves,
    )
    cu_token = os.environ.get("ZALO_BOT_TOKEN")
    cu_chats = os.environ.get("ZALO_CHAT_IDS")
    os.environ["ZALO_BOT_TOKEN"] = "TEST_BOT_TOKEN"
    os.environ["ZALO_CHAT_IDS"] = "chat_01,chat_02"
    try:
        buf = io.StringIO()
        with redirect_stdout(buf):
            kq = pt.chay_phan_tich_tuan(
                hom_nay=HOM_NAY,
                tu_ngay_truoc=30,
                den_ngay_truoc=7,
                top_k=2,
                duong_mau_vang=pt.MAU_VANG_INDEX_MAC_DINH,
                gui_zalo=True,
                http_call=fake_http,
                client_id="cid",
                client_secret="csec",
                refresh_token="rtok",
            )
    finally:
        if cu_token is None:
            os.environ.pop("ZALO_BOT_TOKEN", None)
        else:
            os.environ["ZALO_BOT_TOKEN"] = cu_token
        if cu_chats is None:
            os.environ.pop("ZALO_CHAT_IDS", None)
        else:
            os.environ["ZALO_CHAT_IDS"] = cu_chats

    dx = kq["de_xuat"]
    kiem("Thoát sạch exit_code == 0 và trang_thai == 'thanh_cong'", kq["exit_code"] == 0 and kq["trang_thai"] == "thanh_cong")
    kiem("Lọc đúng cửa sổ 7–30 ngày (12 bài hợp lệ, loại bài 2 ngày & 48 ngày)", kq["tong_quet"] == 12, f"tong_quet={kq['tong_quet']}")
    kiem("Loại bài đã có sẵn trong mau_vang/index.json (MV-HP-01)", kq["da_bo_qua_vang"] == 1 and all(x["id"] != "MV-HP-01" for x in dx["HINH_PHANG"]))
    kiem(
        "HINH_PHANG chọn đúng Top 2 (giữ chân cao thắng bài 6K view giữ chân 41%)",
        [x["id"] for x in dx["HINH_PHANG"]] == ["VD261112-113000-0", "VD261115-193000-0"],
        str([x["id"] for x in dx["HINH_PHANG"]]),
    )
    kiem(
        "HINH_KHONG_GIAN chọn đúng Top 2 (bài 2 views không đánh bại bài 3.2K–9.5K views)",
        [x["id"] for x in dx["HINH_KHONG_GIAN"]] == ["VD261108-193000-0", "VD261118-113000-0"],
        str([x["id"] for x in dx["HINH_KHONG_GIAN"]]),
    )
    kiem(
        "THUC_TE chọn đúng Top 2 theo hiệu suất tổng hợp",
        [x["id"] for x in dx["THUC_TE"]] == ["VD261105-113000-0", "VD261119-193000-0"],
        str([x["id"] for x in dx["THUC_TE"]]),
    )
    kiem(
        "XAC_SUAT chọn đúng Top 2 theo hiệu suất tổng hợp",
        [x["id"] for x in dx["XAC_SUAT"]] == ["VD261109-113000-0", "VD261117-193000-0"],
        str([x["id"] for x in dx["XAC_SUAT"]]),
    )
    kiem(
        "Đọc được chỉ số 3 giây đầu từ retention curve cho Top bài",
        dx["HINH_PHANG"][0]["ty_le_3s"] == 84.0 and dx["THUC_TE"][0]["ty_le_3s"] == 86.0,
        f"hp={dx['HINH_PHANG'][0]['ty_le_3s']}, tt={dx['THUC_TE'][0]['ty_le_3s']}",
    )
    bao_cao = kq["bao_cao"]
    kiem(
        "Báo cáo Zalo gọn <= 1900 ký tự và chứa đủ lệnh `/hay <ID>` cho mọi bài Top 2",
        len(bao_cao) <= 1900
        and all(f"/hay {item['id']}" in bao_cao for cm in pt.CHUYEN_MUC_CHUAN for item in dx[cm]),
        f"len={len(bao_cao)}",
    )
    kiem(
        "Gửi báo cáo trực tiếp tới đủ 2 Zalo chat_id qua Zalo Bot API",
        kq["gui_zalo"]["da_gui"] is True and kq["gui_zalo"]["so_nguoi_nhan"] == 2 and len(zalo_calls) == 2,
        str(kq["gui_zalo"]),
    )

    print("2. Chế độ dự phòng (Analytics rows rỗng / lỗi 400 ở metric 3s) vẫn chấm theo views + likes/views")
    fake_fb, _, _ = _tao_mock_api(
        playlist_items=pl,
        video_details=vd,
        analytics_rows=[],
        retention_status=400,
    )
    with redirect_stdout(io.StringIO()):
        kq_fb = pt.chay_phan_tich_tuan(
            hom_nay=HOM_NAY,
            gui_zalo=False,
            http_call=fake_fb,
            client_id="cid",
            client_secret="csec",
            refresh_token="rtok",
        )
    kiem(
        "Analytics trả rows rỗng không crash, tự chuyển sang chấm bằng views + likes/views",
        kq_fb["exit_code"] == 0
        and kq_fb["trang_thai"] == "thanh_cong"
        and kq_fb["de_xuat"]["THUC_TE"][0]["id"] == "VD261105-113000-0"
        and kq_fb["de_xuat"]["THUC_TE"][0]["che_do_diem"] == "views_va_likes",
        str(kq_fb["de_xuat"]["THUC_TE"][:1]),
    )

    print("3. Kiểm tra không crash khi API thiếu quyền/scope (403, 401, invalid_grant, thiếu secrets)")
    # 3a. HTTP 403 ACCESS_TOKEN_SCOPE_INSUFFICIENT từ Analytics API
    fake_403, _, _ = _tao_mock_api(
        playlist_items=pl,
        video_details=vd,
        analytics_status=403,
        analytics_error={
            "error": {
                "code": 403,
                "message": "Request had insufficient authentication scopes.",
                "status": "PERMISSION_DENIED",
                "details": [{"reason": "ACCESS_TOKEN_SCOPE_INSUFFICIENT"}],
            }
        },
    )
    buf_403 = io.StringIO()
    with redirect_stdout(buf_403):
        kq_403 = pt.chay_phan_tich_tuan(
            hom_nay=HOM_NAY,
            gui_zalo=False,
            http_call=fake_403,
            client_id="cid",
            client_secret="csec",
            refresh_token="rtok",
        )
    log_403 = buf_403.getvalue()
    kiem(
        "Thiếu scope Analytics (HTTP 403) thoát sạch exit_code == 0 và in hướng dẫn yt-analytics.readonly",
        kq_403["exit_code"] == 0
        and kq_403["trang_thai"] == "thieu_quyen"
        and "yt-analytics.readonly" in log_403
        and "youtubeanalytics.googleapis.com" in log_403,
    )

    # 3b. HTTP 401 UNAUTHENTICATED
    fake_401, _, _ = _tao_mock_api(
        playlist_items=pl,
        video_details=vd,
        analytics_status=401,
        analytics_error={"error": {"code": 401, "status": "UNAUTHENTICATED"}},
    )
    with redirect_stdout(io.StringIO()):
        kq_401 = pt.chay_phan_tich_tuan(
            hom_nay=HOM_NAY,
            gui_zalo=False,
            http_call=fake_401,
            client_id="cid",
            client_secret="csec",
            refresh_token="rtok",
        )
    kiem("HTTP 401 UNAUTHENTICATED thoát sạch exit_code == 0, trang_thai == 'thieu_quyen'", kq_401["exit_code"] == 0 and kq_401["trang_thai"] == "thieu_quyen")

    # 3c. OAuth invalid_grant
    fake_oauth, _, _ = _tao_mock_api(
        oauth_status=400,
        oauth_body={"error": "invalid_grant", "error_description": "Token has been expired or revoked."},
    )
    with redirect_stdout(io.StringIO()):
        kq_oauth = pt.chay_phan_tich_tuan(
            hom_nay=HOM_NAY,
            gui_zalo=False,
            http_call=fake_oauth,
            client_id="cid",
            client_secret="csec",
            refresh_token="rtok_het_han",
        )
    kiem("OAuth invalid_grant thoát sạch exit_code == 0 có cảnh báo", kq_oauth["exit_code"] == 0 and kq_oauth["trang_thai"] == "thieu_quyen")

    # 3d. Thiếu hoàn toàn YT secrets
    with redirect_stdout(io.StringIO()):
        kq_no_sec = pt.chay_phan_tich_tuan(
            hom_nay=HOM_NAY,
            gui_zalo=False,
            http_call=fake_http,
            client_id="",
            client_secret="",
            refresh_token="",
        )
    kiem("Thiếu YT_CLIENT_ID/SECRET/REFRESH_TOKEN thoát sạch exit_code == 0", kq_no_sec["exit_code"] == 0 and kq_no_sec["trang_thai"] == "thieu_quyen")

    print("4. Kiểm tra API rỗng (0 video / không có kênh) & mau_vang/index.json không tồn tại")
    fake_empty, zalo_empty, _ = _tao_mock_api(playlist_items=[], video_details=[], analytics_rows=[])
    with redirect_stdout(io.StringIO()):
        kq_empty = pt.chay_phan_tich_tuan(
            hom_nay=HOM_NAY,
            gui_zalo=True,
            http_call=fake_empty,
            client_id="cid",
            client_secret="csec",
            refresh_token="rtok",
        )
    kiem(
        "Danh sách video rỗng thoát sạch exit_code == 0 và không spam Zalo",
        kq_empty["exit_code"] == 0 and kq_empty["trang_thai"] == "khong_co_video" and len(zalo_empty) == 0,
    )

    fake_no_ch, _, _ = _tao_mock_api(channels_body={"items": []})
    with redirect_stdout(io.StringIO()):
        kq_no_ch = pt.chay_phan_tich_tuan(
            hom_nay=HOM_NAY,
            gui_zalo=False,
            http_call=fake_no_ch,
            client_id="cid",
            client_secret="csec",
            refresh_token="rtok",
        )
    kiem("Kênh rỗng (items: []) không crash, thoát sạch exit_code == 0", kq_no_ch["exit_code"] == 0 and kq_no_ch["trang_thai"] == "khong_co_video")

    with tempfile.TemporaryDirectory() as tmp:
        khong_co = Path(tmp) / "khong_ton_tai.json"
        ids_rong = pt.doc_id_da_co_mau_vang(khong_co)
        kiem("mau_vang/index.json không tồn tại trả tập rỗng an toàn", ids_rong == set())

    print("5. Kiểm tra ánh xạ video_id -> mã bài nội bộ & fallback YouTube video_id")
    anh_xa = {"YT_ABC123": {"id": "VD261120-090000-1", "chuyen_muc": "HINH_KHONG_GIAN"}}
    id_map = pt.trich_ma_bai_noi_bo({"video_id": "YT_ABC123", "title": "Bài toán hay"}, anh_xa=anh_xa)
    cm_map = pt.phan_loai_chuyen_muc({"video_id": "YT_ABC123", "title": "Bài toán hay"}, anh_xa=anh_xa)
    id_fb = pt.trich_ma_bai_noi_bo({"video_id": "YT_RAW999", "title": "Không có mã nội bộ"})
    kiem(
        "Ánh xạ ưu tiên mã nội bộ & chuyên mục, fallback sang video_id khi thiếu mã VD",
        id_map == "VD261120-090000-1" and cm_map == "HINH_KHONG_GIAN" and id_fb == "YT_RAW999",
        f"{id_map}, {cm_map}, {id_fb}",
    )

    print(f"\nKết quả test_phan_tich_youtube: {dat} đạt, {len(hong)} hỏng")
    if hong:
        for h in hong:
            print("  HỎNG:", h)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(chay_kiem_thu())
