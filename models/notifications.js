const Sequelize = require("sequelize");
module.exports = function (sequelize, DataTypes) {
  return sequelize.define(
    "notifications",
    {
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      request_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      sender_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
      },
      receiver_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
      },
      notification_type: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      body: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      data: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: "",
      },
      reason: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: "",
      },
      start_time: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: "",
      },
      end_time: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: "",
      },
      date: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: "",
      },

      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
        field: "created_at",
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
        field: "updated_at",
      },
      deletedAt: {
        type: DataTypes.DATE,

        allowNull: true,
        field: "deleted_at",
      },
    },
    {
      sequelize,
      tableName: "notifications",
      timestamps: true,
      paranoid: true,
      indexes: [
        {
          name: "PRIMARY",
          unique: true,
          using: "BTREE",
          fields: [{ name: "id" }],
        },
        {
          name: "sender_co",
          using: "BTREE",
          fields: [{ name: "sender_id" }],
        },
        {
          name: "receiver_co",
          using: "BTREE",
          fields: [{ name: "receiver_id" }],
        },
      ],
    }
  );
};
