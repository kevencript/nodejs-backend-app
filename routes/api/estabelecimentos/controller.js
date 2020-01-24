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

    // Configurações da query/paginação
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
          nome_estabelecimento: null,
          endereco_estabelecimento: null,
          favoritado: false,
          horario_funcionamento: null,
          aberto: false,
          total_servicos: 0,
          nota_estabelecimento: 0
        };

        // Desconstruindo
        const {
          descestabelecimento,
          est_estabelecimento_enderecos,
          id_estabelecimento,
          cad_timezones
        } = estabelecimento.est_estabelecimentos[0];

        // Desconstruindo Timezone e Definindo TimeZone
        const time_zone = cad_timezones[0].desctimezone;
        const timestampAtual = await moment.tz(new Date(), time_zone);

        // Horario atual aplicando TimeZone
        const CURRENT_TIME =
          timestampAtual.hours() + ":" + timestampAtual.minutes();

        // Dia da Semana atual aplicando TimeZone
        const DIA_SEMANA = (await moment.tz(new Date(), time_zone).day()) + 1;

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
            `ativa, CURRENT_DATE, CASE WHEN   '${CURRENT_TIME}' BETWEEN ` +
            `horainicio AND horafim THEN true ELSE false  END AS aberto ` +
            `FROM est_estabelevimentos_jornadas EJ WHERE EJ.id_estabelecimento= ${id_estabelecimento} ` +
            `AND EJ.diasemana IN (${DIA_SEMANA})`
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
