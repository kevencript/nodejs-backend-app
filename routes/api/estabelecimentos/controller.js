/**
 * routes/api/estabelecimentos/controller.js
 *
 * @description: Esse arquivo contém a regra de negócio e lógica (controlador) dos
 * estabelecimentos
 *
 */

const moment = require("moment-timezone");

// models
const {
  est_estabelecimento_servicos,
  est_estabelecimentos,
  est_estabelecimentos_favoritos,
  est_estabelecimento_endereco,
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
              model: est_estabelecimento_endereco,
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
        const {
          descestabelecimento,
          est_estabelecimento_enderecos,
          id_estabelecimento,
          cad_timezones
        } = estabelecimento.est_estabelecimentos[0];
        const time_zone = cad_timezones[0].desctimezone; // cada estebelcimento tem sem próprio timezone
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
          "select count(id_estabelecimento) as conta from est_estabelecimento_servicos where id_estabelecimento =2"
        );

        // Retornando nota do estabelecimento
        const nota = await sequelize.query(
          "SELECT AVG(valor_nota) FROM est_estabelecimentos_avaliacao where id_estabelecimento=" +
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
        const horarioInicioParaMudar = infoFuncionamentoEst[0][0].horainicio.split(
          ":"
        );
        const horarioFimParaMudar = infoFuncionamentoEst[0][0].horafim.split(
          ":"
        );
        const horario_inicio =
          horarioInicioParaMudar[0] + ":" + horarioInicioParaMudar[1];

        const horario_fim =
          horarioFimParaMudar[0] + ":" + horarioFimParaMudar[1];

        const horario_funcionamento = horario_inicio + " às " + horario_fim;

        // Montando endereço
        const endereco_estabelecimento =
          est_estabelecimento_enderecos[0].cidade +
          " - " +
          est_estabelecimento_enderecos[0].bairro;

        // Definindo valores no objeto
        objetoParaMontar.id_estabelecimento = parseInt(id_estabelecimento);
        objetoParaMontar.nome_estabelecimento = descestabelecimento;
        objetoParaMontar.endereco_estabelecimento = endereco_estabelecimento;
        objetoParaMontar.favoritado = isFavoritado ? true : false;
        objetoParaMontar.total_servicos = parseInt(total_servicos[0][0].conta);
        objetoParaMontar.aberto = infoFuncionamentoEst[0][0].aberto;
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

// @route    GET /api/estabelecimentos/categoria/:id
// @desc     Retornar dados de um estabelecimento por ID
exports.estabelecimentos_por_id = async (req, res) => {
  try {
    // Retornando ID do esabelecimento passado via parametro
    const { id_estabelecimento } = req.params;

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
      instagram: null,
      twitter: null,
      email: null,
      telefone: null
    };

    // Retornando informações do estabelecimento
    const estabelecimento = await est_estabelecimentos.findOne({
      where: { id_estabelecimento },
      include: [
        {
          model: est_estabelecimento_endereco,
          attributes: ["cidade", "bairro"]
        },
        {
          model: cad_timezones,
          attributes: ["desctimezone"]
        }
      ]
    });

    // Desconstruindo Informações do Estabelecimento
    const { descestabelecimento } = estabelecimento;
    const { cidade, bairro } = estabelecimento.est_estabelecimento_enderecos[0];
    const { desctimezone } = estabelecimento.cad_timezones[0];

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
      "select count(id_estabelecimento) as conta from est_estabelecimento_servicos where id_estabelecimento =2"
    );

    // Retornando nota do estabelecimento
    const nota = await sequelize.query(
      "SELECT AVG(valor_nota) FROM est_estabelecimentos_avaliacao where id_estabelecimento=" +
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

    // Montando horário de funcionamento
    const horarioInicioParaMudar = infoFuncionamentoEst[0][0].horainicio.split(
      ":"
    );
    const horarioFimParaMudar = infoFuncionamentoEst[0][0].horafim.split(":");
    const horario_inicio =
      horarioInicioParaMudar[0] + ":" + horarioInicioParaMudar[1];
    const horario_fim = horarioFimParaMudar[0] + ":" + horarioFimParaMudar[1];

    const horario_funcionamento = horario_inicio + " às " + horario_fim;

    // Montando Endereco
    const endereco_estabelecimento = cidade + " - " + bairro;

    // Montando nota do estabelecimento
    const nota_estabelecimento = parseInt(nota[0][0].avg * 100) / 100;

    // Definindo valores no objeto
    objetoParaMontar.id_estabelecimento = parseInt(id_estabelecimento);
    objetoParaMontar.nome_estabelecimento = descestabelecimento;
    objetoParaMontar.endereco_estabelecimento = endereco_estabelecimento;
    objetoParaMontar.favoritado = isFavoritado ? true : false;
    objetoParaMontar.horario_funcionamento = horario_funcionamento;
    objetoParaMontar.aberto = infoFuncionamentoEst[0][0].aberto;
    objetoParaMontar.total_servicos = parseInt(total_servicos[0][0].conta);
    objetoParaMontar.instagram = estabelecimento.instagram;
    objetoParaMontar.twitter = estabelecimento.twitter;
    objetoParaMontar.email = estabelecimento.email;
    objetoParaMontar.telefone = estabelecimento.telefone;
    objetoParaMontar.nota_estabelecimento = parseFloat(
      nota_estabelecimento.toFixed(1)
    );

    res.json(objetoParaMontar);
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
