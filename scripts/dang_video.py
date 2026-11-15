#!/usr/bin/env python3
"""ĐĂNG VIDEO lên Facebook (Trang), TikTok và YouTube. Chạy trong GitHub Actions (job "dang" của dung-video.yml),
do DangVideo.gs trên Apps Script hẹn giờ gọi. Kết quả từng nền tảng được báo ngược về Apps Script (doPost, loai = "dang").

Biến môi trường:
  DANG_JSON  {"file_id","ten","tieu_de","yt_tieu_de","mo_ta","the":[..],"nen_tang":["facebook","tiktok","youtube"],"yt_che_do"}
  ID_VIDEO, APPS_SCRIPT_URL, DUNG_VIDEO_SECRET, rclone đã cấu hình remote "gdrive"
  Facebook: FB_PAGE_ID, FB_PAGE_TOKEN (mã truy cập TRANG, dài hạn)
  TikTok:   TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_REFRESH_TOKEN; TIKTOK_CHE_DO = truc_tiep (đăng thẳng, mặc định) | nhap
            (gửi vào hộp thư nháp của ứng dụng TikTok, bạn bấm đăng); TIKTOK_QUYEN = PUBLIC_TO_EVERYONE (mặc định) | SELF_ONLY ...
            Mã làm mới (refresh token) TikTok đổi sau mỗi lần dùng: bản mới nhất được lưu vào Drive (DRIVE_BI_MAT, mặc định
            VIDEO_XACSUAT/bi_mat/tiktok_token.json) và được ưu tiên dùng ở lần sau.
  YouTube:  YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN (chỉ khi Apps Script đặt YOUTUBE_CACH = github)
Nền tảng thiếu thông tin đăng nhập được "bỏ qua" (không tính là lỗi, không thử lại).
"""
import glob
import json
import os
import struct
import subprocess
import sys
import time

import requests

GRAPH = "https://graph.facebook.com/v21.0"
TT = "https://open.tiktokapis.com/v2"


class BoQua(Exception):
    """Nền tảng chưa được cài đặt (thiếu secrets)."""


def env(k, mac_dinh=""):
    return (os.environ.get(k) or mac_dinh).strip()


def thoi_luong_mp4(duong):
    """Đọc thời lượng (giây) từ hộp 'mvhd' của tệp MP4, không cần ffprobe."""
    with open(duong, "rb") as f:
        du = f.read()
    i = du.find(b"mvhd")
    if i < 4:
        return 0.0
    ver = du[i + 4]
    if ver == 1:
        ts, dur = struct.unpack(">IQ", du[i + 24 : i + 36])
    else:
        ts, dur = struct.unpack(">II", du[i + 16 : i + 24])
    return dur / ts if ts else 0.0


def tai_video(file_id):
    os.makedirs("video_dang", exist_ok=True)
    subprocess.run(["rclone", "backend", "copyid", "gdrive:", file_id, "video_dang/"], check=True)
    ds = glob.glob("video_dang/*.mp4") or glob.glob("video_dang/*")
    if not ds:
        raise RuntimeError("Không tải được video từ Drive (file_id %s)" % file_id)
    return ds[0]


def kiem_tra(res, ten):
    try:
        d = res.json()
    except Exception:
        d = {"raw": res.text[:300]}
    if res.status_code >= 400:
        raise RuntimeError("%s HTTP %d: %s" % (ten, res.status_code, json.dumps(d, ensure_ascii=False)[:300]))
    return d


