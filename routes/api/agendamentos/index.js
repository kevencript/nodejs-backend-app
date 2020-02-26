/**
 * routes/api/agendamentos
 *
 * @description: Esse arquivo contem as rotas relacionadas aos agendamentos
 */

const express = require("express");
const router = express.Router();
const Auth = require("../../../middleware/auth");

// controller import
const {
  cartao_credito,
  validatorCartaoCredito,
  pre_agendar,
  validatorPreAgendar
} = require("./controller");

// @route    POST /api/agendamentos/cartao-credito
// @desc     Realizar um agendamento utilizando o cartão de crédito como forma de pagamento
// @acess    Private
router.post("/cartao-credito", Auth, validatorCartaoCredito, cartao_credito);

// @route    POST /api/agendamentos/pre-agendar
// @desc     Realizar um pré-agendamento
// @acess    Private
router.post("/pre-agendar", Auth, validatorPreAgendar, pre_agendar);

module.exports = router;
