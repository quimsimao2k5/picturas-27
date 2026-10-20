const s3 = require("./s3Client");

async function deleteFile(userId, projectId, stage, fileName) {
  const bucketName = `user-${userId}`;
  const key = `${projectId}/${stage}/${fileName}`;

  try {
    const params = {
      Bucket: bucketName,
      Key: key,
    };

    await s3.deleteObject(params).promise();
    console.log(`Arquivo '${key}' deletado do bucket '${bucketName}'.`);
    return { message: "Arquivo deletado com sucesso!", key };
  } catch (error) {
    console.error("Erro ao deletar o arquivo:", error.message);
    throw error;
  }
}

module.exports = deleteFile;
