/**
 * routes/api/estabelecimentos/controller.js
 *
 * @description: Esse arquivo contém a regra de negócio e lógica (controlador) dos
 * estabelecimentos
 *
 */

// models
const {
  est_estabelecimento_servicos,
  est_estabelecimentos,
  est_estabelecimentos_favoritos,
  est_estabelecimento_endereco,
  sys_users
} = require("../../../sequelize/models");

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
    const { page_size, page, id_categoria } = req.params;

    // Configurações da query/paginação
    const paginationConfig = {
      attributes: ["id_estabelecimento_servico"],
      where: {
        id_categoria
      },
      include: [
        {
          model: est_estabelecimentos,
          attributes: ["id_estabelecimento", "desc_estabelecimento"],
          include: [
            {
              model: est_estabelecimento_endereco,
              attributes: ["cidade", "bairro"]
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
          total_servicos: null,
          aberto: false
        };

        // Desconstruindo
        const {
          desc_estabelecimento,
          est_estabelecimento_enderecos,
          id_estabelecimento
        } = estabelecimento.est_estabelecimentos[0];

        // Verificando se o estabelecimento está favorito
        const isFavoritado = await est_estabelecimentos_favoritos.findOne({
          where: {
            id_sysusers: user.id_sysusers,
            id_estabelecimento
          }
        });

        // Montando endereço
        const endereco_estabelecimento =
          est_estabelecimento_enderecos[0].cidade +
          " - " +
          est_estabelecimento_enderecos[0].bairro;

        // Definindo valores no objeto
        objetoParaMontar.nome_estabelecimento = desc_estabelecimento;
        objetoParaMontar.endereco_estabelecimento = endereco_estabelecimento;
        objetoParaMontar.favoritado = isFavoritado ? true : false;

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
