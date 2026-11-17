import React, {useEffect, useState} from 'react';
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

function doKhungHinh(goc: HTMLElement): {loi: LoiKD[]; chu: string[]; so: string[]} {
  const g = goc.getBoundingClientRect();
  const tl = g.width / 1080 || 1;
  const quy = (r: DOMRect | Hop): Hop => {
    const rr = r as DOMRect;
    return {x: (rr.x - g.x) / tl, y: (rr.y - g.y) / tl, w: rr.width / tl, h: rr.height / tl};
  };
  const anCache = new Map<Element, boolean>();
  const boQua = (el: Element | null): boolean => {
    if (!el) return false;
    if (anCache.has(el)) return anCache.get(el)!;
    let kq = false;
    const cs = getComputedStyle(el);
    if (el.getAttribute('data-kd-bo') === '1' || cs.display === 'none' || cs.visibility === 'hidden') kq = true;
    else kq = boQua(el.parentElement);
    anCache.set(el, kq);
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
      khoi.push({chu: (kx.closest('[data-tex]')?.getAttribute('data-tex') || kx.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60), hop, co: parseFloat(getComputedStyle(kx).fontSize) * heSo(kx), el: kx, katex: true});
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
  goc.querySelectorAll('.katex-error').forEach((e) => {
    if (!boQua(e) && doMo(e) > 0.55) loi.push({kieu: 'KATEX_LOI', chu: (e.textContent || '').slice(0, 60), hop: quy(e.getBoundingClientRect())});
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
  return {loi, chu: khoi.map((k) => k.chu).slice(0, 120), so};
}

export const KiemDuyet: React.FC = () => {
  const f = useCurrentFrame();
  const [h] = useState(() => delayRender('Kiểm duyệt bố cục'));
  useEffect(() => {
    let xong = false;
    const chay = () => {
      if (xong) return;
      xong = true;
      try {
        const goc = document.getElementById('kd-goc');
        const kq = goc && goc.parentElement ? doKhungHinh(goc.parentElement) : {loi: [], chu: [], so: []};
        console.log('KD|' + JSON.stringify({frame: f, ...kq}));
      } catch (e) {
        console.log('KD|' + JSON.stringify({frame: f, loi: [], hong: String(e)}));
      }
      continueRender(h);
    };
    // chờ phông + các hiệu ứng "tự vừa khung" của công thức chạy xong rồi mới đo
    (document as Document & {fonts?: {ready: Promise<unknown>}}).fonts?.ready.then(() => setTimeout(() => requestAnimationFrame(chay), 120));
    const du = setTimeout(chay, 4000);
    return () => clearTimeout(du);
  }, [f, h]);
  return <div id="kd-goc" data-kd-bo="1" style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, pointerEvents: 'none'}} />;
};
