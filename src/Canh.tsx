import React from 'react';
import {Audio, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {coChuCongThuc, laChuThuong, NHAN_HOOK, phanLoaiHinh} from './bocuc';
import {BienDoi} from './BienDoi';
import {ChuThich} from './ChuThich';
import {HookChu} from './HookChu';
import {coTheBienDoi, coTheCongDon, nhomHang} from './manim';
import {MinhHoa} from './MinhHoa';
import {PhuDe} from './PhuDe';
import {PhuDeTikTok} from './PhuDeTikTok';
import {kep} from './sankhau/donghieu';
import {KIEU_CHUYEN, NhoeHuong, trangThaiChuyen} from './sankhau/chuyendong';
import {DuLieuSanKhau, hopLeSanKhau, noiTiepSanKhau} from './sankhau/dulieu';
import {SanKhau, SK_H, SK_W, taoMocBuoc, taoMocBuocLoi} from './sankhau/SanKhau';
import {ChuBaTang, nhipBaTang, tachBaTang} from './dong/ChuBaTang';
import {cuaTron, DauBay, DiaCuaTron, LoeSang, mayQuay, QuyDao, SuKienMay, VienCuaTron} from './dong/DiemNhan';
import {BanKinh3D, chieuDung, chieuNam, CoChuSan, gocMayDung, gocMayNam, HinhDung3D, KhongGian3D, phanLoai3D, The3D, VAT_DUNG} from './dong/KhongGian';
import {LopHinh} from './sankhau/hinhtudo';
import {tinhGoc3D} from './sankhau/trangthai';
import {nhanCanh, TieuDeCanh} from './TieuDeCanh';
import {phaCua, ThanhBuoc} from './ThanhBuoc';
import {chuTrenMau, FONT, GIAO_DIEN, laMoi, MAU} from './theme';
import {Toan} from './Toan';
import {VuaKhung} from './VuaKhung';
import {boCucTheDe, coTheDe, DeBai, TheDeBai} from './TheDeBai';
import {VietTay} from './VietTay';
import {CanhProps, PhongCach} from './types';

export type HookThongTin = {chu: string; kieu: string; nhanManh: string[]};

// Dữ liệu sân khấu của một cảnh, đã nối tiếp các cảnh trước nếu cảnh đó "giu_san_khau".
// Sân khấu dự phòng: hình của cảnh hỏng/thiếu (đề lạ, AI viết sai dạng) -> nhãn neon lớn ghi tiêu đề cảnh, không để trống.
function sanKhauDuPhong(c: CanhProps): DuLieuSanKhau | null {
  const chu = (c.tieuDeCanh || c.chuThich[0] || '').trim();
  if (!chu) return null;
  return hopLeSanKhau({vat: [{id: 'du_phong', loai: 'nhan', x: 50, y: 50, noi_dung: chu.slice(0, 40), tu_khoa: c.tuKhoa, mau: 'xanh_la', buoc: 1}], hanh_dong: [{buoc: 2, vat: 'du_phong', kieu: 'sang'}]});
}

export function sanKhauCuaCanh(ds: CanhProps[], i: number): DuLieuSanKhau | null {
  const c = ds[i];
  if (!c) return null;
  if (c.minhHoa.loai !== 'san_khau') {
    // cảnh không có hình lẫn công thức: dùng sân khấu dự phòng cho khỏi trống
    const hinhCu = phanLoaiHinh(c.minhHoa.loai, c.minhHoa.moTa, c.minhHoa.duLieu);
    return !hinhCu && !c.noiDung.length && c.so > 1 ? sanKhauDuPhong(c) : null;
  }
  const d = hopLeSanKhau(c.minhHoa.duLieu) || sanKhauDuPhong(c);
  if (!d) return null;
  return c.giuSanKhau && i > 0 ? noiTiepSanKhau(sanKhauCuaCanh(ds, i - 1), d) : d;
}

// Khung kính mờ quanh sân khấu (như khung viền trong video mẫu): nền tối trong suốt, viền mảnh,
// bốn góc có nét ngoặc neon vẽ dần khi cảnh vào.
const KhungSan: React.FC<{w: number; h: number; p: number}> = ({w, h, p}) => {
  const L = 46;
  const e = 1 - Math.pow(1 - p, 3);
  const goc = (x: number, y: number, sx: number, sy: number) => `M${x + sx * L} ${y} L${x} ${y} L${x} ${y + sy * L}`;
  return (
    <div style={{position: 'absolute', left: '50%', top: '50%', width: w, height: h, transform: 'translate(-50%, -50%)', borderRadius: 30, background: 'rgba(6,16,20,0.38)', border: '2px solid rgba(255,255,255,0.07)', boxShadow: 'inset 0 0 60px rgba(0,0,0,0.25)', opacity: e}}>
      <svg width={w} height={h} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {[goc(6, 6, 1, 1), goc(w - 6, 6, -1, 1), goc(6, h - 6, 1, -1), goc(w - 6, h - 6, -1, -1)].map((d, i) => (
          <path key={i} d={d} stroke={i % 2 ? '#FF8A3D' : '#3BF29A'} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - e} style={{filter: `drop-shadow(0 0 6px ${i % 2 ? '#FF8A3D' : '#3BF29A'})`}} />
        ))}
      </svg>
    </div>
  );
};

