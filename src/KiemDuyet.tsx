import React, {useEffect, useState} from 'react';
import {boCuc4Tang} from './khung4tang/vung';
import {continueRender, delayRender, useCurrentFrame} from 'remotion';

// KIỂM DUYỆT BỐ CỤC (chỉ chạy khi props.kiemDuyet = true, lúc máy dựng chụp các khung mẫu trước khi dựng thật):
// đo TRỰC TIẾP trên khung hình đã dựng, không đoán: chữ tràn mép màn hình, chữ đè lên chữ, chữ bị khung cắt mất,
// mã TeX thô lọt lên màn hình, công thức KaTeX lỗi, chữ quá nhỏ. Kết quả in ra nhật ký trình duyệt dạng "KD|{json}".
// Thêm thuộc tính data-kd-bo="1" vào phần tử cố ý nhỏ/chồng (logo, đường tiến trình...) để bỏ qua.

type Hop = {x: number; y: number; w: number; h: number};
type Khoi = {chu: string; hop: Hop; co: number; el: Element; katex: boolean};
export type LoiKD = {kieu: string; chu: string; chu2?: string; lech?: number; co?: number; hop: Hop};

const giao = (a: Hop, b: Hop): Hop | null => {
  const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y);
  const r = Math.min(a.x + a.w, b.x + b.w), d = Math.min(a.y + a.h, b.y + b.h);
  return r > x && d > y ? {x, y, w: r - x, h: d - y} : null;
};
const dt = (h: Hop) => Math.max(0, h.w) * Math.max(0, h.h);

// Đọc phần canvas thực sự nằm trong T2. Tìm nét nối dài có điểm bên trong
// hộp bao của nét để bỏ ký tự rời, nền đồng màu và chu vi khung nhãn.
function canvasCoHinh(el: HTMLCanvasElement, src: Hop, visible: Hop): boolean {
  const probe = document.createElement('canvas');
  probe.width = 160;
  probe.height = Math.max(1, Math.round(160 * visible.h / visible.w));
  const ctx = probe.getContext('2d', {willReadFrequently: true});
  if (!ctx) return false;
  const sx = el.width / src.w, sy = el.height / src.h;
  ctx.drawImage(el, (visible.x-src.x)*sx, (visible.y-src.y)*sy, visible.w*sx, visible.h*sy, 0, 0, probe.width, probe.height);
  const w = probe.width, h = probe.height;
  const pixels = ctx.getImageData(0, 0, w, h).data;
  const edge = new Uint8Array(w*h);
  for (let y = 1; y < h-1; y++) for (let x = 1; x < w-1; x++) {
    const i = y*w+x;
    for (const n of [i-w,i-1]) {
      for (let c = 0; c < 3; c++) {
        const contrast = Math.abs(pixels[4*i+c]*pixels[4*i+3] - pixels[4*n+c]*pixels[4*n+3]);
        if (contrast > 32*255) edge[i] = 1;
      }
    }
  }
  const neighbours = [-w-1,-w,-w+1,-1,1,w-1,w,w+1];
  for (let i = 0; i < edge.length; i++) {
    if (!edge[i]) continue;
    const points = [i];
    edge[i] = 0;
    let left = w, right = 0, top = h, bottom = 0;
    for (let k = 0; k < points.length; k++) {
      const pos = points[k], x = pos % w, y = Math.floor(pos/w);
      left = Math.min(left,x); right = Math.max(right,x);
      top = Math.min(top,y); bottom = Math.max(bottom,y);
      for (const d of neighbours) if (edge[pos+d]) {edge[pos+d] = 0; points.push(pos+d);}
    }
    if (right-left < 14 || bottom-top < 10) continue;
    if (points.filter(pos => pos%w > left+3 && pos%w < right-3 &&
      Math.floor(pos/w) > top+3 && Math.floor(pos/w) < bottom-3).length >= 8) return true;
  }
  return false;
}

