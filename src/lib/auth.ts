/** Returns true when the request may proceed. If ADMIN_PASSCODE is unset the check is skipped. */
export function isAdmin(req: Request): boolean {
  const expected = process.env.ADMIN_PASSCODE;
  if (!expected) return true;
  return req.headers.get("x-admin-passcode") === expected;
}

export function unauthorized() {
  return Response.json({ error: "unauthorized", message: "Admin passcode required." }, { status: 401 });
}
