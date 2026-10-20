var express = require("express");
var router = express.Router();

const axios = require("axios");

const https = require("https");
const auth = require("../auth/auth");

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

const usersURL = "https://users:10001/";

/*
User structure
{
    "_id": Mongoose.type.id,
    "name": Nullable string,
    "email": Nullable string,
    "password": Nullable string,
    "type": String,
    "operations": []
}

JWT structure = JWT with a user's _id information
*/

/**
 * Note: auth.checkToken is a midleware used to verify JWT
 */

/**
 * Validate a user's JWT
 * Header: { "Authorization" : "JWT" }
 * @returns {"valid": Boolean}
 *
 */
router.get("/validate/:user", function (req, res, next) {
  axios
    .get(usersURL + `validate/${req.params.user}`, {
      httpsAgent: httpsAgent,
      headers: { Authorization: req.headers["authorization"] },
    })
    .then((resp) => res.status(200).jsonp(resp.data))
    .catch((err) => res.status(500).jsonp("Error validating JWT token"));
});

/**
 * Get user
 * @returns User structure
 *
 */
router.get("/:user", function (req, res, next) {
  axios
    .get(usersURL + `${req.params.user}`, { httpsAgent: httpsAgent })
    .then((resp) => res.status(200).jsonp(resp.data))
    .catch((err) => res.status(500).jsonp("Error getting user"));
});

/**
 * Register a new user
 * @body { "name": String (Optional), "email": String (Optional), "password": String (Optional), "type": String }
 * @returns JWT structure
 */
router.post("/", function (req, res, next) {
  axios
    .post(usersURL, req.body, { httpsAgent })
    .then((resp) => res.status(201).jsonp(resp.data))
    .catch((err) => {
      console.error("GATEWAY REGISTER ERROR FULL OBJECT:");
      console.error(err);                // <-- log total
      console.error("GATEWAY REGISTER ERROR RESPONSE:");
      console.error(err.response?.data); // <-- resposta do users-ms
      console.error("GATEWAY REGISTER ERROR STATUS:");
      console.error(err.response?.status);

      if (err.response) {
        // devolve o status e body reais do microserviço de users
        return res.status(err.response.status).jsonp(err.response.data);
      }

      return res.status(500).jsonp("Error registering new user");
    });
});

/**
 * Login a user
 * @body { "password": String }
 * @returns An object with { "user": User structure, "jwt": JWT structure }
 */
router.post("/:email/login", function (req, res, next) {
  axios
    .post(usersURL + `${req.params.email}/login`, req.body, {
      httpsAgent: httpsAgent,
    })
    .then((resp) => res.status(201).jsonp(resp.data))
    .catch((err) => res.status(500).jsonp("Error logging in"));
});

/**
 * Update a user's information
 * @body { "name": String (Optional), "email": String (Optional), "password": String (Optional), "type": String (Optional) }
 * @returns Empty
 */
router.put("/:user", auth.checkToken, function (req, res, next) {
  axios
    .put(usersURL + `${req.params.user}`, req.body, { httpsAgent: httpsAgent })
    .then((_) => res.sendStatus(204))
    .catch((err) => res.status(500).jsonp("Error updating user's information"));
});

/**
 * Delete a user
 * @body Empty
 * @returns Empty
 */
router.delete("/:user", auth.checkToken, function (req, res, next) {
  axios
    .delete(usersURL + `${req.params.user}`, {
      httpsAgent,
      headers: {
        Authorization: req.headers["authorization"],
      },
    })
    .then(() => res.sendStatus(204)) 
    .catch((err) => {
      console.error(
        "Gateway delete user error:",
        err.response?.status,
        err.response?.data
      );
      if (err.response) {
        return res.status(err.response.status).jsonp(err.response.data);
      }
      return res.status(500).jsonp("Error deleting user");
    });
});

/**
 * PRESETS
 */

// listar presets (default + user)
router.get("/:user/presets", auth.checkToken, function (req, res) {
  axios
    .get(usersURL + `users/${req.params.user}/presets`, {
      httpsAgent,
      headers: { Authorization: req.headers["authorization"] },
    })
    .then((resp) => res.status(200).jsonp(resp.data))
    .catch((err) => res.status(err.response?.status ?? 500).jsonp(err.response?.data ?? "Error listing presets"));
});

// criar preset
router.post("/:user/presets", auth.checkToken, function (req, res) {
  axios
    .post(usersURL + `users/${req.params.user}/presets`, req.body, {
      httpsAgent,
      headers: { Authorization: req.headers["authorization"] },
    })
    .then((resp) => res.status(201).jsonp(resp.data))
    .catch((err) => res.status(err.response?.status ?? 500).jsonp(err.response?.data ?? "Error creating preset"));
});

// editar preset
router.patch("/:user/presets/:presetId", auth.checkToken, function (req, res) {
  axios
    .patch(usersURL + `users/${req.params.user}/presets/${req.params.presetId}`, req.body, {
      httpsAgent,
      headers: { Authorization: req.headers["authorization"] },
    })
    .then((resp) => res.status(200).jsonp(resp.data))
    .catch((err) => res.status(err.response?.status ?? 500).jsonp(err.response?.data ?? "Error updating preset"));
});

// apagar preset
router.delete("/:user/presets/:presetId", auth.checkToken, function (req, res) {
  axios
    .delete(usersURL + `users/${req.params.user}/presets/${req.params.presetId}`, {
      httpsAgent,
      headers: { Authorization: req.headers["authorization"] },
    })
    .then(() => res.sendStatus(204))
    .catch((err) => res.status(err.response?.status ?? 500).jsonp(err.response?.data ?? "Error deleting preset"));
});

// partilhar preset
router.post("/:user/presets/:presetId/share", auth.checkToken, function (req, res) {
  axios
    .post(usersURL + `users/${req.params.user}/presets/${req.params.presetId}/share`, {}, {
      httpsAgent,
      headers: { Authorization: req.headers["authorization"] },
    })
    .then((resp) => res.status(200).jsonp(resp.data))
    .catch((err) => res.status(err.response?.status ?? 500).jsonp(err.response?.data ?? "Error sharing preset"));
});

// obter preset por link (público)
router.get("/presets/share/:shareId", function (req, res) {
  axios
    .get(usersURL + `presets/share/${req.params.shareId}`, { httpsAgent })
    .then((resp) => res.status(200).jsonp(resp.data))
    .catch((err) => res.status(err.response?.status ?? 500).jsonp(err.response?.data ?? "Error getting shared preset"));
});


module.exports = router;
