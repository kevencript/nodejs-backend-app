"use strict";
const sequelizePaginate = require("sequelize-paginate");

module.exports = (sequelize, DataTypes) => {
  const est_estabelecimentos = sequelize.define(
    "est_estabelecimentos",
    {
      id_estabelecimento: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      id_endereco: {
        type: DataTypes.INTEGER,
        references: {
          model: "est_estabelecimento_enderecos",
          key: "id_estabelecimento_endereco"
        }
      },
      id_matriz: {
        type: DataTypes.INTEGER,
        references: {
          model: "est_estabelecimentos",
          key: "id_estabelecimento"
        }
      },
      id_timezone: {
        type: DataTypes.INTEGER,
        references: {
          model: "cad_timezones",
          key: "id_timezone"
        }
      },
      descestabelecimento: DataTypes.STRING,
      cnpj: DataTypes.STRING,
      telefone: DataTypes.STRING,
      email: DataTypes.STRING,

      instagram: DataTypes.STRING,
      facebook: DataTypes.STRING,
      twitter: DataTypes.STRING,
      nota: DataTypes.STRING,
      ativo: DataTypes.TINYINT,
      ddd: DataTypes.CHAR(4),
      id_imagemcapa: DataTypes.INTEGER,
      id_imagemfundo: DataTypes.INTEGER,
      id_imagemsuperior: DataTypes.INTEGER,
      id_imageminferior: DataTypes.INTEGER
    },
    { force: false }
  );

  // Paginador
  sequelizePaginate.paginate(est_estabelecimentos);

  // Relacionamentos
  est_estabelecimentos.associate = function(models) {
    // Endereço
    est_estabelecimentos.hasMany(models.est_estabelecimento_enderecos, {
      foreignKey: "id_estabelecimento_endereco"
    });

    // Auto-relação para definir matrizes
    est_estabelecimentos.hasMany(models.est_estabelecimentos, {
      foreignKey: "id_estabelecimento"
    });

    // Timezones
    est_estabelecimentos.hasMany(models.cad_timezones, {
      foreignKey: "id_timezone"
    });
  };
  return est_estabelecimentos;
};
