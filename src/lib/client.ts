"use client";

/** Resize to max 1280px on the long side and re-encode as JPEG 0.8 (also strips EXIF). */
export async function compressImage(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("Could not read the photo."));
      i.src = url;
    });
    const scale = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
    return await new Promise<Blob>((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error("Compression failed."))), "image/jpeg", 0.8)
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

const KEY = "ww_admin_passcode";

export function getPasscode(): string {
  try {
    return sessionStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
}

/** fetch with x-admin-passcode; on 401 prompts once, stores in sessionStorage and retries. */
export async function adminFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const attempt = (code: string) =>
    fetch(url, { ...init, headers: { ...(init.headers || {}), ...(code ? { "x-admin-passcode": code } : {}) } });
  let res = await attempt(getPasscode());
  if (res.status === 401) {
    const entered = window.prompt("Admin passcode required:");
    if (!entered) return res;
    try {
      sessionStorage.setItem(KEY, entered);
    } catch {}
    res = await attempt(entered);
    if (res.status === 401) {
      try {
        sessionStorage.removeItem(KEY);
      } catch {}
    }
  }
  return res;
}

export function ageDays(iso: string): number {
  return Math.max(0, (Date.now() - new Date(iso).getTime()) / 86_400_000);
}
