/**
 *
 * config/prod.js
 *
 * @description: Chaves no ambiente de PRODUÇÃO
 *
 */

module.exports = {
  jwtSecret: process.env.JWT_SECRET,
  database: process.env.DATABASE,
  db_username: process.env.DATABASE_USERNAME,
  db_passsword: process.env.DATABASE_PASSWORD,
  db_host: process.env.DATABASE_HOST,
  aws: {
    s3: {
      secretAccessKey: process.env.S3_SECRET_KEY_AWS,
      accessKeyId: process.env.S3_ACCESS_KEY_AWS
    },
    ses: {
      secretAccessKey: process.env.SES_SECRET_KEY_AWS,
      accessKeyId: process.env.SES_ACCESS_KEY_AWS
    }
  },
  mex10: {
    user: process.env.MEX10_USER,
    password: process.env.MEX10_PASSWORD
  },
  cielo: {
    MerchantId: process.env.CIELO_MERCHANT_ID,
    MerchantKey: process.env.CIELO_MERCHANT_KEY
  }
};
