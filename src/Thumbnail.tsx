// v99.7 — ẢNH BÌA TỰ ĐỘNG (Remotion <Still id="Thumbnail">, 1080x1920): huy hiệu dạng bài + tiêu đề lớn + hình minh họa dạng bài kèm dấu "?".
// Dùng chung schema Props với Video; nền = theme khí quyển của bài (props.khung4tang.theme). Không blur / filter nặng.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {FONT} from './theme';
import {Props} from './types';
import {AN_TOAN} from './khung4tang/vung';
import {CHU_CHINH, layTheme, THEME_V99} from './khung4tang/nen_v99';

type Dang = 'parabol' | 'xac_suat' | 'hinh_hoc' | 'chung';
const nhanDang = (s: string): {dang: Dang; nhan: string} => {
  const x = s.toLowerCase();
  if (/parabol|bậc hai|bac hai|cổng|cong|vòm|vom/.test(x)) return {dang: 'parabol', nhan: 'PARABOL'};
  if (/xác suất|xac suat|bayes|tổ hợp|to hop/.test(x)) return {dang: 'xac_suat', nhan: 'XÁC SUẤT'};
  if (/hình|hinh|tam giác|đường tròn|khối|chóp|lăng trụ/.test(x)) return {dang: 'hinh_hoc', nhan: 'HÌNH HỌC'};
  return {dang: 'chung', nhan: (s || 'TOÁN THỰC TẾ').toUpperCase()};
};

const HinhMinhHoa: React.FC<{dang: Dang; net: string; nhan: string}> = ({dang, net, nhan}) => (
  <svg viewBox="0 0 700 560" width={700} height={560} style={{position: 'absolute', inset: 0}}>
    <g fill="none" stroke={net} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" opacity={0.85}>
      {dang === 'parabol' ? <><path d="M60 500 H640 M350 40 V500" strokeWidth={2.5} opacity={0.5} /><path d="M110 120 Q350 760 590 120" /><circle cx={350} cy={440} r={9} fill={nhan} stroke="none" /></> : null}
      {dang === 'xac_suat' ? <><path d="M350 60 L170 260 M350 60 L530 260 M170 260 L90 440 M170 260 L250 440 M530 260 L450 440 M530 260 L610 440" /><circle cx={350} cy={60} r={20} fill={nhan} stroke="none" /><circle cx={170} cy={260} r={16} fill={net} stroke="none" /><circle cx={530} cy={260} r={16} fill={net} stroke="none" /></> : null}
      {dang === 'hinh_hoc' ? <><path d="M350 70 L120 470 H580 Z" /><path d="M350 70 L350 470" strokeDasharray="14 12" /><path d="M120 470 L350 330 L580 470" strokeDasharray="14 12" opacity={0.6} /></> : null}
      {dang === 'chung' ? <><rect x={120} y={110} width={460} height={340} rx={36} /><path d="M120 360 L260 250 L360 320 L580 150" /></> : null}
    </g>
  </svg>
);

export const Thumbnail: React.FC<Props> = (props) => {
  const th = layTheme(props.khung4tang?.theme) || THEME_V99.deep_ocean;
  const tieuDe = String(props.bia?.tieuDe || props.hookChu || props.tieuDe || '').toUpperCase().replace(/\s+/g, ' ').trim();
  const {dang, nhan} = nhanDang(`${props.bia?.loai || ''} ${props.bia?.tieuDe || ''} ${props.tieuDe || ''}`);
  const nhanMau = th.ten === 'emerald_studio' || th.ten === 'warm_slate' ? '#F2C14E' : '#3FD0E0';
  const co = tieuDe.length > 46 ? 74 : tieuDe.length > 32 ? 88 : tieuDe.length > 20 ? 102 : 116;
  const rong = AN_TOAN.x1 - AN_TOAN.x0;
  return (
    <AbsoluteFill style={{fontFamily: FONT, overflow: 'hidden', background: `linear-gradient(180deg, ${th.tren} 0%, ${th.giua} 52%, ${th.duoi} 100%)`}}>
      <AbsoluteFill style={{background: `radial-gradient(ellipse 80% 40% at 50% 52%, ${th.quang}${Math.round(th.quangMo * 255 * 1.6).toString(16).padStart(2, '0')} 0%, transparent 70%)`}} />
      {/* vùng an toàn: x 130..950, y 212..1574 */}
      <div style={{position: 'absolute', left: AN_TOAN.x0, width: rong, top: AN_TOAN.y0, height: AN_TOAN.y1 - AN_TOAN.y0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between'}}>
        <div style={{background: nhanMau, color: '#06121A', borderRadius: 18, padding: '8px 30px', fontSize: 54, fontWeight: 900, letterSpacing: 2}}>
          {nhan}{props.lop ? ` · LỚP ${props.lop}` : ''}
        </div>
        <div style={{width: '100%', textAlign: 'center', color: CHU_CHINH, fontSize: co, fontWeight: 900, lineHeight: 1.12, textWrap: 'balance' as never, textShadow: '0 4px 0 rgba(3,8,14,0.9)'}}>{tieuDe}</div>
        <div style={{position: 'relative', width: 700, height: 560}}>
          <HinhMinhHoa dang={dang} net={th.net} nhan={nhanMau} />
          <div style={{position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <div style={{width: 230, height: 230, borderRadius: 115, background: nhanMau, color: '#06121A', fontSize: 190, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 0 14px ${nhanMau}40`}}>?</div>
          </div>
        </div>
        <div style={{color: CHU_CHINH, fontSize: 46, fontWeight: 800, opacity: 0.9}}>BẠN GIẢI ĐƯỢC KHÔNG?</div>
      </div>
    </AbsoluteFill>
  );
};
