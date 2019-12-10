/**
 * routes/auth/authRouter.js
 *
 * @description: Esse arquivo contem a definição dos modulos de autenticação
 *
 */

const express = require("express");
const router = express.Router();

// modules import
const jwt = require("./jwt");

// Routing
router.use("/", jwt); // Método principal de autenticação

module.exports = router;
