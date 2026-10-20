const express = require("express");
const { getInternalUrl, getPublicUrl } = require("../services/getPresignedUrl");
const allowedStages = require("../utils/stages");

const router = express.Router();

// internal: for services inside the Docker network; public: for the browser, via nginx.
const urlGetters = { internal: getInternalUrl, public: getPublicUrl };

router.get("/:access/:userId/:projectId/:stage/:imageName", async (req, res) => {
  const { access, userId, projectId, stage, imageName } = req.params;

  if (!Object.hasOwn(urlGetters, access)) {
    return res.status(400).json({
      error: "O acesso deve ser internal ou public.",
    });
  }

  if (!allowedStages.includes(stage)) {
    return res.status(400).json({
      error: "O estágio deve ser src, preview, preview_cache ou out.",
    });
  }

  try {
    const url = await urlGetters[access](userId, projectId, stage, imageName);
    res.status(200).json({ url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
