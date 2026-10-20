const s3 = require("./s3Client");

async function copyFile(userId, projectId, fromStage, toStage, fileName) {
  const bucketName = `user-${userId}`;

  const sourceKey = `${projectId}/${fromStage}/${fileName}`;
  const destKey   = `${projectId}/${toStage}/${fileName}`;

  try {
    await s3.copyObject({
      Bucket: bucketName,
      CopySource: `/${bucketName}/${sourceKey}`,
      Key: destKey,
    }).promise();

    return { from: sourceKey, to: destKey };
  } catch (error) {
    console.error("Erro ao copiar ficheiro:", error.message);
    throw error;
  }
}

module.exports = copyFile;
