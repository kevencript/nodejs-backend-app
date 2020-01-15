"use strict";

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
      id_estabelecimento: {
        type: DataTypes.INTEGER,
        references: {
          model: "cad_interesses",
          key: "id_estabelecimento"
        }
      }
    },
    { force: false }
  );
  est_estabelecimentos.associate = function(models) {
    est_estabelecimentos.hasMany(models.sys_users, {
      foreignKey: "id_sysusers"
    });
    est_estabelecimentos.hasMany(models.cad_interesses, {
      foreignKey: "id_estabelecimento"
    });
  };
  return est_estabelecimentos;
};
