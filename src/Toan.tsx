import React, {createContext, useContext, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {continueRender, delayRender} from 'remotion';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import {laChuThuong} from './bocuc';
import {khopNhom, khopVua} from './vua';
import {bocChuViet, chuanTex, texSangChu} from './chu';
import {napPhong} from './phong';
import {FONT} from './theme';

// Trong một HopVua (hộp danh sách / thẻ dữ kiện): mọi dòng dùng CHUNG một cỡ chữ (--k), Toan không tự co riêng.
const NhomVuaCtx = createContext(false);

// v89: TÁCH CÔNG THỨC THÀNH CÁC VẾ để chỉ ngắt dòng GIỮA các vế (sau =, ⇒, ⇔, →, ≈), không bao giờ ngắt giữa ngoặc
// ("4(30 -" / "x)²") hay giữa "0 < x < 30". Cụm \text{...} ở tầng ngoài cùng thành chữ thường (được xuống dòng giữa các từ).
type Phan = {toan?: string; chu?: string};
const QUAN_HE = ['\\Leftrightarrow', '\\Rightarrow', '\\Longrightarrow', '\\implies', '\\iff', '\\rightarrow', '\\approx', '\\to', '='];
export function tachVe(tex: string): Phan[] {
  if (/\\begin|&|\\\\/.test(tex)) return [{toan: tex}];
  const ra: Phan[] = [];
  let cur = '';
  let sau = 0;
  const day = () => {
    if (cur.trim()) ra.push({toan: cur.trim()});
    cur = '';
  };
  let i = 0;
  while (i < tex.length) {
    const c = tex[i];
    if (c === '\\') {
      const m = /^\\([a-zA-Z]+|.)/.exec(tex.slice(i));
      const lenh = m ? m[0] : '\\';
      if (sau === 0 && /^\\(text|mbox|textrm)$/.test(lenh) && tex[i + lenh.length] === '{') {
        // lấy nội dung trong ngoặc khớp
        let d = 0;
        let j = i + lenh.length;
        for (; j < tex.length; j++) {
          if (tex[j] === '{') d++;
          else if (tex[j] === '}' && --d === 0) break;
        }
        const noi = tex.slice(i + lenh.length + 1, j);
        if (/\s/.test(noi.trim()) || /[À-ỹ]/.test(noi)) {
          day();
          ra.push({chu: noi});
          i = j + 1;
          continue;
        }
      }
      if (lenh === '\\left') sau++;
      else if (lenh === '\\right') sau = Math.max(0, sau - 1);
      cur += lenh;
      i += lenh.length;
      if (sau === 0 && QUAN_HE.includes(lenh) && !/^[a-zA-Z]/.test(tex[i] || '')) day();
      continue;
    }
    if (c === '{') sau++;
    else if (c === '}') sau = Math.max(0, sau - 1);
    cur += c;
    i++;
    if (sau === 0 && c === '=') day();
  }
  day();
  return ra.length ? ra : [{toan: tex}];
}

function dungHtml(tex: string): string | null {
  try {
    const phan = tachVe(bocChuViet(String(tex)));
    // dấu ":" ngay sau cụm chữ là dấu câu (dính vào chữ), không phải quan hệ toán (KaTeX chèn khoảng trắng "nhất : 500")
    for (let i = 1; i < phan.length; i++) {
      const p = phan[i];
      if (p.toan !== undefined && phan[i - 1].chu !== undefined && /^:/.test(p.toan)) {
        phan[i - 1].chu = phan[i - 1].chu!.replace(/\s+$/, '') + ': ';
        p.toan = p.toan.slice(1).trim();
      }
    }
    for (let i = phan.length - 1; i >= 0; i--) if (phan[i].toan !== undefined && !phan[i].toan) phan.splice(i, 1);
    const ve = phan.map((p) =>
      p.chu !== undefined
        ? `<span class="toan-chu">${p.chu.replace(/[&<>]/g, (x) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'}[x] as string))}</span>`
        : `<span class="toan-ve">${katex.renderToString(p.toan!, {throwOnError: true, strict: 'ignore', displayMode: false, output: 'html'}).replace(/′/g, '<span class="toan-phay">′</span>')}</span>`,
    );
    return ve.join(' ');
  } catch (e) {
    return null;
  }
}

// Hiện một chuỗi: công thức LaTeX (KaTeX) hoặc chữ thường (tiếng Việt, "Cùng đỏ"...), tự nhận biết.
// Có maxWidth thì TỰ VỪA KHUNG bằng cỡ chữ thật (vua.ts). can: căn lề ('trai' trong danh sách, mặc định giữa).
export const Toan: React.FC<{
  tex: string;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
  maxWidth?: number;
  chuThuong?: boolean;
  can?: 'trai' | 'giua';
}> = ({tex, size = 52, color = '#ffffff', style, maxWidth, chuThuong, can}) => {
  tex = chuanTex(tex);
  const nhom = useContext(NhomVuaCtx);
  const trai = can ? can === 'trai' : nhom;
  const thuong = chuThuong !== undefined ? chuThuong : laChuThuong(tex);
  const ref = useRef<HTMLSpanElement>(null);

  const html = useMemo(() => (thuong ? null : dungHtml(tex)), [tex, thuong]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !maxWidth || nhom) return;
    const khop = () => khopVua(el, maxWidth);
    khop();
    let con = true;
    napPhong().then(() => con && khop());
    return () => {
      con = false;
    };
  }, [tex, size, maxWidth, thuong, html, nhom]);

  const chung: React.CSSProperties = {
    display: 'inline-block',
    width: 'max-content',
    fontFamily: FONT,
    fontWeight: 600,
    fontSize: `calc(${size}px * var(--k, 1))`,
    fontVariantNumeric: 'tabular-nums',
    color,
    lineHeight: 1.32,
    textAlign: trai ? 'left' : 'center',
    whiteSpace: 'nowrap',
    ...style,
  };
  const thuocTinh = {'data-maxw': maxWidth, 'data-co': size, ...(nhom ? {'data-vua-nhom': '1'} : {})};
  if (thuong || html === null) {
    const hien = thuong ? String(tex) : texSangChu(tex);
    return (
      <span ref={ref} data-tex-loi={thuong ? undefined : tex} {...thuocTinh} style={chung}>
        {hien}
      </span>
    );
  }
  return <span ref={ref} data-tex={String(tex).slice(0, 80)} {...thuocTinh} style={chung} dangerouslySetInnerHTML={{__html: html}} />;
};

