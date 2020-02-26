/**
 * routes/api/estabelecimentos/controller.js
 *
 * @description: Esse arquivo contém a regra de negócio e lógica (controlador) dos
 * estabelecimentos
 *
 */

const moment = require("moment-timezone");
const { check, validationResult } = require("express-validator");

// models
const {
  est_estabelecimento_servicos,
  est_estabelecimentos,
  est_estabelecimentos_favoritos,
  est_estabelecimento_enderecos,
  cad_timezones,
  sys_users,
  sequelize
} = require("../../../sequelize/models");

const { Op } = require("sequelize");

// @route    GET /api/estabelecimentos/categoria
// @desc     Retornar listagem de estabelecimentos nos quais atendem determinada categoria
exports.estabelecimentos_por_categoria = async (req, res) => {
  try {
    // Retornando informações do usuário logado
    const user = await sys_users.findOne({
      where: {
        uuid_sysusers: req.user.id
      }
    });

    // Retornando informações da URL
    let {
      page_size,
      page,
      id_categoria,
      filtro_estabelecimento,
      filtro_endereco
    } = req.query;

    // Configurações dos filtros de pesquisa
    const config_filtro_endereco = filtro_endereco
      ? "%" + filtro_endereco + "%"
      : "%%";
    const config_filtro_est = filtro_estabelecimento
      ? "%" + filtro_estabelecimento + "%"
      : "%%";

    // Configurações da query/paginação e aplicação de filtros
    const paginationConfig = {
      attributes: ["id_estabelecimento_servico"],
      where: {
        id_categoria
      },
      include: [
        {
          model: est_estabelecimentos,
          attributes: ["id_estabelecimento", "descestabelecimento"],
          where: {
            descestabelecimento: { [Op.like]: config_filtro_est }
          },
          include: [
            {
              model: est_estabelecimento_enderecos,
              where: {
                bairro: { [Op.like]: config_filtro_endereco }
              },
              attributes: ["cidade", "bairro"]
            },
            {
              model: cad_timezones,
              attributes: ["desctimezone"]
            }
          ]
        }
      ],
      page, // Padrão = 1
      paginate: page_size, // Padrão = 25
      order: ["id_estabelecimento_servico"]
    };

    // Buscando estabelecimentos (paginados)
    const estabelecimentos = await est_estabelecimento_servicos.paginate(
      paginationConfig
    );

    // Percorrendo estabelecimentos e refinando dados
    const objetoFinal = await Promise.all(
      estabelecimentos.docs.map(async estabelecimento => {
        // Definindo estrutura do objeto
        let objetoParaMontar = {
          id_estabelecimento: null,
          nome_estabelecimento: null,
          endereco_estabelecimento: null,
          favoritado: false,
          horario_funcionamento: null,
          aberto: false,
          total_servicos: 0,
          nota_estabelecimento: 0
        };

        // Desconstruindo informações e configurando TimeZone
        const { est_estabelecimentos } = estabelecimento;

        const descestabelecimento = est_estabelecimentos[0]
          ? est_estabelecimentos[0].descestabelecimento
          : null;

        const est_estabelecimento_enderecos = est_estabelecimentos[0]
          ? est_estabelecimentos[0].est_estabelecimento_enderecos
          : null;

        const id_estabelecimento = est_estabelecimentos[0]
          ? est_estabelecimentos[0].id_estabelecimento
          : null;

        const cad_timezones = est_estabelecimentos[0]
          ? est_estabelecimentos[0].cad_timezones
          : null;

        const time_zone = cad_timezones ? cad_timezones[0].desctimezone : null; // cada estebelcimento tem sem próprio timezone
        const timestampAtual = await moment.tz(new Date(), time_zone);

        // Horario atual aplicando TimeZone
        const horarioAtual =
          timestampAtual.hours() + ":" + timestampAtual.minutes();

        // Dia da Semana atual aplicando TimeZone
        const diaDaSemanaAtual =
          (await moment.tz(new Date(), time_zone).day()) + 1;

        // Retornando se o estabelecimento está favorito
        const isFavoritado = await est_estabelecimentos_favoritos.findOne({
          where: {
            id_sysusers: user.id_sysusers,
            id_estabelecimento
          }
        });

        // Retornando quantos serviços o estabelcimento presta
        const total_servicos = await sequelize.query(
          `select count(id_estabelecimento) as conta from est_estabelecimento_servicos where id_estabelecimento = ${id_estabelecimento}`
        );

        // Retornando nota do estabelecimento
        const nota = await sequelize.query(
          "SELECT AVG(valornota) FROM est_estabelecimentos_avaliacoes where id_estabelecimento=" +
          id_estabelecimento
        );

        // Retornando Horario funcionamento e se está aberto
        const infoFuncionamentoEst = await sequelize.query(
          `SELECT id_jornada_estabelecimento, id_estabelecimento, diasemana, horainicio, horafim,` +
          `ativa, CURRENT_DATE, CASE WHEN   '${horarioAtual}' BETWEEN ` +
          `horainicio AND horafim THEN true ELSE false  END AS aberto ` +
          `FROM est_estabelevimentos_jornadas EJ WHERE EJ.id_estabelecimento= ${id_estabelecimento} ` +
          `AND EJ.diasemana IN (${diaDaSemanaAtual})`
        );

        // Montando nota do estabelecimento
        const nota_estabelecimento = parseInt(nota[0][0].avg * 100) / 100;

        // Montando horário de funcionamento
        const horarioInicioParaMudar = infoFuncionamentoEst[0][0]
          ? infoFuncionamentoEst[0][0].horainicio.split(":")
          : null;
        const horarioFimParaMudar = infoFuncionamentoEst[0][0]
          ? infoFuncionamentoEst[0][0].horafim.split(":")
          : null;
        const horario_inicio = horarioInicioParaMudar
          ? horarioInicioParaMudar[0] + ":" + horarioInicioParaMudar[1]
          : null;

        const horario_fim = horarioFimParaMudar
          ? horarioFimParaMudar[0] + ":" + horarioFimParaMudar[1]
          : null;

        const horario_funcionamento = horario_inicio + " às " + horario_fim;

        // Montando endereço
        const endereco_estabelecimento = est_estabelecimento_enderecos
          ? est_estabelecimento_enderecos[0].cidade +
          " - " +
          est_estabelecimento_enderecos[0].bairro
          : null;

        // Montando se os estabelecimento está aberto
        const isAberto = infoFuncionamentoEst[0][0]
          ? infoFuncionamentoEst[0][0].aberto
          : null;

        // Definindo valores no objeto
        objetoParaMontar.id_estabelecimento = parseInt(id_estabelecimento);
        objetoParaMontar.nome_estabelecimento = descestabelecimento;
        objetoParaMontar.endereco_estabelecimento = endereco_estabelecimento;
        objetoParaMontar.favoritado = isFavoritado ? true : false;
        objetoParaMontar.total_servicos = parseInt(total_servicos[0][0].conta);
        objetoParaMontar.aberto = isAberto;
        objetoParaMontar.horario_funcionamento = horario_funcionamento;
        objetoParaMontar.nota_estabelecimento = parseFloat(
          nota_estabelecimento.toFixed(1)
        );

        return objetoParaMontar;
      })
    );

    res.json({
      docs: [...objetoFinal],
      page: parseInt(page),
      page_size: parseInt(page_size),
      total: estabelecimentos.total
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      errors: [
        {
          msg: "Erro ao retornar estabelecimentos por categoria",
          callback: error.message
        }
      ]
    });
  }
};

