/* Harness stub for the S3 upload boundary: every upload "succeeds" after a
 * short delay (window.__harness.uploadMs) and hands back a stable fake ref. */
export async function uploadFile(_file: File | Blob, userId: string | number, fileName: string) {
  const ms = (window as unknown as { __harness?: { uploadMs?: number } }).__harness?.uploadMs ?? 400;
  await new Promise((r) => setTimeout(r, ms));
  return { success: true, fileUrl: `s3://harness/${userId}/${fileName}`, statusCode: 200 };
}
export async function deleteFile(_fileUrl: string) {
  return { success: true };
}
