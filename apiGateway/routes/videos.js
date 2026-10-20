// API gateway routes of the Video Library (UC-VID-002) and playback (UC-VID-003).
// Every route requires a valid JWT whose user matches :user (auth.checkToken).
// The gateway forwards the token expiry (X-Session-Expires-At) so the videos
// service can enforce E12 (session expired before the video is stored).

var express = require("express");
var router = express.Router();

const axios = require("axios");
const http = require("http");
const jwt = require("jsonwebtoken");
const auth = require("../auth/auth");

const videosURL = (process.env.VIDEOS_URL || "http://videos:11002/").replace(/\/?$/, "/");

function sessionHeaders(req) {
  const headers = {};
  const token = req.headers["authorization"]?.split(" ")[1];
  const payload = token ? jwt.decode(token) : null;
  if (payload?.exp) headers["X-Session-Expires-At"] = String(payload.exp * 1000);
  return headers;
}

function forward(res, err, fallback) {
  if (err.response) return res.status(err.response.status).jsonp(err.response.data);
  console.error("[API-GW] videos:", fallback, err.message);
  return res.status(503).jsonp({ code: "videos_unavailable", message: fallback });
}

const base = (req) => `${videosURL}${encodeURIComponent(req.params.user)}`;

const clientIp = (req) => req.headers["x-real-ip"] || req.ip;

/**
 * UC-VID-003 REQ-VID-PLAY-054: playback attempts refused here (no/invalid
 * JWT, or JWT of another user) never reach the videos service, so they are
 * logged by the gateway (A7). Refusals by the videos service (anonymous
 * profile, not the owner) are persisted there.
 */
function auditUnauthenticated(req, res, next) {
  res.on("finish", () => {
    if (res.statusCode === 401) {
      console.warn(
        "[SECURITY] " +
          JSON.stringify({
            type: "playback_denied",
            reason: "unauthenticated",
            path: req.originalUrl,
            ip: clientIp(req),
            at: new Date().toISOString(),
          }),
      );
    }
  });
  next();
}

const playbackHeaders = (req) => ({ ...sessionHeaders(req), "X-Client-Ip": clientIp(req) });

// ---------------------------------------------------------------- UC-VID-003

/** Step 2: start playing a video (signed URL + stream session). @body { clientId } */
router.post("/:user/:video/playback", auditUnauthenticated, auth.checkToken, (req, res) => {
  axios
    .post(`${base(req)}/videos/${encodeURIComponent(req.params.video)}/playback`, req.body, {
      headers: playbackHeaders(req),
    })
    .then((resp) => res.status(201).jsonp(resp.data))
    .catch((err) => forward(res, err, "Error starting the playback"));
});

/** The open player signals activity (RN6). */
router.post("/:user/playback/:session/heartbeat", auditUnauthenticated, auth.checkToken, (req, res) => {
  axios
    .post(`${base(req)}/playback/${encodeURIComponent(req.params.session)}/heartbeat`, {}, {
      headers: playbackHeaders(req),
    })
    .then(() => res.sendStatus(204))
    .catch((err) => forward(res, err, "Error refreshing the playback"));
});

/** E3a: new signed URL. An expired JWT is refused by checkToken (E3b). */
router.post("/:user/playback/:session/renew", auditUnauthenticated, auth.checkToken, (req, res) => {
  axios
    .post(`${base(req)}/playback/${encodeURIComponent(req.params.session)}/renew`, {}, {
      headers: playbackHeaders(req),
    })
    .then((resp) => res.status(200).jsonp(resp.data))
    .catch((err) => forward(res, err, "Error renewing the playback"));
});

/** Step 5 / FA3: release the stream. */
router.delete("/:user/playback/:session", auth.checkToken, (req, res) => {
  axios
    .delete(`${base(req)}/playback/${encodeURIComponent(req.params.session)}`, { headers: playbackHeaders(req) })
    .then(() => res.sendStatus(204))
    .catch((err) => forward(res, err, "Error stopping the playback"));
});

// ---------------------------------------------------------------- UC-VID-001

const simple = (method, upstreamPath, status, fallback) => (req, res) => {
  axios({ method, url: `${base(req)}${upstreamPath(req)}`, data: req.body, headers: playbackHeaders(req) })
    .then((resp) => (status === 204 ? res.sendStatus(204) : res.status(status).jsonp(resp.data)))
    .catch((err) => forward(res, err, fallback));
};
const enc = encodeURIComponent;

/** Step 2: can this video be trimmed now? (E1, E4) */
router.get("/:user/:video/trim-eligibility", auth.checkToken,
  simple("get", (r) => `/videos/${enc(r.params.video)}/trim-eligibility`, 200, "Error checking the video"));

/** Steps 6-8: create a trim request. @body { startSec, endSec, outputFormat, name, confirmFullCopy } */
router.post("/:user/:video/trims", auth.checkToken,
  simple("post", (r) => `/videos/${enc(r.params.video)}/trims`, 201, "Error creating the trim request"));

