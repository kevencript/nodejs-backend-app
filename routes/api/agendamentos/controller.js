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
  check("id_agendamento_servico")
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
    // Retornando dados do usuário logado
    const user = await sys_users.findOne({
      where: {
        uuid_sysusers: req.user.id
      }
    });

    // Desconstruindo informações do Body
    const {
      id_cartao,
      cvv_cartao,
      parcelas,
      id_agendamento_servico
    } = req.body;

    // Definição de variáveis globais
    let valorTotalVenda = 0;
    let valorTotalDesconto = 0;
    let idCupom = null;
    const timestamp = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
    let CreditCard = {
      CardToken: null,
      Brand: null,
      SecurityToken: cvv_cartao,
      Parcelas: parcelas
    };

    // Retornando informações do agendamento e validando se o usuário tem acesso
    const agendamento = await sequelize.query(
      `
      SELECT AGENDAMENTO.*, SERVICO.valorservico::numeric::float8 from
        age_agendamentos_servicos AGENDAMENTO
        
        INNER JOIN est_estabelecimento_servicoS SERVICO
        on AGENDAMENTO.id_estabelecimento_servico = SERVICO.id_estabelecimento_servico
        
      WHERE 
        id_agendamento_servico = :id_agendamento_servico AND
        id_cliente = :id_cliente
    `,
      {
        replacements: {
          id_cliente: user.id_sysusers,
          id_agendamento_servico
        },
        type: sequelize.QueryTypes.SELECT
      }
    );

    // Validando se o agendamento é vávlido e qual status
    if (!agendamento[0])
      throw new Error("Erro ao encontrar agendamento vinculado ao usuário");

    if (agendamento[0].id_statusagendamento === 2)
      throw new Error("O status de agendamento inválido");

    valorTotalVenda = valorTotalVenda + agendamento[0].valorservico;

    // Validando CUPOM de DESCONTO e aplicando desconto
    const codigoCupom = req.body.cupom_desconto
      ? req.body.cupom_desconto
      : null;

    if (codigoCupom) {
      const cupom = await validarCupomPromocional(
        codigoCupom,
        user.id_sysusers,
        valorTotalVenda
      );

      if (!cupom) throw new Error("Cupom inválido");

      valorTotalVenda = valorTotalVenda - cupom.totalDesconto;
      valorTotalDesconto = valorTotalDesconto + cupom.totalDesconto;
      idCupom = cupom.id_cupom;
    }

    // Buscando Token e Bandeira do cartão do usuário
    const infosCartao = await sequelize.query(
      `
            SELECT 
                CAR.token,
                BAN.descbandeira
            FROM cad_cartoes CAR INNER JOIN cad_bandeiras BAN ON BAN.id_bandeira = CAR.id_bandeira 
            WHERE id_cliente = :id_cliente and id_cartao = :id_cartao
          `,
      {
        replacements: {
          id_cliente: user.id_sysusers,
          id_cartao
        },
        type: sequelize.QueryTypes.SELECT
      }
    );

    if (!infosCartao[0])
      throw new Error("Nenhum cartão encontrado no ID selecionado");

    CreditCard.CardToken = infosCartao[0].token;
    CreditCard.Brand = infosCartao[0].descbandeira;

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
    await capturarVenda(PaymentId);

    // Inserindo informações da transação (fin_transacoes)
    const insertTransacao = await sequelize.query(
      `
      INSERT INTO fin_transacoes (id_agendamentoservico, retornotransacao, dthoraretorno, nsurecibooperadora)
      values(:id_agendamento_servico, :retornotransacao, :dthoraretorno, :PaymentId )
    `,
      {
        replacements: {
          id_agendamento_servico,
          retornotransacao: JSON.stringify(infosTransacao.data),
          dthoraretorno: timestamp,
          PaymentId
        },
        type: sequelize.QueryTypes.INSERT
      }
    );
    if (!insertTransacao[1] == 1)
      throw new Error("Erro ao inserir informações da transação");

    // Realizando update no agendamento para "pagamento realizado"
    const updateAgendamento = await sequelize.query(
      `
        UPDATE age_agendamentos_servicos
          SET id_statusagendamento = :id_statusagendamento
        WHERE 
          id_cliente = :id_cliente   AND
          id_agendamento_servico = :id_agendamento_servico;
    `,
      {
        replacements: {
          id_statusagendamento: 2,
          id_cliente: user.id_sysusers,
          id_agendamento_servico
        },
        type: sequelize.QueryTypes.UPDATE
      }
    );
    if (!updateAgendamento[1] == 1)
      throw new Error("Erro ao atualizar status do agendamento");

    // Gerando número do recibo para inserir a venda
    const responseRecibo = await sequelize.query(
      `
      SELECT CONCAT( TO_CHAR(TIMESTAMP :timestamp,'YYYYMMDDHH24MISS'),
      lpad(CAST( :id_estabelecimento AS VARCHAR),5,'0'), 
      lpad(CAST( :id_cliente AS VARCHAR),8,'0'), 
      lpad(CAST( :id_agendamento_servico AS VARCHAR),10,'0') ) AS numrecibo `,
      {
        replacements: {
          id_estabelecimento: parseInt(agendamento[0].id_estabelecimento),
          id_cliente: parseInt(user.id_sysusers),
          id_agendamento_servico,
          timestamp
        },
        type: sequelize.QueryTypes.SELECT
      }
    );

    const numeroRecibo = responseRecibo[0].numrecibo;

    // Inserindo venda (fin_vendas)
    const responseFinVendas = await sequelize.query(
      `
          INSERT INTO
          public.fin_vendas
          (
                  id_estabelecimento   ,
                  id_agendamentoservico,
                  id_funcionario       ,
                  dthoravenda          ,
                  statusvenda          ,
                  totalvenda           ,
                  numrecibo            ,
                  valor                ,
                  valordesconto        ,
                  id_cliente           ,
                  tipovenda
          ) VALUES 
            (:id_estabelecimento, :id_agendamento_servico, :id_funcionario, :timestamp,
             :status, :valorTotalVenda, :numeroRecibo, :valor, :valorTotalDesconto, :id_cliente,
             :tipo_venda) returning id_venda
    `,
      {
        replacements: {
          id_estabelecimento: parseInt(agendamento[0].id_estabelecimento),
          id_agendamento_servico,
          id_funcionario: parseInt(agendamento[0].id_funcionarioagendamento),
          timestamp,
          status: 1, // 1=pagamento realizado
          valorTotalVenda,
          numeroRecibo,
          valor: agendamento[0].valorservico,
          valorTotalDesconto,
          id_cliente: parseInt(user.id_sysusers),
          tipo_venda: 1 // 1=serviço 2=comanda avulsa
        },
        type: sequelize.QueryTypes.INSERT
      }
    );

    if (!responseFinVendas[1] == 1) throw new Error("Erro ao inserir venda");

    const { id_venda } = responseFinVendas[0][0];

    // Inserindo pagamento
    const responseInsertFinPagamento = await sequelize.query(
      `
          INSERT INTO
          public.fin_vendas_pagamentos
        (
          id_venda,
          formadepagamento,
          numparcelas,
          status,
          dthorapagamento,
          id_funcionario,
          id_cupomdesconto,
          id_cartao
        )
          VALUES
        (
          :id_venda,
          :formadepagamento,
          :Parcelas,
          :status_pagamento,
          :timestamp,
          :id_funcionario,
          :idCupom,
          :id_cartao
      )
    `,
      {
        replacements: {
          id_venda: parseInt(id_venda),
          Parcelas,
          timestamp,
          id_funcionario: parseInt(agendamento[0].id_funcionarioagendamento),
          idCupom,
          status_pagamento: 1, // 1=pagamento realizado
          id_cartao,
          formadepagamento: "CR"
        },
        type: sequelize.QueryTypes.INSERT
      }
    );

    if (!responseInsertFinPagamento[1] == 1)
      throw new Error("Erro ao inserir informações de pagamento da venda");

    res.json({ successMessage: "Agendamento realizado com sucesso" });
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
  check("id_funcionario")
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
      id_funcionario,
      id_horario
    } = req.body;

    // Configuração de dados Fixos
    const id_statusagendamento = 1; // status "cadastrado"
    const id_usuariostatus = 1; // status inicial
    const status_funcionario = 1; // 1=agendado, 0=cancelado, 2=expirado
    const timestamp = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
    const id_cliente = parseInt(user.id_sysusers);
    const id_funcionarioagendamento = id_funcionario;

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

    res.json({
      id_agendamento_servico
    });
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
