#!/usr/bin/env python3
"""Phân tích hiệu suất YouTube Analytics định kỳ hàng tuần và đề xuất kịch bản vào kho vàng.

Chạy độc lập qua workflow `.github/workflows/phan-tich-tuan.yml` (KHÔNG can thiệp luồng BP0–BP5).

Chức năng chính:
  1. Đọc danh sách video đã đăng trong khoảng 7–30 ngày gần nhất của kênh qua YouTube Data API v3.
  2. Lấy chỉ số giữ chân (`averageViewPercentage`, tỷ lệ xem qua 3 giây đầu nếu API trả về,
     và `views` + `likes/views`) qua YouTube Analytics API v2.
  3. Nếu thiếu secrets hoặc thiếu quyền/scope Analytics API (`yt-analytics.readonly` / `youtube.readonly`):
     ghi log hướng dẫn cấp quyền rõ ràng và thoát sạch với mã thoát 0 (không báo đỏ vô ích).
  4. Tự chấm điểm hiệu suất (thang 100), loại bỏ bài đã có trong `mau_vang/index.json`,
     chọn Top 2 bài tốt nhất từng chuyên mục (`HINH_PHANG`, `HINH_KHONG_GIAN`, `THUC_TE`, `XAC_SUAT`)
     và gửi báo cáo gọn về Zalo kèm lệnh `/hay <ID>` để duyệt 1 chạm.
"""
import argparse
import datetime
import json
import math
import os
from pathlib import Path
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
MAU_VANG_INDEX_MAC_DINH = ROOT / "mau_vang" / "index.json"

CHUYEN_MUC_CHUAN = ("HINH_PHANG", "HINH_KHONG_GIAN", "THUC_TE", "XAC_SUAT")
TEN_CHUYEN_MUC = {
    "HINH_PHANG": "📐 Hình phẳng",
    "HINH_KHONG_GIAN": "🧊 Hình không gian",
    "THUC_TE": "🌍 Toán thực tế",
    "XAC_SUAT": "🎲 Xác suất",
}

YOUTUBE_OAUTH_URL = "https://oauth2.googleapis.com/token"
YOUTUBE_DATA_API = "https://www.googleapis.com/youtube/v3"
YOUTUBE_ANALYTICS_API = "https://youtubeanalytics.googleapis.com/v2/reports"
ZALO_BOT_API_TMPL = "https://bot-api.zaloplatforms.com/bot{token}/sendMessage"

SCOPES_CAN_CAP = (
    "https://www.googleapis.com/auth/yt-analytics.readonly",
    "https://www.googleapis.com/auth/youtube.readonly",
)

NGUONG_LUOT_XEM_TIN_CAY = 50
GIOI_HAN_TIN_ZALO = 1900

RE_MA_BAI = re.compile(r"\b((?:VD\d{6}-\d{6}-\d+(?:-10P)?)|(?:MV-[A-Z]{2,4}-\d+))\b", re.IGNORECASE)
RE_ISO_DURATION = re.compile(r"^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$")


class ThieuQuyenAnalytics(Exception):
    """Thiếu thông tin xác thực hoặc thiếu quyền/scope YouTube Analytics API."""

    def __init__(self, ly_do, chi_tiet=""):
        super().__init__(ly_do)
        self.ly_do = str(ly_do or "Thiếu quyền truy cập YouTube Analytics API")
        self.chi_tiet = str(chi_tiet or "")


def env(khoa, mac_dinh=""):
    return (os.environ.get(khoa) or mac_dinh).strip()


def goi_http_json(
    url,
    method="GET",
    params=None,
    headers=None,
    form_data=None,
    json_body=None,
    timeout=30,
    so_lan=3,
    tre_goc=3,
    sleep_fn=time.sleep,
):
    """Gọi HTTP bằng thư viện chuẩn urllib với retry/backoff cho lỗi mạng & HTTP 5xx.
    Trả về `(status_code, data_dict)` (không ném exception cho HTTP 4xx để caller tự phân loại quyền)."""
    full_url = url
    if params:
        q = urllib.parse.urlencode([(k, str(v)) for k, v in params.items() if v is not None and v != ""])
        if q:
            full_url = url + ("&" if "?" in url else "?") + q

    req_headers = dict(headers or {})
    body_bytes = None
    if json_body is not None:
        body_bytes = json.dumps(json_body, ensure_ascii=False).encode("utf-8")
        req_headers.setdefault("Content-Type", "application/json; charset=utf-8")
    elif form_data is not None:
        body_bytes = urllib.parse.urlencode(form_data).encode("utf-8")
        req_headers.setdefault("Content-Type", "application/x-www-form-urlencoded")

    loi_cuoi = None
    for lan in range(max(1, int(so_lan))):
        req = urllib.request.Request(full_url, data=body_bytes, headers=req_headers, method=method.upper())
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                raw = resp.read().decode("utf-8", errors="replace")
                return resp.status, _parse_json_an_toan(raw)
        except urllib.error.HTTPError as e:
            raw = ""
            try:
                raw = e.read().decode("utf-8", errors="replace")
            except Exception:
                pass
            data = _parse_json_an_toan(raw)
            if e.code < 500 or lan == so_lan - 1:
                return e.code, data
            loi_cuoi = RuntimeError("HTTP %d" % e.code)
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            loi_cuoi = e
            if lan == so_lan - 1:
                raise
        tre = tre_goc * (2 ** lan)
        print("Mạng/API tạm lỗi (%s), thử lại sau %ds (%d/%d)..." % (str(loi_cuoi)[:100], tre, lan + 1, so_lan))
        if sleep_fn:
            sleep_fn(tre)
    raise loi_cuoi or RuntimeError("Lỗi gọi HTTP không xác định")


def _parse_json_an_toan(raw):
    if not raw or not str(raw).strip():
        return {}
    try:
        v = json.loads(raw)
        return v if isinstance(v, dict) else {"data": v}
    except Exception:
        return {"raw": str(raw)[:400]}