function doKhungHinh(goc: HTMLElement, kiemT2: boolean, doXacSuat: boolean) {
  const g = goc.getBoundingClientRect();
  const tl = g.width / 1080 || 1;
  const quy = (r: DOMRect | Hop): Hop => {
    const rr = r as DOMRect;
    return {x: (rr.x - g.x) / tl, y: (rr.y - g.y) / tl, w: rr.width / tl, h: rr.height / tl};
  };
  const anCache = new Map<Element, boolean>();
  const boQua = (el: Element | null): boolean => {
    const chuaRo: Element[] = [];
    let cur = el;
    let kq = false;
    while (cur && cur !== goc.parentElement) {
      if (anCache.has(cur)) { kq = anCache.get(cur)!; break; }
      const cs = getComputedStyle(cur);
      if (cur.getAttribute('data-kd-bo') === '1' || cs.display === 'none' || cs.visibility === 'hidden') {
        kq = true;
        anCache.set(cur, true);
        break;
      }
      chuaRo.push(cur);
      cur = cur.parentElement;
    }
    for (const c of chuaRo) anCache.set(c, kq);
    return kq;
  };
  const doMo = (el: Element | null): number => {
    let m = 1;
    for (let e = el; e && e !== goc.parentElement; e = e.parentElement) m *= Number(getComputedStyle(e).opacity || 1);
    return m;
  };
  // phần nhìn thấy sau khi bị các khung overflow:hidden cắt
  const catBoi = (el: Element, h: Hop): Hop | null => {
    let con: Hop | null = h;
    for (let e = el.parentElement; e && e !== goc && con; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.overflow !== 'visible' || cs.overflowX !== 'visible' || cs.overflowY !== 'visible') con = giao(con, quy(e.getBoundingClientRect()));
    }
    return con;
  };
  const heSo = (el: Element) => {
    const he = el as HTMLElement;
    const r = he.getBoundingClientRect();
    return he.offsetHeight > 0 ? r.height / tl / he.offsetHeight : 1;
  };

  const khoi: Khoi[] = [];
  const loi: LoiKD[] = [];
  for (const e of Array.from(goc.querySelectorAll<HTMLImageElement>('img[data-manim-formula]'))) {
    if (!e.complete || !e.naturalWidth || boQua(e) || doMo(e) < .55) continue;
    const hop = catBoi(e, quy(e.getBoundingClientRect()));
    if (hop && dt(hop) > 0) khoi.push({chu: e.alt, hop, co: 0, el: e, katex: true});
  }
  const walker = document.createTreeWalker(goc, NodeFilter.SHOW_TEXT);
  const daKatex = new Set<Element>();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const chu = (n.textContent || '').replace(/\s+/g, ' ').trim();
    const cha = n.parentElement;
    if (!chu || !cha || boQua(cha)) continue;
    const kx = cha.closest('.katex');
    if (kx) {
      if (daKatex.has(kx)) continue;
      daKatex.add(kx);
      if (doMo(kx) < 0.55) continue;
      const hop = quy(kx.getBoundingClientRect());
      if (dt(hop) < 4) continue;
      const thayKx = catBoi(kx, hop);
      if (!thayKx || dt(thayKx) < dt(hop) * 0.3) continue;
      const texChu = (kx.closest('[data-tex]')?.getAttribute('data-tex') || kx.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60);
      if (dt(thayKx) < dt(hop) * 0.84 && texChu.length >= 2) loi.push({kieu: 'CAT_CHU', chu: texChu, hop});
      khoi.push({chu: texChu, hop: thayKx, co: parseFloat(getComputedStyle(kx).fontSize) * heSo(kx), el: kx, katex: true});
      continue;
    }
    if (cha.closest('svg') && cha.tagName.toLowerCase() !== 'text' && cha.tagName.toLowerCase() !== 'tspan') continue;
    if (doMo(cha) < 0.55) continue;
    const rg = document.createRange();
    rg.selectNodeContents(n);
    const r = rg.getBoundingClientRect();
    const hop = quy(r);
    if (dt(hop) < 4) continue;
    const thay = catBoi(cha, hop);
    if (!thay || dt(thay) < dt(hop) * 0.3) continue;   // bị che gần hết (cột số lăn...) -> coi như ẩn
    if (dt(thay) < dt(hop) * 0.84 && chu.length >= 2) loi.push({kieu: 'CAT_CHU', chu: chu.slice(0, 60), hop});
    const laSvg = !!cha.closest('svg');
    const co = laSvg ? hop.h / 1.15 : parseFloat(getComputedStyle(cha).fontSize) * heSo(cha);
    khoi.push({chu: chu.slice(0, 60), hop: thay, co, el: cha, katex: false});
    if (/\\[a-zA-Z]{2,}|\\[{}]|\$[^$]*\$|\^\{|_\{|\\\\/.test(chu)) loi.push({kieu: 'TEX_THO', chu: chu.slice(0, 60), hop});
  }
  goc.querySelectorAll('.katex-error, [data-tex-loi]').forEach((e) => {
    if (!boQua(e) && doMo(e) > 0.55) loi.push({kieu: 'KATEX_LOI', chu: (e.getAttribute('data-tex-loi') === '1' ? e.textContent || '' : e.getAttribute('data-tex-loi') || e.textContent || '').slice(0, 60), hop: quy(e.getBoundingClientRect())});
  });

  for (const k of khoi) {
    const {x, y, w, h} = k.hop;
    const lech = Math.max(-x, x + w - 1080, -y, y + h - 1920);
    if (lech > 18 && k.chu.length >= 2) loi.push({kieu: 'TRAN_MEP', chu: k.chu, lech: Math.round(lech), hop: k.hop});
    if (k.co > 0 && k.co < 25 && k.chu.replace(/[^\p{L}\p{N}]/gu, '').length >= 3) loi.push({kieu: 'CHU_NHO', chu: k.chu, co: Math.round(k.co), hop: k.hop});
  }
  // chữ đè chữ: hai khối chữ khác nhau giao nhau đáng kể (bỏ qua lớp sáng trùng khít hoặc góc nghiêng italic chạm nhẹ)
  for (let i = 0; i < khoi.length; i++) {
    for (let j = i + 1; j < khoi.length; j++) {
      const a = khoi[i], b = khoi[j];
      if (a.chu.length < 2 || b.chu.length < 2) continue;
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const gi = giao(a.hop, b.hop);
      if (!gi) continue;
      const nho = Math.min(dt(a.hop), dt(b.hop));
      if (dt(gi) < nho * 0.22 || gi.h < 8 || gi.w < 8) continue;
      if (a.chu === b.chu && dt(gi) > nho * 0.85) continue;
      loi.push({kieu: 'CHU_DE', chu: a.chu, chu2: b.chu, hop: gi});
    }
  }
  // VẬT ĐÈ VẬT trên sân khấu (người bị thẻ che, nhóm người đè lên thẻ chữ...): đo khung bao thật của từng vật
  const vat = Array.from(goc.querySelectorAll('[data-kd-vat]')).filter((e) => e.getAttribute('data-kd-loai') !== 'mui_ten' && !boQua(e) && doMo(e) > 0.55)
    .map((e) => ({id: String(e.getAttribute('data-kd-vat')), loai: String(e.getAttribute('data-kd-loai')), hop: quy(e.getBoundingClientRect())}))
    .filter((x) => dt(x.hop) > 900);
  for (let i = 0; i < vat.length; i++) {
    for (let j = i + 1; j < vat.length; j++) {
      if (vat[i].id === vat[j].id) continue;
      const gi = giao(vat[i].hop, vat[j].hop);
      if (!gi) continue;
      if (dt(gi) > 0.15 * Math.min(dt(vat[i].hop), dt(vat[j].hop))) loi.push({kieu: 'VAT_DE', chu: vat[i].loai + ' ' + vat[i].id, chu2: vat[j].loai + ' ' + vat[j].id, hop: gi});
    }
  }
  // HÌNH TRÀN / BỊ CẮT Ở MÉP MÀN HÌNH (ảnh, vật hình - không chỉ chữ)
  vat.forEach((x) => {
    const lech = Math.max(-x.hop.x, x.hop.x + x.hop.w - 1080);
    if (lech > 12 && ['mui_ten'].indexOf(x.loai) < 0) loi.push({kieu: 'TRAN_MEP', chu: x.loai + ' ' + x.id, lech: Math.round(lech), hop: x.hop});
  });
  // HÌNH MINH HỌA QUÁ NHỎ: các vật hình (không tính nhãn chữ / số) gộp lại chiếm chưa tới 22% VÙNG SÂN KHẤU
  // (vùng giữa tiêu đề và khung công thức, không phải cả màn hình)
  const hinh = vat.filter((x) => ['nhan', 'chu', 'so_dem', 'mui_ten'].indexOf(x.loai) < 0);
  const skEl = Array.from(goc.querySelectorAll('[data-kd-sankhau]')).filter((e) => doMo(e) > 0.55).map((e) => quy(e.getBoundingClientRect())).sort((a, b) => dt(b) - dt(a))[0];
  if (hinh.length && skEl && dt(skEl) > 1000) {
    let ax = 1e9, ay = 1e9, bx = -1e9, by = -1e9;
    hinh.forEach((x) => { ax = Math.min(ax, x.hop.x); ay = Math.min(ay, x.hop.y); bx = Math.max(bx, x.hop.x + x.hop.w); by = Math.max(by, x.hop.y + x.hop.h); });
    const tl = ((bx - ax) * (by - ay)) / dt(skEl);
    if (tl < 0.22) loi.push({kieu: 'HINH_NHO', chu: hinh.map((x) => x.loai).slice(0, 4).join(', '), co: Math.round(tl * 100), hop: {x: ax, y: ay, w: bx - ax, h: by - ay}});
  }
  // CHỮ NHÌN THẤY trên khung (để máy đối chiếu đáp án) + số hiển thị của huy hiệu số lăn (data-kd-so: số các bánh số đang chỉ)
  const so: string[] = [];
  goc.querySelectorAll('[data-kd-so]').forEach((e) => { if (doMo(e) > 0.55) so.push(String(e.getAttribute('data-kd-so'))); });
  const bc = boCuc4Tang(true);
  const tang = kiemT2 ? goc.querySelector('[data-vung="t2"]') : null;
  const hinhT2 = Array.from(tang?.querySelectorAll<SVGGeometryElement>('path,polygon,polyline,line,circle,ellipse') || []).some(el => {
    if (el.closest('defs,clipPath,mask,.katex,[data-xung-t2],[data-lop="minh-hoa"],[data-san-khau-2d="tu_duy_dai_so"]')) return false;
    const cs = getComputedStyle(el);
    if (cs.visibility !== 'visible' || doMo(el) < 0.12) return false;
    const to = el.tagName !== 'line' && cs.fill !== 'none' && Number(cs.fillOpacity) > 0.1;
    if (!to && (cs.stroke === 'none' || Number(cs.strokeOpacity) < 0.1 || parseFloat(cs.strokeWidth) <= 0)) return false;
    const m = el.getScreenCTM(), len = el.getTotalLength();
    if (!m || len <= 0 || !el.getClientRects().length) return false;
    const vung = catBoi(el, {x: bc.le, y: bc.t2.y, w: bc.rong, h: bc.t2.h});
    if (!vung) return false;
    const points = Array.from({length: 17}, (_, i) => el.getPointAtLength(len * i / 16).matrixTransform(m))
      .map(pt => ({x: (pt.x - g.x) / tl, y: (pt.y - g.y) / tl}))
      .filter(pt => pt.x >= vung.x && pt.x <= vung.x + vung.w && pt.y >= vung.y && pt.y <= vung.y + vung.h);
    return points.some(pt => points.some(q => Math.hypot(pt.x - q.x, pt.y - q.y) >= 55));
  });
  const canvas = !hinhT2 && Array.from(tang?.querySelectorAll('canvas') || []).some(el => {
    if (doMo(el) < 0.12 || getComputedStyle(el).visibility !== 'visible') return false;
    const src = quy(el.getBoundingClientRect());
    const safe = giao(src, {x: bc.le, y: bc.t2.y, w: bc.rong, h: bc.t2.h});
    const visible = safe && catBoi(el, safe);
    return !!visible && visible.w >= 55 && visible.h >= 35 && canvasCoHinh(el, src, visible);
  });
  const stage = doXacSuat ? goc.querySelector('[data-vung="t2"]') : null;
  const objects = stage?.querySelectorAll('[data-xs-object], [data-sk2d^="nut_"], [data-sk2d="vuong"] > div, [data-sk2d="tach_giao"], [data-sk2d^="cot_"]');
  const nodes = objects?.length ? objects : stage?.querySelectorAll('svg path, svg circle, svg ellipse, svg rect, svg polygon, svg line');
  const shape = Array.from(nodes || []).filter(el => !el.closest('defs,clipPath,mask,.katex,[data-xung-t2]') && doMo(el) > .15)
    .map(el => {
      const {x,y,w,h} = quy(el.getBoundingClientRect());
      return [el.tagName, ...[x,y,w,h].map(v => Math.round(v/12)), Math.round(doMo(el)*3), getComputedStyle(el).fill].join(',');
    }).join('|');
  return {shape, hinhT2: hinhT2 || canvas, loi, chu: khoi.map((k) => k.chu).slice(0, 120), so};
}

