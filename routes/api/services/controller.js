/**
 * routes/api/services/controller.js
 *
 * @description: Esse arquivo contém a regra de negócio e lógica (controlador) dos
 * serviços disponibilizados pela API (Ex: envio de SMS)
 *
 */

const moment = require("moment");
const { enviarSms } = require("../../../utilitarios/enviarSms");
const { check, validationResult } = require("express-validator");

// models
const {
  sys_users,
  cad_categorias,
  cad_subcategorias,
  est_estabelecimento_servicos,
  sequelize
} = require("../../../sequelize/models");

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
        uuid_sysusers: req.user.id
      }
    });

    const { numero_telefone } = req.body;

    // Verificando se o usuário já foi verificado
    if (loggedUser.activated === 1) {
      throw new Error(
        "Usuários já verificados não podem gerar novos códigos PIN"
      );
    }

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
        throw new Error(
          "Você deve esperar no mínimo 3 minutos para solicitar um novo PIN"
        );

      // Definindo os novos Valores para update
      data_json.pin_validator.codigo_verificacao = codigoConfirmacao;
      data_json.pin_validator.dt_envio = now;
      data_json.pin_validator.numero_telefone_temp = numero_telefone;

      // Realizando update no banco
      const teste = await sys_users.update(
        { data_json },
        {
          where: {
            uuid_sysusers: req.user.id
          }
        }
      );

      console.log(teste);

      const messageSms =
        "Codigo de verificacao Backbeauty: " + codigoConfirmacao;

      // Enviando SMS
      await enviarSms(numero_telefone, messageSms);

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
          uuid_sysusers: req.user.id
        }
      }
    );

    const messageSms = "Codigo de verificacao Backbeauty: " + codigoConfirmacao;

    // Enviando SMS
    await enviarSms(numero_telefone, messageSms);

    res.json({ successMessage: "PIN gerado com sucesso" });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      errors: [{ msg: "Erro ao gerar novo PIN ", callback: error.message }]
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
      const isExting = await sys_users.findOne({
        where: {
          data_json: {
            telefone: user_telefone
          }
        }
      });
      if (isExting) throw new Error("Telefone já cadastrado");
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

  try {
    // Retornando dados do usuário autenticado
    const loggedUser = await sys_users.findOne({
      where: {
        uuid_sysusers: req.user.id
      }
    });

    const { codigo_para_verificar } = req.body;

    // Verificando se o usuário já foi verificado
    if (loggedUser.activated === 1)
      throw new Error(
        "Usuários já verificados não podem gerar novos códigos PIN"
      );

    // Acessando objeto JSON dentro do usuário logado
    let { data_json } = loggedUser;

    const hasPinValidator = data_json.pin_validator
      ? data_json.pin_validator
      : false;

    if (!hasPinValidator)
      throw new Error(
        "É necessário gerar um código de PIN antes de tentar valida-lo"
      );

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
      throw new Error(
        "Você demorou mais de 30 minutos para validar um PIN, é necessário gerar outro para continuar"
      );
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
        throw new Error(
          "Telefone já cadastrado, gere um novo PIN com um número de telefone válido"
        );

      data_json.telefone = numero_telefone_temp;

      await delete data_json.pin_validator;

      // Ativando conta e alterando data_json (removendo o pin_validator)
      await sys_users.update(
        {
          activated: 1,
          data_json
        },
        { where: { uuid_sysusers: req.user.id } }
      );

      return res.json({ successMessage: "PIN validado com sucesso!" });
    } else {
      throw new Error("Número de PIN incorreto");
    }
  } catch (error) {
    console.log(error);
    res.status(400).json({
      errors: [{ msg: "Erro ao validar PIN ", callback: error.message }]
    });
  }
};

// @route    GET /api/services/categorias
// @desc     Retornar as categorias e os dados depedentes
exports.retornar_categorias = async (req, res) => {
  try {
    // Buscando categorias
    const categorias = await cad_categorias.findAll();

    // Mapeando todas as categorias
    const response = await Promise.all(
      categorias.map(async categoria => {
        // Retornando dados da categoria
        const { id_categoria, desccategoria, nomeicone } = categoria;

        // definindo objeto final
        const objetoFinal = {
          id_categoria,
          nome_categoria: desccategoria,
          icone_categoria: nomeicone,
          subcategorias: null,
          total_locais: 0
        };

        // Buscando subcategorias
        const subcategorias = await cad_subcategorias.findAll({
          limit: 6,
          attributes: ["descsubcategoria"],
          where: {
            id_categoria
          }
        });

        // Definindo subcategorias no objetoFinal
        objetoFinal.subcategorias = await Promise.all(
          subcategorias.map(subcategoria => {
            return subcategoria.descsubcategoria;
          })
        );

        // Retornando total de estabelecimentos naquela categoria
        const query =
          "select SUM(total_por_id) as total_estabelecimentos from (select distinct id_estabelecimento as total_Por_Id from est_estabelecimento_servicos where id_categoria = " +
          id_categoria +
          ") as temporary";
        const countEstabelecimentos = await sequelize.query(query);

        // Definindo total de estabelecimentos no objetoFinal
        objetoFinal.total_locais = parseInt(
          countEstabelecimentos[0][0].total_estabelecimentos
            ? countEstabelecimentos[0][0].total_estabelecimentos
            : 0
        );

        return objetoFinal;
      })
    );

    res.send(response);
  } catch (error) {
    console.log(error);
    res.status(400).json({
      errors: [{ msg: "Erro ao retornar categorias ", callback: error.message }]
    });
  }
};
