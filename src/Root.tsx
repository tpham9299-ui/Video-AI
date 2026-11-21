import React from 'react';
import {Composition} from 'remotion';
import {AnhBia} from './AnhBia';
import mau from '../mau/props_mau.json';
import {Video} from './Video';
import {CAO, FPS, RONG} from './theme';
import {Props} from './types';
import mau4Tang from '../mau/canh3dv_B_cau_4cap.json';
import {Khung4Tang} from './khung4tang/Khung4Tang';
import {Khung4TangVao} from './khung4tang/kieu';

const propsMau = mau as unknown as Props;

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
    // Độ dài video lấy từ props.json (do scripts/chuanbi.py tính theo giọng đọc thật).
    calculateMetadata={({props}: {props: Props}) => ({durationInFrames: Math.max(30, props.tongFrame)})}
  />
  {/* ẢNH BÌA: npx remotion still src/index.ts AnhBia out/bia.png --props=public/props.json --frame=<props.bia.khung> */}
  <Composition id="AnhBia" component={AnhBia} width={RONG} height={CAO} fps={FPS} durationInFrames={Math.max(30, propsMau.tongFrame)} defaultProps={propsMau}
    calculateMetadata={({props}: {props: Props}) => ({durationInFrames: Math.max(30, props.tongFrame)})} />
  {/* v90 KHUNG 4 TẦNG + SÂN KHẤU 3D VECTOR (thử độc lập): node scripts/thu_canh_3d_vector.mjs mau/canh3dv_B_cau_4cap.json */}
  <Composition id="Khung4Tang" component={Khung4Tang} width={RONG} height={CAO} fps={FPS} durationInFrames={Math.max(30, (mau4Tang as unknown as Khung4TangVao).tongFrame)}
    defaultProps={mau4Tang as unknown as Khung4TangVao}
    calculateMetadata={({props}: {props: Khung4TangVao}) => ({durationInFrames: Math.max(30, props.tongFrame)})} />
  </>
);
