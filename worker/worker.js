/**
 * Train & Fuel — Cloudflare Worker
 *
 * Bindings required (set in wrangler.toml / dashboard):
 *   - DB              D1 database binding
 *   - ANTHROPIC_API_KEY   secret, never exposed to the client
 *
 * Routes:
 *   GET  /api/state              -> full durable JSON blob (settings, logs, measurements)
 *   PUT  /api/state              -> upsert full JSON blob
 *   GET  /api/exercises          -> list exercise library
 *   POST /api/exercises          -> add one exercise (locked=1 by default)
 *   DELETE /api/exercises/:id    -> remove one exercise (explicit delete only)
 *   GET  /api/programs           -> list programs
 *   POST /api/programs           -> add one program (locked=1 by default)
 *   DELETE /api/programs/:id     -> remove one program
 *   POST /api/generate           -> proxy to Claude: generate a program OR a single workout
 *   POST /api/import             -> proxy to Claude: parse uploaded PDF/JPEG program files
 *   POST /api/food-scan          -> proxy to Claude vision: estimate macros from a food photo
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

async function callClaude(env, body) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "pdfs-2024-09-25",
    },
    body: JSON.stringify(body),
  });
  return resp;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    try {
      // ---- durable state blob ----
      if (path === "/api/state" && request.method === "GET") {
        const row = await env.DB.prepare(
          "SELECT data FROM app_state WHERE id = 1"
        ).first();
        return json(row ? JSON.parse(row.data) : {});
      }

      if (path === "/api/state" && request.method === "PUT") {
        const body = await request.text();
        await env.DB.prepare(
          `INSERT INTO app_state (id, data, updated_at) VALUES (1, ?, ?)
           ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
        )
          .bind(body, new Date().toISOString())
          .run();
        return json({ ok: true });
      }

      // ---- exercise library ----
      if (path === "/api/exercises" && request.method === "GET") {
        const { results } = await env.DB.prepare(
          "SELECT * FROM exercises ORDER BY name"
        ).all();
        return json(results);
      }

      if (path === "/api/exercises" && request.method === "POST") {
        const e = await request.json();
        await env.DB.prepare(
          `INSERT INTO exercises (id, name, muscle_group, equipment, cue, source, locked, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 1, ?)
           ON CONFLICT(id) DO UPDATE SET name=excluded.name, muscle_group=excluded.muscle_group,
             equipment=excluded.equipment, cue=excluded.cue`
        )
          .bind(
            e.id, e.name, e.muscle_group, e.equipment || "", e.cue || "",
            e.source || "ai", new Date().toISOString()
          )
          .run();
        return json({ ok: true });
      }

      if (path.startsWith("/api/exercises/") && request.method === "DELETE") {
        const id = path.split("/").pop();
        await env.DB.prepare("DELETE FROM exercises WHERE id = ?").bind(id).run();
        return json({ ok: true });
      }

      // ---- programs ----
      if (path === "/api/programs" && request.method === "GET") {
        const { results } = await env.DB.prepare(
          "SELECT * FROM programs ORDER BY created_at DESC"
        ).all();
        return json(results.map(r => ({ ...r, structure: JSON.parse(r.structure) })));
      }

      if (path === "/api/programs" && request.method === "POST") {
        const p = await request.json();
        await env.DB.prepare(
          `INSERT INTO programs (id, name, duration_weeks, source, structure, locked, created_at)
           VALUES (?, ?, ?, ?, ?, 1, ?)
           ON CONFLICT(id) DO UPDATE SET name=excluded.name, structure=excluded.structure`
        )
          .bind(
            p.id, p.name, p.duration_weeks, p.source || "ai",
            JSON.stringify(p.structure), new Date().toISOString()
          )
          .run();
        return json({ ok: true });
      }

      if (path.startsWith("/api/programs/") && request.method === "DELETE") {
        const id = path.split("/").pop();
        await env.DB.prepare("DELETE FROM programs WHERE id = ?").bind(id).run();
        return json({ ok: true });
      }

      // ---- AI generation (program skeleton or a single day's workout) ----
      if (path === "/api/generate" && request.method === "POST") {
        const { system, prompt, max_tokens } = await request.json();
        const resp = await callClaude(env, {
          model: "claude-sonnet-4-6",
          max_tokens: max_tokens || 4000,
          system,
          messages: [{ role: "user", content: prompt }],
        });
        const data = await resp.json();
        return json(data, resp.status);
      }

      // ---- program import from uploaded PDF/JPEG ----
      if (path === "/api/import" && request.method === "POST") {
        const { files, instructions } = await request.json();
        // files: [{ media_type, data (base64) }]
        const content = files.map(f => ({
          type: f.media_type === "application/pdf" ? "document" : "image",
          source: { type: "base64", media_type: f.media_type, data: f.data },
        }));
        content.push({ type: "text", text: instructions });
        const resp = await callClaude(env, {
          model: "claude-sonnet-4-6",
          max_tokens: 16000,
          messages: [{ role: "user", content }],
        });
        const data = await resp.json();
        return json(data, resp.status);
      }

      // ---- food photo scan ----
      if (path === "/api/food-scan" && request.method === "POST") {
        const { image } = await request.json();
        const resp = await callClaude(env, {
          model: "claude-sonnet-4-6",
          max_tokens: 500,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: image.media_type, data: image.data } },
              { type: "text", text: `Identify the food or meal in this photo and estimate its nutrition
based on the visible portion size. Respond with ONLY valid JSON, no prose:
{"name": "string", "calories": 000, "protein": 00, "carbs": 00, "fat": 00}
Protein/carbs/fat are grams, whole numbers, best estimate for the portion shown.` },
            ],
          }],
        });
        const data = await resp.json();
        return json(data, resp.status);
      }

      return json({ error: "not found" }, 404);
    } catch (err) {
      return json({ error: String(err) }, 500);
    }
  },
};
