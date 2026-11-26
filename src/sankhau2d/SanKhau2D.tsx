// v96 — BỘ CHỌN SÂN KHẤU 2D cho tầng 2 khung 4 tầng. Dữ liệu đã tính sẵn (chuanbi.py khung4tang_v96); loại lạ -> không vẽ
// (khung 4 tầng giữ nền lưới, không bao giờ vỡ video). Mọi sân khấu nằm trong bề rộng `rong` (v98: T2 đối xứng 130..950, rộng 820 — vùng an toàn TikTok).
import React from 'react';
import {FONT} from '../theme';
import type {SanKhau2DVao} from './kieu';
import {RutMau} from './RutMau';
import {RutTheoBuoc} from './RutTheoBuoc';
import {SoDoCay} from './SoDoCay';
import {LuoiBayes} from './LuoiBayes';
import {CotPhanPhoi} from './CotPhanPhoi';
import {KinhTeDoThi} from './KinhTeDoThi';
import {SoDo2D} from './SoDo2D';
import {TangTruong} from './TangTruong';
import {TuDuyDaiSo} from './TuDuyDaiSo';

export const SanKhau2D: React.FC<{sk: SanKhau2DVao; t: number; rong: number; cao: number; yTrenKhung?: number; mauNhan: string; intro?: boolean}> = ({sk, t, rong, cao, mauNhan}) => {
  const W = rong, H = cao;
  const chung = {t, W, H, mauNhan};
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
    </div>
  );
};
