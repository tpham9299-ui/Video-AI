import React from 'react';

// Hai lớp SVG kẹp các viên bi ở giữa để giữ được chiều sâu khi rút bi.
export const BinhBi: React.FC<{rong: number; cao: number; truoc?: boolean; mau: string}> = ({rong, cao, truoc, mau}) => {
  const id = React.useId().replace(/:/g, '');
  return <svg width={rong} height={cao} viewBox="0 0 320 240" preserveAspectRatio="none" fill="none">
    {truoc ? <>
      <path d="M13 29a147 23 0 0 0 294 0" stroke="#d8f3f4" strokeWidth="3"/>
      <path d="M29 46v143m9-137v67m246-66v125" stroke="white" strokeOpacity=".32" strokeWidth="4" strokeLinecap="round"/>
      <path d="M14 208a146 23 0 0 0 292 0" stroke="#bde8e8" strokeWidth="3"/>
    </> : <>
      <defs><linearGradient id={id}>
        <stop stopColor="#32616b"/><stop offset=".15" stopColor="#8cbdc0" stopOpacity=".55"/>
        <stop offset=".35" stopColor="#27515e" stopOpacity=".7"/><stop offset=".72" stopColor="#142d37"/>
        <stop offset="1" stopColor={mau} stopOpacity=".65"/>
      </linearGradient></defs>
      <ellipse cx="160" cy="226" rx="145" ry="12" fill="#051217" opacity=".6"/>
      <path d="M13 29a147 23 0 0 1 294 0v178a147 25 0 0 1-294 0Z" fill={`url(#${id})`} stroke="#83bec5" strokeWidth="2"/>
      <ellipse cx="160" cy="204" rx="145" ry="23" fill="#23434d" stroke="#7ca6ae"/>
      <ellipse cx="160" cy="29" rx="147" ry="23" fill="#15343d" stroke="#acd9db" strokeWidth="3"/>
      <ellipse cx="160" cy="29" rx="137" ry="17" fill="#0e242e" stroke="#648d98"/>
    </>}
  </svg>;
};
