"use strict";

module.exports = (sequelize, DataTypes) => {
  const interesses_usuarios = sequelize.define(
    "interesses_usuarios",
    {
      id_interesses_usuarios: {
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
      id_interesse: {
        type: DataTypes.INTEGER,
        references: {
          model: "cad_interesses",
          key: "id_interesse"
        }
      }
    },
    { force: false }
  );
  interesses_usuarios.associate = function(models) {
    interesses_usuarios.hasMany(models.sys_users, {
      foreignKey: "id_sysusers"
    });
    interesses_usuarios.hasMany(models.cad_interesses, {
      foreignKey: "id_interesse"
    });
  };
  return interesses_usuarios;
};
