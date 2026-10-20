const fs = require("fs");
const https = require("https");

const key = fs.readFileSync(__dirname + "/../certs/selfsigned.key");
const cert = fs.readFileSync(__dirname + "/../certs/selfsigned.crt");

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  cert,
  key,
});

module.exports = { httpsAgent };