// @route    GET /api/estabelecimentos/servicos?id_estabelecimento=X
// @desc     Retornar as Categorias, Subcategorias até serviços de um estabelecimento
exports.servicos_estabelecimento = async (req, res) => {
  try {
    const id_estabelecimento = req.query ? req.query.id_estabelecimento : null;

    // Verificando ID do estabelecimento
    if (!id_estabelecimento) throw new Error("ID do estabelecimento inválido");

    // Retornando lista de categorias relacionadas ao estabelecimento
    const categoriasParaIterar = await sequelize.query(`
        SELECT
        distinct ESE.id_categoria, CAD.desccategoria
          FROM
            public.est_estabelecimento_servicos ESE
            INNER JOIN public.cad_categorias CAD ON (CAD.id_categoria = ESE.id_categoria)
          WHERE ESE.id_estabelecimento=${id_estabelecimento}`);

    const objetoFinal = []; // Conterá os objetos prontos para serem retornados via HTTP

    // Iterando as categorias e expandindo as subcategorias
    for (categoria of categoriasParaIterar[0]) {
      const { id_categoria, desccategoria } = categoria;

      // Retornando lista com as subcategorias distintas para serem expandidas futuramente
      const subcategoriasDistintas = await sequelize.query(`SELECT
            distinct
              SUB.id_subcategoria,
              SUB.descsubcategoria
            FROM
              public.est_estabelecimento_servicos ESE
              INNER JOIN public.cad_categorias CAD ON (CAD.id_categoria = ESE.id_categoria)
              INNER JOIN public.cad_subcategorias SUB ON (SUB.id_categoria = CAD.id_categoria)
            WHERE 
                ESE.id_estabelecimento=${id_estabelecimento} and CAD.id_categoria = ${id_categoria}`);

      // Definindo objeto com subcategorias para expandir-las
      const subcategoriasParaIterar = {
        id_categoria: parseInt(id_categoria),
        desc_categoria: desccategoria,
        subcategorias: subcategoriasDistintas[0]
      };

      const subcategoriasFinais = []; // Conterá a esturtura junto às subcategorias (expandire-mos os serviços futuramente)

      // Percorrendo subcategorias e expandindo o serviço
      for (item of subcategoriasParaIterar.subcategorias) {
        const { id_subcategoria } = item;

        const infosServicos = await sequelize.query(`
          SELECT
            ESE.id_subcategoria_servico,
            SSE.descsubcategoriaservico,
            ESE.valorservico
          FROM
            public.est_estabelecimento_servicos ESE
            INNER JOIN public.est_estabelecimentos ES ON (ESE.id_estabelecimento = ES.id_estabelecimento)
            INNER JOIN public.cad_categorias CAD ON (CAD.id_categoria = ESE.id_categoria)
            INNER JOIN public.cad_subcategorias SUB ON (SUB.id_categoria = CAD.id_categoria)
            LEFT  JOIN public.cad_subcategorias_servicos SSE ON (SSE.id_subcategoria = SUB.id_subcategoria)
          WHERE
            ESE.id_estabelecimento=${id_estabelecimento} and 
            CAD.id_categoria = ${id_categoria} and SUB.id_subcategoria = ${id_subcategoria}`);

        const arrayServicos = [];

        // Percorrendo serviços e setando valores
        for (servico of infosServicos[0]) {
          const {
            id_subcategoria_servico,
            valorservico,
            descsubcategoriaservico
          } = servico;

          await arrayServicos.push({
            id_subcategoria_servico: parseInt(id_subcategoria_servico),
            desc_servico: descsubcategoriaservico,
            valor_servico: valorservico
          });
        }

        // Acoplando serviços à nova subcategoria
        const novaSubcategoria = {
          ...item,
          id_subcategoria: parseInt(item.id_subcategoria),
          servicos: arrayServicos
        };

        await subcategoriasFinais.push({ ...novaSubcategoria });
      }

      // Acomplando subcategorias e retornando o objeto final
      await objetoFinal.push({
        ...subcategoriasParaIterar,
        subcategorias: subcategoriasFinais
      });
    }

    return res.send(objetoFinal);
  } catch (error) {
    console.log(error);
    res.status(400).json({
      errors: [
        {
          msg: "Erro ao retornar lista e serviços de um estabelecimento",
          callback: error.message
        }
      ]
    });
  }
};

