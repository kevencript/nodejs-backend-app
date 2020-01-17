"use strict";

module.exports = (sequelize, DataTypes) => {
  const cad_categorias = sequelize.define(
    "cad_categorias",
    {
      id_categoria: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      desccategoria: DataTypes.STRING,
      nomeicone: DataTypes.STRING
    },
    { force: false }
  );
  cad_categorias.associate = function(models) {};
  return cad_categorias;
};
