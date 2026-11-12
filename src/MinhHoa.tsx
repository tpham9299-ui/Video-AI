import React from 'react';
import {Bang} from './Bang';
import {BiHop} from './BiHop';
import {hopLeBang, hopLeBiHop, hopLeCay, hopLeDienTich, hopLeHinhVe, hopLeLuoiMau, hopLeThucNghiem, hopLeVenn, KieuHinh} from './bocuc';
import {DienTich} from './DienTich';
import {LuoiMau} from './LuoiMau';
import {ThucNghiem} from './ThucNghiem';
import {HinhVe} from './HinhVe';
import {HinhKhac} from './HinhKhac';
import {SoDoCay} from './SoDoCay';
import {MinhHoa as KieuMinhHoa} from './types';
import {Venn} from './Venn';

// Chọn đúng mẫu hình theo loại; dữ liệu thiếu/sai thì rơi về thẻ mô tả (HinhKhac).
export const MinhHoa: React.FC<{kieu: KieuHinh; mh: KieuMinhHoa; giayAm: number}> = ({kieu, mh, giayAm}) => {
  if (kieu === 'cay') {
    const d = hopLeCay(mh.duLieu);
    if (d) return <SoDoCay du={d} giayAm={giayAm} />;
  }
  if (kieu === 'bang') {
    const d = hopLeBang(mh.duLieu);
    if (d) return <Bang du={d} giayAm={giayAm} />;
  }
  if (kieu === 'venn') {
    const d = hopLeVenn(mh.duLieu);
    if (d) return <Venn du={d} giayAm={giayAm} />;
  }
  if (kieu === 'bihop') {
    const d = hopLeBiHop(mh.duLieu);
    if (d) return <BiHop du={d} giayAm={giayAm} />;
  }
  if (kieu === 'luoimau') {
    const d = hopLeLuoiMau(mh.duLieu);
    if (d) return <LuoiMau du={d} giayAm={giayAm} />;
  }
  if (kieu === 'dientich') {
    const d = hopLeDienTich(mh.duLieu);
    if (d) return <DienTich du={d} giayAm={giayAm} />;
  }
  if (kieu === 'thucnghiem') {
    const d = hopLeThucNghiem(mh.duLieu);
    if (d) return <ThucNghiem du={d} giayAm={giayAm} />;
  }
  if (kieu === 'hinhve') {
    const d = hopLeHinhVe(mh.duLieu);
    if (d) return <HinhVe du={d} giayAm={giayAm} />;
  }
  return <HinhKhac loai={mh.loai} moTa={mh.moTa || ''} />;
};
