const crypto = require("crypto");

const ALGO = "aes-256-gcm";

// chave base vem de ENV
if (!process.env.FIELD_ENCRYPTION_KEY) {
  throw new Error("FIELD_ENCRYPTION_KEY is not defined");
}

const KEY = crypto
  .createHash("sha256")
  .update(process.env.FIELD_ENCRYPTION_KEY)
  .digest(); // 32 bytes

function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(12); // GCM recomenda 12 bytes
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // guardamos tudo em base64: iv:authTag:cipher
  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

function decrypt(payload) {
  if (!payload) return null;
  const [ivB64, tagB64, dataB64] = payload.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(tagB64, "base64");
  const encrypted = Buffer.from(dataB64, "base64");

  const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

// função para hash do email (para pesquisas/unique index)
function hashEmail(email) {
  if (!email) return null;
  return crypto
    .createHash("sha256")
    .update(email.trim().toLowerCase()) // case-insensitive
    .digest("hex");
}

module.exports = { encrypt, decrypt, hashEmail };