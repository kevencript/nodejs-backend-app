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

// @route    GET /api/services/gerar-pin
// @desc     Gerar um novo PIN, atribuir ao perfil do usuário logado e enviar o código de confirmação via SMS
exports.gerar_pin = async (req, res) => {
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

  // Acessando objeto JSON dentro do usuário logado
  let { data_json } = loggedUser;
  const hasPinValidator = data_json.pin_validator
    ? data_json.pin_validator
    : false;

  const codigoConfirmacao = parseInt(Math.random() * 10000);

  // Verificando se o usuário já tem o campo "pin_validator" atribuído ao perfil
  if (hasPinValidator) {
    try {
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

      // Realizando update no banco
      await sys_users.update(
        { data_json },
        {
          where: {
            id_sysusers: req.user.id
          }
        }
      );

      return res.send({ successMessage: "PIN gerado com sucesso" });
    } catch (error) {
      console.log(error);
      res.status(400).json({
        errorMessage: "Erro ao gerar novo PIN ",
        callback: error.message
      });
    }
  }

  // Caso seja a primeira vez emitindo PIN
  const now = moment(new Date());

  const pin_validator = {
    codigo_verificacao: codigoConfirmacao,
    dt_envio: now
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

  res.json({ successMessage: "PIN gerado com sucesso!" });
};
