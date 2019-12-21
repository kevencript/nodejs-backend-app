/**
 * routes/api/services/controller.js
 *
 * @description: Esse arquivo contém a regra de negócio e lógica (controlador) dos
 * serviços disponibilizados pela API (Ex: envio de SMS)
 *
 */

const config = require("config");
const TextMessageService = require("comtele-sdk").TextMessageService;
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
  const { celularUsuario } = req.body;

  // Configurações do SMS
  const sender = "Youbemore";
  const conteudoDaMensagem =
    "Olá! Seu código de verificação na Youbemore: " + codigoConfirmacao + ".";
  const apiKey = config.get("comteleApiKey");

  // Enviando mensagem e lidando com o callback
  var textMessageService = new TextMessageService(apiKey);
  textMessageService.send(
    sender,
    conteudoDaMensagem,
    [celularUsuario],
    data => {
      if (data.Success === false) {
        res.status(400).json({ errorMessage: data.Message });
      } else {
        res.json({ successMessage: data.Message, codigoConfirmacao });
      }
    }
  );
};

// MIDDLEWARE
// @route    POST /api/services/sms-emitter
// @desc     Realizar o envio de SMS
exports.validator_sms_emitter = [
  //   check("codigoConfirmacao")
  //     .not()
  //     .isEmpty()
  //     .withMessage("Por favor, preencher o campo Codigo de Confirmação")
  //     .not()
  //     .isString()
  //     .withMessage("O código de conformação só pode conter valores inteiros")
  //     .isLength({ min: 4, max: 4 })
  //     .withMessage(
  //       "O código de conformação  deve conter especificamente 4 dígitos"
  //     ),
  check("celularUsuario")
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
