const jwt = require("jsonwebtoken");

function getCallerId(req) {
  const forwarded = req.headers["x-caller-id"];
  if (forwarded) return String(forwarded);

  const auth = req.headers["authorization"];
  if (auth && auth.startsWith("Bearer ")) {
    const token = auth.slice("Bearer ".length);
    const payload = jwt.decode(token);
    if (payload?.id) return String(payload.id);
  }

return null;
}

module.exports = { getCallerId };
