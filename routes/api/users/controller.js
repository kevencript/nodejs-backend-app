/**
 * routes/api/users/controller.js
 *
 * @description: Esse arquivo contém a regra de negócio e lógica (controlador) relacionados ao usuário
 *
 */

const jwt = require("jsonwebtoken");
const passwordValidator = require("password-validator");
const passValidate = new passwordValidator();
const moment = require("moment");
const uuidv4 = require("uuid/v4");
const { cpf } = require("cpf-cnpj-validator");
const { check, validationResult } = require("express-validator");
const { jwtSecret, cielo } = require("../../../config/keys");
const { PasswordHash, CRYPT_BLOWFISH } = require("node-phpass");
const Hasher = new PasswordHash(8, true, 7);
const { enviarEmail } = require("../../../utilitarios/enviarEmail");
const axios = require("axios");

// models
const {
  sequelize,
  sys_users,
  cad_interesses,
  cad_interesses_usuarios,
  est_estabelecimentos_favoritos,
  cad_cartoes,
  cad_bandeiras
} = require("../../../sequelize/models");

// Add properties to it
passValidate
  .is()
  .min(8) // Minimum length 8
  .is()
  .max(100) // Maximum length 100
  .has()
  .uppercase() // Must have uppercase letters
  .has()
  .lowercase() // Must have lowercase letters
  .has()
  .digits() // Must have digits
  .has()
  .not()
  .spaces(); // Should not have spaces

// @route    POST /api/users/create
// @desc     Registrar usuário e obter token
exports.registrar_usuario = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  const {
    nome,
    email,
    password,
    user_cpf,
    data_nascimento,
    chave_seguranca
  } = req.body;

  let userObject = {
    username: user_cpf,
    nome,
    password,
    email,
    activated: 0,
    created: Date.now(),
    data_json: {
      funcionario: 0,
      termo_uso: 1,
      data_nascimento
    }
  };

  try {
    // Gerando hash
    userObject.password = await Hasher.HashPassword(password, CRYPT_BLOWFISH);
    userObject.security_key = await Hasher.HashPassword(
      chave_seguranca,
      CRYPT_BLOWFISH
    );
    let userCreated = await sys_users.create(userObject);

    const payload = {
      user: {
        id: userCreated.uuid_sysusers,
        activated: userCreated.activated
      }
    };

    jwt.sign(payload, jwtSecret, { expiresIn: 36000 }, (err, token) => {
      if (err) throw err;
      res.json({ token });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      errors: [{ msg: "Erro de servidor", callback: err.message }]
    });
  }
};

// @type     Middleware de validação dos campos
// @route    POST /api/users
exports.validator_registrar = [
  // Chave de Segurança
  check("chave_seguranca")
    .not()
    .isEmpty()
    .withMessage("Por favor, preencher o campo Chave de Segurança")
    .not()
    .isString()
    .withMessage("A chave de segurança só pode conter valores inteiros")
    .isLength({ min: 4, max: 4 })
    .withMessage("A chave de segurança deve conter especificamente 4 dígitos"),

  // E-mail do usuário
  check("email")
    .not()
    .isEmpty()
    .withMessage("Por favor, preencher o campo E-mail")
    .isEmail()
    .withMessage("E-mail inválido")
    .custom(email => {
      return sys_users.findOne({ where: { email: email } }).then(email => {
        if (email) return Promise.reject("E-mail já cadastrado");
      });
    }),

  // Nome do usuário
  check("nome")
    .not()
    .isEmpty()
    .withMessage("Por favor, preencher o campo Nome"),

  // CPF do usuário
  check("user_cpf")
    .not()
    .isEmpty()
    .withMessage("Por favor, preencher o campo CPF")
    // Validador de veracidade do CPF
    .custom(user_cpf => {
      const isValid = cpf.isValid(user_cpf);
      if (!isValid) throw new Error("CPF inválido");
      return true;
    })
    // Validador de existência no banco com o mesmo CPF
    .custom(user_cpf => {
      return sys_users.findOne({ where: { username: user_cpf } }).then(user => {
        if (user) return Promise.reject("CPF já cadastrado");
      });
    }),

  // Senha do usuário
  check("password")
    .not()
    .isEmpty()
    .withMessage("Por favor, preencher o campo Senha")
    // Validador do padrão de senha
    .custom(password => {
      const isValid = passValidate.validate(password);
      if (!isValid)
        throw new Error(
          "A senha deve conter pelo menos 8 caracteres, uma letra minúscula, uma maiúscula e um número"
        );
      return true;
    }),
  // Gênero do usuário
  check("genero")
    .not()
    .isEmpty()
    .withMessage("Por favor, preencher o campo Gênero")
    .isLength({ min: 1, max: 1 })
    .withMessage("O campo Gênero só pode conter um caractere"),
  // Data de aniversário do usuário
  check("data_nascimento")
    .not()
    .isEmpty()
    .withMessage("Por favor, preencher o campo Data de Aniversário")
    .isLength({ min: 10, max: 10 })
];

