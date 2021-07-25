const crypto = require("crypto");

module.exports = function (s) {
  return crypto.createHash("sha256").update(s).digest("hex");
};