/** Step 10: list / get requests. */
router.get("/:user/trims/list", auth.checkToken, simple("get", () => `/trims`, 200, "Error listing the requests"));
router.get("/:user/trims/:job", auth.checkToken,
  simple("get", (r) => `/trims/${enc(r.params.job)}`, 200, "Error getting the request"));

/** FA2: cancel a request. */
router.post("/:user/trims/:job/cancel", auth.checkToken,
  simple("post", (r) => `/trims/${enc(r.params.job)}/cancel`, 200, "Error cancelling the request"));

/** The in-app notification of a finished request was shown. */
router.post("/:user/trims/:job/seen", auth.checkToken,
  simple("post", (r) => `/trims/${enc(r.params.job)}/seen`, 204, "Error updating the request"));

/** Step 13: signed URL to download a video. */
router.post("/:user/:video/download", auth.checkToken,
  simple("post", (r) => `/videos/${enc(r.params.video)}/download`, 200, "Error preparing the download"));

// ---------------------------------------------------------------- UC-VID-002

/**
 * Library: available videos, storage used/limit and recent uploads panel
 * (step 1, FA6, RN14).
 */
router.get("/:user", auth.checkToken, (req, res) => {
  axios
    .get(`${base(req)}/library`, { headers: sessionHeaders(req) })
    .then((resp) => res.status(200).jsonp(resp.data))
    .catch((err) => forward(res, err, "Error getting the video library"));
});

/** Metadata of one video (FA4). */
router.get("/:user/:video", auth.checkToken, (req, res) => {
  axios
    .get(`${base(req)}/videos/${encodeURIComponent(req.params.video)}`, { headers: sessionHeaders(req) })
    .then((resp) => res.status(200).jsonp(resp.data))
    .catch((err) => forward(res, err, "Error getting the video"));
});

/**
 * Step 4: create the upload.
 * @body { fileName: String, sizeBytes: Number, mimeType: String }
 */
router.post("/:user", auth.checkToken, (req, res) => {
  axios
    .post(`${base(req)}/videos`, req.body, { headers: sessionHeaders(req) })
    .then((resp) => res.status(201).jsonp(resp.data))
    .catch((err) => forward(res, err, "Error creating the upload"));
});

/**
 * Steps 5-8: upload the raw bytes of a video.
 * The request body is piped to the videos service as a stream (no buffering:
 * videos can reach 1 GB). If the browser aborts (FA2 cancel / E10 network
 * failure) the upstream request is destroyed too, so the service discards the
 * partial data.
 */
router.put("/:user/:video/content", auth.checkToken, (req, res) => {
  const target = new URL(`${base(req)}/videos/${encodeURIComponent(req.params.video)}/content`);
  const headers = {
    ...sessionHeaders(req),
    "Content-Type": "application/octet-stream",
  };
  if (req.headers["content-length"]) headers["Content-Length"] = req.headers["content-length"];

  const upstream = http.request(
    { method: "PUT", hostname: target.hostname, port: target.port, path: target.pathname, headers },
    (upstreamRes) => {
      res.status(upstreamRes.statusCode);
      res.set("Content-Type", upstreamRes.headers["content-type"] || "application/json");
      upstreamRes.pipe(res);
    },
  );

  upstream.on("error", (err) => {
    if (!res.headersSent) {
      res.status(503).jsonp({ code: "videos_unavailable", message: "Error uploading the video" });
    }
    console.error("[API-GW] videos upload:", err.message);
  });

  // Client went away before the body was fully sent -> abort upstream.
  req.on("close", () => {
    if (!req.complete) upstream.destroy(new Error("client aborted"));
  });
  req.pipe(upstream);
});

/** FA2: cancel an upload that is still "uploading". */
router.post("/:user/:video/cancel", auth.checkToken, (req, res) => {
  axios
    .post(`${base(req)}/videos/${encodeURIComponent(req.params.video)}/cancel`, {}, { headers: sessionHeaders(req) })
    .then(() => res.sendStatus(204))
    .catch((err) => forward(res, err, "Error cancelling the upload"));
});

/** FA7: dismiss the notice of a rejected video. */
router.post("/:user/:video/dismiss", auth.checkToken, (req, res) => {
  axios
    .post(`${base(req)}/videos/${encodeURIComponent(req.params.video)}/dismiss`, {}, { headers: sessionHeaders(req) })
    .then(() => res.sendStatus(204))
    .catch((err) => forward(res, err, "Error dismissing the video"));
});

/** FA5: delete an available video (refused while in use - E13). */
router.delete("/:user/:video", auth.checkToken, (req, res) => {
  axios
    .delete(`${base(req)}/videos/${encodeURIComponent(req.params.video)}`, { headers: sessionHeaders(req) })
    .then(() => res.sendStatus(204))
    .catch((err) => forward(res, err, "Error deleting the video"));
});

module.exports = router;
