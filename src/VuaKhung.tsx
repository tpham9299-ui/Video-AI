import React, {useLayoutEffect, useRef} from 'react';
import {delayRender, continueRender} from 'remotion';
import {napPhong} from './phong';

// KHUNG TỰ VỪA: đo kích thước THẬT của nội dung (tiêu đề dài xuống nhiều dòng, thẻ đề bài nhiều dữ kiện, nhiều dòng công thức)
// rồi thu nhỏ đều cho vừa khung được chia. Nhờ vậy chữ KHÔNG BAO GIỜ tràn ra ngoài vùng của nó để đè lên hình minh họa.
// (đo kích thước bố cục - không bị ảnh hưởng bởi hiệu ứng scale/translate của chữ - nên mọi khung hình cho cùng kết quả)
export const VuaKhung: React.FC<{maxW: number; maxH: number; goc?: string; children: React.ReactNode}> = ({maxW, maxH, goc = 'center center', children}) => {
  const ref = useRef<HTMLDivElement>(null);
  const khung = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const cha = khung.current;
    if (!el || !cha) return;
    const doKhung = () => {
      const k = Math.min(1, maxW / Math.max(1, el.scrollWidth), maxH / Math.max(1, el.offsetHeight));
      cha.style.transform = `scale(${k})`;
    };
    doKhung();
    const h = delayRender('Đo lại bố cục sau khi nạp phông');
    let con = true;
    napPhong().then(() => { if (con) doKhung(); }).finally(() => continueRender(h));
    return () => { con = false; };
  }, [maxW, maxH, children]);
  return (
    <div ref={khung} style={{transformOrigin: goc, width: maxW, maxWidth: '100%'}}>
      <div ref={ref} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16}}>{children}</div>
    </div>
  );
};
