// v96 — MÔ-ĐUN RÚT MẪU (thẻ số / bi màu / xúc xắc). Màu thẻ lấy THEO GIÁ TRỊ phần tử (phan_tu[i].nhom do máy tính từ
// nhóm {phan_tu: [4, 8]} hoặc từ bản chất biến cố) — không bao giờ tô theo chỉ số ô. Pha thu/doi/ket: thẻ được chọn nhấc khỏi
// tập, bay vào khay rồi hiện biểu thức kiểm chứng (2 × 3 × 4 = 24 ⋮ 4 ✓ | 1 × 3 × 5 = 15 không ⋮ 4 ✕); pha chốt luôn là bộ thỏa A.
import React from 'react';
import {spring} from 'remotion';
import {FONT, SO_DEU} from '../theme';
import type {RutMauVao} from './kieu';
import {boCucRutMau, daQua, em, emVR, Hop, kep, nhacSong, nhipNhan, noi, phaTai, songQuet, tHienNhom, tho, tienDo} from './chung';
import {CHU, DongKetQua, mau, NEN_THE, SAI, ThanhTienDo, VienTex} from './GiaoDien';

const TRUNG = 'rgba(230,237,245,0.55)';
const PHA_KHAY = ['thu', 'doi', 'ket'];
const BAY = 0.7, TRE = 0.12, VE = 0.45;
const FPS_THE = 30;

const Cham: React.FC<{n: number; w: number; m: string}> = ({n, w, m}) => {
  const p: Record<number, [number, number][]> = {1: [[0.5, 0.5]], 2: [[0.28, 0.28], [0.72, 0.72]], 3: [[0.26, 0.26], [0.5, 0.5], [0.74, 0.74]],
    4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]], 5: [[0.27, 0.27], [0.73, 0.27], [0.5, 0.5], [0.27, 0.73], [0.73, 0.73]],
    6: [[0.28, 0.24], [0.72, 0.24], [0.28, 0.5], [0.72, 0.5], [0.28, 0.76], [0.72, 0.76]]};
  return <>{(p[n] || []).map(([x, y], i) => <span key={i} style={{position: 'absolute', left: x * w - w * 0.09, top: y * w - w * 0.09, width: w * 0.18, height: w * 0.18, borderRadius: w, background: m}} />)}</>;
};

function The({sk, i, hop, mauNhom, aMau, nang, lat, dam, mo}: {sk: RutMauVao; i: number; hop: Hop; mauNhom: string; aMau: number; nang: number; lat: number; dam: number; mo: number}) {
  const p = sk.phan_tu[i];
  const vien = aMau > 0 ? mauNhom : TRUNG;
  // v99.5: thẻ thuộc nhóm nhấn mạnh nâng nhẹ + viền sáng rõ; thẻ còn lại dịu xuống
  const boc = {position: 'absolute' as const, left: hop.x, top: hop.y, width: hop.w, height: hop.h, opacity: mo * (1 - 0.28 * (aMau > 0 && dam === 0 ? aMau : 0)),
    transform: `scaleX(${lat}) translateY(${-6 * nang - 4 * dam}px) scale(${(1 + 0.06 * nang) * (1 + 0.07 * dam)})`, zIndex: nang > 0 || dam > 0 ? 5 : 1,
    outline: dam > 0 ? `${(2.5 * dam).toFixed(1)}px solid ${mauNhom}` : undefined, outlineOffset: 2};
  if (sk.vat === 'bi') {
    return (
      <div style={{...boc, borderRadius: hop.w, background: aMau > 0 ? mauNhom : '#3A4252', border: `2px solid ${aMau > 0 ? mauNhom : TRUNG}`,
        boxShadow: `inset -${hop.w * 0.12}px -${hop.w * 0.14}px 0 rgba(0,0,0,0.28), 0 ${6 + 10 * nang}px ${10 + 14 * nang}px rgba(0,0,0,${0.3 + 0.25 * nang})`}}>
        <span style={{position: 'absolute', left: hop.w * 0.22, top: hop.w * 0.16, width: hop.w * 0.22, height: hop.w * 0.16, borderRadius: hop.w, background: 'rgba(255,255,255,0.55)'}} />
      </div>
    );
  }
  if (sk.vat === 'xuc_xac') {
    return (
      <div style={{...boc, height: hop.w, borderRadius: hop.w * 0.2, background: '#F1F4F8', border: `3px solid ${vien}`, boxShadow: `0 ${6 + 10 * nang}px ${12 + 14 * nang}px rgba(0,0,0,0.4)`}}>
        <Cham n={Number(p.gia_tri) || 1} w={hop.w - 6} m={aMau > 0 ? mauNhom : '#1A2030'} />
      </div>
    );
  }
  const co = hop.w * (p.nhan.length > 2 ? 0.34 : 0.44);
  return (
    <div style={{...boc, borderRadius: 14, background: NEN_THE, border: `2px solid ${vien}`, overflow: 'hidden',
      boxShadow: `0 ${6 + 12 * nang}px ${12 + 16 * nang}px rgba(0,0,0,${0.35 + 0.25 * nang})${nang > 0 ? `, 0 0 18px ${mauNhom}44` : ''}`}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 7, background: vien, opacity: 0.35 + 0.65 * aMau}} />
      <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, ...SO_DEU,
        fontWeight: 900, fontSize: co, color: aMau > 0 ? mauNhom : CHU, letterSpacing: -1}}>{p.nhan}</div>
    </div>
  );
}

