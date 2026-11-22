// v93 — OUTRO "TÓM TẮT 3 BƯỚC CHIẾN THUẬT" của khung 4 tầng (thay ManKetChuyenNghiep khi có props.khung4tang.tomTat).
// Trên: đáp án lớn xanh ngọc phát sáng | giữa: mô hình 3D gọn ở trạng thái cuối, máy "thở" chậm |
// dưới: 3 dòng 1·2·3 (trái tên chiến thuật màu nhấn, phải công thức KaTeX) | nút LƯU LẠI NGAY!.
// Mỗi vùng có chiều cao cố định, công thức tự co bằng Toan maxWidth -> không dòng nào lấn vào vùng mô hình.
import React from 'react';
import {AbsoluteFill, Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT, SO_DEU} from '../theme';
import {KieuToan, NapPhongToan, Toan} from '../Toan';
import {SanKhau3DVector} from '../3d-vector/SanKhau3DVector';
import {Canh3DV, MAU_3DV} from '../3d-vector/kieu';
import {emRa, kep01} from '../3d-vector/toan3d';
import {NenTramToanHoc} from './NenTramToanHoc';
import type {DongTomTat} from './kieu';
import {VUNG_OUTRO} from './bo_cuc_v93';

const NGOC = '#2EE6A8';
const SAN_HO = '#FF5A5F';
const NEN = '#0E1014';

// đáp án dạng "a/b" -> phân số
const texDapAn = (s0: string) => { const s = s0.replace(/(\d),(\d)/g, '$1{,}$2'); return (/^\s*-?\d+(?:[.,]\d+)?\s*\/\s*-?\d+(?:[.,]\d+)?\s*$/.test(s) ? `\\frac{${s.split('/')[0].trim()}}{${s.split('/')[1].trim()}}` : s); };

