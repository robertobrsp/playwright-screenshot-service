import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

/**
 * Resumo curto ("do que o vídeo fala / o que ele mostra") para cada vídeo.
 *
 * - Com ANTHROPIC_API_KEY: o Claude lê título, canal, tags e descrição e escreve
 *   1 a 2 frases em português. Todos os vídeos novos vão numa única chamada.
 * - Sem a chave: usa o começo da descrição do próprio vídeo, sem links e hashtags.
 *
 * Resumos ficam guardados por ID do vídeo, então cada vídeo é resumido uma vez só.
 */

const MODEL = process.env.RESUMO_MODELO || "claude-opus-5-5";
const cache = new Map(); // videoId -> resumo

const ResumoSchema = z.object({
  resumos: z.array(z.object({ id: z.string(), resumo: z.string() })),
});

const SYSTEM = `Você escreve resumos para um site brasileiro que lista vídeos virais do YouTube.
Para cada vídeo, escreva 1 ou 2 frases curtas em português do Brasil explicando do que o vídeo fala ou o que ele mostra, para a pessoa decidir se quer assistir.
Use só as informações fornecidas (título, canal, tags e descrição). Não invente detalhes que não estão lá.
Ignore links, patrocínios, redes sociais e pedidos de inscrição que aparecem na descrição.
Se as informações forem poucas, diga de forma honesta o que dá para saber pelo título.
Não comece com "O vídeo" em todos os itens; varie o início das frases.`;

let client = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return (client ||= new Anthropic());
}

/** Resumo simples a partir da descrição, para quando não há chave da Anthropic. */
export function resumoDaDescricao(description = "") {
  const clean = description
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[#@][\p{L}\p{N}_]+/gu, "")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 20)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return "";
  if (clean.length <= 220) return clean;
  const cut = clean.slice(0, 220);
  return cut.slice(0, cut.lastIndexOf(" ")) + "…";
}

async function resumirComClaude(videos) {
  const payload = videos.map((v) => ({
    id: v.id,
    titulo: v.title,
    canal: v.author,
    tags: (v.tags || []).slice(0, 15),
    descricao: (v.description || "").slice(0, 2500),
  }));

  const response = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(ResumoSchema) },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Resuma cada um destes vídeos. Devolva um item por vídeo, com o mesmo id.\n\n${JSON.stringify(payload, null, 2)}`,
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new Error(`resumo recusado (${response.stop_details?.category ?? "sem categoria"})`);
  }
  if (!response.parsed_output) throw new Error(`resumo sem JSON válido (stop_reason=${response.stop_reason})`);
  return response.parsed_output.resumos;
}

/** Preenche item.summary em cada vídeo e remove os campos brutos usados no resumo. */
export async function adicionarResumos(items) {
  const novos = items.filter((v) => !cache.has(v.id));

  if (novos.length && getClient()) {
    try {
      // Lotes de 25 para manter cada chamada pequena
      for (let i = 0; i < novos.length; i += 25) {
        const resumos = await resumirComClaude(novos.slice(i, i + 25));
        for (const r of resumos) if (r.resumo?.trim()) cache.set(r.id, r.resumo.trim());
      }
    } catch (err) {
      if (err instanceof Anthropic.AuthenticationError) console.error("[resumo] ANTHROPIC_API_KEY inválida");
      else if (err instanceof Anthropic.RateLimitError) console.error("[resumo] limite de uso atingido, tento de novo na próxima atualização");
      else console.error("[resumo] falhou:", err.message);
    }
  }

  return items.map(({ description, tags, ...v }) => ({
    ...v,
    summary: cache.get(v.id) || resumoDaDescricao(description),
  }));
}
