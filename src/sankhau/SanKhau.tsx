// Bộ máy SÂN KHẤU: đặt các vật thật lên khung 960x760, cho chúng xuất hiện/chuyển động theo từng bước lời giảng,
// điều khiển camera (phóng to vào chi tiết quan trọng) và phát âm thanh đúng lúc. Chuyển động lấy cảm hứng từ video mẫu:
// vật bật lên có độ nảy + mờ nhòe khi vào, phần được chọn sáng viền và gắn dấu tích, phần còn lại tối và ngả xám.
import React from 'react';
import {Audio, continueRender, delayRender, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {easeOut, kep, neon, popOut} from './donghieu';
import {DuLieuSanKhau, Vat} from './dulieu';
import {DoThat, GIAY_QUAY, kichThuocVat, tinhCamera, tinhGoc3D, tinhTrangThai, tuXepSanKhau} from './trangthai';
import {datHeSoChu, MuiTen, VE_VAT} from './vat';
import {CoChuSan} from '../dong/KhongGian';
import {expoOut, NhoeHuong} from './chuyendong';
import {Cam3D, chieu, Goc3D} from './chieu3d';
import {laMoi} from '../theme';
import {LopHinh} from './hinhtudo';

export const SK_W = 960;
export const SK_H = 760;

// Mốc thời gian (giây) của từng bước: trải đều trên phần lời đọc.
export const taoMocBuoc = (soBuoc: number, giayAm: number) => {
  const S = Math.max(1, soBuoc);
  const span = Math.min(Math.max(0.9, giayAm * 0.8), S * 2.4);
  return (b: number) => (b <= 0 ? -100 : 0.12 + ((b - 1) * span) / S);
};

// Mốc bước KHỚP LỜI CHÍNH XÁC: mỗi bước buoc=1..S bám trực tiếp vào thời điểm bắt đầu câu/mệnh đề tương ứng trong giọng đọc (cau[k].bat)
// giúp từng phần của hình minh họa (vật, đường đo, góc, nhãn) bật sáng đúng khoảnh khắc giọng đọc vừa nhắc tới (như video mẫu Anh Shiper Toán).
export const taoMocBuocLoi = (soBuoc: number, giayAm: number, cau: {text: string; bat: number; ket: number}[]) => {
  const goc = taoMocBuoc(soBuoc, giayAm);
  const S = Math.max(1, soBuoc);
  if (!cau || !cau.length) return goc;
  // Tạo danh sách các mốc mệnh đề từ các câu thoại
  const neo: number[] = [];
  cau.forEach((c) => {
    neo.push(c.bat);
    const tu = c.text.split(/\s+/).filter(Boolean);
    if (tu.length >= 7) {
      neo.push(c.bat + (c.ket - c.bat) * 0.5);
    }
  });
  const moc: number[] = [];
  for (let b = 1; b <= S; b++) {
    let tot = goc(b);
    if (b === 1) {
      tot = Math.min(0.12, cau[0].bat);
    } else if (neo.length >= S) {
      const idx = Math.min(neo.length - 1, Math.floor(((b - 1) * neo.length) / S));
      tot = neo[idx];
    } else {
      let gan = neo[0];
      for (const n of neo) if (Math.abs(n - tot) < Math.abs(gan - tot)) gan = n;
      if (Math.abs(gan - tot) <= 0.9) tot = gan;
    }
    if (moc.length) tot = Math.max(tot, moc[moc.length - 1] + 0.32);
    moc.push(tot);
  }
  return (b: number) => (b <= 0 ? -100 : b <= S ? moc[b - 1] : goc(b));
};

const AM_QUAY: Record<string, string> = {xuc_xac: 'lac', dong_xu: 'xu', vong_quay: 'quay', dong_ho: 'tich', hop_qua: 'mo', cua: 'cua', the_bai: 'lat'};

const TIA_GOC = Array.from({length: 12}, (_, i) => {
  const g = (i / 12) * Math.PI * 2;
  return [Math.cos(g), Math.sin(g)] as const;
});

// Sàn 3D: lưới chiếu phối cảnh trải rộng ra ngoài sân khấu (phủ toàn khung hình), mờ dần về phía xa; chỉ hiện khi camera nghiêng.
const San3D: React.FC<{cam: Cam3D; mo: number}> = ({cam, mo}) => {
  const O = 90;
  const X0 = cam.cx - 1700, X1 = cam.cx + 1700, Y0 = cam.cy - 1500, Y1 = cam.cy + 1300;
  const net: React.ReactNode[] = [];
  const doMo = (yy: number) => Math.max(0, Math.min(1, (yy - Y0) / 900)) * (0.55 + 0.45 * Math.max(0, Math.min(1, (Y1 - yy) / 900)));
  for (let yy = Y0; yy <= Y1; yy += O) {
    const a = chieu(cam, X0, yy);
    const b = chieu(cam, X1, yy);
    net.push(<line key={`h${yy}`} x1={a.sx} y1={a.sy} x2={b.sx} y2={b.sy} stroke="#7fe3ff" strokeOpacity={0.2 * doMo(yy)} strokeWidth={1.6 * Math.min(1.6, a.s)} />);
  }
  for (let xx = X0; xx <= X1; xx += O) {
    // đường dọc chia đoạn để mờ dần theo độ xa
    for (let yy = Y0; yy < Y1; yy += O * 2) {
      const a = chieu(cam, xx, yy);
      const b = chieu(cam, xx, yy + O * 2);
      net.push(<line key={`v${xx}_${yy}`} x1={a.sx} y1={a.sy} x2={b.sx} y2={b.sy} stroke="#7fe3ff" strokeOpacity={0.2 * doMo(yy + O)} strokeWidth={1.6 * Math.min(1.6, b.s)} />);
    }
  }
  // quầng sáng giữa sàn (elip chiếu)
  const tam = chieu(cam, cam.cx, cam.cy);
  return (
    <svg width={1} height={1} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: mo, pointerEvents: 'none'}}>
      <defs>
        <radialGradient id="quangSan">
          <stop offset="0%" stopColor="rgba(59,242,154,0.16)" />
          <stop offset="100%" stopColor="rgba(59,242,154,0)" />
        </radialGradient>
      </defs>
      <ellipse cx={tam.sx} cy={tam.sy} rx={520 * tam.s} ry={520 * tam.s * Math.cos((cam.n * Math.PI) / 180)} fill="url(#quangSan)" />
      {net}
    </svg>
  );
};

