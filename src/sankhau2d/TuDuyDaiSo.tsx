// v96 — ĐƯỜNG LUI VẠN NĂNG "TƯ DUY & BIẾN ĐỔI KHÓA MÀU" (đề đại số / giải tích / đề lạ): hộp dữ kiện -> mũi tên suy luận ->
// từng bước biến đổi (dòng công thức chính của bước), ẩn số được KHÓA MÀU vàng ở mọi bước; đồ thị mini nếu đề có hàm số.
// Không bao giờ nhét hình hộp 3D vô nghĩa vào đề không có vật thể.
import React from 'react';
import {Toan} from '../Toan';
import type {TuDuyVao} from './kieu';
import {CAO_DONG_KQ, daQua, em, hamMotBien, khoaMauAn, LE, nhipNhan, thangDoThi, tho, tienDo} from './chung';
import {CHU, mau, MO, NEN_THE, ThanhTienDo, VienTex} from './GiaoDien';
import {ChuTron} from '../khung4tang/ChuTron';

export const TuDuyDaiSo: React.FC<{sk: TuDuyVao; t: number; W: number; H: number; mauNhan: string}> = ({sk, t, W, H, mauNhan}) => {
  const f = React.useMemo(() => (sk.do_thi ? hamMotBien(sk.do_thi.ham, 'x') : null), [sk.do_thi]);
  const coDT = !!f;
  const rD = React.useMemo(() => ({x: W - LE.phai - 250, y: 120, w: 230, h: 170}), [W]);
  const th = React.useMemo(() => (f ? thangDoThi(f, -4, 4, rD) : null), [f, rD]);
  const nh = nhipNhan(sk.nhip, sk.pha, t);
  const dDK = daQua(sk.pha, 'du_kien', t) > -Infinity ? daQua(sk.pha, 'du_kien', t) : t - 0.3;
  // pha nut_j (chuanbi.py đặt theo mốc bước giải); thiếu -> nối tiếp 2,5 s
  const moNut = (j: number) => {
    const d = daQua(sk.pha, `nut_${j}`, t);
    return d > -Infinity ? d : dDK - 1.2 - j * 2.5;
  };
  let nay = -1;
  sk.nut.forEach((_, j) => moNut(j) >= 0 && (nay = j));
  const an = /(?<![A-Za-z\\])t(?![A-Za-z])/.test(sk.nut.map((n) => n.dong).join(' ')) && !/(?<![A-Za-z\\])x(?![A-Za-z])/.test(sk.nut.map((n) => n.dong).join(' ')) ? 't' : 'x';
  const rongNut = (coDT ? W - LE.phai - 280 : W - LE.phai) - LE.trai;
  const yNut0 = LE.tren + 92, caoNut = 104, cach = 30;
  const toiDa = Math.floor((H - LE.duoi - CAO_DONG_KQ + 60 - yNut0) / (caoNut + cach));
  const dau = Math.max(0, nay - toiDa + 1); // cửa sổ trượt: luôn thấy bước đang giảng
  const VANG = mau('vang');
  // v96: CẢNH MỞ (hook 2 giây đầu, phủ Intro): phương trình / đề chính cỡ lớn căn giữa sân khấu, ẩn số khóa màu, thở nhẹ;
  // tới lúc bước 2 bắt đầu thì thu nhỏ biến mất, chuỗi suy luận trượt vào
  const de = sk.du_kien[0] || sk.nut[0]?.dong || '';
  const tHet = (() => { const p = sk.pha.find((q) => q.ten === 'nut_1'); return p ? p.t : 4.5; })();
  const aVao = em((t - 0.2) / 0.45), aRa = em((t - (tHet - 0.5)) / 0.5);
  const aHero = de ? aVao * (1 - aRa) : 0;
  const aDS = de ? aRa : 1; // chuỗi suy luận chỉ hiện sau cảnh mở
  return (
    <div style={{position: 'absolute', inset: 0}}>
      {aHero > 0.001 ? (
        <div data-sk2d="de_lon" style={{position: 'absolute', left: LE.trai, width: W - LE.trai - LE.phai, top: 0, height: H - 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26,
          opacity: aHero, transform: `scale(${(0.86 + 0.14 * aVao) * (1 - 0.18 * aRa) * (1 + 0.015 * tho(t, 2.2))})`}}>
          <div style={{width: 120, height: 4, borderRadius: 2, background: VANG, opacity: 0.85, transform: `scaleX(${em((t - 0.5) / 0.6)})`}} />
          <Toan tex={khoaMauAn(de, an, VANG)} size={74} color={CHU} maxWidth={W - LE.trai - LE.phai - 40} style={{fontWeight: 800}} />
          <div style={{opacity: em((t - 1.0) / 0.4), transform: `translateY(${(1 - em((t - 1.0) / 0.4)) * 10}px)`}}>
            <VienTex tex={`${an} = \\;?`} mau={mau('hong')} co={30} />
          </div>
        </div>
      ) : null}
      <div style={{position: 'absolute', inset: 0, opacity: aDS}}>
      <div data-sk2d="du_kien" style={{position: 'absolute', left: LE.trai, top: LE.tren, width: W - LE.trai - LE.phai, display: 'flex', gap: 12, flexWrap: 'nowrap', overflow: 'hidden'}}>
        {sk.du_kien.map((d, k) => {
          const a = em((dDK - k * 0.25) / 0.35);
          return a > 0 ? <div key={k} style={{opacity: a, transform: `translateY(${(1 - a) * -12}px)`}}><VienTex tex={d} mau={k === 0 ? mau('hong') : mau('cyan')} co={24} /></div> : null;
        })}
      </div>
      {sk.nut.slice(dau, dau + toiDa).map((n, k) => {
        const j = dau + k;
        const d = moNut(j);
        const a = em(d / 0.45);
        if (a <= 0) return null;
        const y = yNut0 + k * (caoNut + cach);
        const m = mau(n.mau);
        const laNay = j === nay;
        return (
          <React.Fragment key={j}>
            {k > 0 ? <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
              <line x1={LE.trai + 40} y1={y - cach + 2} x2={LE.trai + 40} y2={y - 6} stroke={m} strokeWidth={2.4} />
              <path d={`M${LE.trai + 32} ${y - 14} L${LE.trai + 40} ${y - 4} L${LE.trai + 48} ${y - 14}`} fill="none" stroke={m} strokeWidth={2.4} />
            </svg> : null}
            <div data-sk2d={`nut_${j}`} style={{position: 'absolute', left: LE.trai, top: y, width: rongNut, height: caoNut, borderRadius: 18, background: NEN_THE, opacity: laNay ? a : 0.55,
              border: `${laNay ? 2 : 1}px solid ${laNay ? m : 'rgba(255,255,255,0.10)'}`, boxShadow: laNay ? `0 0 ${14 + 10 * nh}px ${m}33` : 'none',
              transform: `translateX(${(1 - a) * -20}px) scale(${laNay ? 1 + 0.012 * tho(t, 2.2) : 1})`, padding: '10px 18px', overflow: 'hidden'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 10, color: m, fontWeight: 800, fontSize: 21, whiteSpace: 'nowrap'}}>
                <span>{n.nhan}</span><span style={{color: MO, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis'}}><ChuTron s={n.tieu_de} co={21} mau={MO} /></span>
              </div>
              {n.dong ? <div style={{marginTop: 6, opacity: em((d - 0.4) / 0.4)}}><Toan tex={khoaMauAn(n.dong, an, VANG)} size={34} color={CHU} maxWidth={rongNut - 40} can="trai" /></div> : null}
            </div>
          </React.Fragment>
        );
      })}
      {th && f ? (
        <div data-sk2d="do_thi_mini" style={{opacity: em((dDK - 0.8) / 0.5)}}>
          <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
            <rect x={rD.x - 14} y={rD.y - 40} width={rD.w + 28} height={rD.h + 56} rx={18} fill="rgba(21,26,35,0.9)" stroke="rgba(255,255,255,0.1)" />
            <line x1={rD.x} x2={rD.x + rD.w} y1={th.Y(0)} y2={th.Y(0)} stroke="rgba(255,255,255,0.25)" />
            <line x1={th.X(0)} x2={th.X(0)} y1={rD.y} y2={rD.y + rD.h} stroke="rgba(255,255,255,0.25)" />
            <path d={th.mau.map(([u, v], i) => `${i ? 'L' : 'M'}${th.X(u).toFixed(1)} ${th.Y(v).toFixed(1)}`).join(' ')} fill="none" stroke={mau('cyan')} strokeWidth={2.6} />
            <circle cx={th.X(Math.sin(t * 0.7) * 3)} cy={th.Y(f(Math.sin(t * 0.7) * 3))} r={6} fill={VANG} />
          </svg>
          <div style={{position: 'absolute', left: rD.x, top: rD.y - 34}}><Toan tex={`${sk.do_thi!.ten}(x)`} size={22} color={mau('cyan')} /></div>
        </div>
      ) : null}
      </div>
      <ThanhTienDo W={W} H={H} u={tienDo(sk.pha, t)} mau={mauNhan} />
    </div>
  );
};
