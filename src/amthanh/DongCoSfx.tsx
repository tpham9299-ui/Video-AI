// Động cơ Sound Effect (SFX) theo sự kiện cho Remotion (KhungHinhHoc & tái sử dụng cho Khung4Tang).
// Khóa chống ồn cứng:
//  - Âm lượng cố định nhỏ hơn giọng đọc: 0.14–0.18 (tương đương -16 dB đến -18 dB).
//  - Cooldown cứng >= 3.5 giây giữa hai hiệu ứng liên tiếp (ưu tiên sự kiện quan trọng hơn nếu sát nhau).
import React, {useMemo} from 'react';
import {Audio, Sequence, staticFile, useVideoConfig} from 'remotion';

export type LoaiSfx = 'net_phu' | 'ket_qua_chip' | 'chuyen_pha' | 'outro' | 'bay' | 'moc_cong_bo';

export type SuKienSfxVao = {
  id?: string;
  loai: LoaiSfx;
  t: number; // giây tính từ đầu composition/sequence
};

export type SuKienSfxDaLoc = {
  id: string;
  loai: LoaiSfx;
  t: number;
  tep: string;
  volume: number;
  thoiLuong: number; // giây
  uuTien: number;
};

export const COOLDOWN_SFX_GIAY = 3.5;

export const CAU_HINH_SFX: Record<LoaiSfx, {tep: string; volume: number; thoiLuong: number; uuTien: number}> = {
  net_phu: {tep: 'sfx/draw.wav', volume: 0.14, thoiLuong: 0.35, uuTien: 1},
  ket_qua_chip: {tep: 'sfx/pop.wav', volume: 0.15, thoiLuong: 0.22, uuTien: 2},
  chuyen_pha: {tep: 'sfx/whoosh.wav', volume: 0.15, thoiLuong: 0.45, uuTien: 3},
  outro: {tep: 'sfx/whoosh.wav', volume: 0.16, thoiLuong: 0.45, uuTien: 3},
  bay: {tep: 'sfx/trap.wav', volume: 0.16, thoiLuong: 0.42, uuTien: 4},
  moc_cong_bo: {tep: 'sfx/ding.wav', volume: 0.18, thoiLuong: 0.72, uuTien: 5},
};

// Hàm thuần lập lịch SFX: lọc theo [tMin, tMax), áp cooldown cứng >= 3.5s, giữ sự kiện ưu tiên cao hơn khi kề nhau.
export function lapLichSfx(
  suKien: SuKienSfxVao[],
  opts?: {tMin?: number; tMax?: number; cooldown?: number},
): SuKienSfxDaLoc[] {
  const tMin = opts?.tMin ?? 0.2;
  const tMax = opts?.tMax ?? 1e9;
  const cooldown = Math.max(COOLDOWN_SFX_GIAY, opts?.cooldown ?? COOLDOWN_SFX_GIAY);

  const hopLe = (suKien || [])
    .filter((e) => e && Number.isFinite(e.t) && e.t >= tMin && e.t < tMax && e.loai in CAU_HINH_SFX)
    .map((e, idx) => {
      const cfg = CAU_HINH_SFX[e.loai];
      return {
        id: e.id || `${e.loai}_${idx}_${Math.round(e.t * 100)}`,
        loai: e.loai,
        t: e.t,
        tep: cfg.tep,
        volume: Math.min(0.18, Math.max(0.14, cfg.volume)),
        thoiLuong: cfg.thoiLuong,
        uuTien: cfg.uuTien,
      };
    })
    .sort((a, b) => a.t - b.t || b.uuTien - a.uuTien);

  const giu: SuKienSfxDaLoc[] = [];
  for (const e of hopLe) {
    const truoc = giu[giu.length - 1];
    if (!truoc) {
      giu.push(e);
      continue;
    }
    const dt = e.t - truoc.t;
    if (dt < 0.65 && e.uuTien > truoc.uuTien) {
      // Hai sự kiện gần sát nhau (< 0.65s): thay bằng sự kiện ưu tiên cao hơn nếu vẫn cách sự kiện trước đó >= cooldown
      const truoc2 = giu[giu.length - 2];
      if (!truoc2 || e.t - truoc2.t >= cooldown) {
        giu[giu.length - 1] = e;
      }
      continue;
    }
    if (dt >= cooldown) {
      giu.push(e);
    }
  }
  return giu;
}

export const DongCoSfx: React.FC<{
  suKien: SuKienSfxVao[];
  tMin?: number;
  tMax?: number;
  bat?: boolean;
}> = ({suKien, tMin = 0.2, tMax, bat = true}) => {
  const {fps, durationInFrames} = useVideoConfig();
  const lich = useMemo(
    () => (bat ? lapLichSfx(suKien, {tMin, tMax: tMax ?? durationInFrames / fps}) : []),
    [bat, suKien, tMin, tMax, durationInFrames, fps],
  );
  if (!bat || !lich.length) return null;
  return (
    <>
      {lich.map((e) => {
        const from = Math.max(0, Math.round(e.t * fps));
        const dur = Math.max(6, Math.round(e.thoiLuong * fps));
        if (from >= durationInFrames) return null;
        return (
          <Sequence key={e.id} from={from} durationInFrames={Math.min(dur, durationInFrames - from)} layout="none">
            <Audio src={staticFile(e.tep)} volume={e.volume} />
          </Sequence>
        );
      })}
    </>
  );
};
