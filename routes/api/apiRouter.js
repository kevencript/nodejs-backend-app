/**
 * routes/api/apiRouter.js
 *
 * @description: Esse arquivo contem a definição dos modulos de API
 *
 */

const express = require("express");
const router = express.Router();

// modules import
const users = require("./users");
const services = require("./services");
const estabelecimentos = require("./estabelecimentos");
const agendamentos = require("./agendamentos");

// Routing
router.use("/users", users);
router.use("/services", services);
router.use("/estabelecimentos", estabelecimentos);
router.use("/agendamentos", agendamentos);

module.exports = router;
