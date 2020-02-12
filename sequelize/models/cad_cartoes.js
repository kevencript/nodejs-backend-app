"use strict";

module.exports = (sequelize, DataTypes) => {
  const cad_cartoes = sequelize.define(
    "cad_cartoes",
    {
      id_cartao: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      token: DataTypes.STRING,
      numerocartao: DataTypes.STRING,
      id_cliente: {
        type: DataTypes.INTEGER,
        references: {
          model: "sys_users",
          key: "id_sysusers"
        }
      },
      id_bandeira: {
        type: DataTypes.INTEGER,
        references: {
          model: "cad_bandeiras",
          key: "id_bandeira"
        }
      }
    },
    { force: false }
  );
  cad_cartoes.associate = function(models) {
    // Usuário
    cad_cartoes.hasMany(models.sys_users, {
      foreignKey: "id_sysusers"
    });

    // Bandeiras
    cad_cartoes.hasMany(models.cad_bandeiras, {
      foreignKey: "id_bandeira"
    });
  };
  return cad_cartoes;
};
