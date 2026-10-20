const express = require("express");
const deleteFile = require("../services/deleteFile");

const router = express.Router();

router.delete("/:userId/:projectId/:stage/:fileName", async (req, res) => {
  const { userId, projectId, stage, fileName } = req.params;

  const allowedStages = require("../utils/stages"); 

  if (!allowedStages.includes(stage)) {
    return res.status(400).json({
      error: "O estágio deve ser src, preview, preview_cache ou out.",
    });
  }


  try {
    const result = await deleteFile(userId, projectId, stage, fileName);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
