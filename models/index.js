/**
 * models/index.js
 *
 * @description: Esse arquivo contém a conexão com o Banco de Dados e teste de conexão
 *
 */

const config = require("config");
const dbConfig = config.get("database");

const Sequelize = require("sequelize");
const sequelize = new Sequelize(dbConfig); // ! Iniciando conexão com Banco

sequelize
  .authenticate()
  .then(function(err) {
    console.log("-> Conexão com Banco de Dados estabelecida com sucesso!");
  })
  .catch(function(err) {
    console.log("-> Erro ao se conectar ao Banco de Dados:", err);
  });

module.exports = sequelize;
