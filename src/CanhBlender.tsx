import React from 'react';
import {Img, staticFile} from 'remotion';
import {CanhProps} from './types';

const kep = (n: number) => Math.max(0, Math.min(1, n));

// Giai đoạn D: tiến độ khung Blender (0 -> 1) theo mốc khi_noi của từng hành động.
// Khung [0, dan]: máy vào cảnh (trôi tới mốc hành động đầu); hành động k chiếm khung [dan + k·seg, dan + (k+1)·seg]
// và chạy từ đúng lúc giọng đọc bắt đầu cụm khi_noi trong d giây; giữa hai hành động máy/vật đứng chờ.
export function tienQuay(nq: NonNullable<CanhProps['nhipQuay']>, time: number, duration: number) {
  const n = nq.moc.length;
  if (!n) return eio(kep(time / Math.max(1, duration * 0.9)));
  const seg = (1 - nq.dan) / n;
  let p = nq.dan * eio(kep(time / Math.max(0.3, nq.moc[0].t)));
  nq.moc.forEach((m, k) => {
    if (time >= m.t) p = nq.dan + seg * k + seg * eio(kep((time - m.t) / Math.max(0.2, m.d)));
  });
  return p;
}

function khungVat(canh: CanhProps, time: number, fps: number) {
  const last = (canh.chuoi3D?.khungThat ?? 16) - 1;
  const duration = canh.soFrame / fps;
  if (canh.nhipQuay) return last * tienQuay(canh.nhipQuay, time, duration);
  const act = canh.cau.find(c => /rút|lấy|gieo|tung|lắc/i.test(c.text));
  const at = act?.bat ?? 0;
  let p = kep((time - at) / Math.max(.25, Math.min(2, duration - at)));
  if (canh.nhipXe) {
    const phase = canh.nhipXe.moc.filter(m => m.t <= time).slice(-1)[0];
    if (phase) {
      const dt = Math.max(0, Math.min(time - phase.t, phase.chay ?? Infinity));
      p = kep((phase.s + phase.v * dt + phase.a * dt**2 / 2 + (phase.j ?? 0) * dt**3 / 6) / canh.nhipXe.tong);
    }
  }
  return last * p;   // số thực: hai khung kề nhau được hòa trộn để vật quay mượt (16 khung Blender không bị giật bậc)
}

const eio = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

// Tiến độ chuyển từ ảnh thật sang hình minh họa của cảnh 'chuyen' (0 -> 1), bắt đầu khi lời đọc vào đề.
export function tienChuyen(canh: CanhProps, time: number) {
  const duration = canh.soFrame / 30;
  const cue = canh.cau.find(c => /gọi|đặt|mô hình|biểu diễn|đề bài|cho biết/i.test(c.text));
  let start = Math.min(cue?.bat ?? 0.35, duration * 0.3);
  if (canh.nhipQuay) {
    // cảnh đề có góc máy / hành động riêng: xem hết hành động rồi mới lấy nét sang hình 2D
    const cuoi = canh.nhipQuay.moc.slice(-1)[0];
    start = Math.min(duration * 0.6, Math.max(start, cuoi ? cuoi.t + cuoi.d + 0.2 : 1.4));
  }
  return eio(kep((time - start) / 1.15));
}

// Máy quay CSS rất nhẹ (máy Blender đã tự lượn + đẩy vào): dùng CHUNG cho lớp nền và lớp vật để hai lớp luôn khớp.
export const dichMay = (time: number, duration: number) => {
  const e = eio(kep(time / Math.max(1, duration)));
  return `scale(${1.0 + 0.03 * e}) translateY(${-6 * e}px)`;
};

// Khung nền Blender (bối cảnh xóa phông, cùng góc máy với lớp vật) phủ toàn màn hình dọc.
export const NenKhungBlender: React.FC<{canh: CanhProps; k: number; style?: React.CSSProperties}> = ({canh, k, style}) => {
  const clip = canh.chuoi3D!;
  const n = clip.nenKhung ?? 0;
  if (!n) return null;
  const a = n === 1 ? 0 : Math.min(n - 1, Math.floor(k)), w = n === 1 ? 0 : Math.min(1, k - a);
  const img = (i: number, o: number) => <Img key={i} src={staticFile(clip.thuMuc + '/nen-' + i + '.jpg')}
    style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: o}} />;
  return <div style={{position: 'absolute', inset: 0, ...style}}>
    {img(a, 1)}
    {w > 0.02 && a + 1 < n ? img(a + 1, w) : null}
    {/* tối nhẹ trên/dưới cho chữ tiêu đề và phụ đề luôn đọc rõ trên ảnh thật */}
    <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(8,14,20,.55), transparent 26%, transparent 70%, rgba(8,14,20,.62))'}} />
  </div>;
};

export const khungThuc = (canh: CanhProps, time: number) => khungVat(canh, time, 30);

