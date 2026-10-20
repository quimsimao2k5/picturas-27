const crypto = require("crypto");

function stable(obj) {
  if (Array.isArray(obj)) return obj.map(stable);
  if (obj && typeof obj === "object") {
    return Object.keys(obj).sort().reduce((acc, k) => {
      acc[k] = stable(obj[k]);
      return acc;
    }, {});
  }
  return obj;
}

function makePreviewCacheKey(imgSha256, tools) {
  const payload = stable({
    type: "preview",
    imgSha256,
    tools: tools.map(t => ({ procedure: t.procedure, params: t.params })),
  });
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

//  fingerprint do pipeline (tools + params + ordem)
function makeToolsFingerprint(tools) {
  const ordered = (tools || [])
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map(t => ({ procedure: t.procedure, params: t.params }));

  const payload = stable({ type: "tools", tools: ordered });

  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

module.exports = { makePreviewCacheKey, makeToolsFingerprint };
