"use strict";

module.exports = (sequelize, DataTypes) => {
  const cad_interesses = sequelize.define(
    "cad_interesses",
    {
      id_interesse: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      descinteresse: DataTypes.STRING
    },
    { force: false }
  );
  cad_interesses.associate = function(models) {};
  return cad_interesses;
};
