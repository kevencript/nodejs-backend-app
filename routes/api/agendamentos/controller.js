/**
 * routes/api/agendamentos/controller.js
 *
 * @description: Esse arquivo contém a regra de negócio e lógica (controlador) dos
 * agendamentos
 *
 */
const {
  validarCupomPromocional
} = require("../../../utilitarios/validarCupomPromocional");
const {
  transacaoSimplesCredito,
  capturarVenda
} = require("../../../utilitarios/cielo");
const { check, validationResult } = require("express-validator");

// models
const {
  sys_users,
  cad_cartoes,
  sequelize,
  cad_bandeira
} = require("../../../sequelize/models");

// @type     Middleware de validação dos campos
// @route    POST /api/agendamentos/cartao-credito
exports.validatorCartaoCredito = [
  check("cvv_cartao")
    .not()
    .isEmpty()
    .withMessage("Por favor, preencher o campo CVV")
    .not()
    .isString()
    .withMessage("O CVV deve ser composto somente por valores inteiros")
    .isLength({ min: 3, max: 3 })
    .withMessage("O CVV deve conter especificamente 3 dígitos"),
  check("id_cartao")
    .not()
    .isEmpty()
    .withMessage("Por favor, selecionar o cartão de crédito")
    .not()
    .isString()
    .withMessage(
      "O identificador do cartão de crédito deve ser um valor inteiro"
    ),
  check("id_funcionario")
    .not()
    .isEmpty()
    .withMessage("Por favor, identificar o funcionário responsável")
    .not()
    .isString()
    .withMessage("O identificador do funcionário deve ser um valor inteiro"),
  check("id_estabelecimento")
    .not()
    .isEmpty()
    .withMessage("Por favor, identificar o estabelecimento")
    .not()
    .isString()
    .withMessage(
      "O identificador do estabelecimento deve ser um valor inteiro"
    ),
  check("id_servico")
    .not()
    .isEmpty()
    .withMessage("Por favor, identificar o serviço")
    .not()
    .isString()
    .withMessage("O identificador do serviço deve ser um valor inteiro"),
  check("parcelas")
    .not()
    .isEmpty()
    .withMessage("Por favor, identificar o número de parcelas")
    .not()
    .isString()
    .withMessage("O número de parcelas deve ser um valor inteiro")
];

// @route    POST /api/agendamentos/cartao-credito
// @desc     Realizar um agendamento utilizando o cartão de crédito como forma de pagamento
exports.cartao_credito = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  try {
    // Doc: https://metring.com.br/diferenca-entre-datas-em-javascript
    const now = moment(new Date());
    const past = moment(req.body.data_agendamento);
    const duration = moment.duration(now.diff(past));

    // Verificando se o PIN está expirado
    const minutosDeDiferença = duration.asMinutes();

    // Oi
    return res.json(minutosDeDiferença);

    // Desconstruindo informações do Body
    const {
      id_estabelecimento,
      id_funcionario,
      id_cartao,
      cvv_cartao,
      id_servico,
      parcelas
    } = req.body;

    // Definição de variáveis globais
    let valorTotalVenda = 0;
    let CreditCard = {
      CardToken: null,
      Brand: null,
      SecurityToken: cvv_cartao,
      Parcelas: parcelas
    };

    // Retornando dados do usuário logado
    const user = await sys_users.findOne({
      where: {
        uuid_sysusers: req.user.id
      }
    });

    //  Retornando valor do serviço enviado, validando e calculando valor total da venda
    const infosServico = await sequelize.query(`
            SELECT valorservico::numeric::float8 FROM public.est_estabelecimento_servicos
            WHERE id_estabelecimento=${id_estabelecimento} and id_estabelecimento_servico=${id_servico}`);

    if (!infosServico[0][0] || !infosServico[0][0].valorservico)
      throw new Error(
        "Erro ao retornar valor do serviço a partir do ID informado"
      );

    valorTotalVenda = valorTotalVenda + infosServico[0][0].valorservico;

    // Buscando Token e Bandeira do cartão do usuário
    const infosCartao = await sequelize.query(`
        SELECT 
            CAR.token,
            BAN.descbandeira
        FROM cad_cartoes CAR INNER JOIN cad_bandeiras BAN ON BAN.id_bandeira = CAR.id_bandeira 
        WHERE id_cliente = ${user.id_sysusers} and id_cartao = ${id_cartao}
    `);

    if (!infosCartao[0][0])
      throw new Error("Nenhum cartão encontrado no ID selecionado");

    CreditCard.CardToken = infosCartao[0][0].token;
    CreditCard.Brand = infosCartao[0][0].descbandeira;

    // Validando CUPOM de DESCONTO e aplicando desconto
    const codigoCupom = req.body.cupom_desconto
      ? req.body.cupom_desconto
      : null;

    if (codigoCupom) {
      const totalDesconto = await validarCupomPromocional(
        codigoCupom,
        user.id_sysusers,
        valorTotalVenda
      );

      if (!totalDesconto) throw new Error("Cupom inválido");

      valorTotalVenda = valorTotalVenda - totalDesconto;
    }

    // Efetuando pagamento
    const { CardToken, Brand, SecurityToken, Parcelas } = CreditCard;

    const infosTransacao = await transacaoSimplesCredito(
      CardToken,
      SecurityToken,
      Brand,
      valorTotalVenda,
      Parcelas,
      user.nome
    );

    const PaymentId = infosTransacao.data.Payment.PaymentId;

    // Efetuando Captura do pagamento (somente recebemos o dinheiro da venda se ela for capturada)
    const infosConfirmacao = await capturarVenda(PaymentId);

    res.json(infosConfirmacao.data);
  } catch (error) {
    console.log(error);
    res.status(400).json({
      errors: [
        {
          msg: "Erro ao realizar agendamento",
          callback: error.message
        }
      ]
    });
  }
};
