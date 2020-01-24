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
          model: "est_estabelecimento_endereco",
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
      descestabelecimento: DataTypes.STRING,
      cnpj: DataTypes.STRING,
      telefone: DataTypes.STRING,
      cep: DataTypes.STRING,
      email: DataTypes.STRING,
      nomeicone: DataTypes.STRING,
      instagram: DataTypes.STRING,
      facebook: DataTypes.STRING,
      twitter: DataTypes.STRING,
      nota: DataTypes.STRING,
      ativo: DataTypes.TINYINT,
      ddd: DataTypes.CHAR(4),
      id_imagem_capa: DataTypes.INTEGER,
      id_imagem_fundo: DataTypes.INTEGER,
      id_imagem_superior: DataTypes.INTEGER,
      id_imagem_inferior: DataTypes.INTEGER
    },
    { force: false }
  );

  // Paginador
  sequelizePaginate.paginate(est_estabelecimentos);

  // Relacionamentos
  est_estabelecimentos.associate = function(models) {
    // Endereço
    est_estabelecimentos.hasMany(models.est_estabelecimento_endereco, {
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
