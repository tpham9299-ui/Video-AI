// v90 — TẦNG 4: THANH GHIM "ĐỀ". Một hàng viên thuốc dữ kiện; bước nào dùng dữ kiện nào thì viên đó sáng viền vàng.
import React from 'react';
import {FONT} from '../theme';
import {Toan} from '../Toan';
import {MAU_3DV} from '../3d-vector/kieu';
import {rongNhan} from '../3d-vector/nhan';
import {emRa, emVaoRa} from '../3d-vector/toan3d';
import {BuocGiai, DuKienGhim} from './kieu';

const VANG = MAU_3DV.vang;
const NGOC = MAU_3DV.ngoc || '#2EE6A8';

export const ThanhDe: React.FC<{ds: DuKienGhim[]; buoc: BuocGiai[]; i: number; t: number; cao: number}> = ({ds, buoc, i, t, cao}) => {
  if (!ds.length) return null;
  const pills = ds.slice(0, 6);
  // cỡ chữ chung: co lại tới khi cả hàng vừa bề rộng
  let co = 30;
  const rongHang = (c: number) => 74 + pills.reduce((s, p) => s + Math.max(rongNhan(p.nhan, c), p.doi ? rongNhan(p.doi.nhan, c) : 0) + 40 + 12, 0);
  while (co > 20 && rongHang(co) > 1080 - 2 * 36) co -= 1;
  const sangCua = (id: string) => {
    const nay = i >= 0 && (buoc[i].du_kien || []).includes(id) ? 1 : 0;
    const truoc = i > 0 && (buoc[i - 1].du_kien || []).includes(id) ? 1 : 0;
    const a = i >= 0 ? emVaoRa((t - buoc[i].t) / 0.35) : 1;
    return truoc + (nay - truoc) * a;
  };
  const caoVien = Math.min(58, cao - 20);
  return (
    <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12}}>
      <span style={{fontFamily: FONT, fontWeight: 900, fontSize: co - 2, color: 'rgba(230,237,245,0.55)', letterSpacing: 2, marginRight: 4}}>ĐỀ</span>
      {pills.map((p) => {
        const s = sangCua(p.id);
        const goc = p.mau ? MAU_3DV[p.mau] : '#C9D2DE';
        // v95: "V_max = ?" -> "V_max = 144 cm³" đúng mốc giọng chốt đáp án: nảy nhẹ + viền/chữ xanh ngọc sáng dần
        const aDoi = p.doi ? emRa((t - p.doi.t) / 0.45) : 0;
        if (aDoi > 0) {
          const nay = 1 + 0.14 * Math.sin(Math.PI * Math.min(1, aDoi));
          return (
            <div key={p.id} data-du-kien={p.id} data-da-doi={aDoi > 0.5 ? '1' : '0'} style={{height: caoVien, borderRadius: caoVien / 2, padding: '0 20px', display: 'flex', alignItems: 'center',
              background: `rgba(46,230,168,${0.08 + 0.08 * aDoi})`, border: `2px solid rgba(46,230,168,${0.4 + 0.6 * aDoi})`,
              boxShadow: `0 0 ${22 * aDoi}px rgba(46,230,168,${0.45 * aDoi})`, boxSizing: 'border-box', transform: `scale(${nay})`}}>
              <Toan tex={aDoi < 0.35 ? p.nhan : p.doi!.nhan} size={co} color={aDoi < 0.35 ? VANG : NGOC} style={{fontWeight: 800}} />
            </div>
          );
        }
        return (
          <div key={p.id} data-du-kien={p.id} style={{height: caoVien, borderRadius: caoVien / 2, padding: '0 20px', display: 'flex', alignItems: 'center',
            background: s > 0 ? `rgba(250,204,21,${0.06 + 0.06 * s})` : '#151922',
            border: `${1.5 + 0.5 * s}px solid ${s > 0.02 ? `rgba(250,204,21,${0.35 + 0.65 * s})` : 'rgba(230,237,245,0.16)'}`,
            boxShadow: s > 0.02 ? `0 0 ${18 * s}px rgba(250,204,21,${0.35 * s})` : 'none', boxSizing: 'border-box'}}>
            <Toan tex={p.nhan} size={co} color={s > 0.5 ? VANG : goc} style={{fontWeight: 700}} />
          </div>
        );
      })}
    </div>
  );
};
