const express = require("express");
const copyFile = require("../services/copyFile");
const allowedStages = require("../utils/stages");

const router = express.Router();

/**
 * POST /copy/:userId/:projectId/:fromStage/:toStage/:fileName
 */
router.post("/:userId/:projectId/:fromStage/:toStage/:fileName", async (req, res) => {
  const { userId, projectId, fromStage, toStage, fileName } = req.params;

  if (!allowedStages.includes(fromStage) || !allowedStages.includes(toStage)) {
    return res.status(400).json({
      error: "fromStage/toStage inválidos. Use src, preview, preview_cache ou out.",
    });
  }

  try {
    const result = await copyFile(userId, projectId, fromStage, toStage, fileName);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
