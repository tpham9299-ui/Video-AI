// v97 — SÂN KHẤU HÌNH HỌC KHÔNG GIAN (chuẩn thẩm mỹ GeoGebra 3D trên nền tối TikTok): vẽ SVG từ veKhung (hàm thuần của t).
// Lớp: lưới sàn Oxy mờ | nét khuất (đứt) + nét sau kính | mặt kính vàng bán trong suốt | nét thấy (viền tối + quầng hẹp khi
// đang giảng) | ký hiệu góc vuông 3D / cung góc | điểm (điểm chốt phát sáng, điểm khuất rỗng) | nhãn chữ viền tối paint-order.
// Không filter blur, không feTurbulence (giữ tốc độ render Chromium); máy không "thở" (đạo diễn camera khóa góc).
import React, {useMemo} from 'react';
import {FONT} from '../theme';
import {Toan} from '../Toan';
import {KhongGianVao} from './kieu';
import {chuanBi, Lech, MAU_KG, veKhung} from './ve';
import {DO_TO_MAT_PHANG_KG} from '../khung4tang/cauHinhTinhChinh';
import {CO_NHAN} from './nhan';

const NEN = MAU_KG.nen;

// "A'" -> A′ ; "M_1" -> M + chỉ số dưới
const NhanChu: React.FC<{ten: string; x: number; y: number; mau: string; op: number; co: number}> = ({ten, x, y, mau, op, co}) => {
  const m = /^([A-Z])(?:_?(\d))?('*)$/.exec(ten);
  const chinh = m ? m[1] : ten, chiSo = m ? m[2] : '', phay = m ? m[3].replace(/'/g, '′') : '';
  const rong = co * 0.62 * (chinh.length + (chiSo ? 0.6 : 0) + (phay ? 0.4 : 0)) + 12, cao = co + 4;
  return (
    <g opacity={op}>
      {/* v101.2: viên tối đặc phía sau nhãn -> độ tương phản cao, không bị nét xuyên qua */}
      <rect x={x - rong / 2} y={y - cao / 2} width={rong} height={cao} rx={cao / 2} fill={NEN} fillOpacity={0.74} />
      <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fill={mau} stroke={NEN} strokeWidth={4.5} strokeLinejoin="round"
        style={{paintOrder: 'stroke', fontFamily: FONT, fontWeight: 800, fontSize: co, letterSpacing: 0.2}} data-nhan-kg={ten}>
        {chinh}
        {chiSo ? <tspan fontSize={co * 0.62} dy={co * 0.22}>{chiSo}</tspan> : null}
        {phay ? <tspan dy={chiSo ? -co * 0.22 : 0}>{phay}</tspan> : null}
      </text>
    </g>
  );
};

export const SanKhauKhongGian: React.FC<{kg: KhongGianVao; t: number; rong: number; cao: number; lechMay?: Lech}> = ({kg, t, rong, cao, lechMay}) => {
  const cb = useMemo(() => chuanBi(kg, rong, cao), [kg, rong, cao]);
  // nhãn trong vùng an toàn: v98 tầng đặt đối xứng 130..950 -> chỉ chừa 8 px hai mép tầng, cách mép trên/dưới 6 px
  const vung = useMemo(() => ({x0: 8, y0: 6, x1: rong - 8, y1: cao - 6}), [rong, cao]);
  const f = veKhung(kg, cb, t, rong, cao, vung, lechMay);
  const nhip = 0.78 + 0.22 * Math.sin((t * 2 * Math.PI) / 1.8);
  // v102: đoạn trọng tâm có viền tối phía sau dày hơn nét >= 2,5 px (không blur) để cắt nổi qua mặt phẳng đang tô; cạnh khuất khung chính nét đứt 8 6
  const ve = (lop: 0 | 1) =>
    f.net.filter((n) => n.lop === lop).map((n, i) => {
      const tam = n.tang === 'tam';
      const dark = lop === 1 && !n.dut && n.w >= 2.2;
      const vienDay = tam ? n.w + 5.5 : n.w + 3.2;
      return (
        <g key={`${lop}-${i}`} opacity={n.op}>
          {dark ? <line x1={n.x1} y1={n.y1} x2={n.x2} y2={n.y2} stroke={NEN} strokeWidth={vienDay} strokeOpacity={tam ? 0.88 : 0.6} strokeLinecap="round" /> : null}
          {lop === 1 && n.sang > 0.05 ? <line x1={n.x1} y1={n.y1} x2={n.x2} y2={n.y2} stroke={n.mau} strokeWidth={n.w * 2.6} strokeOpacity={0.17 * n.sang * nhip} strokeLinecap="round" /> : null}
          <line x1={n.x1} y1={n.y1} x2={n.x2} y2={n.y2} stroke={n.mau} strokeWidth={n.w} strokeLinecap={n.dut ? 'butt' : 'round'} strokeDasharray={n.dut ? (n.tang === 'khung' ? '8 6' : '7 5') : undefined} />
        </g>
      );
    });
  // v102: tô mặt phẳng phụ 0,16–0,20 (0,12–0,15 khi >= 2 mặt cùng chồng nhau) để không che mờ cạnh / điểm bên trong
  const nMat = f.mat.filter((m) => !m.san && !m.bung && (m.act || 0) + m.op > 0.12).length;
  const tranTo = nMat >= 2 ? 0.14 : 0.19;
  return (
    <div style={{position: 'absolute', inset: 0}} data-san-khau-kg="1">
      <svg width={rong} height={cao} viewBox={`0 0 ${rong} ${cao}`} style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
        {f.luoi.map((l, i) => <path key={`l${i}`} d={l.d} stroke={MAU_KG.phu} strokeOpacity={l.op} strokeWidth={1} fill="none" />)}
        {/* v98: mặt trước khối Lego tô nhẹ theo ánh sáng (dưới mọi nét) */}
        {f.to.map((m) => <path key={m.id} d={m.d} fill={m.mau} fillOpacity={m.op} stroke="none" />)}
        {ve(0)}
        {f.mat.map((m, i) => {
          // v101.2: mặt phẳng đang giảng — viền hổ phách dày 3,2–3,8 px, tô rõ 0,22–0,26, dải sáng nghiêng quét 1 lượt theo clipPath
          const act = m.act || 0, fade = Math.min(1, m.op / 0.2), id = 'kgq' + m.id.replace(/[^\w]/g, '_') + i;
          const fo = m.san ? m.op : Math.min(tranTo, m.op + (DO_TO_MAT_PHANG_KG * fade - m.op) * act);
          const so = Math.min(0.9, m.op * (m.bung ? 3 : 2)) * (1 - act) + 0.95 * fade * act;
          const sw = (m.bung ? 1.8 : 1.6) * (1 - act) + 3.3 * act;
          const [bx0, by0, bx1, by1] = m.bb || [0, 0, 0, 0];
          const q = m.quet ?? -1, bw = bx1 - bx0, bh = by1 - by0, dai = bh * 0.5 + 0.3 * bw;
          const xq = bx0 - dai + (bw + 2 * dai) * q, bro = 0.3 * bw + 20;
          return (
            <g key={`m${i}`}>
              <path d={m.d} fill={m.mau} fillOpacity={fo} stroke={act > 0.05 ? '#FBBF24' : m.mau} strokeOpacity={so} strokeWidth={sw}
                strokeDasharray={m.bung && act < 0.05 ? '2 5' : undefined} strokeLinejoin="round" />
              {q > 0 && q < 1 ? (
                <>
                  <clipPath id={id}><path d={m.d} /></clipPath>
                  <g clipPath={`url(#${id})`}>
                    <polygon points={`${xq},${by0 - 4} ${xq + bro},${by0 - 4} ${xq + bro - dai},${by1 + 4} ${xq - dai},${by1 + 4}`} fill="#FFFFFF" fillOpacity={0.32 * Math.sin(Math.PI * q) * fade} />
                  </g>
                </>
              ) : null}
            </g>
          );
        })}
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
              {/* v101.2: 2 vòng sóng đồng tâm lan tỏa ~18 frame khi điểm vừa xuất hiện */}
              {(c.song ?? -1) > 0 ? [0, 0.25].map((lech) => {
                const q = (c.song! - lech) / (1 - lech);
                return q > 0 && q < 1 ? <circle key={lech} cx={c.x} cy={c.y} r={c.r * (1.3 + 4.6 * q)} fill="none" stroke={c.mau} strokeWidth={0.8 + 2.4 * (1 - q)} strokeOpacity={0.85 * (1 - q)} /> : null;
              }) : null}
              {c.sang > 0.05 ?<circle cx={c.x} cy={c.y} r={c.r * (2.4 + 0.8 * nhip)} fill={c.mau} opacity={0.22 * c.sang} /> : null}
              <circle cx={c.x} cy={c.y} r={c.r + 1.6} fill={NEN} opacity={0.7} />
              <circle cx={c.x} cy={c.y} r={c.r} fill={c.mau} />
              <circle cx={c.x} cy={c.y} r={c.r * 0.38} fill="#ffffff" opacity={0.85} />
            </g>
          )
        )}
        {f.nhan.map((n) => {
          const chu = kg.dung.nhanTen?.[n.ten];
          return <NhanChu key={n.ten} ten={chu || n.ten} x={n.x} y={n.y} mau={chu ? (kg.dung.mauDiem?.[n.ten] || n.mau) : n.mau} op={n.op * (n.khuat ? 0.82 : 1)} co={chu && chu.length > 3 ? Math.round(CO_NHAN * 0.86) : CO_NHAN} />;
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
