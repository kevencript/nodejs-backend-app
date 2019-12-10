/**
 * routes/Router.js
 *
 * @description: Esse é o roteador principal da aplicação, isto é, contem os
 * principais módulos macro.
 *
 */

const express = require("express");
const router = express.Router();

// Importando Módulos
const auth = require("./auth/authRouter");
const api = require("./api/apiRouter");

// Definindo Rotas
router.use("/auth", auth);
router.use("/api", api);

module.exports = router;