def la_loi_thieu_quyen(status_code, payload):
    """Nhận diện các lỗi thiếu quyền, thiếu OAuth scope hoặc chưa bật YouTube Analytics API."""
    if status_code in (401, 403):
        return True
    van = json.dumps(payload or {}, ensure_ascii=False).lower()
    dau_hieu = (
        "insufficientpermissions",
        "access_token_scope_insufficient",
        "insufficient authentication scopes",
        "invalid_scope",
        "invalid_grant",
        "unauthorized_client",
        "accessnotconfigured",
        "has not been used in project",
        "permission_denied",
        "unauthenticated",
        "forbidden",
        "analytics api has not been",
    )
    return any(k in van for k in dau_hieu)


def huong_dan_cap_quyen(ly_do="", chi_tiet=""):
    """Tạo thông điệp hướng dẫn cấp quyền YouTube Analytics API rõ ràng từng bước."""
    dong = [
        "⚠️ CẢNH BÁO: Chưa đủ quyền/scope để đọc YouTube Analytics API (thoát sạch mã 0, không ảnh hưởng BP0–BP5).",
    ]
    if ly_do:
        dong.append("• Nguyên nhân: %s" % ly_do)
    if chi_tiet:
        dong.append("• Chi tiết API: %s" % str(chi_tiet)[:240])
    dong.extend(
        [
            "",
            "📋 HƯỚNG DẪN CẤP QUYỀN (làm 1 lần trong ~2 phút):",
            "  1. Mở Google Cloud Console > APIs & Services > Library, bật cả 2 API:",
            "     - YouTube Analytics API: https://console.cloud.google.com/apis/library/youtubeanalytics.googleapis.com",
            "     - YouTube Data API v3:   https://console.cloud.google.com/apis/library/youtube.googleapis.com",
            "  2. Vào OAuth 2.0 Playground (https://developers.google.com/oauthplayground/), bấm bánh răng chọn",
            "     'Use your own OAuth credentials' và dán YT_CLIENT_ID / YT_CLIENT_SECRET của kênh.",
            "  3. Chọn đủ các scope sau rồi bấm Authorize APIs bằng tài khoản chủ kênh YouTube:",
            "     - https://www.googleapis.com/auth/yt-analytics.readonly",
            "     - https://www.googleapis.com/auth/youtube.readonly",
            "     (Nếu dùng chung token với BP5 đăng video, tick thêm youtube.upload và youtube.force-ssl).",
            "  4. Đổi Authorization code lấy Refresh token mới, sau đó cập nhật GitHub Secrets:",
            "     Settings > Secrets and variables > Actions -> YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN.",
        ]
    )
    return "\n".join(dong)


def parse_iso8601_duration(dur):
    """Đổi chuỗi thời lượng ISO-8601 (VD 'PT52S', 'PT1M14S') sang số giây nguyên."""
    m = RE_ISO_DURATION.match(str(dur or "").strip().upper())
    if not m:
        return 0
    gio = int(m.group(1) or 0)
    phut = int(m.group(2) or 0)
    giay = int(m.group(3) or 0)
    return gio * 3600 + phut * 60 + giay


def parse_published_date(ts):
    """Đổi chuỗi thời điểm ISO (VD '2026-11-10T11:30:00Z') sang `datetime.date`."""
    s = str(ts or "").strip()
    if len(s) >= 10:
        try:
            return datetime.date.fromisoformat(s[:10])
        except ValueError:
            pass
    return None


def lay_access_token_youtube(client_id, client_secret, refresh_token, http_call=goi_http_json):
    """Đổi `YT_REFRESH_TOKEN` lấy `access_token` ngắn hạn."""
    if not client_id or not client_secret or not refresh_token:
        raise ThieuQuyenAnalytics(
            "Thiếu GitHub Secrets YT_CLIENT_ID / YT_CLIENT_SECRET / YT_REFRESH_TOKEN"
        )
    status, data = http_call(
        YOUTUBE_OAUTH_URL,
        method="POST",
        form_data={
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        },
        timeout=30,
    )
    if status >= 400 or not data.get("access_token"):
        chi_tiet = data.get("error_description") or data.get("error") or json.dumps(data, ensure_ascii=False)[:200]
        if la_loi_thieu_quyen(status, data) or status in (400, 401, 403):
            raise ThieuQuyenAnalytics("Không làm mới được OAuth token YouTube (HTTP %d)" % status, chi_tiet)
        raise RuntimeError("Lỗi lấy OAuth token YouTube (HTTP %d): %s" % (status, chi_tiet))
    return str(data["access_token"])


