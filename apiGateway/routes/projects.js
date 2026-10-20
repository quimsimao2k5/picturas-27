var express = require("express");
var router = express.Router();

const axios = require("axios");

const https = require("https");
const fs = require("fs");

const multer = require("multer");
const FormData = require("form-data");

const auth = require("../auth/auth");

const key = fs.readFileSync(__dirname + "/../certs/selfsigned.key");
const cert = fs.readFileSync(__dirname + "/../certs/selfsigned.crt");

const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // (NOTE: this will disable client verification)
  cert: cert,
  key: key,
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const projectsURL = "https://projects:9001/";

function forwardAxiosError(res, err, fallbackMsg) {
  const status = err.response?.status || 500;
  const data =
    err.response?.data ||
    (err.code === "ECONNREFUSED" ? "Projects service unavailable" : fallbackMsg);

  // reenviar versão se existir
  const v = err.response?.headers?.["x-project-version"];
  if (v) res.set("X-Project-Version", v);

  console.error("[API-GW]", status, fallbackMsg, {
    data: err.response?.data,
    message: err.message,
  });

  return res.status(status).jsonp(data);
}

// TODO Verify jwt

/*
Project structure
{
    "_id": Mongoose.type.id,
    "user_id": Mongoose.type.id,
    "name": String,
    "imgs": [Image Structure],
    "tools": [Tool Structure],
}

Image structure
{
    "_id": Mongoose.type.id,
    "og_uri": String,
    "new_uri": String
}

Tool structure
{
    "_id": Mongoose.type._id,
    "position": Number,
    "procedure": String,
    "params": Object
}

Post answer structure in case of success
{
    "acknowledged": Bool,
    "modifiedCount": Number,
    "upsertedId": null,
    "upsertedCount": Number,
    "matchedCount": Number
}
*/

/**
 * Note: auth.checkToken is a midleware used to verify JWT
 */

// listar links de um projeto (só dono) – protegido
router.get("/:user/:project/share", auth.checkToken, (req, res) => {
  axios
    .get(projectsURL + `${req.params.user}/${req.params.project}/share`, {
      httpsAgent,
      headers: { Authorization: req.headers["authorization"] },
    })
    .then((resp) => res.status(200).jsonp(resp.data))
    .catch((err) => forwardAxiosError(res, err, "mensagem fallback"))

});

// criar link de partilha
router.post("/:user/:project/share", auth.checkToken, (req, res) => {
    const callerId = req.authUserId || req.params.user;
  axios
    .post(
      projectsURL + `${req.params.user}/${req.params.project}/share`,
      req.body,
      {
        httpsAgent,
        headers: { 
          Authorization: req.headers["authorization"], 
          "X-Project-Version": req.headers["x-project-version"],
          "X-Caller-Id": callerId,
        },
      },
    )

    .then((resp) => {
          if (resp.headers?.["x-project-version"]) {
            res.set("X-Project-Version", resp.headers["x-project-version"]);
          }
          return res.status(201).jsonp(resp.data);
        })
    .catch((err) => forwardAxiosError(res, err, "mensagem fallback"))

});

// resolver link de partilha (PÚBLICO – sem auth)
// devolve { projectId, ownerId, permission }
router.get("/share/:shareId", (req, res) => {
  axios
    .get(projectsURL + `share/${req.params.shareId}`, { httpsAgent })
    .then((resp) => res.status(200).jsonp(resp.data))
    .catch((err) => forwardAxiosError(res, err, "Error resolving share link"));
});

// obter projeto completo via shareId (PROTEGIDO – requer JWT)
router.get("/share/:shareId/project", auth.checkToken, (req, res) => {
  const callerId = req.authUserId;

  axios
    .get(projectsURL + `share/${req.params.shareId}/project`, {
      httpsAgent,
      headers: {
        Authorization: req.headers["authorization"],
        "X-Caller-Id": callerId,
      },
    })
    .then((resp) => res.status(200).jsonp(resp.data))
    .catch((err) => forwardAxiosError(res, err, "Error getting shared project"));
});



