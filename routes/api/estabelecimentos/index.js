/**
 * routes/api/estabelecimentos
 *
 * @description: Esse arquivo contem as rotas relacionadas aos estabelecimentos
 */

const express = require("express");
const router = express.Router();
const Auth = require("../../../middleware/auth");

// controller import
const {
  estabelecimentos_por_categoria,
  estabelecimentos_por_id
} = require("./controller");

// @route    GET /api/estabelecimentos/categoria
// @desc     Retornar listagem de estabelecimentos nos quais atendem determinada categoria
// @acess    Private
router.get("/categoria", Auth, estabelecimentos_por_categoria);

// @route    GET /api/estabelecimentos/categoria/:id
// @desc     Retornar dados de um estabelecimento por ID
// @acess    Private
router.get("/categoria/:id_estabelecimento", Auth, estabelecimentos_por_id);

module.exports = router;
