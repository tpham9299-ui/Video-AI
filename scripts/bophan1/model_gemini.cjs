// ListModels chỉ xác nhận khả năng generateContent. Quyền và quota được xác định khi gọi.
async function modelVanBan(key, goc = 'https://generativelanguage.googleapis.com') {
  const models = new Set();
  const trang = new Set();
  const signal = AbortSignal.timeout(15000);
  let token = '';
  do {
    trang.add(token);
    const url = new URL('/v1beta/models', goc);
    url.searchParams.set('pageSize', '100');
    if (token) url.searchParams.set('pageToken', token);
    const res = await fetch(url, {headers: {'x-goog-api-key': key}, signal});
    if (!res.ok) break;
    const d = await res.json();
    for (const m of d.models || []) {
      const ten = String(m.name || '').replace(/^models\//, '');
      if (m.supportedGenerationMethods?.includes('generateContent') && /^gemini-/i.test(ten) &&
          !/tts|embedding|image|veo|vision|aqa|audio|robotics|computer-use|live/i.test(ten)) models.add(ten);
    }
    token = d.nextPageToken;
  } while (token && !trang.has(token));
  return [...models].sort((a, b) => Number(/flash/i.test(b)) - Number(/flash/i.test(a)));
}

module.exports = {modelVanBan};
