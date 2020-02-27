/**
 * utilitarios/validarCupomPromocional.js
 *
 * @description: Função para validar um Cupom promocional
 *
 */

const config = require("../config/keys");
const { sequelize } = require("../sequelize/models");

// Essa função deve ser passada como Middleware
exports.validarCupomPromocional = async (
  codigoCupom,
  idCliente,
  valorVenda
) => {
  try {
    const isValid = await sequelize.query(`
            SELECT
            
                1 as bolcupomvalido,
                CD.id_cupom,
                CD.tipocupom,
                CD.id_funcionario,
                CD.datahoracadastro,
                CD.desccupom,
                CD.codigocupom,
                CD.valordesconto::numeric::float8,
                CD.id_estabelecimento,
                CD.datahoravalidade,
                CD.valoracimade,
                CD.ativo
                from fin_cupons_descontos CD
            
            INNER JOIN fin_cupons_clientes CC
            ON CD.id_cupom = cc.id_cupom
            
            and  CC.id_cliente <> ${idCliente}							--parametro id_sysusers
            
            WHERE CD.codigocupom='${codigoCupom}'				--parametro cupom
            and  CD.valoracimade <= cast(${valorVenda} as money)		--parametro valor da venda
            and CD.datahoravalidade >= CURRENT_TIMESTAMP
            
            --select * from fin_cupons_descontos
            -- select * from fin_cupons_clientes
    `);

    // Validando se o cupom é válido
    if (!isValid[0][0]) return false;

    return {
      id_cupom: parseInt(isValid[0][0].id_cupom),
      totalDesconto: isValid[0][0].valordesconto
    };
  } catch (error) {
    console.log(error);
    throw new Error(error.message);
  }
};