// @route    GET /api/users/all
// @desc     Retornar todos os usuários do banco
exports.retornar_todos_usuarios = async (req, res) => {
  try {
    const response = await sys_users.findAll();

    if (!response) res.send("Nenhum registro encontrado");

    res.send(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      errors: [{ msg: "Erro de servidor", callback: err.message }]
    });
  }
};

// @route    POST /api/users/interesses
// @desc     Adicionar novos interesses para o usuário
exports.adicionar_interesses = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  try {
    const loggedUser = await sys_users.findOne({
      where: {
        uuid_sysusers: req.user.id
      }
    });

    //
    const { id_sysusers } = loggedUser;
    const { list_ids } = req.body;

    // Percorrendo ID`s e montando um objeto para ser inserido

    await list_ids.map(async id_interesse => {
      try {
        const acctuallyExists = await cad_interesses_usuarios.findOne({
          where: {
            id_sysusers,
            id_interesse
          }
        });

        // Caso já tenha vinculado esse interesse a algum usuário
        if (acctuallyExists) return;

        // Preparando objeto que será inserido
        const insertObject = {
          id_interesse,
          id_sysusers
        };

        await cad_interesses_usuarios.create(insertObject);
      } catch (err) {
        console.log(err);
        return res.status(400).json({
          errors: [
            {
              msg: "Erro ao vincular interesse ao usuário",
              callback: err.message
            }
          ]
        });
      }
    });

    res.send({
      successMessage: "Interesses inseridos com sucesso!"
    });
  } catch (err) {
    console.log(err);
    res.status(400).json({
      errors: [
        { msg: "Erro ao vincular interesse ao usuário", callback: err.message }
      ]
    });
  }
};

// @type     Middleware de validação dos campos
// @route    POST /api/users
exports.validatorAdicionarInteresses = [
  check("list_ids")
    .not()
    .isEmpty()
    .withMessage("Por favor, preencher o campo Lista de ID's")
];

// @route    POST /api/users/imagem-perfil
// @desc     Editar/definir foto de perfil do usuário
exports.imagem_perfil = async (req, res) => {
  // Retornando URL
  const { imageUrl } = req;

  try {
    // Alterando imagem no perfil do usuário
    await sys_users.update(
      { foto: imageUrl },
      {
        where: {
          uuid_sysusers: req.user.id
        }
      }
    );

    res.json({
      successMessage: "Imagem do perfil definida com sucesso"
    });
  } catch (err) {
    console.log(err);
    res.status(400).json({
      errors: [{ msg: "Erro ao alterar dado no banco", callback: err.message }]
    });
  }
};

// @route    GET /api/users/interesses
// @desc     Retornar todos os interesses
exports.retornar_interesses = async (req, res) => {
  try {
    const interesses = await cad_interesses.findAll();

    res.send(interesses);
  } catch (err) {
    console.log(err);
    res.status(400).json({
      errors: [{ msg: "Erro ao retornar interesses", callback: err.message }]
    });
  }
};

// @type     Middleware de validação dos campos
// @route    POST /api/users/esqueceu-senha
exports.validatorEsqueceuSenha = [
  check("email")
    .not()
    .isEmpty()
    .withMessage("Por favor, preencher o campo E-mail")
    .isEmail()
    .withMessage("E-mail inválido")
];