# ---------------- FACEBOOK (Trang) ----------------
def dang_facebook(video, meta):
    page, token = env("FB_PAGE_ID"), env("FB_PAGE_TOKEN")
    if not page or not token:
        raise BoQua("chưa có FB_PAGE_ID / FB_PAGE_TOKEN trong GitHub Secrets")
    n = os.path.getsize(video)
    giay = thoi_luong_mp4(video)
    mo_ta = meta.get("fb_mo_ta") or meta.get("mo_ta") or meta.get("tieu_de") or ""
    if 3 <= giay <= 90:
        # Reels: hiện ở tab Reels, lan tỏa tốt hơn video thường (giới hạn 3-90 giây)
        d = kiem_tra(requests.post("%s/%s/video_reels" % (GRAPH, page), data={"upload_phase": "start", "access_token": token}, timeout=60), "FB bắt đầu")
        vid, url_tai = d["video_id"], d["upload_url"]
        with open(video, "rb") as f:
            kiem_tra(requests.post(url_tai, data=f, headers={"Authorization": "OAuth " + token, "offset": "0", "file_size": str(n)}, timeout=900), "FB tải lên")
        kiem_tra(requests.post("%s/%s/video_reels" % (GRAPH, page), data={
            "upload_phase": "finish", "video_id": vid, "video_state": "PUBLISHED", "description": mo_ta, "access_token": token}, timeout=120), "FB đăng")
        return {"ok": True, "url": "https://www.facebook.com/reel/%s" % vid, "id": vid, "ghi_chu": dat_bia_facebook(vid, token, meta.get("_anh_bia"))}
    # video dài hơn 90 giây: đăng thành video thường của Trang
    tep = {"source": (os.path.basename(video), open(video, "rb"), "video/mp4")}
    if meta.get("_anh_bia"):
        tep["thumb"] = (os.path.basename(meta["_anh_bia"]), open(meta["_anh_bia"], "rb"), "image/jpeg")   # ảnh bìa gửi kèm lúc đăng
    d = kiem_tra(requests.post("https://graph-video.facebook.com/v21.0/%s/videos" % page,
                               data={"description": mo_ta, "title": meta.get("tieu_de", "")[:250], "access_token": token}, files=tep, timeout=1200), "FB video")
    return {"ok": True, "url": "https://www.facebook.com/%s/videos/%s" % (page, d.get("id")), "id": d.get("id"),
            "ghi_chu": "video thường (dài hơn 90 giây nên không đăng dạng Reels)" + ("; đã gửi kèm ảnh bìa thiết kế" if meta.get("_anh_bia") else "")}


# ---------------- TIKTOK ----------------
def duong_token_tiktok():
    return "gdrive:%s/tiktok_token.json" % (env("DRIVE_BI_MAT") or "VIDEO_XACSUAT/bi_mat")


def doc_refresh_tiktok():
    try:
        r = subprocess.run(["rclone", "cat", duong_token_tiktok()], capture_output=True, text=True, timeout=60)
        if r.returncode == 0 and r.stdout.strip():
            t = json.loads(r.stdout).get("refresh_token")
            if t:
                return t
    except Exception as e:
        print("Không đọc được token TikTok trên Drive:", e)
    return env("TIKTOK_REFRESH_TOKEN")


def luu_refresh_tiktok(d):
    try:
        subprocess.run(["rclone", "rcat", duong_token_tiktok()], input=json.dumps({
            "refresh_token": d.get("refresh_token"), "cap_nhat": time.strftime("%Y-%m-%d %H:%M:%S"),
            "refresh_expires_in": d.get("refresh_expires_in")}), text=True, check=True, timeout=60)
    except Exception as e:
        print("CẢNH BÁO: không lưu được refresh token TikTok mới lên Drive:", e)


_TK_TIKTOK = {}


def token_tiktok():
    """Access token TikTok, làm mới MỘT lần cho cả lần chạy (refresh token đổi sau mỗi lần dùng)."""
    if _TK_TIKTOK.get("access_token"):
        return _TK_TIKTOK
    key, bi = env("TIKTOK_CLIENT_KEY"), env("TIKTOK_CLIENT_SECRET")
    refresh = doc_refresh_tiktok() if key and bi else ""
    if not key or not bi or not refresh:
        raise BoQua("chưa có TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET / TIKTOK_REFRESH_TOKEN")
    tk = kiem_tra(requests.post(TT + "/oauth/token/", data={"client_key": key, "client_secret": bi, "grant_type": "refresh_token", "refresh_token": refresh},
                                headers={"Content-Type": "application/x-www-form-urlencoded"}, timeout=60), "TikTok token")
    if not tk.get("access_token"):
        raise RuntimeError("TikTok không cấp access token: %s" % json.dumps(tk, ensure_ascii=False)[:200])
    if tk.get("refresh_token") and tk["refresh_token"] != refresh:
        luu_refresh_tiktok(tk)
    _TK_TIKTOK.update(tk)
    return _TK_TIKTOK


