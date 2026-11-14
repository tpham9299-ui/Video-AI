#!/usr/bin/env python3
"""NGHE THỬ GIỌNG: đọc CÙNG MỘT đoạn bài giảng bằng nhiều giọng (Gemini + edge-tts), tải lên Google Drive
(thư mục VIDEO_XACSUAT/giong_mau) để chọn giọng cho cả kênh. Chọn xong: đặt biến GitHub GIONG_GEMINI = tên giọng
(ví dụ Charon) và MAY_GIONG = gemini; hoặc MAY_GIONG = edge và GIONG = vi-VN-HoaiMyNeural / vi-VN-NamMinhNeural.

Biến môi trường: GEMINI_KEYS (hoặc GEMINI_API_KEY), RCLONE_CONF đã cấu hình remote "gdrive", GIONG_THU (tùy chọn: danh sách giọng Gemini).
"""
import asyncio
import os
import subprocess
import sys
import types

sys.path.insert(0, os.path.dirname(__file__))
import chuanbi as cb  # noqa: E402

DOAN_MAU = ("Bạn An đứng cách tòa nhà ba mươi mét, nhìn lên đỉnh với góc năm mươi độ. Tòa nhà cao bao nhiêu? "
            "Nhiều bạn lấy ba mươi nhân tan năm mươi độ là xong, nhưng như vậy mới chỉ có phần phía trên tầm mắt thôi! "
            "Đừng quên cộng thêm một phẩy sáu mét, chiều cao từ mắt xuống mặt đất. "
            "Vậy tòa nhà cao khoảng ba mươi bảy phẩy bốn mét. Bạn đã làm đúng chưa?")
# giọng Gemini: tên + mô tả ngắn (nam/nữ, chất giọng)
GIONG_GEMINI = [("Puck", "nam, vui, nhanh nhẹn"), ("Charon", "nam, trầm, rõ ràng như thầy giáo"), ("Fenrir", "nam, hào hứng"),
                ("Orus", "nam, chắc, vững"), ("Iapetus", "nam, trong, rõ"), ("Algenib", "nam, khàn ấm"), ("Achird", "nam, thân thiện"),
                ("Sadaltager", "nam, hiểu biết, điềm tĩnh"), ("Kore", "nữ, chắc, rõ"), ("Aoede", "nữ, nhẹ nhàng"), ("Leda", "nữ, trẻ trung"),
                ("Sulafat", "nữ, ấm áp"), ("Despina", "nữ, mượt mà")]
GIONG_EDGE = [("vi-VN-NamMinhNeural", "edge, nam (giọng mặc định hiện tại)"), ("vi-VN-HoaiMyNeural", "edge, nữ")]


def main():
    ra = "giong_mau"
    os.makedirs(ra, exist_ok=True)
    chon = [x.strip() for x in (os.environ.get("GIONG_THU") or "").split(",") if x.strip()]
    ds_gem = [(t, m) for t, m in GIONG_GEMINI if not chon or t in chon]
    args = types.SimpleNamespace(phong_cach_giong=os.environ.get("PHONG_CACH_GIONG") or cb.PHONG_CACH_GIONG_MAC_DINH,
                                 tts_model=os.environ.get("TTS_MODEL") or "gemini-2.5-flash-preview-tts")
    van = cb.chuan_hoa_doc(DOAN_MAU)
    ket_qua = []
    for k, (ten, mo_ta) in enumerate(ds_gem, 1):
        wav = os.path.join(ra, "tam.wav")
        tep = os.path.join(ra, "%02d_gemini_%s.mp3" % (k, ten))
        try:
            cb.gemini_tts(van, wav, ten, args.tts_model, args.phong_cach_giong + "\nĐoạn cần đọc:")
            cb.chay(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-c:a", "libmp3lame", "-b:a", "128k", tep])
            ket_qua.append("✅ %s - Gemini %s (%s)" % (os.path.basename(tep), ten, mo_ta))
        except Exception as e:
            ket_qua.append("❌ Gemini %s: %s" % (ten, str(e)[:150]))
    for k, (ten, mo_ta) in enumerate(GIONG_EDGE, len(ds_gem) + 1):
        tep = os.path.join(ra, "%02d_edge_%s.mp3" % (k, ten.replace("vi-VN-", "").replace("Neural", "")))
        try:
            asyncio.run(cb._tts(van, tep, ten, "+0%", "+0Hz"))
            ket_qua.append("✅ %s - %s (%s)" % (os.path.basename(tep), ten, mo_ta))
        except Exception as e:
            ket_qua.append("❌ %s: %s" % (ten, str(e)[:150]))
    if os.path.exists(os.path.join(ra, "tam.wav")):
        os.remove(os.path.join(ra, "tam.wav"))
    thu_muc = "gdrive:%s/giong_mau" % (os.environ.get("DRIVE_GOC") or "VIDEO_XACSUAT")
    subprocess.run(["rclone", "copy", ra, thu_muc], check=False, timeout=600)
    print("=====GIONG_MAU=====")
    print("Đã tải lên Drive: %s" % thu_muc.replace("gdrive:", ""))
    print("\n".join(ket_qua))
    print("=====HET_GIONG_MAU=====")


if __name__ == "__main__":
    main()
