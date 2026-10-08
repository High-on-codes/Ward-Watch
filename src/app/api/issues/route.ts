import { supabase } from "@/lib/supabase";
import { withPriority, type Issue } from "@/lib/issues";
import { errorResponse } from "@/lib/upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabase()
      .from("issues")
      .select("id,category,severity,description,lat,lng,ward,status,report_count,before_photo,after_photo,verification,created_at,updated_at,resolved_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    const now = Date.now();
    const all = ((data || []) as Issue[]).map((i) => withPriority(i, now));
    const open = all.filter((i) => i.status !== "resolved").sort((a, b) => b.priority - a.priority);
    const done = all
      .filter((i) => i.status === "resolved")
      .sort((a, b) => new Date(b.resolved_at || 0).getTime() - new Date(a.resolved_at || 0).getTime());
    return Response.json({ issues: [...open, ...done] });
  } catch (e) {
    return errorResponse(e);
  }
}
