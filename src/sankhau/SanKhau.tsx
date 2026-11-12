// Bộ máy SÂN KHẤU: đặt các vật thật lên khung 960x760, cho chúng xuất hiện/chuyển động theo từng bước lời giảng,
// điều khiển camera (phóng to vào chi tiết quan trọng) và phát âm thanh đúng lúc. Chuyển động lấy cảm hứng từ video mẫu:
// vật bật lên có độ nảy + mờ nhòe khi vào, phần được chọn sáng viền và gắn dấu tích, phần còn lại tối và ngả xám.
import React from 'react';
import {Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {easeOut, kep, neon, popOut} from './donghieu';
import {DuLieuSanKhau, Vat} from './dulieu';
import {GIAY_QUAY, kichThuocVat, tinhCamera, tinhGoc3D, tinhTrangThai, tuXepSanKhau} from './trangthai';
import {MuiTen, VE_VAT} from './vat';
import {expoOut, NhoeHuong} from './chuyendong';

export const SK_W = 960;
export const SK_H = 760;

// Mốc thời gian (giây) của từng bước: trải đều trên phần lời đọc.
export const taoMocBuoc = (soBuoc: number, giayAm: number) => {
  const S = Math.max(1, soBuoc);
  const span = Math.min(Math.max(0.9, giayAm * 0.8), S * 2.4);
  return (b: number) => (b <= 0 ? -100 : 0.12 + ((b - 1) * span) / S);
};

const AM_QUAY: Record<string, string> = {xuc_xac: 'lac', dong_xu: 'xu', vong_quay: 'quay', dong_ho: 'tich', hop_qua: 'mo', cua: 'cua', the_bai: 'lat'};

// Sàn 3D: mặt phẳng lưới phát sáng mờ dần ra xa, chỉ hiện khi camera nghiêng (càng nghiêng càng rõ).
const San3D: React.FC<{mo: number}> = ({mo}) => (
  <div style={{position: 'absolute', left: -420, top: -380, width: SK_W + 840, height: SK_H + 760, opacity: mo, transform: 'translateZ(-2px)',
    background: 'repeating-linear-gradient(0deg, rgba(120,220,255,0.17) 0 2px, transparent 2px 80px), repeating-linear-gradient(90deg, rgba(120,220,255,0.17) 0 2px, transparent 2px 80px)',
    WebkitMaskImage: 'radial-gradient(ellipse 50% 50% at 50% 50%, #000 35%, transparent 75%)', maskImage: 'radial-gradient(ellipse 50% 50% at 50% 50%, #000 35%, transparent 75%)'}}>
    <div style={{position: 'absolute', left: '25%', right: '25%', top: '30%', bottom: '30%', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(59,242,154,0.12), transparent 70%)'}} />
  </div>
);

export const SanKhau: React.FC<{du: DuLieuSanKhau; giayAm: number; amThanh?: boolean}> = ({du, giayAm, amThanh = true}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const tb = taoMocBuoc(du.soBuoc, giayAm);
  // tự xếp chống chồng lấn (đề đa dạng, AI đặt tọa độ chưa khéo vẫn không đè lên nhau)
  const vatXep = React.useMemo(() => tuXepSanKhau(du.vat, SK_W, SK_H), [du]);
  const cam = tinhCamera(du.hanhDong, vatXep, t, tb, SK_W, SK_H);
  // góc nhìn 3D: nghiêng sàn + xoay quanh trục đứng; vật luôn quay mặt về camera (billboard) và đứng trên sàn có bóng đổ
  const g3 = tinhGoc3D(du.gocDau, du.hanhDong, t, tb);
  const co3d = g3.nghieng > 0.3 || Math.abs(g3.xoay) > 0.3;
  const sinN = Math.sin((g3.nghieng * Math.PI) / 180);
  const bong: React.ReactNode[] = [];
  const viTri = new Map<string, {x: number; y: number}>();

  const lop: React.ReactNode[] = [];
  const muiTen: React.ReactNode[] = [];
  const thuTu = (v: Vat) => (v.loai === 'nhan' || v.loai === 'mui_ten' ? 2 : v.loai === 'chu' || v.loai === 'so_dem' ? 1 : 0);
  const dsVat = [...vatXep].sort((a, b) => thuTu(a) - thuTu(b));

  for (const v of dsVat) {
    const st = tinhTrangThai(v, du.hanhDong, t, tb, SK_W, SK_H);
    const x = (v.x / 100) * SK_W + st.dx;
    const y = (v.y / 100) * SK_H + st.dy;
    viTri.set(v.id, {x, y});
    if (v.loai === 'mui_ten') continue;
    if (t < st.ta && v.buoc > 0) continue;
    const ve = VE_VAT[v.loai];
    if (!ve) continue;
    const a = st.vao;
    const lech = v.tuHuong ? (1 - expoOut(a)) * 560 : 0;
    const ox = v.tuHuong === 'trai' ? -lech : v.tuHuong === 'phai' ? lech : 0;
    const oy = v.tuHuong === 'tren' ? -lech : v.tuHuong === 'duoi' ? lech : 0;
    const nhom = v.soLuong > 1 && ['nguoi', 'the', 'cua', 'banh', 'the_bai', 'xuc_xac', 'dong_xu', 'bieu_tuong'].includes(v.loai);
    // vật đơn: bật lên + mờ nhòe; vật nhóm: từng phần tử tự bật lần lượt nên khung chỉ hiện mờ dần
    const sc = nhom ? 1 : popOut(a);
    const mo = (nhom ? kep(a * 3) : kep(a * 2.2)) * (1 - st.an);
    const nhoe = (1 - kep(a * 1.6)) * 14 + st.an * 12;
    const sangNhip = st.sang > 0 ? 1 + 0.06 * st.sang : 1;
    const ngang = v.tuHuong === 'trai' || v.tuHuong === 'phai';
    const nhoeHuong = v.tuHuong ? (1 - expoOut(a)) * 34 : 0;
    const kt = kichThuocVat(v);
    const dung = co3d ? `rotateZ(${-g3.xoay}deg) rotateX(${-g3.nghieng}deg) translateY(${-kt.h * 0.62 * sinN}px) ` : '';
    if (co3d && kt.w > 0) {
      bong.push(
        <div key={`b${v.id}`} style={{position: 'absolute', left: x - kt.w * 0.4, top: y - kt.w * 0.12, width: kt.w * 0.8, height: kt.w * 0.24, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0) 70%)', opacity: sinN * mo, transform: 'translateZ(1px)'}} />
      );
    }
    lop.push(
      <NhoeHuong
        key={v.id}
        nx={ngang ? nhoeHuong : 0}
        ny={v.tuHuong && !ngang ? nhoeHuong : 0}
        style={{
          position: 'absolute',
          left: x,
          top: y,
          transform: `translate(-50%, -50%) ${dung}translate(${ox + st.rung}px, ${oy}px) scale(${sc * sangNhip * (1 - 0.3 * st.an)})`,
          opacity: mo,
          filter: !v.tuHuong && nhoe > 0.3 ? `blur(${nhoe}px)` : undefined,
        }}
      >
        {ve(v, st, frame, fps)}
      </NhoeHuong>
    );
  }

  // Manim "Flash": tia sáng ngắn bắn ra từ tâm vật lúc vật vừa xuất hiện (chỉ vật thật, không áp cho chữ/nhãn)
  const tia: React.ReactNode[] = [];
  for (const v of vatXep) {
    if (v.buoc <= 0 || ['mui_ten', 'chu', 'nhan', 'bieu_tuong'].includes(v.loai)) continue;
    const ta = tb(v.buoc);
    const p = (t - ta - 0.12) / 0.55;
    if (p <= 0 || p >= 1) continue;
    const vt = viTri.get(v.id);
    if (!vt) continue;
    const mau = neon(v.mau, neon('xanh_la'));
    const R = 150 * v.co + 40;
    const e = easeOut(p);
    tia.push(
      <svg key={`tia${v.id}`} style={{position: 'absolute', left: vt.x, top: vt.y, overflow: 'visible', pointerEvents: 'none'}} width={1} height={1}>
        {Array.from({length: 12}, (_, i) => {
          const g = (i / 12) * Math.PI * 2;
          const r1 = R * (0.55 + 0.6 * e);
          const r2 = r1 + 34 * (1 - e) + 6;
          return <line key={i} x1={Math.cos(g) * r1} y1={Math.sin(g) * r1} x2={Math.cos(g) * r2} y2={Math.sin(g) * r2} stroke={mau} strokeWidth={6 * (1 - e) + 1} strokeLinecap="round" opacity={1 - e} style={{filter: `drop-shadow(0 0 6px ${mau})`}} />;
        })}
        <circle r={R * (0.4 + 0.9 * e)} fill="none" stroke={mau} strokeWidth={4 * (1 - e)} opacity={0.6 * (1 - e)} />
      </svg>
    );
  }

  for (const v of vatXep) {
    if (v.loai !== 'mui_ten') continue;
    const ta = tb(v.buoc);
    if (t < ta && v.buoc > 0) continue;
    const a = viTri.get(v.tu);
    const b = viTri.get(v.den);
    const x1 = a ? a.x : (v.x / 100) * SK_W;
    const y1 = a ? a.y : (v.y / 100) * SK_H;
    const x2 = b ? b.x : (v.x2 / 100) * SK_W;
    const y2 = b ? b.y : (v.y2 / 100) * SK_H;
    // rút ngắn hai đầu để mũi tên không đè lên vật
    const L = Math.hypot(x2 - x1, y2 - y1) || 1;
    const cat = Math.min(L * 0.3, a || b ? 110 : 0);
    const ux = (x2 - x1) / L;
    const uy = (y2 - y1) / L;
    muiTen.push(
      <MuiTen key={v.id} x1={x1 + ux * (a ? cat : 0)} y1={y1 + uy * (a ? cat : 0)} x2={x2 - ux * (b ? cat : 0)} y2={y2 - uy * (b ? cat : 0)} p={v.buoc <= 0 ? 1 : kep((t - ta) / 0.8)} mau={neon(v.mau, neon('cam'))} nhan={v.nhan} />
    );
  }

  // âm thanh theo sự kiện
  const am: {f: number; tep: string; vol: number}[] = [];
  if (amThanh) {
    du.vat.forEach((v) => {
      if (v.buoc > 0) am.push({f: Math.round(tb(v.buoc) * fps), tep: v.loai === 'nhan' ? 'swoosh' : v.loai === 'so_dem' ? 'tang' : 'pop', vol: 0.22});
    });
    du.hanhDong.forEach((h) => {
      if (h.buoc <= 0) return;
      const f = Math.round(tb(h.buoc) * fps);
      const v = du.vat.find((x) => x.id === h.vat);
      const tep =
        h.kieu === 'chon' ? 'ding' : h.kieu === 'loai_bo' || h.kieu === 'rung' ? 'sai' : h.kieu === 'quay' || h.kieu === 'mo' ? AM_QUAY[v ? v.loai : ''] || 'whoosh'
          : h.kieu === 'lay_ra' ? 'pop' : h.kieu === 'dat_gia_tri' ? 'tang' : h.kieu === 'bung_ra' ? 'whoosh' : h.kieu === 'phong_to' || h.kieu === 'thu_nho' || h.kieu === 'goc_3d' ? 'zoom' : h.kieu === 'sang' ? 'ting' : '';
      if (tep) am.push({f, tep, vol: tep === 'ding' ? 0.35 : tep === 'quay' ? 0.4 : 0.3});
    });
  }
  // gộp các tiếng trùng khung hình
  const daCo = new Set<string>();
  const amGon = am.filter((x) => {
    const k = `${x.f}-${x.tep}`;
    if (daCo.has(k)) return false;
    daCo.add(k);
    return x.f >= 0;
  });

  const z = cam.z;
  return (
    <div style={{position: 'relative', width: SK_W, height: SK_H, overflow: z > 1.01 ? 'hidden' : 'visible'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: SK_W, height: SK_H, transformOrigin: '0 0', transform: `translate(${SK_W / 2}px, ${SK_H / 2}px) scale(${z}) translate(${-cam.cx}px, ${-cam.cy}px)`}}>
        <div style={{position: 'absolute', inset: 0, perspective: 1500, perspectiveOrigin: '50% 25%'}}>
          <div style={{position: 'absolute', inset: 0, transformStyle: 'preserve-3d', transform: co3d ? `rotateX(${g3.nghieng}deg) rotateZ(${g3.xoay}deg)` : undefined}}>
            {co3d ? <San3D mo={sinN} /> : null}
            {bong}
            {muiTen}
            {tia}
            {lop}
          </div>
        </div>
      </div>
      {amGon.map((x, i) => (
        <Sequence key={i} from={x.f} durationInFrames={Math.round((GIAY_QUAY.vong_quay + 0.5) * fps)} layout="none">
          <Audio src={staticFile(`sfx/${x.tep}.wav`)} volume={x.vol} />
        </Sequence>
      ))}
    </div>
  );
};
