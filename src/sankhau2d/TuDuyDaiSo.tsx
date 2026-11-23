// v96 — ĐƯỜNG LUI VẠN NĂNG "TƯ DUY & BIẾN ĐỔI KHÓA MÀU" (đề đại số / giải tích / đề lạ): hộp dữ kiện -> mũi tên suy luận ->
// từng bước biến đổi (dòng công thức chính của bước), ẩn số được KHÓA MÀU vàng ở mọi bước; đồ thị mini nếu đề có hàm số.
// Không bao giờ nhét hình hộp 3D vô nghĩa vào đề không có vật thể.
// v98: (1) cảnh mở tối đa 2,6 s rồi dữ kiện hiện lần lượt + KHUNG chuỗi suy luận (tiêu đề mờ) ngay ở Bước 1 (lichTuDuy) -> không còn
// màn "x = ?" đứng yên tới hết phần đọc đề; (2) ô cao THEO PHÂN SỐ (caoDongTex) + Toan maxHeight -> không cắt nửa tử / mẫu;
// (3) sóng quét ở mốc nhịp chạy dọc chuỗi; (4) nội dung căn giữa trục sân khấu.
import React from 'react';
import {CYAN as CYAN_, HO_PHACH, XAM} from '../khung4tang/mau_v981';
import {Toan} from '../Toan';
import type {TuDuyVao} from './kieu';
import {em, hamMotBien, khoaMauAn, lichTuDuy, LE, nhacSong, nhipNhan, songQuet, thangDoThi, tho, tienDo} from './chung';
import {CHU, mau, MO, NEN_THE, ThanhTienDo, VienTex} from './GiaoDien';
import {ChuTron} from '../khung4tang/ChuTron';
import {caoDongTex, coVuaCao} from '../khung4tang/do_tex';

const CO_DONG = 34, DAU_NUT = 44, DEM_NUT = 22, CACH = 26, CAO_DONG_MAX = 150;

