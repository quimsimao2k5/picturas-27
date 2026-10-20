// projects/middleware/shareAuth.js
const Project = require("../controllers/project");

async function checkSharePermission(req, res, next) {
  const shareId = req.query.share;

  if (!shareId) return next(); // acesso normal (dono / rotas sem share)

  //  share link exige autenticação
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).jsonp("Authentication required for share links");
  }

  const project = await Project.getOneByShareId(shareId);
  if (!project) return res.status(404).jsonp("Share link not found");

  const link = (project.sharedLinks || []).find((l) => l.id === shareId);
  if (!link) return res.status(410).jsonp("Share link not found");

  if (link.revoked) return res.status(410).jsonp("Share link revoked");

  if (req.params.user && String(req.params.user) !== String(project.user_id)) {
    return res.status(403).jsonp("Share link does not match this project owner");
  }
  if (req.params.project && String(req.params.project) !== String(project._id)) {
    return res.status(403).jsonp("Share link does not match this project");
  }

  req.sharedProject = project;
  req.sharedPermission = link.permission;
  next();
}

function requireEditPermission(req, res, next) {
  // Caso A — dono (sem share)
  if (!req.sharedPermission) return next();

  // Caso B — share "edit"
  if (req.sharedPermission === "edit") return next();

  return res.status(403).jsonp("Share link has no edit permission");
}

module.exports = { checkSharePermission, requireEditPermission };
