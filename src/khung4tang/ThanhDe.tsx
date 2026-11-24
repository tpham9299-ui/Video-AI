// v90 — TẦNG 4: THANH GHIM "ĐỀ". v98.1: bỏ các viên thuốc viền vàng/đỏ -> MỘT dải chữ mảnh trên nền mờ nhẹ, dữ kiện cách nhau
// bằng chấm tròn nhỏ. Bước đang dùng dữ kiện nào thì chữ đó sáng cyan + vạch chân mảnh; ô "x = ?" đổi sang đáp số (hổ phách)
// ĐÚNG mốc chốt (quy tắc chống lộ đáp án giữ nguyên: nội dung ô do khung4tang_v98.che_dap_an_ghim quyết định).
import React from 'react';
import {FONT} from '../theme';
import {Toan} from '../Toan';
import {texSangChu} from '../chu';
import {rongNhan} from '../3d-vector/nhan';
import {emRa, emVaoRa} from '../3d-vector/toan3d';
import {BuocGiai, DuKienGhim} from './kieu';
import {RONG_ND} from './vung';
import {CYAN, HO_PHACH} from './mau_v981';

const CHU_MO = 'rgba(230,237,245,0.78)';

// v99.3: ước lượng bề rộng thực của một mục trên thanh ĐỀ (kể cả khoảng trắng tiếng Việt trong \text{...}) để auto-fit không cắt chữ
export function rongMucDe(tex: string, co: number): number {
  const hien = texSangChu(String(tex || ''));
  return Math.max(rongNhan(tex, co), Math.ceil(Math.max(1, hien.length) * co * 0.62 + 24));
}

export function coChuThanhDe(ds: DuKienGhim[], rongToiDa = RONG_ND - 56): number {
  const muc = ds.slice(0, 6);
  let co = 30;
  const rongHang = (c: number) => 68 + 44 + muc.reduce((s, p) => s + Math.max(rongMucDe(p.nhan, c), p.doi ? rongMucDe(p.doi.nhan, c) : 0) + 28, 0);
  while (co > 16 && rongHang(co) > rongToiDa) co -= 1;
  return co;
}

export const ThanhDe: React.FC<{ds: DuKienGhim[]; buoc: BuocGiai[]; i: number; t: number; cao: number}> = ({ds, buoc, i, t, cao}) => {
  if (!ds.length) return null;
  const muc = ds.slice(0, 6);
  const co = coChuThanhDe(muc);
  const sangCua = (id: string) => {
    const nay = i >= 0 && (buoc[i].du_kien || []).includes(id) ? 1 : 0;
    const truoc = i > 0 && (buoc[i - 1].du_kien || []).includes(id) ? 1 : 0;
    const a = i >= 0 ? emVaoRa((t - buoc[i].t) / 0.35) : 1;
    return truoc + (nay - truoc) * a;
  };
  const caoDai = Math.min(62, cao - 14);
  const maxWMuc = Math.max(180, Math.floor((RONG_ND - 110) / Math.max(1, Math.min(muc.length, 3))));
  return (
    <div style={{position: 'absolute', inset: 0, padding: '4px 8px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible'}}>
      <div style={{minHeight: caoDai, maxWidth: RONG_ND, padding: '6px 26px', borderRadius: Math.ceil(caoDai / 2), display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', rowGap: 4,
        background: 'linear-gradient(90deg, rgba(255,255,255,0.018), rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.018))', boxSizing: 'border-box', overflow: 'visible'}}>
        <span style={{fontFamily: FONT, fontWeight: 800, fontSize: Math.max(16, co - 5), color: 'rgba(230,237,245,0.46)', letterSpacing: 2.5, marginRight: 16, flexShrink: 0}}>ĐỀ</span>
        {muc.map((p, k) => {
          const s = sangCua(p.id);
          const aDoi = p.doi ? emRa((t - p.doi.t) / 0.45) : 0;
          const daDoi = aDoi > 0;
          const mauChu = daDoi ? HO_PHACH : s > 0.5 ? CYAN : CHU_MO;
          const vach = daDoi ? aDoi : s;
          const nay = daDoi ? 1 + 0.10 * Math.sin(Math.PI * Math.min(1, aDoi)) : 1;
          return (
            <React.Fragment key={p.id}>
              {k ? <span style={{width: 5, height: 5, borderRadius: 3, margin: '0 12px', flexShrink: 0, background: 'rgba(56,189,248,0.45)'}} /> : null}
              <div data-du-kien={p.id} {...(p.doi ? {'data-da-doi': aDoi > 0.5 ? '1' : '0'} : {})} style={{position: 'relative', display: 'flex', alignItems: 'center', minHeight: caoDai - 10, padding: '2px 6px', transform: `scale(${nay})`, overflow: 'visible'}}>
                <Toan tex={daDoi && aDoi >= 0.35 ? p.doi!.nhan : p.nhan} size={co} color={mauChu} maxWidth={muc.length === 1 ? RONG_ND - 120 : maxWMuc} style={{fontWeight: daDoi || s > 0.5 ? 800 : 600}} />
                {vach > 0.02 ? <span style={{position: 'absolute', left: '10%', right: '10%', bottom: 3, height: 2, borderRadius: 1, opacity: vach,
                  background: daDoi ? HO_PHACH : CYAN, boxShadow: `0 0 8px ${daDoi ? HO_PHACH : CYAN}88`}} /> : null}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
