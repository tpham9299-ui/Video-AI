#!/usr/bin/env python3
"""
Dọn sạch tệp MP4 lỗi & MP4 mồ côi trên Google Drive theo Whitelist bằng rclone.

Nguyên tắc an toàn cứng:
  1. TUYỆT ĐỐI KHÔNG xóa vĩnh viễn: mọi lệnh xóa dùng `rclone deletefile --retries 3 --drive-use-trash=true`
     đưa vào Thùng rác Google Drive (cấm xóa bỏ qua thùng rác).
  2. TUYỆT ĐỐI KHÔNG xóa tệp MP4 có mã bài nằm trong `tap_id_bao_ve`.
  3. Nếu `tap_id_bao_ve` rỗng (= 0 phần tử) -> DỪNG AN TOÀN ngay lập tức và xóa 0 tệp.
  4. Chỉ xử lý tệp `.mp4` có định dạng mã bài của hệ thống (`XX######-######(-10P|-###)?`).
  5. Hỗ trợ 2 chế độ:
       - `loi`: xóa vào Thùng rác tệp `.mp4` trùng `tap_id_loi` (trừ `tap_id_bao_ve`).
       - `mocoi` (mặc định): xóa vào Thùng rác tệp `.mp4` trùng `tap_id_loi` HOẶC không nằm trong
         `tap_id_bao_ve` và đã tạo/chỉnh sửa cũ hơn 24 giờ.
  6. Hỗ trợ `dry_run = true/false`: khi `dry_run = true`, chỉ thống kê số tệp bảo vệ, tổng MB và
     danh sách mẫu tối đa 30 tệp sẽ xóa (không gọi lệnh xóa).
"""

import argparse
import datetime
import json
import os
import re
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

REMOTE_MAC_DINH = "gdrive"
THU_MUC_MAC_DINH = "VIDEO_XACSUAT/video"
TUOI_MOCOI_GIO_MAC_DINH = 24.0
TOI_DA_MAU_XOA = 30
GIOI_HAN_TIN_ZALO = 1900
ZALO_BOT_API_TMPL = "https://bot-api.zaloplatforms.com/bot{token}/sendMessage"

# Định dạng mã bài chuẩn của hệ thống: TT261127-103000-1, ZL261127-153504-42, HH261127-080000-10P, XS261127-120000...
RE_MA_HE_THONG = re.compile(r"(?<![A-Z0-9])[A-Z]{2}\d{6}-\d{6}(?:-(?:10P|\d+))?(?![A-Z0-9])")


def env(ten, mac_dinh=""):
    return str(os.environ.get(ten) or mac_dinh).strip()


def trich_ma_bai_tu_ten_mp4(ten):
    """Trích danh sách mã bài hợp lệ của hệ thống từ tên tệp `.mp4`. Trả `[]` nếu không phải `.mp4` hoặc không có mã."""
    base = os.path.basename(str(ten or "").strip())
    if not base.lower().endswith(".mp4"):
        return []
    stem = base[:-4].upper()
    ket_qua = []
    for ma in RE_MA_HE_THONG.findall(stem):
        if ma not in ket_qua:
            ket_qua.append(ma)
    return ket_qua


def ma_whitelist_trong_ten_mp4(ten, tap_id_bao_ve):
    """Đối chiếu mã cũ trong tên MP4 theo cùng cách tách cụm với Apps Script."""
    ma_bao_ve = set()
    for phan in re.findall(r"[A-Z0-9_-]+", ten[:-4].upper()):
        cum = phan.split("_")
        ma_bao_ve.update(tap_id_bao_ve.intersection(
            "_".join(cum[i:j + 1])
            for i in range(len(cum)) if cum[i]
            for j in range(i, len(cum)) if cum[j]
        ))
    return ma_bao_ve


def phan_tich_thoi_gian_iso(chuoi):
    """Đổi chuỗi ISO-8601 từ `rclone lsjson` (`ModTime`) sang datetime UTC. Trả `None` nếu không đọc được."""
    s = str(chuoi or "").strip()
    if not s:
        return None
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    # Cắt phần nano-giây > 6 chữ số (rclone trả tối đa 9 chữ số phần thập phân)
    s = re.sub(r"(\.\d{6})\d+", r"\1", s)
    try:
        dt = datetime.datetime.fromisoformat(s)
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=datetime.timezone.utc)
    return dt.astimezone(datetime.timezone.utc)


