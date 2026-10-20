// HTTP interface of the video library (internal - reached through the API
// gateway, which validates the JWT and that :user matches the token).
//
//   GET    /:user/library                    step 1 (+ recent uploads panel)
//   GET    /:user/videos/:videoId            FA4 metadata
//   POST   /:user/videos                     step 4 (create upload)
//   PUT    /:user/videos/:videoId/content    steps 5-8 (raw bytes)
//   POST   /:user/videos/:videoId/cancel     FA2
//   POST   /:user/videos/:videoId/dismiss    FA7
//   DELETE /:user/videos/:videoId            FA5
//   DELETE /:user                            account deleted (internal, called by users)
//
// Playback (UC-VID-003):
//   POST   /:user/videos/:videoId/playback   step 2 (start a stream, signed URL)
//   POST   /:user/playback/:sessionId/heartbeat
//   POST   /:user/playback/:sessionId/renew  E3a (new signed URL)
//   DELETE /:user/playback/:sessionId        step 5 / FA3 (release the stream)
//
// Trim (UC-VID-001):
//   GET    /:user/videos/:videoId/trim-eligibility  step 2 (E1, E4)
//   POST   /:user/videos/:videoId/trims             steps 6-8 (create request)
//   GET    /:user/trims                             step 10 (list requests)
//   GET    /:user/trims/:jobId                      step 10
//   POST   /:user/trims/:jobId/cancel               FA2
//   POST   /:user/trims/:jobId/seen                 notification shown
//   POST   /:user/videos/:videoId/download          step 13 (signed download URL)

const express = require("express");
const { VIDEO_STATUS } = require("../utils/status");

/** Session expiry forwarded by the gateway (decoded from the JWT "exp"). */
function sessionExpiresAt(req) {
  const value = Number(req.headers["x-session-expires-at"]);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

const clientIp = (req) => req.headers["x-client-ip"] || req.ip;

module.exports = function videosRouter(service, playback, processing) {
  const router = express.Router();

  const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

  router.get(
    "/:user/library",
    wrap(async (req, res) => {
      res.status(200).json(await service.getLibrary(req.params.user));
    }),
  );

  router.get(
    "/:user/videos/:videoId",
    wrap(async (req, res) => {
      res.status(200).json(await service.getVideo(req.params.user, req.params.videoId));
    }),
  );

  router.post(
    "/:user/videos",
    express.json(),
    wrap(async (req, res) => {
      const video = await service.createUpload(req.params.user, req.body, {
        sessionExpiresAt: sessionExpiresAt(req),
      });
      res.status(201).json(video);
    }),
  );

  router.put(
    "/:user/videos/:videoId/content",
    wrap(async (req, res) => {
      // The body is streamed straight to a temporary file - never buffered in
      // memory - because videos can reach 1 GB (Premium, RN10).
      const video = await service.receiveContent(req.params.user, req.params.videoId, req, {
        sessionExpiresAt: sessionExpiresAt(req),
      });
      // FA6: if the client already left, the processing above still completed;
      // writing to a closed socket is simply ignored.
      if (video.status === VIDEO_STATUS.REJECTED) {
        return res.status(422).json({ code: video.rejection?.code, video });
      }
      res.status(200).json(video);
    }),
  );

  router.post(
    "/:user/videos/:videoId/cancel",
    wrap(async (req, res) => {
      await service.cancelUpload(req.params.user, req.params.videoId);
      res.sendStatus(204);
    }),
  );

  router.post(
    "/:user/videos/:videoId/dismiss",
    wrap(async (req, res) => {
      await service.dismissRejected(req.params.user, req.params.videoId);
      res.sendStatus(204);
    }),
  );

  router.delete(
    "/:user/videos/:videoId",
    wrap(async (req, res) => {
      await service.deleteVideo(req.params.user, req.params.videoId);
      res.sendStatus(204);
    }),
  );

  // ------------------------------------------------------------ UC-VID-003

  if (playback) {
    router.post(
      "/:user/videos/:videoId/playback",
      express.json(),
      wrap(async (req, res) => {
        const result = await playback.start(req.params.user, req.params.videoId, {
          clientId: req.body?.clientId,
          ip: clientIp(req),
        });
        res.status(201).json(result);
      }),
    );

    router.post(
      "/:user/playback/:sessionId/heartbeat",
      wrap(async (req, res) => {
        await playback.heartbeat(req.params.user, req.params.sessionId);
        res.sendStatus(204);
      }),
    );

    router.post(
      "/:user/playback/:sessionId/renew",
      wrap(async (req, res) => {
        res.status(200).json(await playback.renew(req.params.user, req.params.sessionId, { ip: clientIp(req) }));
      }),
    );

    router.delete(
      "/:user/playback/:sessionId",
      wrap(async (req, res) => {
        await playback.stop(req.params.user, req.params.sessionId);
        res.sendStatus(204);
      }),
    );
  }

  // ------------------------------------------------------------ UC-VID-001

  if (processing) {
    router.get(
      "/:user/videos/:videoId/trim-eligibility",
      wrap(async (req, res) => {
        res.status(200).json(await processing.checkEligibility(req.params.user, req.params.videoId, "trim"));
      }),
    );

    router.post(
      "/:user/videos/:videoId/trims",
      express.json(),
      wrap(async (req, res) => {
        res.status(201).json(await processing.create(req.params.user, req.params.videoId, "trim", req.body || {}));
      }),
    );

    router.get(
      "/:user/trims",
      wrap(async (req, res) => {
        res.status(200).json(await processing.list(req.params.user));
      }),
    );

    router.get(
      "/:user/trims/:jobId",
      wrap(async (req, res) => {
        res.status(200).json(await processing.get(req.params.user, req.params.jobId));
      }),
    );

    router.post(
      "/:user/trims/:jobId/cancel",
      wrap(async (req, res) => {
        res.status(200).json(await processing.cancel(req.params.user, req.params.jobId));
      }),
    );

    router.post(
      "/:user/trims/:jobId/seen",
      wrap(async (req, res) => {
        await processing.markSeen(req.params.user, req.params.jobId);
        res.sendStatus(204);
      }),
    );
  }

  if (playback) {
    router.post(
      "/:user/videos/:videoId/download",
      wrap(async (req, res) => {
        res.status(200).json(await playback.downloadUrl(req.params.user, req.params.videoId, { ip: clientIp(req) }));
      }),
    );
  }

  // Internal: called by the users service when an account is deleted (RN13).
  // Not exposed by the API gateway.
  router.delete(
    "/:user",
    wrap(async (req, res) => {
      if (processing) await processing.cancelAllForUser(req.params.user);
      const removed = await service.deleteAllForUser(req.params.user);
      if (playback) await playback.deleteAllForUser(req.params.user);
      res.status(200).json({ removed });
    }),
  );

  return router;
};
