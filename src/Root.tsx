import React from 'react';
import {Composition} from 'remotion';
import {AnhBia} from './AnhBia';
import {Video} from './Video';
import {CAO, FPS, RONG, TEN_THUONG_HIEU} from './theme';
import {Props} from './types';
import mau4Tang from '../mau/canh3dv_B_cau_4cap.json';
import {Khung4Tang} from './khung4tang/Khung4Tang';
import {Khung4TangVao} from './khung4tang/kieu';

const k4Mau = mau4Tang as unknown as Khung4TangVao;
const propsMau: Props = {
  id: 'MAU-4TANG',
  mon: 'THUC_TE',
  boCuc: '4tang',
  khung4tang: k4Mau,
  tieuDe: 'Cân bằng 4 dây cáp',
  hook: '4 dây cáp chịu lực bao nhiêu?',
  dapAn: '2500 N',
  lop: '12',
  fps: FPS,
  tongFrame: Math.max(30, k4Mau.tongFrame),
  hookChu: '4 dây cáp chịu lực?',
  hookKieu: 'cau_hoi',
  nhanManh: ['4 DÂY CÁP'],
  nhac: null,
  amLuongNhac: 0.16,
  chuDe: 'Khung 4 tầng',
  nen: null,
  thuongHieu: {ten: TEN_THUONG_HIEU, khauHieu: '', handle: '', markNuoc: true, logo: null},
  outro: null,
  intro: null,
  phongCach: {
    doMoNen: 0.5, kyHieuTroi: false, quangSang: true, kieuNen: 'neon', kieuToan: 'dam',
    kieuHinh: 'manim', thanhTienDo: false, phuDe: false, mau: {},
  },
  canh: [],
};

export const Root: React.FC = () => (
  <>
    <Composition
      id="Video"
      component={Video}
      width={RONG}
      height={CAO}
      fps={FPS}
      durationInFrames={Math.max(30, propsMau.tongFrame)}
      defaultProps={propsMau}
      calculateMetadata={({props}: {props: Props}) => ({durationInFrames: Math.max(30, props.tongFrame)})}
    />
    {/* ẢNH BÌA: npx remotion still src/index.ts AnhBia out/bia.png --props=public/props.json --frame=<props.bia.khung> */}
    <Composition
      id="AnhBia"
      component={AnhBia}
      width={RONG}
      height={CAO}
      fps={FPS}
      durationInFrames={Math.max(30, propsMau.tongFrame)}
      defaultProps={propsMau}
      calculateMetadata={({props}: {props: Props}) => ({durationInFrames: Math.max(30, props.tongFrame)})}
    />
    {/* Khung 4 tầng độc lập (thử sân khấu 3D Vector): node scripts/thu_canh_3d_vector.mjs mau/canh3dv_B_cau_4cap.json */}
    <Composition
      id="Khung4Tang"
      component={Khung4Tang}
      width={RONG}
      height={CAO}
      fps={FPS}
      durationInFrames={Math.max(30, k4Mau.tongFrame)}
      defaultProps={k4Mau}
      calculateMetadata={({props}: {props: Khung4TangVao}) => ({durationInFrames: Math.max(30, props.tongFrame)})}
    />
  </>
);