def chuan_hoa_tap_id(ds):
    """Chuẩn hóa tập mã bài thành `set` chữ hoa, loại chuỗi rỗng."""
    if not ds:
        return set()
    return {str(x).strip().upper() for x in ds if str(x or "").strip()}


def tao_lenh_lsjson(remote, thu_muc):
    """Tạo lệnh `rclone lsjson -R --files-only` quét đệ quy thư mục MP4."""
    tm = str(thu_muc or THU_MUC_MAC_DINH).strip().strip("/")
    rm = str(remote or REMOTE_MAC_DINH).strip().rstrip(":")
    return [
        "rclone",
        "lsjson",
        "-R",
        "--files-only",
        "--retries",
        "3",
        "--retries-sleep",
        "5s",
        f"{rm}:{tm}",
    ]


def tao_lenh_xoa_thung_rac(remote, thu_muc, duong_dan_tep):
    """Tạo lệnh `rclone deletefile` đưa 1 tệp vào Thùng rác Google Drive (tuyệt đối không xóa vĩnh viễn)."""
    tm = str(thu_muc or THU_MUC_MAC_DINH).strip().strip("/")
    rm = str(remote or REMOTE_MAC_DINH).strip().rstrip(":")
    rel = str(duong_dan_tep or "").strip().lstrip("/")
    if not rel:
        raise ValueError("Đường dẫn tệp cần xóa rỗng")
    target = f"{rm}:{tm}/{rel}" if tm else f"{rm}:{rel}"
    cmd = [
        "rclone",
        "deletefile",
        "--retries",
        "3",
        "--retries-sleep",
        "5s",
        "--drive-use-trash=true",
        target,
    ]
    return cmd


def _chay_lenh_mac_dinh(cmd, timeout=300):
    cp = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", timeout=timeout)
    return cp.returncode, cp.stdout, cp.stderr


def tai_du_lieu_tu_drive(file_id, remote=REMOTE_MAC_DINH, chay_lenh=None):
    """Tải tệp JSON danh sách bảo vệ/lỗi từ Drive khi payload vượt giới hạn `workflow_dispatch`."""
    runner = chay_lenh or _chay_lenh_mac_dinh
    rm = str(remote or REMOTE_MAC_DINH).strip().rstrip(":")
    fid = str(file_id or "").strip()
    if not fid:
        raise ValueError("Thiếu _file_du_lieu_drive")
    with tempfile.TemporaryDirectory(prefix="don_drive_dl_") as tmp_dir:
        cmd = [
            "rclone",
            "backend",
            "copyid",
            "--retries",
            "3",
            "--retries-sleep",
            "5s",
            f"{rm}:",
            fid,
            tmp_dir + "/",
        ]
        rc, out, err = runner(cmd)
        if rc != 0:
            raise RuntimeError(f"Không tải được tệp dữ liệu Drive {fid}: {(err or out).strip()[:200]}")
        tep_tai = [p for p in Path(tmp_dir).iterdir() if p.is_file()]
        if not tep_tai:
            raise RuntimeError(f"rclone copyid không tạo ra tệp nào cho ID {fid}")
        return json.loads(tep_tai[0].read_text(encoding="utf-8"))


