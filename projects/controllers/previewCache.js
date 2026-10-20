const PreviewCache = require("../models/previewCache");

module.exports.getByKey = (user_id, cache_key) =>
  PreviewCache.findOne({ user_id, cache_key }).exec();

module.exports.upsert = (doc) =>
  PreviewCache.updateOne(
    { user_id: doc.user_id, cache_key: doc.cache_key },
    { $set: doc, $inc: { hits: 1 }, $setOnInsert: { created_at: new Date() } },
    { upsert: true }
  );

module.exports.touchHit = (user_id, cache_key) =>
  PreviewCache.updateOne(
    { user_id, cache_key },
    { $set: { last_hit_at: new Date() }, $inc: { hits: 1 } }
  );
