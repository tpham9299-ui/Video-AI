import React, {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {continueRender, delayRender} from 'remotion';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import {laChuThuong} from './bocuc';
import {khopVua} from './vua';
import {bocChuViet, chuanTex, texSangChu} from './chu';
import {napPhong} from './phong';
import {FONT, FONT_DAM, FONT_SERIF, GIAO_DIEN} from './theme';

// Hiện một chuỗi: công thức LaTeX (KaTeX) hoặc chữ thường (tiếng Việt, "Cùng đỏ"...), tự nhận biết.
// Có maxWidth thì chữ/công thức TỰ VỪA KHUNG: đo bề rộng thật, thử xuống dòng, vẫn tràn thì thu nhỏ.
export const Toan: React.FC<{
  tex: string;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
  maxWidth?: number;
  chuThuong?: boolean;
}> = ({tex, size = 52, color = '#ffffff', style, maxWidth, chuThuong}) => {
  tex = chuanTex(tex);
  const thuong = chuThuong !== undefined ? chuThuong : laChuThuong(tex);
  const ref = useRef<HTMLSpanElement>(null);

  const html = useMemo(() => {
    if (thuong) return null;
    try {
      // lỗi cú pháp TeX: KHÔNG hiện mã đỏ thô -> thử lại bản đã sửa, vẫn lỗi thì hiện dạng chữ đọc được (null)
      return katex.renderToString(bocChuViet(String(tex)), {throwOnError: true, strict: 'ignore', displayMode: false, output: 'html'});
    } catch (e) {
      return null;
    }
  }, [tex, thuong]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !maxWidth) return;
    const khop = () => khopVua(el, maxWidth);
    khop();
    let con = true;
    napPhong().then(() => con && khop());
    return () => {
      con = false;
    };
  }, [tex, size, maxWidth, thuong, html]);

  // useLayoutEffect không cần: useEffect chạy trước khi Remotion chụp khung hình (nó chờ sau mỗi lần render).
  const chung: React.CSSProperties = {
    display: 'inline-block',
    width: 'max-content',
    fontSize: size,
    color,
    lineHeight: 1.35,
    textAlign: 'center',
    ...style,
  };
  if (thuong || html === null) {
    const hien = thuong ? String(tex) : texSangChu(tex);
    return (
      <span ref={ref} data-maxw={maxWidth} style={{...chung, ...(GIAO_DIEN.kieuToan === 'latex' ? {fontFamily: FONT_SERIF, fontStyle: 'italic', fontWeight: 400} : GIAO_DIEN.kieuToan === 'dam' ? {fontFamily: FONT_DAM, fontWeight: 800, textShadow: '0 3px 0 rgba(4,12,12,0.9)'} : {fontFamily: FONT, fontWeight: 700}), whiteSpace: 'nowrap'}}>
        {hien}
      </span>
    );
  }
  return <span ref={ref} data-maxw={maxWidth} data-tex={String(tex).slice(0, 80)} style={chung} dangerouslySetInnerHTML={{__html: html}} />;
};

// Chờ phông nạp xong trước khi chụp khung hình đầu tiên, để đo bề rộng chữ chính xác.
export const NapPhongToan: React.FC = () => {
  const [h] = useState(() => delayRender('Nạp phông chữ'));
  useLayoutEffect(() => {
    napPhong().then(() => continueRender(h));
  }, [h]);
  return null;
};

// Thống nhất kiểu chữ: công thức KaTeX dùng cùng phông Be Vietnam Pro với phần văn bản (thay vì phông Computer Modern có chân).
// Chỉ thay phông của chữ/số/biến; các dấu ngoặc lớn, đường phân số, căn thức vẫn dùng bộ phông riêng của KaTeX để vẽ đúng.
// .toan-ngat: bật xuống dòng cho công thức quá dài.
export const KieuToan: React.FC<{kieu: string}> = ({kieu}) => (
  <style>{kieu === 'dam' ? `
    .katex { font-family: ${FONT_DAM} !important; font-size: 1.04em !important; font-weight: 800; text-shadow: 0 3px 0 rgba(4,12,12,0.9), 0 6px 16px rgba(0,0,0,0.5); }
    .katex .mathnormal, .katex .mathit, .katex .mathdefault, .katex .textit { font-family: ${FONT_DAM} !important; font-style: italic; font-weight: 800; }
    .katex .mathrm, .katex .textrm, .katex .text, .katex .text *, .katex .mord, .katex .mbin, .katex .mrel, .katex .mopen, .katex .mclose, .katex .mpunct { font-family: ${FONT_DAM} !important; font-weight: 800; }
    .katex .mathbf, .katex .textbf, .katex .boldsymbol { font-family: ${FONT_DAM} !important; font-weight: 900; }
    .katex .frac-line { border-bottom-width: 0.08em !important; min-height: 0.08em !important; }
    .katex .delimsizing, .katex .delimsizinginner, .katex .sqrt > .root { font-weight: 400; }
    .toan-ngat { white-space: normal !important; }
    .toan-ngat .katex { white-space: normal !important; }
    .toan-ngat .katex .katex-html { white-space: normal !important; }
  ` : kieu === 'dong_nhat' ? `
    .katex { font-family: ${FONT} !important; font-size: 1.05em !important; font-weight: 700; }
    .katex .mathnormal, .katex .mathit, .katex .mathdefault, .katex .textit { font-family: ${FONT} !important; font-style: italic; font-weight: 700; }
    .katex .mathrm, .katex .textrm, .katex .text, .katex .text * { font-family: ${FONT} !important; font-style: normal; font-weight: 700; }
    .katex .mrel, .katex .mbin { font-family: ${FONT} !important; }
    .katex .mathbf, .katex .textbf, .katex .boldsymbol { font-family: ${FONT} !important; font-weight: 800; }
    .katex .mathsf, .katex .textsf { font-family: ${FONT} !important; }
    .toan-ngat { white-space: normal !important; }
    .toan-ngat .katex { white-space: normal !important; }
    .toan-ngat .katex .katex-html { white-space: normal !important; }
  ` : `
    .katex { font-size: 1.12em !important; }
    .katex .text, .katex .text * { font-family: ${FONT_SERIF} !important; font-style: italic; }
    .toan-ngat { white-space: normal !important; }
    .toan-ngat .katex { white-space: normal !important; }
    .toan-ngat .katex .katex-html { white-space: normal !important; }
  `}</style>
);
