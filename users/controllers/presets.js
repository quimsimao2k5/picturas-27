const Preset = require("../models/preset");

module.exports.listByUser = async (userId) => {
  const presets = await Preset.find({ owner_id: userId }).sort({ updatedAt: -1 }).exec();
  return presets.map((p) => p.toJSON());
};

module.exports.getOneById = async (presetId) => {
  const p = await Preset.findOne({ _id: presetId }).exec();
  return p ? p.toJSON() : null;
};

module.exports.getOneByUserAndId = async (userId, presetId) => {
  const p = await Preset.findOne({ _id: presetId, owner_id: userId }).exec();
  return p ? p.toJSON() : null;
};

module.exports.create = async (userId, preset) => {
  const created = await Preset.create({
    owner_id: userId,
    name: preset.name,
    tools: preset.tools,
  });
  return created.toJSON();
};

module.exports.update = async (userId, presetId, patch) => {
  const updated = await Preset.findOneAndUpdate(
    { _id: presetId, owner_id: userId },
    { $set: patch },
    { new: true },
  ).exec();
  return updated ? updated.toJSON() : null;
};

module.exports.delete = async (userId, presetId) => {
  return Preset.deleteOne({ _id: presetId, owner_id: userId });
};

module.exports.getByShareId = async (shareId) => {
  const p = await Preset.findOne({ "share.id": shareId, "share.revoked": false }).exec();
  return p ? p.toJSON() : null;
};

module.exports.countByUser = async (userId) => {
  return Preset.countDocuments({ owner_id: userId }).exec();
};