export const TuDuyDaiSo: React.FC<{sk: TuDuyVao; t: number; W: number; H: number; mauNhan: string}> = ({sk, t, W, H, mauNhan}) => {
  const f = React.useMemo(() => (sk.do_thi ? hamMotBien(sk.do_thi.ham, 'x') : null), [sk.do_thi]);
  const coDT = !!f;
  const rD = React.useMemo(() => ({x: W - LE.phai - 230, y: 120, w: 210, h: 160}), [W]);
  const th = React.useMemo(() => (f ? thangDoThi(f, -4, 4, rD) : null), [f, rD]);
  const nh = nhipNhan(sk.nhip, sk.pha, t);
  const song = songQuet(sk.nhip, t);
  const L = React.useMemo(() => lichTuDuy(sk), [sk]);
  const rongNut = (coDT ? W - LE.phai - 254 : W - LE.phai) - LE.trai;
  // cỡ chữ + chiều cao từng nút theo độ sâu phân số của dòng công thức (ước lượng tất định; Toan maxHeight chặn cuối)
  const kt = React.useMemo(() => sk.nut.map((n) => {
    if (!n.dong) return {co: CO_DONG, h: DAU_NUT + DEM_NUT};
    const co = coVuaCao([n.dong], CO_DONG, CAO_DONG_MAX, 0, 24);
    return {co, h: DAU_NUT + DEM_NUT + Math.min(CAO_DONG_MAX, caoDongTex(n.dong, co))};
  }), [sk.nut]);
  let nay = -1;
  L.tNut.forEach((x, j) => t >= x && (nay = j));
  let khung = -1;
  L.tKhung.forEach((x, j) => t >= x && (khung = j));
  const yNut0 = LE.tren + 86;
  const caoCo = H - LE.duoi - 12 - yNut0;
  // cửa sổ trượt theo CHIỀU CAO thật: luôn thấy nút đang giảng, thêm nút sau nếu còn chỗ
  const neo = Math.max(0, nay, Math.min(khung, 0));
  let dau = neo, tong = kt[neo]?.h ?? 0;
  while (dau > 0 && tong + CACH + kt[dau - 1].h <= caoCo) tong += CACH + kt[--dau].h;
  let het = neo + 1;
  while (het < sk.nut.length && tong + CACH + kt[het].h <= caoCo) tong += CACH + kt[het++].h;
  const VANG = mau('vang');
  const an = /(?<![A-Za-z\\])t(?![A-Za-z])/.test(sk.nut.map((n) => n.dong).join(' ')) && !/(?<![A-Za-z\\])x(?![A-Za-z])/.test(sk.nut.map((n) => n.dong).join(' ')) ? 't' : 'x';
  // CẢNH MỞ (hook 2 giây đầu, phủ Intro): đề chính cỡ lớn căn giữa, ẩn số khóa màu; thu nhỏ biến mất ở L.tHeroRa
  const de = sk.du_kien[0] || sk.nut[0]?.dong || '';
  const aVao = em((t - 0.2) / 0.45), aRa = em((t - L.tHeroRa) / 0.5);
  const aHero = de ? aVao * (1 - aRa) : 0;
  const aDS = de ? aRa : 1;
  let y = yNut0;
  const viTri: number[] = [];
  for (let j = dau; j < het; j++) { viTri[j] = y; y += kt[j].h + CACH; }
  const xMui = LE.trai + rongNut / 2;
  return (
    <div style={{position: 'absolute', inset: 0}}>
      {aHero > 0.001 ? (
        <div data-sk2d="de_lon" style={{position: 'absolute', left: LE.trai, width: W - LE.trai - LE.phai, top: 0, height: H - 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26,
          opacity: aHero, transform: `scale(${(0.86 + 0.14 * aVao) * (1 - 0.18 * aRa) * (1 + 0.015 * tho(t, 2.2))})`}}>
          <div style={{width: 120, height: 4, borderRadius: 2, background: VANG, opacity: 0.85, transform: `scaleX(${em((t - 0.5) / 0.6)})`}} />
          <Toan tex={khoaMauAn(de, an, VANG)} size={70} color={CHU} maxWidth={W - LE.trai - LE.phai - 40} maxHeight={H - 200} style={{fontWeight: 800}} />
          <div style={{opacity: em((t - 1.0) / 0.4), transform: `translateY(${(1 - em((t - 1.0) / 0.4)) * 10}px)`}}>
            <VienTex tex={`${an} = \\;?`} mau={HO_PHACH} co={30} />
          </div>
        </div>
      ) : null}
      <div style={{position: 'absolute', inset: 0, opacity: aDS}}>
        <div data-sk2d="du_kien" style={{position: 'absolute', left: LE.trai, top: LE.tren, width: W - LE.trai - LE.phai, display: 'flex', gap: 12, flexWrap: 'nowrap', overflow: 'hidden', justifyContent: 'center'}}>
          {sk.du_kien.map((d, k) => {
            const a = em((t - L.tDK[k]) / 0.35);
            return a > 0 ? <div key={k} style={{opacity: a, transform: `translateY(${(1 - a) * -12}px)`}}><VienTex tex={d} mau={CYAN_} co={24} /></div> : null;
          })}
        </div>
        {sk.nut.slice(dau, het).map((n, k) => {
          const j = dau + k;
          const aKhung = em((t - L.tKhung[j]) / 0.4);
          if (aKhung <= 0 && t < L.tNut[j]) return null;
          const daBat = t >= L.tNut[j];
          const aBat = em((t - L.tNut[j]) / 0.45);
          const yj = viTri[j];
          const m = j === sk.nut.length - 1 ? HO_PHACH : CYAN_;   // v98.1: nút kết luận hổ phách, còn lại cyan
          const laNay = j === nay;
          const quet = nhacSong(song, j - dau, het - dau);
          return (
            <React.Fragment key={j}>
              {k > 0 ? <svg width={W} height={H} style={{position: 'absolute', inset: 0, opacity: Math.max(aKhung * 0.5, aBat)}}>
                <line x1={xMui} y1={yj - CACH + 2} x2={xMui} y2={yj - 6} stroke={daBat ? m : MO} strokeWidth={2.4} />
                <path d={`M${xMui - 8} ${yj - 14} L${xMui} ${yj - 4} L${xMui + 8} ${yj - 14}`} fill="none" stroke={daBat ? m : MO} strokeWidth={2.4} />
              </svg> : null}
              <div data-sk2d={`nut_${j}`} style={{position: 'absolute', left: LE.trai, top: yj, width: rongNut, height: kt[j].h, borderRadius: 18, background: NEN_THE,
                opacity: daBat ? (laNay ? aBat : 0.6) : 0.42 * aKhung,
                border: `${laNay ? 2 : 1}px ${daBat ? 'solid' : 'dashed'} ${laNay ? m : quet > 0.05 ? `${m}AA` : 'rgba(255,255,255,0.14)'}`,
                boxShadow: laNay ? `0 0 ${14 + 10 * nh + 16 * quet}px ${m}33` : quet > 0.05 ? `0 0 ${16 * quet}px ${m}33` : 'none',
                transform: `translateY(${(1 - aKhung) * 12 - 4 * quet}px) scale(${laNay ? 1 + 0.012 * tho(t, 2.2) : 1})`, padding: '10px 18px', overflow: 'hidden',
                display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: daBat ? m : MO, fontWeight: 800, fontSize: 21, whiteSpace: 'nowrap', maxWidth: rongNut - 36, height: DAU_NUT - 12}}>
                  <span>{n.nhan}</span><span style={{color: MO, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis'}}><ChuTron s={n.tieu_de} co={21} mau={MO} /></span>
                </div>
                {n.dong && daBat ? (
                  <div style={{marginTop: 4, opacity: em((t - L.tNut[j] - 0.4) / 0.4), display: 'flex', justifyContent: 'center', width: '100%'}}>
                    <Toan tex={khoaMauAn(n.dong, an, VANG)} size={kt[j].co} color={CHU} maxWidth={rongNut - 40} maxHeight={kt[j].h - DAU_NUT - DEM_NUT + 4} can="giua" />
                  </div>
                ) : null}
              </div>
            </React.Fragment>
          );
        })}
        {th && f ? (
          <div data-sk2d="do_thi_mini" style={{opacity: em((t - (L.tDK[0] ?? L.tHeroRa) - 0.8) / 0.5)}}>
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