def dang_tiktok(video, meta):
    tk = token_tiktok()
    h = {"Authorization": "Bearer " + tk["access_token"], "Content-Type": "application/json; charset=UTF-8"}
    n = os.path.getsize(video)
    MB = 1024 * 1024
    if n <= 64 * MB:
        chunk, so_chunk = n, 1
    else:
        chunk = 10 * MB
        so_chunk = n // chunk
    nguon = {"source": "FILE_UPLOAD", "video_size": n, "chunk_size": chunk, "total_chunk_count": so_chunk}
    che_do = env("TIKTOK_CHE_DO", "truc_tiep")
    ghi_chu = ""
    quyen_co = str(tk.get("scope") or "")
    if che_do != "nhap" and quyen_co and "video.publish" not in quyen_co:
        # mã TikTok chỉ có quyền video.upload (chưa bật Direct Post) -> tự chuyển sang gửi vào hộp nháp thay vì báo lỗi
        print("Token TikTok không có quyền video.publish (quyền: %s) -> gửi vào hộp nháp" % quyen_co)
        che_do = "nhap"
    if che_do == "nhap" and quyen_co and "video.upload" not in quyen_co:
        raise RuntimeError("Token TikTok thiếu quyền video.upload (quyền: %s). Bật Content Posting API rồi kết nối lại TikTok" % quyen_co)
    if che_do == "nhap":
        d = kiem_tra(requests.post(TT + "/post/publish/inbox/video/init/", headers=h, json={"source_info": nguon}, timeout=60), "TikTok init")
    else:
        info = kiem_tra(requests.post(TT + "/post/publish/creator_info/query/", headers=h, json={}, timeout=60), "TikTok creator_info").get("data", {})
        muon = env("TIKTOK_QUYEN", "PUBLIC_TO_EVERYONE")
        ds_quyen = info.get("privacy_level_options") or ["SELF_ONLY"]
        quyen = muon if muon in ds_quyen else ("SELF_ONLY" if "SELF_ONLY" in ds_quyen else ds_quyen[0])
        if quyen != muon:
            ghi_chu = "đăng chế độ %s vì ứng dụng TikTok chưa được duyệt quyền công khai" % quyen
        toi_da = info.get("max_video_post_duration_sec") or 600
        if thoi_luong_mp4(video) > toi_da:
            raise RuntimeError("Video dài hơn giới hạn %s giây của tài khoản TikTok" % toi_da)
        cap = ((meta.get("tt_tieu_de") or meta.get("tieu_de", "")) + "\n" + " ".join("#" + t for t in meta.get("the", [])))[:2000]
        d = kiem_tra(requests.post(TT + "/post/publish/video/init/", headers=h, json={
            "post_info": dict({"title": cap, "privacy_level": quyen, "disable_duet": False, "disable_comment": False, "disable_stitch": False, "video_cover_timestamp_ms": 0 if meta.get("co_bia") else 1600},
                              # video có sản phẩm do kênh bán: bật nhãn "quảng bá doanh nghiệp của bạn" (nội dung thương mại)
                              **({"brand_organic_toggle": True} if meta.get("quang_cao") else {})),
            "source_info": nguon}, timeout=60), "TikTok init")
    du = d.get("data") or {}
    pid, url_tai = du.get("publish_id"), du.get("upload_url")
    if not pid or not url_tai:
        raise RuntimeError("TikTok không trả upload_url: %s" % json.dumps(d, ensure_ascii=False)[:200])
    with open(video, "rb") as f:
        for k in range(so_chunk):
            a = k * chunk
            b = n - 1 if k == so_chunk - 1 else a + chunk - 1
            f.seek(a)
            phan = f.read(b - a + 1)
            res = requests.put(url_tai, data=phan, headers={"Content-Type": "video/mp4", "Content-Length": str(len(phan)), "Content-Range": "bytes %d-%d/%d" % (a, b, n)}, timeout=600)
            if res.status_code not in (200, 201, 206):
                raise RuntimeError("TikTok tải phần %d lỗi HTTP %d: %s" % (k + 1, res.status_code, res.text[:200]))
    trang_thai = ""
    for _ in range(24):   # chờ TikTok xử lý tối đa ~4 phút
        time.sleep(10)
        st = kiem_tra(requests.post(TT + "/post/publish/status/fetch/", headers=h, json={"publish_id": pid}, timeout=60), "TikTok trạng thái").get("data", {})
        trang_thai = st.get("status", "")
        if trang_thai == "FAILED":
            raise RuntimeError("TikTok từ chối: %s" % st.get("fail_reason"))
        if trang_thai in ("PUBLISH_COMPLETE", "SEND_TO_USER_INBOX"):
            break
    if trang_thai == "SEND_TO_USER_INBOX":
        ghi_chu = "đã vào hộp thư nháp TikTok, mở ứng dụng TikTok để bấm đăng (khi đăng chọn ảnh bìa là KHUNG ĐẦU TIÊN - chính là ảnh bìa thiết kế)"
    elif trang_thai != "PUBLISH_COMPLETE":
        ghi_chu = (ghi_chu + "; " if ghi_chu else "") + "TikTok vẫn đang xử lý (%s)" % trang_thai
    return {"ok": True, "url": "https://www.tiktok.com/", "id": pid, "ghi_chu": ghi_chu}


