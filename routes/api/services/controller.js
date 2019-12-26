/**
 * routes/api/services/controller.js
 *
 * @description: Esse arquivo contém a regra de negócio e lógica (controlador) dos
 * serviços disponibilizados pela API (Ex: envio de SMS)
 *
 */

const { check, validationResult } = require("express-validator");

// @route    POST /api/services/sms-emitter
// @desc     Realizar o envio de SMS
exports.sms_emitter = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  // Gerando código de confirmação
  const codigoConfirmacao = parseInt(Math.random() * 10000);

  // Extraindo dados da enviados na requisição
  const { telefone } = req.body;
};

// MIDDLEWARE
// @route    POST /api/services/sms-emitter
// @desc     Realizar o envio de SMS
exports.validator_sms_emitter = [
  check("telefone")
    .not()
    .isEmpty()
    .withMessage("Por favor, preencher o campo Celular do Usuário")
    .not()
    .isString()
    .withMessage("O celular do usuário só pode conter valores inteiros")
    .isLength({ min: 11, max: 11 })
    .withMessage(
      "O celular do usuário deve conter exatamente 11 dígitos (DDD+NUMERO)"
    )
];
