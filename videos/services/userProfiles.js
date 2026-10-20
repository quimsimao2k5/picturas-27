// Resolves the profile of a user through the existing users service
// (GET /:user/type). The profile is authoritative on the server side: the
// JWT only carries the user id.

const https = require("https");
const { AppError } = require("../utils/errors");

const USERS_URL = (process.env.USERS_URL || "https://users:10001/").replace(/\/?$/, "/");
// Internal Docker network with the self-signed certificate used by users.
const agent = new https.Agent({ rejectUnauthorized: false });

function getUserType(userId) {
  return new Promise((resolve, reject) => {
    const url = `${USERS_URL}${encodeURIComponent(userId)}/type`;
    const req = https.get(url, { agent, timeout: 5000 }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        if (res.statusCode !== 200) {
          return reject(new AppError(401, "unknown_user", "User not found."));
        }
        try {
          resolve(JSON.parse(body).type);
        } catch (_) {
          reject(new AppError(503, "users_unavailable", "Could not resolve the user profile."));
        }
      });
    });
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", () =>
      reject(new AppError(503, "users_unavailable", "Could not resolve the user profile.")),
    );
  });
}

module.exports = { userProfiles: { getUserType } };
