const s3 = require("./s3Client");
const createBucket = require("./createBucket");
const { v4: uuidv4 } = require("uuid");

async function uploadImage(userId, projectId, file, stage) {
  const bucketName = `user-${userId}`;
  await createBucket(bucketName);

  const imageKey = `${projectId}/${stage}/${uuidv4()}.${file.mimetype.split("/")[1]}`;
  const params = {
    Bucket: bucketName,
    Key: imageKey,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  try {
    const data = await s3.upload(params).promise();
    return { imageKey, location: data.Location };
  } catch (error) {
    console.error("Erro ao enviar imagem:", error.message);
    throw error;
  }
}

module.exports = uploadImage;
