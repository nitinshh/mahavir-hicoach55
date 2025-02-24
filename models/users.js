const Sequelize = require('sequelize');
module.exports = function (sequelize, DataTypes) {
  return sequelize.define('users', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ""

    },
    temporary_email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ""

    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ""
    },
    image: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ""

    },
    first_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ""
    },
   
    last_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ""
    },
    full_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ""
    },
    country_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: ""
    },
   
    about_me: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: ""
    },
    hourly_rate: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue:null
    },
    cover_video: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue:null
    },
    thumbnail: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ""
    },
  
    address: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ""
    },
    latitude: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: 30.7046
    },
    longitude: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: 76.7179
    },
    address_save: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ""
    },
    latitude_save: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: 30.7046
    },
    longitude_save: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: 76.7179
    },
    commission: {
      type: DataTypes.DOUBLE(10,2),
      allowNull: false,
      defaultValue: 0
    },
 
      playing_experience: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: ""
    },
    coaching_experience: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: ""
    },
    own_courts: {
      type: DataTypes.ENUM('yes', 'no'),
      defaultValue: "no",
      allowNull: true,
    },
    willing_to_travel: {
      type: DataTypes.ENUM('yes', 'no'),
      allowNull: true,
      defaultValue: "no"
    },
    travel_time: {
      type: DataTypes.INTEGER,
      allowNull: false,
        defaultValue: 0
     
    },
    provide_balls: {
      type: DataTypes.ENUM('yes', 'no'),
      allowNull: true,
      defaultValue: "no"
    },
  
    role: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "1 for student 2 for coach 0 for admin"
    },
    notify_upcoming_classes: {
      type: DataTypes.ENUM('yes', 'no'),
      allowNull: false,
      defaultValue: "yes"
    },
    notify_transactions: {
      type: DataTypes.ENUM('yes', 'no'),
      allowNull: false,
      defaultValue: "yes"
    },
    notify_class_requests: {
      type: DataTypes.ENUM('yes', 'no'),
      allowNull: false,
      defaultValue: "yes"
    },
    notify_hotslot: {
      type: DataTypes.ENUM('yes', 'no'),
      allowNull: false,
      defaultValue: "yes"
    },
    device_type: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "1 for android 0 : ios",
      defaultValue: 1
    },
    is_verified: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "0 notvarified, 1 notvarified, 2:varified "
    },
    otp_email_verify: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "0 notvarified, 1 notvarified, 2:varified "
    },
    device_token: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "0 for inactive 1 for active",
      defaultValue: 1
    },
    otp: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 6464
    },
    refer_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    referral: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ""
    },
    otp_verify: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '0=>Not verify, 1=>verified',
      defaultValue: 0
    },
    login_time: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "FOR Token Handling",
      defaultValue: 5
    },
    wallet_amount: {
      type: DataTypes.DECIMAL(9, 2),
      allowNull: true,
      defaultValue:0.0
    },
    hashToken: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue:""
    },
    stripe_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue:""
    },
    stripeAccountId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: "",
    },
    hasAccountId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
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
    tableName: 'users',
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
        name: "sport_coach",
        using: "BTREE",
        fields: [
          { name: "sport_id" },
        ]
      },
    ]
  });
};
