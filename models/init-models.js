var DataTypes = require("sequelize").DataTypes;
var _app_downtime_record = require("./app_downtime_record");

function initModels(sequelize) {
  var app_downtime_record = _app_downtime_record(sequelize, DataTypes);


  return {
    app_downtime_record,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