def lay_danh_sach_video_da_dang(
    access_token,
    tu_ngay,
    den_ngay,
    http_call=goi_http_json,
    toi_da_trang=10,
):
    """Đọc danh sách video của kênh đã đăng trong khoảng `[tu_ngay, den_ngay]` (bao gồm cả 2 đầu)."""
    headers = {"Authorization": "Bearer " + access_token}
    st_ch, ch_data = http_call(
        YOUTUBE_DATA_API + "/channels",
        method="GET",
        params={"part": "contentDetails", "mine": "true"},
        headers=headers,
        timeout=30,
    )
    if st_ch >= 400:
        if la_loi_thieu_quyen(st_ch, ch_data):
            raise ThieuQuyenAnalytics(
                "Thiếu quyền đọc kênh YouTube (youtube.readonly, HTTP %d)" % st_ch,
                json.dumps(ch_data, ensure_ascii=False)[:220],
            )
        raise RuntimeError("YouTube Data API channels lỗi HTTP %d" % st_ch)

    items = ch_data.get("items") or []
    if not items:
        return []
    uploads_id = (
        (items[0].get("contentDetails") or {})
        .get("relatedPlaylists", {})
        .get("uploads")
    )
    if not uploads_id:
        return []

    ung_vien = []
    page_token = None
    for _ in range(max(1, int(toi_da_trang))):
        params = {"part": "snippet,contentDetails", "playlistId": uploads_id, "maxResults": 50}
        if page_token:
            params["pageToken"] = page_token
        st_pl, pl_data = http_call(
            YOUTUBE_DATA_API + "/playlistItems",
            method="GET",
            params=params,
            headers=headers,
            timeout=30,
        )
        if st_pl >= 400:
            if la_loi_thieu_quyen(st_pl, pl_data):
                raise ThieuQuyenAnalytics(
                    "Thiếu quyền đọc danh sách video đã đăng (HTTP %d)" % st_pl,
                    json.dumps(pl_data, ensure_ascii=False)[:220],
                )
            raise RuntimeError("YouTube Data API playlistItems lỗi HTTP %d" % st_pl)

        pl_items = pl_data.get("items") or []
        if not pl_items:
            break
        co_cu_hon_khoang = False
        for it in pl_items:
            snip = it.get("snippet") or {}
            cd = it.get("contentDetails") or {}
            vid = str(cd.get("videoId") or (snip.get("resourceId") or {}).get("videoId") or "").strip()
            pub_raw = cd.get("videoPublishedAt") or snip.get("publishedAt") or ""
            pub_date = parse_published_date(pub_raw)
            if not vid or pub_date is None:
                continue
            if pub_date < tu_ngay:
                co_cu_hon_khoang = True
                continue
            if tu_ngay <= pub_date <= den_ngay:
                ung_vien.append(
                    {
                        "video_id": vid,
                        "title": str(snip.get("title") or "").strip(),
                        "description": str(snip.get("description") or "").strip(),
                        "published_at": pub_raw,
                        "published_date": pub_date.isoformat(),
                        "tags": [],
                        "duration_sec": 0,
                        "views": 0,
                        "likes": 0,
                        "comments": 0,
                    }
                )
        page_token = pl_data.get("nextPageToken")
        if not page_token or co_cu_hon_khoang:
            break

    if not ung_vien:
        return []

    # Bổ sung thống kê & tags & thời lượng từ videos.list (50 video/lần)
    theo_id = {v["video_id"]: v for v in ung_vien}
    ds_ids = list(theo_id.keys())
    for i in range(0, len(ds_ids), 50):
        nhom = ds_ids[i : i + 50]
        st_v, v_data = http_call(
            YOUTUBE_DATA_API + "/videos",
            method="GET",
            params={"part": "snippet,statistics,contentDetails", "id": ",".join(nhom)},
            headers=headers,
            timeout=30,
        )
        if st_v >= 400:
            if la_loi_thieu_quyen(st_v, v_data):
                raise ThieuQuyenAnalytics(
                    "Thiếu quyền đọc chi tiết video (HTTP %d)" % st_v,
                    json.dumps(v_data, ensure_ascii=False)[:220],
                )
            continue
        for it in v_data.get("items") or []:
            vid = str(it.get("id") or "").strip()
            muc = theo_id.get(vid)
            if not muc:
                continue
            snip = it.get("snippet") or {}
            stats = it.get("statistics") or {}
            cd = it.get("contentDetails") or {}
            muc["title"] = str(snip.get("title") or muc["title"]).strip()
            muc["description"] = str(snip.get("description") or muc["description"]).strip()
            muc["tags"] = [str(t) for t in (snip.get("tags") or []) if t]
            muc["duration_sec"] = parse_iso8601_duration(cd.get("duration"))
            muc["views"] = _so_nguyen(stats.get("viewCount"))
            muc["likes"] = _so_nguyen(stats.get("likeCount"))
            muc["comments"] = _so_nguyen(stats.get("commentCount"))

    return list(theo_id.values())


def _so_nguyen(v):
    try:
        return max(0, int(float(v)))
    except (TypeError, ValueError):
        return 0


def _so_thuc(v):
    if v is None or v == "":
        return None
    try:
        f = float(v)
        return None if math.isnan(f) or math.isinf(f) else f
    except (TypeError, ValueError):
        return None


def lay_chi_so_analytics(
    access_token,
    videos,
    tu_ngay,
    den_ngay_bao_cao,
    http_call=goi_http_json,
    do_giu_chan_3s=True,
    gioi_han_do_3s=15,
):
    """Truy vấn YouTube Analytics API v2 lấy `views`, `likes`, `averageViewPercentage`,
    `averageViewDuration` và (nếu API hỗ trợ) tỷ lệ xem qua 3 giây đầu.

    Trả về dict `{video_id: {views, likes, averageViewPercentage, averageViewDuration, ty_le_3s}}`.
    Ném `ThieuQuyenAnalytics` khi thiếu quyền/scope Analytics API."""
    ds_ids = [str(v.get("video_id") or "").strip() for v in (videos or []) if v.get("video_id")]
    if not ds_ids:
        return {}

    headers = {"Authorization": "Bearer " + access_token}
    ket_qua = {}
    start_str = tu_ngay.isoformat() if isinstance(tu_ngay, datetime.date) else str(tu_ngay)
    end_str = den_ngay_bao_cao.isoformat() if isinstance(den_ngay_bao_cao, datetime.date) else str(den_ngay_bao_cao)

    for i in range(0, len(ds_ids), 100):
        nhom = ds_ids[i : i + 100]
        params = {
            "ids": "channel==MINE",
            "startDate": start_str,
            "endDate": end_str,
            "dimensions": "video",
            "metrics": "views,likes,averageViewPercentage,averageViewDuration",
            "filters": "video==" + ",".join(nhom),
            "sort": "-views",
            "maxResults": 200,
        }
        st, data = http_call(
            YOUTUBE_ANALYTICS_API,
            method="GET",
            params=params,
            headers=headers,
            timeout=30,
        )
        if st >= 400:
            if la_loi_thieu_quyen(st, data):
                raise ThieuQuyenAnalytics(
                    "Thiếu scope yt-analytics.readonly hoặc chưa bật YouTube Analytics API (HTTP %d)" % st,
                    json.dumps(data, ensure_ascii=False)[:220],
                )
            raise RuntimeError("YouTube Analytics API lỗi HTTP %d: %s" % (st, json.dumps(data, ensure_ascii=False)[:200]))

        cols = [str((c or {}).get("name") or "") for c in (data.get("columnHeaders") or [])]
        for row in data.get("rows") or []:
            if not isinstance(row, (list, tuple)) or not row:
                continue
            ban = _map_dong_analytics(cols, row)
            vid = str(ban.get("video") or "").strip()
            if not vid:
                continue
            avg_pct = _so_thuc(ban.get("averageViewPercentage"))
            avg_dur = _so_thuc(ban.get("averageViewDuration"))
            views = _so_nguyen(ban.get("views"))
            likes = _so_nguyen(ban.get("likes"))
            # Hỗ trợ trực tiếp nếu API (hoặc nguồn dữ liệu mở rộng) trả về chỉ số 3 giây đầu / engagedViews
            ty_le_3s = _trich_ty_le_3s_tu_ban(ban, views)
            ket_qua[vid] = {
                "views": views,
                "likes": likes,
                "averageViewPercentage": avg_pct,
                "averageViewDuration": avg_dur,
                "ty_le_3s": ty_le_3s,
            }

    # Thăm dò tỷ lệ xem qua 3 giây đầu bằng đường cong retention (`elapsedVideoTimeRatio` + `audienceWatchRatio`)
    # Chỉ chạy best-effort cho các video ứng viên có thời lượng > 3s và chưa có `ty_le_3s`; lỗi 400/rỗng tự bỏ qua.
    if do_giu_chan_3s and ket_qua:
        vid_theo_id = {str(v.get("video_id")): v for v in videos}
        ung_vien_3s = [
            vid
            for vid, st_m in sorted(
                ket_qua.items(),
                key=lambda kv: (kv[1].get("views") or 0),
                reverse=True,
            )
            if st_m.get("ty_le_3s") is None
            and _so_nguyen((vid_theo_id.get(vid) or {}).get("duration_sec")) >= 5
            and (st_m.get("views") or 0) > 0
        ][: max(0, int(gioi_han_do_3s))]
        for vid in ung_vien_3s:
            dur = _so_nguyen((vid_theo_id.get(vid) or {}).get("duration_sec"))
            ty_le = lay_ty_le_qua_3s_retention(
                access_token, vid, dur, start_str, end_str, http_call=http_call
            )
            if ty_le is not None:
                ket_qua[vid]["ty_le_3s"] = ty_le

    return ket_qua


