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
    secretAccessKey: process.env.SECRET_ACCESS_KEY_AWS,
    accessKeyId: process.env.ACCESS_KEY_ID_AWS
  },
  mex10: {
    user: process.env.MEX10_USER,
    password: process.env.MEX10_PASSWORD
  }
};