def phan_loai_tep_mp4(
    danh_sach_lsjson,
    tap_id_bao_ve,
    tap_id_loi=None,
    che_do="mocoi",
    now_utc=None,
    tuoi_mocoi_gio=TUOI_MOCOI_GIO_MAC_DINH,
):
    """Phân loại đầu ra `rclone lsjson -R --files-only` theo Whitelist + chế độ `loi`/`mocoi`."""
    bao_ve_set = chuan_hoa_tap_id(tap_id_bao_ve)
    loi_set = chuan_hoa_tap_id(tap_id_loi) - bao_ve_set
    che_do_chuan = "loi" if str(che_do or "mocoi").strip().lower() == "loi" else "mocoi"

    if not bao_ve_set:
        return {
            "ok": False,
            "dung_an_toan": True,
            "ly_do_dung": "tap_id_bao_ve rỗng (= 0 phần tử) — dừng an toàn và xóa 0 tệp.",
            "che_do": che_do_chuan,
            "so_id_bao_ve": 0,
            "so_id_loi": len(loi_set),
            "can_xoa": [],
            "bao_ve": [],
            "moi_duoi_24h": [],
            "bo_qua": [],
        }

    moc = now_utc or datetime.datetime.now(datetime.timezone.utc)
    if moc.tzinfo is None:
        moc = moc.replace(tzinfo=datetime.timezone.utc)
    else:
        moc = moc.astimezone(datetime.timezone.utc)

    can_xoa = []
    bao_ve = []
    moi_duoi_24h = []
    bo_qua = []

    for item in danh_sach_lsjson or []:
        if not isinstance(item, dict) or item.get("IsDir"):
            continue
        rel_path = str(item.get("Path") or item.get("Name") or "").strip()
        ten = str(item.get("Name") or os.path.basename(rel_path)).strip()
        if not ten.lower().endswith(".mp4"):
            continue
        ds_ma = trich_ma_bai_tu_ten_mp4(ten)
        ma_bao_ve = bao_ve_set.intersection(ds_ma) or ma_whitelist_trong_ten_mp4(ten, bao_ve_set)
        if not ds_ma and not ma_bao_ve:
            bo_qua.append({"path": rel_path, "ly_do": "khong_phai_ma_he_thong"})
            continue

        size_bytes = max(0, int(item.get("Size") or 0))
        mod_dt = phan_tich_thoi_gian_iso(item.get("ModTime"))
        tuoi_gio = round((moc - mod_dt).total_seconds() / 3600.0, 2) if mod_dt else None

        ban_ghi = {
            "path": rel_path,
            "name": ten,
            "ma_bai": ds_ma or sorted(ma_bao_ve),
            "size_bytes": size_bytes,
            "size_mb": round(size_bytes / (1024 * 1024), 2),
            "tuoi_gio": tuoi_gio,
        }

        # BẢO VỆ TUYỆT ĐỐI WHITELIST
        if ma_bao_ve:
            ban_ghi["ly_do"] = "thuoc_tap_id_bao_ve"
            bao_ve.append(ban_ghi)
            continue

        trung_loi = any(ma in loi_set for ma in ds_ma)
        if trung_loi:
            ban_ghi["ly_do"] = "trung_tap_id_loi"
            can_xoa.append(ban_ghi)
            continue

        if che_do_chuan == "mocoi":
            if tuoi_gio is None:
                ban_ghi["ly_do"] = "thieu_modtime_giu_an_toan"
                bo_qua.append(ban_ghi)
                continue
            if tuoi_gio > float(tuoi_mocoi_gio):
                ban_ghi["ly_do"] = "mocoi_qua_24h"
                can_xoa.append(ban_ghi)
            else:
                ban_ghi["ly_do"] = "moi_duoi_24h"
                moi_duoi_24h.append(ban_ghi)
        else:
            ban_ghi["ly_do"] = "khong_thuoc_tap_id_loi"
            bo_qua.append(ban_ghi)

    return {
        "ok": True,
        "dung_an_toan": False,
        "ly_do_dung": "",
        "che_do": che_do_chuan,
        "so_id_bao_ve": len(bao_ve_set),
        "so_id_loi": len(loi_set),
        "can_xoa": can_xoa,
        "bao_ve": bao_ve,
        "moi_duoi_24h": moi_duoi_24h,
        "bo_qua": bo_qua,
    }


