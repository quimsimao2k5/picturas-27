const { ensureEditorSlot } = require("../utils/presence");
const { getCallerId } = require("../utils/caller");

module.exports = async function enforcePresenceLimit(req, res, next) {
  try {
    const ownerId = req.params.user;
    const projectId = req.params.project;
    const callerId = getCallerId(req);

    const result = await ensureEditorSlot({ ownerId, projectId, callerId });
    if (!result.ok) {
      return res.status(429).jsonp({
        message: "Too many active editors for this project",
        active: result.active,
        limit: result.limit,
      });
    }

    return next();
  } catch (e) {
    return res.status(501).jsonp("Error checking presence limit");
  }
};
