var express = require("express");
var router = express.Router();

const crypto = require("crypto");
const auth = require("../auth/auth");
const User = require("../controllers/user");
const Presets = require("../controllers/presets");

const pctToFactor = (v) => 1 + (v / 100);

/**
 * DEFAULT PRESETS (predefinidos)
 * - Mantém isto pequeno (3-6 presets) para a UI.
 * - Tens liberdade para ajustar nomes/parametrizações conforme as tools existentes.
 */
const DEFAULT_PRESETS = [
  {
    id: "default-vintage",
    name: "Vintage Suave",
    tools: [
      { procedure: "contrast", params: { contrastFactor: pctToFactor(-8) } },
      { procedure: "saturation", params: { saturationFactor: pctToFactor(-10) } },
      { procedure: "brightness", params: { brightness: pctToFactor(6) } },
    ],
    isDefault: true,
  },
  {
    id: "default-pop",
    name: "Pop (Mais cor)",
    tools: [
      { procedure: "contrast", params: { contrastFactor: pctToFactor(12) } },
      { procedure: "saturation", params: { saturationFactor: pctToFactor(14) } },
    ],
    isDefault: true,
  },
  {
    id: "default-bw",
    name: "Preto & Branco",
    tools: [
      { procedure: "binarization", params: { threshold: 128 } },
      { procedure: "contrast", params: { contrastFactor: pctToFactor(8) } },
    ],
    isDefault: true,
  },
];

/**
 * RF70: middleware de autenticação
 * - exige Authorization: Bearer <token>
 * - valida que o token pertence ao user de :user
 * - bloqueia anonymous para gestão de presets
 */
async function requireAuth(req, res, next) {
  try {
    const hdr = req.headers.authorization;
    if (!hdr || !hdr.startsWith("Bearer ")) {
      return res.status(400).jsonp("Missing or invalid Authorization header.");
    }

    const token = hdr.split(" ")[1];
    const user = await User.getOne(req.params.user);

    if (!user) return res.status(404).jsonp("User not found.");

    const ok = auth.validate_jwt(user, token);
    if (!ok) return res.status(401).jsonp("Invalid token.");

    if (user.type === "anonymous") {
      return res.status(403).jsonp("Anonymous users cannot manage presets.");
    }

    req.authedUser = user;
    return next();
  } catch (err) {
    console.error("requireAuth error:", err);
    return res.status(500).jsonp("Error validating token.");
  }
}

/**
 * GET /users/:user/presets
 * - auth
 * - devolve { defaultPresets, userPresets }
 */
router.get("/users/:user/presets", requireAuth, async function (req, res) {
  try {
    const userPresets = await Presets.listByUser(req.params.user);
    return res.status(200).json({
      defaultPresets: DEFAULT_PRESETS,
      userPresets,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).jsonp("Error listing presets.");
  }
});

/**
 * POST /users/:user/presets
 * body: { name, tools }
 * RNF66: tools.length >= 2
 */
router.post("/users/:user/presets", requireAuth, async function (req, res) {
  try {
    const { name, tools } = req.body || {};

    if (!name || typeof name !== "string" || name.trim().length < 1) {
      return res.status(400).jsonp("Preset name is required.");
    }

    if (!Array.isArray(tools) || tools.length < 2) {
      return res.status(400).jsonp("A preset must include at least 2 tools.");
    }

    // valida shape básico
    for (const t of tools) {
      if (!t || typeof t.procedure !== "string" || typeof t.params === "undefined") {
        return res.status(400).jsonp("Invalid tool format in preset.");
      }
    }

    const MAX_PRESETS = 4;

    const count = await Presets.countByUser(req.params.user);
    if (count >= MAX_PRESETS) {
      return res.status(409).jsonp(`Preset limit (${MAX_PRESETS}) reached.`);
}
    const created = await Presets.create(req.params.user, {
      name: name.trim(),
      tools: tools.map((t) => ({ procedure: t.procedure, params: t.params })),
    });

    return res.status(201).json(created);
  } catch (err) {
    // RNF64: duplicate name
    if (err?.code === 11000) {
      return res.status(409).jsonp("A preset with that name already exists.");
    }
    console.error(err);
    return res.status(500).jsonp("Error creating preset.");
  }
});

/**
 * PATCH /users/:user/presets/:presetId
 * body: { name?, tools? }
 */
router.patch("/users/:user/presets/:presetId", requireAuth, async function (req, res) {
  try {
    const { name, tools } = req.body || {};

    const patch = {};
    if (typeof name === "string") patch.name = name.trim();

    if (typeof tools !== "undefined") {
      if (!Array.isArray(tools) || tools.length < 2) {
        return res.status(400).jsonp("A preset must include at least 2 tools.");
      }
      for (const t of tools) {
        if (!t || typeof t.procedure !== "string" || typeof t.params === "undefined") {
          return res.status(400).jsonp("Invalid tool format in preset.");
        }
      }
      patch.tools = tools.map((t) => ({ procedure: t.procedure, params: t.params }));
    }

    const updated = await Presets.update(req.params.user, req.params.presetId, patch);
    if (!updated) return res.status(404).jsonp("Preset not found.");

    return res.status(200).json(updated);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).jsonp("A preset with that name already exists.");
    }
    console.error(err);
    return res.status(500).jsonp("Error updating preset.");
  }
});

/**
 * DELETE /users/:user/presets/:presetId
 */
router.delete("/users/:user/presets/:presetId", requireAuth, async function (req, res) {
  try {
    await Presets.delete(req.params.user, req.params.presetId);
    return res.sendStatus(204);
  } catch (err) {
    console.error(err);
    return res.status(500).jsonp("Error deleting preset.");
  }
});

/**
 * POST /users/:user/presets/:presetId/share
 * - cria (ou reativa) share.id
 * - devolve { shareId }
 */
router.post("/users/:user/presets/:presetId/share", requireAuth, async function (req, res) {
  try {
    const preset = await Presets.getOneByUserAndId(req.params.user, req.params.presetId);
    if (!preset) return res.status(404).jsonp("Preset not found.");

    let shareId = preset.share?.id;

    if (!shareId) {
      shareId = crypto.randomUUID();
    }

    await Presets.update(req.params.user, req.params.presetId, {
      "share.id": shareId,
      "share.revoked": false,
      "share.createdAt": new Date(),
    });

    return res.status(200).json({ shareId });
  } catch (err) {
    console.error(err);
    return res.status(500).jsonp("Error sharing preset.");
  }
});

/**
 * GET /presets/share/:shareId (público)
 * - devolve o preset se não estiver revoked
 */
router.get("/presets/share/:shareId", async function (req, res) {
  try {
    const preset = await Presets.getByShareId(req.params.shareId);
    if (!preset) return res.status(404).jsonp("Preset not found or revoked.");

    // só devolvemos o essencial
    return res.status(200).json({
      name: preset.name,
      tools: preset.tools,
      shared: true,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).jsonp("Error getting shared preset.");
  }
});

module.exports = router;
