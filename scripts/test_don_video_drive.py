#!/usr/bin/env python3
"""Kiểm thử scripts/don_video_drive.py bằng đầu ra rclone lsjson giả lập (0 kết nối mạng)."""

import datetime
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import don_video_drive as dvd  # noqa: E402


def _iso(dt):
    return dt.astimezone(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.123456789Z")


def main():
    dat = 0
    hong = []

    def kiem(ten, dk, chi_tiet=""):
        nonlocal dat
        if dk:
            dat += 1
            print(f"  ✓ {ten}")
        else:
            hong.append(ten + (f" — {chi_tiet}" if chi_tiet else ""))
            print(f"  ✗ {ten}" + (f" — {chi_tiet}" if chi_tiet else ""))

    now = datetime.datetime(2026, 11, 28, 3, 0, 0, tzinfo=datetime.timezone.utc)
    cu_30h = _iso(now - datetime.timedelta(hours=30))
    cu_72h = _iso(now - datetime.timedelta(hours=72))
    moi_2h = _iso(now - datetime.timedelta(hours=2))
    moi_23h = _iso(now - datetime.timedelta(hours=23, minutes=30))

    lsjson_mau = [
        # Thuộc Whitelist (kể cả vừa nằm trong tap_id_loi và > 24h) -> BẢO VỆ TUYỆT ĐỐI
        {"Path": "TT261120-100000-1.mp4", "Name": "TT261120-100000-1.mp4", "Size": 10 * 1024 * 1024, "ModTime": cu_72h, "IsDir": False},
        {"Path": "cu/ban_du_phong_ZL261120-110000-10P.mp4", "Name": "ban_du_phong_ZL261120-110000-10P.mp4", "Size": 20 * 1024 * 1024, "ModTime": cu_72h, "IsDir": False},
        # Thuộc tap_id_loi -> XÓA ở cả chế độ loi lẫn mocoi (kể cả mới < 24h)
        {"Path": "TT261127-200000-1.mp4", "Name": "TT261127-200000-1.mp4", "Size": 6 * 1024 * 1024, "ModTime": moi_2h, "IsDir": False},
        {"Path": "sub/HH261125-090000-2.MP4", "Name": "HH261125-090000-2.MP4", "Size": 8 * 1024 * 1024, "ModTime": cu_30h, "IsDir": False},
        # Mồ côi ngoài Whitelist, CŨ > 24h -> CHỈ XÓA ở chế độ mocoi
        {"Path": "XS261125-080000-3.mp4", "Name": "XS261125-080000-3.mp4", "Size": 12 * 1024 * 1024, "ModTime": cu_30h, "IsDir": False},
        {"Path": "cu/ban-cu-TT261124-070000-9-render.mp4", "Name": "ban-cu-TT261124-070000-9-render.mp4", "Size": 4 * 1024 * 1024, "ModTime": cu_72h, "IsDir": False},
        # Mồ côi ngoài Whitelist, MỚI < 24h -> GIỮ LẠI ở cả 2 chế độ
        {"Path": "TT261128-010000-1.mp4", "Name": "TT261128-010000-1.mp4", "Size": 5 * 1024 * 1024, "ModTime": moi_2h, "IsDir": False},
        {"Path": "ZL261127-033000-2.mp4", "Name": "ZL261127-033000-2.mp4", "Size": 5 * 1024 * 1024, "ModTime": moi_23h, "IsDir": False},
        # Không phải MP4 hoặc không mang định dạng mã bài hệ thống -> BỎ QUA
        {"Path": "anh/XS261125-080000-3_3x3.jpg", "Name": "XS261125-080000-3_3x3.jpg", "Size": 200_000, "ModTime": cu_72h, "IsDir": False},
        {"Path": "intro_thuong_hieu.mp4", "Name": "intro_thuong_hieu.mp4", "Size": 3 * 1024 * 1024, "ModTime": cu_72h, "IsDir": False},
        {"Path": "thu_muc_con", "Name": "thu_muc_con", "Size": 0, "ModTime": cu_72h, "IsDir": True},
    ]

    # 1. Từ chối chạy khi Whitelist rỗng (= 0 phần tử) và gọi 0 lệnh rclone
    lenh_rong = []

    def runner_rong(cmd):
        lenh_rong.append(cmd)
        return 0, json.dumps(lsjson_mau), ""

    kq_rong = dvd.chay_don_video_drive(
        {"tap_id_bao_ve": [], "tap_id_loi": ["TT261127-200000-1"]},
        che_do="mocoi",
        dry_run=False,
        now_utc=now,
        chay_lenh=runner_rong,
    )
    kiem(
        "Whitelist rỗng (= 0 phần tử): dừng an toàn, 0 lệnh rclone, 0 tệp bị xóa",
        kq_rong["dung_an_toan"] is True
        and kq_rong["ok"] is False
        and kq_rong["so_tep_da_xoa"] == 0
        and len(lenh_rong) == 0,
        str(kq_rong),
    )

    # 2. Chế độ mocoi + dry_run=True: không gọi rclone deletefile, thống kê đúng bảo vệ / mới < 24h / dự kiến xóa
    lenh_dry = []

    def runner_dry(cmd):
        lenh_dry.append(cmd)
        if cmd[1] == "lsjson":
            return 0, json.dumps(lsjson_mau), ""
        raise AssertionError("dry_run=True không được phép gọi lệnh xóa!")

    kq_dry = dvd.chay_don_video_drive(
        {
            "tap_id_bao_ve": ["TT261120-100000-1", "ZL261120-110000-10P"],
            "tap_id_loi": ["TT261120-100000-1", "TT261127-200000-1", "HH261125-090000-2"],
        },
        che_do="mocoi",
        dry_run=True,
        now_utc=now,
        chay_lenh=runner_dry,
    )
    ds_se_xoa_dry = [m["path"] for m in kq_dry["mau_xoa"]]
    kiem(
        "dry_run=True (mocoi): chỉ chạy lsjson -R --files-only, không gọi deletefile",
        len(lenh_dry) == 1
        and lenh_dry[0][:4] == ["rclone", "lsjson", "-R", "--files-only"]
        and kq_dry["so_tep_da_xoa"] == 0
        and kq_dry["so_tep_se_xoa"] == 4,
        str(lenh_dry),
    )
    kiem(
        "Bảo vệ tuyệt đối Whitelist (kể cả khi trùng tap_id_loi) & giữ tệp mới < 24h",
        kq_dry["so_tep_bao_ve"] == 2
        and kq_dry["so_tep_moi_duoi_24h"] == 2
        and "TT261120-100000-1.mp4" not in ds_se_xoa_dry
        and "cu/ban_du_phong_ZL261120-110000-10P.mp4" not in ds_se_xoa_dry
        and "TT261128-010000-1.mp4" not in ds_se_xoa_dry
        and "ZL261127-033000-2.mp4" not in ds_se_xoa_dry
        and "intro_thuong_hieu.mp4" not in ds_se_xoa_dry
        and abs(kq_dry["tong_mb"] - 30.0) < 0.01,
        str(kq_dry),
    )

    # 3. Chế độ mocoi + dry_run=False: xóa đúng 2 tệp lỗi + 2 tệp mồ côi > 24h vào Thùng rác Drive
    lenh_mocoi = []

    def runner_mocoi(cmd):
        lenh_mocoi.append(cmd)
        if cmd[1] == "lsjson":
            return 0, json.dumps(lsjson_mau), ""
        return 0, "", ""

    kq_mocoi = dvd.chay_don_video_drive(
        {
            "tap_id_bao_ve": ["TT261120-100000-1", "ZL261120-110000-10P"],
            "tap_id_loi": ["TT261120-100000-1", "TT261127-200000-1", "HH261125-090000-2"],
        },
        che_do="mocoi",
        dry_run=False,
        now_utc=now,
        chay_lenh=runner_mocoi,
    )
    del_cmds = [c for c in lenh_mocoi if c[1] == "deletefile"]
    targets = [c[-1] for c in del_cmds]
    an_toan_trash = all(
        "--retries" in c
        and "3" in c
        and "--drive-use-trash=false" not in " ".join(c)
        and "--drive-use-trash=true" in c
        for c in del_cmds
    )
    kiem(
        "mocoi + dry_run=False: xóa đúng 4 tệp (2 lỗi + 2 mồ côi > 24h) vào Thùng rác với --retries 3",
        kq_mocoi["ok"] is True
        and kq_mocoi["so_tep_da_xoa"] == 4
        and len(del_cmds) == 4
        and an_toan_trash
        and "gdrive:VIDEO_XACSUAT/video/TT261127-200000-1.mp4" in targets
        and "gdrive:VIDEO_XACSUAT/video/sub/HH261125-090000-2.MP4" in targets
        and "gdrive:VIDEO_XACSUAT/video/XS261125-080000-3.mp4" in targets
        and "gdrive:VIDEO_XACSUAT/video/cu/ban-cu-TT261124-070000-9-render.mp4" in targets,
        str(targets),
    )

    # 4. Chế độ loi + dry_run=False: chỉ xóa đúng 2 tệp trùng tap_id_loi, giữ nguyên tệp mồ côi > 24h
    lenh_loi = []

    def runner_loi(cmd):
        lenh_loi.append(cmd)
        if cmd[1] == "lsjson":
            return 0, json.dumps(lsjson_mau), ""
        return 0, "", ""

    kq_loi = dvd.chay_don_video_drive(
        {
            "tap_id_bao_ve": ["TT261120-100000-1", "ZL261120-110000-10P"],
            "tap_id_loi": ["TT261120-100000-1", "TT261127-200000-1", "HH261125-090000-2"],
        },
        che_do="loi",
        dry_run=False,
        now_utc=now,
        chay_lenh=runner_loi,
    )
    loi_targets = [c[-1] for c in lenh_loi if c[1] == "deletefile"]
    kiem(
        "loi + dry_run=False: chỉ xóa 2 tệp trùng tap_id_loi, giữ tệp mồ côi > 24h",
        kq_loi["ok"] is True
        and kq_loi["so_tep_da_xoa"] == 2
        and len(loi_targets) == 2
        and "gdrive:VIDEO_XACSUAT/video/XS261125-080000-3.mp4" not in loi_targets,
        str(loi_targets),
    )

    # Tên có mã cũ trong Whitelist vẫn được giữ khi cả fileId và mã chuẩn nằm trong danh sách lỗi.
    ma_loi = "TT261127-200000-1"
    ten_chia_se = f"POSTED-ID_{ma_loi}.mp4"
    tep_chia_se = {"ID": "good-index-only", "Name": ten_chia_se, "Path": ten_chia_se, "ModTime": cu_72h}
    for che_do in ("loi", "mocoi"):
        kq_chia_se = dvd.phan_loai_tep_mp4(
            [tep_chia_se], ["POSTED-ID"], [tep_chia_se["ID"], ma_loi], che_do=che_do, now_utc=now,
        )
        kiem(
            f"{che_do}: mã cũ trong Whitelist thắng fileId và mã bài trong danh sách lỗi",
            not kq_chia_se["can_xoa"] and [tep["path"] for tep in kq_chia_se["bao_ve"]] == [ten_chia_se],
            str(kq_chia_se),
        )

    # 5. Giới hạn danh sách mẫu tối đa 30 tệp trong dry_run
    nhieu_mocoi = [
        {"Path": f"TT261120-1000{i:02d}-1.mp4", "Name": f"TT261120-1000{i:02d}-1.mp4", "Size": 1024 * 1024, "ModTime": cu_72h, "IsDir": False}
        for i in range(35)
    ]
    kq_35 = dvd.chay_don_video_drive(
        {"tap_id_bao_ve": ["TT261199-000000-1"], "tap_id_loi": []},
        che_do="mocoi",
        dry_run=True,
        now_utc=now,
        chay_lenh=lambda cmd: (0, json.dumps(nhieu_mocoi), ""),
    )
    kiem(
        "dry_run giới hạn mẫu mau_xoa <= 30 khi có 35 tệp sẽ xóa (tổng 35.0 MB)",
        kq_35["so_tep_se_xoa"] == 35
        and len(kq_35["mau_xoa"]) == 30
        and abs(kq_35["tong_mb"] - 35.0) < 0.01,
        f"se_xoa={kq_35['so_tep_se_xoa']}, mau={len(kq_35['mau_xoa'])}",
    )

    # 6. Tải payload lớn từ Drive qua _file_du_lieu_drive (rclone backend copyid)
    def runner_copyid(cmd):
        if cmd[1:3] == ["backend", "copyid"]:
            out_dir = Path(cmd[-1])
            (out_dir / "payload.json").write_text(
                json.dumps({"tap_id_bao_ve": ["TT261120-100000-1"], "tap_id_loi": ["TT261127-200000-1"]}),
                encoding="utf-8",
            )
            return 0, "", ""
        if cmd[1] == "lsjson":
            return 0, json.dumps(lsjson_mau[:3]), ""
        return 0, "", ""

    kq_dl = dvd.chay_don_video_drive(
        {"_file_du_lieu_drive": "drive-payload-123"},
        che_do="loi",
        dry_run=True,
        now_utc=now,
        chay_lenh=runner_copyid,
    )
    kiem(
        "Hỗ trợ tải payload vượt giới hạn dispatch từ Drive (_file_du_lieu_drive)",
        kq_dl["ok"] is True and kq_dl["so_id_bao_ve"] == 1 and kq_dl["so_tep_se_xoa"] == 1,
        str(kq_dl),
    )

    # 7. Kiểm tra định dạng báo cáo Zalo cho cả dry_run, xóa thật và dừng an toàn
    bc_dry = dvd.dinh_dang_bao_cao_zalo(kq_dry, nguon="zalo")
    bc_rong = dvd.dinh_dang_bao_cao_zalo(kq_rong)
    kiem(
        "Định dạng báo cáo Zalo đầy đủ thông tin (bảo vệ, MB, mẫu tệp, dừng an toàn)",
        "CHẠY THỬ" in bc_dry and "30.00 MB" in bc_dry and "DỪNG AN TOÀN" in bc_rong and "0 tệp" in bc_rong,
        bc_dry[:140],
    )

    print(f"\nTEST DON VIDEO DRIVE: {dat} đạt, {len(hong)} hỏng")
    sys.exit(1 if hong else 0)


if __name__ == "__main__":
    main()
