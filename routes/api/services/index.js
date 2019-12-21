/**
 * routes/api/services/index.js
 *
 * @description: Esse arquivo contem as rotas relacionadas aos serviços da API
 */

const express = require("express");
const router = express.Router();
const Auth = require("../../../middleware/auth");

// controller import
const { sms_emitter, validator_sms_emitter } = require("./controller");

// @route    POST /api/services/sms-emitter
// @desc     Realizar o envio de SMS
// @acess    Private
router.post("/sms-emitter", Auth, [validator_sms_emitter], sms_emitter);

module.exports = router;