export const KiemDuyet: React.FC<{kiemT2?: boolean; doXacSuat?: boolean}> = ({kiemT2 = false, doXacSuat = false}) => {
  const f = useCurrentFrame();
  useEffect(() => {
    const h = delayRender(`Kiểm duyệt bố cục ${f}`);
    let xong = false;
    let huy = false;
    const chay = () => {
      if (xong) return;
      xong = true;
      if (!huy) {
        try {
          const goc = document.getElementById('kd-goc');
          const kq = goc && goc.parentElement ? doKhungHinh(goc.parentElement, kiemT2, doXacSuat) : {loi: [], chu: [], so: []};
          console.log('KD|' + JSON.stringify({frame: f, ...kq}));
        } catch (e) {
          console.log('KD|' + JSON.stringify({frame: f, loi: [], hong: String(e)}));
        }
      }
      continueRender(h);
    };
    // chờ phông + các hiệu ứng "tự vừa khung" của công thức chạy xong rồi mới đo
    (document as Document & {fonts?: {ready: Promise<unknown>}}).fonts?.ready.then(() => requestAnimationFrame(() => setTimeout(chay, 20)));
    const du = setTimeout(chay, 4000);
    return () => {
      huy = true;
      clearTimeout(du);
      chay();
    };
  }, [f, kiemT2, doXacSuat]);
  return <div id="kd-goc" data-kd-bo="1" style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, pointerEvents: 'none'}} />;
};