// @route    GET /api/estabelecimentos?id_estabelecimento=X
// @desc     Retornar dados de um estabelecimento por ID
exports.estabelecimentos_por_id = async (req, res) => {
  try {
    // Retornando ID do esabelecimento passado via parametro
    const { id_estabelecimento } = req.query;

    // Retornando informações do usuário logado
    const user = await sys_users.findOne({
      where: {
        uuid_sysusers: req.user.id
      }
    });

    let objetoParaMontar = {
      id_estabelecimento: 0,
      nome_estabelecimento: null,
      endereco_estabelecimento: null,
      favoritado: false,
      horario_funcionamento: null,
      aberto: false,
      total_servicos: 0,
      nota_estabelecimento: 0,
      total_avaliacoes: 0,
      instagram: null,
      twitter: null,
      email: null,
      telefone: null,
      imagens: null
    };

    // Retornando informações do estabelecimento
    const estabelecimento = await est_estabelecimentos.findOne({
      where: { id_estabelecimento },
      include: [
        {
          model: est_estabelecimento_enderecos,
          attributes: ["cidade", "bairro"]
        },
        {
          model: cad_timezones,
          attributes: ["desctimezone"]
        }
      ]
    });

    // Desconstruindo Informações do Estabelecimento
    const descestabelecimento = estabelecimento
      ? estabelecimento.descestabelecimento
      : null;

    // Variavel com informações do estabelecimento
    const infosEnderecoEstabelecimento = estabelecimento
      ? estabelecimento.est_estabelecimento_enderecos
      : null;

    const cidade = infosEnderecoEstabelecimento[0]
      ? infosEnderecoEstabelecimento[0].cidade
      : null;

    const bairro = infosEnderecoEstabelecimento[0]
      ? infosEnderecoEstabelecimento[0].bairro
      : null;

    const desctimezone = estabelecimento
      ? estabelecimento.cad_timezones[0].desctimezone
      : null;

    // Configurações de TimeZone
    const time_zone = desctimezone; // cada estebelcimento tem sem próprio timezone
    const timestampAtual = await moment.tz(new Date(), time_zone);
    const horarioAtual =
      timestampAtual.hours() + ":" + timestampAtual.minutes();
    const diaDaSemanaAtual = (await moment.tz(new Date(), time_zone).day()) + 1;

    // Retornando se o estabelecimento está favorito
    const isFavoritado = await est_estabelecimentos_favoritos.findOne({
      where: {
        id_sysusers: user.id_sysusers,
        id_estabelecimento
      }
    });

    // Retornando quantos serviços o estabelcimento presta
    const total_servicos = await sequelize.query(
      `select count(id_estabelecimento) as conta from est_estabelecimento_servicos where id_estabelecimento = ${id_estabelecimento}`
    );

    // Retornando nota do estabelecimento
    const nota = await sequelize.query(
      `SELECT (select count (*) from est_estabelecimentos_avaliacoes where id_estabelecimento=1) as total_avaliacoes,
       AVG(valornota) as media_avaliacoes FROM est_estabelecimentos_avaliacoes WHERE id_estabelecimento=${id_estabelecimento};`
    );

    // Retornando Horario funcionamento e se está aberto
    const infoFuncionamentoEst = await sequelize.query(
      `SELECT id_jornada_estabelecimento, id_estabelecimento, diasemana, horainicio, horafim,` +
      `ativa, CURRENT_DATE, CASE WHEN   '${horarioAtual}' BETWEEN ` +
      `horainicio AND horafim THEN true ELSE false  END AS aberto ` +
      `FROM est_estabelevimentos_jornadas EJ WHERE EJ.id_estabelecimento= ${id_estabelecimento} ` +
      `AND EJ.diasemana IN (${diaDaSemanaAtual})`
    );

    // Retornando imagens
    const imagensParaMudar = await sequelize.query(`SELECT
        (select url from sys_imagens where id_imagem=id_imagemcapa) as imagem_capa,
        (select url from sys_imagens where id_imagem=id_imagemfundo) as imagem_fundo,
        (select url from sys_imagens where id_imagem=id_imagemsuperior) as imagem_superior,
        (select url from sys_imagens where id_imagem=id_imageminferior) as imagem_inferior FROM
         public.est_estabelecimentos where id_estabelecimento=${id_estabelecimento}`);

    // Montando imagens
    const imagens_estabelecimento = imagensParaMudar
      ? imagensParaMudar[0][0]
      : null;

    // Montando horário de funcionamento
    const horarioInicioParaMudar = infoFuncionamentoEst[0][0].horainicio
      ? infoFuncionamentoEst[0][0].horainicio.split(":")
      : null;
    const horarioFimParaMudar = infoFuncionamentoEst[0][0].horafim
      ? infoFuncionamentoEst[0][0].horafim.split(":")
      : null;
    const horario_inicio = horarioInicioParaMudar
      ? horarioInicioParaMudar[0] + ":" + horarioInicioParaMudar[1]
      : null;
    const horario_fim = horarioFimParaMudar
      ? horarioFimParaMudar[0] + ":" + horarioFimParaMudar[1]
      : null;

    const horario_funcionamento = horario_inicio + " às " + horario_fim;

    // Montando Endereco
    const endereco_estabelecimento = cidade + " - " + bairro;

    // Montando nota do estabelecimento
    const nota_estabelecimento = nota
      ? parseInt(nota[0][0].media_avaliacoes * 100) / 100
      : 0;

    // Montando total de avaliações do estabelecimento
    const total_avaliacoes = nota ? parseInt(nota[0][0].total_avaliacoes) : 0;

    // Montando se o estabelecimento está aberto ou não
    const isAberto = infoFuncionamentoEst[0][0]
      ? infoFuncionamentoEst[0][0].aberto
      : null;

    // Montando Redes sociais
    const instagram = estabelecimento ? estabelecimento.instagram : null;
    const twitter = estabelecimento ? estabelecimento.twitter : null;
    const email = estabelecimento ? estabelecimento.email : null;
    const telefone = estabelecimento ? estabelecimento.telefone : null;

    // Definindo valores no objeto
    objetoParaMontar.id_estabelecimento = parseInt(id_estabelecimento);
    objetoParaMontar.nome_estabelecimento = descestabelecimento;
    objetoParaMontar.endereco_estabelecimento = endereco_estabelecimento;
    objetoParaMontar.favoritado = isFavoritado ? true : false;
    objetoParaMontar.horario_funcionamento = horario_funcionamento;
    objetoParaMontar.aberto = isAberto;
    objetoParaMontar.total_servicos = parseInt(total_servicos[0][0].conta);
    objetoParaMontar.instagram = instagram;
    objetoParaMontar.twitter = twitter;
    objetoParaMontar.email = email;
    objetoParaMontar.telefone = telefone;
    objetoParaMontar.imagens = imagens_estabelecimento;
    objetoParaMontar.total_avaliacoes = total_avaliacoes;
    objetoParaMontar.nota_estabelecimento = parseFloat(
      nota_estabelecimento.toFixed(1)
    );

    res.send(objetoParaMontar);
  } catch (error) {
    console.log(error);
    res.status(400).json({
      errors: [
        {
          msg: "Erro ao retornar estabelecimentos por categoria",
          callback: error.message
        }
      ]
    });
  }
};


