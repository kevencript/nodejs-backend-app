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
const moment = require("moment");

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
    .withMessage("O número de parcelas deve ser um valor inteiro"),
  check("data_agendamento")
    .not()
    .isEmpty()
    .withMessage("Por favor, preencher a data di agendamento")
  // .custom(dataAgendamento => {
  //   const allPossibleFormats = [];

  //   if (!isValid) throw new Error("CPF inválido");
  //   return true;
  // })
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

// @type     Middleware de validação dos campos
// @route    POST /api/agendamentos/pre-agendar
exports.validatorPreAgendar = [
  check("id_estabelecimento")
    .not()
    .isEmpty()
    .withMessage("Por favor, identificar o estabelecimento")
    .not()
    .isString()
    .withMessage(
      "O identificador do estabelecimento deve ser um valor inteiro"
    ),
  check("id_estabelecimento_servico")
    .not()
    .isEmpty()
    .withMessage("Por favor, identificar o serviço")
    .not()
    .isString()
    .withMessage("O identificador do serviço deve ser um valor inteiro"),
  check("id_funcionarioagendamento")
    .not()
    .isEmpty()
    .withMessage("Por favor, identificar o funcionário")
    .not()
    .isString()
    .withMessage("O identificador do funcionário deve ser um valor inteiro"),
  check("id_horario")
    .not()
    .isEmpty()
    .withMessage("Por favor, identificar o identificador do horário")
    .not()
    .isString()
    .withMessage("O identificador do horário deve ser um valor inteiro")
];

// @route    POST /api/agendamentos/pre-agendar
// @desc     Realizar um pré-agendamento
exports.pre_agendar = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  try {
    // Retornando dados do usuário logado
    const user = await sys_users.findOne({
      where: {
        uuid_sysusers: req.user.id
      }
    });

    const {
      id_estabelecimento,
      id_estabelecimento_servico,
      id_funcionarioagendamento,
      id_horario
    } = req.body;

    // Configuração de dados Fixos
    const id_statusagendamento = 1; // status "cadastrado"
    const id_usuariostatus = 1; // status inicial
    const status_funcionario = 1; // 1=agendado, 0=cancelado, 2=expirado
    const timestamp = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
    const id_cliente = parseInt(user.id_sysusers);

    // Validando se o ID horário é válido
    const isHorarioValido = await sequelize.query(
      `
        select true 
        from est_horarios where 
        id_estabelecimento = :id_estabelecimento and 
        id_horario = :id_horario and 
        ativo = true
    `,
      {
        replacements: {
          id_horario,
          id_estabelecimento
        },
        type: sequelize.QueryTypes.SELECT
      }
    );

    if (!isHorarioValido[0])
      throw new Error(
        "Identificador do horário ou estabelecimento inválido(s)"
      );

    // Validando se o horário está ocupado
    const isOcupado = await sequelize.query(
      `
        SELECT
            dthoraregistro
        FROM
                age_funcionarios_servicos S
        INNER JOIN
                est_horarios H
        ON
                H.id_estabelecimento = S.id_estabelecimento
        AND     H.id_horario         = S.id_horario
        WHERE
                h.id_estabelecimento = :id_estabelecimento --parametro
        AND		id_funcionario = :id_funcionarioagendamento 
        AND		H.datatrabalho = H.datatrabalho
        AND 	H.id_horario = :id_horario;
    `,
      {
        replacements: {
          id_horario,
          id_estabelecimento,
          id_funcionarioagendamento
        },
        type: sequelize.QueryTypes.SELECT
      }
    );

    if (isOcupado[0]) {
      throw new Error("Horário ocupado");
    }

    // Inserindo pre-agendamento
    const insertPreAgendamento = await sequelize.query(
      `
          INSERT INTO
              public.age_agendamentos_servicos
              (
                      id_estabelecimento        ,
                      id_estabelecimento_servico,
                      id_statusagendamento        ,
                      datahorastatus              ,
                      idusuariostatus           ,
                      id_cliente,
                      id_horario,
                      id_funcionarioagendamento
              )
        SELECT
              :id_estabelecimento             id_estabelecimento        ,
              :id_estabelecimento_servico     id_estabelecimento_servico,	--parametro = id do servico selecionado
              :id_statusagendamento           id_statusagendamento       ,	-- fixo - status agendamento cadastrado
              TIMESTAMP :timestamp            datahorastatus              ,
              :id_usuariostatus               idusuariostatus           ,
              :id_cliente                     id_cliente, --parametro
              :id_horario                     id_horario,
              :id_funcionarioagendamento      --parametro do funcionario que realizara o servico do agendamento

        RETURNING id_agendamento_servico;
    
    `,
      {
        replacements: {
          id_estabelecimento,
          id_estabelecimento_servico,
          id_statusagendamento,
          timestamp,
          id_usuariostatus,
          id_cliente,
          id_horario,
          id_funcionarioagendamento
        },
        type: sequelize.QueryTypes.INSERT
      }
    );

    // Inserindo na tabela do funcionário
    const insertFuncionario = await sequelize.query(
      `
      INSERT INTO
        public.age_funcionarios_servicos
      (
        id_cliente,
        status,
        id_funcionario,
        id_estabelecimento,
        dthoraregistro,
        id_horario
      )
      VALUES (

        :id_cliente ,
        :status_funcionario,                     
        :id_funcionarioagendamento,              
        :id_estabelecimento,                     
        :timestamp,                              
        :id_horario                              
      )`,
      {
        replacements: {
          id_cliente,
          status_funcionario,
          id_funcionarioagendamento,
          id_estabelecimento,
          timestamp,
          id_horario
        },
        type: sequelize.QueryTypes.INSERT
      }
    );

    const id_agendamento_servico = parseInt(
      insertPreAgendamento[0][0].id_agendamento_servico
    );

    res.json({ id_agendamento_servico });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      errors: [
        {
          msg: "Erro ao realizar pre-agendamento",
          callback: error.message
        }
      ]
    });
  }
};
