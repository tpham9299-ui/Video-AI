import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import katex from 'katex';
import {dungImXacSuat} from './dung_im_xs.mjs';

const RONG = 1080, CAO = 1920, LE = 8;
const HAN_CHO_MS = 7000;

export function texHopLe(s) {
  const t = String(s || '').trim().replace(/^\$+|\$+$/g, '');
  if (!t || t.length >= 60) return false;
  try {
    katex.renderToString(t, {throwOnError: true, strict: false});
    return true;
  } catch (_e) {
    return false;
  }
}

export function soiHop(cacHop, frame, canh) {
  const hop = cacHop.filter(h => h.opacity > 0.15 && h.w > 0 && h.h > 0);
  const loi = [];
  const goiTen = h => h.text ? h.nhan + ' [' + h.text + ']' : h.nhan;
  const bao = (loai, a, b, chi_tiet) => loi.push({
    frame, canh, loai, phan_tu_1: goiTen(a), phan_tu_2: b ? goiTen(b) : null, chi_tiet,
  });
  const px = n => Math.round(n * 10) / 10;
  for (const [i, a] of hop.entries()) {
    const {x, y, w, h} = a;
    if (x < LE || y < LE || x + w > RONG - LE || y + h > CAO - LE) {
      bao('TRAN_KHUNG', a, null, 'Biên (trái, trên, phải, dưới) = ' + [x, y, x + w, y + h].map(px).join(', ') + ' px');
    } else if (a.cat) {
      bao('TRAN_KHUNG', a, null, a.cat);
    }
    for (const b of hop.slice(i + 1)) {
      if (a.cha?.includes(b.id) || b.cha?.includes(a.id)) continue;
      const ngang = Math.min(x + w, b.x + b.w) - Math.max(x, b.x);
      const doc = Math.min(y + h, b.y + b.h) - Math.max(y, b.y);
      if (ngang <= 0 || doc <= 0) continue;
      const tyLe = ngang * doc / Math.min(w * h, b.w * b.h);
      if (tyLe > 0.18 || (doc > 8 && ngang > 12)) {
        bao('DE_CHU', a, b, 'Vùng giao ' + px(ngang) + '×' + px(doc) + ' px (' + px(tyLe * 100) + '% ô nhỏ hơn)');
      }
    }
  }
  return loi;
}

// Kiểm tra DOM gộp từ kiem_duyet.mjs trong cùng 1 phiên Chromium Cửa 2:
// TEX_THO, KATEX_LOI, thuong_hieu (tên kênh cũ / tiêu đề intro tràn), t2_trong (THUC_TE ngắn).
export function soiDomPhu(dom, {frame = 0, canh = '', thucTe = false, boCuc = ''} = {}) {
  const loi = [];
  if (!dom || typeof dom !== 'object') return loi;
  const daCo = new Set();
  const them = (loai, pt1, chiTiet) => {
    const k = loai + '|' + pt1 + '|' + chiTiet;
    if (daCo.has(k)) return;
    daCo.add(k);
    loi.push({frame, canh, loai, phan_tu_1: pt1, phan_tu_2: null, chi_tiet: chiTiet});
  };
  for (const raw of dom.texTho || []) {
    const s = String(raw || '').trim();
    if (s) them('TEX_THO', 'DOM_Text', 'Hiện mã TeX thô trên màn hình: "' + s.slice(0, 60) + '"');
  }
  for (const raw of dom.katexLoi || []) {
    const s = String(raw || '').trim();
    if (s && !texHopLe(s)) them('KATEX_LOI', 'KaTeX', 'Công thức sai cú pháp LaTeX: "' + s.slice(0, 60) + '"');
  }
  if (boCuc === '4tang') {
    if (dom.kenhCu) them('thuong_hieu', 'Brand', 'Còn tên kênh cũ trên khung hình');
    if (dom.tranIntro) them('TRAN_KHUNG', 'intro_tieu_de', 'Tiêu đề Intro tràn vùng an toàn SAFE_ZONE_TIKTOK');
  }
  if (thucTe && dom.coVungT2 && dom.hinhT2 === false && /^(Bước |Nội dung)/.test(String(canh))) {
    them('t2_trong', 'Tang2', 'Không thấy hình minh họa hợp lệ trong vùng sân khấu T2');
  }
  return loi;
}