def chay_don_video_drive(
    du_lieu,
    che_do="mocoi",
    dry_run=True,
    remote=REMOTE_MAC_DINH,
    thu_muc=THU_MUC_MAC_DINH,
    tuoi_mocoi_gio=TUOI_MOCOI_GIO_MAC_DINH,
    now_utc=None,
    chay_lenh=None,
):
    """Thực thi trọn luồng quét & đưa MP4 lỗi/mồ côi vào Thùng rác Drive bằng rclone."""
    runner = chay_lenh or _chay_lenh_mac_dinh
    che_do_chuan = "loi" if str(che_do or "mocoi").strip().lower() == "loi" else "mocoi"
    du_lieu = dict(du_lieu or {})

    if du_lieu.get("_file_du_lieu_drive") and not du_lieu.get("tap_id_bao_ve"):
        du_lieu = tai_du_lieu_tu_drive(du_lieu["_file_du_lieu_drive"], remote=remote, chay_lenh=runner)

    tap_id_bao_ve = chuan_hoa_tap_id(du_lieu.get("tap_id_bao_ve"))
    tap_id_loi = chuan_hoa_tap_id(du_lieu.get("tap_id_loi")) - tap_id_bao_ve

    if not tap_id_bao_ve:
        return {
            "ok": False,
            "dung_an_toan": True,
            "ly_do_dung": "tap_id_bao_ve rỗng (= 0 phần tử) — dừng an toàn và xóa 0 tệp.",
            "che_do": che_do_chuan,
            "dry_run": bool(dry_run),
            "thu_muc": f"{remote}:{thu_muc}",
            "so_id_bao_ve": 0,
            "so_id_loi": len(tap_id_loi),
            "so_tep_quet": 0,
            "so_tep_bao_ve": 0,
            "so_tep_moi_duoi_24h": 0,
            "so_tep_se_xoa": 0,
            "so_tep_da_xoa": 0,
            "so_tep_loi_xoa": 0,
            "tong_mb": 0.0,
            "tong_mb_da_xoa": 0.0,
            "mau_xoa": [],
            "loi_xoa": [],
        }

    cmd_ls = tao_lenh_lsjson(remote, thu_muc)
    rc_ls, out_ls, err_ls = runner(cmd_ls)
    if rc_ls != 0:
        raise RuntimeError(f"rclone lsjson thất bại (rc={rc_ls}): {(err_ls or out_ls).strip()[:240]}")

    danh_sach = json.loads(out_ls or "[]")
    if not isinstance(danh_sach, list):
        raise RuntimeError("Đầu ra rclone lsjson không phải mảng JSON")

    pl = phan_loai_tep_mp4(
        danh_sach,
        tap_id_bao_ve=tap_id_bao_ve,
        tap_id_loi=tap_id_loi,
        che_do=che_do_chuan,
        now_utc=now_utc,
        tuoi_mocoi_gio=tuoi_mocoi_gio,
    )

    can_xoa = pl["can_xoa"]
    tong_bytes = sum(x["size_bytes"] for x in can_xoa)
    tong_mb = round(tong_bytes / (1024 * 1024), 2)

    so_da_xoa = 0
    tong_bytes_da_xoa = 0
    loi_xoa = []

    if not dry_run:
        for item in can_xoa:
            cmd_del = tao_lenh_xoa_thung_rac(remote, thu_muc, item["path"])
            rc_del, out_del, err_del = runner(cmd_del)
            if rc_del == 0:
                so_da_xoa += 1
                tong_bytes_da_xoa += item["size_bytes"]
            else:
                loi_xoa.append({
                    "path": item["path"],
                    "loi": (err_del or out_del or f"rc={rc_del}").strip()[:180],
                })

    mau_xoa = [
        {
            "path": x["path"],
            "ma_bai": x["ma_bai"][0] if x["ma_bai"] else "",
            "size_mb": x["size_mb"],
            "ly_do": x["ly_do"],
            "tuoi_gio": x["tuoi_gio"],
        }
        for x in can_xoa[:TOI_DA_MAU_XOA]
    ]

    return {
        "ok": len(loi_xoa) == 0,
        "dung_an_toan": False,
        "ly_do_dung": "",
        "che_do": che_do_chuan,
        "dry_run": bool(dry_run),
        "thu_muc": f"{remote}:{thu_muc}",
        "so_id_bao_ve": len(tap_id_bao_ve),
        "so_id_loi": len(tap_id_loi),
        "so_tep_quet": len(pl["bao_ve"]) + len(can_xoa) + len(pl["moi_duoi_24h"]) + len(pl["bo_qua"]),
        "so_tep_bao_ve": len(pl["bao_ve"]),
        "so_tep_moi_duoi_24h": len(pl["moi_duoi_24h"]),
        "so_tep_se_xoa": len(can_xoa),
        "so_tep_da_xoa": so_da_xoa,
        "so_tep_loi_xoa": len(loi_xoa),
        "tong_mb": tong_mb,
        "tong_mb_da_xoa": round(tong_bytes_da_xoa / (1024 * 1024), 2),
        "mau_xoa": mau_xoa,
        "loi_xoa": loi_xoa[:10],
    }


