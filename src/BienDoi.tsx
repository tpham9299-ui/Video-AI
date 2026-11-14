import React, {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {continueRender, delayRender} from 'remotion';
import katex from 'katex';
import {texSangChu} from './chu';
import {ghepTu, kep01, smooth, tachTu, Tu} from './manim';
import {napPhong} from './phong';
import {FONT} from './theme';

// Biến đổi công thức kiểu Manim (TransformMatchingTex): các dòng của một phép biến đổi nối tiếp nhau trên cùng một chỗ.
//  - dòng đầu được "viết" ra từng thành phần,
//  - sang dòng sau: thành phần giống hệt trượt mượt về vị trí mới, thành phần bị thay đổi chuyển hóa tại chỗ, thành phần cũ tan đi, thành phần mới được "viết" ra và sáng vàng rồi dịu dần,
//  - dòng cuối của cảnh đáp án được vẽ khung bao quanh (Circumscribe) và nảy nhẹ (Indicate).
// Vị trí được ĐO từ bản dựng ẩn của từng dòng nên luôn khớp chữ thật; mọi chuyển động là hàm của thời gian nên mỗi lần dựng giống hệt nhau.
type Hop = {x: number; y: number; w: number; h: number};
type Geo = {w: number; h: number; t: Hop[]};

const KHOANG: Record<string, number> = {quanhe: 0.3, toantu: 0.24, khac: 0.04};
const DUR = 0.9;
const cacheHtml = new Map<string, string>();
const htmlTu = (tex: string): string => {
  let v = cacheHtml.get(tex);
  if (v === undefined) {
    try {
      v = katex.renderToString(tex.replace(/(^|[^\\])%/g, '$1\\%'), {throwOnError: true, strict: 'ignore', displayMode: false, output: 'html'});
    } catch (e) {
      // TeX sai cú pháp: hiện dạng chữ đọc được, không bao giờ hiện mã đỏ thô
      v = texSangChu(tex).replace(/[&<>]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'})[c] as string);
    }
    cacheHtml.set(tex, v);
  }
  return v;
};

const hex = (c: string): [number, number, number] => {
  const h = c.replace('#', '');
  const f = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
  return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16), parseInt(f.slice(4, 6), 16)];
};
const tronMau = (a: string, b: string, t: number) => {
  const x = hex(a);
  const y = hex(b);
  const k = kep01(t);
  return `rgb(${Math.round(x[0] + (y[0] - x[0]) * k)},${Math.round(x[1] + (y[1] - x[1]) * k)},${Math.round(x[2] + (y[2] - x[2]) * k)})`;
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const BienDoi: React.FC<{
  dong: string[];
  batDong: number[]; // giây: lúc mỗi dòng bắt đầu xuất hiện/biến hình
  t: number; // giây kể từ đầu cảnh
  co: number;
  maxWidth: number;
  khungCuoi: boolean;
  mauGoc?: string; // màu chữ ổn định (mặc định trắng)
  mauNhay?: string; // màu sáng lên khi vừa xuất hiện
  mauKhung?: string;
  can?: 'giua' | 'trai'; // 'trai': dòng lớn dần sang phải, phần đầu đứng yên (như video mẫu)
}> = ({dong, batDong, t, co, maxWidth, khungCuoi, mauGoc = '#ffffff', mauNhay = '#FFD27A', mauKhung = '#ffffff', can = 'giua'}) => {
  const khoa = dong.join('¦');
  const toks = useMemo<Tu[][]>(() => dong.map(tachTu), [khoa]);
  const dom = useRef<(HTMLDivElement | null)[]>([]);
  const [geo, setGeo] = useState<Geo[] | null>(null);
  const [h] = useState(() => delayRender('Đo công thức'));

  useLayoutEffect(() => {
    let con = true;
    const do_ = () => {
      const g: (Geo | null)[] = toks.map((_, s) => {
        const c = dom.current[s];
        if (!c) return null;
        const it = Array.from(c.children) as HTMLElement[];
        return {w: c.offsetWidth, h: c.offsetHeight, t: it.map((e) => ({x: e.offsetLeft, y: e.offsetTop, w: e.offsetWidth, h: e.offsetHeight}))};
      });
      if (con && g.every(Boolean)) setGeo(g as Geo[]);
    };
    napPhong().then(do_);
    return () => {
      con = false;
    };
  }, [khoa, co]);
  useEffect(() => {
    if (geo) continueRender(h);
  }, [geo]);

  const ban = (
    <>
      {toks.map((tk, s) => (
        <div
          key={s}
          ref={(e: HTMLDivElement | null) => {
            dom.current[s] = e;
          }}
          style={{position: 'absolute', left: 0, top: 0, visibility: 'hidden', display: 'flex', alignItems: 'center', width: 'max-content', whiteSpace: 'nowrap', fontSize: co, lineHeight: 1.2}}
        >
          {tk.map((x, i) => (
            <span key={i} style={{display: 'inline-block', margin: `0 ${KHOANG[x.loai]}em`}} dangerouslySetInnerHTML={{__html: htmlTu(x.s)}} />
          ))}
        </div>
      ))}
    </>
  );
  if (!geo) return <div style={{position: 'relative', width: maxWidth, height: co * 2}}>{ban}</div>;

  const le0 = can === 'trai' ? 30 : 0;
  const sc = geo.map((g) => Math.min(1, (maxWidth - 2 * le0) / g.w));
  // 'trai': cả khối được đặt giữa theo dòng rộng nhất (dòng cuối), phần đầu dòng vẫn đứng yên khi viết thêm -> cân đối hai bên
  const rongNhat = Math.max(...geo.map((g, i) => g.w * sc[i]));
  const le = can === 'trai' ? Math.max(le0, (maxWidth - rongNhat) / 2) : 0;
  const cao = Math.max(...geo.map((g, s) => g.h * sc[s])) + 64;
  const cx = maxWidth / 2;
  const cy = cao / 2;
  const tam = (s: number, i: number) => {
    const g = geo[s];
    const o = g.t[i];
    const x = can === 'trai' ? le + (o.x + o.w / 2) * sc[s] : cx + (o.x + o.w / 2 - g.w / 2) * sc[s];
    return {x, y: cy + (o.y + o.h / 2 - g.h / 2) * sc[s], w: o.w, h: o.h, s: sc[s]};
  };

  // dòng đang hiển thị
  let k = -1;
  for (let i = 0; i < dong.length; i++) if (t >= batDong[i]) k = i;
  const nodes: React.ReactNode[] = [];
  const them = (key: string, s: number, i: number, x: number, y: number, tl: number, op: number, mau: string, clip?: string) => {
    const o = geo[s].t[i];
    nodes.push(
      <span
        key={key}
        style={{position: 'absolute', left: x - o.w / 2, top: y - o.h / 2, width: o.w, height: o.h, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${tl})`, opacity: op, color: mau, whiteSpace: 'nowrap', clipPath: clip}}
      >
        <span dangerouslySetInnerHTML={{__html: htmlTu(toks[s][i].s)}} />
      </span>
    );
  };
  const viet = (r: number) => (r >= 1 ? undefined : `inset(-15% ${(1 - r) * 100}% -15% 0)`);

  let tKetThuc = 0;
  if (k === 0) {
    const st = Math.min(0.12, 0.8 / Math.max(1, toks[0].length));
    toks[0].forEach((_, i) => {
      const r = smooth((t - batDong[0] - i * st) / 0.45);
      if (r <= 0) return;
      const p = tam(0, i);
      them(`0-${i}`, 0, i, p.x, p.y + (1 - r) * 10, p.s, Math.min(1, r * 3), tronMau(mauNhay, mauGoc, (t - batDong[0] - i * st - 0.5) / 0.6), viet(r));
    });
    tKetThuc = batDong[0] + st * toks[0].length + 0.45;
  } else if (k >= 1) {
    const A = toks[k - 1];
    const B = toks[k];
    const dur = k + 1 < dong.length ? Math.min(DUR, (batDong[k + 1] - batDong[k]) * 0.85) : DUR;
    const p = (t - batDong[k]) / Math.max(0.2, dur);
    const e = smooth(p);
    tKetThuc = batDong[k] + dur;
    const sau = t - tKetThuc; // thời gian sau khi biến hình xong
    const mauMoi = tronMau(mauNhay, mauGoc, (sau - 0.5) / 0.7);
    for (const c of ghepTu(A, B)) {
      if (c.kieu === 'giu' && c.a !== null && c.b !== null) {
        const pa = tam(k - 1, c.a);
        const pb = tam(k, c.b);
        const sang = Math.sin(Math.PI * kep01(p)) * 0.85;
        them(`g-${c.b}`, k, c.b, lerp(pa.x, pb.x, e), lerp(pa.y, pb.y, e), lerp(pa.s, pb.s, e), 1, tronMau(mauGoc, mauNhay, sang));
      } else if (c.kieu === 'thay' && c.a !== null && c.b !== null) {
        const pa = tam(k - 1, c.a);
        const pb = tam(k, c.b);
        const x = lerp(pa.x, pb.x, e);
        const y = lerp(pa.y, pb.y, e);
        const s = lerp(pa.s, pb.s, e);
        them(`ta-${c.a}`, k - 1, c.a, x, y, s, 1 - smooth(kep01(e * 1.7)), mauNhay);
        them(`tb-${c.b}`, k, c.b, x, y, s, smooth(kep01((e - 0.25) / 0.75)), e < 1 ? mauNhay : mauMoi);
      } else if (c.kieu === 'mat' && c.a !== null) {
        const pa = tam(k - 1, c.a);
        them(`m-${c.a}`, k - 1, c.a, pa.x, pa.y - 12 * e, pa.s * (1 - 0.12 * e), 1 - smooth(kep01(e * 2.2)), mauGoc);
      } else if (c.kieu === 'moi' && c.b !== null) {
        const pb = tam(k, c.b);
        const r = smooth(kep01((e - 0.3) / 0.7));
        if (r > 0) them(`n-${c.b}`, k, c.b, pb.x, pb.y + (1 - r) * 10, pb.s, Math.min(1, r * 3), e < 1 ? mauNhay : mauMoi, viet(r));
      }
    }
  }

  // khung bao quanh dòng cuối + nảy nhẹ (Circumscribe + Indicate)
  let khung: React.ReactNode = null;
  let nay = 1;
  if (khungCuoi && k === dong.length - 1 && k >= 0) {
    const u = kep01((t - tKetThuc - 0.15) / 0.8);
    nay = 1 + 0.05 * Math.sin(Math.PI * kep01((t - tKetThuc - 0.1) / 0.7));
    if (u > 0) {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      toks[k].forEach((_, i) => {
        const p = tam(k, i);
        x0 = Math.min(x0, p.x - (p.w * p.s) / 2);
        x1 = Math.max(x1, p.x + (p.w * p.s) / 2);
        y0 = Math.min(y0, p.y - (p.h * p.s) / 2);
        y1 = Math.max(y1, p.y + (p.h * p.s) / 2);
      });
      const pad = 20;
      khung = (
        <svg width={maxWidth} height={cao} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
          {/* như video mẫu: khung neon xanh phát sáng, hơi nghiêng, nền xanh mờ đổ dần vào sau khi viền vẽ xong */}
          <g transform={`rotate(${-2.5 * smooth(u)} ${(x0 + x1) / 2} ${(y0 + y1) / 2})`}>
            <rect x={x0 - pad} y={y0 - pad} width={x1 - x0 + 2 * pad} height={y1 - y0 + 2 * pad} rx={18} fill={`rgba(59,242,154,${0.14 * kep01((u - 0.5) * 2)})`} stroke="#3BF29A" strokeWidth={6} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - smooth(u)} style={{filter: 'drop-shadow(0 0 10px #3BF29A) drop-shadow(0 0 22px rgba(59,242,154,0.6))'}} />
          </g>
        </svg>
      );
    }
  }

  return (
    <div style={{position: 'relative', width: maxWidth, height: cao, fontSize: co, lineHeight: 1.2, fontFamily: FONT, color: mauGoc, transform: `scale(${nay})`}}>
      {ban}
      {nodes}
      {khung}
    </div>
  );
};