def _map_dong_analytics(cols, row):
    if cols and len(cols) == len(row):
        return dict(zip(cols, row))
    # Fallback vị trí mặc định: video, views, likes, averageViewPercentage, averageViewDuration
    ten_mac_dinh = ("video", "views", "likes", "averageViewPercentage", "averageViewDuration", "ty_le_3s")
    return {ten_mac_dinh[i]: row[i] for i in range(min(len(ten_mac_dinh), len(row)))}


def _trich_ty_le_3s_tu_ban(ban, views):
    for khoa in ("ty_le_3s", "threeSecondRetention", "viewedPercentage", "stayedToWatchPercentage"):
        val = _so_thuc(ban.get(khoa))
        if val is not None and val >= 0:
            # Nếu trả dạng tỷ lệ 0..1 thì đổi sang %
            return round(val * 100.0 if val <= 1.0 else val, 1)
    engaged = _so_thuc(ban.get("engagedViews"))
    if engaged is not None and views > 0:
        return round(min(100.0, max(0.0, (engaged / views) * 100.0)), 1)
    return None


def lay_ty_le_qua_3s_retention(access_token, video_id, duration_sec, start_str, end_str, http_call=goi_http_json):
    """Lấy tỷ lệ người xem còn ở lại tại mốc ~3 giây đầu từ `audienceWatchRatio` (non-blocking)."""
    if not video_id or duration_sec <= 3:
        return None
    headers = {"Authorization": "Bearer " + access_token}
    try:
        st, data = http_call(
            YOUTUBE_ANALYTICS_API,
            method="GET",
            params={
                "ids": "channel==MINE",
                "startDate": start_str,
                "endDate": end_str,
                "dimensions": "elapsedVideoTimeRatio",
                "metrics": "audienceWatchRatio",
                "filters": "video==" + str(video_id),
            },
            headers=headers,
            timeout=20,
            so_lan=1,
        )
    except Exception:
        return None
    if st >= 400:
        return None
    rows = data.get("rows") or []
    if not rows:
        return None
    moc_muc_tieu = min(0.95, max(0.01, 3.0 / float(duration_sec)))
    diem_gan = None
    lech_nho_nhat = 999.0
    for r in rows:
        if not isinstance(r, (list, tuple)) or len(r) < 2:
            continue
        t_ratio = _so_thuc(r[0])
        watch_ratio = _so_thuc(r[1])
        if t_ratio is None or watch_ratio is None:
            continue
        lech = abs(t_ratio - moc_muc_tieu)
        if lech < lech_nho_nhat:
            lech_nho_nhat = lech
            diem_gan = watch_ratio
    if diem_gan is None:
        return None
    pct = diem_gan * 100.0 if diem_gan <= 1.5 else diem_gan
    return round(min(100.0, max(0.0, pct)), 1)


def doc_id_da_co_mau_vang(duong_index=MAU_VANG_INDEX_MAC_DINH):
    """Đọc danh sách ID đã có trong `mau_vang/index.json` để tránh đề xuất lặp."""
    ids = set()
    p = Path(duong_index)
    if not p.exists():
        return ids
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
        for muc in data.get("mau") or []:
            if not isinstance(muc, dict):
                continue
            for k in ("id", "video_id", "video_yt"):
                val = str(muc.get(k) or "").strip().upper()
                if val:
                    ids.add(val)
    except Exception as e:
        print("CẢNH BÁO: không đọc được %s: %s" % (p, str(e)[:120]))
    return ids