// revogar link de partilha (dono, protegido)
router.delete("/:user/:project/share/:shareId", auth.checkToken, (req, res) => {
  const callerId = req.authUserId || req.params.user;

  axios
    .delete(
      projectsURL + `${req.params.user}/${req.params.project}/share/${req.params.shareId}`,
      {
        httpsAgent,
        headers: {
          Authorization: req.headers["authorization"],
          "X-Project-Version": req.headers["x-project-version"],
          "X-Caller-Id": callerId,
        },
      }
    )
    .then((resp) => {
      if (resp.headers?.["x-project-version"]) {
        res.set("X-Project-Version", resp.headers["x-project-version"]);
      }
      return res.sendStatus(204);
    })
    .catch((err) => forwardAxiosError(res, err, "mensagem fallback"));
});

/**
 * Get user's projects
 * @body Empty
 * @returns List of projects, each project has no information about it's images or tools
 */
router.get("/:user", auth.checkToken, function (req, res, next) {
  const callerId = req.authUserId || req.params.user;

  axios
    .get(projectsURL + `${req.params.user}`, {
      httpsAgent,
      headers: {
        Authorization: req.headers["authorization"],
        "X-Caller-Id": callerId,
      },
    })
    .then((resp) => res.status(200).jsonp(resp.data))
    .catch((err) => forwardAxiosError(res, err, "mensagem fallback"));
});

/**
 * Get user's project
 * @body Empty
 * @returns The required project
 */
router.get("/:user/:project", auth.checkToken, function (req, res, next) {
  const ownerId = req.query.owner || req.params.user;
  const callerId = req.authUserId || req.params.user;

  axios
    .get(projectsURL + `${ownerId}/${req.params.project}`, {
      httpsAgent,
      params: req.query.share ? { share: req.query.share } : undefined,
      headers: {
        Authorization: req.headers["authorization"],
        "X-Caller-Id": callerId,
      },
    })
    .then((resp) => res.status(200).jsonp(resp.data))
    .catch((err) => forwardAxiosError(res, err, "mensagem fallback"));
});


/**
 * Get project image
 * @body Empty
 * @returns The image url
 */
router.get(
  "/:user/:project/img/:img",
  auth.checkToken,
  function (req, res, next) {
    const ownerId = req.query.owner || req.params.user;
    const callerId = req.authUserId || req.params.user;

    axios
      .get(projectsURL + `${ownerId}/${req.params.project}/img/${req.params.img}`, {
        httpsAgent,
        params: req.query.share ? { share: req.query.share } : undefined,
        headers: {
          Authorization: req.headers["authorization"],
          "X-Caller-Id": callerId,
        },
      })
      .then((resp) => res.status(200).send(resp.data))
      .catch((err) => forwardAxiosError(res, err, "mensagem fallback"));
  }
);

/**
 * Get project images
 * @body Empty
 * @returns The project's images
 */
router.get("/:user/:project/imgs", auth.checkToken, function (req, res, next) {
  const ownerId = req.query.owner || req.params.user;
  const callerId = req.authUserId || req.params.user;

  axios
    .get(projectsURL + `${ownerId}/${req.params.project}/imgs`, {
      httpsAgent,
      params: req.query.share ? { share: req.query.share } : undefined,
      headers: {
        Authorization: req.headers["authorization"],
        "X-Caller-Id": callerId,
      },
    })
    .then((resp) => res.status(200).send(resp.data))
    .catch((err) => forwardAxiosError(res, err, "mensagem fallback"));
});


/**
 * Get project's processment result
 * @body Empty
 * @returns The required results, sent as a zip
 */
router.get(
  "/:user/:project/process",
  auth.checkToken,
  function (req, res, next) {
    const ownerId = req.query.owner || req.params.user;
    const callerId = req.authUserId || req.params.user;

    axios
      .get(projectsURL + `${ownerId}/${req.params.project}/process`, {
        httpsAgent,
        responseType: "arraybuffer",
        params: req.query.share ? { share: req.query.share } : undefined,
        headers: {
          Authorization: req.headers["authorization"],
          "X-Caller-Id": callerId,
        },
      })
      .then((resp) => res.status(200).send(resp.data))
      .catch((err) => forwardAxiosError(res, err, "mensagem fallback"));
  }
);

  // Cancelar processamento de um projeto
