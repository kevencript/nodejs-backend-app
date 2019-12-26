/**
 *
 * config/keys.js
 *
 * @description:  Verificando ambientes e definindo as chaves
 *
 */

if (process.env.NODE_ENV === "production") {
  // Prodcution environment keys
  module.exports = require("./prod");
} else {
  // Development environment keys
  // @caution! You should not commit this file to GitHub
  module.exports = require("./dev");
}