export const RutMau: React.FC<{sk: RutMauVao; t: number; W: number; H: number; mauNhan: string}> = ({sk, t, W, H, mauNhan}) => {
  const b = React.useMemo(() => boCucRutMau(sk, W, H), [sk, W, H]);
  const nh = nhipNhan(sk.nhip, sk.pha, t);
  const tHien = sk.pha.find((p) => p.ten === 'hien')?.t ?? 0.3;
  const dNhom = daQua(sk.pha, 'nhom', t);
  // pha khay hiện tại + pha khay trước đó (thẻ bay về)
  const dsKhay = sk.pha.filter((p) => PHA_KHAY.includes(p.ten) && p.chon && p.chon.length);
  let jk = -1;
  dsKhay.forEach((p, j) => p.t <= t && (jk = j));
  const nay = jk >= 0 ? dsKhay[jk] : null, truoc = jk > 0 ? dsKhay[jk - 1] : null;
  const dtK = nay ? t - nay.t : 0;
  const treVe = truoc ? VE : 0;
  const ha = nay ? (nay.chon!.length - 1) * TRE + BAY + treVe : 0; // lúc thẻ cuối hạ khay
  const pn = phaTai(sk.pha, t);
  // v98: thẻ hiện THEO NHÓM (~3 nhóm, cách 0,8 s) + sóng quét ở mỗi mốc nhịp -> không còn màn "10 tấm thẻ" đứng yên > 4 s
  const nhomHien = Math.max(3, Math.ceil(sk.phan_tu.length / 3));
  const song = songQuet(sk.nhip, t);

  const viTriThe = (i: number) => {
    const o = b.o[i];
    let x = o.x, y = o.y, w = o.w, h = o.h, nang = 0;
    const jn = nay ? nay.chon!.indexOf(i) : -1;
    const jt = truoc ? truoc.chon!.indexOf(i) : -1;
    if (jn >= 0) {
      const u = emVR((dtK - treVe - jn * TRE) / BAY);
      const d = b.oKhay[jn];
      x = noi(o.x, d.x, u); y = noi(o.y, d.y, u) - Math.sin(u * Math.PI) * 70; w = noi(o.w, d.w, u); h = noi(o.h, d.h, u);
      nang = Math.sin(kep(u) * Math.PI) * 0.9 + (u >= 1 ? 0.35 + 0.25 * nh : 0);
    } else if (jt >= 0 && dtK < VE) {
      const u = 1 - em(dtK / VE);
      const d = b.oKhay[jt];
      x = noi(o.x, d.x, u); y = noi(o.y, d.y, u) - Math.sin(u * Math.PI) * 50; w = noi(o.w, d.w, u); h = noi(o.h, d.h, u);
      nang = u * 0.5;
    }
    return {hop: {ten: '', x, y, w, h}, nang, trongKhay: jn >= 0};
  };

  // dòng kết quả theo pha
  let tex = '', aKq = 0, dau: boolean | null = null, mauKq = CHU;
  if (nay && dtK >= ha - 0.1 && pn.ten === nay.ten) {
    aKq = em((dtK - ha + 0.1) / 0.35);
    if (nay.ten === 'ket' && dtK > ha + 1.5 && sk.p) {
      tex = `P(A) = \\dfrac{${sk.n_a}}{${sk.n_omega}} = ${sk.p}`; mauKq = mau('vang'); aKq = em((dtK - ha - 1.5) / 0.35);
    } else if (nay.ten === 'doi' && dtK > ha + 1.6 && sk.n_doi !== undefined) {
      tex = `n(\\overline{A}) = ${sk.n_doi}`; mauKq = mau('hong'); aKq = em((dtK - ha - 1.6) / 0.35);
    } else if (nay.bt) {
      tex = `${nay.bt} \\;\\; ${nay.kl || ''}`; dau = nay.thoa ?? null;
    }
  } else if (pn.ten === 'khong_gian_mau') {
    const u = em(pn.dt / 0.9);
    tex = `n(\\Omega) = ${sk.omega_tex || ''} = ${Math.round(sk.n_omega * u)}`; aKq = em(pn.dt / 0.3); mauKq = mau('cyan');
  } else if (pn.ten === 'hien' && sk.vat === 'the' && sk.phan_tu.length > 2) {
    const ds = sk.phan_tu;
    tex = `\\Omega:\\ \\text{chọn ${sk.k} trong ${ds.length} thẻ (${ds[0].nhan} … ${ds[ds.length - 1].nhan})}`; aKq = em((pn.dt - 0.9) / 0.4); mauKq = CHU;
  }
  // nhãn biến cố trên tab khay: đang giảng biến cố đối -> \overline{A} (hồng); còn lại A (vàng)
  const doi = nay ? nay.muc_tieu === 'doi' : pn.ten === 'doi';
  const aKhay = em((t - (dsKhay[0]?.t ?? Infinity) + 0.4) / 0.4);
  const nhomNhan = (g: number) => (g >= 0 && g < sk.nhom.length ? mau(sk.nhom[g].mau) : TRUNG);
  const nhomDich = sk.nhom.length ? 0 : -1;

  return (
    <div style={{position: 'absolute', inset: 0}}>
      {/* chú giải nhóm (theo giá trị) */}
      <div data-sk2d="chu_giai" style={{position: 'absolute', left: b.chuGiai.x, top: b.chuGiai.y, width: b.chuGiai.w, height: b.chuGiai.h, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden'}}>
        {sk.nhom.map((g, k) => {
          const a = em((dNhom - k * 0.35) / 0.35);
          return a > 0 ? <div key={k} style={{opacity: a, transform: `translateY(${(1 - a) * -10}px) scale(${1 + (k === nhomDich ? 0.04 * nh : 0)})`}}><VienTex tex={g.nhan} mau={mau(g.mau)} co={sk.nhom.length > 3 ? 20 : 23} cham /></div> : null;
        })}
      </div>
      {/* khay rút */}
      {aKhay > 0 ? (
        <div data-sk2d="khay" style={{position: 'absolute', left: b.khay.x, top: b.khay.y, width: b.khay.w, height: b.khay.h, borderRadius: 22, opacity: aKhay,
          border: `2px dashed ${doi ? SAI : mau('vang')}88`, background: 'rgba(255,255,255,0.025)'}}>
          <div style={{position: 'absolute', left: 18, top: -26}}>
            <VienTex tex={doi ? `\\overline{A}` : `A:\\ ${sk.bien_co}`} mau={doi ? SAI : mau('vang')} co={23} />
          </div>
        </div>
      ) : null}
      {/* ô trống còn lại trên lưới khi thẻ đã lên khay */}
      {b.o.map((o, i) => (nay && nay.chon!.includes(i) && dtK > treVe + 0.1 ? (
        <div key={`g${i}`} style={{position: 'absolute', left: o.x, top: o.y, width: o.w, height: sk.vat === 'xuc_xac' ? o.w : o.h, borderRadius: sk.vat === 'bi' ? o.w : 14, border: '1.5px dashed rgba(255,255,255,0.16)'}} />
      ) : null))}
      {/* thẻ */}
      {sk.phan_tu.map((p, i) => {
        // v99.5: lệch 1-2 frame mỗi thẻ trong cùng nhóm, nảy bằng spring() gọn
        const tVao = tHienNhom(i, tHien, nhomHien) + (i % nhomHien) * (1.5 / FPS_THE);
        const aVao = em((t - tVao) / 0.4);
        if (aVao <= 0) return null;
        const sp = spring({frame: Math.max(0, Math.round((t - tVao) * FPS_THE)), fps: FPS_THE, config: {damping: 14, stiffness: 190, mass: 0.6}});
        const v = viTriThe(i);
        const aMau = p.nhom >= 0 ? em((dNhom - p.nhom * 0.35) / 0.35) : 0;
        // nhịp chống đứng hình: thẻ nhóm đích (hoặc thẻ trên khay) nhấn nhẹ ở mốc nhịp
        const nhan = v.trongKhay ? 0 : (p.nhom === nhomDich && aMau > 0 && !nay ? 0.25 * nh : 0) + 0.55 * nhacSong(song, i, sk.phan_tu.length);
        const dam = p.nhom === nhomDich && aMau > 0 && !v.trongKhay ? aMau : 0;
        return <The key={i} sk={sk} i={i} hop={v.hop} mauNhom={nhomNhan(p.nhom)} aMau={aMau} nang={v.nang + nhan} lat={0.15 + 0.85 * sp} dam={dam} mo={aVao} />;
      })}
      <DongKetQua x={b.ketQua.x} y={b.ketQua.y} w={b.ketQua.w} h={b.ketQua.h} tex={tex} a={aKq} mau={mauKq} dau={dau} nhan={nh * (dau === null ? 0.5 : 1) + 0.15 * tho(t)} co={40} />
      <ThanhTienDo W={W} H={H} u={tienDo(sk.pha, t)} mau={mauNhan} />
    </div>
  );
};