export const OutroTomTat: React.FC<{dapAn: string; tomTat: DongTomTat[]; canh: Canh3DV | null; tCuoi: number; thuongHieu?: string}> = ({dapAn, tomTat, canh, tCuoi, thuongHieu}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const vao = (tu: number, d = 0.4) => emRa((t - tu) / d);
  const aDap = spring({frame: f - 3, fps, config: {damping: 15, stiffness: 140, mass: 0.8}});
  const tDong = (k: number) => 0.9 + k * 0.45;
  const tNut = tDong(Math.min(3, tomTat.length)) + 0.3;
  const sNut = spring({frame: f - Math.round(tNut * fps), fps, config: {damping: 12, stiffness: 160, mass: 0.7}});
  const nhun = t > tNut + 0.5 ? 1 + 0.04 * Math.max(0, Math.sin(((t - tNut - 0.5) * 2 * Math.PI) / 0.9)) : 1;
  const sang = 0.8 + 0.2 * Math.sin((t * 2 * Math.PI) / 2.2);
  const V = VUNG_OUTRO;
  return (
    <AbsoluteFill data-vung="outro" style={{fontFamily: FONT, background: NEN, opacity: kep01(f / 8), ...SO_DEU}}>
      <KieuToan />
      <NapPhongToan />
      <NenTramToanHoc t={tCuoi + t} mauNhan={MAU_3DV.ngoc} tamSanKhau={V.san.y + V.san.h / 2} />
      {thuongHieu ? <div data-kd-bo="1" style={{position: 'absolute', top: 60, right: 44, fontWeight: 800, fontSize: 22, color: 'rgba(230,237,245,0.5)'}}>{thuongHieu}</div> : null}

      {/* đáp án phát sáng */}
      <div style={{position: 'absolute', left: 60, right: 60, top: V.dapAn.y, height: V.dapAn.h, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14,
        opacity: kep01(aDap * 1.5), transform: `scale(${0.88 + 0.12 * aDap})`}}>
        <div style={{height: 44, padding: '0 22px', borderRadius: 22, display: 'flex', alignItems: 'center', color: NGOC, border: `1.5px solid ${NGOC}`, background: `${NGOC}18`, fontWeight: 900, fontSize: 24, letterSpacing: 1.2}}>ĐÁP ÁN</div>
        <div style={{padding: '12px 34px', borderRadius: 24, background: `${NGOC}12`, border: `2px solid ${NGOC}AA`, boxShadow: `0 0 ${30 * sang}px ${NGOC}55, inset 0 0 24px ${NGOC}18`, textShadow: `0 0 18px ${NGOC}88`}}>
          <Toan tex={texDapAn(dapAn || '?')} size={64} color="#F4FFFB" maxWidth={880} />
        </div>
      </div>

      {/* mô hình 3D gọn, trạng thái cuối */}
      {canh ? (
        <div data-vung="outro_san" style={{position: 'absolute', left: 0, top: V.san.y, width: 1080, height: V.san.h, overflow: 'hidden', opacity: vao(0.3, 0.6)}}>
          <SanKhau3DVector canh={canh} t={tCuoi + t} rong={1080} cao={V.san.h} tongGiay={tCuoi} lechMay={{n: 6 * Math.sin((t * 2 * Math.PI) / 7), k: 0.86}} />
        </div>
      ) : null}

      {/* 3 dòng tóm tắt */}
      {tomTat.slice(0, 3).map((d, k) => {
        const a = vao(tDong(k));
        const mau = MAU_3DV[d.mau || (['cyan', 'vang', 'hong'] as const)[k]] || MAU_3DV.cyan;
        return (
          <div key={k} data-tom-tat style={{position: 'absolute', left: 44, right: 44, top: V.dong.y + k * (V.dong.h + V.dong.cach), height: V.dong.h, display: 'flex', alignItems: 'center', gap: 22,
            padding: '0 26px', borderRadius: 20, background: 'rgba(20,24,32,0.92)', border: `1px solid ${mau}66`, boxShadow: `0 0 18px ${mau}1F`,
            opacity: a, transform: `translateX(${(1 - a) * -26}px)`}}>
            <span style={{width: 54, height: 54, flexShrink: 0, borderRadius: 27, background: mau, color: NEN, fontWeight: 900, fontSize: 28, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{k + 1}</span>
            <span style={{width: 300, flexShrink: 0, color: mau, fontWeight: 800, fontSize: d.chien_thuat.length > 14 ? 28 : 32, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{d.chien_thuat}</span>
            <span style={{flex: 1, minWidth: 0, display: 'flex', justifyContent: 'flex-end', overflow: 'hidden'}}>
              {d.cong_thuc ? <Toan tex={d.cong_thuc} size={38} color="#F4F7FB" maxWidth={520} /> : null}
            </span>
          </div>
        );
      })}

      {/* nút lưu */}
      <div style={{position: 'absolute', left: 0, right: 0, top: V.nut.y, display: 'flex', justifyContent: 'center', opacity: kep01(sNut * 2)}}>
        <div style={{height: 96, padding: '0 54px', borderRadius: 48, display: 'flex', alignItems: 'center', gap: 16, background: `linear-gradient(180deg, #FF7A7E, ${SAN_HO} 55%, #E2393F)`,
          boxShadow: `0 7px 0 #9E1F25, 0 0 34px rgba(255,90,95,0.45)`, transform: `scale(${(0.6 + 0.4 * sNut) * nhun})`, color: '#fff', fontWeight: 900, fontSize: 38, letterSpacing: 0.8, whiteSpace: 'nowrap'}}>
          <svg width={36} height={36} viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4z" fill="#fff" /></svg>
          LƯU LẠI NGAY!
        </div>
      </div>
      <Sequence from={3} durationInFrames={70} layout="none"><Audio src={staticFile('sfx/ting.wav')} volume={0.35} /></Sequence>
      <Sequence from={Math.round(tNut * fps)} durationInFrames={20} layout="none"><Audio src={staticFile('sfx/pop.wav')} volume={0.3} /></Sequence>
    </AbsoluteFill>
  );
};
