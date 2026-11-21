// v90 — TẦNG 4: THANH GHIM "ĐỀ". Một hàng viên thuốc dữ kiện; bước nào dùng dữ kiện nào thì viên đó sáng viền vàng.
import React from 'react';
import {FONT} from '../theme';
import {Toan} from '../Toan';
import {MAU_3DV} from '../3d-vector/kieu';
import {rongNhan} from '../3d-vector/nhan';
import {emVaoRa} from '../3d-vector/toan3d';
import {BuocGiai, DuKienGhim} from './kieu';

const VANG = MAU_3DV.vang;

export const ThanhDe: React.FC<{ds: DuKienGhim[]; buoc: BuocGiai[]; i: number; t: number; cao: number}> = ({ds, buoc, i, t, cao}) => {
  if (!ds.length) return null;
  const pills = ds.slice(0, 6);
  // cỡ chữ chung: co lại tới khi cả hàng vừa bề rộng
  let co = 30;
  const rongHang = (c: number) => 74 + pills.reduce((s, p) => s + rongNhan(p.nhan, c) + 40 + 12, 0);
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