// @route    POST /api/users/esqueceu-senha
// @desc     Realizar procedimento caso o usuário equeça a senha
exports.esqueceu_senha = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  const { email } = req.body;

  try {
    // Buscando usuário pelo email
    const user = await sys_users.findOne({
      where: {
        email
      }
    });

    // Verificando existencia de usuário
    if (!user) {
      res.status(400).json({
        errors: [{ msg: "Não encontramos nenhum usuário com esse e-mail" }]
      });
    }

    // Verificando se o usuário solicitou a recuperação senha a menos de 5 minutos
    if (user.new_password_requested) {
      const now = moment(new Date());
      const past = moment(user.new_password_requested);
      const duration = moment.duration(now.diff(past));

      // Verificando se o PIN está expirado
      const minutosDeDiferença = duration.asMinutes();

      if (minutosDeDiferença < 5) {
        return res.status(400).json({
          errors: [
            {
              msg:
                "Você deve esperar no mínimo 5 minutos para solicitar uma nova recuperação de senha"
            }
          ]
        });
      }
    }

    const uuidSolicitacao = await uuidv4();
    const uuidUsuario = user.uuid_sysusers;

    await enviarEmail(
      "kevencript@gmail.com",
      "<h1> Olá! Estamos testando. </h1>",
      "Olá, Estamos testando.",
      "Produtos Backbeauty"
    );

    // Realizando update no banco com a Key para trocar de senha e atualizando a data de envio
    await sys_users.update(
      {
        new_password_key: uuidSolicitacao,
        new_password_requested: moment(new Date())
      },
      {
        where: {
          uuid_sysusers: uuidUsuario
        }
      }
    );

    res.send({
      successMessage:
        "Solicitação de recuperação de senha realizada com sucesso"
    });
  } catch (err) {
    console.log(err);
    res.status(400).json({
      errors: [{ msg: "Erro no sistema", callback: err.message }]
    });
  }
};

// @type     Middleware de validação dos campos
// @route    POST /api/users/esqueceu-senha
exports.validatorFavEstabelecimento = [
  check("id_estabelecimento")
    .not()
    .isEmpty()
    .withMessage(
      "Por favor, preencher o campo identificador do estebelecimento"
    )
    .not()
    .isString()
    .withMessage("Identificador inválido")
];

// @route    POST /api/users/favoritar-estabelecimento
// @desc     Rota utilizada para favoritar/desfavoritar um estabelecimento
exports.favoritar_estabelecimento = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  const { id_estabelecimento } = req.body;

  try {
    // Retornando usuário por meio do UUID
    const user = await sys_users.findOne({
      where: {
        uuid_sysusers: req.user.id
      }
    });

    // Retornando ID do usuário
    const { id_sysusers } = user;

    // Verificando se o estabelecimento já foi favoritado por esse usuário
    const isFavoritado = await est_estabelecimentos_favoritos.findOne({
      where: {
        id_sysusers,
        id_estabelecimento
      }
    });

    // Caso seja, realizamos o procedimento de "desfavoritar"
    if (isFavoritado) {
      await est_estabelecimentos_favoritos.destroy({
        where: {
          id_sysusers,
          id_estabelecimento
        }
      });

      return res.send({
        successMessage: "Estabelecimento desmarcado como favorito com sucesso"
      });
    }

    // Caso ainda não tenha sido marcado, então "favoritamos"
    const objectToInsert = {
      id_sysusers,
      id_estabelecimento,
      dthoraregistro: moment(new Date())
    };

    await est_estabelecimentos_favoritos.create(objectToInsert);

    res.send({
      successMessage: "Estabelecimento marcado como favorito com sucesso"
    });
  } catch (err) {
    console.log(err);
    res.status(400).json({
      errors: [
        {
          msg: "Erro ao marar/desmarcar estabelecimento como favorito",
          callback: err.message
        }
      ]
    });
  }
};

