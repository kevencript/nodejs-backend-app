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
  servicos_estabelecimento,
  funcionarios_estabelecimento,
  validatorFuncionariosEst,
  funcionarios_horarios_reservados,
  validatorFuncionariosHorariosRes
} = require("./controller");

// @route    GET /api/estabelecimentos/categoria?page_size=x&page=x&id_categoria=x
// @desc     Retornar listagem de estabelecimentos nos quais atendem determinada categoria
// @acess    Private
router.get("/categoria", Auth, estabelecimentos_por_categoria);

// @route    GET /api/estabelecimentos/servicos?id_estabelecimento=X
// @desc     Retornar as Categorias, Subcategorias até serviços de um estabelecimento
// @acess    Private
router.get("/servicos", Auth, servicos_estabelecimento);

// @route    GET /api/estabelecimentos/funcionarios?id_estabelecimento=X
// @desc     Retornar os Funcionários de um estabelecimento
// @acess    Private
router.get("/funcionarios", Auth, validatorFuncionariosEst, funcionarios_estabelecimento);

// @route    GET /api/estabelecimentos/funcionarios/horariosReservados?id_estabelecimento=X&id_funcionario=X&datatrabalho=XXXX-XX-XX
// @desc     Retornar os horários reservados do funcionario selecionado
// @acess    Private
router.get("/funcionarios/horario_reservados", Auth, validatorFuncionariosHorariosRes, funcionarios_horarios_reservados);

// @route    GET /api/estabelecimentos/funcionarios/horariosDisponiveis?id_estabelecimento=X&id_funcionario=X&datatrabalho=XXXX-XX-XX
// @desc     Retornar os horários disponiveis do funcionario selecionado
// @acess    Private
router.get("/funcionarios/horario_disponiveis", Auth, validatorFuncionariosHorariosRes, funcionarios_horarios_disponiveis);

// @route    GET /api/estabelecimentos/categoria?id_estabelecimento=X
// @desc     Retornar dados de um estabelecimento por ID
// @acess    Private
router.get("/", Auth, estabelecimentos_por_id);

module.exports = router;