// Bố cục dọc 1080x1920 theo video mẫu:
//   [nhãn cam + tiêu đề cảnh]  ->  [SÂN KHẤU: vật thật chuyển động]  ->  [công thức]  ->  [phụ đề TikTok]
// Khoảng ~360px dưới cùng và ~150px trên cùng để trống cho giao diện TikTok/Shorts.
const Y_DAU = 196;
const Y_SAN = 470;
const Y_PHU_DE = 1478;   // phụ đề thấp xuống một chút, nhường chỗ cho hình minh họa
const SAN_TOI_THIEU = 560;   // sân khấu (hình minh họa) luôn cao ít nhất chừng này: chữ/công thức tự thu gọn để nhường

export const Canh: React.FC<{
  canh: CanhProps;
  tieuDe: string;
  tongCanh: number;
  hook: HookThongTin;
  pc: PhongCach;
  sanKhau: DuLieuSanKhau | null;
  giuTruoc: boolean; // sân khấu nối tiếp cảnh trước: không chạy hiệu ứng vào
  giuSau: boolean; // cảnh sau nối tiếp sân khấu: không làm mờ sân khấu khi kết thúc
  cacBuoc?: string[]; // các pha của bài (thanh các bước)
  phaTruoc?: string; // pha của cảnh trước
  keoDai?: number; // số khung hình cảnh này còn ở lại để HÒA vào cảnh sau (chuyển cảnh chồng mờ, không bị khoảng trống)
  deBai?: DeBai | null; // thẻ ĐỀ BÀI (cảnh de_bai)
  theDeGiu?: boolean; // đã có cảnh de_bai trước: thẻ hiện sẵn đủ, không chạy lại
}> = ({canh, tieuDe, deBai, theDeGiu, tongCanh, hook, pc, sanKhau, giuTruoc, giuSau, cacBuoc = [], phaTruoc = '', keoDai = 0}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;

  const ketThuc = canh.soFrame + keoDai; // khung hình cuối cùng cảnh này còn hiện (gồm phần hòa vào cảnh sau)
  const ra = interpolate(frame, [ketThuc - 8, ketThuc], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  const giayAm = canh.cau.length ? canh.cau[canh.cau.length - 1].ket : 3;
  // bài hình học dựng bằng Manim: cảnh chỉ còn phần vỏ chung (tiêu đề, thanh bước, phụ đề, âm thanh); hình + công thức do Manim ghép đè
  const lopManim = GIAO_DIEN.manimLop;
  const kieu = lopManim ? null : sanKhau ? 'sankhau' : phanLoaiHinh(canh.minhHoa.loai, canh.minhHoa.moTa, canh.minhHoa.duLieu);
  const laMoDau = canh.so === 1;
  const laCuoi = canh.so === tongCanh;
  const coHinh = kieu !== null;
  const coHook = laMoDau && !!hook.chu;

  // ----- công thức -----
  const nCau = canh.cau.length;
  const nDong = canh.noiDung.length;
  const batDong = canh.noiDung.map((_, i) => (nCau ? canh.cau[Math.min(nCau - 1, Math.floor((i * nCau) / nDong))].bat + 0.05 : 0.4 + i * 0.8));
  // cảnh ĐỀ BÀI: thẻ "ĐỀ CHO / CẦN TÌM" thay cho dòng công thức (đề phải được nêu đủ trước khi vào mô phỏng)
  const theDe = !lopManim && canh.loai === 'de_bai' && coTheDe(deBai) ? deBai! : null;
  const hienCongThuc = !lopManim && !theDe && nDong > 0 && !(coHook && coHinh && nDong > 1);
  const kieuTB = canh.trinhBay;
  const dungBienDoi = kieuTB === 'bien_doi' && coTheBienDoi(canh.noiDung);
  const dungCongDon = (kieuTB === 'cong_don' || kieuTB === 'bien_doi') && !dungBienDoi && coTheCongDon(canh.noiDung);
  // có sân khấu thì công thức hiện sau khi hình đã dựng được một phần
  const treCT = coHinh ? Math.min(1.2, giayAm * 0.25) : 0.3;
  // nhịp hiện từng dòng: dòng CUỐI phải viết xong trước khi hết cảnh ít nhất 1,2 giây (người xem kịp đọc kết quả)
  const giayCanh = (canh.soFrame - (canh.leadFrame || 0)) / fps;
  const nhipToiDa = nDong > 1 ? (giayCanh - treCT - 0.9 - 1.2) / (nDong - 1) : 1.8;
  const nhipDong = Math.max(0.6, Math.min(1.8, Math.max(1.1, (giayAm - 0.3) / Math.max(1, nDong)), nhipToiDa));
  const thoiDiemDong = dungBienDoi || dungCongDon ? canh.noiDung.map((_, i) => treCT + i * nhipDong) : batDong.map((b) => Math.max(b, coHinh ? treCT : 0));
  const hang = dungCongDon ? nhomHang(canh.noiDung) : [];
  const khungCuoi = /dap_an|ket_qua/i.test(canh.loai);
  const coNote = canh.chuThich.length > 0;
  const nHang = !hienCongThuc ? 0 : dungBienDoi ? 1 : dungCongDon ? hang.length : nDong;

  // ----- phân chia chiều cao -----
  const dayVung = Y_PHU_DE - 30; // đáy vùng nội dung
  const coCTMax = coHinh ? 54 : 70;
  // cảnh ĐỀ BÀI có thẻ đề: bỏ dòng tiêu đề cảnh (thẻ đã nêu đề cho gì / cần tìm gì), hình được đẩy lên cao -> to hơn
  const anTieuDe = canh.loai === 'de_bai' && !!theDe && !coHook;
  const yNoiDungTam = coHook ? Y_SAN + 20 : anTieuDe ? 262 : Y_SAN;
  const caoNoteTho = coNote ? 40 + canh.chuThich.length * 56 : 0;
  const caoCT = hienCongThuc ? Math.min(coHinh ? Math.max(150, dayVung - yNoiDungTam - SAN_TOI_THIEU - caoNoteTho - 32) : 700, 70 + nHang * coCTMax * 1.95) : 0;
  // thẻ đề bài: tối đa phần còn lại sau khi chừa sân khấu ≥ 380px (không bao giờ tràn xuống phụ đề)
  const sanToiThieu = anTieuDe ? 620 : SAN_TOI_THIEU;   // cảnh đề bài: hình to hơn nữa (đã bỏ dòng tiêu đề)
  const caoTheMax = Math.max(300, Y_PHU_DE - 30 - yNoiDungTam - (coHinh ? sanToiThieu : 380) - 32 - (coNote ? 56 + canh.chuThich.length * 56 : 0));
  const caoNote = (coNote ? 40 + canh.chuThich.length * 56 : 0) + (theDe ? boCucTheDe(theDe, 960, caoTheMax).cao + (coNote ? 16 : 0) : 0);
  const yNoiDung = yNoiDungTam;
  const caoSan = Math.max(coHinh ? Math.min(sanToiThieu, dayVung - yNoiDung - 160) : 380, dayVung - yNoiDung - caoCT - caoNote - (caoCT ? 16 : 0) - (caoNote ? 16 : 0));
  const tiLe = Math.min(1.12, caoSan / SK_H, 1000 / SK_W);
  const lonHon = !coHinh;
  const coCT = Math.min(
    ...canh.noiDung.map((d) => coChuCongThuc(d, lonHon)),
    // dòng có phân số cao gấp ~2,3 lần cỡ chữ: chia chiều cao theo đúng hệ số để công thức không tràn xuống phụ đề
    Math.floor((Math.max(120, caoCT) - 60) / Math.max(1, nHang) / (canh.noiDung.some((d) => /\\d?frac|\\binom|\\sqrt/.test(d)) ? 2.35 : 1.9))
  );

  // chuyển cảnh THEO MẠCH BÀI: cùng một bước (ví dụ hai cảnh tính liên tiếp) thì hòa tan mềm; sang bước mới thì trôi lên nhẹ;
  // cái bẫy / đáp án mới phóng xuyên để tạo kịch tính. Không còn xoay vòng 4 kiểu bất kể nội dung (gây giật, khó chịu).
  const doiPha = laMoDau || phaCua(canh.loai) !== phaTruoc;
  const moi = laMoi();
  const mauNhan = GIAO_DIEN.nhan;
  // CHUYỂN CẢNH ĐA DẠNG, có chủ đích: sang PHẦN mới (đề bài -> mô phỏng -> lỗi sai...) dùng chuyển cảnh mạnh, xoay vòng nhiều kiểu;
  // các cảnh trong cùng một phần dùng chuyển cảnh nhẹ (cũng xoay vòng, không lặp một kiểu); cái bẫy / đáp án thì phóng xuyên kịch tính
  const KIEU_DOI_PHAN = ['quet_sang', 'tron_mo', 'day_ngang', 'lat_3d', 'zoom_xuyen', 'lat_ngang'];
  const KIEU_CUNG_PHAN = ['mo', 'nghieng', 'truot_len', 'luot_ngang', 'mo', 'truot_xuong'];
  const kieuTuDong = /bay/i.test(canh.loai) ? 'zoom_xuyen' : /dap_an|ket_qua/i.test(canh.loai) ? 'phong' : doiPha ? KIEU_DOI_PHAN[canh.so % KIEU_DOI_PHAN.length] : KIEU_CUNG_PHAN[canh.so % KIEU_CUNG_PHAN.length];
  const coCuaTron = moi && /diem_chot|y_tuong/i.test(canh.loai) && !giuTruoc;
  const kieuCC = coCuaTron ? 'mo' : canh.chuyenCanh && (KIEU_CHUYEN as readonly string[]).includes(canh.chuyenCanh) ? canh.chuyenCanh : kieuTuDong;
  const ccSan = trangThaiChuyen(kieuCC, frame, ketThuc, giuTruoc, giuSau);
  // độ nghiêng 3D hiện tại của sân khấu: khung chữ nhật mờ dần khi camera nghiêng để không gian 3D phủ toàn khung
  const tbCanh = sanKhau ? (moi ? taoMocBuocLoi(sanKhau.soBuoc, giayAm, canh.cau) : taoMocBuoc(sanKhau.soBuoc, giayAm)) : null;
  const g3c = sanKhau && tbCanh ? tinhGoc3D(sanKhau.gocDau, sanKhau.hanhDong, t, tbCanh) : {nghieng: 0, xoay: 0};
  const sinN3d = Math.sin((g3c.nghieng * Math.PI) / 180) + Math.min(0.5, Math.abs(g3c.xoay) / 60);
  const ccCT = trangThaiChuyen(kieuCC, frame - 4, ketThuc - 4);
  const tieuDeCanh = canh.tieuDeCanh;

  // ===== KHÔNG GIAN 3D TỰ ĐỘNG: hình nằm trên bàn kính có bề dày / thẻ lơ lửng =====
  // phần ĐỀ BÀI (mở đầu + đọc đề): hình PHẲNG 2D, vật chuyển động trên mặt phẳng; không xoay máy 3D (chỉ hộp chữ có hiệu ứng)
  const phan2D = /mo_dau|de_bai|hook|cau_hoi/.test(canh.loai);
  const kieu3D = moi && !phan2D ? phanLoai3D(sanKhau) : 'khong';
  // máy chỉ đổi góc ở mốc các bước của sân khấu (khớp lời giảng), góc do kịch bản chọn (goc_nhin) hoặc tự xoay vòng bộ góc
  const mocDoi3D = (kieu3D === 'nam' || kieu3D === 'dung') && sanKhau && tbCanh ? Array.from({length: Math.max(0, sanKhau.soBuoc - 1)}, (_, k) => Math.round(tbCanh(k + 2) * fps) + canh.leadFrame) : [];
  const gm = kieu3D === 'nam' ? gocMayNam(frame, canh.so, !giuTruoc, coHook || khungCuoi, mocDoi3D, canh.gocNhin || []) : null;
  const gd = kieu3D === 'dung' ? gocMayDung(frame, canh.so, !giuTruoc, mocDoi3D) : null;
  const vatDung = (gm || gd) && sanKhau ? sanKhau.vat.filter((v) => VAT_DUNG.includes(v.loai)).slice(0, 4) : [];
  // điểm sân khấu -> điểm sân khấu sau khi chiếu 3D: đặt CHÚ THÍCH (nhãn, số, ngoặc) phẳng đúng chỗ trên hình 3D
  const chieuSan = (sx: number, sy: number): [number, number] => {
    const p = gm ? chieuNam(sx - SK_W / 2, sy - SK_H / 2, SK_W, SK_H, gm.nghieng, gm.xoay, gm.lat) : gd ? chieuDung(sx - SK_W / 2, sy - SK_H / 2, gd.ry, gd.rx) : {x: sx - SK_W / 2, y: sy - SK_H / 2};
    return [SK_W / 2 + p.x, SK_H / 2 + p.y];
  };
  const idHinh = sanKhau ? sanKhau.vat.filter((v) => v.loai === 'hinh_tu_do').map((v) => v.id) : [];
  // lớp chú thích phẳng phủ lên hình 3D + các vật cần đọc rõ dựng đứng tại điểm chiếu
  const lopPhang = sanKhau && (gm || gd) ? (
    <>
      {idHinh.length ? (
        <LopHinh.Provider value={{chiChu: true, chieu: chieuSan, skW: SK_W, skH: SK_H}}>
          <div style={{position: 'absolute', inset: 0}}>
            <SanKhau du={sanKhau} giayAm={giayAm} cau={canh.cau} chiVat={idHinh} amThanh={false} />
          </div>
        </LopHinh.Provider>
      ) : null}
      {vatDung.map((v) => {
        const sx = (v.x / 100) * SK_W, sy = (v.y / 100) * SK_H;
        const [px, py] = chieuSan(sx, sy);
        return (
          <div key={v.id} style={{position: 'absolute', inset: 0, transform: `translate(${px - sx}px, ${py - sy}px)`}}>
            <SanKhau du={sanKhau} giayAm={giayAm} cau={canh.cau} chiVat={[v.id]} amThanh={false} />
          </div>
        );
      })}
    </>
  ) : null;

  // ===== BỘ HIỆU ỨNG MỚI: chữ 3 tầng, đập zoom, con dấu BẪY, lóe sáng đáp án =====
  const baTang = coHook ? tachBaTang(hook.chu, hook.nhanManh) : tachBaTang(tieuDeCanh || (laMoDau ? tieuDe : ''), canh.tuKhoa);
  const suKien: SuKienMay[] = [];
  let fDau = -1; // khung hình đóng dấu BẪY
  let loe: {f: number; x: number; y: number} | null = null;
  if (moi) {
    if (coHook && baTang.chot) suKien.push({f: canh.leadFrame + nhipBaTang(baTang.dan, baTang.chot).xongChot - 6, kieu: 'dap', manh: 1.1});
    if (/bay/i.test(canh.loai)) {
      const h = sanKhau && tbCanh ? sanKhau.hanhDong.find((x) => (x.kieu === 'loai_bo' || x.kieu === 'rung') && x.buoc > 0) : undefined;
      fDau = Math.round((h && tbCanh ? tbCanh(h.buoc) : giayAm * 0.55) * fps) + canh.leadFrame;
      suKien.push({f: fDau + 2, kieu: 'rung'}, {f: fDau, kieu: 'dap', manh: 0.6});
    }
    if (khungCuoi) {
      const sd = sanKhau ? sanKhau.vat.find((v) => v.loai === 'so_dem') : undefined;
      if (sd && tbCanh) {
        const dx = (sd.x / 100) * SK_W - SK_W / 2;
        const dy = (sd.y / 100) * SK_H - SK_H / 2;
        const p = gm ? chieuNam(dx, dy, SK_W, SK_H, gm.nghieng, gm.xoay, gm.lat) : {x: dx, y: dy};
        const x = 540 + p.x * tiLe;
        const y = yNoiDung + caoSan / 2 + p.y * tiLe;
        loe = {f: Math.round((tbCanh(sd.buoc) + 1.25) * fps) + canh.leadFrame, x, y};
      } else if (hienCongThuc && nDong) {
        loe = {f: Math.round((thoiDiemDong[nDong - 1] + 0.7) * fps), x: 540, y: coHinh ? yNoiDung + caoSan + 16 + caoCT / 2 : 960};
      }
      if (loe) suKien.push({f: loe.f, kieu: 'dap', manh: 1});
    }
  }
  const may = moi ? mayQuay(frame, ketThuc, suKien, /bai_hoc|ket_luan/i.test(canh.loai)) : {s: 1, x: 0, y: 0};
  const goc_y = coHinh ? yNoiDung + caoSan / 2 : 960;
  const iris = coCuaTron ? cuaTron(frame) : {p: 1};
  const nhan = coHook ? (NHAN_HOOK[hook.kieu] || '').replace(/^[^A-Za-zÀ-ỹ]+/, '') : nhanCanh(canh.loai, canh.nhan);

  return (
    <>
    {coCuaTron ? <DiaCuaTron f={frame} /> : null}
    {/* chuyển cảnh "quét sáng": một vệt sáng màu nhấn chạy ngang khung đúng lúc nội dung lộ ra */}
    {kieuCC === 'quet_sang' && !giuTruoc && frame < 14 ? (
      <div style={{position: 'absolute', top: 0, bottom: 0, left: `${-15 + (frame / 12) * 120}%`, width: 90, transform: 'skewX(-14deg)', pointerEvents: 'none', zIndex: 5,
        background: `linear-gradient(90deg, transparent, ${mauNhan}55, #ffffffaa, ${mauNhan}55, transparent)`, opacity: Math.min(1, (14 - frame) / 5)}} />
    ) : null}
    <div style={{position: 'absolute', inset: 0, fontFamily: FONT, transformOrigin: `540px ${goc_y}px`, transform: moi ? `translate(${may.x}px, ${may.y}px) scale(${may.s})` : undefined}}>
      {/* Sân khấu */}
      {coHinh ? (
        <NhoeHuong nx={ccSan.nx} ny={ccSan.ny} style={{position: 'absolute', left: 0, right: 0, top: yNoiDung, height: caoSan, display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: ccSan.mo, transform: `perspective(1600px) translate(${ccSan.x}px, ${ccSan.y}px) rotateX(${ccSan.rx}deg) rotateY(${ccSan.ry}deg) rotateZ(${ccSan.rz}deg) scale(${ccSan.s})`, clipPath: ccSan.clip}}>
          {moi && kieu3D !== 'nam' ? <QuyDao cx={540} cy={caoSan / 2} R={Math.min(caoSan, 1000) * 0.47} mau={mauNhan} mo={(giuTruoc ? 1 : kep((frame - 3) / 14)) * (1 - kep(sinN3d * 1.8))} /> : null}
          {!moi && pc.khungSanKhau !== false ? <KhungSan w={Math.min(1040, SK_W * tiLe + 40)} h={Math.min(caoSan - 6, SK_H * tiLe + 24)} p={(giuTruoc ? 1 : kep((frame - 3) / 14)) * (1 - kep(sinN3d * 1.8))} /> : null}
          <CoChuSan.Provider value={Math.max(1.05, Math.min(1.6, 1.05 / tiLe))}>
          <div style={{width: SK_W, height: SK_H, transform: `scale(${tiLe})`, flexShrink: 0}}>
            {sanKhau && gm ? (
              <KhongGian3D.Provider value={{nam: true, doDay: 1, xoay: gm.xoay}}>
                <LopHinh.Provider value={{boChu: true}}>
                  <BanKinh3D w={SK_W} h={SK_H} mau={mauNhan} nghieng={gm.nghieng} xoay={gm.xoay} lat={gm.lat} nen={<QuyDao cx={SK_W / 2} cy={SK_H / 2} R={Math.min(SK_W, SK_H) * 0.47} mau={mauNhan} mo={giuTruoc ? 1 : kep((frame - 3) / 14)} />}>
                    <SanKhau du={sanKhau} giayAm={giayAm} cau={canh.cau} boVat={vatDung.map((v) => v.id)} />
                  </BanKinh3D>
                </LopHinh.Provider>
                {lopPhang}
              </KhongGian3D.Provider>
            ) : sanKhau && gd ? (
              <KhongGian3D.Provider value={{nam: true, doDay: 1, xoay: 0, huong: gd.huong}}>
                <LopHinh.Provider value={{boChu: true}}>
                  <HinhDung3D ry={gd.ry} rx={gd.rx} h={SK_H}>
                    <SanKhau du={sanKhau} giayAm={giayAm} cau={canh.cau} boVat={vatDung.map((v) => v.id)} />
                  </HinhDung3D>
                </LopHinh.Provider>
                {lopPhang}
              </KhongGian3D.Provider>
            ) : sanKhau && kieu3D === 'the' ? (
              <The3D f={frame} vaoMoi={!giuTruoc} h={SK_H}>
                <SanKhau du={sanKhau} giayAm={giayAm} cau={canh.cau} />
              </The3D>
            ) : sanKhau ? (
              <SanKhau du={sanKhau} giayAm={giayAm} cau={moi ? canh.cau : undefined} phang={phan2D} />
            ) : kieu ? (
              <div style={{width: 960, height: 640, marginTop: (SK_H - 640) / 2}}>
                <MinhHoa kieu={kieu} mh={canh.minhHoa} giayAm={giayAm} />
              </div>
            ) : null}
          </div>
          </CoChuSan.Provider>
        </NhoeHuong>
      ) : null}

      {/* Chú thích + công thức */}
      {lopManim ? null : (
      <NhoeHuong nx={ccCT.nx} ny={ccCT.ny} style={{position: 'absolute', left: 50, right: 50, top: coHinh ? yNoiDung + caoSan + 16 : Y_SAN, bottom: 1920 - dayVung, display: 'flex', flexDirection: 'column', justifyContent: coHinh ? 'flex-start' : 'center', alignItems: 'center', gap: 16, opacity: frame < 4 ? 0 : ccCT.mo, transform: `perspective(1600px) translate(${ccCT.x}px, ${ccCT.y}px) rotateX(${ccCT.rx}deg) rotateY(${ccCT.ry}deg) rotateZ(${ccCT.rz}deg) scale(${ccCT.s})`, clipPath: ccCT.clip}}>
        <VuaKhung maxW={980} maxH={dayVung - (coHinh ? yNoiDung + caoSan + 16 : Y_SAN)} goc="center top">
        {theDe ? (
          <TheDeBai de={theDe} giuNguyen={theDeGiu} caoToiDa={caoTheMax} moc={(() => {
            // mỗi dữ kiện hiện đúng lúc lời đọc tới (chia đều theo các câu), "cần tìm" ở câu cuối
            const n = theDe.cho.length + (theDe.tim ? 1 : 0);
            return Array.from({length: n}, (_, i) => (nCau ? canh.cau[Math.min(nCau - 1, Math.floor((i * nCau) / n))].bat + 0.1 : 0.4 + i * 0.9));
          })()} />
        ) : null}
        {coNote ? <ChuThich dong={canh.chuThich} bd={Math.max(0.6, giayAm * 0.45)} /> : null}
        {hienCongThuc ? (
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: coHinh ? '16px 28px' : khungCuoi ? '14px 26px' : 0, borderRadius: 24,
            background: coHinh ? 'linear-gradient(165deg, rgba(10,24,26,0.84), rgba(6,14,18,0.9))' : khungCuoi ? 'radial-gradient(ellipse at 50% 50%, rgba(59,242,154,0.12), rgba(6,14,18,0.62) 76%)' : 'transparent',
            border: coHinh ? `2px solid ${khungCuoi ? 'rgba(59,242,154,0.55)' : `${mauNhan}48`}` : khungCuoi ? '2px solid rgba(59,242,154,0.42)' : 'none',
            boxShadow: coHinh || khungCuoi ? '0 14px 36px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.1)' : 'none',
            opacity: kep((t - treCT + 0.3) * 3)}}>
            {dungBienDoi ? (
              <BienDoi dong={canh.noiDung} batDong={thoiDiemDong} t={t} co={coCT} maxWidth={920} khungCuoi={khungCuoi} mauGoc={MAU.vang} mauNhay="#FFD27A" />
            ) : dungCongDon ? (
              hang.map((h, r) => (
                <BienDoi key={r} dong={h.dong} batDong={h.chiSo.map((i) => thoiDiemDong[i])} t={t} co={coCT} maxWidth={920} khungCuoi={khungCuoi && r === hang.length - 1} mauGoc={MAU.vang} mauNhay="#FFD27A" can="trai" />
              ))
            ) : (
              canh.noiDung.map((d, i) => {
                const bd = thoiDiemDong[i];
                // viết tay: thời gian viết theo độ dài dòng (0,5-1,3 giây), bút chì chạy theo mép chữ
                const dai = Math.min(1.3, Math.max(0.5, d.replace(/\\[a-zA-Z]+/g, 'x').length * 0.045));
                const p = t < bd ? 0 : kep((t - bd) / dai);
                return (
                  <div key={i} style={{opacity: p > 0 ? 1 : 0, maxWidth: 960, textAlign: 'center', padding: '2px 16px'}}>
                    <VietTay p={p} but={!moi && pc.butChi !== false} conTro={moi ? mauNhan : undefined} tho={t < bd ? 0 : (t - bd) / dai}>
                      <Toan tex={d} size={Math.min(coCT * 1.08, coChuCongThuc(d, lonHon))} maxWidth={900} color={laChuThuong(d) ? '#ffffff' : MAU.vang} />
                    </VietTay>
                  </div>
                );
              })
            )}
          </div>
        ) : null}
        </VuaKhung>
      </NhoeHuong>
      )}

      {/* Đầu cảnh: nhãn + tiêu đề (hoặc câu hook ở cảnh 1) */}
      <div style={{position: 'absolute', left: 40, right: 40, top: moi ? (coHook ? 200 : 250) : Y_DAU, height: Y_SAN - (moi ? (coHook ? 200 : 250) : Y_DAU) - (moi ? 4 : 10), display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: moi ? 'center' : undefined, opacity: ra}}>
        {moi ? (
          anTieuDe ? null : (
            <VuaKhung maxW={1000} maxH={Y_SAN - (coHook ? 200 : 250) - 8}>
              <ChuBaTang dan={baTang.dan} chot={baTang.chot} duoi={baTang.duoi} mau={mauNhan} tre={coHook ? canh.leadFrame : 0} coToiDa={coHook ? 128 : 102} noi={coHook || khungCuoi} />
            </VuaKhung>
          )
        ) : coHook ? (
          <>
            {nhan ? <TieuDeCanh nhan={nhan} chu="" tuKhoa="" /> : null}
            <HookChu chu={hook.chu} nhanManh={hook.nhanManh} kieu={hook.kieu} lead={canh.leadFrame} />
          </>
        ) : (
          <TieuDeCanh nhan={nhan} chu={tieuDeCanh || (laMoDau ? tieuDe : '')} tuKhoa={canh.tuKhoa} inHoa={pc.tieuDeInHoa !== false}
            dau={pc.thanhBuoc !== false && cacBuoc.length >= 3 && phaCua(canh.loai) ? <ThanhBuoc cacBuoc={cacBuoc} hienTai={phaCua(canh.loai)} moi={phaCua(canh.loai) !== phaTruoc} /> : undefined} />
        )}
      </div>

      {/* Phụ đề */}
      {pc.phuDe ? (
        <div style={{position: 'absolute', left: 60, right: 60, top: Y_PHU_DE, height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: frame > canh.soFrame - 2 ? ra : 1}}>
          {pc.kieuNen !== 'luoi' && pc.kieuNen !== 'luoi_phang' && pc.kieuNen !== 'gradient' ? <PhuDeTikTok cau={canh.cau} t={t} kieu={pc.kieuPhuDe} mauHop={moi ? mauNhan : pc.mauPhuDe} chuHop={moi ? chuTrenMau(mauNhan) : '#ffffff'} /> : <PhuDe cau={canh.cau} t={t} co={42} />}
        </div>
      ) : null}

      {/* Âm thanh của cảnh */}
      {/* tiếng chuyển chỉ khi SANG BƯỚC MỚI và rất nhẹ (cảnh nối tiếp cùng bước thì im, để lời giảng liền mạch) */}
      {!giuTruoc && doiPha && !laMoDau && !khungCuoi ? (
        <Sequence from={0} durationInFrames={30} layout="none">
          <Audio src={staticFile('sfx/swoosh.wav')} volume={0.13} />
        </Sequence>
      ) : null}
      {khungCuoi ? (
        <Sequence from={0} durationInFrames={60} layout="none">
          <Audio src={staticFile('sfx/boom.wav')} volume={0.26} />
        </Sequence>
      ) : null}
      {hienCongThuc
        ? canh.noiDung.map((_, i) => {
            const tai = Math.round(thoiDiemDong[i] * fps);
            const cuoi = (laCuoi || khungCuoi) && i === nDong - 1;
            // tiếng "tách" khi hiện dòng: nhỏ, và bỏ qua nếu dòng trước vừa hiện (dồn tiếng gây khó chịu)
            if (!cuoi && i > 0 && thoiDiemDong[i] - thoiDiemDong[i - 1] < 0.6) return null;
            return (
              <Sequence key={`sfx${i}`} from={tai} durationInFrames={cuoi ? 70 : 20} layout="none">
                <Audio src={staticFile(cuoi ? 'sfx/ting.wav' : 'sfx/click.wav')} volume={cuoi ? 0.4 : 0.1} />
              </Sequence>
            );
          })
        : null}
      {canh.audio ? (
        <Sequence from={canh.leadFrame} layout="none">
          <Audio src={staticFile(canh.audio)} volume={1} />
        </Sequence>
      ) : null}
      {/* con dấu BẪY! đóng lên sân khấu (rung theo máy quay) */}
      {!lopManim && fDau >= 0 && frame >= fDau ? (
        <div style={{position: 'absolute', left: 540 + 150, top: yNoiDung + Math.min(caoSan * 0.26, 220), opacity: ra}}>
          <DauBay f={frame - fDau} />
        </div>
      ) : null}
    </div>
    {coCuaTron ? <VienCuaTron p={iris.p} mau={mauNhan} /> : null}
    {loe ? <LoeSang f={frame - loe.f} x={loe.x} y={loe.y} mau={mauNhan} /> : null}
    {fDau >= 0 ? (
      <Sequence from={fDau} durationInFrames={50} layout="none">
        <Audio src={staticFile('sfx/sai.wav')} volume={0.3} />
        <Audio src={staticFile('sfx/boom.wav')} volume={0.22} />
      </Sequence>
    ) : null}
    {loe ? (
      <Sequence from={loe.f} durationInFrames={60} layout="none">
        <Audio src={staticFile('sfx/ting.wav')} volume={0.35} />
      </Sequence>
    ) : null}
    </>
  );
};