# ---------------- YOUTUBE (khi YOUTUBE_CACH = github) ----------------
def dang_youtube(video, meta):
    cid, bi, rt = env("YT_CLIENT_ID"), env("YT_CLIENT_SECRET"), env("YT_REFRESH_TOKEN")
    if not cid or not bi or not rt:
        raise BoQua("chưa có YT_CLIENT_ID / YT_CLIENT_SECRET / YT_REFRESH_TOKEN")
    tk = kiem_tra(requests.post("https://oauth2.googleapis.com/token", data={"client_id": cid, "client_secret": bi, "refresh_token": rt, "grant_type": "refresh_token"}, timeout=60), "YouTube token")
    h = {"Authorization": "Bearer " + tk["access_token"]}
    n = os.path.getsize(video)
    than = {"snippet": {"title": meta.get("yt_tieu_de") or meta.get("tieu_de", ""), "description": meta.get("yt_mo_ta") or meta.get("mo_ta", ""), "tags": meta.get("the", []), "categoryId": "27",
                        "defaultLanguage": "vi", "defaultAudioLanguage": "vi"},
            "status": {"privacyStatus": meta.get("yt_che_do") or env("YT_CHE_DO", "public"), "selfDeclaredMadeForKids": False}}
    res = requests.post("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", json=than,
                        headers=dict(h, **{"X-Upload-Content-Type": "video/mp4", "X-Upload-Content-Length": str(n)}), timeout=60)
    kiem_tra(res, "YouTube bắt đầu")
    with open(video, "rb") as f:
        d = kiem_tra(requests.put(res.headers["Location"], data=f, headers=dict(h, **{"Content-Type": "video/mp4"}), timeout=1800), "YouTube tải lên")
    bia = dat_bia_youtube(h, d.get("id"), meta.get("_anh_bia_yt"))
    return {"ok": True, "url": "https://youtube.com/shorts/%s" % d.get("id"), "id": d.get("id"), "che_do": d.get("status", {}).get("privacyStatus"), "ghi_chu": bia}


