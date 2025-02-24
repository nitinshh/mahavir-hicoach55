
const path = require('path');
var uuid = require('uuid').v4;
const sequelize = require('sequelize');
let jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const db = require('../models');
var moment = require("moment");

var CryptoJS = require("crypto-js");
const user = db.users;
const bookings = db.bookings;
const AppDowntimeRecord = db.app_downtime_record;
const envfile = process.env;
const stripe = require('stripe')("sk_test_51QfIZWCrWeY7BNQOP3fkvLgxwtO2Xl0Wh1MkY9i6qqoQmGs7qkUwezP8E0sBgi8rkuqSzV2rFADaoCC1Y5I7AFJU00J2nyddoN");
// const stripe = require('stripe')(envfile.stripe);

require('dotenv').config();
var uuid = require("uuid").v4;
const { Op, fn, col } = require('sequelize');

// SMTP  DETAILS //
let auth_smtp_email = "hello@hicoach.app"
let auth_smtp_password = "SJDNdjcndvn@"
let smtp_host = 'smtpout.secureserver.net'

const admin = require('firebase-admin');
const serviceAccount = require('../helpers/hicoach-d3780-firebase-adminsdk-x6u6m-83e1f58ceb.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = {

  fileUpload: async (file, folder) => {
    if (file) {
      var extension = path.extname(file.name);
      var filename = uuid() + extension;
      file.mv(
        process.cwd() + `/public/images/${folder}/` + filename,
        function (err) {
          if (err) return err;
        }
      );
    }

    let fullpath = `/images/${folder}/` + filename
    return fullpath;
  },
  success: function (res, message, body = {}) {
    return res.status(200).json({
      success: true,
      code: 200,
      message: message,
      body: body,
    });
  },
  failed: function (res, err, body = {}) {
    let code = typeof err === "object" ? (err.code ? err.code : 400) : 400;
    let message =
      typeof err === "object" ? (err.message ? err.message : "") : err;
    res.status(code).json({
      success: false,
      code: code,
      message: message,
      body: body,
    });
  },
  error: function (res, err, body = {}) {
    let code = typeof err === "object" ? (err.code ? err.code : 400) : 400;
    let message =
      typeof err === "object" ? (err.message ? err.message : "") : err;
    res.status(code).json({
      success: false,
      code: code,
      message: message,
      body: body,
    });
  },
  checkValidation: async v => {
    var errorsResponse;
    await v.check().then(function (matched) {
      if (!matched) {
        var valdErrors = v.errors;
        var respErrors = [];
        Object.keys(valdErrors).forEach(function (key) {
          if (valdErrors && valdErrors[key] && valdErrors[key].message) {
            respErrors.push(valdErrors[key].message);
          }
        });
        // errorsResponse = respErrors.join(', ');
        errorsResponse = respErrors.length > 0 ? respErrors[0] : '';
      }
    });
    return errorsResponse;
  },
  unixTimestamp: function () {
    var time = Date.now();
    var n = time / 1000;
    return time = Math.floor(n);
  },
  error403: function (res, err) {
    let code = typeof err === 'object'
      ? err.statusCode ? err.statusCode : err.code ? err.code : 403
      : 403;
    let message = typeof err === 'object' ? err.message : err;
    res.status(code).json({
      success: false,
      message: message,
      code: code,
      body: {},
    });
  },
  error400: function (res, err) {
    let code = typeof err === 'object'
      ? err.statusCode ? err.statusCode : err.code ? err.code : 400
      : 400;
    let message = typeof err === 'object' ? err.message : err;
    res.status(code).json({
      success: false,
      message: message,
      code: code,
      body: {},
    });
  },
  verifyUser: async (req, res, next) => {
    try {
      if (!req.headers.authorization) {
        return res.status(401).json({
          success: false,
          status: 401,
          message: ' Authorization Token Missing',
        });
      } else {
        const accessToken = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(accessToken, envfile.crypto_key);

        const data = await user.findOne({
          where: {
            id: decoded.data.id,
            login_time: decoded.data.login_time
          },
          raw: true,
        });
        if (data.id == decoded.data.id) {
          req.auth = data;
        } else {
          return res.status(401).json({
            success: false,
            status: 401,
            message: 'Invalid  Authorization Token ',
          });
        }
      }
    } catch (error) {
      return res.status(401).json({
        success: false,
        status: 401,
        message: 'Invalid  Authorization Token ',
      });
    }
    return next();
  },
  verifykey: async (req, res, next) => {
    try {
      if (!req.headers.secretkey && !req.headers.publishkey) {
        return module.exports.error400(res, 'secretkey & publishkey Key not found!');
      }
      var encryptedSkBuffer = req.headers.secretkey
      var encryptedPkBuffer = req.headers.publishkey
      var decryptedSkBuffer = CryptoJS.AES.decrypt(encryptedSkBuffer, envfile.appSecretKey);
      const originalskText1 = decryptedSkBuffer.toString(CryptoJS.enc.Utf8);
      var decryptedPkBuffer = CryptoJS.AES.decrypt(encryptedPkBuffer, envfile.appSecretKey);
      const originalpkTextr2 = decryptedPkBuffer.toString(CryptoJS.enc.Utf8);

      if (
        originalskText1 !== envfile.SECRETKEY ||
        originalpkTextr2 !== envfile.PUBLISHKEY
      ) {
        return module.exports.error403(res, 'secretkey & publishkey Key not matched!');
      }
      return next();
    } catch (error) {
      console.log(error, "hhhhhhhhhhhhhhhhhhhhhhhhhhh");

      return res.status(401).json({
        success: false,
        status: 401,
        message: 'Invalid secretkey & publishkey',
      });
    }
  },
  authenticateToken: async function (req, res) {
    try {
      const token = req; // Assuming req contains the token directly

      // Decode the token using the secret key
      const decoded = jwt.verify(token, envfile.crypto_key);

      // Find the user with matching ID and login time from the token data
      const userDetails = await user.findOne({
        where: {
          id: decoded.data.id,
          login_time: decoded.data.login_time
        },
        raw: true,
      });

      // If user is found, return the user details
      if (userDetails) {
        return {
          success: true,
          user: userDetails
        };
      } else {
        return {
          success: false,
          user: null
        };
      }

    } catch (error) {
      console.log(error);
      return {
        success: false,
        user: null
      }; // Return false and no user details for any error, indicating invalid token
    }
  },
   checkMaintenance:async (req, res, next)=> {
    try {
      const currentDateTime = new Date(); 
      const currentDate = moment(currentDateTime).format('YYYY-MM-DD');
      const currentTime = moment(currentDateTime).format('HH:mm'); 

      const ongoingMaintenance = await AppDowntimeRecord.findOne({
        where: {
          status: 1, // Ongoing status
          date: currentDate,  // Date matches today
          start_time: {
            [Op.lte]: currentTime, // Start time <= current time
          },
          end_time: {
            [Op.gte]: currentTime, // End time >= current time
          },
        },
      });

      if (ongoingMaintenance) {

        return res.status(503).json({
          success: false,
          status: 503,
          message: 'Service Unavailable: The app is currently under maintenance. Please try again later.',
          maintenance: {
            start_time: ongoingMaintenance.start_time,
            end_time: ongoingMaintenance.end_time,
            date: ongoingMaintenance.date,
          },
        });
      
      } else {

        next();
      }
    } catch (error) {
      console.error('Error checking maintenance status:', error);
      res.status(500).send('An error occurred while checking maintenance status.');
    }
  },

  // EMAIL SEND ON EMAIL 
  send_email: async function (message, Email, subject) {

    var transporter = nodemailer.createTransport({
      host: smtp_host,
      port: 587,
      secure: false,
      auth: {
        user: auth_smtp_email,
        pass: auth_smtp_password,
      },
    });
    var mailOptions = {
      from: auth_smtp_email,
      to: Email,
      subject: subject,
      html: message,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(">>>>>>>>>>Error>>>>>>>>>>>>>>>>>>>>>", error);
      } else {
        console.log("Email sent: " + info.response);
      }
    });
    return transporter;
  },
  send_email_forgot: async function (message, url) {
    let reset_link = url
    html1 = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Forgot Password</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            color: #333;
            padding: 20px;
        }
        .email-container {
            background-color: #ffffff;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            max-width: 600px;
            margin: auto;
        }
        .email-header {
            text-align: center;
        }
        .email-content {
            margin: 20px 0;
        }
        .reset-link {
            display: inline-block;
            padding: 10px 20px;
            background-color: #007bff;
            color: #ffffff;
            text-decoration: none;
            border-radius: 5px;
            font-size: 16px;
        }
        .reset-link:hover {
            background-color: #0056b3;
        }
        .email-footer {
            margin-top: 30px;
            text-align: center;
            font-size: 14px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <h2>Password Reset Request</h2>
        </div>
        <div class="email-content">
            <p>Hello ${message.to},</p>
            <p>You recently requested to reset your password for your HiCoach App account. Click the button below to reset it:</p>
            <p>
                <a href="${reset_link}" class="reset-link">Reset Your Password</a>
            </p>
            <p>If you did not request a password reset, please ignore this email.</p>
        </div>
        <div class="email-footer">
            <p>Regards, <br>HiCoach</p>
        </div>
    </div>
</body>
</html>
`
    var transporter = nodemailer.createTransport({
      host: smtp_host,
      port: 587,
      secure: false,
      auth: {
        user: auth_smtp_email,
        pass: auth_smtp_password,
      },
    });
    var mailOptions = {
      from: auth_smtp_email,
      to: message.to,
      subject: message.subject,
      html: html1,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(">>>>>>>>>>Error>>>>>>>>>>>>>>>>>>>>>", error);
      } else {
        console.log("Email sent: " + info.response);
      }
    });
    return transporter;
  },
  activeUser: async function (filterValue, type) {
    const now = new Date();
    let startDate, endDate, dateFormat, groupBy, column;
    if (filterValue == 0) {
      endDate = new Date();
      startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);
      dateFormat = '%Y-%m';
      groupBy = 'month';
    } else if (filterValue == 1) {
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      dateFormat = '%Y-%m-%d';
      groupBy = 'day';
    } else if (filterValue == 2) {
      endDate = new Date();
      startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 2);
      dateFormat = '%Y';
      groupBy = 'year';
    }
    column = type == 3 ? 'user_id' : 'coach_id';
    let dates = [];
    if (filterValue == 0) {
      now.setMonth(now.getMonth() + 1);
      for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        dates.unshift(date.toISOString().slice(0, 7));
      }
    } else if (filterValue == 1) {
      for (let i = 0; i < 30; i++) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        dates.unshift(date.toISOString().slice(0, 10));
      }
    } else if (filterValue == 2) {
      const currentYear = now.getFullYear();
      dates = [currentYear - 2, currentYear - 1, currentYear];
    }
    const monthlyUserCounts = await bookings.findAll({
      attributes: [
        [fn('DATE_FORMAT', col('created_at'), dateFormat), groupBy],
        [fn('COUNT', fn('DISTINCT', col(column))), 'count'],
      ],
      where: {
        created_at: {
          [Op.gte]: startDate,
          [Op.lte]: endDate,
        },
        deletedAt: null,
      },
      group: [fn('DATE_FORMAT', col('created_at'), dateFormat)],
      order: [[fn('DATE_FORMAT', col('created_at'), dateFormat), 'ASC']],
      raw: true,
    });
    const countsMap = monthlyUserCounts.reduce((acc, row) => {
      acc[row[groupBy]] = parseInt(row.count, 10);
      return acc;
    }, {});

    return dates.map(date => ({
      dataType: date,
      count: countsMap[date] || 0,
    }));
  },
  newUser: async function (filterValue, type) {
    let result = [];
    const now = new Date();
    let startDate, endDate, dateFormat, dateRange;

    if (filterValue == 0) {  // Last 12 months
      now.setMonth(now.getMonth() + 1); // To include the current month
      dateRange = [];
      for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        dateRange.unshift(date.toISOString().slice(0, 7));  // Format as 'YYYY-MM'
      }
      startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);
      dateFormat = '%Y-%m';
    } else if (filterValue == 1) {  // Last 30 days
      dateRange = [];
      for (let i = 0; i < 30; i++) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        dateRange.unshift(date.toISOString().slice(0, 10));  // Format as 'YYYY-MM-DD'
      }
      startDate = new Date();
      startDate.setDate(now.getDate() - 30);
      dateFormat = '%Y-%m-%d';
    } else if (filterValue == 2) {  // Last 2 years
      const currentYear = now.getFullYear();
      dateRange = [currentYear - 2, currentYear - 1, currentYear];  // Last 2 years and current year
      startDate = new Date(currentYear - 2, 0, 1);
      endDate = new Date(currentYear, 11, 31, 23, 59, 59, 999);
      dateFormat = '%Y';
    }
    const userData = await user.findAll({
      attributes: [
        [fn('DATE_FORMAT', col('created_at'), dateFormat), 'date'],
        [fn('COUNT', col('id')), 'count'],
      ],
      where: {
        created_at: {
          [Op.gte]: startDate,
          [Op.lte]: endDate || new Date(),  // If no end date, use current date
        },
        role: type,
        deletedAt: null,
      },
      raw: true,
      group: [fn('DATE_FORMAT', col('created_at'), dateFormat)],
      order: [[fn('DATE_FORMAT', col('created_at'), dateFormat), 'ASC']],
    });

    const countsMap = userData.reduce((acc, row) => {
      acc[row.date] = parseInt(row.count, 10);
      return acc;
    }, {});
    result = dateRange.map(date => ({
      dataType: date,
      count: countsMap[date] || 0,
    }));

    return result;
  },
  referralUser: async function (filterValue, type) {
    let result = [];
    const now = new Date();
    let startDate, endDate, dateFormat, dateRange;

    if (filterValue == 0) {  // Last 12 months
      now.setMonth(now.getMonth() + 1); // To include the current month
      dateRange = [];
      for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        dateRange.unshift(date.toISOString().slice(0, 7));  // Format as 'YYYY-MM'
      }
      startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);
      dateFormat = '%Y-%m';
    } else if (filterValue == 1) {  // Last 30 days
      dateRange = [];
      for (let i = 0; i < 30; i++) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        dateRange.unshift(date.toISOString().slice(0, 10));  // Format as 'YYYY-MM-DD'
      }
      startDate = new Date();
      startDate.setDate(now.getDate() - 30);
      dateFormat = '%Y-%m-%d';
    } else if (filterValue == 2) {  // Last 2 years
      const currentYear = now.getFullYear();
      dateRange = [currentYear - 2, currentYear - 1, currentYear];  // Last 2 years and current year
      startDate = new Date(currentYear - 2, 0, 1);
      endDate = new Date(currentYear, 11, 31, 23, 59, 59, 999);
      dateFormat = '%Y';
    }
    const userData = await user.findAll({
      attributes: [
        [fn('DATE_FORMAT', col('created_at'), dateFormat), 'date'],
        [fn('COUNT', col('id')), 'count'],
      ],
      where: {
        created_at: {
          [Op.gte]: startDate,
          [Op.lte]: endDate || new Date(),  // If no end date, use current date
        },
        referral: {
          [Op.ne]: ""
        },
        deletedAt: null,
      },
      raw: true,
      group: [fn('DATE_FORMAT', col('created_at'), dateFormat)],
      order: [[fn('DATE_FORMAT', col('created_at'), dateFormat), 'ASC']],
    });

    const countsMap = userData.reduce((acc, row) => {
      acc[row.date] = parseInt(row.count, 10);
      return acc;
    }, {});
    result = dateRange.map(date => ({
      dataType: date,
      count: countsMap[date] || 0,
    }));

    return result;
  },
  fetchCounts: async function (role, dateFormat, startDate, endDate, groupBy, dates) {

    const activeCounts = await bookings.findAll({
      attributes: [
        [fn('DATE_FORMAT', col('created_at'), dateFormat), groupBy],
        [fn('COUNT', fn('DISTINCT', col(role === 1 ? 'user_id' : 'coach_id'))), 'count'],
      ],
      where: {
        created_at: {
          [Op.gte]: startDate,
          [Op.lte]: endDate,
        },
        deletedAt: null,
      },
      group: [fn('DATE_FORMAT', col('created_at'), dateFormat)],
      order: [[fn('DATE_FORMAT', col('created_at'), dateFormat), 'ASC']],
      raw: true,
    });

    const totalCounts = await user.findAll({
      attributes: [
        [fn('DATE_FORMAT', col('created_at'), dateFormat), 'date'],
        [fn('COUNT', col('id')), 'count'],
      ],
      where: {
        created_at: {
          [Op.gte]: startDate,
          [Op.lte]: endDate,
        },
        role,
        deletedAt: null,
      },
      group: [fn('DATE_FORMAT', col('created_at'), dateFormat)],
      order: [[fn('DATE_FORMAT', col('created_at'), dateFormat), 'ASC']],
      raw: true,
    });

    const activeMap = activeCounts.reduce((acc, row) => {
      acc[row[groupBy]] = parseInt(row.count, 10);
      return acc;
    }, {});

    const totalMap = totalCounts.reduce((acc, row) => {
      acc[row.date] = parseInt(row.count, 10);
      return acc;
    }, {});
    return dates.map((date) => ({
      date,
      active: activeMap[date] || 0,
      total: totalMap[date] || 0,
      retentionRate: totalMap[date]
        ? ((activeMap[date] || 0) / totalMap[date] * 100).toFixed(2)
        : "0.00",
    }));
  },
  sendPushNotification: async (token, noti_data) => {
    try {

      const message = {
        token: token,
        notification: {
          title: "HiCoach",
          body: noti_data.message,
        },
        data: {
          msg: noti_data.msg || "",
          title_data: noti_data.title || "", // Avoid conflict with `notification.title`
          message_data: noti_data.message || "", // Avoid conflict with `notification.body`
          msg_type: String(noti_data.msg_type || ""),
          sender_id: String(noti_data.sender_id || ""),
          sender_name: noti_data.sender_name || "",
          sender_image: noti_data.sender_image || "",
          request_id: String(noti_data.request_id || "0"),
          type: String(noti_data.type || ""),
        },
        apns: {
          payload: {
            aps: {
              sound: "push_sound",
              contentAvailable: true,
            },
          },
          headers: {
            "apns-push-type": "alert",
            "apns-priority": "10",
            "apns-topic": "hicoach-d3780", // Ensure this matches your app bundle ID
          },
        },
      };

      // Send the message
      admin
        .messaging()
        .send(message)
        .then((response) => {
          console.log("Successfully sent Push message:", response);
        })
        .catch((error) => {
          console.error("Error sending message:", error);
        });

    } catch (err) {
      console.error("Error in push notification:", err);
      return false;
    }
    return true;

  },
  //     STRIPE ALL FLOW DATA //
  create_stripe_connect_url: async function (stripe, getUser, stripeReturnUrl) {
    try {

      let account;
      let accountLink;
      let hasAccountId = 0;
      if (!getUser.stripeAccountId) {

        account = await stripe.accounts.create({
          country: "SG",
          type: "express",
          // id: getUser.id,
          email: getUser?.email,
          capabilities: {
            card_payments: {
              requested: true,
            },
            transfers: {
              requested: true,
            },
          },
        
          business_type: 'individual',
        });

        accountLink = await stripe.accountLinks.create({
          account: account?.id,
          refresh_url: stripeReturnUrl,
          return_url: stripeReturnUrl,
          type: "account_onboarding",
        });

        hasAccountId = 0;
      } else {
        account = await stripe.accounts.retrieve(getUser?.stripeAccountId);
        if (account?.charges_enabled == false) {
          accountLink = await stripe.accountLinks.create({
            account: account?.id,
            refresh_url: stripeReturnUrl,
            return_url: stripeReturnUrl,
            type: "account_onboarding",
          });
          hasAccountId = 0;
        } else {
          hasAccountId = 1;
        }
      }
      const update_user = await user.update(
        {
          stripeAccountId: account?.id,
          hasAccountId: hasAccountId,
        },
        {
          where: {
            id: getUser.id,
          },
        }
      );
      return accountLink;
    } catch (err) {
      console.log(err, "=====================TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT=================");
      throw err;
    }
  },

  stripePayment: async (amounts, user_dtails, booking, account_destinationId,payment_type) => {
    let data = '';

    if (payment_type === 1) {
      data = {
        booking_details: booking.id,
        package_id: 0
      };
    } else {
      data = {
        booking_details: 0,
        package_details: booking.id
      };
    }
    const ephemeralKey = await stripe.ephemeralKeys.create(
      {
        customer: user_dtails.stripe_id,
      },
      {
        apiVersion: "2024-12-18.acacia",
        // apiVersion: "2023-10-16",
      }
    );
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amounts * 100),
      currency: "SGD",
      customer: user_dtails.stripe_id,
      automatic_payment_methods: {
        enabled: true,
      },
   
      metadata: {
        data: JSON.stringify(data)
      },
    });
    let obj = {
      ephemeralKey: ephemeralKey,
      paymentIntent: paymentIntent,
    };

    console.log("=======obj", obj);
    return obj;
  },
  files_upload: async function (image, folderName) {
    if (image) {
      var extension = path.extname(image.name);
          var type = 0
      if (extension==".jpeg") {
        type = 1
      }
      if (extension==".png") {
        type = 1
      }
      if (extension==".jpg") {
        type = 1
      }
      if (extension == ".mp4") {
        type = 3
      }
      if (extension == ".pdf") {
        type = 4
      }
      if (extension == ".xlsx") {
        type = 5
      }
      if (extension == ".csv") {
        type = 6
      }
      if (extension == ".doc") {
        type = 7
      }
      


      var filename = uuid() + extension;
      var sampleFile = image;
      sampleFile.mv(process.cwd() + `/public/images/${folderName}/` + filename, (err) => {
        if (err) throw err;
      });
      var data = {
        type: type,
        name:filename
      }

      return data;
    }

  },

};