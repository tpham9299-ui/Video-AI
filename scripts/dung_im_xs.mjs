// Chỉ so những khung thuộc phần giải, theo thời gian nội dung.
export function dungImXacSuat(samples, steps, fps) {
  let first;
  for (const sample of [...samples].sort((a,b) => a.frame-b.frame)) {
    const t = sample.frame / fps;
    const step = steps.filter(b => b.t <= t).length-1;
    if (step < 1) continue;
    if (!first || first.shape !== sample.shape) first = {...sample, step};
    if (step-first.step >= 2 || sample.frame-first.frame > 12*fps) return true;
  }
  return false;
}
