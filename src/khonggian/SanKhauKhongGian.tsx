// v97 — SÂN KHẤU HÌNH HỌC KHÔNG GIAN (chuẩn thẩm mỹ GeoGebra 3D trên nền tối TikTok): vẽ SVG từ veKhung (hàm thuần của t).
// Lớp: lưới sàn Oxy mờ | nét khuất (đứt) + nét sau kính | mặt kính vàng bán trong suốt | nét thấy (viền tối + quầng hẹp khi
// đang giảng) | ký hiệu góc vuông 3D / cung góc | điểm (điểm chốt phát sáng, điểm khuất rỗng) | nhãn chữ viền tối paint-order.
// Không filter blur, không feTurbulence (giữ tốc độ render Chromium); máy không "thở" (đạo diễn camera khóa góc).
import React, {useMemo} from 'react';
import {FONT} from '../theme';
import {Toan} from '../Toan';
import {KhongGianVao} from './kieu';
import {chuanBi, Lech, MAU_KG, veKhung} from './ve';

const NEN = MAU_KG.nen;

// "A'" -> A′ ; "M_1" -> M + chỉ số dưới
const NhanChu: React.FC<{ten: string; x: number; y: number; mau: string; op: number; co: number}> = ({ten, x, y, mau, op, co}) => {
  const m = /^([A-Z])(?:_?(\d))?('*)$/.exec(ten);
  const chinh = m ? m[1] : ten, chiSo = m ? m[2] : '', phay = m ? m[3].replace(/'/g, '′') : '';
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fill={mau} opacity={op} stroke={NEN} strokeWidth={5.5} strokeLinejoin="round"
      style={{paintOrder: 'stroke', fontFamily: FONT, fontWeight: 800, fontSize: co, letterSpacing: 0.2}} data-nhan-kg={ten}>
      {chinh}
      {chiSo ? <tspan fontSize={co * 0.62} dy={co * 0.22}>{chiSo}</tspan> : null}
      {phay ? <tspan dy={chiSo ? -co * 0.22 : 0}>{phay}</tspan> : null}
    </text>
  );
};

export const SanKhauKhongGian: React.FC<{kg: KhongGianVao; t: number; rong: number; cao: number; lechMay?: Lech}> = ({kg, t, rong, cao, lechMay}) => {
  const cb = useMemo(() => chuanBi(kg, rong, cao), [kg, rong, cao]);
  // nhãn trong vùng an toàn: v98 tầng đặt đối xứng 130..950 -> chỉ chừa 8 px hai mép tầng, cách mép trên/dưới 6 px
  const vung = useMemo(() => ({x0: 8, y0: 6, x1: rong - 8, y1: cao - 6}), [rong, cao]);
  const f = veKhung(kg, cb, t, rong, cao, vung, lechMay);
  const nhip = 0.78 + 0.22 * Math.sin((t * 2 * Math.PI) / 1.8);
  const ve = (lop: 0 | 1) =>
    f.net.filter((n) => n.lop === lop).map((n, i) => {
      const dark = lop === 1 && !n.dut && n.w >= 2.6;
      return (
        <g key={`${lop}-${i}`} opacity={n.op}>
          {dark ? <line x1={n.x1} y1={n.y1} x2={n.x2} y2={n.y2} stroke={NEN} strokeWidth={n.w + 3.2} strokeOpacity={0.6} strokeLinecap="round" /> : null}
          {lop === 1 && n.sang > 0.05 ? <line x1={n.x1} y1={n.y1} x2={n.x2} y2={n.y2} stroke={n.mau} strokeWidth={n.w * 2.6} strokeOpacity={0.17 * n.sang * nhip} strokeLinecap="round" /> : null}
          <line x1={n.x1} y1={n.y1} x2={n.x2} y2={n.y2} stroke={n.mau} strokeWidth={n.w} strokeLinecap={n.dut ? 'butt' : 'round'} strokeDasharray={n.dut ? '9 7' : undefined} />
        </g>
      );
    });
  return (
    <div style={{position: 'absolute', inset: 0}} data-san-khau-kg="1">
      <svg width={rong} height={cao} viewBox={`0 0 ${rong} ${cao}`} style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
        {f.luoi.map((l, i) => <path key={`l${i}`} d={l.d} stroke={MAU_KG.phu} strokeOpacity={l.op} strokeWidth={1} fill="none" />)}
        {/* v98: mặt trước khối Lego tô nhẹ theo ánh sáng (dưới mọi nét) */}
        {f.to.map((m) => <path key={m.id} d={m.d} fill={m.mau} fillOpacity={m.op} stroke="none" />)}
        {ve(0)}
        {f.mat.map((m, i) => (
          <path key={`m${i}`} d={m.d} fill={m.mau} fillOpacity={m.op} stroke={m.mau} strokeOpacity={Math.min(0.9, m.op * (m.bung ? 3 : 2))}
            strokeWidth={m.bung ? 1.8 : 1.6} strokeDasharray={m.bung ? '2 5' : undefined} strokeLinejoin="round" />
        ))}
        {ve(1)}
        {f.mui.map((u, i) => (
          <path key={`u${i}`} d={`M${u.x},${u.y} L${u.x - u.co * Math.cos(u.goc - 0.42)},${u.y - u.co * Math.sin(u.goc - 0.42)} L${u.x - u.co * Math.cos(u.goc + 0.42)},${u.y - u.co * Math.sin(u.goc + 0.42)} Z`}
            fill={u.mau} opacity={u.op} stroke={NEN} strokeWidth={1.2} strokeOpacity={0.6} />
        ))}
        {f.goc.map((g) => (
          <path key={g.id} d={g.d} fill={g.vuong ? g.mau : 'none'} fillOpacity={g.vuong ? 0.12 : 0} stroke={g.mau} strokeOpacity={g.op} strokeWidth={g.vuong ? 1.5 : 1.7}
            strokeLinejoin="round" strokeLinecap="round" opacity={g.op} />
        ))}
        {f.cham.map((c) =>
          c.khuat ? (
            <circle key={c.ten} cx={c.x} cy={c.y} r={c.r * 0.82} fill={NEN} stroke={c.mau} strokeWidth={1.8} opacity={c.op * 0.8} />
          ) : (
            <g key={c.ten} opacity={c.op}>
              {c.sang > 0.05 ? <circle cx={c.x} cy={c.y} r={c.r * (2.4 + 0.8 * nhip)} fill={c.mau} opacity={0.22 * c.sang} /> : null}
              <circle cx={c.x} cy={c.y} r={c.r + 1.6} fill={NEN} opacity={0.7} />
              <circle cx={c.x} cy={c.y} r={c.r} fill={c.mau} />
              <circle cx={c.x} cy={c.y} r={c.r * 0.38} fill="#ffffff" opacity={0.85} />
            </g>
          )
        )}
        {f.nhan.map((n) => {
          const chu = kg.dung.nhanTen?.[n.ten];
          return <NhanChu key={n.ten} ten={chu || n.ten} x={n.x} y={n.y} mau={chu ? (kg.dung.mauDiem?.[n.ten] || n.mau) : n.mau} op={n.op * (n.khuat ? 0.82 : 1)} co={chu && chu.length > 3 ? 25 : 34} />;
        })}
      </svg>
      {/* v98: nhãn tự do — số đo đường gióng (200 m), tên trục x y z, vạch số, hướng; số đọc trực tiếp khi trượt tối ưu */}
      {f.nhanTu.map((x) => (
        <div key={x.id} data-nhan-tu={x.id} {...(x.co < 26 ? {'data-kd-bo': '1'} : {})} style={{position: 'absolute', left: x.x, top: x.y, transform: 'translate(-50%, -50%)', opacity: x.op, whiteSpace: 'nowrap',
          ...(x.id.startsWith('doc_') ? {background: 'rgba(14,16,20,0.86)', border: `1.5px solid ${x.mau}`, borderRadius: 14, padding: '2px 12px 4px'} : {background: 'rgba(14,16,20,0.6)', borderRadius: 8, padding: '0 5px 1px'})}}>
          {x.chu ? <span style={{fontFamily: FONT, fontWeight: 700, fontSize: x.co, color: x.mau}}>{x.tex}</span> : <Toan tex={x.tex} size={x.co} color={x.mau} style={{fontWeight: 700}} />}
        </div>
      ))}
      {f.goc.filter((g) => g.nhan).map((g) => (
        // v97 tinh tế: nhãn góc 50 % (14 px) — cố ý nhỏ -> data-kd-bo để kiểm duyệt bố cục không báo CHU_NHO
        <div key={g.id + 'n'} data-kd-bo="1" style={{position: 'absolute', left: g.nhan!.x, top: g.nhan!.y, transform: 'translate(-50%, -50%)', opacity: g.op, whiteSpace: 'nowrap',
          background: 'rgba(14,16,20,0.72)', borderRadius: 999, padding: '0 4px 1px'}}>
          <Toan tex={g.nhan!.tex} size={22} color={MAU_KG.goc} style={{fontWeight: 700}} />
        </div>
      ))}
    </div>
  );
};
