import { supabase } from "@/lib/supabase";
import { isAdmin, unauthorized } from "@/lib/auth";
import { withPriority, type Issue } from "@/lib/issues";
import { errorResponse, HttpError } from "@/lib/upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    if (!isAdmin(req)) return unauthorized();
    const body = await req.json().catch(() => ({}));
    if (body?.status !== "assigned") throw new HttpError(409, "invalid_transition", "Only status 'assigned' can be set here.");

    const sb = supabase();
    const { data: cur, error: e1 } = await sb.from("issues").select("status").eq("id", params.id).maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!cur) throw new HttpError(404, "not_found", "Issue not found.");
    if (cur.status !== "reported") throw new HttpError(409, "invalid_transition", `Cannot move from ${cur.status} to assigned.`);

    const { data, error } = await sb
      .from("issues")
      .update({ status: "assigned", updated_at: new Date().toISOString() })
      .eq("id", params.id)
      .eq("status", "reported")
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new HttpError(409, "invalid_transition", "Issue changed status; refresh and retry.");
    return Response.json({ issue: withPriority(data as Issue) });
  } catch (e) {
    return errorResponse(e);
  }
}