def trich_ma_bai_noi_bo(video, anh_xa=None):
    """Xác định mã bài nội bộ (`VD...`) để gắn vào lệnh `/hay <ID>`; chưa có thì dùng YouTube `video_id`."""
    vid = str(video.get("video_id") or "").strip()
    if anh_xa and vid in anh_xa:
        item = anh_xa[vid]
        if isinstance(item, dict) and item.get("id"):
            return str(item["id"]).strip()
        if isinstance(item, str) and item.strip():
            return item.strip()
    for k in ("ma_bai", "id_bai", "internal_id"):
        if video.get(k):
            return str(video[k]).strip()
    van = " ".join(
        [
            str(video.get("title") or ""),
            str(video.get("description") or ""),
            " ".join(str(t) for t in (video.get("tags") or [])),
        ]
    )
    m = RE_MA_BAI.search(van)
    if m:
        return m.group(1).upper()
    return vid


def phan_loai_chuyen_muc(video, anh_xa=None):
    """Phân loại video về 1 trong 4 chuyên mục chuẩn: HINH_PHANG | HINH_KHONG_GIAN | THUC_TE | XAC_SUAT."""
    vid = str(video.get("video_id") or "").strip()
    if anh_xa and vid in anh_xa and isinstance(anh_xa[vid], dict):
        cm_map = str(anh_xa[vid].get("chuyen_muc") or "").upper().strip()
        if cm_map in CHUYEN_MUC_CHUAN:
            return cm_map

    for k in ("chuyen_muc", "luong"):
        cm = str(video.get(k) or "").upper().strip()
        if cm in CHUYEN_MUC_CHUAN:
            return cm

    tags = [str(t).lower().lstrip("#") for t in (video.get("tags") or [])]
    van = (
        str(video.get("title") or "")
        + " "
        + str(video.get("description") or "")
        + " "
        + " ".join(tags)
    ).lower()

    # 1. Xác suất
    if (
        "xacsuat" in tags
        or "#xacsuat" in van
        or any(
            kw in van
            for kw in (
                "xác suất",
                "tư duy xác suất",
                "bayes",
                "biến cố",
                "xúc xắc",
                "rút bi",
                "rút thẻ",
                "đồng xu",
                "tổ hợp",
            )
        )
    ):
        return "XAC_SUAT"

    # 2. Hình học (phân tách Không gian vs Phẳng)
    tu_khong_gian = (
        "hình không gian",
        "hình học không gian",
        "hình chóp",
        "lăng trụ",
        "tứ diện",
        "oxyz",
        "mặt phẳng",
        "mặt cầu",
        "nhị diện",
        "hình nón",
        "hình trụ",
        "vuông góc đáy",
        "s.abcd",
        "s.abc",
        "khoảng cách từ điểm đến mặt",
        "hinhkhonggian",
    )
    if any(kw in van for kw in tu_khong_gian):
        return "HINH_KHONG_GIAN"

    tu_hinh_phang = (
        "hinhhoc",
        "#hinhhoc",
        "hình phẳng",
        "tư duy hình học",
        "tứ giác nội tiếp",
        "đường tròn",
        "tam giác đồng dạng",
        "tiếp tuyến",
        "đường cao",
        "trung tuyến",
        "góc nội tiếp",
        "hinhphang",
    )
    if "hinhhoc" in tags or any(kw in van for kw in tu_hinh_phang):
        return "HINH_PHANG"

    # 3. Toán thực tế (mặc định khớp NangCao.gs)
    return "THUC_TE"


def cham_diem_video(video):
    """Chấm điểm hiệu suất video (0..100) dựa trên giữ chân, 3 giây đầu (nếu có), tương tác & lượt xem.

    Cơ chế thích ứng theo chỉ số API trả về:
      - Có đủ `averageViewPercentage` + `ty_le_3s`: 45% giữ chân + 25% 3s đầu + 15% like/view + 15% lượt xem.
      - Chỉ có `averageViewPercentage`:             60% giữ chân + 20% like/view + 20% lượt xem.
      - Chỉ có `views` + `likes` (fallback):        55% lượt xem + 45% like/view.
    Nhân hệ số độ tin cậy mẫu khi `views < 50` để video 1-2 lượt xem không vượt video hàng nghìn lượt xem."""
    views = _so_nguyen(video.get("views"))
    likes = _so_nguyen(video.get("likes"))
    avg_pct = _so_thuc(video.get("averageViewPercentage"))
    ty_le_3s = _so_thuc(video.get("ty_le_3s"))

    like_rate_pct = (likes / views * 100.0) if views > 0 else 0.0
    diem_tuong_tac = min(100.0, max(0.0, (like_rate_pct / 10.0) * 100.0))
    diem_luot_xem = min(100.0, (math.log10(max(1, views)) / 5.0) * 100.0) if views > 0 else 0.0
    he_so_mau = 1.0 if views >= NGUONG_LUOT_XEM_TIN_CAY else (0.45 + 0.55 * (views / float(NGUONG_LUOT_XEM_TIN_CAY)))

    if avg_pct is not None and avg_pct > 0:
        diem_giu_chan = min(100.0, max(0.0, (avg_pct / 120.0) * 100.0))
        if ty_le_3s is not None and ty_le_3s > 0:
            diem_3s = min(100.0, max(0.0, ty_le_3s))
            diem_tho = 0.45 * diem_giu_chan + 0.25 * diem_3s + 0.15 * diem_tuong_tac + 0.15 * diem_luot_xem
            che_do = "analytics_day_du"
        else:
            diem_3s = None
            diem_tho = 0.60 * diem_giu_chan + 0.20 * diem_tuong_tac + 0.20 * diem_luot_xem
            che_do = "analytics_giu_chan"
    else:
        diem_giu_chan = None
        diem_3s = None
        diem_tho = 0.55 * diem_luot_xem + 0.45 * diem_tuong_tac
        che_do = "views_va_likes"

    diem_cuoi = round(diem_tho * he_so_mau, 1)
    return {
        "diem": diem_cuoi,
        "che_do_diem": che_do,
        "ty_le_like": round(like_rate_pct, 2),
        "he_so_mau": round(he_so_mau, 3),
        "diem_giu_chan": round(diem_giu_chan, 1) if diem_giu_chan is not None else None,
        "diem_3s": round(diem_3s, 1) if diem_3s is not None else None,
        "diem_tuong_tac": round(diem_tuong_tac, 1),
        "diem_luot_xem": round(diem_luot_xem, 1),
    }