// HỘP CÓ CỠ CHỮ CHUNG: bọc danh sách/thẻ dữ kiện. Mọi Toan bên trong được đo chung -> một hệ số --k cho cả hộp,
// dòng chữ thường bên trong nên dùng fontSize `calc(Npx * var(--k, 1))` để cùng cỡ.
export const HopVua: React.FC<{children: React.ReactNode; style?: React.CSSProperties; khoa?: unknown}> = ({children, style, khoa}) => {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    khopNhom(el);
    let con = true;
    napPhong().then(() => con && khopNhom(el));
    return () => {
      con = false;
    };
  }, [khoa]);
  return (
    <NhomVuaCtx.Provider value>
      <div ref={ref} style={style}>
        {children}
      </div>
    </NhomVuaCtx.Provider>
  );
};

// Chờ phông nạp xong trước khi chụp khung hình đầu tiên, để đo bề rộng chữ chính xác.
export const NapPhongToan: React.FC = () => {
  const [h] = useState(() => delayRender('Nạp phông chữ'));
  useLayoutEffect(() => {
    napPhong().then(() => continueRender(h));
  }, [h]);
  return null;
};

// v89: MỘT NGÔN NGỮ HIỂN THỊ cho mọi công thức (bỏ các kiểu dam/latex/dong_nhat trộn phông).
// Chữ số, dấu phép tính, chữ tiếng Việt: Be Vietnam Pro 600 đứng; biến (x, r, h): Be Vietnam Pro 700 nghiêng (cùng họ, cùng độ đậm).
// Dấu ngoặc lớn, gạch phân số, căn thức vẫn dùng bộ phông riêng của KaTeX (KaTeX_Size*) để vẽ đúng.
// .toan-ve: một vế không bao giờ ngắt bên trong; .toan-ngat: cho phép xuống dòng GIỮA các vế / giữa các từ của .toan-chu.
export const KieuToan: React.FC<{kieu?: string}> = () => (
  <style>{`
    .katex { font-size: 1em !important; font-weight: 600; font-variant-numeric: tabular-nums; }
    .katex .mord, .katex .mathrm, .katex .mop, .katex .mbin, .katex .mrel, .katex .mpunct, .katex .mopen, .katex .mclose, .katex .minner,
    .katex .text, .katex .text *, .katex .textrm, .katex .mathbf, .katex .textbf, .katex .mathsf, .katex .textsf {
      font-family: ${FONT} !important; font-style: normal; font-weight: 600;
    }
    .katex .mathnormal, .katex .mathit, .katex .textit, .katex .boldsymbol { font-family: ${FONT} !important; font-style: italic; font-weight: 700; }
    .katex .mathbf, .katex .textbf { font-weight: 800; }
    .katex .delimsizing.size1 { font-family: KaTeX_Size1 !important; } .katex .delimsizing.size2 { font-family: KaTeX_Size2 !important; }
    .katex .delimsizing.size3 { font-family: KaTeX_Size3 !important; } .katex .delimsizing.size4 { font-family: KaTeX_Size4 !important; }
    .katex .large-op { font-family: KaTeX_Size2 !important; } .katex .small-op { font-family: KaTeX_Size1 !important; }
    .katex .toan-phay { font-family: KaTeX_Main !important; font-style: normal; font-weight: 700; }
    .toan-ve { display: inline-block; white-space: nowrap; }
    .toan-chu { white-space: nowrap; }
    .toan-ngat { white-space: normal !important; }
    .toan-ngat .toan-chu { white-space: normal; }
  `}</style>
);
