/**
 * routes/api/services/controller.js
 *
 * @description: Esse arquivo contém a regra de negócio e lógica (controlador) dos
 * serviços disponibilizados pela API (Ex: envio de SMS)
 *
 */

const { check, validationResult } = require("express-validator");
const moment = require("moment");
const { sys_users } = require("../../../sequelize/models");

// @route    POST /api/services/gerar-pin
// @desc     Gerar um novo PIN, atribuir ao perfil do usuário logado e enviar o código de confirmação via SMS
exports.gerar_pin = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  try {
    // Retornando dados do usuário autenticado
    const loggedUser = await sys_users.findOne({
      where: {
        id_sysusers: req.user.id
      }
    });

    const { numero_telefone } = req.body;

    // Verificando se o usuário já foi verificado
    if (loggedUser.activated === 1)
      return res.status(400).json({
        errorMessage:
          "Usuários já verificados não podem gerar novos códigos PIN"
      });

    // Acessando objeto JSON dentro do usuário logado
    let { data_json } = loggedUser;
    const hasPinValidator = data_json.pin_validator
      ? data_json.pin_validator
      : false;

    const codigoConfirmacao = Math.floor(1000 + Math.random() * 9000);

    // Verificando se o usuário já tem o campo "pin_validator" atribuído ao perfil
    if (hasPinValidator) {
      const { dt_envio } = data_json.pin_validator;

      // Doc: https://metring.com.br/diferenca-entre-datas-em-javascript
      const now = moment(new Date());
      const past = moment(dt_envio);
      const duration = moment.duration(now.diff(past));

      // Verificando se o PIN está expirado
      const minutosDeDiferença = duration.asMinutes();
      if (minutosDeDiferença < 3)
        return res.status(400).json({
          errorMessage:
            "Você deve esperar no mínimo 3 minutos para solicitar um novo PIN"
        });

      // Definindo os novos Valores para update
      data_json.pin_validator.codigo_verificacao = codigoConfirmacao;
      data_json.pin_validator.dt_envio = now;
      data_json.pin_validator.numero_telefone_temp = numero_telefone;

      // Realizando update no banco
      await sys_users.update(
        { data_json },
        {
          where: {
            id_sysusers: req.user.id
          }
        }
      );

      return res.json({ successMessage: "PIN gerado com sucesso" });
    }

    // Caso seja a primeira vez emitindo PIN
    const now = moment(new Date());

    const pin_validator = {
      codigo_verificacao: codigoConfirmacao,
      dt_envio: now,
      numero_telefone_temp: numero_telefone
    };

    data_json = { ...data_json, pin_validator };

    // Realizando update no banco
    await sys_users.update(
      { data_json },
      {
        where: {
          id_sysusers: req.user.id
        }
      }
    );

    res.json({ successMessage: "PIN gerado com sucesso" });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      errorMessage: "Erro ao gerar novo PIN ",
      callback: error.message
    });
  }
};

// MIDDLEWARE
// @route   /api/services/gerar-pin
exports.validatorGerarPin = [
  // Telefone
  check("numero_telefone")
    .not()
    .isEmpty()
    .withMessage("Por favor, preencher o campo Telefone")
    // .not()
    // .isString()
    // .withMessage("Você deve digitar somente números inteiro")
    .isLength({ min: 11, max: 11 })
    .withMessage(
      "Você deve digitar um valor com no máximo 11 digitos (DDD+Telefone)"
    )
    .custom(async user_telefone => {
      const isValid = await sys_users.findOne({
        where: {
          data_json: {
            telefone: user_telefone
          }
        }
      });
      if (isValid) throw new Error("Telefone já cadastrado");
      return true;
    })
];

// MIDDLEWARE
// @route   /api/services/validar-pin
exports.validatorValidarPin = [
  // Telefone
  check("codigo_para_verificar")
    .not()
    .isEmpty()
    .withMessage("Por favor, preencher o campo Codigo para Verificar")
    .not()
    .isString()
    .withMessage("Você deve digitar somente números inteiro")
    .isLength({ min: 4, max: 4 })
    .withMessage("Você deve digitar um valor com no máximo 4 digitos")
];

// @route    POST /api/services/validar-pin
// @desc     Validar um PIN e alterar o tipo de conta para "activated:1"
exports.validar_pin = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  // Retornando dados do usuário autenticado
  const loggedUser = await sys_users.findOne({
    where: {
      id_sysusers: req.user.id
    }
  });

  const { codigo_para_verificar } = req.body;

  // Verificando se o usuário já foi verificado
  if (loggedUser.activated === 1)
    return res.status(400).json({
      errorMessage: "Usuários já verificados não podem gerar novos códigos PIN"
    });

  // Acessando objeto JSON dentro do usuário logado
  let { data_json } = loggedUser;
  const hasPinValidator = data_json.pin_validator
    ? data_json.pin_validator
    : false;

  if (!hasPinValidator)
    return res.status(400).json({
      errorMessage:
        "É necessário gerar um código de PIN antes de tentar valida-lo"
    });

  const {
    dt_envio,
    codigo_verificacao,
    numero_telefone_temp
  } = data_json.pin_validator;

  const now = moment(new Date());
  const past = moment(dt_envio);
  const duration = moment.duration(now.diff(past));

  // Verificando se o PIN está expirado
  const isExpirado = duration.asMinutes();

  if (isExpirado >= 30) {
    return res.status(400).json({
      errorMessage:
        "Você demorou mais de 30 minutos para validar um PIN, é necessário gerar outro para continuar"
    });
  }

  // Verificando se o código está correto
  if (codigo_verificacao === codigo_para_verificar) {
    const isValid = await sys_users.findOne({
      where: {
        data_json: {
          telefone: numero_telefone_temp
        }
      }
    });

    if (isValid)
      return res.status(400).json({
        errorMessage:
          "Telefone já cadastrado, gere um novo PIN com um número de telefone válido"
      });

    data_json.telefone = numero_telefone_temp;

    await delete data_json.pin_validator;

    // Ativando conta e alterando data_json (removendo o pin_validator)
    await sys_users.update(
      {
        activated: 1,
        data_json
      },
      { where: { id_sysusers: req.user.id } }
    );

    return res.json({ successMessage: "PIN validado com sucesso!" });
  } else {
    return res.status(400).json({ errorMessage: "Número de PIN incorreto" });
  }
};
