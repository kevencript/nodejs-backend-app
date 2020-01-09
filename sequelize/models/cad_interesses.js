"use strict";

module.exports = (sequelize, DataTypes) => {
  const sys_users = sequelize.define(
    "cad_interesses",
    {
      id_Interesse: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      DescInteresse: DataTypes.STRING
    },
    { force: false }
  );
  sys_users.associate = function(models) {};
  return sys_users;
};
