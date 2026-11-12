import React, {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {continueRender, delayRender} from 'remotion';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import {laChuThuong} from './bocuc';
import {khopVua} from './vua';
import {napPhong} from './phong';
import {FONT, FONT_SERIF, GIAO_DIEN} from './theme';

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
  const thuong = chuThuong !== undefined ? chuThuong : laChuThuong(tex);
  const ref = useRef<HTMLSpanElement>(null);

  const html = useMemo(() => {
    if (thuong) return null;
    try {
      return katex.renderToString(String(tex), {throwOnError: false, strict: 'ignore', displayMode: false, output: 'html'});
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
    return (
      <span ref={ref} data-maxw={maxWidth} style={{...chung, ...(GIAO_DIEN.kieuToan === 'latex' ? {fontFamily: FONT_SERIF, fontStyle: 'italic', fontWeight: 400} : {fontFamily: FONT, fontWeight: 700}), whiteSpace: 'nowrap'}}>
        {String(tex)}
      </span>
    );
  }
  return <span ref={ref} data-maxw={maxWidth} style={chung} dangerouslySetInnerHTML={{__html: html}} />;
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
  <style>{kieu === 'dong_nhat' ? `
    .katex { font-family: ${FONT} !important; font-size: 1.05em !important; font-weight: 700; }
    .katex .mathnormal, .katex .mathit, .katex .mathdefault, .katex .textit { font-family: ${FONT} !important; font-style: italic; font-weight: 700; }
    .katex .mathrm, .katex .textrm, .katex .text, .katex .text * { font-family: ${FONT} !important; font-style: normal; font-weight: 700; }
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
