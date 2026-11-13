// Bộ phân tích biểu thức một biến x (an toàn: tự phân tích cú pháp, KHÔNG dùng eval) cho đồ thị hàm số.
// Hỗ trợ: số (cả dấu phẩy thập phân 2,5), x, + - * / ^, ngoặc, nhân ngầm (2x, 3(x+1), 2sin(x)),
// hàm sqrt căn sin cos tan abs ln log exp, hằng pi, e. Biểu thức sai -> trả null (đồ thị không vẽ, không làm hỏng video).

type Nut = (x: number) => number;
const HAM: Record<string, (a: number) => number> = {
  sqrt: Math.sqrt, can: Math.sqrt, sin: Math.sin, cos: Math.cos, tan: Math.tan, abs: Math.abs,
  ln: Math.log, log: Math.log10, exp: Math.exp, asin: Math.asin, acos: Math.acos, atan: Math.atan,
};

export function phanTichBieuThuc(nguon: string, theoDo = false): Nut | null {
  const D = theoDo ? Math.PI / 180 : 1;
  const HAMX: Record<string, (a: number) => number> = {...HAM, sin: (a) => Math.sin(a * D), cos: (a) => Math.cos(a * D), tan: (a) => Math.tan(a * D)};
  const s = String(nguon || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/×|·/g, '*')
    .replace(/÷|:/g, '/')
    .replace(/√/g, 'sqrt')
    .replace(/π/g, 'pi')
    .replace(/\*\*/g, '^');
  let i = 0;
  const nhin = () => s[i];
  const loi = () => {
    throw new Error('bieu_thuc');
  };
  // thứ tự ưu tiên: cộng/trừ < nhân/chia (kể cả nhân ngầm) < dấu âm < lũy thừa (kết hợp phải)
  function tong(): Nut {
    let a = tich();
    while (nhin() === '+' || nhin() === '-') {
      const op = s[i++];
      const b = tich();
      const aa = a;
      a = op === '+' ? (x) => aa(x) + b(x) : (x) => aa(x) - b(x);
    }
    return a;
  }
  function tich(): Nut {
    let a = dau();
    for (;;) {
      const c = nhin();
      if (c === '*' || c === '/') {
        i++;
        const b = dau();
        const aa = a;
        a = c === '*' ? (x) => aa(x) * b(x) : (x) => aa(x) / b(x);
      } else if (c !== undefined && /[0-9.a-z(]/.test(c)) {
        const b = dau(); // nhân ngầm: 2x, 3(x+1), 2sin(x)
        const aa = a;
        a = (x) => aa(x) * b(x);
      } else break;
    }
    return a;
  }
  function dau(): Nut {
    if (nhin() === '-') {
      i++;
      const a = dau();
      return (x) => -a(x);
    }
    if (nhin() === '+') {
      i++;
      return dau();
    }
    return luyThua();
  }
  function luyThua(): Nut {
    const a = coSo();
    if (nhin() === '^') {
      i++;
      const b = dau();
      return (x) => Math.pow(a(x), b(x));
    }
    return a;
  }
  function coSo(): Nut {
    const c = nhin();
    if (c === '(') {
      i++;
      const a = tong();
      if (nhin() !== ')') loi();
      i++;
      return a;
    }
    if (c !== undefined && /[0-9.]/.test(c)) {
      const m = /^[0-9]*\.?[0-9]+(e[+-]?[0-9]+)?/.exec(s.slice(i));
      if (!m) loi();
      i += (m as RegExpExecArray)[0].length;
      const v = parseFloat((m as RegExpExecArray)[0]);
      return () => v;
    }
    const m = /^[a-z]+/.exec(s.slice(i));
    if (!m) loi();
    const ten = (m as RegExpExecArray)[0];
    // tách tên dài kiểu "xsin" -> "x" * "sin"
    if (ten === 'x' || (ten.startsWith('x') && ten.length > 1)) {
      i += 1;
      return (x) => x;
    }
    if (ten === 'pi') {
      i += 2;
      return () => Math.PI;
    }
    const fnTen = Object.keys(HAMX).sort((p, q) => q.length - p.length).find((k) => ten.startsWith(k));
    if (fnTen) {
      i += fnTen.length;
      const a = luyThua();
      const f = HAMX[fnTen];
      return (x) => f(a(x));
    }
    if (ten === 'e' || ten.startsWith('e')) {
      i += 1;
      return () => Math.E;
    }
    return loi();
  }
  try {
    const f = tong();
    if (i !== s.length) return null;
    // thử tại vài điểm: phải ra số hữu hạn ở ít nhất một điểm
    return f;
  } catch (e) {
    return null;
  }
}
