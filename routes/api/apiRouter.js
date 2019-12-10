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

// Routing
router.use("/users", users);

module.exports = router;