// MIDDLEWARE
// @route   /api/estabelecimentos/funcionarios?id_estabelecimento=X
exports.validatorFuncionariosEst = [
  check("id_estabelecimento")
    .not()
    .isEmpty()
    .withMessage("Por favor preencha o id do estabelecimento")
    .not()
    .isString()
    .withMessage("O id do estabelecimento deve ser um número inteiro")
]

// @route    GET /api/estabelecimentos/funcionarios?id_estabelecimento=X
// @desc     Retornar os Funcionários de um estabelecimento
exports.funcionarios_estabelecimento = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  try{

    // Retornando ID do esabelecimento passado via parametro
    const { id_estabelecimento } = req.body;

    // Retornando lista de categorias relacionadas ao estabelecimento
    const funcionariosEst = await sequelize.query(`
        SELECT
        servFunc.id_servicos_funcionarios,
        servFunc.id_funcionario,
        servFunc.percentualcomissao,
        servFunc.ativo,
        servFunc.id_estabelecimento_servicos,
        estServ.id_estabelecimento
      FROM
        public.fun_servicos_funcionarios AS servFunc
      INNER JOIN
        public.est_estabelecimento_servicos AS estServ
      ON
        servFunc.id_estabelecimento_servicos = estServ.id_estabelecimento_servico
      WHERE
        estServ.id_estabelecimento = ${id_estabelecimento} AND
        servFunc.ativo = true

      
      -- seleciona  funcionarios que fazem um servico especifico
      -- where id_estabelecimento_servicos=1
      -- ou 
      -- seleciona servicos de um funcionario especifico
      -- where id_funcionario=19`);

    // const funcionariosEst = await sequelize.query(`
    //     SELECT
    //     id_funcionario,
    //     nome
    //     FROM public.fun_servicos_funcionarios WHERE id_estabelecimento = ${id_estabelecimento}`);

    // const funcionariosEst = await sequelize.query(
    //       `SELECT
    //       H.horainicio, H.horafim
          
    //       FROM	est_horarios H
    //       LEFT JOIN
    //           age_funcionarios_servicos S
                  
    //       ON    H.id_horario = S.id_horario
    //       and s.id_estabelecimento = h.id_estabelecimento
    //       and s.id_funcionario=19 --parametro
          
          
    //       WHERE 
    //       h.id_estabelecimento = 1
    //       and H.datatrabalho = '2020-02-20' --parametro
    //       and S.id_horario IS NULL
    //       order by horainicio`
    // );

    res.json(funcionariosEst[0]);

  } catch (error) {
    console.log(error);
    res.status(400).json({
      errors: [
        {
          msg: "Erro ao retornar lista de funcionários de um estabelecimento",
          callback: error.message
        }
      ]
    });
  }
};

