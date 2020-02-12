"use strict";

module.exports = (sequelize, DataTypes) => {
  const cad_bandeiras = sequelize.define(
    "cad_bandeiras",
    {
      id_bandeira: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      descbandeira: DataTypes.STRING
    },
    { force: false }
  );
  cad_bandeiras.associate = function(models) {};
  return cad_bandeiras;
};