router.delete("/:user/:project/process", auth.checkToken, (req, res) => {
  const ownerId = req.query.owner || req.params.user;
  const callerId = req.authUserId || req.params.user;


  axios
    .delete(projectsURL + `${ownerId}/${req.params.project}/process`, {
      httpsAgent,
      params: req.query.share ? { share: req.query.share } : undefined,
      headers: {
        Authorization: req.headers["authorization"],
        "X-Project-Version": req.headers["x-project-version"],
        "X-Caller-Id": callerId,
      },
    })
    .then((resp) => {
      //  reenviar versão se vier do projects-ms
      if (resp.headers?.["x-project-version"]) {
        res.set("X-Project-Version", resp.headers["x-project-version"]);
      }
      return res.sendStatus(204);
    })
    .catch((err) => forwardAxiosError(res, err, "mensagem fallback"))

});


/**
 * Get project's processment result
 * @body Empty
 * @returns The required results, sent as [{img_id, img_name, url}]
 */
router.get(
  "/:user/:project/process/url",
  auth.checkToken,
  function (req, res, next) {
    const ownerId = req.query.owner || req.params.user;
    const callerId = req.authUserId || req.params.user;

    axios
      .get(projectsURL + `${ownerId}/${req.params.project}/process/url`, {
        httpsAgent,
        params: req.query.share ? { share: req.query.share } : undefined,
        headers: {
          Authorization: req.headers["authorization"],
          "X-Caller-Id": callerId,
        },
      })
      .then((resp) => res.status(200).send(resp.data))
      .catch((err) => forwardAxiosError(res, err, "mensagem fallback"));
  }
);


/**
 * Create new user's project
 * @body { "name": String }
 * @returns Created project's data
 */
router.post("/:user", auth.checkToken, function (req, res, next) {
  axios
    .post(projectsURL + `${req.params.user}`, req.body, {
      httpsAgent: httpsAgent,
    })
    .then((resp) => res.status(201).jsonp(resp.data))
    .catch((err) => forwardAxiosError(res, err, "mensagem fallback"))
});

/**
 * Preview an image
 * @body Empty
 * @returns String indication preview is being processed
 */
router.post(
  "/:user/:project/preview/:img",
  auth.checkToken,
  function (req, res, next) {
    const ownerId = req.query.owner || req.params.user;
    const callerId = req.authUserId || req.params.user;

    const body = {
      ...req.body,
      runnerUserId: callerId,                         
    };

    axios
      .post(
        projectsURL +
          `${ownerId}/${req.params.project}/preview/${req.params.img}`,
        body,
        { 
          httpsAgent: httpsAgent,
          params: req.query.share ? { share: req.query.share } : undefined, 
        
        headers: {
          Authorization: req.headers["authorization"],
          "X-Caller-Id": callerId,
        },
      }
      )
      .then((resp) => res.status(201).jsonp(resp.data))
      .catch((err) => forwardAxiosError(res, err, "mensagem fallback"))
  }
);

/**
 * Add image to project
 * @body Empty
 * @file Image to be added
 * @returns Post answer structure in case of success
 */
