const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('coach_schedule_times', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    coach_schedule_day_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'coach_schedule_days',
        key: 'id'
      }
    },
    start_time: {
      type: DataTypes.TIME,
      allowNull: false
    },
    end_time: {
      type: DataTypes.TIME,
      allowNull: false
    },

    start_time_stamp: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue:0
    },
    end_time_stamp: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue:0
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      field: "updated_at"
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "deleted_at"
    }
    
  }, {
    sequelize,
    tableName: 'coach_schedule_times',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "coach_schedule_day",
        using: "BTREE",
        fields: [
          { name: "coach_schedule_day_id" },
        ]
      },
      {
        name: "user_slot",
        using: "BTREE",
        fields: [
          { name: "user_id" },
        ]
      },
    ]
  });
};
