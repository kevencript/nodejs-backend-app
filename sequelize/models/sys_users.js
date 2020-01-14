"use strict";

module.exports = (sequelize, DataTypes) => {
  const sys_users = sequelize.define(
    "sys_users",
    {
      id_sysusers: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      uuid_sysusers: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
      },
      username: DataTypes.STRING,
      nome: DataTypes.STRING,
      password: DataTypes.STRING,
      email: DataTypes.STRING,
      activated: DataTypes.TINYINT,
      new_password_requested: DataTypes.DATE,
      new_password_key: DataTypes.STRING,
      created: DataTypes.DATE,
      data_json: DataTypes.JSON,
      foto: DataTypes.STRING
    },
    { force: false }
  );
  sys_users.associate = function(models) {
    // sys_users.belongsTo(models.cad_usuarios, {
    //   foreignKey: "id_usuarios"
    // });
  };
  return sys_users;
};
