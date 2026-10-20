const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

async function authenticate(password, user) {
  return await bcrypt.compare(password, user.password_hash);
}

function get_jwt(user) {
  const token = jwt.sign(
    {
      id: user._id,
    },
    process.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
    },
  );

  return token;
}

// validate a jwt token, if is valid and not expired
function validate_jwt(user, token) {
  return jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
    if (err) {
      console.error(err);
      return false;
    }
    console.log(decoded);
    console.log(user);
    return decoded.id === user._id.toString(); // the toString its because the user._id is a ObjectId
  });
}

module.exports = { authenticate, get_jwt, validate_jwt };