// Ảnh Blender cuối của phần mở đầu: máy quay đẩy vào (focus pull), nhòe sâu và tối dần, để lộ hình 2D phía dưới.
export const ChuyenLayNet: React.FC<{canh: CanhProps; truoc?: CanhProps; p: number; time?: number}> = ({canh, truoc, p, time = 0}) => {
  if (p >= 1) return null;
  const clip = canh.chuoi3D!;
  const last = (clip.khungThat ?? 16) - 1;
  // Cảnh đề có quay riêng (thư mục khung riêng): chạy góc máy + hành động của chính cảnh; không thì giữ khung cuối cảnh trước.
  const rieng = !!canh.nhipQuay && clip.thuMuc !== truoc?.chuoi3D?.thuMuc;
  const k = rieng ? khungVat(canh, time, 30) : Math.round(truoc?.chuoi3D ? khungVat(truoc, (truoc.soFrame - 1) / 30, 30) : last);
  const flash = Math.sin(Math.PI * kep(p * 1.6)) * 0.22;
  return <div style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
    <div style={{position: 'absolute', inset: 0, transform: `scale(${1 + 0.28 * p})`,
      filter: `blur(${p * 18}px) brightness(${1 - 0.55 * p}) saturate(${1 - 0.6 * p})`, opacity: 1 - kep((p - 0.35) / 0.65)}}>
      <NenKhungBlender canh={canh} k={(clip.nenKhung ?? 0) > 1 ? (clip.nenKhung! - 1) * k / Math.max(1, last) : 0} />
      <div style={{position: 'absolute', top: '50%', width: '100%', aspectRatio: '1.6', transform: 'translateY(-50%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, #000 9%, #000 88%, transparent 100%)'}}>
        {rieng ? <KhungMuot thuMuc={clip.thuMuc} k={k} /> :
          <Img src={staticFile(clip.thuMuc + '/orbit-' + k + '.png')} style={{width: '100%', height: '100%', objectFit: 'contain'}} />}
      </div>
    </div>
    {/* vệt sáng nhẹ ở giữa khung lúc lấy nét: mắt người xem được dẫn vào hình minh họa */}
    <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 48%, rgba(220,255,248,0.9), rgba(120,220,210,0.25) 32%, transparent 62%)', opacity: flash}} />
  </div>;
};

// Khung Blender với chỉ số thực: hòa hai ảnh kề nhau.
const KhungMuot: React.FC<{thuMuc: string; k: number}> = ({thuMuc, k}) => {
  const a = Math.floor(k), w = k - a;
  const style = (o: number): React.CSSProperties => ({position: 'absolute', width: '100%', height: '100%', objectFit: 'contain', opacity: o});
  return <>
    <Img src={staticFile(thuMuc + '/orbit-' + a + '.png')} style={style(1)} />
    {w > 0.02 ? <Img src={staticFile(thuMuc + '/orbit-' + (a + 1) + '.png')} style={style(w)} /> : null}
  </>;
};

export const CanhBlender: React.FC<{canh: CanhProps; truoc?: CanhProps; frame: number; fps: number}> = ({canh, truoc, frame, fps}) => {
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
  if (canh.phaMinhHoa) {
    const last = (clip.khungThat ?? 16) - 1;
    if (canh.phaMinhHoa === 'toan') return clip.hinhGiai ?
      <Img src={staticFile(clip.hinhGiai)} style={{width:'100%',height:'100%',objectFit:'contain'}} /> : <>
        {pic('net-'+clip.netCuoi,1)}
        {canh.nhanNet && <Img src={staticFile(canh.nhanNet)} style={{position:'absolute',inset:0,width:'100%',opacity:kep((time-(canh.mocNhanNet ?? 0))/.3)}} />}
      </>;
    if (canh.phaMinhHoa === 'thuc') {
      // máy quay trôi chậm liên tục suốt cảnh mở đầu; mép trên/dưới lớp vật mờ dần để bóng đổ không bị cắt ngang
      const mask = 'linear-gradient(to bottom, transparent 0%, #000 9%, #000 88%, transparent 100%)';
      return <div style={{position: 'absolute', inset: 0, transform: dichMay(time, duration), WebkitMaskImage: mask, maskImage: mask}}>
        <KhungMuot thuMuc={clip.thuMuc} k={khungVat(canh, time, fps)} />
      </div>;
    }
    const cue = canh.cau.find(c => /gọi|đặt|mô hình|biểu diễn/i.test(c.text));
    const start = Math.min(cue?.bat ?? .25, duration*.4);
    const p = kep((time-start)/Math.min(1,duration*.4));
    return <>
      <div style={{position:'absolute',inset:0,filter:`blur(${p*4}px)`}}>{pic('orbit-'+Math.round(truoc ? khungVat(truoc,(truoc.soFrame-1)/fps,fps) : last),1-p)}</div>
      {pic('net-'+Math.round(clip.netCuoi*p),p)}
    </>;
  }
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
