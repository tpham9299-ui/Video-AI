"""Dựng thử cục bộ một kịch bản có dac_ta_canh: kiểm bám đề -> xếp chỗ -> Blender (chỉ khung cuối) -> ảnh xem trước.

  python scripts/thu_dac_ta.py mau/kich_ban_trai_ca.json [--ra out/thu_dac_ta] [--day-du]

--day-du dựng đủ 16 khung như trên GitHub (chậm). Mặc định chỉ khung cuối, mẫu thấp.
"""

import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from canh_3d import anh_xem_truoc, ke_hoach_dac_ta  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("kb", type=Path)
    ap.add_argument("--ra", type=Path, default=Path("out/thu_dac_ta"))
    ap.add_argument("--day-du", action="store_true")
    ap.add_argument("--blender", default=os.getenv("BLENDER", "blender"))
    args = ap.parse_args()
    kb = json.loads(args.kb.read_text(encoding="utf8"))
    plan = ke_hoach_dac_ta(kb)
    if plan is None:
        sys.exit("Kịch bản không có dac_ta_canh hoặc thực thể chính chưa có mẫu")
    clip = (args.ra / args.kb.stem).resolve()
    clip.mkdir(parents=True, exist_ok=True)
    (clip / "ke_hoach.json").write_text(json.dumps(plan, ensure_ascii=False, indent=1), encoding="utf8")
    batch = clip / "batch.json"
    batch.write_text(json.dumps({str(clip / "projection.json"): plan}), encoding="utf8")
    env = dict(os.environ, VE_XEM_TRUOC="0" if args.day_du else "1")
    t = time.time()
    subprocess.run([args.blender, "-b", "--factory-startup", "-t", "0", "--python-exit-code", "1",
                    "-P", str(Path(__file__).with_name("ve_blender.py").resolve()), "--", str(batch)],
                   check=True, env=env)
    out = anh_xem_truoc(clip)
    print(f"Xong sau {time.time() - t:.0f} s: {out}")


if __name__ == "__main__":
    main()
