"use strict";

module.exports = (sequelize, DataTypes) => {
  const cad_subcategorias_servicos = sequelize.define(
    "cad_subcategorias_servicos",
    {
      id_subcategoria_servico: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      id_subcategoria: {
        type: DataTypes.INTEGER,
        references: {
          model: "cad_categorias",
          key: "id_subcategoria"
        }
      },
      descsubcategoria_servico: DataTypes.STRING,
      valorservico: DataTypes.DECIMAL
    },
    { force: false }
  );
  cad_subcategorias_servicos.associate = function(models) {
    cad_subcategorias_servicos.hasMany(models.cad_subcategorias, {
      foreignKey: "id_subcategoria"
    });
  };
  return cad_subcategorias_servicos;
};
