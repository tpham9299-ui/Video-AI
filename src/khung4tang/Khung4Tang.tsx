// v90 — KHUNG 4 TẦNG CỐ ĐỊNH: T1 nhãn bước + tiêu đề | T2 sân khấu 3D Vector sống | T3 thẻ giải | T4 thanh ghim ĐỀ.
// Mỗi tầng là một vùng cứng (overflow hidden, data-vung cho kiem_duyet.mjs) nên không thành phần nào lấn sang tầng khác.
import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {FONT} from '../theme';
import {KieuToan, NapPhongToan} from '../Toan';
import {SanKhau3DVector} from '../3d-vector/SanKhau3DVector';
import {chuanHoaCanh3DV} from '../3d-vector/dac_ta';
import {MAU_3DV} from '../3d-vector/kieu';
import {NenTramToanHoc} from './NenTramToanHoc';
import {TangTieuDe} from './TangTieuDe';
import {TangTheGiai} from './TangTheGiai';
import {ThanhDe} from './ThanhDe';
import {boCuc4Tang, Vung} from './vung';
import {BuocGiai, Khung4TangVao} from './kieu';

const mauBuoc = (b: BuocGiai) => MAU_3DV[b.mau || 'cyan'] || MAU_3DV.cyan;

const Tang: React.FC<{ten: string; v: Vung; children: React.ReactNode}> = ({ten, v, children}) => (
  <div data-vung={ten} style={{position: 'absolute', left: 0, width: 1080, top: v.y, height: v.h, overflow: 'hidden'}}>
    {children}
  </div>
);

export const Khung4Tang: React.FC<Khung4TangVao> = (p) => {
  const f = useCurrentFrame();
  const fps = p.fps || 30;
  const t = f / fps;
  const bc = boCuc4Tang(p.boCuc?.anToanTikTok !== false);
  const canh = useMemo(() => chuanHoaCanh3DV(p.canh3dv).canh, [p.canh3dv]);
  const buoc = useMemo(() => [...(p.buoc || [])].sort((a, b) => a.t - b.t), [p.buoc]);
  let i = -1;
  buoc.forEach((b, j) => b.t <= t && (i = j));
  if (i < 0 && buoc.length) i = 0;
  const mauNhan = i >= 0 ? mauBuoc(buoc[i]) : MAU_3DV.cyan;
  const gon = p.boCuc?.phuDe === 'gon';
  const cauNay = gon ? (p.cau || []).find((c) => t >= c.bat && t < c.ket) : undefined;
  // phụ đề gọn có dải riêng 56 px lấy từ đáy T3 (không chồng lên thẻ giải)
  const t3: Vung = gon ? {y: bc.t3.y, h: bc.t3.h - 56} : bc.t3;

  return (
    <AbsoluteFill className="k4t" style={{fontFamily: FONT, background: '#0E1014'}}>
      <KieuToan />
      {/* bù nghiêng (italic correction) của KaTeX đo theo phông KaTeX, không hợp với Be Vietnam nghiêng -> "V  =" hở thừa */}
      <style>{'div, span { text-wrap: balance; } .katex, .katex * { text-wrap: nowrap; } .k4t .katex .mathnormal:not(:has(+ .msupsub)):not(:has(+ .msupsub) *) { margin-right: 0 !important; }'}</style>
      <NapPhongToan />
      <NenTramToanHoc t={t} mauNhan={mauNhan} tamSanKhau={bc.t2.y + bc.t2.h / 2} />
      {p.thuongHieu ? (
        <div data-kd-bo="1" style={{position: 'absolute', top: Math.max(24, bc.t1.y - 58), right: 44, fontFamily: FONT, fontWeight: 800, fontSize: 22, color: 'rgba(230,237,245,0.5)', letterSpacing: 0.4}}>{p.thuongHieu}</div>
      ) : null}
      <Tang ten="t1" v={bc.t1}>
        <TangTieuDe buoc={buoc} i={i} t={t} mau={mauBuoc} />
      </Tang>
      <Tang ten="t2" v={bc.t2}>
        {canh ? <SanKhau3DVector canh={canh} t={t} rong={1080} cao={bc.t2.h} tongGiay={p.tongFrame / fps} /> : null}
      </Tang>
      <Tang ten="t3" v={t3}>
        <TangTheGiai buoc={buoc} i={i} t={t} mau={mauBuoc} />
      </Tang>
      <Tang ten="t4" v={bc.t4}>
        <ThanhDe ds={p.deGhim || []} buoc={buoc} i={i} t={t} cao={bc.t4.h} />
      </Tang>
      {cauNay ? (
        <div data-vung="phu_de" style={{position: 'absolute', left: 60, right: 60, top: t3.y + t3.h + 8, height: 44, textAlign: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 30, color: 'rgba(230,237,245,0.82)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
          {cauNay.text}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
