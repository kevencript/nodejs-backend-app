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
  estabelecimentos_por_id,
  servicos_estabelecimento
} = require("./controller");

// @route    GET /api/estabelecimentos/categoria?page_size=x&page=x&id_categoria=x
// @desc     Retornar listagem de estabelecimentos nos quais atendem determinada categoria
// @acess    Private
router.get("/categoria", Auth, estabelecimentos_por_categoria);

// @route    GET /api/estabelecimentos/servicos?id_estabelecimento=X
// @desc     Retornar as Categorias, Subcategorias até serviços de um estabelecimento
// @acess    Private
router.get("/servicos", Auth, servicos_estabelecimento);

// @route    GET /api/estabelecimentos/categoria?id_estabelecimento=X
// @desc     Retornar dados de um estabelecimento por ID
// @acess    Private
router.get("/", Auth, estabelecimentos_por_id);

module.exports = router;