# ---------------- SỐ TẬP THEO LỚP (đánh lúc đăng, theo số bài đã có trên kênh) ----------------
# Bài thuộc lớp N nhận ra qua thẻ #toanN (hệ thống luôn gắn khi đăng) hoặc chữ "lớp N" trong tiêu đề/mô tả.
def thuoc_lop(chu, lop):
    import re as _re
    chu = (chu or "").lower()
    return bool(_re.search(r"#toan%s(?!\d)" % lop, chu) or _re.search(r"lớp\s*%s(?!\d)" % lop, chu))


def dem_facebook(lop):
    page, token = env("FB_PAGE_ID"), env("FB_PAGE_TOKEN")
    if not page or not token:
        return None
    dem, url, tham_so = 0, "%s/%s/videos" % (GRAPH, page), {"fields": "description,title", "limit": 100, "access_token": token}
    for _ in range(15):
        d = kiem_tra(requests.get(url, params=tham_so, timeout=60), "FB đếm bài")
        dem += sum(1 for v in d.get("data", []) if thuoc_lop((v.get("description") or "") + " " + (v.get("title") or ""), lop))
        nxt = (d.get("paging") or {}).get("next")
        if not nxt:
            break
        url, tham_so = nxt, None
    return dem


def dem_tiktok(lop):
    tk = token_tiktok()   # BoQua nếu chưa cài TikTok
    h = {"Authorization": "Bearer " + tk["access_token"], "Content-Type": "application/json; charset=UTF-8"}
    dem, cursor = 0, None
    for _ in range(15):
        than = {"max_count": 20}
        if cursor:
            than["cursor"] = cursor
        d = kiem_tra(requests.post(TT + "/video/list/?fields=id,title,video_description", json=than, headers=h, timeout=60), "TikTok đếm bài")
        dd = d.get("data") or {}
        dem += sum(1 for v in dd.get("videos", []) if thuoc_lop((v.get("video_description") or "") + " " + (v.get("title") or ""), lop))
        if not dd.get("has_more"):
            break
        cursor = dd.get("cursor")
    return dem


