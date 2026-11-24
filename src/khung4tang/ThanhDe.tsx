// v90 — TẦNG 4: THANH GHIM "ĐỀ". v98.1: bỏ các viên thuốc viền vàng/đỏ -> MỘT dải chữ mảnh trên nền mờ nhẹ, dữ kiện cách nhau
// bằng chấm tròn nhỏ. Bước đang dùng dữ kiện nào thì chữ đó sáng cyan + vạch chân mảnh; ô "x = ?" đổi sang đáp số (hổ phách)
// ĐÚNG mốc chốt (quy tắc chống lộ đáp án giữ nguyên: nội dung ô do khung4tang_v98.che_dap_an_ghim quyết định).
import React from 'react';
import {spring} from 'remotion';
import {FONT} from '../theme';
import {Toan} from '../Toan';
import {rongNhan} from '../3d-vector/nhan';
import {emRa, emVaoRa} from '../3d-vector/toan3d';
import {BuocGiai, DuKienGhim} from './kieu';
import {RONG_ND} from './vung';
import {CYAN, HO_PHACH} from './mau_v981';

const CHU_MO = 'rgba(230,237,245,0.78)';

// Chặn lộ đáp số: ô ghim (hoặc ô khác trùng đúng vế phải với ô đáp số `doi`) chưa tới mốc đổi chỉ được ghi "L = ?"
const gon = (s: string) => s.replace(/\\[,;!:]|\\text\{[^}]*\}|\\mathrm\{[^}]*\}|\\\s|\s/g, '');
const veTrai = (s: string) => (s.includes('=') ? s.slice(0, s.lastIndexOf('=')).trimEnd() : s);
const vePhai = (s: string) => gon(s.includes('=') ? s.slice(s.lastIndexOf('=') + 1) : '');
const nhanAn = (p: DuKienGhim, ds: DuKienGhim[], t: number): string => {
  if (p.doi && t < p.doi.t) return p.nhan.includes('?') || !p.nhan.includes('=') ? p.nhan : `${veTrai(p.nhan)} = ?`;
  const lo = ds.some((q) => q !== p && q.doi && t < q.doi.t && vePhai(q.doi.nhan) !== '' && vePhai(q.doi.nhan) === vePhai(p.nhan) && gon(veTrai(q.doi.nhan)) === gon(veTrai(p.nhan)));
  return lo ? `${veTrai(p.nhan)} = ?` : p.nhan;
};

export const ThanhDe: React.FC<{ds: DuKienGhim[]; buoc: BuocGiai[]; i: number; t: number; cao: number}> = ({ds, buoc, i, t, cao}) => {
  if (!ds.length) return null;
  const muc = ds.slice(0, 6).map((p) => ({...p, nhan: nhanAn(p, ds, t)}));
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
        background: 'linear-gradient(180deg, rgba(34,40,52,0.55), rgba(10,12,18,0.68))', boxSizing: 'border-box',
        boxShadow: '0 8px 22px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.45)'}}>
        <span style={{fontFamily: FONT, fontWeight: 800, fontSize: co - 6, color: 'rgba(230,237,245,0.42)', letterSpacing: 2.5, marginRight: 16}}>ĐỀ</span>
        {muc.map((p, k) => {
          const s = sangCua(p.id);
          const aDoi = p.doi ? emRa((t - p.doi.t) / 0.45) : 0;
          const daDoi = aDoi > 0;
          const mauChu = daDoi ? HO_PHACH : s > 0.5 ? CYAN : CHU_MO;
          const vach = daDoi ? aDoi : s;
          // v99.4: "mở khóa đáp án" — lò xo nảy nhẹ + vệt sáng quét ngang + viền sáng thoáng qua đúng mốc đổi
          const dtDoi = p.doi ? t - p.doi.t : -1;
          const spDoi = daDoi ? spring({frame: Math.max(0, dtDoi * 30), fps: 30, config: {damping: 15, stiffness: 160, mass: 0.7}}) : 0;
          const nay = daDoi ? 1 + 0.14 * Math.sin(Math.PI * Math.min(1, spDoi)) : 1;
          const quet = dtDoi >= 0 && dtDoi < 0.8 ? dtDoi / 0.8 : -1;
          const vienLoe = quet >= 0 ? Math.sin(Math.PI * quet) : 0;
          return (
            <React.Fragment key={p.id}>
              {k ? <span style={{width: 5, height: 5, borderRadius: 3, margin: '0 13px', flexShrink: 0, background: 'rgba(56,189,248,0.45)'}} /> : null}
              <div data-du-kien={p.id} {...(p.doi ? {'data-da-doi': aDoi > 0.5 ? '1' : '0'} : {})} style={{position: 'relative', display: 'flex', alignItems: 'center', height: caoDai, transform: `scale(${nay})`, borderRadius: 10,
                boxShadow: vienLoe > 0.01 ? `0 0 ${18 * vienLoe}px ${HO_PHACH}CC, inset 0 0 0 1.5px ${HO_PHACH}${Math.round(200 * vienLoe).toString(16).padStart(2, '0')}` : undefined}}>
                {quet >= 0 ? <span style={{position: 'absolute', top: 0, bottom: 0, left: `${-10 + 80 * quet}%`, width: '34%', pointerEvents: 'none',
                  background: 'linear-gradient(100deg, rgba(251,191,36,0), rgba(255,236,170,0.85), rgba(251,191,36,0))', opacity: 0.55 * vienLoe + 0.1}} /> : null}
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
