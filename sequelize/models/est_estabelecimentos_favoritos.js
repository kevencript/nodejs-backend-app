"use strict";

module.exports = (sequelize, DataTypes) => {
  const est_estabelecimentos_favoritos = sequelize.define(
    "est_estabelecimentos_favoritos",
    {
      id_estabelecimentos_favoritos: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      id_sysusers: {
        type: DataTypes.INTEGER,
        references: {
          model: "sys_users",
          key: "id_sysusers"
        }
      },
      id_estabelecimento: {
        type: DataTypes.INTEGER,
        references: {
          model: "est_estabelecimentos",
          key: "id_estabelecimento"
        }
      }
    },
    { force: false }
  );
  est_estabelecimentos_favoritos.associate = function(models) {
    est_estabelecimentos_favoritos.hasMany(models.sys_users, {
      foreignKey: "id_sysusers"
    });
    est_estabelecimentos_favoritos.hasMany(models.cad_interesses, {
      foreignKey: "id_estabelecimento"
    });
  };
  return est_estabelecimentos_favoritos;
};