def gop_du_lieu_video(videos, chi_so_analytics):
    """Hợp nhất metadata Data API với số liệu YouTube Analytics API."""
    ket_qua = []
    an_map = chi_so_analytics or {}
    for v in videos or []:
        vid = str(v.get("video_id") or "").strip()
        if not vid:
            continue
        an = an_map.get(vid) or {}
        muc = dict(v)
        # Ưu tiên số liệu lớn hơn giữa Data API và Analytics (Analytics đôi khi trễ 1-2 ngày)
        muc["views"] = max(_so_nguyen(v.get("views")), _so_nguyen(an.get("views")))
        muc["likes"] = max(_so_nguyen(v.get("likes")), _so_nguyen(an.get("likes")))
        if an.get("averageViewPercentage") is not None:
            muc["averageViewPercentage"] = an["averageViewPercentage"]
        if an.get("averageViewDuration") is not None:
            muc["averageViewDuration"] = an["averageViewDuration"]
        if an.get("ty_le_3s") is not None:
            muc["ty_le_3s"] = an["ty_le_3s"]
        ket_qua.append(muc)
    return ket_qua


def de_xuat_top_theo_chuyen_muc(videos, top_k=2, id_da_co=None, anh_xa=None):
    """Chấm điểm toàn bộ video hợp lệ và chọn Top K bài hiệu suất cao nhất mỗi chuyên mục."""
    da_co = {str(x).strip().upper() for x in (id_da_co or set()) if x}
    nhom = {cm: [] for cm in CHUYEN_MUC_CHUAN}
    so_bo_qua_vang = 0

    for v in videos or []:
        vid = str(v.get("video_id") or "").strip()
        ma_bai = trich_ma_bai_noi_bo(v, anh_xa=anh_xa)
        if not vid and not ma_bai:
            continue
        if (vid and vid.upper() in da_co) or (ma_bai and ma_bai.upper() in da_co):
            so_bo_qua_vang += 1
            continue
        cm = phan_loai_chuyen_muc(v, anh_xa=anh_xa)
        cd = cham_diem_video(v)
        ban_ghi = {
            "id": ma_bai or vid,
            "video_id": vid,
            "chuyen_muc": cm,
            "title": str(v.get("title") or ma_bai or vid).strip(),
            "published_date": str(v.get("published_date") or ""),
            "views": _so_nguyen(v.get("views")),
            "likes": _so_nguyen(v.get("likes")),
            "averageViewPercentage": _so_thuc(v.get("averageViewPercentage")),
            "ty_le_3s": _so_thuc(v.get("ty_le_3s")),
            "ty_le_like": cd["ty_le_like"],
            "diem": cd["diem"],
            "che_do_diem": cd["che_do_diem"],
            "lenh_duyet": "/hay %s" % (ma_bai or vid),
        }
        nhom[cm].append(ban_ghi)

    de_xuat = {}
    k = max(1, int(top_k))
    for cm in CHUYEN_MUC_CHUAN:
        ds = nhom[cm]
        ds.sort(
            key=lambda x: (
                x["diem"],
                x["averageViewPercentage"] if x["averageViewPercentage"] is not None else -1.0,
                x["views"],
                x["id"],
            ),
            reverse=True,
        )
        de_xuat[cm] = ds[:k]
    return de_xuat, so_bo_qua_vang


def _rut_gon_luot_xem(n):
    n = _so_nguyen(n)
    if n >= 1_000_000:
        return "%.1fM" % (n / 1_000_000.0)
    if n >= 1_000:
        return "%.1fK" % (n / 1_000.0)
    return str(n)


def _rut_gon_tieu_de(chu, toi_da=48):
    s = re.sub(r"\s*#shorts\b", "", str(chu or ""), flags=re.IGNORECASE)
    s = " ".join(s.split()).strip()
    if len(s) <= toi_da:
        return s
    cat = s[: toi_da - 1]
    if " " in cat:
        cat = cat.rsplit(" ", 1)[0]
    return (cat.rstrip(" ,.;:-") or s[: toi_da - 1]) + "…"


def dinh_dang_bao_cao_zalo(de_xuat, tu_ngay, den_ngay, tong_quet, da_bo_qua=0):
    """Tạo tin nhắn báo cáo gọn cho Zalo kèm lệnh `/hay <ID>` duyệt 1 chạm."""
    tu_str = tu_ngay.isoformat() if isinstance(tu_ngay, datetime.date) else str(tu_ngay)
    den_str = den_ngay.isoformat() if isinstance(den_ngay, datetime.date) else str(den_ngay)

    tong_de_xuat = sum(len(de_xuat.get(cm) or []) for cm in CHUYEN_MUC_CHUAN)
    if tong_de_xuat == 0:
        return (
            "📊 PHÂN TÍCH YOUTUBE TUẦN (%s → %s)\n"
            "Đã quét %d video (bỏ qua %d bài đã có trong kho vàng). "
            "Tuần này chưa có video mới nào đủ điều kiện đề xuất vào mau_vang/."
            % (tu_str, den_str, tong_quet, da_bo_qua)
        )

    dong = [
        "📊 TOP KỊCH BẢN YOUTUBE TUẦN (%s → %s)" % (tu_str, den_str),
        "Quét %d bài (đăng 7–30 ngày qua%s). Gửi lệnh /hay <ID> để duyệt 1 chạm vào mau_vang/:"
        % (tong_quet, (", bỏ qua %d bài đã vàng" % da_bo_qua) if da_bo_qua else ""),
    ]

    for cm in CHUYEN_MUC_CHUAN:
        ds = de_xuat.get(cm) or []
        if not ds:
            continue
        dong.append("")
        dong.append("%s (%s)" % (TEN_CHUYEN_MUC.get(cm, cm), cm))
        for stt, item in enumerate(ds, 1):
            chi_so = ["Điểm %.1f" % item["diem"]]
            if item.get("averageViewPercentage") is not None:
                chi_so.append("Giữ %.1f%%" % item["averageViewPercentage"])
            if item.get("ty_le_3s") is not None:
                chi_so.append("3s %.0f%%" % item["ty_le_3s"])
            chi_so.append("%s xem" % _rut_gon_luot_xem(item["views"]))
            chi_so.append("%.1f%% like" % item["ty_le_like"])
            dong.append("%d. %s" % (stt, _rut_gon_tieu_de(item["title"], 46)))
            dong.append("   • %s" % " | ".join(chi_so))
            dong.append("   👉 %s" % item["lenh_duyet"])

    tin = "\n".join(dong)
    if len(tin) > GIOI_HAN_TIN_ZALO:
        tin = tin[: GIOI_HAN_TIN_ZALO - 1].rstrip() + "…"
    return tin


