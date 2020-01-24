"use strict";

module.exports = (sequelize, DataTypes) => {
  const timezones = sequelize.define(
    "cad_timezones",
    {
      id_timezone: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      desctimezone: DataTypes.STRING
    },
    { force: false }
  );
  timezones.associate = function(models) {};
  return timezones;
};