export function chonFrame(p, comp) {
  const fps = comp.fps;
  const lechBia = p.anhBiaDau ? 1 : 0;
  const lech = lechBia + (p.thuongHieu ? p.intro?.lech || 0 : 0);
  const canh = p.canh || [];
  const ket = p.outro?.batDau ?? comp.durationInFrames - lech;
  const k4 = p.khung4tang;
  const mocCau = k4?.mocCau || p.hinhPhang?.mocCau;
  const coIntroDuPhong = p.boCuc === '4tang' && !k4?.khongGian && !p.hinhPhang && !!k4?.buoc?.length;
  const G = mocCau || coIntroDuPhong ? Math.max(3.6, Math.min(mocCau?.giay || 5, 5, ket / fps * 0.4)) * fps : 0;
  const mau = new Map();
  const them = (f, ten) => {
    const frame = Math.max(0, Math.min(comp.durationInFrames - 1, Math.floor(f)));
    if (!mau.has(frame)) mau.set(frame, {frame, canh: ten});
  };
  const giua = (a, b) => (a + b) / 2;
  const bat = Math.ceil(G);
  const canhChot = canh.find(c => /^(dap_an|ket_qua|ket_luan|bai_hoc)$/.test(c.loai) && c.batDau < ket);
  const mocChot = k4?.tCongBo ?? p.hinhPhang?.moc_cong_bo;
  const chot = Math.min(ket - 1, Math.max(bat, Math.round(mocChot == null ? canhChot?.batDau ?? ket * 0.85 : mocChot * fps)));
  // Khung giữa Intro của bài có chữ cần đo, kể cả khi đứng sau Intro thương hiệu.
  if (G) them(lech + G / 2, 'Intro');
  else them(lech + Math.min(ket, canh[0]?.soFrame || fps) / 2, 'Intro');
  const mocBuoc = (k4?.buoc?.length ? k4.buoc.map(b => [Math.round(b.t * fps), b.tieu_de || b.nhan])
    : (p.hinhPhang?.dong_giai || []).map((b, i) => [Math.round((b.dong?.[0]?.t ?? i * 6) * fps), b.tieu_de]));
  const moc = mocBuoc.length ? mocBuoc : canh.map(c => [c.batDau, c.tieuDeCanh || c.loai]);
  const buoc = moc.map(([t, ten], i) => ({
    a: Math.max(bat, t), b: Math.min(chot, moc[i + 1]?.[0] ?? chot), ten: 'Bước ' + (i + 1) + (ten ? ' · ' + ten : ''),
  })).filter(b => b.b > b.a);
  const n = Math.min(3, buoc.length);
  for (let i = 0; i < n; i++) {
    const b = buoc[Math.round(i * (buoc.length - 1) / Math.max(1, n - 1))];
    them(lech + giua(b.a, b.b), b.ten);
  }
  if (n < 2 && chot > bat + 3) {
    for (const tiLe of [1 / 3, 2 / 3]) {
      if (mau.size >= 3) break;
      them(lech + bat + (chot - bat) * tiLe, 'Nội dung');
    }
  }
  them(lech + giua(chot, Math.min(ket, Math.max(chot + fps, (canhChot?.batDau || 0) + (canhChot?.soFrame || 0)))), 'Kết luận');
  if (p.outro) {
    // CTA xuất hiện sau ba dòng tóm tắt, thường muộn hơn giữa Outro.
    const sauCTA = Math.max(p.outro.soFrame * 0.8, 3.2 * fps);
    them(lech + ket + Math.min(p.outro.soFrame - 1, sauCTA), 'Outro');
  }
  return [...mau.values()].sort((a, b) => a.frame - b.frame);
}