// chiVat / boVat: chỉ vẽ / bỏ qua các vật này (bố cục vẫn tính trên đủ vật) - dùng để dựng vật cần đọc rõ ĐỨNG THẲNG trên bàn 3D
export const SanKhau: React.FC<{du: DuLieuSanKhau; giayAm: number; amThanh?: boolean; cau?: {text: string; bat: number; ket: number}[]; chiVat?: string[]; boVat?: string[]; phang?: boolean}> = ({du, giayAm, amThanh = true, cau, chiVat, boVat, phang: phang2D = false}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const tb = laMoi() && cau && cau.length ? taoMocBuocLoi(du.soBuoc, giayAm, cau) : taoMocBuoc(du.soBuoc, giayAm);
  // tự xếp chống chồng lấn (đề đa dạng, AI đặt tọa độ chưa khéo vẫn không đè lên nhau)
  const kChu = React.useContext(CoChuSan);
  datHeSoChu(kChu);
  // ĐO KÍCH THƯỚC THẬT: lần vẽ đầu xếp theo ước lượng, chờ phông chữ, đo khung từng vật (offsetWidth/Height: không tính hiệu ứng phóng)
  // rồi xếp lại theo số đo thật trước khi chụp khung hình -> vật nào (kể cả loại mới) cũng không đè lên nhau vì ước lượng sai
  const gocRef = React.useRef<HTMLDivElement>(null);
  const [doThat, setDoThat] = React.useState<DoThat | null>(null);
  const [cho] = React.useState(() => delayRender('Đo kích thước vật trên sân khấu'));
  const xongChoRef = React.useRef(false);
  const nhaCho = () => {
    if (!xongChoRef.current) {
      xongChoRef.current = true;
      continueRender(cho);
    }
  };
  const vatXep = React.useMemo(() => tuXepSanKhau(du.vat, SK_W, SK_H, Math.max(1, Math.min(1.6, kChu)), doThat,
    new Set(du.hanhDong.filter(h => h.kieu === 'lay_ra').map(h => h.vat))), [du, kChu, doThat]);
  const coLucDo = React.useRef(new Map<string, number>());
  React.useLayoutEffect(() => {
    if (doThat) return;
    let xong = false;
    const do_ = () => {
      if (xong) return;
      xong = true;
      const m: DoThat = new Map();
      gocRef.current?.querySelectorAll<HTMLElement>('[data-kd-vat]').forEach((el) => {
        const id = el.getAttribute('data-kd-vat') || '';
        if (id && el.offsetWidth > 0) m.set(id, {w: el.offsetWidth, h: el.offsetHeight, co: coLucDo.current.get(id) || 1});
      });
      setDoThat(m);
    };
    const fonts = (document as Document & {fonts?: {ready: Promise<unknown>}}).fonts;
    if (fonts) fonts.ready.then(() => { if (!xong) requestAnimationFrame(do_); }); else do_();
    const du2 = setTimeout(do_, 3000);
    return () => {
      xong = true;
      clearTimeout(du2);
    };
  }, [doThat]);
  React.useEffect(() => { if (doThat) nhaCho(); }, [doThat]);
  React.useEffect(() => () => nhaCho(), []);
  vatXep.forEach((v) => { if (!doThat) coLucDo.current.set(v.id, v.co); });
  const cam = tinhCamera(du.hanhDong, vatXep, t, tb, SK_W, SK_H);
  // góc nhìn 3D: nghiêng sàn + xoay quanh trục đứng; vật luôn quay mặt về camera (billboard) và đứng trên sàn có bóng đổ
  // phang2D (phần đề bài): bỏ mọi góc máy nghiêng/xoay 3D, vật vẫn bay vào, di chuyển, sáng... trên mặt phẳng
  const g3 = phang2D ? {nghieng: 0, xoay: 0} : tinhGoc3D(du.gocDau, du.hanhDong, t, tb);
  const co3d = g3.nghieng > 0.3 || Math.abs(g3.xoay) > 0.3;
  const sinN = Math.sin((g3.nghieng * Math.PI) / 180);
  const cam3: Cam3D = {n: g3.nghieng, r: g3.xoay, d: 2000, cx: SK_W / 2, cy: SK_H / 2};
  const bong: React.ReactNode[] = [];
  const viTri = new Map<string, {x: number; y: number}>();

  const lop: {z: number; el: React.ReactNode}[] = [];
  const lopPhang: {z: number; el: React.ReactNode}[] = [];
  const muiTen: React.ReactNode[] = [];
  const daRenderDom = new Set<string>();
  const thuTu = (v: Vat) => (v.loai === 'nhan' || v.loai === 'mui_ten' ? 2 : v.loai === 'chu' || v.loai === 'so_dem' ? 1 : 0);
  const lopHinh = React.useContext(LopHinh);   // lớp chú thích phẳng: chỉ vẽ chữ, không vẽ lại tia sáng / mũi tên
  const duocVe = (v: Vat) => (!chiVat || chiVat.includes(v.id)) && !(boVat && boVat.includes(v.id));
  const dsVat = [...vatXep].filter(duocVe).sort((a, b) => thuTu(a) - thuTu(b));

  for (const v of dsVat) {
    const st = tinhTrangThai(v, du.hanhDong, t, tb, SK_W, SK_H);
    const x = (v.x / 100) * SK_W + st.dx;
    const y = (v.y / 100) * SK_H + st.dy;
    if (v.loai === 'mui_ten') {
      const p0 = chieu(cam3, x, y, 0);
      viTri.set(v.id, {x: p0.sx, y: p0.sy});
      continue;
    }
    const kt = kichThuocVat(v, kChu);
    // nhãn, chữ, bộ đếm là chú thích màn hình: khi nhìn 3D vẫn nằm phẳng (không bị phối cảnh phóng to)
    const phang = ['nhan', 'chu', 'so_dem'].includes(v.loai);
    const san = chieu(cam3, x, y, 0);
    // vật đứng trên sàn: tâm vật nâng lên nửa chiều cao (theo hướng đứng của màn hình), tỉ lệ theo độ sâu của chân vật
    const tamVat = phang ? san : {sx: san.sx, sy: san.sy - kt.h * 0.5 * sinN * san.s, s: san.s, z: san.z};
    const tiLeSau = phang ? 1 : Math.min(1.5, Math.max(0.55, tamVat.s));
    viTri.set(v.id, {x: tamVat.sx, y: tamVat.sy});
    if (t < st.ta && v.buoc > 0) continue;
    const ve = VE_VAT[v.loai];
    if (!ve) continue;
    daRenderDom.add(v.id);
    const a = st.vao;
    const lech = v.tuHuong ? (1 - expoOut(a)) * 560 : 0;
    const ox = v.tuHuong === 'trai' ? -lech : v.tuHuong === 'phai' ? lech : 0;
    const oy = v.tuHuong === 'tren' ? -lech : v.tuHuong === 'duoi' ? lech : 0;
    const nhom = v.soLuong > 1 && ['nguoi', 'the', 'cua', 'banh', 'the_bai', 'xuc_xac', 'dong_xu', 'bieu_tuong'].includes(v.loai);
    // vật đơn: bật lên; vật nhóm: từng phần tử tự bật lần lượt nên khung chỉ hiện mờ dần
    const sc = nhom ? 1 : expoOut(a);
    const mo = (nhom ? kep(a * 3) : kep(a * 2.2)) * (1 - st.an);
    const sangNhip = st.sang > 0 ? 1 + 0.06 * st.sang : 1;
    const ngang = v.tuHuong === 'trai' || v.tuHuong === 'phai';
    const nhoeHuong = v.tuHuong ? (1 - expoOut(a)) * 34 : 0;
    // bien_hinh cho cả vật (không phải hình tự do): dời (% sân khấu), xoay, phóng - vật di chuyển theo lời giảng
    const bv = v.loai !== 'hinh_tu_do' ? st.bienNet.get(0) : undefined;
    const bienVat = bv ? ` translate(${(bv.dx / 100) * SK_W}px, ${(bv.dy / 100) * SK_H}px) rotate(${bv.goc}deg) scale(${bv.s})` : '';
    if (co3d && !phang && kt.w > 0) {
      bong.push(
        <div key={`b${v.id}`} style={{position: 'absolute', left: san.sx - kt.w * 0.42 * san.s, top: san.sy - kt.w * 0.13 * san.s * (0.35 + 0.65 * Math.cos((g3.nghieng * Math.PI) / 180)), width: kt.w * 0.84 * san.s, height: kt.w * 0.26 * san.s * (0.35 + 0.65 * Math.cos((g3.nghieng * Math.PI) / 180)), borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 70%)', opacity: sinN * mo}} />
      );
    }
    (phang ? lopPhang : lop).push({
      z: tamVat.z,
      el: (
        <NhoeHuong
          key={v.id}
          kdVat={v.id}
          kdLoai={v.loai}
          nx={ngang ? nhoeHuong : 0}
          ny={v.tuHuong && !ngang ? nhoeHuong : 0}
          style={{
            position: 'absolute',
            left: tamVat.sx,
            top: tamVat.sy,
            transform: `translate(-50%, -50%) translate(${ox}px, ${oy}px)${bienVat}${st.nghiengDi ? ` rotate(${st.nghiengDi.toFixed(2)}deg)` : ''} scale(${sc * sangNhip * (1 - 0.3 * st.an) * tiLeSau})`,
            opacity: mo,
          }}
        >
          {ve(v, st, frame, fps)}
        </NhoeHuong>
      ),
    });
  }

  // Manim "Flash": tia sáng ngắn bắn ra từ tâm vật lúc vật vừa xuất hiện (chỉ vật thật, không áp cho chữ/nhãn)
  const tia: React.ReactNode[] = [];
  for (const v of vatXep) {
    if (v.buoc <= 0 || ['mui_ten', 'chu', 'nhan', 'bieu_tuong'].includes(v.loai) || !duocVe(v) || lopHinh.chiChu) continue;
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
        {TIA_GOC.map(([cx, sy], i) => {
          const r1 = R * (0.55 + 0.6 * e);
          const r2 = r1 + 34 * (1 - e) + 6;
          return <line key={i} x1={cx * r1} y1={sy * r1} x2={cx * r2} y2={sy * r2} stroke={mau} strokeWidth={6 * (1 - e) + 1} strokeLinecap="round" opacity={1 - e} style={{filter: `drop-shadow(0 0 6px ${mau})`}} />;
        })}
        <circle r={R * (0.4 + 0.9 * e)} fill="none" stroke={mau} strokeWidth={4 * (1 - e)} opacity={0.6 * (1 - e)} />
      </svg>
    );
  }

  for (const v of vatXep) {
    if (v.loai !== 'mui_ten' || !duocVe(v) || lopHinh.chiChu) continue;
    const ta = tb(v.buoc);
    if (t < ta && v.buoc > 0) continue;
    const a = viTri.get(v.tu);
    const b = viTri.get(v.den);
    const pa = chieu(cam3, (v.x / 100) * SK_W, (v.y / 100) * SK_H);
    const pb = chieu(cam3, (v.x2 / 100) * SK_W, (v.y2 / 100) * SK_H);
    const x1 = a ? a.x : pa.sx;
    const y1 = a ? a.y : pa.sy;
    const x2 = b ? b.x : pb.sx;
    const y2 = b ? b.y : pb.sy;
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

  // lúc ĐO: dựng thêm (ẩn) các vật lớp này không vẽ (hoặc chưa tới bước xuất hiện), để mọi lớp sân khấu đo ĐỦ vật -> cùng một bố cục
  const doAn: React.ReactNode[] = !doThat ? vatXep.filter((v) => v.loai !== 'mui_ten' && !daRenderDom.has(v.id)).map((v) => {
    const st = tinhTrangThai(v, du.hanhDong, t, tb, SK_W, SK_H);
    return <div key={`do${v.id}`} data-kd-vat={v.id} data-kd-bo="1" style={{position: 'absolute', left: -5000, top: 0, visibility: 'hidden', pointerEvents: 'none'}}>{(() => { const ve2 = VE_VAT[v.loai]; return ve2 ? ve2(v, st, frame, fps) : null; })()}</div>;
  }) : [];
  const z = cam.z;
  return (
    <div ref={gocRef} data-kd-sankhau="1" style={{position: 'relative', width: SK_W, height: SK_H, overflow: z > 1.01 && !co3d ? 'hidden' : 'visible'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: SK_W, height: SK_H, transformOrigin: '0 0', transform: `translate(${SK_W / 2}px, ${SK_H / 2}px) scale(${z}) translate(${-cam.cx}px, ${-cam.cy}px)`}}>
        <Goc3D.Provider value={{n: g3.nghieng, r: g3.xoay}}>
          {co3d ? <San3D cam={cam3} mo={sinN} /> : null}
          {bong}
          {muiTen}
          {tia}
          {[...lop].sort((p, q) => p.z - q.z).map((o) => o.el)}
          {lopPhang.map((o) => o.el)}
          {doAn}
        </Goc3D.Provider>
      </div>
      {amGon.map((x, i) => (
        <Sequence key={i} from={x.f} durationInFrames={Math.round((GIAY_QUAY.vong_quay + 0.5) * fps)} layout="none">
          <Audio src={staticFile(`sfx/${x.tep}.wav`)} volume={x.vol} />
        </Sequence>
      ))}
    </div>
  );
};