def dinh_dang_bao_cao_zalo(kq, nguon=""):
    """Tạo bản tóm tắt tiếng Việt gọn để gửi Zalo sau lượt chạy."""
    if kq.get("dung_an_toan"):
        return (
            "🛑 DỌN VIDEO DRIVE (rclone) — DỪNG AN TOÀN\n"
            f"• Lý do: {kq.get('ly_do_dung') or 'tap_id_bao_ve rỗng'}\n"
            "• Đã xóa: 0 tệp (bảo vệ tuyệt đối dữ liệu trên Drive)."
        )

    che_do_nhan = "MỒ CÔI + LỖI (> 24h)" if kq.get("che_do") == "mocoi" else "CHỈ MP4 LỖI"
    tieu_de = (
        f"🧪 CHẠY THỬ DỌN DRIVE ({che_do_nhan})"
        if kq.get("dry_run")
        else f"🧹 DỌN VIDEO DRIVE THÙNG RÁC ({che_do_nhan})"
    )
    if nguon:
        tieu_de += f" [{nguon}]"

    dong = [
        tieu_de,
        f"• Whitelist: {kq.get('so_id_bao_ve', 0)} mã | Đã bảo vệ: {kq.get('so_tep_bao_ve', 0)} tệp MP4 | Mới <24h giữ lại: {kq.get('so_tep_moi_duoi_24h', 0)} tệp",
    ]
    if kq.get("dry_run"):
        dong.append(
            f"• Dự kiến đưa vào Thùng rác: {kq.get('so_tep_se_xoa', 0)} tệp MP4 (~{kq.get('tong_mb', 0.0):.2f} MB) — CHƯA XÓA TỆP NÀO"
        )
    else:
        dong.append(
            f"• Đã đưa vào Thùng rác Drive: {kq.get('so_tep_da_xoa', 0)}/{kq.get('so_tep_se_xoa', 0)} tệp MP4 (~{kq.get('tong_mb_da_xoa', 0.0):.2f} MB)"
        )
        if kq.get("so_tep_loi_xoa"):
            dong.append(f"• ⚠️ Lỗi rclone chưa xóa được: {kq['so_tep_loi_xoa']} tệp")

    mau = kq.get("mau_xoa") or []
    if mau:
        nhan_ds = "Mẫu tệp sẽ xóa" if kq.get("dry_run") else "Mẫu tệp đã đưa vào Thùng rác"
        dong.append(f"• {nhan_ds} ({len(mau)}/{kq.get('so_tep_se_xoa', len(mau))}, tối đa {TOI_DA_MAU_XOA}):")
        for idx, m in enumerate(mau[:TOI_DA_MAU_XOA], 1):
            ly_do_ngan = "lỗi" if m.get("ly_do") == "trung_tap_id_loi" else "mồ côi >24h"
            dong.append(f"  {idx}. {m.get('path')} ({m.get('size_mb', 0):.1f} MB · {ly_do_ngan})")

    tin = "\n".join(dong)
    if len(tin) > GIOI_HAN_TIN_ZALO:
        tin = tin[: GIOI_HAN_TIN_ZALO - 1].rstrip() + "…"
    return tin


def _goi_http_post_json(url, payload, timeout=45):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    last_err = ""
    for lan in range(1, 4):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                txt = resp.read().decode("utf-8", "ignore")
                return resp.status, txt
        except urllib.error.HTTPError as e:
            last_err = f"HTTP {e.code}: {e.read().decode('utf-8', 'ignore')[:160]}"
        except Exception as e:
            last_err = str(e)[:160]
        if lan < 3:
            time.sleep(lan * 3)
    return 0, last_err


def gui_bao_cao_zalo(noi_dung, chat_id="", ket_qua=None, run_url=""):
    """Gửi kết quả qua Zalo Bot API (ưu tiên) hoặc fallback qua Apps Script webhook (`loai='bao_cao_don_drive'`)."""
    bot_token = env("ZALO_BOT_TOKEN_DE") or env("ZALO_BOT_TOKEN")
    ds_chat = []
    if chat_id:
        ds_chat = [c.strip() for c in str(chat_id).split(",") if c.strip()]
    elif env("ZALO_CHAT_IDS"):
        ds_chat = [c.strip() for c in env("ZALO_CHAT_IDS").split(",") if c.strip()]

    if bot_token and ds_chat:
        url = ZALO_BOT_API_TMPL.format(token=bot_token)
        da_gui = 0
        for cid in ds_chat:
            st, txt = _goi_http_post_json(url, {"chat_id": cid, "text": noi_dung}, timeout=30)
            if 200 <= st < 300:
                da_gui += 1
            else:
                print(f"CẢNH BÁO: Zalo Bot API lỗi cho {cid}: {txt[:160]}")
        if da_gui > 0:
            return {"da_gui": True, "kenh": "zalo_bot", "so_nguoi_nhan": da_gui}

    apps_url = env("APPS_SCRIPT_URL")
    secret = env("DUNG_VIDEO_SECRET")
    if apps_url and secret:
        payload = {
            "token": secret,
            "loai": "bao_cao_don_drive",
            "bao_cao": noi_dung,
            "chat_id": str(chat_id or ""),
            "run_url": str(run_url or ""),
            "ket_qua": ket_qua or {},
        }
        st, txt = _goi_http_post_json(apps_url, payload, timeout=45)
        if 200 <= st < 300 and '"ok"' in txt and "true" in txt:
            return {"da_gui": True, "kenh": "apps_script", "so_nguoi_nhan": 1}
        print(f"CẢNH BÁO: Webhook Apps Script trả HTTP {st}: {txt[:160]}")

    print("ℹ️ Chưa gửi được Zalo (thiếu secret hoặc lỗi tạm) — báo cáo đã in ra log.")
    return {"da_gui": False, "kenh": "stdout", "so_nguoi_nhan": 0}


