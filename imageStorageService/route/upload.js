const express = require("express");
const multer = require("multer");
const uploadImage = require("../services/uploadImage");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/:userId/:projectId/:stage",
  upload.single("file"),
  async (req, res) => {
    const { userId, projectId, stage } = req.params;

    const allowedStages = require("../utils/stages");

    if (!allowedStages.includes(stage)) {
      return res.status(400).json({
        error: "O estágio deve ser src, preview, preview_cache ou out.",
      });
    }


    try {
      const result = await uploadImage(userId, projectId, req.file, stage);
      res
        .status(201)
        .json({ message: "Imagem enviada com sucesso!", data: result });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

module.exports = router;
