export async function compressReportImage(file: Blob, maxDimension = 1280, maxBytes = 150 * 1024): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / bitmap.width, maxDimension / bitmap.height);
  const canvas = new OffscreenCanvas(Math.max(1, Math.round(bitmap.width * scale)), Math.max(1, Math.round(bitmap.height * scale)));
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (let quality = 0.8; quality >= 0.2; quality -= 0.1) {
    const blob = await canvas.convertToBlob({ type: "image/webp", quality });
    if (blob.size <= maxBytes) return blob;
  }
  throw new Error("Image could not be compressed below the civic upload limit.");
}