def _doc_du_lieu_vao(args):
    if args.du_lieu_json and Path(args.du_lieu_json).is_file():
        raw = Path(args.du_lieu_json).read_text(encoding="utf-8").strip()
        return json.loads(raw) if raw else {}
    chuoi = args.du_lieu or env("DU_LIEU")
    if chuoi:
        return json.loads(chuoi)
    return {}


def main():
    ap = argparse.ArgumentParser(description="Dọn tệp MP4 lỗi & mồ côi trên Google Drive vào Thùng rác bằng rclone.")
    ap.add_argument("--che-do", choices=["loi", "mocoi"], default=env("CHE_DO", "mocoi"))
    ap.add_argument("--dry-run", action="store_true", help="Chỉ thống kê và in mẫu tối đa 30 tệp, không xóa")
    ap.add_argument("--remote", default=env("RCLONE_REMOTE", REMOTE_MAC_DINH))
    ap.add_argument("--thu-muc", default=env("DRIVE_THU_MUC", THU_MUC_MAC_DINH))
    ap.add_argument("--tuoi-mocoi-gio", type=float, default=TUOI_MOCOI_GIO_MAC_DINH)
    ap.add_argument("--du-lieu", default="", help="Chuỗi JSON chứa tap_id_bao_ve & tap_id_loi (hoặc _file_du_lieu_drive)")
    ap.add_argument("--du-lieu-json", default="", help="Đường dẫn tệp JSON đầu vào")
    ap.add_argument("--xuat-json", default="", help="Ghi kết quả tổng hợp ra tệp JSON")
    ap.add_argument("--chat-id", default=env("CHAT_ID", ""), help="Mã chat Zalo nhận báo cáo")
    ap.add_argument("--nguon", default=env("NGUON", ""), help="Nguồn kích hoạt (zalo, lich_dem, thu_cong)")
    ap.add_argument("--khong-gui-zalo", action="store_true", help="Không gửi báo cáo Zalo")
    args = ap.parse_args()

    du_lieu = _doc_du_lieu_vao(args)
    kq = chay_don_video_drive(
        du_lieu=du_lieu,
        che_do=args.che_do,
        dry_run=args.dry_run,
        remote=args.remote,
        thu_muc=args.thu_muc,
        tuoi_mocoi_gio=args.tuoi_mocoi_gio,
    )
    bao_cao = dinh_dang_bao_cao_zalo(kq, nguon=args.nguon)
    kq["bao_cao"] = bao_cao
    print(bao_cao)

    if args.xuat_json:
        p_ra = Path(args.xuat_json)
        p_ra.parent.mkdir(parents=True, exist_ok=True)
        p_ra.write_text(json.dumps(kq, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    summary_path = env("GITHUB_STEP_SUMMARY")
    if summary_path:
        try:
            with open(summary_path, "a", encoding="utf-8") as f:
                f.write("## Kết quả dọn video Google Drive (rclone -> Thùng rác)\n\n```\n")
                f.write(bao_cao)
                f.write("\n```\n")
        except Exception:
            pass

    if not args.khong_gui_zalo:
        run_url = ""
        if env("GITHUB_REPOSITORY") and env("GITHUB_RUN_ID"):
            run_url = f"https://github.com/{env('GITHUB_REPOSITORY')}/actions/runs/{env('GITHUB_RUN_ID')}"
        gui_bao_cao_zalo(bao_cao, chat_id=args.chat_id, ket_qua=kq, run_url=run_url)

    if kq.get("dung_an_toan"):
        sys.exit(2)
    sys.exit(0 if kq.get("ok") else 1)


if __name__ == "__main__":
    main()
