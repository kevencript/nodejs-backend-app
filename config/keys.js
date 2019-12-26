/**
 *
 * config/keys.js
 *
 * @description:  Verificando ambientes e definindo as chaves
 *
 */

if (process.env.NODE_ENV === "production") {
  // Chaves do ambiente de Produção
  module.exports = require("./prod");
} else {
  // Chaves do ambiente de Desenvolvimento
  // @caution! You should not commit this file to GitHub
  module.exports = require("./dev");
}
