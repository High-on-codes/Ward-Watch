import { BUCKET, supabase } from "./supabase";

export const MAX_BYTES = 4 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

/** Validate an uploaded File on the server; never trust client-side compression. */
export async function readPhoto(file: unknown): Promise<{ buf: Buffer; type: string; ext: string }> {
  if (!(file instanceof File)) throw new HttpError(400, "bad_request", "A photo is required.");
  const ext = TYPES[file.type];
  if (!ext) throw new HttpError(400, "bad_file_type", "Photo must be JPEG, PNG or WebP.");
  if (file.size > MAX_BYTES) throw new HttpError(413, "too_large", "Photo is larger than 4 MB.");
  return { buf: Buffer.from(await file.arrayBuffer()), type: file.type, ext };
}

export async function uploadPhoto(prefix: string, photo: { buf: Buffer; type: string; ext: string }) {
  const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${photo.ext}`;
  const sb = supabase();
  const { error } = await sb.storage.from(BUCKET).upload(path, photo.buf, { contentType: photo.type });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

export async function deletePhoto(path: string) {
  try {
    await supabase().storage.from(BUCKET).remove([path]);
  } catch (e) {
    console.error("deletePhoto failed:", (e as Error).message);
  }
}

export function errorResponse(e: unknown) {
  if (e instanceof HttpError) return Response.json({ error: e.code, message: e.message }, { status: e.status });
  console.error(e);
  return Response.json({ error: "server_error", message: "Something went wrong. Please try again." }, { status: 500 });
}