router.post(
  "/:user/:project/img",
  upload.single("image"),
  auth.checkToken,
  function (req, res, next) {
    const ownerId = req.query.owner || req.params.user;
    const callerId = req.authUserId || req.params.user;

    const data = new FormData();
    data.append("image", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    axios
      .post(
        projectsURL + `${ownerId}/${req.params.project}/img`,
        data,
        {
          headers: {
            ...data.getHeaders(),                     
            Authorization: req.headers["authorization"], 
            "X-Project-Version": req.headers["x-project-version"],
            "X-Caller-Id": callerId,
          },
          httpsAgent: httpsAgent,
          params: req.query.share ? { share: req.query.share } : undefined, 
          
        }
      )
      .then((resp) => {
        if (resp.headers?.["x-project-version"]) {
          res.set("X-Project-Version", resp.headers["x-project-version"]);
        }
        return res.sendStatus(204);
      })
    .catch((err) => forwardAxiosError(res, err, "mensagem fallback"))

  }
);

/**
 * Add tool to project
 * @body { "procedure": String, "params": Object }
 * @returns Post answer structure in case of success
 */
router.post("/:user/:project/tool", auth.checkToken, function (req, res, next) {
  const ownerId = req.query.owner || req.params.user;
  const callerId = req.authUserId || req.params.user;

  axios.post(
    projectsURL + `${ownerId}/${req.params.project}/tool`,
    req.body,
    {
      httpsAgent,
      params: req.query.share ? { share: req.query.share } : undefined,
      headers: {
        Authorization: req.headers["authorization"],
        "X-Project-Version": req.headers["x-project-version"],
        "X-Caller-Id": callerId,
      },
    }
  )

    .then((resp) => {
      if (resp.headers?.["x-project-version"]) {
        res.set("X-Project-Version", resp.headers["x-project-version"]);
      }
      return res.status(201).jsonp(resp.data);
    })
    .catch((err) => forwardAxiosError(res, err, "mensagem fallback"))
});

/**
 * Reorder tools of a project
 * @body [{ "position": Number, "procedure": String, "params": Object }] (Position is a unique number between 0 and req.body.length - 1)
 * @returns Post answer structure in case of success
 */
router.post(
  "/:user/:project/reorder",
  auth.checkToken,
  function (req, res, next) {
    const ownerId = req.query.owner || req.params.user;
    const callerId = req.authUserId || req.params.user;

    axios
      .post(
        projectsURL + `${ownerId}/${req.params.project}/reorder`,
        req.body,
        { httpsAgent: httpsAgent,
          params: req.query.share ? { share: req.query.share } : undefined,
          headers: {
            Authorization: req.headers["authorization"],
            "X-Project-Version": req.headers["x-project-version"],
            "X-Caller-Id": callerId,
          },
         }
      )

      .then((resp) => {
        if (resp.headers?.["x-project-version"]) {
          res.set("X-Project-Version", resp.headers["x-project-version"]);
        }
        return res.status(201).jsonp(resp.data);
      })
      .catch((err) => forwardAxiosError(res, err, "mensagem fallback"))
  }
);

/**
 * Generate request to process a project
 * @body Empty
 * @returns String indicating process request has been created
 */
router.post(
  "/:user/:project/process",
  auth.checkToken,
  function (req, res, next) {
    const ownerId = req.query.owner || req.params.user;
    const callerId = req.authUserId || req.params.user;

    const body = {
      ...req.body,
      runnerUserId: callerId,                         
    };

    axios
      .post(
        projectsURL + `${ownerId}/${req.params.project}/process`,
        body,
        { httpsAgent: httpsAgent,
          params: req.query.share ? { share: req.query.share } : undefined,

          headers: {
            Authorization: req.headers["authorization"],
            "X-Project-Version": req.headers["x-project-version"],
            "X-Caller-Id": callerId,
          },
         }
      )

      .then((resp) => {
        if (resp.headers?.["x-project-version"]) {
          res.set("X-Project-Version", resp.headers["x-project-version"]);
        }
        return res.status(201).jsonp(resp.data);
      })
    .catch((err) => forwardAxiosError(res, err, "mensagem fallback"))

  }
);

/**
 * Update a specific project
 * @body { "name": String }
 * @returns Empty
 */
router.put("/:user/:project", auth.checkToken, function (req, res, next) {
  const ownerId = req.query.owner || req.params.user;
  const callerId = req.authUserId || req.params.user;

  axios
    .put(projectsURL + `${ownerId}/${req.params.project}`, req.body, {
      httpsAgent,
      params: req.query.share ? { share: req.query.share } : undefined, 
      headers: {
        Authorization: req.headers["authorization"],
        "X-Project-Version": req.headers["x-project-version"],
        "X-Caller-Id": callerId,
      },
    })
    .then((resp) => {
      if (resp.headers?.["x-project-version"]) {
        res.set("X-Project-Version", resp.headers["x-project-version"]);
      }
      return res.sendStatus(204);
    })
    .catch((err) => forwardAxiosError(res, err, "mensagem fallback"))

});

/**
 * Update a tool from a project
 * @body { "params" : Object }
 * @returns Empty
 */
router.put(
  "/:user/:project/tool/:tool",
  auth.checkToken,
  function (req, res, next) {
    const ownerId = req.query.owner || req.params.user;
    const callerId = req.authUserId || req.params.user;

    axios
      .put(
        projectsURL +
          `${ownerId}/${req.params.project}/tool/${req.params.tool}`,
        req.body,
        { httpsAgent: httpsAgent,
          params: req.query.share ? { share: req.query.share } : undefined,
          headers: {
            Authorization: req.headers["authorization"],
            "X-Project-Version": req.headers["x-project-version"],
            "X-Caller-Id": callerId,
          },
         }
      )

      .then((resp) => {
        if (resp.headers?.["x-project-version"]) {
          res.set("X-Project-Version", resp.headers["x-project-version"]);
        }
        return res.sendStatus(204);
      })
      .catch((err) => forwardAxiosError(res, err, "mensagem fallback"))
  }
);

/**
 * Delete a user's project
 * @body Empty
 * @returns Empty
 */
/**
 * Delete a user's project
 * @body Empty
 * @returns Empty
 */
router.delete("/:user/:project", auth.checkToken, function (req, res, next) {
  const ownerId = req.query.owner || req.params.user;
  const callerId = req.authUserId || req.params.user;

  axios
    .delete(projectsURL + `${ownerId}/${req.params.project}`, {
      httpsAgent,
      params: req.query.share ? { share: req.query.share } : undefined,
      headers: {
        Authorization: req.headers["authorization"],
        "X-Project-Version": req.headers["x-project-version"],
        "X-Caller-Id": callerId,
      },
    })
    .then((resp) => {
      if (resp.headers?.["x-project-version"]) {
        res.set("X-Project-Version", resp.headers["x-project-version"]);
      }
      return res.sendStatus(204);
    })
    .catch((err) => forwardAxiosError(res, err, "mensagem fallback"))

});

/**
 * Remove an image from a user's project
 * @body Empty
 * @returns Empty
 */
router.delete(
  "/:user/:project/img/:img",
  auth.checkToken,
  function (req, res, next) {
    const ownerId = req.query.owner || req.params.user;
    const callerId = req.authUserId || req.params.user;

    axios
      .delete(
        projectsURL +
          `${ownerId}/${req.params.project}/img/${req.params.img}`,
        { httpsAgent: httpsAgent,
          params: req.query.share ? { share: req.query.share } : undefined,
          headers: {
            Authorization: req.headers["authorization"],
            "X-Project-Version": req.headers["x-project-version"],
            "X-Caller-Id": callerId,
          },
         }
      )

      .then((resp) => {
        if (resp.headers?.["x-project-version"]) {
          res.set("X-Project-Version", resp.headers["x-project-version"]);
        }
        return res.sendStatus(204);
      })
    .catch((err) => forwardAxiosError(res, err, "mensagem fallback"))

  }
);

/**
 * Remove a tool from a user's project
 * @body Empty
 * @returns Empty
 */
router.delete(
  "/:user/:project/tool/:tool",
  auth.checkToken,
  function (req, res, next) {
    const ownerId = req.query.owner || req.params.user;
    const callerId = req.authUserId || req.params.user;

    axios
      .delete(
        projectsURL +
          `${ownerId}/${req.params.project}/tool/${req.params.tool}`,
        { httpsAgent: httpsAgent,
          params: req.query.share ? { share: req.query.share } : undefined,
          headers: {
            Authorization: req.headers["authorization"],
            "X-Project-Version": req.headers["x-project-version"],
            "X-Caller-Id": callerId,
          },
         }
      )

      .then((resp) => {
        if (resp.headers?.["x-project-version"]) {
          res.set("X-Project-Version", resp.headers["x-project-version"]);
        }
        return res.sendStatus(204);
      })
    .catch((err) => forwardAxiosError(res, err, "mensagem fallback"))

  }
);

// limpar tools + resultados + previews
router.post("/:user/:project/clear", auth.checkToken, (req, res) => {
  const ownerId = req.query.owner || req.params.user;
  const callerId = req.authUserId || req.params.user;

  axios
    .post(
      projectsURL + `${ownerId}/${req.params.project}/clear`,
      {},
      {
        httpsAgent,
        params: req.query.share ? { share: req.query.share } : undefined,
        headers: {
          Authorization: req.headers["authorization"],
          "X-Project-Version": req.headers["x-project-version"],
          "X-Caller-Id": callerId,
        },
      },
    )
    .then((resp) => {
      if (resp.headers?.["x-project-version"]) {
        res.set("X-Project-Version", resp.headers["x-project-version"]);
      }
      return res.sendStatus(204);
    })
    .catch((err) => forwardAxiosError(res, err, "Error clearing project"));
});

// ================== AI ASSISTANT ==================

// sugestões do assistente de IA para um projeto
router.post("/:user/:project/assistant/suggest", auth.checkToken, (req, res) => {
  const ownerId = req.query.owner || req.params.user;
  const callerId = req.authUserId || req.params.user;

  axios
    .post(
      projectsURL + `${ownerId}/${req.params.project}/assistant/suggest`,
      req.body,
      {
        httpsAgent,
        params: req.query.share ? { share: req.query.share } : undefined,
        headers: {
          Authorization: req.headers["authorization"],
          "X-Project-Version": req.headers["x-project-version"],
          "X-Caller-Id": callerId,
        },
      },
    )
    .then((resp) => {
      if (resp.headers?.["x-project-version"]) {
        res.set("X-Project-Version", resp.headers["x-project-version"]);
      }
      return res.status(200).jsonp(resp.data);
    })
    .catch((err) => forwardAxiosError(res, err, "Error generating assistant suggestions"));
});

// ================== FIM AI ASSISTANT ==================

// ================== PRESENCE (ACTIVE EDITORS) ==================

// heartbeat: manter editor ativo
router.post("/:user/:project/presence", auth.checkToken, (req, res) => {
  const ownerId = req.query.owner || req.params.user;
  const callerId = req.authUserId || req.params.user;

  axios
    .post(
      projectsURL + `${ownerId}/${req.params.project}/presence`,
      {},
      {
        httpsAgent,
        params: req.query.share ? { share: req.query.share } : undefined,
        headers: {
          Authorization: req.headers["authorization"],
          "X-Caller-Id": callerId,
        },
      },
    )
    .then((resp) => res.status(204).send())
    .catch((err) => forwardAxiosError(res, err, "Error updating presence"));
});

// libertar slot
router.delete("/:user/:project/presence", auth.checkToken, (req, res) => {
  const ownerId = req.query.owner || req.params.user;
  const callerId = req.authUserId || req.params.user;

  axios
    .delete(projectsURL + `${ownerId}/${req.params.project}/presence`, {
      httpsAgent,
      params: req.query.share ? { share: req.query.share } : undefined,
      headers: {
        Authorization: req.headers["authorization"],
        "X-Caller-Id": callerId,
      },
    })
    .then(() => res.sendStatus(204))
    .catch((err) => forwardAxiosError(res, err, "Error releasing presence"));
});

router.post("/:user/:project/dirty", auth.checkToken, (req, res) => {
  const ownerId = req.query.owner || req.params.user;
  const callerId = req.authUserId || req.params.user;

  axios
    .post(projectsURL + `${ownerId}/${req.params.project}/dirty`, req.body, {
      httpsAgent,
      params: req.query.share ? { share: req.query.share } : undefined,
      headers: {
        Authorization: req.headers["authorization"],
        "X-Project-Version": req.headers["x-project-version"],
        "X-Caller-Id": callerId,
      },
    })
    .then((resp) => {
      if (resp.headers?.["x-project-version"]) {
        res.set("X-Project-Version", resp.headers["x-project-version"]);
      }
      return res.sendStatus(204);
    })
    .catch((err) => forwardAxiosError(res, err, "Error setting dirty flag"));
});


// ================== END PRESENCE ==================

module.exports = router;
