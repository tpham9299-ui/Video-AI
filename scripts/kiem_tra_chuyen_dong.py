"""So sánh các khung liên tiếp trong MP4 cuối. Ghi cảnh và giây cần người duyệt xem lại."""
import argparse
import json
import subprocess
from pathlib import Path

import numpy as np


def vung_dao_lien_tuc(khung):
    # Chia ô để phát hiện chữ/nhãn nhỏ kể cả khi phần lớn nền đứng yên.
    # Hai bản sai phân trái dấu lặp lại trên cùng ô là dấu hiệu bật qua lại.
    for buoc in (1, 2):
        delta = khung[buoc:].astype(np.float32) - khung[:-buoc]
        o = delta.reshape(len(delta), 16, 32, 9, 32)
        nang_luong = (o * o).mean(axis=(2, 4))
        tich = (o[buoc:] * o[:-buoc]).mean(axis=(2, 4))
        dao = (tich < -0.75 * np.sqrt(nang_luong[buoc:] * nang_luong[:-buoc])) & (
            np.minimum(nang_luong[buoc:], nang_luong[:-buoc]) > 100)
        for bat in range(len(dao) - 3 * buoc):
            lap = dao[bat:bat + 4 * buoc:buoc].all(axis=0)
            if lap.any():
                return bat
    return None


def kiem_tra(props, video):
    fps = props['fps']
    if not props['canh']:
        raise ValueError('Timeline thiếu cảnh')
    for i, c in enumerate(props['canh'], 1):
        dai = min(16, c['soFrame'])
        if dai < 6:
            raise ValueError(f'Cảnh {i} quá ngắn để kiểm tra')
        moc = [c.get('leadFrame', 0), c['soFrame'] // 2, c['soFrame'] - dai]
        moc.extend(round(t * fps) for t in c.get('mocCongThuc', []))
        for f in sorted({max(0, min(t, c['soFrame'] - dai)) for t in moc}):
            giay = (c['batDau'] + int(bool(props.get('anhBiaDau'))) + f) / fps
            # Luôn dùng ffmpeg hệ thống có rawvideo và bộ lọc scale.
            cmd = ['ffmpeg', '-v', 'error', '-threads', '1', '-ss', f'{giay:.6f}', '-i', str(video),
                   '-frames:v', str(dai), '-vf', 'scale=288:512', '-pix_fmt', 'gray',
                   '-threads', '1', '-f', 'rawvideo', '-']
            raw = subprocess.run(cmd, check=True, capture_output=True, timeout=30).stdout
            if len(raw) != dai * 288 * 512:
                raise ValueError(f'Thiếu khung hình ở cảnh {i}, giây {giay:.2f}')
            lech = vung_dao_lien_tuc(np.frombuffer(raw, dtype=np.uint8).reshape(dai, 512, 288))
            if lech is not None:
                return f'Cảnh {i}, giây {giay + lech / fps:.2f}: vùng ảnh đảo qua lại nhiều lần'
    return ''


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    for ten in ('props', 'video', 'bao_cao'):
        parser.add_argument(ten, type=Path)
    args = parser.parse_args()
    try:
        ly_do = kiem_tra(json.loads(args.props.read_text()), args.video)
    except (OSError, subprocess.SubprocessError, ValueError, KeyError) as e:
        ly_do = f'Chưa đo được chuyển động MP4: {e}'
    args.bao_cao.write_text(json.dumps({'dat': not ly_do, 'ly_do': ly_do}, ensure_ascii=False))
    print(ly_do or 'Đạt kiểm tra chuyển động tại các đoạn lấy mẫu')