// Hàm này chạy trong Chromium, cùng viewport với composition Video (Cửa 2: đo hộp va chạm + DOM bổ sung trong 1 phiên duy nhất).
async function doHopVaDomTrongTrang(opts) {
  await document.fonts.ready;
  const ds = [...document.querySelectorAll('[data-va-cham]')];
  const ids = new Map(ds.map((e, i) => [e, i]));
  const cat = /^(hidden|clip|auto|scroll)$/;
  const hop = ds.flatMap((e, id) => {
    const {x, y, width: w, height: h} = e.getBoundingClientRect();
    const text = (e.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text || !w || !h || getComputedStyle(e).visibility !== 'visible') return [];
    let opacity = 1;
    const cha = [];
    let biCat = '';
    for (let q = e; q; q = q.parentElement) {
      const css = getComputedStyle(q);
      opacity *= Number(css.opacity);
      if (q === e) {
        const dw = q.scrollWidth - q.clientWidth, dh = q.scrollHeight - q.clientHeight;
        const catX = q.clientWidth > 0 && (cat.test(css.overflowX) || q.style.width || q.style.maxWidth) && dw > 4;
        const catY = q.clientHeight > 0 && (cat.test(css.overflowY) || q.style.height || q.style.maxHeight) && dh > 4;
        if (catX || catY) biCat = 'Chữ vượt khối cố định' + (catX ? ' ngang ' + dw + ' px' : '') + (catY ? ' dọc ' + dh + ' px' : '');
      } else {
        if (ids.has(q)) cha.push(ids.get(q));
        // Nhãn SVG có thể còn trong khung video nhưng đã bị viewport sân khấu cắt mất.
        if (!biCat && (cat.test(css.overflowX) || cat.test(css.overflowY))) {
          const r = q.getBoundingClientRect();
          const ngang = cat.test(css.overflowX) ? Math.max(r.left - x, x + w - r.right) : 0;
          const doc = cat.test(css.overflowY) ? Math.max(r.top - y, y + h - r.bottom) : 0;
          if (ngang > 4 || doc > 4) biCat = 'Nhãn bị khối bao cắt' + (ngang > 4 ? ' ngang ' + Math.round(ngang) + ' px' : '') + (doc > 4 ? ' dọc ' + Math.round(doc) + ' px' : '');
        }
      }
    }
    if (opacity <= 0.15) return [];
    return [{id, nhan: e.dataset.vaCham, text: text.slice(0, 90), x, y, w, h, opacity, cha, cat: biCat}];
  });

  // Phần đo DOM gộp từ kiem_duyet.mjs (TEX_THO, KATEX_LOI, thương hiệu, T2 có hình, shape Xác suất)
  const doMo = (el) => {
    let m = 1;
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden') return 0;
      m *= Number(cs.opacity || 1);
    }
    return m;
  };
  const boQua = (el) => {
    for (let e = el; e; e = e.parentElement) {
      if (e.getAttribute && e.getAttribute('data-kd-bo') === '1') return true;
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden') return true;
    }
    return false;
  };

  const texTho = [];
  const katexLoi = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const chu = (n.textContent || '').replace(/\s+/g, ' ').trim();
    const cha = n.parentElement;
    if (!chu || !cha || boQua(cha) || cha.closest('.katex')) continue;
    if (cha.closest('svg') && cha.tagName.toLowerCase() !== 'text' && cha.tagName.toLowerCase() !== 'tspan') continue;
    if (doMo(cha) < 0.55) continue;
    if (/\\[a-zA-Z]{2,}|\\[{}]|\$[^$]*\$|\^\{|_\{|\\\\/.test(chu)) texTho.push(chu.slice(0, 60));
  }
  document.querySelectorAll('.katex-error, [data-tex-loi]').forEach((e) => {
    if (!boQua(e) && doMo(e) > 0.55) {
      const v = e.getAttribute('data-tex-loi');
      katexLoi.push((v === '1' ? e.textContent || '' : v || e.textContent || '').slice(0, 60));
    }
  });

  const tang = document.querySelector('[data-vung="t2"]');
  const coVungT2 = !!tang && doMo(tang) > 0.15;
  let hinhT2 = true;
  if (opts?.kiemT2 && coVungT2) {
    const coSvg = [...tang.querySelectorAll('path,polygon,polyline,line,circle,ellipse,rect')].some((el) => {
      if (el.closest('defs,clipPath,mask,.katex,[data-xung-t2],[data-lop="minh-hoa"],[data-san-khau-2d="tu_duy_dai_so"]')) return false;
      if (doMo(el) < 0.12) return false;
      const cs = getComputedStyle(el);
      const to = el.tagName !== 'line' && cs.fill !== 'none' && Number(cs.fillOpacity) > 0.1;
      if (!to && (cs.stroke === 'none' || Number(cs.strokeOpacity) < 0.1 || parseFloat(cs.strokeWidth) <= 0)) return false;
      const r = el.getBoundingClientRect();
      return Math.hypot(r.width, r.height) >= 40;
    });
    const coMedia = [...tang.querySelectorAll('canvas,img')].some((el) => {
      if (doMo(el) < 0.12) return false;
      const r = el.getBoundingClientRect();
      return r.width >= 40 && r.height >= 30;
    });
    hinhT2 = coSvg || coMedia;
  }

  let shape = '';
  if (opts?.doXacSuat && tang) {
    const objects = tang.querySelectorAll('[data-xs-object], [data-sk2d^="nut_"], [data-sk2d="vuong"] > div, [data-sk2d="tach_giao"], [data-sk2d^="cot_"]');
    const nodes = objects.length ? objects : tang.querySelectorAll('svg path, svg circle, svg ellipse, svg rect, svg polygon, svg line');
    shape = [...nodes].filter((el) => !el.closest('defs,clipPath,mask,.katex,[data-xung-t2]') && doMo(el) > 0.15)
      .map((el) => {
        const r = el.getBoundingClientRect();
        return [el.tagName, ...[r.x, r.y, r.width, r.height].map(v => Math.round(v / 12)), Math.round(doMo(el) * 3), getComputedStyle(el).fill].join(',');
      }).join('|');
  }

  const tenTH = String(opts?.tenThuongHieu || 'Story Math');
  const chuCu = (document.body.innerText || '').split(tenTH + ' • Tư duy Xác suất').join('');
  const kenhCu = /@tuduyxacsuat|toán thầy trí|(?:^|\n|kênh |theo dõi )(?:tư duy toán|tư duy xác suất)(?=$|[.!\n])/im.test(chuCu);
  const tranIntro = [...document.querySelectorAll('[data-intro-title]')].some((el) => {
    if (doMo(el) <= 0.15) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && (r.left < 8 || r.right > 1072 || r.top < 8 || r.bottom > 1912);
  });

  return {hop, dom: {texTho, katexLoi, coVungT2, hinhT2, shape, kenhCu, tranIntro}};
}