def dem_youtube(lop):
    cid, bi, rt = env("YT_CLIENT_ID"), env("YT_CLIENT_SECRET"), env("YT_REFRESH_TOKEN")
    if not cid or not bi or not rt:
        return None
    tk = kiem_tra(requests.post("https://oauth2.googleapis.com/token", data={"client_id": cid, "client_secret": bi, "refresh_token": rt, "grant_type": "refresh_token"}, timeout=60), "YouTube token")
    h = {"Authorization": "Bearer " + tk["access_token"]}
    ch = kiem_tra(requests.get("https://www.googleapis.com/youtube/v3/channels", params={"part": "contentDetails", "mine": "true"}, headers=h, timeout=60), "YouTube kênh")
    up = ch["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]
    dem, tok = 0, None
    for _ in range(20):
        ts = {"part": "snippet", "playlistId": up, "maxResults": 50}
        if tok:
            ts["pageToken"] = tok
        d = kiem_tra(requests.get("https://www.googleapis.com/youtube/v3/playlistItems", params=ts, headers=h, timeout=60), "YouTube đếm bài")
        dem += sum(1 for v in d.get("items", []) if thuoc_lop((v["snippet"].get("title") or "") + " " + (v["snippet"].get("description") or ""), lop))
        tok = d.get("nextPageToken")
        if not tok:
            break
    return dem


def gan_so_tap(meta):
    """Số tập = (số bài lớp đó NHIỀU NHẤT trên các kênh, và số hệ thống đã ghi nhận) + 1. Đã gán ở lần đăng trước thì giữ nguyên."""
    lop = str(meta.get("lop") or "").strip()
    if not lop:
        return 0, {}
    if int(meta.get("tap_da_gan") or 0) > 0:
        return int(meta["tap_da_gan"]), {"da_gan": True}
    dem = {}
    if meta.get("dem_youtube") is not None and int(meta.get("dem_youtube")) >= 0:
        dem["youtube"] = int(meta["dem_youtube"])   # Apps Script đếm (dịch vụ YouTube của tài khoản)
    for ten, ham in (("facebook", dem_facebook), ("tiktok", dem_tiktok), ("youtube_gh", dem_youtube)):
        if ten == "youtube_gh" and "youtube" in dem:
            continue
        try:
            v = ham(lop)
            if v is not None:
                dem[ten.replace("_gh", "")] = v
        except BoQua:
            pass
        except Exception as e:
            print("Không đếm được bài trên %s: %s" % (ten, str(e)[:160]))
    he_thong = int(meta.get("tap_he_thong") or 0)
    dem["he_thong"] = he_thong
    n = max(dem.values()) + 1
    print("Đếm bài Toán lớp %s đã có: %s -> video này là TẬP %d" % (lop, json.dumps(dem, ensure_ascii=False), n))
    return n, dem


KEU_GOI = {
    # YouTube: "đăng ký kênh"; TikTok / Facebook: "theo dõi" (dải chữ ở 4 giây cuối, dưới phụ đề)
    "youtube": ("ĐĂNG KÝ KÊNH ĐỂ XEM TẬP SAU", "0xFFFFFF", "0xE5202E"),
    "theo_doi": ("NHẤN THEO DÕI ĐỂ XEM TẬP SAU", "0x1a0d02", "0xFF8A3D"),
}


def tao_ban_dang(video, n, kieu):
    """Bản video để đăng: in "TẬP N" góc phải trên (mọi khung) + dải kêu gọi theo nền tảng ở 4 giây cuối.
    kieu = "youtube" (đăng ký kênh) | "theo_doi" (TikTok, Facebook). Lỗi thì dùng video gốc."""
    import shutil
    if not shutil.which("ffmpeg"):
        print("Không có ffmpeg: không in được số tập / dải kêu gọi (mô tả vẫn ghi đủ)")
        return video
    phong = os.path.abspath("public/fonts/BeVietnamPro-Black.ttf")
    dai = thoi_luong_mp4(video) or 0
    loc = []
    if n:
        # khung 0 là ẢNH BÌA THIẾT KẾ (hàng nhãn LỚP/LOẠI chiếm góc trên): in TẬP to hơn, thấp xuống khoảng trống giữa hàng nhãn và tiêu đề;
        # các khung còn lại: góc phải trên như cũ
        loc.append("drawtext=fontfile='%s':text='TẬP %d':fontsize=44:fontcolor=0x1a0d02:box=1:boxcolor=0xFF8A3D@1:boxborderw=16:x=w-tw-64:y=58:enable='gte(n,1)'" % (phong, n))
        loc.append("drawtext=fontfile='%s':text='TẬP %d':fontsize=46:fontcolor=0x1a0d02:box=1:boxcolor=0xFF8A3D@1:boxborderw=14:x=w-tw-70:y=214:enable='eq(n,0)'" % (phong, n))
    chu, mau_chu, mau_nen = KEU_GOI[kieu]
    if dai > 6:
        loc.append("drawtext=fontfile='%s':text='%s':fontsize=50:fontcolor=%s:box=1:boxcolor=%s@0.96:boxborderw=24:"
                   "x=(w-tw)/2:y=1690:enable='gte(t,%.2f)'" % (phong, chu, mau_chu, mau_nen, dai - 4.0))
    if not loc:
        return video
    ra = os.path.join(os.path.dirname(video), "%s_%d_%s" % (kieu, n, os.path.basename(video)))
    r = subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", video, "-vf", ",".join(loc), "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
                        "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart", ra], capture_output=True, text=True)
    if r.returncode != 0 or not os.path.exists(ra):
        print("Tạo bản đăng (%s) lỗi, dùng video gốc: %s" % (kieu, r.stderr[-300:]))
        return video
    print("Đã tạo bản đăng %s%s" % (kieu, " (TẬP %d)" % n if n else ""))
    return ra


