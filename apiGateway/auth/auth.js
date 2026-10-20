const jwt = require("jsonwebtoken");

module.exports.checkToken = (req, res, next) => {
  const auth = req.headers["authorization"];
  const token = auth?.split(" ")[1];

  if (!token) {
    res.status(401).jsonp(`Please provide a JWT token`);
    return;
  }

  jwt.verify(token, process.env.JWT_SECRET_KEY, (e, payload) => {
    if (e) {
      res.status(401).jsonp(`Invalid JWT signature or token expired.`);
      return;
    }

    try {
      const user_id = payload.id;
      const exp = payload.exp;

      if (Date.now() >= exp * 1000) {
        res.status(401).jsonp(`JWT expired.`);
        return;
      }

      const shareId = req.query?.share;

      // Só exigimos match no caso "normal" (sem share)
      if (!shareId && user_id !== req.params.user) {
        res.status(401).jsonp(`Request's user and JWT's user don't match`);
        return;
      }

      req.authUserId = user_id;

      next();
    } catch (_) {
      res.status(401).jsonp(`Invalid JWT`);
    }
  });
};