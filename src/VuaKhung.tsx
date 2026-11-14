import React, {useLayoutEffect, useRef, useState} from 'react';

// KHUNG TỰ VỪA: đo kích thước THẬT của nội dung (tiêu đề dài xuống nhiều dòng, thẻ đề bài nhiều dữ kiện, nhiều dòng công thức)
// rồi thu nhỏ đều cho vừa khung được chia. Nhờ vậy chữ KHÔNG BAO GIỜ tràn ra ngoài vùng của nó để đè lên hình minh họa.
// (đo kích thước bố cục - không bị ảnh hưởng bởi hiệu ứng scale/translate của chữ - nên mọi khung hình cho cùng kết quả)
export const VuaKhung: React.FC<{maxW: number; maxH: number; goc?: string; children: React.ReactNode}> = ({maxW, maxH, goc = 'center center', children}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [s, setS] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const k = Math.min(1, maxW / Math.max(1, el.scrollWidth), maxH / Math.max(1, el.scrollHeight));
    if (Math.abs(k - s) > 0.005) setS(k);
  });
  return (
    <div style={{transform: s < 0.999 ? `scale(${s})` : undefined, transformOrigin: goc, maxWidth: s < 0.999 ? undefined : maxW}}>
      <div ref={ref} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16}}>{children}</div>
    </div>
  );
};