// MIDDLEWARE
// @route   /api/estabelecimentos/funcionarios/horariosReservados?id_estabelecimento=X&id_funcionario=X&datatrabalho=XXXX-XX-XX
exports.validatorFuncionariosHorariosRes = [
  check("id_estabelecimento")
    .not()
    .isEmpty()
    .withMessage("Por favor preencha o id do estabelecimento")
    .not()
    .isString()
    .withMessage("O id do estabelecimento deve ser um número inteiro"),
  
  check("id_funcionario")
    .not()
    .isEmpty()
    .withMessage("Por favor preencha o id do funcionário")
    .not()
    .isString()
    .withMessage("O id do funcionário deve ser um número inteiro"),

  check("data_trabalho")
    .not()
    .isEmpty()
    .withMessage("Por favor selecione uma data")
    .custom(async data => {
      const isValid = moment(data, 'YYYY-MM-DD', true).isValid() // true
      console.log(isValid);
      if(!isValid)
        throw new Error("");
      return true;
    }).withMessage("Data inválida")
]

// @route    GET /api/estabelecimentos/funcionarios/horariosReservados?id_estabelecimento=X&id_funcionario=X&datatrabalho=XXXX-XX-XX
// @desc     Retornar os horários reservados do funcionario selecionado
exports.funcionarios_horarios_reservados = async (req,res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  try {
    
    // Retornando informações do Body
    const { id_estabelecimento, id_funcionario, data_trabalho } = req.body;

    // Retornando lista de categorias relacionadas ao estabelecimento
    const funcionariosHoraRes = await sequelize.query(`
    SELECT
    S.id_estabelecimento,
    S.id_funcionario,
    H.horainicio,
    H.horafim   

    FROM
      age_funcionarios_servicos S
    INNER JOIN
      est_horarios H
    ON
      H.id_estabelecimento = S.id_estabelecimento
    AND 
      H.id_horario = S.id_horario
      
    WHERE
      h.id_estabelecimento = ${id_estabelecimento}
      AND id_funcionario = ${id_funcionario}
      AND	H.datatrabalho = '${data_trabalho}'`);

    res.send(funcionariosHoraRes[0]);

  } catch (error) {
    console.log(error);
    res.status(400).json({
      errors: [
        {
          msg: "Erro ao retornar lista de horarios reservador do funcionário",
          callback: error.message
        }
      ]
    });
  }
};