def tao_anh_bia_dang(video_ban, meta):
    """ẢNH BÌA ĐĂNG = khung hình ĐẦU TIÊN của bản đăng: đó chính là ảnh bìa thiết kế (loại câu hỏi, lớp, tiêu đề, hình của đề)
    và đã in "TẬP N" giống video. JPEG <= 2 MB (giới hạn YouTube). Video không có ảnh bìa thiết kế thì trả None."""
    import shutil
    if not meta.get("co_bia") or not shutil.which("ffmpeg"):
        return None
    ra = os.path.splitext(video_ban)[0] + "_bia.jpg"
    for q in (2, 4, 7):
        r = subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", video_ban, "-frames:v", "1", "-q:v", str(q), ra], capture_output=True, text=True)
        if r.returncode == 0 and os.path.exists(ra) and os.path.getsize(ra) <= 2 * 1024 * 1024:
            print("Ảnh bìa đăng: %s (%.0f KB)" % (ra, os.path.getsize(ra) / 1024))
            return ra
    print("Không tách được ảnh bìa từ khung đầu:", r.stderr[-200:])
    return None


def dat_bia_youtube(h, vid, anh):
    if not anh:
        return "video không có ảnh bìa thiết kế"
    with open(anh, "rb") as f:
        res = requests.post("https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=%s&uploadType=media" % vid, data=f.read(),
                            headers=dict(h, **{"Content-Type": "image/jpeg"}), timeout=120)
    if res.status_code < 300:
        return "đã đặt ảnh bìa thiết kế"
    if res.status_code == 403:
        return "CHƯA đặt được ảnh bìa: kênh YouTube cần xác minh số điện thoại (youtube.com/verify) mới được đặt ảnh bìa riêng"
    return "chưa đặt được ảnh bìa (HTTP %d: %s)" % (res.status_code, res.text[:120])


def dat_bia_facebook(vid, token, anh):
    if not anh:
        return "video không có ảnh bìa thiết kế"
    try:
        with open(anh, "rb") as f:
            res = requests.post("%s/%s/thumbnails" % (GRAPH, vid), data={"is_preferred": "true", "access_token": token},
                                files={"source": (os.path.basename(anh), f, "image/jpeg")}, timeout=120)
        return "đã đặt ảnh bìa thiết kế" if res.status_code < 300 else "chưa đặt được ảnh bìa (HTTP %d: %s)" % (res.status_code, res.text[:120])
    except Exception as e:
        return "chưa đặt được ảnh bìa (%s)" % str(e)[:100]


def in_so_tap(video, n):
    return tao_ban_dang(video, n, "theo_doi")


def tai_len_drive(video):
    """Đưa bản đã in số tập lên Drive (để Apps Script đăng YouTube bằng đúng bản này). Trả file id."""
    thu_muc = "gdrive:%s/da_danh_so" % (env("DRIVE_THU_MUC") or "VIDEO_XACSUAT/video")
    subprocess.run(["rclone", "copy", video, thu_muc], check=True, timeout=900)
    r = subprocess.run(["rclone", "lsjson", thu_muc, "--files-only", "--include", os.path.basename(video)], capture_output=True, text=True, timeout=120)
    d = json.loads(r.stdout or "[]")
    return d[0]["ID"] if d else ""


DANG = {"facebook": dang_facebook, "tiktok": dang_tiktok, "youtube": dang_youtube}


def bao_ve_apps_script(id_video, ket_qua):
    url, bi = env("APPS_SCRIPT_URL"), env("DUNG_VIDEO_SECRET")
    if not url or not id_video:
        print("Không báo về Apps Script (thiếu APPS_SCRIPT_URL hoặc chạy tay)")
        return
    for lan in range(7):
        try:
            # requests đổi POST thành GET khi bị chuyển hướng 302 (đúng cách Apps Script trả kết quả)
            kq = requests.post(url, json={"token": bi, "loai": "dang", "id": id_video, "ket_qua": ket_qua}, timeout=120).text
        except Exception as e:
            kq = str(e)
        print("Báo kết quả lần %d: %s" % (lan + 1, kq[:200]))
        if '"ok":true' in kq.replace(" ", "") or "KHONG_TIM_THAY" in kq:
            return
        if "SAI_TOKEN" in kq:
            sys.exit(1)
        time.sleep(60 if "BAN" in kq else 20)
    sys.exit("Không báo được kết quả về Apps Script")