// @type     Middleware de validação dos campos
// @route    POST /api/users/alterar-senha
exports.validatorAlterarSenha = [
  // Senha do usuário
  check("senha_atual")
    .not()
    .isEmpty()
    .withMessage("Por favor, preencher o campo da senha atual"),
  check("nova_senha")
    .not()
    .isEmpty()
    .withMessage("Por favor, preencher os campos referentes à nova senha")
    // Validador do padrão de senha
    .custom(password => {
      const isValid = passValidate.validate(password);
      if (!isValid)
        throw new Error(
          "A senha deve conter pelo menos 8 caracteres, uma letra minúscula, uma maiúscula e um número"
        );
      return true;
    }),
  check("confirmacao_senha")
    .not()
    .isEmpty()
    .withMessage("Por favor, preencher os campos referentes à nova senha")
    // Validador do padrão de senha
    .custom(password => {
      const isValid = passValidate.validate(password);
      if (!isValid)
        throw new Error(
          "A senha deve conter pelo menos 8 caracteres, uma letra minúscula, uma maiúscula e um número"
        );
      return true;
    })
];

// @route    POST /api/users/alterar-senha
// @desc     Realizar procedimento para trocar senha
exports.alterar_senha = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  // Extraindo informações da requisição
  const { senha_atual, nova_senha, confirmacao_senha } = req.body;

  try {
    // Retornando dados do user logado
    const user = await sys_users.findOne({
      where: {
        uuid_sysusers: req.user.id
      }
    });

    // Verificando se a senha atual do usuário está correta
    const storedHash = user.password;
    const isMatch = await Hasher.CheckPassword(senha_atual, storedHash);
    if (!isMatch) throw new Error("A senha atual não está correta");

    // Verificando se os dois campos (nova senha e confirmação) são idênticos
    if (!(nova_senha === confirmacao_senha))
      throw new Error("O campo de confirmação deve ser idêntico ao da senha");

    // Verificando se a nova senha é igual a senha atual (deve ser uma nova senha)
    const isSenhaRepetida = await Hasher.CheckPassword(nova_senha, storedHash);
    if (isSenhaRepetida)
      throw new Error("Por favor, insira uma nova senha diferente da atual");

    // Criptografando e inserindo nova senha no banco
    const senha_criptografada = await Hasher.HashPassword(
      nova_senha,
      CRYPT_BLOWFISH
    );
    await sys_users.update(
      { password: senha_criptografada },
      { where: { uuid_sysusers: req.user.id } }
    );

    return res.json({ successMessage: "Senha alterada com sucesso!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      errors: [{ msg: "Erro ao trocar senha", callback: err.message }]
    });
  }
};

// @type     Middleware de validação dos campos
// @route    POST /api/users/adicionar-cartao
exports.validatorAdicionarCartao = [
  check("nome_titular")
    .not()
    .isEmpty()
    .withMessage("Por favor, preencher o nome do titular do cartão")
    .isString()
    .withMessage("O nome do titular não deve conter números")
    .isLength({ min: 3, max: 255 })
    .withMessage("O nome deve conter entre 3 e 150 caracteres"),
  check("numero_cartao")
    .not()
    .isEmpty()
    .withMessage("Por favor, preencher o número do cartão")
    .isLength({ min: 16, max: 16 })
    .withMessage("O número do cartão deve conter ao menos 16 caracteres"),
  check("nome_impresso_cartao")
    .not()
    .isEmpty()
    .withMessage("Por favor, preencher o nome do titular do cartão")
    .isString()
    .withMessage("O nome do titular não deve conter números")
    .isLength({ min: 3, max: 25 })
    .withMessage(
      "O nome impresso no cartão deve conter entre 3 e 25 caracteres"
    ),
  check("data_expiracao")
    .not()
    .isEmpty()
    .withMessage("Por favor, preencher a data de expiração do cartão")
    .isString()
    .withMessage("A data de expiração deve conter somente o mês e o ano")
    .isLength({ min: 7, max: 7 })
    .withMessage(
      "A data expiração deve ter no máximo 7 caracteres contendo mês/ano"
    ),
  check("id_bandeira")
    .not()
    .isEmpty()
    .withMessage("Por favor, selecionar a bandeira do cartão")
    .not()
    .isString()
    .withMessage("A bandeira do cartão deve ser um número inteiro")
];

