// ─── lib/image.jsx — maaltijdfoto klaarmaken voor de AI ──────────────────────
// Een telefoonfoto is al snel 4 MB. Die ongemoeid doorsturen is traag, duur in
// tokens en loopt tegen de requestlimiet van Vercel aan. We verkleinen daarom
// in de browser, en maken meteen een miniatuur voor het dagboek.

const PHOTO_MAX_DIM = 1024;   // Gemini rekent per tegel van 768px; groter helpt niet
const PHOTO_QUALITY = 0.72;
const THUMB_MAX_DIM = 160;
const THUMB_QUALITY = 0.6;

function drawToCanvas(src, maxDim) {
  const scale = Math.min(1, maxDim / Math.max(src.width, src.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(src.width * scale));
  canvas.height = Math.max(1, Math.round(src.height * scale));
  canvas.getContext('2d').drawImage(src, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// createImageBitmap draait de foto rechtop volgens de EXIF-oriëntatie. Zonder
// dat komt een staande telefoonfoto gekanteld bij de AI aan. Browsers die de
// optie niet kennen vallen terug op een gewone <img>.
async function decodeImageFile(file) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch (e) { /* val terug op <img> */ }
  }
  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Deze foto kon niet gelezen worden.')); };
    img.src = url;
  });
}

async function prepareMealPhoto(file) {
  if (!file || !/^image\//.test(file.type || '')) throw new Error('Kies een afbeelding.');
  const src = await decodeImageFile(file);
  const full = drawToCanvas(src, PHOTO_MAX_DIM);
  const thumb = drawToCanvas(src, THUMB_MAX_DIM);
  if (src.close) src.close();
  const dataUrl = full.toDataURL('image/jpeg', PHOTO_QUALITY);
  return {
    base64: dataUrl.slice(dataUrl.indexOf(',') + 1),
    mimeType: 'image/jpeg',
    thumb: thumb.toDataURL('image/jpeg', THUMB_QUALITY),
  };
}
