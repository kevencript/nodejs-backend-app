/**
 * utilitarios/cielo.js
 *
 * @description: Arquivo responsável por gerenciar toda a parte da Cielo
 *
 */

const axios = require("axios");
const {
  MerchantId,
  MerchantId_PROD,
  MerchantKey,
  MerchantKey_PROD
} = require("../config/keys").cielo;

const MAIN_URL = "https://api.cieloecommerce.cielo.com.br";

// Realizar uma transação simples no cartão de crédito
exports.transacaoSimplesCredito = async (
  cardToken,
  securityCode,
  bandeira,
  valorTransacao,
  parcelas,
  nomeComprador
) => {
  // Verificando Campos
  const CardToken = cardToken ? cardToken : null;
  const SecurityCode = securityCode ? securityCode : null;
  const Bandeira = bandeira ? bandeira : null;
  const Parcelas = parcelas ? parcelas : null;
  const Name = nomeComprador ? nomeComprador : null;
  const Valor = valorTransacao ? valorTransacao : null;

  try {
    if (
      CardToken === null ||
      SecurityCode === null ||
      Bandeira === null ||
      Parcelas === null ||
      Name === null ||
      Valor === null
    )
      throw new Error(
        "Erro ao realizar transição simples. Informações da compra incompletas"
      );

    // Realizando requisição na API da Cielo para realizar compra
    const dataCartao = await axios.post(
      MAIN_URL + "/1/sales/",
      {
        MerchantOrderId: "2014111706",
        Customer: {
          Name
        },
        Payment: {
          Type: "CreditCard",
          Amount: 10,
          Installments: Parcelas,
          SoftDescriptor: "Backbeauty",
          CreditCard: {
            CardToken,
            SecurityCode,
            Bandeira
          }
        }
      },
      {
        headers: {
          MerchantId: MerchantId_PROD,
          MerchantKey: MerchantKey_PROD
        }
      }
    );

    // Retornando erro das mensagens
    this.validatorCode(dataCartao.data.Payment.Status);

    return dataCartao;
  } catch (error) {
    console.log(error);
    // Verificando se o erro é proveniente da Cielo (existe error.response) ou é um erro normal
    const msgError = error.response
      ? error.response.data[0].Message +
        " | Codigo " +
        error.response.data[0].Code
      : error.message;
    throw new Error(msgError);
  }
};

// Realizar Captura de uma venda
exports.capturarVenda = async paymentId => {
  try {
    const PaymentId = paymentId ? paymentId : null;

    if (!PaymentId)
      throw new Error(
        "Erro ao realizar captura da venda informada. Verifique o PaymentId"
      );

    // Realizando requisição na API da Cielo para Capturar venda
    const infosCaptura = await axios.put(
      MAIN_URL + `/1/sales/${PaymentId}/capture`,
      {},
      {
        headers: {
          MerchantId: MerchantId_PROD,
          MerchantKey: MerchantKey_PROD
        }
      }
    );

    // Retornando erro das mensagens
    this.validatorCode(infosCaptura);

    return infosCaptura;
  } catch (error) {
    console.log(error);
    // Verificando se o erro é proveniente da Cielo (existe error.response) ou é um erro normal
    const msgError = error.response
      ? error.response.data[0].Message
      : error.message;
    throw new Error(msgError);
  }
};

// Função para retornar respostas de acordo com código
exports.validatorCode = code => {
  // Validando código retornado
  switch (code) {
    case 0: // NotFinished
      throw new Error("Aguardando atualização de status");
    case 3: // Denied
      throw new Error("Pagamento negado pelo Autorizador");
    case 10: // Voided
      throw new Error("Pagamento cancelado");
    case 11: // Refunded
      throw new Error("Pagamento cancelado após 23:59 do dia de autorização");
    case 12: // Peding
      throw new Error("Aguardando Status de instituição financeira");
    case 13: // Aborted
      throw new Error(
        "Pagamento cancelado por falha no processamento ou por ação do AF"
      );
    case 14: // Scheduled
      throw new Error("Recorrência agendada");
  }
};
