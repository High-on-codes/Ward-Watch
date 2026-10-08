import { supabase, BUCKET } from "@/lib/supabase";
import { isAdmin, unauthorized } from "@/lib/auth";
import { verifyResolution } from "@/lib/ai";
import { withPriority, type Issue } from "@/lib/issues";
import { errorResponse, HttpError, readPhoto, uploadPhoto } from "@/lib/upload";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

async function fetchBefore(url: string | null): Promise<Buffer | null> {
  if (!url) return null;
  try {
    const marker = `/object/public/${BUCKET}/`;
    const i = url.indexOf(marker);
    if (i >= 0) {
      const { data } = await supabase().storage.from(BUCKET).download(decodeURIComponent(url.slice(i + marker.length)));
      if (data) return Buffer.from(await data.arrayBuffer());
    }
    const r = await fetch(url);
    return r.ok ? Buffer.from(await r.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    if (!isAdmin(req)) return unauthorized();
    const sb = supabase();
    const { data: issue, error } = await sb.from("issues").select("*").eq("id", params.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!issue) throw new HttpError(404, "not_found", "Issue not found.");
    if (issue.status === "resolved") throw new HttpError(409, "already_resolved", "Issue is already resolved.");

    const form = await req.formData();
    const photo = await readPhoto(form.get("photo"));
    const [before, up] = await Promise.all([fetchBefore(issue.before_photo), uploadPhoto("after", photo)]);
    const v = await verifyResolution(issue.category, before, photo.buf);
    const ok = v.resolved && v.confidence >= 0.6;

    const patch: Record<string, unknown> = {
      after_photo: up.url,
      verification: v,
      updated_at: new Date().toISOString(),
    };
    if (ok) {
      patch.status = "resolved";
      patch.resolved_at = new Date().toISOString();
    }
    const { data: updated, error: e2 } = await sb.from("issues").update(patch).eq("id", params.id).select("*").single();
    if (e2) throw new Error(e2.message);

    return Response.json({
      resolved: ok,
      confidence: v.confidence,
      reason: v.reason,
      aiSource: v.source,
      issue: withPriority(updated as Issue),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
