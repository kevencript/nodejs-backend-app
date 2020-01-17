"use strict";

module.exports = (sequelize, DataTypes) => {
  const cad_subcategorias = sequelize.define(
    "cad_subcategorias",
    {
      id_subcategoria: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      id_categoria: {
        type: DataTypes.INTEGER,
        references: {
          model: "cad_categorias",
          key: "id_categoria"
        }
      },
      descsubcategoria: DataTypes.STRING,
      valor_subcategoria: DataTypes.DECIMAL
    },
    { force: false }
  );
  cad_subcategorias.associate = function(models) {
    cad_subcategorias.hasMany(models.cad_categorias, {
      foreignKey: "id_categoria"
    });
  };
  return cad_subcategorias;
};
