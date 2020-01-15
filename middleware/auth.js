/**
 * middleware/basicAuth.js
 *
 * @description: A autenticação PADRÃO obriga que o usuário tenha validado telefone
 * e seja considerado um usuário ativo ("activated":1)
 */

const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config/keys");

module.exports = function(req, res, next) {
  // Get token from header
  const token = req.header("x-auth-token");

  // Check if not token
  if (!token) {
    return res.status(401).json({ msg: "Sem token, autorização negada" });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, jwtSecret);

    if (decoded.user.activated === 0) {
      return res
        .status(401)
        .json({ msg: "Usuário não foi ativado, autorização negada" });
    }

    req.user = decoded.user;
    next();
  } catch (err) {
    return res.status(401).json({ errorMessage: "O token não é válido" });
  }
};
