// v96 — BỘ CHỌN SÂN KHẤU 2D cho tầng 2 khung 4 tầng. Dữ liệu đã tính sẵn (chuanbi.py khung4tang_v96); loại lạ -> không vẽ
// (khung 4 tầng giữ nền lưới, không bao giờ vỡ video). Mọi sân khấu nằm trong bề rộng `rong` (v98: T2 đối xứng 130..950, rộng 820 — vùng an toàn TikTok).
import React from 'react';
import {FONT} from '../theme';
import type {SanKhau2DVao} from './kieu';
import {em} from './chung';
import {ChuTron} from '../khung4tang/ChuTron';
import {RutMau} from './RutMau';
import {RutTheoBuoc} from './RutTheoBuoc';
import {SoDoCay, soCuaTex} from './SoDoCay';
import {LuoiBayes} from './LuoiBayes';
import {CotPhanPhoi} from './CotPhanPhoi';
import {KinhTeDoThi} from './KinhTeDoThi';
import {SoDo2D} from './SoDo2D';
import {TangTruong} from './TangTruong';
import {TuDuyDaiSo} from './TuDuyDaiSo';

export const SanKhau2D: React.FC<{sk: SanKhau2DVao; t: number; rong: number; cao: number; yTrenKhung?: number; mauNhan: string; intro?: boolean}> = ({sk, t, rong, cao, mauNhan}) => {
  const W = rong, H = cao;
  const chart = sk.loai === 'so_do_cay' || sk.loai === 'luoi_bayes' || sk.loai === 'cot_phan_phoi' ? sk : null;
  const marks = chart?.moc_buoc || [];
  const step = marks.filter(at => at <= t).length - 1;
  const selected = chart?.nhanh_buoc?.[step] ?? step;
  const end = chart?.pha.find(ph => ph.ten === 'ket')?.t ?? Infinity;
  const chung = {t, W, H: marks.length ? H - 84 : H, mauNhan};
  let share: {label: string; p: number} | undefined;
  if (chart && step >= 0) {
    if (t >= end && chart.p_so !== undefined) {
      const p = chart.loai === 'luoi_bayes' && chart.hoi === 'B'
        ? chart.pa * chart.pba + (1 - chart.pa) * chart.pbna : chart.p_so;
      share = {label: 'Xác suất cần tìm', p};
    } else if (chart.loai === 'so_do_cay') {
      const level = chart.pha.find(ph => ph.ten === 'tang_2');
      const nodes = chart.nut.filter(n => n.tang === (level && t >= level.t ? 2 : 1));
      const group = nodes.filter(n => n.duong[0] === selected);
      const n = group[step % group.length] || nodes[selected % nodes.length];
      const parent = n && chart.nut.find(a => a.id === n.cha);
      if (n && n.p !== '?') share = {label: parent ? n.nhan + ' | ' + parent.nhan : n.nhan, p: soCuaTex(n.p)};
    } else if (chart.loai === 'luoi_bayes') {
      const a = chart.ky_a || 'A', b = chart.ky_b || 'B';
      const split = chart.pha.find(ph => ph.ten === 'cat_ngang');
      share = split && t >= split.t
        ? (selected % 2 ? {label: 'P(' + b + ' | ' + a + '̄)', p: chart.pbna} : {label: 'P(' + b + ' | ' + a + ')', p: chart.pba})
        : (selected % 2 ? {label: 'P(' + a + '̄)', p: 1 - chart.pa} : {label: 'P(' + a + ')', p: chart.pa});
    } else if (chart.loai === 'cot_phan_phoi') {
      const column = chart.cot[selected % chart.cot.length];
      if (column) share = {label: column.nhan, p: column.gia_tri};
    }
  }
  let noi: React.ReactNode = null;
  if (sk.loai === 'rut_mau') {
    const chart = sk.bieu_do;
    if (chart && t >= chart.t) {
      noi = <RutTheoBuoc sk={{...sk, p: chart.p, cong_bo: chart.cong_bo, pha: [{ten: 'ti_le', t: chart.t}]}} {...chung} />;
    } else noi = sk.mode ? <RutTheoBuoc sk={sk} {...chung} /> : <RutMau sk={sk} {...chung} />;
  }
  else if (sk.loai === 'so_do_cay') noi = <SoDoCay sk={sk} {...chung} />;
  else if (sk.loai === 'luoi_bayes') noi = <LuoiBayes sk={sk} {...chung} />;
  else if (sk.loai === 'cot_phan_phoi') noi = <CotPhanPhoi sk={sk} {...chung} />;
  else if (sk.loai === 'kinh_te_do_thi') noi = <KinhTeDoThi sk={sk} {...chung} />;
  else if (sk.loai === 'so_do_2d') noi = <SoDo2D sk={sk} {...chung} />;
  else if (sk.loai === 'tang_truong') noi = <TangTruong sk={sk} {...chung} />;
  else if (sk.loai === 'tu_duy_dai_so') noi = <TuDuyDaiSo sk={sk} {...chung} />;
  return (
    <div data-san-khau-2d={sk.loai} style={{position: 'absolute', left: 0, top: 0, width: W, height: H, fontFamily: FONT, overflow: 'hidden'}}>
      {noi}
      {share && share.p >= 0 && share.p <= 1 ? (
        <div style={{position: 'absolute', left: 48, right: 48, bottom: 12, textAlign: 'center'}}>
          <ChuTron s={share.label} co={22} mau={mauNhan} />
          <svg width="100%" height={24} viewBox="0 0 1000 24" preserveAspectRatio="none" style={{display: 'block'}}>
            <rect width={1000} height={24} rx={8} fill="#485669" />
            <rect data-xs-object="ti-le" width={1000 * share.p * em((t - Math.max(marks[step], t >= end ? end : 0)) / 0.6)} height={24} rx={8} fill={mauNhan} />
          </svg>
        </div>
      ) : null}
    </div>
  );
};
