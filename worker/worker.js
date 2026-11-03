/**
 * Train & Fuel — Cloudflare Worker (auto-deployed from this repo via Cloudflare Git integration)
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


// Food-scan instructions. The goal is a log that is accurate and, when unsure, leans
// slightly high, because under-counting is the failure that hides weight-loss stalls.
const SCAN_SYSTEM = `You estimate nutrition from food photos for a person who is trying to lose weight and logs every item.

PACKAGED FOODS (a label, Nutrition Facts panel, or recognizable branded package is visible):
- Use the label's numbers. Report exactly ONE serving: the label's serving size and its per-serving values.
- Never report the whole bag, box or bottle unless the user's note says so.
- If the label shows servings per container, return it in "servings_per_container" as a number; otherwise null.
- Put the serving in the name, e.g. "Bare Chicken Breast Strips (1 serving, 3 oz)".
- If the user's note gives a quantity ("2 slices", "whole bag", "half"), scale the numbers to that quantity and say so in the name, e.g. "Cheddar cheese slices (2 slices)".

PLATED, HOMEMADE AND RESTAURANT FOOD (no label):
- Estimate the full portion actually shown, using the plate, utensils and hands for scale.
- Count the calories people forget: cooking oil, butter, dressings and sauces, cheese, breading, fried foods, sugary drinks. Restaurant and takeout food usually has more of these than home cooking.
- When your estimate falls in a range, choose the upper-middle of the range. Do not round down. Lean slightly high, never low.
- Break the meal into its components in your head, then return one combined total for the whole meal.

DRINKS: use the container size and ABV if visible. A 12 oz beer is about 150 calories at 5% ABV and about 200 at 6.5-7%, roughly 280 at 9-10%. Count mixers and sugar.

ALWAYS:
- The name must state the quantity counted (for example "2 eggs", "1 serving", "whole bag", "12 oz can") so the log is honest later.
- Calories should agree with the macros: about 4 per gram of protein, 4 per gram of carbs, 9 per gram of fat, within 10%.
- Whole numbers only. Set "confidence" to "low" if you could not see the item clearly or the portion is a guess.
- Reply with ONLY the JSON object requested.`;

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
        const { image, note, kind } = await request.json();
        const kindHint = {
          package: "The user says this is a PACKAGED product.",
          plated: "The user says this is a homemade or plated meal (not packaged).",
          restaurant: "The user says this is a RESTAURANT or takeout meal. Restaurant portions run large and use more oil, butter and sauce.",
          drink: "The user says this is a DRINK.",
        }[kind] || "";
        const userText = [
          "Estimate the nutrition of what is in this photo.",
          kindHint,
          note ? `The user's note (trust it over the photo; if it gives a quantity, count exactly that quantity): "${note}"` : "",
          `Reply with ONLY valid JSON, no prose:
{"name": "string", "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "kind": "package|plated|restaurant|drink|other", "serving_note": "string", "servings_per_container": null, "confidence": "high|medium|low"}`,
        ].filter(Boolean).join("\n");
        const make = (withTemp) => callClaude(env, {
          model: "claude-sonnet-4-6",
          max_tokens: 600,
          ...(withTemp ? { temperature: 0 } : {}),
          system: SCAN_SYSTEM,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: image.media_type, data: image.data } },
              { type: "text", text: userText },
            ],
          }],
        });
        // temperature 0 makes the same food score the same every time. If the API ever
        // rejects the parameter, retry without it rather than breaking scans.
        let resp = await make(true);
        if (resp.status === 400) resp = await make(false);
        const data = await resp.json();
        return json(data, resp.status);
      }

      // ---- barcode lookup (Open Food Facts) ----
      // Done here, not in the browser, so there is no cross-origin problem and the request
      // carries a proper User-Agent as the Open Food Facts usage policy asks.
      if (path === "/api/barcode" && request.method === "GET") {
        const code = (url.searchParams.get("code") || "").replace(/\D/g, "");
        if (code.length < 6 || code.length > 14) return json({ found: false, error: "bad code" }, 400);
        const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,brands,serving_size,serving_quantity,product_quantity,nutriments`, {
          headers: { "User-Agent": "TrainFuel/1.0 (personal fitness app)" },
        });
        if (!r.ok) return json({ found: false });
        const d = await r.json();
        const p = d && d.product;
        if (!p || d.status === 0) return json({ found: false });
        const n = p.nutriments || {};
        const num = (v) => { const x = parseFloat(v); return isFinite(x) ? x : null; };
        const sq = num(p.serving_quantity);            // grams (or ml) in one serving
        const per = (key) => {                          // per-serving value, from label or scaled from 100 g
          const s = num(n[key + "_serving"]);
          if (s !== null) return s;
          const h = num(n[key + "_100g"]);
          return h !== null && sq ? h * sq / 100 : null;
        };
        let kcal = per("energy-kcal");
        if (kcal === null) { const kj = per("energy"); if (kj !== null) kcal = kj / 4.184; }
        const prot = per("proteins"), carb = per("carbohydrates"), fat = per("fat");
        if (kcal === null || sq === null) {
          // No per-serving data: fall back to 100 g values and say so.
          const k100 = num(n["energy-kcal_100g"]);
          if (k100 === null) return json({ found: false });
          return json({ found: true, name: [p.brands && p.brands.split(",")[0], p.product_name].filter(Boolean).join(" "),
            basis: "100g", serving_note: "per 100 g (no serving size on file)", servings_per_container: null,
            calories: Math.round(k100), protein: Math.round(num(n["proteins_100g"]) || 0),
            carbs: Math.round(num(n["carbohydrates_100g"]) || 0), fat: Math.round(num(n["fat_100g"]) || 0) });
        }
        const pq = num(p.product_quantity);
        const spc = pq && sq ? Math.round((pq / sq) * 10) / 10 : null;
        return json({ found: true, name: [p.brands && p.brands.split(",")[0], p.product_name].filter(Boolean).join(" "),
          basis: "serving", serving_note: p.serving_size ? `1 serving = ${p.serving_size}` : `1 serving = ${sq} g`,
          servings_per_container: spc && spc > 1 ? spc : null,
          calories: Math.round(kcal), protein: Math.round(prot || 0), carbs: Math.round(carb || 0), fat: Math.round(fat || 0) });
      }

      return json({ error: "not found" }, 404);
    } catch (err) {
      return json({ error: String(err) }, 500);
    }
  },
};
