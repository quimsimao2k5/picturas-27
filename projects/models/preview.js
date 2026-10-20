const mongoose = require("mongoose");

const previewSchema = new mongoose.Schema({
  type: { type: String, required: true },
  file_name: { type: String, required: true },
  img_key: { type: String, required: true },
  img_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  project_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, required: true },
});

module.exports = mongoose.model("preview", previewSchema);
