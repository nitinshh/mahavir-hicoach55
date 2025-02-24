const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('bookings', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    coach_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    booking_status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0// 0=>no, 1=>yes- accepted
    },
    cancel_status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    booking_type: {
      type: DataTypes.ENUM('slot','package','class','customize'),
      allowNull: false
    },
    coach_schedule_time_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    start_time: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: ""
    },
    end_time: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: ""
    },
    time_in_hr: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0////if booking_type class
    },

    date: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: ""// DD-MM-YYYY
    },
    date1: {
      type: DataTypes.DATE,  // Use DATE type instead of STRING(50)
      allowNull: true,
      defaultValue: null,  // Default to null if no date is provided
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: ""
    },
    latitude: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: ""
    },
    longitude: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: ""
    },
    cancel_reacuring_removal_date: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: ""
    },
    reacuring_day: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: ""
    },
       payment_status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0/// if booking_type package
    },
    class_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0////if booking_type class
    },
    price: {
      type: DataTypes.DECIMAL(9,2),
      allowNull: false,
      defaultValue: 0.00
    },
    discount: {
      type: DataTypes.DECIMAL(9,2),
      allowNull: false,
      defaultValue: 0.00
    },
    is_reccuring: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment:"1=>once,2=>repeated"
    },
    payment_status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0/// 1=>done
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

//     ALTER TABLE `bookings` ADD `reacuring_day` VARCHAR(50) NOT NULL DEFAULT '' AFTER `is_reccuring`, ADD `cancel_reacuring_removal_date` VARCHAR(50) NOT NULL DEFAULT '' AFTER `reacuring_day`;

// ignore  it
  }, {
    sequelize,
    tableName: 'bookings',
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
        name: "coach_user",
        using: "BTREE",
        fields: [
          { name: "coach_id" },
        ]
      },
      {
        name: "student_user",
        using: "BTREE",
        fields: [
          { name: "user_id" },
        ]
      },
      {
        name: "slot_time",
        using: "BTREE",
        fields: [
          { name: "coach_schedule_time_id" },
        ]
      },
      {
        name: "package_book",
        using: "BTREE",
        fields: [
          { name: "package_id" },
        ]
      },
    ]
  });
};
