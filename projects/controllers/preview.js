var Preview = require("../models/preview");

module.exports.getAll = async (user_id, project_id) => {
  return await Preview.find({ user_id: user_id, project_id: project_id })
    .sort({ _id: 1 })
    .exec();
};

module.exports.getOne = async (user_id, project_id, img_id) => {
  return await Preview.findOne({
    user_id: user_id,
    project_id: project_id,
    img_id: img_id,
  }).exec();
};

module.exports.create = async (preview) => {
  return await Preview.create(preview);
};

module.exports.update = (user_id, project_id, img_id, preview) => {
  return Preview.updateOne(
    { user_id: user_id, project_id: project_id, img_id: img_id },
    preview,
  );
};

module.exports.delete = (user_id, project_id, img_id) => {
  return Preview.deleteOne({
    user_id: user_id,
    project_id: project_id,
    img_id: img_id,
  });
};