def main():
    meta = json.loads(env("DANG_JSON") or "{}")
    id_video = env("ID_VIDEO") or meta.get("ten", "")
    nen_tang = [n for n in meta.get("nen_tang", []) if n in DANG]
    ket_qua = {}
    try:
        video = tai_video(meta["file_id"])
        print("Video: %s (%.1f MB, %.1f giây)" % (video, os.path.getsize(video) / 1048576, thoi_luong_mp4(video)))
    except Exception as e:
        for n in nen_tang:
            ket_qua[n] = {"ok": False, "loi": "Không tải được video từ Drive: %s" % str(e)[:150]}
        bao_ve_apps_script(id_video, ket_qua)
        return
    tap, dem = 0, {}
    try:
        tap, dem = gan_so_tap(meta)
    except Exception as e:
        print("Không gán được số tập:", str(e)[:200])
    if tap:
        for k in ("mo_ta", "yt_mo_ta", "fb_mo_ta", "tt_tieu_de", "yt_tieu_de"):
            if meta.get(k):
                meta[k] = meta[k].replace("{TAP}", str(tap))
        ket_qua["_tap"], ket_qua["_dem"] = tap, dem
    else:
        for k in ("mo_ta", "yt_mo_ta", "fb_mo_ta", "tt_tieu_de", "yt_tieu_de"):
            if meta.get(k):
                meta[k] = meta[k].replace(" – Tập {TAP}", "").replace("{TAP}", "")
    # bản đăng riêng: YouTube (dải "ĐĂNG KÝ KÊNH") và TikTok/Facebook (dải "THEO DÕI"), cùng số tập
    ban = {}
    if "youtube" in nen_tang:
        ban["youtube"] = tao_ban_dang(video, tap, "youtube")
        if meta.get("yt_apps_script"):
            try:
                ket_qua["_file_tap"] = tai_len_drive(ban["youtube"])
            except Exception as e:
                print("Không tải bản YouTube đã đánh số lên Drive:", str(e)[:200])
    if any(n in nen_tang for n in ("tiktok", "facebook")):
        ban["theo_doi"] = tao_ban_dang(video, tap, "theo_doi")
    # ẢNH BÌA THIẾT KẾ cho từng bản đăng (khung đầu = ảnh bìa + TẬP N): YouTube, Facebook đặt bằng API; TikTok chọn khung 0
    if ban.get("youtube"):
        meta["_anh_bia_yt"] = tao_anh_bia_dang(ban["youtube"], meta)
        if meta.get("yt_apps_script") and meta["_anh_bia_yt"]:
            try:
                ket_qua["_file_bia"] = tai_len_drive(meta["_anh_bia_yt"])
            except Exception as e:
                print("Không tải ảnh bìa đã đánh số lên Drive:", str(e)[:200])
    if ban.get("theo_doi"):
        meta["_anh_bia"] = tao_anh_bia_dang(ban["theo_doi"], meta)
    for n in nen_tang:
        if n == "youtube" and meta.get("yt_apps_script"):
            # YouTube do Apps Script đăng (dịch vụ YouTube của tài khoản), bằng bản ĐÃ ĐÁNH SỐ vừa tải lên Drive
            ket_qua[n] = {"ok": False, "cho_apps_script": True, "loi": "chờ Apps Script đăng bản đã đánh số tập"}
            continue
        try:
            ket_qua[n] = DANG[n](ban.get("youtube" if n == "youtube" else "theo_doi", video), meta)
        except BoQua as e:
            ket_qua[n] = {"ok": False, "bo_qua": True, "loi": str(e)}
        except Exception as e:
            ket_qua[n] = {"ok": False, "loi": str(e)[:300]}
        print("%s: %s" % (n, json.dumps(ket_qua[n], ensure_ascii=False)))
    bao_ve_apps_script(id_video, ket_qua)


if __name__ == "__main__":
    main()