def gui_bao_cao_zalo(noi_dung, de_xuat=None, http_call=goi_http_json):
    """Gửi báo cáo về Zalo:
      1) Ưu tiên gọi thẳng Zalo Bot API nếu có `ZALO_BOT_TOKEN` (hoặc `ZALO_BOT_TOKEN_DE`) + `ZALO_CHAT_IDS`.
      2) Dự phòng gửi về `APPS_SCRIPT_URL` (`loai: "bao_cao_tuan"`) nếu có `APPS_SCRIPT_URL` + `DUNG_VIDEO_SECRET`.
      3) Nếu chưa cấu hình kênh gửi nào: chỉ ghi log báo cáo ra stdout (không lỗi)."""
    bot_token = env("ZALO_BOT_TOKEN_DE") or env("ZALO_BOT_TOKEN")
    chat_ids = [c.strip() for c in env("ZALO_CHAT_IDS").split(",") if c.strip()]

    if bot_token and chat_ids:
        url = ZALO_BOT_API_TMPL.format(token=bot_token)
        da_gui = 0
        for cid in chat_ids:
            try:
                st, res = http_call(
                    url,
                    method="POST",
                    json_body={"chat_id": cid, "text": noi_dung},
                    timeout=30,
                )
                if st < 300:
                    da_gui += 1
                else:
                    print("CẢNH BÁO: Zalo Bot API trả HTTP %d cho chat %s: %s" % (st, cid, str(res)[:160]))
            except Exception as e:
                print("CẢNH BÁO: không gửi được Zalo tới chat %s: %s" % (cid, str(e)[:160]))
        return {"da_gui": da_gui > 0, "kenh": "zalo_bot", "so_nguoi_nhan": da_gui}

    apps_url = env("APPS_SCRIPT_URL")
    secret = env("DUNG_VIDEO_SECRET")
    if apps_url and secret:
        payload = {
            "token": secret,
            "loai": "bao_cao_tuan",
            "bao_cao": noi_dung,
            "de_xuat": de_xuat or {},
        }
        try:
            st, res = http_call(apps_url, method="POST", json_body=payload, timeout=45)
            ok = st < 300 and bool(res.get("ok"))
            if ok:
                return {"da_gui": True, "kenh": "apps_script", "so_nguoi_nhan": 1}
            print(
                "CẢNH BÁO: Webhook Apps Script chưa xử lý loai='bao_cao_tuan' (HTTP %d: %s). "
                "Thêm ZALO_BOT_TOKEN & ZALO_CHAT_IDS vào GitHub Secrets để gửi Zalo trực tiếp."
                % (st, json.dumps(res, ensure_ascii=False)[:160])
            )
            return {"da_gui": False, "kenh": "apps_script", "ly_do": "webhook_chua_ho_tro"}
        except Exception as e:
            print("CẢNH BÁO: lỗi gửi báo cáo qua Apps Script webhook: %s" % str(e)[:160])
            return {"da_gui": False, "kenh": "apps_script", "ly_do": str(e)[:120]}

    print("ℹ️ Chưa cấu hình ZALO_BOT_TOKEN/ZALO_CHAT_IDS (hoặc APPS_SCRIPT_URL): chỉ in báo cáo ra log.")
    return {"da_gui": False, "kenh": "stdout", "ly_do": "chua_cau_hinh_zalo"}


def _ghi_step_summary(noi_dung):
    duong = env("GITHUB_STEP_SUMMARY")
    if not duong:
        return
    try:
        with open(duong, "a", encoding="utf-8") as f:
            f.write("## Báo cáo YouTube Analytics hàng tuần\n\n```\n")
            f.write(noi_dung)
            f.write("\n```\n")
    except Exception:
        pass


def _canh_bao_ci(thong_diep):
    print(thong_diep)
    if env("GITHUB_ACTIONS").lower() == "true":
        dong_dau = str(thong_diep).splitlines()[0] if thong_diep else "Thiếu quyền YouTube Analytics API"
        print("::warning::%s" % dong_dau)


