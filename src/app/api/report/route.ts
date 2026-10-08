import { triagePhoto } from "@/lib/ai";
import { supabase } from "@/lib/supabase";
import { nearestWard } from "@/lib/wards";
import { rateLimit } from "@/lib/rateLimit";
import { deletePhoto, errorResponse, HttpError, readPhoto, uploadPhoto } from "@/lib/upload";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    if (!rateLimit(ip, 20, 60_000)) throw new HttpError(429, "rate_limited", "Too many reports. Please wait a minute.");

    const form = await req.formData();
    const photo = await readPhoto(form.get("photo"));
    const lat = Number(form.get("lat"));
    const lng = Number(form.get("lng"));
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
      throw new HttpError(400, "bad_location", "Valid lat and lng are required.");

    const [triage, up] = await Promise.all([triagePhoto(photo.buf), uploadPhoto("reports", photo)]);
    if (!triage.is_civic_issue) {
      await deletePhoto(up.path);
      return Response.json(
        { error: "not_civic_issue", message: "That photo doesn't show a civic problem. Try again." },
        { status: 422 }
      );
    }

    const ward = nearestWard(lat, lng);
    const radius = Number(process.env.DEDUPE_RADIUS_M) || 30;
    const { data, error } = await supabase().rpc("report_issue", {
      p_category: triage.category,
      p_severity: triage.severity,
      p_description: triage.description,
      p_lat: lat,
      p_lng: lng,
      p_ward: ward,
      p_photo: up.url,
      p_radius_m: radius,
    });
    if (error) throw new Error(error.message);
    const row = Array.isArray(data) ? data[0] : data;

    return Response.json({
      issueId: row.o_issue_id,
      merged: row.o_merged,
      reportCount: row.o_count,
      category: triage.category,
      severity: triage.severity,
      description: triage.description,
      ward,
      aiSource: triage.source,
      photoUrl: up.url,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
