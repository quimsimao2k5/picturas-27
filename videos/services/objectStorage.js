// Persistent storage of video files in the existing SeaweedFS S3 store.
// Same bucket convention as the image storage service: one bucket per user
// ("user-<userId>"); videos live under the "videos/" prefix.

const fs = require("fs");

let s3Client = null;
function s3() {
  if (!s3Client) {
    // Lazy require: the unit tests never load the AWS SDK.
    const AWS = require("aws-sdk");
    s3Client = new AWS.S3({
      endpoint: `http://${process.env.S3_ENDPOINT || "seaweedfs:9000"}`,
      accessKeyId: process.env.S3_ACCESS_KEY || "admin",
      secretAccessKey: process.env.S3_SECRET_KEY || "admin123",
      s3ForcePathStyle: true,
      region: "us-east-1",
    });
  }
  return s3Client;
}

const bucketOf = (userId) => `user-${userId}`;

async function ensureBucket(bucket) {
  try {
    await s3().headBucket({ Bucket: bucket }).promise();
  } catch (_) {
    await s3().createBucket({ Bucket: bucket }).promise();
  }
}

const objectStorage = {
  /** Step 8 - stores the validated file persistently (REQ-VID-LIB-028). */
  async put(userId, key, filePath, contentType) {
    const bucket = bucketOf(userId);
    await ensureBucket(bucket);
    await s3()
      .upload({
        Bucket: bucket,
        Key: key,
        Body: fs.createReadStream(filePath),
        ContentType: contentType,
      })
      .promise();
  },

  /**
   * UC-VID-003 RN2 / REQ-VID-PLAY-005: read-only signed URL with a limited
   * lifetime. The browser reads the bytes straight from the object store
   * through the nginx "/s3" path (REQ-VID-PLAY-046), with HTTP Range
   * requests (REQ-VID-PLAY-006). Same mechanism - and same URL shape - as
   * the image storage service: no extra query parameters, because SeaweedFS
   * rejects the signature of URLs carrying response-* overrides.
   */
  async presignGet(userId, key, ttlSec) {
    const params = { Bucket: bucketOf(userId), Key: key, Expires: ttlSec };
    const url = await s3().getSignedUrlPromise("getObject", params);
    const internal = `http://${process.env.S3_ENDPOINT || "seaweedfs:9000"}`;
    const publicBase = `${process.env.FRONTEND_URL || "https://localhost:8080"}/s3`;
    return url.replace(internal, publicBase);
  },

  /**
   * UC-VID-001: signed URL reachable only inside the Docker network, used by
   * FFmpeg to read the original video (read-only, with Range requests).
   */
  async internalUrl(userId, key, ttlSec = 3600) {
    return s3().getSignedUrlPromise("getObject", { Bucket: bucketOf(userId), Key: key, Expires: ttlSec });
  },

  /** REQ-VID-PLAY-004: size of the stored file, or null when it no longer exists. */
  async head(userId, key) {
    try {
      const res = await s3().headObject({ Bucket: bucketOf(userId), Key: key }).promise();
      return { size: Number(res.ContentLength) };
    } catch (err) {
      if (err && (err.code === "NotFound" || err.code === "NoSuchKey" || err.statusCode === 404)) return null;
      throw err;
    }
  },

  /** FA5 / cleanup - removes the stored file (REQ-VID-LIB-057). */
  async remove(userId, key) {
    await s3().deleteObject({ Bucket: bucketOf(userId), Key: key }).promise();
  },
};

module.exports = { objectStorage, bucketOf };
