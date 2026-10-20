var Result = require("../models/result");

module.exports.getAll = async (user_id, project_id) => {
  return await Result.find({ user_id: user_id, project_id: project_id })
    .sort({ _id: 1 })
    .exec();
};

module.exports.getOne = async (user_id, project_id, img_id) => {
  return await Result.findOne({
    user_id: user_id,
    project_id: project_id,
    img_id: img_id,
  }).exec();
};

module.exports.create = async (result) => {
  return await Result.create(result);
};

module.exports.update = (user_id, project_id, img_id, result) => {
  return Result.updateOne(
    { user_id: user_id, project_id: project_id, img_id: img_id },
    result,
  );
};

module.exports.delete = (user_id, project_id, img_id) => {
  return Result.deleteOne({
    user_id: user_id,
    project_id: project_id,
    img_id: img_id,
  });
};

module.exports.getAllByToken = async (user_id, project_id, token) => {
  return await Result.find({ user_id, project_id, token })
    .sort({ _id: 1 })
    .exec();
};

module.exports.deleteByToken = async (user_id, project_id, token) => {
  return await Result.deleteMany({ user_id, project_id, token }).exec();
};
