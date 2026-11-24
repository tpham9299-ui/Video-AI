// v90 — TẦNG 4: THANH GHIM "ĐỀ". v98.1: bỏ các viên thuốc viền vàng/đỏ -> MỘT dải chữ mảnh trên nền mờ nhẹ, dữ kiện cách nhau
// bằng chấm tròn nhỏ. Bước đang dùng dữ kiện nào thì chữ đó sáng cyan + vạch chân mảnh; ô "x = ?" đổi sang đáp số (hổ phách)
// ĐÚNG mốc chốt (quy tắc chống lộ đáp án giữ nguyên: nội dung ô do khung4tang_v98.che_dap_an_ghim quyết định).
import React from 'react';
import {FONT} from '../theme';
import {Toan} from '../Toan';
import {rongNhan} from '../3d-vector/nhan';
import {emRa, emVaoRa} from '../3d-vector/toan3d';
import {BuocGiai, DuKienGhim} from './kieu';
import {RONG_ND} from './vung';
import {CYAN, HO_PHACH} from './mau_v981';

const CHU_MO = 'rgba(230,237,245,0.78)';

export const ThanhDe: React.FC<{ds: DuKienGhim[]; buoc: BuocGiai[]; i: number; t: number; cao: number}> = ({ds, buoc, i, t, cao}) => {
  if (!ds.length) return null;
  const muc = ds.slice(0, 6);
  // cỡ chữ chung: co lại tới khi cả dải vừa bề rộng (nhãn "ĐỀ" + dữ kiện + chấm ngăn)
  let co = 30;
  const rongHang = (c: number) => 64 + 44 + muc.reduce((s, p) => s + Math.max(rongNhan(p.nhan, c), p.doi ? rongNhan(p.doi.nhan, c) : 0) + 30, 0);
  while (co > 20 && rongHang(co) > RONG_ND - 2 * 24) co -= 1;   // v96: trong vùng an toàn TikTok (phải 12 %)
  const sangCua = (id: string) => {
    const nay = i >= 0 && (buoc[i].du_kien || []).includes(id) ? 1 : 0;
    const truoc = i > 0 && (buoc[i - 1].du_kien || []).includes(id) ? 1 : 0;
    const a = i >= 0 ? emVaoRa((t - buoc[i].t) / 0.35) : 1;
    return truoc + (nay - truoc) * a;
  };
  const caoDai = Math.min(60, cao - 18);
  return (
    <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{height: caoDai, maxWidth: RONG_ND - 8, padding: '0 22px', borderRadius: caoDai / 2, display: 'flex', alignItems: 'center', gap: 0,
        background: 'linear-gradient(90deg, rgba(255,255,255,0.015), rgba(255,255,255,0.045) 50%, rgba(255,255,255,0.015))', boxSizing: 'border-box'}}>
        <span style={{fontFamily: FONT, fontWeight: 800, fontSize: co - 6, color: 'rgba(230,237,245,0.42)', letterSpacing: 2.5, marginRight: 16}}>ĐỀ</span>
        {muc.map((p, k) => {
          const s = sangCua(p.id);
          const aDoi = p.doi ? emRa((t - p.doi.t) / 0.45) : 0;
          const daDoi = aDoi > 0;
          const mauChu = daDoi ? HO_PHACH : s > 0.5 ? CYAN : CHU_MO;
          const vach = daDoi ? aDoi : s;
          const nay = daDoi ? 1 + 0.12 * Math.sin(Math.PI * Math.min(1, aDoi)) : 1;
          return (
            <React.Fragment key={p.id}>
              {k ? <span style={{width: 5, height: 5, borderRadius: 3, margin: '0 13px', flexShrink: 0, background: 'rgba(56,189,248,0.45)'}} /> : null}
              <div data-du-kien={p.id} {...(p.doi ? {'data-da-doi': aDoi > 0.5 ? '1' : '0'} : {})} style={{position: 'relative', display: 'flex', alignItems: 'center', height: caoDai, transform: `scale(${nay})`}}>
                <Toan tex={daDoi && aDoi >= 0.35 ? p.doi!.nhan : p.nhan} size={co} color={mauChu} style={{fontWeight: daDoi || s > 0.5 ? 800 : 600}} />
                {vach > 0.02 ? <span style={{position: 'absolute', left: '12%', right: '12%', bottom: 9, height: 2, borderRadius: 1, opacity: vach,
                  background: daDoi ? HO_PHACH : CYAN, boxShadow: `0 0 8px ${daDoi ? HO_PHACH : CYAN}88`}} /> : null}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
