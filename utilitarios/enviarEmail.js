/**
 * utilitarios/enviarEmail.js
 *
 * @description: Função para enviar E-mail
 *
 */

const aws = require("aws-sdk");
const config = require("../config/keys");

// EndereçosDeEmail: É um array contendo os endereços nos quais enviaremos o e-mail
// htmlCode: Código HTML que haverá dentro do e-mail
exports.enviarEmail = async (
  enderecosDeEmail,
  htmlCode,
  emailText,
  tituloEmail
) => {
  const { secretAccessKey, accessKeyId } = config.aws.ses;
  const region = "us-west-2";

  try {
    // Configurando AWS
    await aws.config.update({
      region
    });

    const ses = new aws.SES();

    const params = {
      Destination: {
        ToAddresses: [enderecosDeEmail] // Lista de endereços de e-mail nos quais enviaremos
      },
      Message: {
        Body: {
          Html: {
            // HTML Format of the email
            Charset: "UTF-8",
            Data: htmlCode
          },
          Text: {
            Charset: "UTF-8",
            Data: emailText
          }
        },
        Subject: {
          Charset: "UTF-8",
          Data: tituloEmail
        }
      },
      Source: "kevencript@gmail.com"
    };

    const sendEmail = ses.sendEmail(params).promise();

    return sendEmail
      .then(data => {
        console.log("E-mail enviado cm sucesso", data);
        return data;
      })
      .catch(error => {
        console.log(error);
        throw new Error(error);
      });
  } catch (err) {
    console.log(err);
    throw new Error(err);
  }
};
