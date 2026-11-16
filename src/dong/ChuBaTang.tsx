import React from 'react';
import {useCurrentFrame} from 'remotion';
import {expoOut} from '../sankhau/chuyendong';
import {kep} from '../sankhau/donghieu';
import {FONT_DAM} from '../theme';
import {toiMau} from './KhongGian';

// CHỮ 3 TẦNG (học từ các video motion typography): dòng dẫn nhỏ chữ nghiêng có chân -> TỪ CHỐT cực lớn màu nhấn -> dòng đuôi vừa.
// Từng ký tự hiện từ mờ sang nét (blur-in) lần lượt; từ chốt đáp xuống hơi to rồi thu về, gạch mảnh quét dưới chân.

// Tách câu thành 3 tầng theo cụm từ khóa: phần trước = dẫn, cụm khóa = chốt, phần sau = đuôi.
export function tachBaTang(cau: string, khoa: string | string[]): {dan: string; chot: string; duoi: string} {
  const s = (cau || '').replace(/\s+/g, ' ').trim();
  const ds = (Array.isArray(khoa) ? khoa : [khoa]).map((k) => (k || '').trim()).filter(Boolean);
  for (const k of ds) {
    const i = s.toLowerCase().indexOf(k.toLowerCase());
    if (i >= 0) return {dan: s.slice(0, i).trim().replace(/[:,]$/, (m) => m), chot: s.slice(i, i + k.length), duoi: s.slice(i + k.length).trim()};
  }
  return {dan: '', chot: '', duoi: s};
}

// Nhịp (khung hình, tính từ lúc bắt đầu) của 3 tầng: dùng chung cho máy quay "đập zoom" đúng lúc từ chốt đáp xuống.
export function nhipBaTang(dan: string, chot: string) {
  const batChot = dan ? Math.min(16, 3 + dan.length * 0.7) : 2;
  const xongChot = batChot + chot.replace(/\s/g, '').length * 1.3 + 9;
  return {batChot, xongChot, batDuoi: chot ? xongChot - 5 : 2};
}

export function coChuChot(chot: string, toiDa = 118) {
  const n = chot.length;
  return Math.max(64, Math.min(toiDa, Math.floor(960 / (0.72 * Math.max(1, n)))));
}

const KyTu: React.FC<{c: string; p: number; nhoe: number; dy: number; s?: number}> = ({c, p, nhoe, dy, s = 1}) => (
  <span style={{display: 'inline-block', opacity: kep(p * 1.6), transform: `translateY(${(1 - p) * dy}px) scale(${1 + (s - 1) * (1 - p)})`, filter: p < 0.99 ? `blur(${(1 - p) * nhoe}px)` : undefined, whiteSpace: 'pre'}}>{c}</span>
);

// hiện từng ký tự; giữ nguyên từng từ trên một dòng (không bẻ giữa từ)
const DongChu: React.FC<{chu: string; f: number; tre: number; cham: number; dai: number; nhoe: number; dy: number; s?: number}> = ({chu, f, tre, cham, dai, nhoe, dy, s}) => {
  let k = 0;
  return (
    <>
      {chu.split(' ').map((w, wi) => (
        <React.Fragment key={wi}>
          {wi > 0 ? ' ' : null}
          <span style={{display: 'inline-block', whiteSpace: 'nowrap'}}>
            {Array.from(w).map((c, ci) => {
              const p = expoOut(kep((f - tre - (k++) * cham) / dai));
              return <KyTu key={ci} c={c} p={p} nhoe={nhoe} dy={dy} s={s} />;
            })}
          </span>
        </React.Fragment>
      ))}
    </>
  );
};

export const ChuBaTang: React.FC<{dan: string; chot: string; duoi: string; mau: string; tre?: number; coToiDa?: number; inHoa?: boolean; noi?: boolean}> = ({dan, chot, duoi, mau, tre = 0, coToiDa = 118, inHoa = true, noi = false}) => {
  const f = useCurrentFrame() - tre;
  const {batChot, xongChot, batDuoi} = nhipBaTang(dan, chot);
  const chotHien = inHoa ? chot.toUpperCase() : chot;
  const co = coChuChot(chotHien, coToiDa);
  const gach = expoOut(kep((f - xongChot + 2) / 12));
  // chỉ có một tầng (không tìm được từ khóa): cả câu cỡ vừa-lớn
  const coDuoi = chot ? 44 : Math.min(76, Math.floor(1700 / Math.max(10, duoi.length)));
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 6, maxWidth: 1000}}>
      {dan ? (
        <div style={{fontFamily: FONT_DAM, fontWeight: 700, fontStyle: 'italic', fontSize: 38, color: 'rgba(255,255,255,0.86)', textShadow: '0 3px 18px rgba(0,0,0,0.7)', lineHeight: 1.1}}>
          <DongChu chu={dan} f={f} tre={0} cham={0.7} dai={8} nhoe={8} dy={14} />
        </div>
      ) : null}
      {chot ? (
        <div style={{position: 'relative', fontFamily: FONT_DAM, fontWeight: 900, fontSize: co, lineHeight: 1.12, color: mau, letterSpacing: -1, padding: '0 6px',
          // chữ NỔI KHỐI 3D (hook, đáp án): các lớp bóng đặc xếp chồng tạo bề dày + nghiêng phối cảnh đung đưa
          textShadow: noi ? Array.from({length: 9}, (_, i) => `0 ${(i + 1) * co * 0.017}px 0 ${toiMau(mau, 0.62 - i * 0.045)}`).join(', ') + `, 0 ${co * 0.2}px ${co * 0.3}px rgba(0,0,0,0.65)` : `0 6px 30px rgba(0,0,0,0.65), 0 0 34px ${mau}44`,
          transform: noi ? `perspective(900px) rotateX(${12 + 2 * Math.sin(f / 37)}deg) rotateY(${5 * Math.sin(f / 29)}deg)` : undefined}}>
          <DongChu chu={chotHien} f={f} tre={batChot} cham={1.3} dai={10} nhoe={16} dy={-co * 0.25} s={1.35} />
          <div style={{position: 'absolute', left: '50%', bottom: -2, height: 5, width: `${gach * 70}%`, transform: 'translateX(-50%)', borderRadius: 3, background: `linear-gradient(90deg, transparent, ${mau}, transparent)`, opacity: 0.9, boxShadow: `0 0 12px ${mau}`}} />
        </div>
      ) : null}
      {duoi ? (
        <div style={{fontFamily: FONT_DAM, fontWeight: 800, fontSize: coDuoi, color: '#fff', textShadow: '0 4px 20px rgba(0,0,0,0.7)', lineHeight: 1.15, marginTop: chot ? 4 : 0}}>
          <DongChu chu={duoi} f={f} tre={batDuoi} cham={chot ? 0.55 : 0.9} dai={9} nhoe={10} dy={22} />
        </div>
      ) : null}
    </div>
  );
};
