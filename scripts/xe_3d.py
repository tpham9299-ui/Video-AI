"""Đồng bộ xe trên đường với hàm chuyển động và các câu đã đọc."""
import math
import re

CAR = re.compile(r"\b(?:ô[ -]?tô|xe hơi|xe con|chiếc xe|xe đang|xe chuyển động)\b", re.I)
EVENT = re.compile(
    r"chưa dừng|không dừng|đột ngột dừng|dừng xe|dừng đột ngột|dừng hẳn|dừng lại|đứng yên|"
    r"bắt đầu (?:chạy|chuyển động)|chạy tiếp|tăng tốc|tăng dần|nhanh dần|giảm tốc|chậm dần|phanh gấp|hãm phanh", re.I
)


def da_thuc(text, name, unit):
    """Chỉ nhận một biểu thức hoàn chỉnh với đơn vị và đa thức bậc tối đa hai."""
    expr = re.search(r"\b" + name + r"\s*\(t\)\s*=\s*([0-9t²^.+* \-]+?)\s*\(?" + unit
                     + r"\)?(?![\w²^/])", text)
    if not expr:
        return None
    value = expr[1].replace(" ", "").replace("²", "^2")
    terms = re.findall(r"[+-]?[^+-]+", value)
    if not terms or "".join(terms) != value:
        return None
    coef = [0., 0., 0.]
    for term in terms:
        m = re.fullmatch(r"([+-]?)(\d+(?:\.\d+)?)?(\*?t(?:\^2)?)?", term)
        if not m or not (m[2] or m[3]):
            return None
        degree = 2 if m[3] and "^" in m[3] else int(bool(m[3]))
        coef[degree] += (-1 if m[1] == "-" else 1) * float(m[2] or 1)
    return coef


def luat_van_toc(de):
    text = de.casefold().replace(",", ".").replace("−", "-").replace("$", "").replace("^{2}", "^2")
    velocity = da_thuc(text, "v", "m/s")
    if velocity and velocity[0] >= 0:
        return velocity[0], velocity[1], 2 * velocity[2]
    accel = da_thuc(text, "a", r"m/s(?:²|\^2)")
    initial = re.search(r"\bv\(0\)\s*=\s*(\d+(?:\.\d+)?)\s*\(?m/s", text)
    if initial and accel and accel[2] == 0:
        return float(initial[1]), accel[0], accel[1]
    return None


def thoi_gian_chay(dt, v, a, j):
    if j == 0:
        return min(dt, v / -a) if a < 0 else dt
    discriminant = a*a - 2*j*v
    if discriminant >= 0:
        # Nghiệm nơi vận tốc đi từ dương xuống âm.
        root = (-a - math.sqrt(discriminant)) / j
        if 0 <= root <= dt:
            return root
    return dt


def nhip_xe(props, indexes):
    law = luat_van_toc(props.get("deGoc") or "")
    pos = 0.
    speed, accel, jerk = law or (1., 0., 0.)
    timeline = {}
    for i in sorted(indexes):
        c = props["canh"][i]
        duration = c["soFrame"] / props["fps"]
        events = []
        for cue in c["cau"]:
            if re.search(r"\b(?:nếu|giả sử|liệu|khi nào)\b|\?", cue["text"], re.I):
                continue
            for m in EVENT.finditer(cue["text"]):
                word = m[0].casefold()
                if word.startswith(("không", "chưa")):
                    continue
                t = cue["bat"] + (cue["ket"] - cue["bat"]) * m.start() / len(cue["text"])
                events.append((max(0, min(duration, t)), word))
        frames = []
        last = 0.
        for end, word in sorted(events) + [(duration, "")]:
            dt = end - last
            travel = thoi_gian_chay(dt, speed, accel, jerk)
            frames.append(dict(t=last, s=pos, v=speed, a=accel, j=jerk, chay=travel))
            pos += speed*travel + accel*travel**2/2 + jerk*travel**3/6
            speed = max(0., speed + accel*travel + jerk*travel**2/2)
            accel += jerk*travel
            if travel < dt:
                speed, accel, jerk = 0., 0., 0.
            last = end
            if word.startswith(("dừng", "đứng", "đột ngột dừng")):
                speed, accel, jerk = 0., 0., 0.
            elif word.startswith(("giảm", "chậm", "phanh", "hãm")):
                if not law or accel >= 0:
                    accel, jerk = -speed / max(.5, min(2., duration-end)), 0.
            elif word.startswith(("tăng", "nhanh")):
                if not law:
                    accel, jerk = .4, 0.
            elif word:
                speed, accel, jerk = law or (max(1., speed), 0., 0.)
        timeline[i] = frames
    for i, frames in timeline.items():
        props["canh"][i]["nhipXe"] = dict(moc=frames, tong=max(1., pos))
