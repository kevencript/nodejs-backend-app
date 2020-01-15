"use strict";

module.exports = (sequelize, DataTypes) => {
  const cad_interesses_usuarios = sequelize.define(
    "cad_interesses_usuarios",
    {
      id_interesse_usuario: {
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
  cad_interesses_usuarios.associate = function(models) {
    cad_interesses_usuarios.hasMany(models.sys_users, {
      foreignKey: "id_sysusers"
    });
    cad_interesses_usuarios.hasMany(models.cad_interesses, {
      foreignKey: "id_interesse"
    });
  };
  return cad_interesses_usuarios;
};