export function chotBaoCao(loi, {boQua = '', soFrame = 0, soHop = 0} = {}) {
  const ds = [...loi];
  if (!boQua && soHop === 0) {
    ds.push({
      frame: 0,
      canh: 'Toàn video',
      loai: 'GIAO_DIEN_CU_KHONG_HOP_LE',
      phan_tu_1: 'Khung4Tang',
      phan_tu_2: null,
      chi_tiet: 'Đo được 0 hộp data-va-cham trong ' + soFrame + ' frame mẫu — giao diện cũ không hợp lệ',
    });
  }
  return {dat: ds.length === 0, loi: ds};
}

function loiChromium(e) {
  return /(?:browser|target|session|connection) (?:has been |is )?(?:closed|disconnected)|page crash|failed to launch|browser process|ERR_INSUFFICIENT_RESOURCES/i.test(String(e));
}

async function chay(tepProps, tepRa) {
  const batDau = performance.now();
  const inputProps = JSON.parse(await fs.readFile(tepProps, 'utf8'));
  if (!Array.isArray(inputProps.canh) || !Number.isFinite(inputProps.tongFrame)) throw new Error('Props thiếu canh hoặc tongFrame');
  const {openBrowser, selectComposition, RenderInternals} = await import('@remotion/renderer');
  const {bundle} = await import('@remotion/bundler');
  const {NoReactInternals} = await import('remotion/no-react');
  // Remotion 4.0.543 dùng hai hàm này khi render khung. Tái dùng một trang để seek
  // nhiều mốc, đo trực tiếp DOM (va chạm + TeX thô + KaTeX + T2 + thương hiệu) trong 1 lần mở Chromium duy nhất.
  const require = createRequire(import.meta.url);
  const dist = path.dirname(require.resolve('@remotion/renderer'));
  const {makePage} = require(path.join(dist, 'make-page.js'));
  const {seekToFrame} = require(path.join(dist, 'seek-to-frame.js'));
  let browser, tam, server, comp;
  const loi = [];
  const xsSamples = [];
  let boQua, soFrame = 0, soHop = 0;
  const mon = String(inputProps.mon || (/^T[TI]\d/i.test(inputProps.id || '') ? 'THUC_TE' : '')).toUpperCase();
  const dai10p = inputProps.kieu_video === 'DAI_10_PHUT' || /-10P$/i.test(String(inputProps.id || ''));
  const thucTe = mon === 'THUC_TE' && !dai10p && inputProps.boCuc === '4tang';
  const xsNgan = mon === 'XAC_SUAT' && !dai10p && inputProps.boCuc === '4tang';
  const lech = (inputProps.anhBiaDau ? 1 : 0) + (inputProps.thuongHieu ? inputProps.intro?.lech || 0 : 0);
  try {
    try {
      browser = await openBrowser('chrome', {browserExecutable: process.env.TRINH_DUYET || null, chromiumOptions: {gl: 'swangle'}, logLevel: 'error'});
    } catch (e) {
      boQua = 'Chromium không khởi chạy được: ' + e.message;
    }
    if (browser) {
      tam = await fs.mkdtemp(path.join(os.tmpdir(), 'soi-chu-'));
      const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts'), outDir: tam, symlinkPublicDir: true});
      const logLevel = 'error', indent = false;
      try {
        comp = await selectComposition({serveUrl, id: 'Video', inputProps, puppeteerInstance: browser, timeoutInMilliseconds: HAN_CHO_MS, logLevel});
        if (comp.width !== RONG || comp.height !== CAO) throw new Error('Composition Video phải có kích thước 1080×1920');
        server = await RenderInternals.prepareServer({
          webpackConfigOrServeUrl: serveUrl, remotionRoot: process.cwd(), logLevel, indent, offthreadVideoThreads: 1, sampleRate: 48000,
        });
        const serialize = props => NoReactInternals.serializeJSONWithSpecialTypes({data: props, indent: undefined, staticBase: null}).serializedString;
        const page = await makePage({
          context: server.sourceMap, initialFrame: 0, browserReplacer: {getBrowser: () => browser}, pagesArray: [],
          videoEnabled: true, muted: true, logLevel, indent, scale: 1, composition: comp, proxyPort: server.offthreadPort,
          serveUrl: server.serveUrl, timeoutInMilliseconds: HAN_CHO_MS, serializedInputPropsWithCustomSchema: serialize(inputProps),
          serializedResolvedPropsWithCustomSchema: serialize(comp.props), pageIndex: 0, isMainTab: true, sampleRate: 48000,
          preferredEffectBackend: 'auto', onLog: () => {},
        });
        const evalOpts = {
          kiemT2: thucTe,
          doXacSuat: xsNgan,
          tenThuongHieu: inputProps.thuongHieu?.ten || 'Story Math',
        };
        for (const {frame, canh} of chonFrame(inputProps, comp)) {
          await seekToFrame({page, frame, audioEnabled: false, videoEnabled: true, composition: comp.id,
            timeoutInMilliseconds: HAN_CHO_MS, indent, logLevel, attempt: 0});
          const {hop, dom} = await page.evaluate(doHopVaDomTrongTrang, evalOpts);
          soFrame++;
          soHop += hop.length;
          loi.push(...soiHop(hop, frame, canh));
          loi.push(...soiDomPhu(dom, {frame, canh, thucTe, boCuc: inputProps.boCuc || ''}));
          if (xsNgan && dom?.shape !== undefined && /^(Bước |Nội dung)/.test(canh)) {
            xsSamples.push({frame: frame - lech, shape: dom.shape});
          }
        }
        if (xsNgan && xsSamples.length >= 2) {
          const steps = inputProps.khung4tang?.buoc || [];
          if (dungImXacSuat(xsSamples, steps, comp.fps)) {
            loi.push({
              frame: xsSamples[0].frame + lech,
              canh: 'Tầng 2 Xác suất',
              loai: 'hinh_dung_im',
              phan_tu_1: 'Tang2',
              phan_tu_2: null,
              chi_tiet: 'Hình học T2 Xác suất không đổi qua các bước giải hoặc > 12 giây',
            });
          }
        }
      } catch (e) {
        if (!loiChromium(e)) throw e;
        boQua = 'Chromium bị ngắt trong lúc soi chữ: ' + e.message;
      }
    }
  } finally {
    try {
      if (browser) {
        try { await browser.close({silent: true}); }
        catch (e) { if (!boQua && !loiChromium(e)) throw e; }
      }
    } finally {
      if (server) await server.closeServer(true);
      if (tam) await fs.rm(tam, {recursive: true, force: true});
    }
  }
  const bao = chotBaoCao(loi, {boQua, soFrame, soHop});
  await fs.mkdir(path.dirname(path.resolve(tepRa)), {recursive: true});
  await fs.writeFile(tepRa, JSON.stringify(bao, null, 2) + '\n');
  if (boQua) console.warn('::warning::Pre-Render Collision Gate: ' + boQua.replace(/\s+/g, ' ').slice(0, 300));
  console.log(JSON.stringify(bao));
  console.log('Pre-Render Collision Gate: ' + soFrame + ' frame, ' + soHop + ' hộp chữ, ' + ((performance.now() - batDau) / 1000).toFixed(2) + ' s');
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const [, , props, bao = 'out/pre_render/bao_cao.json'] = process.argv;
  if (!props) {
    console.error('Dùng: node scripts/kiem_tra_de_chu_truoc_render.mjs <props.json> [bao_cao.json]');
    process.exitCode = 1;
  } else {
    chay(props, bao)
      .then(() => process.exit(process.exitCode || 0))
      .catch(e => { console.error(e); process.exit(1); });
  }
}
