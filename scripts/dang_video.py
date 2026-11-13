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
    mo_ta = meta.get("mo_ta") or meta.get("tieu_de") or ""
    if 3 <= giay <= 90:
        # Reels: hiện ở tab Reels, lan tỏa tốt hơn video thường (giới hạn 3-90 giây)
        d = kiem_tra(requests.post("%s/%s/video_reels" % (GRAPH, page), data={"upload_phase": "start", "access_token": token}, timeout=60), "FB bắt đầu")
        vid, url_tai = d["video_id"], d["upload_url"]
        with open(video, "rb") as f:
            kiem_tra(requests.post(url_tai, data=f, headers={"Authorization": "OAuth " + token, "offset": "0", "file_size": str(n)}, timeout=900), "FB tải lên")
        kiem_tra(requests.post("%s/%s/video_reels" % (GRAPH, page), data={
            "upload_phase": "finish", "video_id": vid, "video_state": "PUBLISHED", "description": mo_ta, "access_token": token}, timeout=120), "FB đăng")
        return {"ok": True, "url": "https://www.facebook.com/reel/%s" % vid, "id": vid}
    # video dài hơn 90 giây: đăng thành video thường của Trang
    with open(video, "rb") as f:
        d = kiem_tra(requests.post("https://graph-video.facebook.com/v21.0/%s/videos" % page,
                                   data={"description": mo_ta, "title": meta.get("tieu_de", "")[:250], "access_token": token},
                                   files={"source": (os.path.basename(video), f, "video/mp4")}, timeout=1200), "FB video")
    return {"ok": True, "url": "https://www.facebook.com/%s/videos/%s" % (page, d.get("id")), "id": d.get("id"), "ghi_chu": "video thường (dài hơn 90 giây nên không đăng dạng Reels)"}


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


def dang_tiktok(video, meta):
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
        cap = (meta.get("tieu_de", "") + "\n" + " ".join("#" + t for t in meta.get("the", [])))[:2000]
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
        ghi_chu = "đã vào hộp thư nháp TikTok, mở ứng dụng TikTok để bấm đăng"
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
    than = {"snippet": {"title": meta.get("yt_tieu_de") or meta.get("tieu_de", ""), "description": meta.get("mo_ta", ""), "tags": meta.get("the", []), "categoryId": "27",
                        "defaultLanguage": "vi", "defaultAudioLanguage": "vi"},
            "status": {"privacyStatus": meta.get("yt_che_do") or env("YT_CHE_DO", "public"), "selfDeclaredMadeForKids": False}}
    res = requests.post("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", json=than,
                        headers=dict(h, **{"X-Upload-Content-Type": "video/mp4", "X-Upload-Content-Length": str(n)}), timeout=60)
    kiem_tra(res, "YouTube bắt đầu")
    with open(video, "rb") as f:
        d = kiem_tra(requests.put(res.headers["Location"], data=f, headers=dict(h, **{"Content-Type": "video/mp4"}), timeout=1800), "YouTube tải lên")
    return {"ok": True, "url": "https://youtube.com/shorts/%s" % d.get("id"), "id": d.get("id"), "che_do": d.get("status", {}).get("privacyStatus")}


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
    for n in nen_tang:
        try:
            ket_qua[n] = DANG[n](video, meta)
        except BoQua as e:
            ket_qua[n] = {"ok": False, "bo_qua": True, "loi": str(e)}
        except Exception as e:
            ket_qua[n] = {"ok": False, "loi": str(e)[:300]}
        print("%s: %s" % (n, json.dumps(ket_qua[n], ensure_ascii=False)))
    bao_ve_apps_script(id_video, ket_qua)


if __name__ == "__main__":
    main()
