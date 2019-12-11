/**
 * models/user_test.js
 *
 * @description: Esse arquivo contem os campos da tabela "user_test"
 *
 */

const Sequelize = require("sequelize");
const sequelize = require("./index"); // ! Arquivo de conexão com banco

const userTest = sequelize.define("user_test", {
  email: Sequelize.STRING,
  senha: Sequelize.STRING,
  nome: Sequelize.STRING
});

userTest.sync({ force: false });

module.exports = userTest;
