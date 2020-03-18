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
    const categoriasParaIterar = await sequelize.query(
      `
      SELECT
            DISTINCT  CAT.ID_CATEGORIA,
              CAT.DESCCATEGORIA
      FROM
              CAD_CATEGORIAS CAT
      WHERE
              CAT.ID_CATEGORIA IN
              (
                      SELECT
                              SUB.id_categoria
                      FROM
                              est_estabelecimento_servicos ES
                      LEFT JOIN
                              cad_subcategorias_servicos SUB
                      ON
                              ES.id_subcategoria_servico = SUB.id_subcategoria_servico
                      WHERE
                              ES.id_estabelecimento=:id_estabelecimento )`,
      {
        replacements: { id_estabelecimento },
        type: sequelize.QueryTypes.SELECT
      }
    );

    if (!categoriasParaIterar[0])
      throw new Error(
        "Nenhuma categoria encontrada a partir do ID de estabelecimento"
      );

    const objetosFinais = []; // Conterá os objetos prontos para serem retornados via HTTP

    // PRIMEIRA ITERAÇÃO: Categorias
    for (categoria of categoriasParaIterar) {
      const { id_categoria, desccategoria } = categoria;

      // Retornando lista de subcategoria_servicos para iterar
      const subServicosParaIterar = await sequelize.query(
        `
        SELECT
        distinct  ES.id_subcategoria_servico
                FROM
                        est_estabelecimento_servicos ES
                LEFT JOIN
                        cad_subcategorias_servicos SUB
                ON
                        ES.id_subcategoria_servico = SUB.id_subcategoria_servico
                WHERE
                         ES.ativo = true and ES.id_estabelecimento=:id_estabelecimento and 
                         SUB.id_categoria = :id_categoria`,
        {
          replacements: {
            id_estabelecimento,
            id_categoria
          },
          type: sequelize.QueryTypes.SELECT
        }
      );

      if (!subServicosParaIterar[0])
        throw new Error(
          "Nenhuma subcategoria serviço a partir do ID de estabelecimento"
        );

      // Modelo inicial do objeto que iremos retornar
      let modeloDeObjeto = {
        id_categoria: parseInt(id_categoria),
        desc_categoria: desccategoria,
        elementos_soltos: []
      };

      // SEGUNDA ITERAÇÃO: Subcategorias Serviços
      for (subcategoria_servico of subServicosParaIterar) {
        const { id_subcategoria_servico } = subcategoria_servico;

        const infosSubServico = await sequelize.query(
          `
            SELECT 
              SUB.id_subcategoria_servico,
              SUB.id_subcategoria,
              SUB.descsubcategoriaservico,
              ES.valorservico,
              ES.id_estabelecimento_servico
            FROM
              public.cad_subcategorias_servicos SUB
			      LEFT JOIN public.est_estabelecimento_servicos ES oN
			        (ES.id_subcategoria_servico = SUB.id_subcategoria_servico)
            WHERE SUB.id_categoria = :id_categoria and SUB.id_subcategoria_servico = :id_subcategoria_servico`,
          {
            replacements: {
              id_categoria,
              id_subcategoria_servico
            },
            type: sequelize.QueryTypes.SELECT
          }
        );

        // Desconsturindo informações
        const {
          id_estabelecimento_servico,
          id_subcategoria,
          descsubcategoriaservico,
          valorservico
        } = infosSubServico[0];

        // Caso NÃO tenha subcategoria
        if (id_subcategoria === null) {
          const elementoSolto = {
            id_estabelecimento_servico: parseInt(id_estabelecimento_servico),
            desc_servico: descsubcategoriaservico,
            preco: valorservico
          };

          await modeloDeObjeto.elementos_soltos.push(elementoSolto);
        } else {
          // Caso TENHA subcategoria

          const infosSubcategoria = await sequelize.query(
            `
            select descsubcategoria from cad_subcategorias where id_subcategoria = :id_subcategoria
          `,
            {
              replacements: {
                id_subcategoria
              },
              type: sequelize.QueryTypes.SELECT
            }
          );

          // Validando se já existe alguma subcategoria no modelo de objeto
          if (modeloDeObjeto.subcategorias) {
            let subcategoriasGerais = [];

            for (subcategoria of modeloDeObjeto.subcategorias) {
              // Caso a subcategoria percorrida seja a qual queremos inserir um novo serviço
              if (subcategoria.id_subcategoria == id_subcategoria) {
                const novoServico = {
                  id_estabelecimento_servico: parseInt(
                    id_estabelecimento_servico
                  ),
                  desc_servico: descsubcategoriaservico,
                  preco: valorservico
                };

                // Criando uma cópia da "subcategoria" para inserir-mos o novo serviço
                const novaSubcategoria = subcategoria;
                await novaSubcategoria.servicos.push(novoServico);

                await subcategoriasGerais.push(novaSubcategoria);
              } else {
                await subcategoriasGerais.push(subcategoria);
              }
            }

            modeloDeObjeto.subcategorias = subcategoriasGerais;
          } else {
            // Criando a estrutura da primeira Subcategoria a ser inserida
            const estruturaSubcategoria = [
              {
                id_subcategoria: parseInt(id_subcategoria),
                desc_subcategoria: infosSubcategoria[0].descsubcategoria,
                servicos: [
                  {
                    id_estabelecimento_servico: parseInt(
                      id_estabelecimento_servico
                    ),
                    desc_servico: descsubcategoriaservico,
                    preco: valorservico
                  }
                ]
              }
            ];

            modeloDeObjeto.subcategorias = estruturaSubcategoria;
          }
        }
      }

      console.log(modeloDeObjeto);

      await objetosFinais.push(modeloDeObjeto);
    }

    // return res.send(objetoFinal);
    return res.json(objetosFinais);
  } catch (error) {
    console.log(error);
    res.status(400).json({
      errors: [
        {
          msg: "Erro ao retornar lista de serviços de um estabelecimento",
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