// @route    POST /api/users/adicionar-cartao
// @desc     Vincular um cartão de crédito ao usuário
exports.adicionar_cartao = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  try {
    const {
      nome_titular,
      numero_cartao,
      nome_impresso_cartao,
      data_expiracao,
      id_bandeira
    } = req.body;

    // Retornando bandeira por meio do ID
    const bandeira = await cad_bandeiras.findOne({
      where: {
        id_bandeira: id_bandeira
      }
    });

    if (!bandeira)
      throw new Error("Não existe nenhuma bandeira com o ID informado");

    // Retornando dados do user logado
    const user = await sys_users.findOne({
      where: {
        uuid_sysusers: req.user.id
      }
    });

    // Realizando requisição na API da Cielo para Tokenizar o cartão
    const dataCartao = await axios.post(
      "https://apisandbox.cieloecommerce.cielo.com.br/1/card",
      {
        CustomerName: nome_titular,
        CardNumber: numero_cartao,
        Holder: nome_impresso_cartao,
        ExpirationDate: data_expiracao,
        Brand: bandeira
      },
      {
        headers: {
          MerchantId: cielo.MerchantId,
          MerchantKey: cielo.MerchantKey
        }
      }
    );

    // Retornando variáveis da query
    const tokenCartao = dataCartao.data.CardToken;
    const urlGetCardNumber = dataCartao.data.Links.Href;

    // Essa requisição confirma que o cartão foi Tokenizado e retorna o numero do cartão com asteríscos
    const confirmacaoTokenizacao = await axios.get(urlGetCardNumber, {
      headers: {
        MerchantId: cielo.MerchantId,
        MerchantKey: cielo.MerchantKey
      }
    });

    const numero_cartao_seguro = confirmacaoTokenizacao.data.CardNumber;

    // Verificando se o cartão do usuário já existe no banco
    const isCartaoExistente = await cad_cartoes.findOne({
      where: {
        numerocartao: numero_cartao_seguro,
        id_bandeira,
        id_cliente: user.id_sysusers
      }
    });

    if (isCartaoExistente)
      throw new Error("Você não pode adicionar dois cartões idênticos");

    // Inserindo cartão e vinculando o usuário
    await cad_cartoes.create({
      id_cliente: user.id_sysusers,
      token: tokenCartao,
      id_bandeira,
      numerocartao: numero_cartao_seguro
    });

    res.send({ successMessage: "Cartão adicionado com sucesso!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      errors: [
        {
          msg:
            "Erro ao adicionar cartão, verifique os campos e tente novamente",
          callback: err.message
        }
      ]
    });
  }
};

// @route    DELETE /api/users/cartao?id_cartao=X
// @desc     Deletar um cartão de crédito do usuário
exports.excluir_cartao = async (req, res) => {
  try {
    const { id_cartao } = req.query;

    if (!id_cartao)
      throw new Error("Por favor, preencher o ID do cartão a ser exlcuído");

    // Retornando dados do user logado
    const user = await sys_users.findOne({
      where: {
        uuid_sysusers: req.user.id
      }
    });

    const wasDeleted = await cad_cartoes.destroy({
      where: {
        id_cartao,
        id_cliente: user.id_sysusers
      }
    });

    if (wasDeleted === 0)
      throw new Error("Nenhum cartão encontrado com o ID identificado");

    res.json({ successMessage: "Cartão excluído com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      errors: [
        {
          msg: "Erro ao excluir cartão",
          callback: err.message
        }
      ]
    });
  }
};

// @route    GET /api/users/cartoes
// @desc     Retornar uma lista com os cartões do usuário
exports.retornar_cartoes = async (req, res) => {
  try {
    // Retornando dados do user logado
    const user = await sys_users.findOne({
      where: {
        uuid_sysusers: req.user.id
      }
    });

    const cardList = await sequelize.query(`
      SELECT CAR.id_cartao, 
             CAR.numerocartao, 
             BAN.descbandeira FROM 
             public.cad_cartoes CAR
             inner join public.cad_bandeiras BAN on (BAN.id_bandeira = CAR.id_bandeira)
        where id_cliente = ${user.id_sysusers}`);

    res.json(cardList[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      errors: [
        {
          msg: "Erro ao retornar cartões do usuário",
          callback: err.message
        }
      ]
    });
  }
};
