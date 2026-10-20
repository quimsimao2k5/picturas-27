const Project = require("../controllers/project");

async function requireProjectVersion(req, res, next) {
  const expected = Number(req.headers["x-project-version"]);
  if (!Number.isFinite(expected)) {
    return res.status(428).jsonp("Missing X-Project-Version header");
  }


  const project = req.sharedProject || (await Project.getOne(req.params.user, req.params.project));
  if (!project) return res.status(404).jsonp("Project not found");

  req.projectDoc = project;
  req.expectedVersion = expected;

  next();
}

module.exports = { requireProjectVersion };
