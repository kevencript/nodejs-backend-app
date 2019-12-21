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

// Routing
router.use("/users", users);
router.use("/services", services);

module.exports = router;