// @route    GET /api/estabelecimentos/funcionarios/horariosDisponiveis?id_estabelecimento=X&id_funcionario=X&datatrabalho=XXXX-XX-XX
// @desc     Retornar os horários disponiveis do funcionario selecionado
exports.funcionarios_horarios_disponiveis = async (req,res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  try {
    
    // Retornando informações do Body
    const { id_estabelecimento, id_funcionario, data_trabalho } = req.body;

    // Retornando lista de categorias relacionadas ao estabelecimento
    const funcionariosHoraRes = await sequelize.query(`
    SELECT
    H.horainicio, H.horafim
    
    FROM	est_horarios H
    LEFT JOIN
      age_funcionarios_servicos S
          
    ON    H.id_horario = S.id_horario
    and s.id_estabelecimento = h.id_estabelecimento
    and s.id_funcionario=${id_funcionario}


    WHERE 
    h.id_estabelecimento = ${id_estabelecimento}
    and H.datatrabalho = '${data_trabalho}'
    and S.id_horario IS NULL
    order by horainicio`);

    res.send(funcionariosHoraRes[0]);

  } catch (error) {
    console.log(error);
    res.status(400).json({
      errors: [
        {
          msg: "Erro ao retornar lista de horarios disponiveis do funcionário",
          callback: error.message
        }
      ]
    });
  }
};