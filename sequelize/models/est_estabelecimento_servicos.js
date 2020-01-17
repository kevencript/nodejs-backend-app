"use strict";

module.exports = (sequelize, DataTypes) => {
  const est_estabelecimento_servicos = sequelize.define(
    "est_estabelecimento_servicos",
    {
      id_estabelecimento_servico: {
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
      id_subcategoria: {
        type: DataTypes.INTEGER,
        references: {
          model: "cad_subcategorias",
          key: "id_subcategoria"
        }
      },
      id_subcategoria_servico: {
        type: DataTypes.INTEGER,
        references: {
          model: "cad_subcategorias_servicos",
          key: "id_subcategoria_servico"
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
  est_estabelecimento_servicos.associate = function(models) {
    // Categorias
    est_estabelecimento_servicos.hasMany(models.cad_categorias, {
      foreignKey: "id_categoria"
    });

    // SubCategorias
    est_estabelecimento_servicos.hasMany(models.cad_subcategorias, {
      foreignKey: "id_subcategoria"
    });

    // Estabelecimento
    est_estabelecimento_servicos.hasMany(models.est_estabelecimentos, {
      foreignKey: "id_estabelecimento"
    });

    // Subcategorias Servicos
    est_estabelecimento_servicos.hasMany(models.cad_subcategorias_servicos, {
      foreignKey: "id_subcategoria_servico"
    });
  };
  return est_estabelecimento_servicos;
};
