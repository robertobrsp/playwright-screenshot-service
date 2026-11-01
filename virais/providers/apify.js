/**
 * Roda um "actor" do Apify de forma síncrona e devolve os itens do dataset.
 * Docs: https://docs.apify.com/api/v2#/reference/actors/run-actor-synchronously-and-get-dataset-items
 */
export async function runActor(actorId, input, { timeoutSecs = 240 } = {}) {
  const token = process.env.APIFY_TOKEN;
  const id = actorId.replace("/", "~");
  const url = `https://api.apify.com/v2/acts/${id}/run-sync-get-dataset-items?timeout=${timeoutSecs}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Apify ${actorId} ${res.status}: ${(await res.text()).slice(0, 500)}`);
  return res.json();
}

/** Permite sobrescrever o input do actor via env (JSON). */
export function inputFromEnv(envName, fallback) {
  const raw = process.env[envName];
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`${envName} não é um JSON válido`);
  }
}

export function listFromEnv(envName, fallback) {
  const raw = process.env[envName];
  return raw ? raw.split(",").map((s) => s.trim().replace(/^#/, "")).filter(Boolean) : fallback;
}
