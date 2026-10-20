const sharp = require("sharp");

async function extractImageFeatures(buffer) {
  const img = sharp(buffer);
  const meta = await img.metadata();
  const stats = await img.stats();

  const r = stats.channels[0]?.mean ?? 0;
  const g = stats.channels[1]?.mean ?? 0;
  const b = stats.channels[2]?.mean ?? 0;

  const meanBrightness = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  const rStd = stats.channels[0]?.stdev ?? 0;
  const gStd = stats.channels[1]?.stdev ?? 0;
  const bStd = stats.channels[2]?.stdev ?? 0;

  const contrast = (rStd + gStd + bStd) / 3;

  return {
    width: meta.width ?? null,
    height: meta.height ?? null,
    meanBrightness, // 0..255
    contrast,       // ~0..100
  };
}

module.exports = { extractImageFeatures };
