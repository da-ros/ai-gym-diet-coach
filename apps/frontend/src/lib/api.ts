import { getAccessToken } from "./session";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function authHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Not signed in. Please sign in again.");
  }
  return { Authorization: `Bearer ${token}`, ...extra };
}

export async function getDailySummary() {
  const res = await fetch(`${BASE_URL}/daily-summary`, { headers: await authHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getMeal(mealId: number) {
  const res = await fetch(`${BASE_URL}/meals/${mealId}`, { headers: await authHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function logMeal(photo: File) {
  const form = new FormData();
  form.append("photo", photo);
  const res = await fetch(`${BASE_URL}/meals`, {
    method: "POST",
    headers: await authHeaders(), // no Content-Type — browser sets multipart boundary
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** Build a short MPS timeline summary for chat context (same logic as dashboard timeline). */
export function buildMpsTimelineSummary(d: {
  meals?: Array<{ logged_at: string; protein_g: number; dish_name?: string | null; label?: string }>;
  mps_score?: { achieved: number; target: number };
} | null): string {
  if (!d?.mps_score) return "";
  const PROTEIN_SPIKE_G = 20;
  const achieved = d.mps_score.achieved;
  const allMeals = [...(d.meals || [])].sort(
    (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()
  );
  const spikeMeals = allMeals.filter((m) => m.protein_g >= PROTEIN_SPIKE_G).slice(0, 4);
  let nextStr = "—";
  if (achieved < (d.mps_score.target ?? 4)) {
    const lastMeal = d.meals?.[0];
    if (lastMeal?.logged_at) {
      const lastTime = new Date(lastMeal.logged_at);
      const nextStart = new Date(lastTime.getTime() + 3 * 60 * 60 * 1000);
      const nextEnd = new Date(lastTime.getTime() + 4 * 60 * 60 * 1000);
      const fmt = (x: Date) =>
        x.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
      nextStr = `${fmt(nextStart)} – ${fmt(nextEnd)}`;
    } else {
      nextStr = "Anytime — log your first meal";
    }
  }
  const parts: string[] = [];
  for (let i = 0; i < 4; i++) {
    const slot = i + 1;
    const meal = spikeMeals[i];
    const filled = slot <= achieved;
    if (meal) {
      const time = new Date(meal.logged_at).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      const label = meal.dish_name || meal.label || "Meal";
      parts.push(`${slot}) ${time} — ${label}${filled ? " (achieved)" : ""}`);
    } else if (i === achieved) {
      parts.push(`${slot}) ${nextStr} — Next target`);
    } else {
      parts.push(`${slot}) — —`);
    }
  }
  return "MPS timeline (4 slots): " + parts.join(". ");
}

export type ChatHistoryMessage = { role: "user" | "coach"; text: string };

export async function sendChat(
  message: string,
  timezone?: string,
  history: ChatHistoryMessage[] = [],
  timelineSummary?: string
) {
  const body = {
    message,
    timezone: timezone ?? undefined,
    history: history.map((m) => ({
      role: m.role === "coach" ? "assistant" : "user",
      text: m.text,
    })),
    timeline_summary: timelineSummary ?? undefined,
  };
  const res = await fetch(`${BASE_URL}/chat`, {
    method: "POST",
    headers: await authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getProfile() {
  const res = await fetch(`${BASE_URL}/profile`, { headers: await authHeaders() });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function saveProfile(data: {
  goal: "bulk" | "cut" | "lean_bulk";
  body_weight_kg: number;
  protein_target_g: number;
  calorie_target: number;
}) {
  const res = await fetch(`${BASE_URL}/profile`, {
    method: "PUT",
    headers: await authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}
