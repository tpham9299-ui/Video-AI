import React from 'react';
import {Composition} from 'remotion';
import mau from '../mau/props_mau.json';
import {Video} from './Video';
import {CAO, FPS, RONG} from './theme';
import {Props} from './types';

const propsMau = mau as unknown as Props;

export const Root: React.FC = () => (
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
);
