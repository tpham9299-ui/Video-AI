import React from 'react';
import {Img, staticFile} from 'remotion';
import {CanhProps} from './types';

const kep = (n: number) => Math.max(0, Math.min(1, n));

export const CanhBlender: React.FC<{canh: CanhProps; frame: number; fps: number}> = ({canh, frame, fps}) => {
  const clip = canh.chuoi3D!;
  const time = frame / fps;
  const duration = canh.soFrame / fps;
  const cue = canh.cau.find(c => c.bat > duration * .35 && /mô hình|gọi|ký hiệu|đặt|biểu diễn/i.test(c.text));
  const start = Math.min(duration * .64, cue?.bat ?? duration * .50);
  const blend = kep((time - start) / Math.min(.55, duration * .16));
  const turn = kep(time / Math.min(1.25, start)) * 15;
  const flatten = kep((time - start - Math.min(.55, duration * .16)) / Math.min(.85, duration * .18));
  const pic = (name: string, opacity: number) => opacity > 0 ?
    <Img key={name} src={staticFile(clip.thuMuc + '/' + name + '.png')}
      style={{position: 'absolute', width: '100%', height: '100%', objectFit: 'contain', opacity}} /> : null;
  if (clip.xeDuong && canh.nhipXe) {
    const phase = canh.nhipXe.moc.filter(m => m.t <= time).slice(-1)[0];
    const elapsed = Math.max(0,Math.min(duration,time)-phase.t);
    const dt = Math.min(elapsed, phase.chay ?? (phase.a < 0 ? phase.v / -phase.a : elapsed));
    const s = kep((phase.s + phase.v*dt + phase.a*dt**2/2 + (phase.j ?? 0)*dt**3/6)/canh.nhipXe.tong);
    const [dx,dy] = clip.xeDuong;
    return <div style={{position:'absolute',inset:0,containerType:'size',display:'grid',placeItems:'center'}}>
      <div style={{position:'relative',width:'min(100cqw,160cqh)',aspectRatio:'1.6'}}>
        {['duong','xe'].map(name => <Img key={name} src={staticFile(clip.thuMuc+'/'+name+'.png')}
          style={{position:'absolute',inset:0,width:'100%',height:'100%',transform:name==='xe' ? `translate(${100*dx*s}%,${100*dy*s}%)` : undefined}} />)}
      </div>
    </div>;
  }
  if (clip.phepThu) {
    const action = canh.cau.find(c => /rút|lấy|gieo|tung|lắc/i.test(c.text));
    const at = Math.min(action?.bat ?? .25, duration * .72);
    const step = clip.giuVatCuoi ? 1 : kep((time - at) / Math.min(1.5, duration - at));
    return pic('orbit-' + Math.round(step * 15), 1);
  }
  if (clip.giuNet) return <>
    {clip.coThuoc && pic('orbit-15', .32)}
    {pic('net-' + clip.netCuoi, 1)}
    {canh.nhanNet && <Img src={staticFile(canh.nhanNet)} style={{position: 'absolute', width: '100%',
      height: '100%', objectFit: 'contain', opacity: canh.mocNhanNet === undefined ? 1 : kep((time - canh.mocNhanNet) / .3)}} />}
  </>;
  return <>
    {pic('orbit-' + Math.round(turn), 1 - blend * (clip.coThuoc ? .68 : 1))}
    {pic('net-' + Math.round(flatten * clip.netCuoi), blend)}
  </>;
};
