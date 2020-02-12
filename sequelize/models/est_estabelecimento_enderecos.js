"use strict";

module.exports = (sequelize, DataTypes) => {
  const est_estabelecimento_enderecos = sequelize.define(
    "est_estabelecimento_enderecos",
    {
      id_estabelecimento_endereco: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      id_estabelecimento: {
        type: DataTypes.INTEGER,
        references: {
          model: "est_estabelecimentos",
          key: "id_estabelecimento"
        }
      },

      complemento: DataTypes.STRING,
      numero: DataTypes.STRING,
      uf: DataTypes.STRING,
      cidade: DataTypes.STRING,
      bairro: DataTypes.STRING,
      cep: DataTypes.INTEGER
    },
    { force: false }
  );
  est_estabelecimento_enderecos.associate = function(models) {
    est_estabelecimento_enderecos.hasMany(
      models.est_estabelecimento_enderecos,
      {
        foreignKey: "id_estabelecimento_endereco"
      }
    );

    est_estabelecimento_enderecos.hasMany(
      models.est_estabelecimento_enderecos,
      {
        foreignKey: "id_estabelecimento"
      }
    );
  };
  return est_estabelecimento_enderecos;
};
