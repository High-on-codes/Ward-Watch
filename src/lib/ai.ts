import type { Category, Verification } from "./issues";

export interface Triage {
  is_civic_issue: boolean;
  category: Category;
  severity: number;
  description: string;
  source: "ai" | "mock";
}

const CATS: Category[] = ["garbage", "pothole", "drain_blockage", "waterlogging", "other"];

const TRIAGE_SYSTEM = `You triage photos of civic problems for an Indian municipality.
Reply with ONLY one JSON object, no prose, no code fences:
{"is_civic_issue": boolean,
 "category": "garbage" | "pothole" | "drain_blockage" | "waterlogging" | "other",
 "severity": integer 1-5,
 "description": string}
Rules:
- is_civic_issue is false if the photo shows no public infrastructure or sanitation
  problem (selfie, indoor scene, screenshot, pet, etc.).
- severity: 1 cosmetic, 2 minor nuisance, 3 notable nuisance, 4 serious (blocks a path
  or drain, health risk), 5 immediate hazard (deep pothole on a main road, flooding
  onto a road, large burning or toxic dump).
- description: one factual sentence, max 25 words, no opinions.
- Ignore people and number plates. Never describe or identify individuals.`;

function verifySystem(category: string) {
  return `You verify whether a reported civic issue has been fixed.
Original issue category: ${category}.
You receive up to two images: BEFORE (original report, may be absent) then AFTER
(photo taken by the worker). Reply with ONLY one JSON object:
{"resolved": boolean, "confidence": number between 0 and 1, "reason": string}
Rules:
- resolved is true only if the AFTER photo clearly shows the same kind of location with
  the problem removed or repaired.
- If AFTER shows a different place, is too dark or blurry to judge, or the problem is
  still visible, resolved is false.
- reason: one sentence, max 25 words.`;
}

function mockTriage(bytes: Buffer): Triage {
  const n = bytes.length;
  return {
    is_civic_issue: true,
    category: (["garbage", "pothole", "drain_blockage", "waterlogging"] as Category[])[n % 4],
    severity: (n % 5) + 1,
    description: "Demo mode: AI key not configured.",
    source: "mock",
  };
}

function mockVerify(): Verification {
  return { resolved: true, confidence: 0.9, reason: "Demo mode: verification not performed.", source: "mock" };
}

class RetryableError extends Error {}

async function callOnce(system: string, images: Buffer[], text: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY as string,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
        max_tokens: 400,
        system,
        messages: [
          {
            role: "user",
            content: [
              ...images.map((b) => ({
                type: "image",
                source: { type: "base64", media_type: "image/jpeg", data: b.toString("base64") },
              })),
              { type: "text", text },
            ],
          },
        ],
      }),
      signal: ctrl.signal,
    });
    if (res.status === 429 || res.status >= 500) throw new RetryableError(`Anthropic HTTP ${res.status}`);
    if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}`);
    const json = await res.json();
    return String(json?.content?.[0]?.text ?? "");
  } catch (e) {
    if ((e as Error).name === "AbortError") throw new RetryableError("Anthropic timeout");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function callWithRetry(system: string, images: Buffer[], text: string): Promise<Record<string, unknown>> {
  let raw: string;
  try {
    raw = await callOnce(system, images, text);
  } catch (e) {
    if (e instanceof RetryableError) raw = await callOnce(system, images, text);
    else throw e;
  }
  const a = raw.indexOf("{");
  const b = raw.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error("No JSON object in model reply");
  return JSON.parse(raw.slice(a, b + 1));
}

export async function triagePhoto(photo: Buffer): Promise<Triage> {
  if (!process.env.ANTHROPIC_API_KEY) return mockTriage(photo);
  try {
    const j = await callWithRetry(TRIAGE_SYSTEM, [photo], "Classify this photo.");
    const sev = Math.round(Number(j.severity));
    return {
      is_civic_issue: j.is_civic_issue !== false,
      category: CATS.includes(j.category as Category) ? (j.category as Category) : "other",
      severity: Math.min(5, Math.max(1, Number.isFinite(sev) ? sev : 3)),
      description: typeof j.description === "string" ? j.description : "",
      source: "ai",
    };
  } catch (e) {
    console.error("triagePhoto failed, using mock:", (e as Error).message);
    return mockTriage(photo);
  }
}

export async function verifyResolution(category: string, before: Buffer | null, after: Buffer): Promise<Verification> {
  if (!process.env.ANTHROPIC_API_KEY) return mockVerify();
  try {
    const images = before ? [before, after] : [after];
    const j = await callWithRetry(verifySystem(category), images, "Has the issue been fixed?");
    const conf = Number(j.confidence);
    return {
      resolved: j.resolved === true,
      confidence: Math.min(1, Math.max(0, Number.isFinite(conf) ? conf : 0)),
      reason: typeof j.reason === "string" ? j.reason : "",
      source: "ai",
    };
  } catch (e) {
    console.error("verifyResolution failed, using mock:", (e as Error).message);
    return mockVerify();
  }
}
