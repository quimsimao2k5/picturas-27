var Project = require("../models/project");
const ProjectModel = require("../models/project");

// DELETE condicional por versão
module.exports.deleteIfVersion = async (user_id, project_id, expectedVersion) => {
  const res = await Project.deleteOne({
    user_id: user_id,
    _id: project_id,
    version: expectedVersion,
  });

  return res.deletedCount === 1;
};

// Adicionar share link (atómico + versão)
module.exports.addShareLinkIfVersion = async (
  user_id,
  project_id,
  newLink,
  expectedVersion
) => {
  return await Project.findOneAndUpdate(
    { user_id: user_id, _id: project_id, version: expectedVersion },
    { $push: { sharedLinks: newLink }, $inc: { version: 1 } },
    { new: true }
  ).exec();
};

// Revogar share link (atómico + versão)
module.exports.revokeShareLinkIfVersion = async (
  user_id,
  project_id,
  shareId,
  expectedVersion
) => {
  return await Project.findOneAndUpdate(
    {
      user_id: user_id,
      _id: project_id,
      version: expectedVersion,
      "sharedLinks.id": shareId,
    },
    { $set: { "sharedLinks.$.revoked": true }, $inc: { version: 1 } },
    { new: true }
  ).exec();
};

module.exports.getAll = async (user_id) => {
  return await Project.find({ user_id: user_id }).sort({ _id: 1 }).exec();
};

module.exports.getOne = async (user_id, project_id) => {
  return await Project.findOne({ user_id: user_id, _id: project_id }).exec();
};

module.exports.create = async (project) => {
  return await Project.create(project);
};

module.exports.update = (user_id, project_id, project) => {
  return Project.updateOne({ user_id: user_id, _id: project_id }, project);
};

module.exports.delete = (user_id, project_id) => {
  return Project.deleteOne({ user_id: user_id, _id: project_id });
};

// Devolve o projeto que contém este shareId
module.exports.getOneByShareId = (shareId) =>
  Project.findOne({ "sharedLinks.id": shareId }).exec();

module.exports.updateIfVersion = async (user_id, project_id, project, expectedVersion) => {
  const raw = project.toObject ? project.toObject() : project;

  // remove campos que não se quer "setar"
  const { _id, user_id: _uid, version, __v, sharedLinks, ...rest } = raw;

  return await Project.findOneAndUpdate(
    { user_id: user_id, _id: project_id, version: expectedVersion },
    { $set: rest, $inc: { version: 1 } },
    { new: true } // devolve documento já com versão incrementada
  ).exec();
};

module.exports.updateRaw = async (user_id, project_id, update) => {
  return await ProjectModel.updateOne(
    { user_id, _id: project_id },
    update
  ).exec();
};

