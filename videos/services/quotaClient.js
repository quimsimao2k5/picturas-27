// Daily operations quota of the existing users service (UC-VID-001 RN3).
// The existing endpoints already implement the "reserve / refund" semantics:
//   GET  /:user/process/1         checks and reserves 1 operation
//   POST /:user/process/refund/1  gives it back
// Premium users have no daily limit (both calls succeed without counting).

const https = require("https");
const { AppError } = require("../utils/errors");

const USERS_URL = (process.env.USERS_URL || "https://users:10001/").replace(/\/?$/, "/");
const agent = new https.Agent({ rejectUnauthorized: false });

function request(method, path) {
  return new Promise((resolve, reject) => {
    const req = https.request(`${USERS_URL}${path}`, { method, agent, timeout: 5000 }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode, body }));
    });
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.end();
  });
}

/** Next reset of the quota: the users service counts operations per UTC day. */
function nextResetAt(now = Date.now()) {
  const d = new Date(now);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1)).toISOString();
}

const quotaClient = {
  /** Step 7 / REQ-VID-TRIM-013; E3 / REQ-VID-TRIM-042 when exhausted. */
  async reserve(userId) {
    let res;
    try {
      res = await request("GET", `${encodeURIComponent(userId)}/process/1`);
    } catch (_) {
      throw new AppError(503, "users_unavailable", "Could not check your daily operations.");
    }
    if (res.status === 200) return;
    if (res.body.includes("No more daily_operations available")) {
      throw new AppError(429, "daily_quota_exhausted", "You reached the daily operations limit.", {
        resetAt: nextResetAt(),
      });
    }
    throw new AppError(503, "users_unavailable", "Could not check your daily operations.");
  },

  /** REQ-VID-TRIM-032/046: give the reserved operation back. Never throws. */
  async refund(userId) {
    try {
      const res = await request("POST", `${encodeURIComponent(userId)}/process/refund/1`);
      return res.status === 200;
    } catch (err) {
      console.error("[videos] quota refund failed", userId, err.message);
      return false;
    }
  },
};

module.exports = { quotaClient, nextResetAt };