def chay_phan_tich_tuan(
    hom_nay=None,
    tu_ngay_truoc=30,
    den_ngay_truoc=7,
    top_k=2,
    duong_mau_vang=MAU_VANG_INDEX_MAC_DINH,
    anh_xa=None,
    gui_zalo=True,
    http_call=goi_http_json,
    client_id=None,
    client_secret=None,
    refresh_token=None,
    do_giu_chan_3s=True,
):
    """Chạy trọn quy trình phân tích tuần.
    Trả về dict `{exit_code, trang_thai, bao_cao, de_xuat, gui_zalo, ...}`.
    Luôn thoát sạch (`exit_code = 0`) với cảnh báo rõ khi thiếu quyền/scope hoặc dữ liệu rỗng."""
    ref = hom_nay if isinstance(hom_nay, datetime.date) else (
        datetime.date.fromisoformat(str(hom_nay)[:10]) if hom_nay else datetime.date.today()
    )
    tu_ngay = ref - datetime.timedelta(days=max(1, int(tu_ngay_truoc)))
    den_ngay = ref - datetime.timedelta(days=max(0, int(den_ngay_truoc)))
    if tu_ngay > den_ngay:
        tu_ngay, den_ngay = den_ngay, tu_ngay

    cid = client_id if client_id is not None else env("YT_CLIENT_ID")
    csec = client_secret if client_secret is not None else env("YT_CLIENT_SECRET")
    rtok = refresh_token if refresh_token is not None else env("YT_REFRESH_TOKEN")

    try:
        access_token = lay_access_token_youtube(cid, csec, rtok, http_call=http_call)
        ds_video = lay_danh_sach_video_da_dang(access_token, tu_ngay, den_ngay, http_call=http_call)
        if not ds_video:
            tb = (
                "📊 PHÂN TÍCH YOUTUBE TUẦN (%s → %s)\n"
                "Không có video nào đăng trong khoảng %d–%d ngày trước. Bỏ qua gửi Zalo."
                % (tu_ngay.isoformat(), den_ngay.isoformat(), den_ngay_truoc, tu_ngay_truoc)
            )
            print(tb)
            _ghi_step_summary(tb)
            return {
                "exit_code": 0,
                "trang_thai": "khong_co_video",
                "tu_ngay": tu_ngay.isoformat(),
                "den_ngay": den_ngay.isoformat(),
                "tong_quet": 0,
                "de_xuat": {cm: [] for cm in CHUYEN_MUC_CHUAN},
                "bao_cao": tb,
                "gui_zalo": {"da_gui": False, "kenh": "bo_qua"},
            }

        chi_so_an = lay_chi_so_analytics(
            access_token,
            ds_video,
            tu_ngay,
            ref,
            http_call=http_call,
            do_giu_chan_3s=do_giu_chan_3s,
        )
        gop = gop_du_lieu_video(ds_video, chi_so_an)
        id_da_co = doc_id_da_co_mau_vang(duong_mau_vang)
        de_xuat, so_bo_qua = de_xuat_top_theo_chuyen_muc(
            gop, top_k=top_k, id_da_co=id_da_co, anh_xa=anh_xa
        )
        bao_cao = dinh_dang_bao_cao_zalo(de_xuat, tu_ngay, den_ngay, len(gop), da_bo_qua=so_bo_qua)
        print(bao_cao)
        _ghi_step_summary(bao_cao)

        tong_de_xuat = sum(len(de_xuat[cm]) for cm in CHUYEN_MUC_CHUAN)
        kq_zalo = {"da_gui": False, "kenh": "bo_qua"}
        if gui_zalo and tong_de_xuat > 0:
            kq_zalo = gui_bao_cao_zalo(bao_cao, de_xuat=de_xuat, http_call=http_call)

        return {
            "exit_code": 0,
            "trang_thai": "thanh_cong",
            "tu_ngay": tu_ngay.isoformat(),
            "den_ngay": den_ngay.isoformat(),
            "tong_quet": len(gop),
            "da_bo_qua_vang": so_bo_qua,
            "de_xuat": de_xuat,
            "bao_cao": bao_cao,
            "gui_zalo": kq_zalo,
        }
    except ThieuQuyenAnalytics as e:
        hd = huong_dan_cap_quyen(e.ly_do, e.chi_tiet)
        _canh_bao_ci(hd)
        _ghi_step_summary(hd)
        return {
            "exit_code": 0,
            "trang_thai": "thieu_quyen",
            "ly_do": e.ly_do,
            "chi_tiet": e.chi_tiet,
            "bao_cao": hd,
            "de_xuat": {cm: [] for cm in CHUYEN_MUC_CHUAN},
            "gui_zalo": {"da_gui": False, "kenh": "bo_qua"},
        }


def _doc_anh_xa(duong):
    if not duong:
        return {}
    p = Path(duong)
    if not p.exists():
        print("CẢNH BÁO: không tìm thấy tệp ánh xạ %s" % p)
        return {}
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except Exception as e:
        print("CẢNH BÁO: tệp ánh xạ lỗi JSON (%s): %s" % (p, str(e)[:120]))
        return {}


def main():
    ap = argparse.ArgumentParser(
        description="Phân tích YouTube Analytics hàng tuần và đề xuất Top 2 kịch bản/chuyên mục về Zalo."
    )
    ap.add_argument("--tu-ngay-truoc", type=int, default=30, help="Mốc bắt đầu (số ngày trước hôm nay, mặc định 30)")
    ap.add_argument("--den-ngay-truoc", type=int, default=7, help="Mốc kết thúc (số ngày trước hôm nay, mặc định 7)")
    ap.add_argument("--top-k", type=int, default=2, help="Số bài đề xuất mỗi chuyên mục (mặc định 2)")
    ap.add_argument("--hom-nay", default="", help="Giả lập ngày hiện tại YYYY-MM-DD")
    ap.add_argument("--mau-vang-index", default=str(MAU_VANG_INDEX_MAC_DINH), help="Đường dẫn mau_vang/index.json")
    ap.add_argument("--anh-xa", default="", help="Tệp JSON ánh xạ video_id YouTube -> {id, chuyen_muc} (tùy chọn)")
    ap.add_argument("--xuat-json", default="", help="Ghi kết quả phân tích ra tệp JSON")
    ap.add_argument("--khong-gui-zalo", action="store_true", help="Chỉ chạy phân tích và in log, không gửi Zalo")
    ap.add_argument("--bo-qua-3s", action="store_true", help="Không gọi thêm đường cong retention 3 giây đầu")
    args = ap.parse_args()

    anh_xa = _doc_anh_xa(args.anh_xa)
    kq = chay_phan_tich_tuan(
        hom_nay=args.hom_nay or None,
        tu_ngay_truoc=args.tu_ngay_truoc,
        den_ngay_truoc=args.den_ngay_truoc,
        top_k=args.top_k,
        duong_mau_vang=args.mau_vang_index,
        anh_xa=anh_xa,
        gui_zalo=not args.khong_gui_zalo,
        do_giu_chan_3s=not args.bo_qua_3s,
    )
    if args.xuat_json:
        p_ra = Path(args.xuat_json)
        p_ra.parent.mkdir(parents=True, exist_ok=True)
        p_ra.write_text(json.dumps(kq, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    sys.exit(int(kq.get("exit_code", 0)))


if __name__ == "__main__":
    main()
