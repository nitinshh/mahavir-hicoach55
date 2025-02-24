const envfile = process.env;
let CryptoJS = require("crypto-js");
const helper = require("../../helpers/helper");

const { Validator } = require("node-input-validator");
const sequelize = require("sequelize");
const Op = sequelize.Op;
let jwt = require("jsonwebtoken");
const { req } = require("express");
const stripe = require("stripe")(
  envfile.stripe
);
const publish_key = envfile.publish_key
const { users, coach_schedule_days, user_sports, sports, contactus, rooms } = require("../../models");

var deletedTime = sequelize.literal("CURRENT_TIMESTAMP");

async function otp_email(otp, Username, subject, email) {

  let message = `<!DOCTYPE html>
<html>

<head>
  <title>OTP Verification - HiCoach</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link
    href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
    rel="stylesheet">
  <style>
    body {
      font-family: 'Poppins', sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }
    .header {
      background-color: #2D9CDB;
      padding: 20px;
      text-align: center;
    }
    .header img {
      width: 150px;
    }
    .content {
      padding: 40px 30px;
      text-align: center;
    }
    .content h1 {
      font-size: 24px;
      color: #333333;
      margin-bottom: 10px;
    }
    .content p {
      font-size: 16px;
      color: #555555;
      margin-bottom: 30px;
    }
    .otp-box {
      display: inline-block;
      background-color: #F0F0F0;
      padding: 15px 30px;
      font-size: 22px;
      color: #333333;
      font-weight: 600;
      letter-spacing: 3px;
      border-radius: 6px;
      margin-bottom: 40px;
    }
    .footer {
      background-color: #2D9CDB;
      padding: 20px;
      text-align: center;
      color: #ffffff;
      font-size: 14px;
    }
  </style>
</head>

<body>
  <div class="container">
    <!-- Email Header -->
    <div class="header">
      <img src="https://app.hicoach.app/app-assets/images/logo.png" alt="HiCoach Logo">
    </div>

    <!-- Email Content -->
    <div class="content">
      <h1>Hello, ${Username}!</h1>
      <p>Thank you for using HiCoach. Please use the following OTP to complete your verification:</p>
      <div class="otp-box">${otp}</div>
      <p>This OTP is valid for the next 10 minutes. Do not share this OTP with anyone.</p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>&copy; 2024 HiCoach. All rights reserved.</p>
    </div>
  </div>
</body>

</html>`;

  await helper.send_email(message, email, subject);
}

module.exports = {
  encryption: async (req, res) => {
    try {
      const v = new Validator(req.headers, {
        secret_key: "required|string",
        publish_key: "required|string",
      });

      let errorsResponse = await helper.checkValidation(v);

      if (errorsResponse) {
        return helper.error403(res, errorsResponse);
      }

      let sk_data = req.headers.secret_key;
      let pk_data = req.headers.publish_key;
      var encryptedSkBuffer = CryptoJS.AES.encrypt(
        sk_data,
        envfile.appSecretKey
      ).toString();
      var encryptedPkBuffer = CryptoJS.AES.encrypt(
        pk_data,
        envfile.appSecretKey
      ).toString();
      var decryptedSkBuffer = CryptoJS.AES.decrypt(
        encryptedSkBuffer,
        envfile.appSecretKey
      );
      var originalskText = decryptedSkBuffer.toString(CryptoJS.enc.Utf8);
      var decryptedPkBuffer = CryptoJS.AES.decrypt(
        encryptedPkBuffer,
        envfile.appSecretKey
      );
      var originalpkTextr = decryptedPkBuffer.toString(CryptoJS.enc.Utf8);

      return helper.success(res, "data", {
        encryptedSkBuffer,
        encryptedPkBuffer,
        originalskText,
        originalpkTextr,
      });
    } catch (err) {
      console.log(err, ">>>>>>>>>>");
      // return helper.error403 (res, err);
    }
  },
  exit_account: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        email: "required|email",
      });
      let errorsResponse = await helper.checkValidation(v);
      if (errorsResponse) {
        return helper.error403(res, errorsResponse);
      }
      const find_user = await users.findOne({
        where: {
          email: req.body.email,
          // role: req.body.role,
        },
      });
      if (find_user) {
        return helper.error403(res, "Email does not exist");
      }

      return helper.success(res, "Please proceed to the next step");
    } catch (error) {
      return helper.error403(res, error);
    }
  },
  signUp: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        email: "required|email",
        password: "required",
        // hourly_rate
        // role: "required",
      });
      let errorsResponse = await helper.checkValidation(v);
      if (errorsResponse) {
        return helper.error403(res, errorsResponse);
      }
      const find_user = await users.findOne({
        where: {
          email: req.body.email,
          // role: req.body.role,
        },
      });
      if (find_user) {
        return helper.error403(res, "Email already exist");
      }
      let password = CryptoJS.AES.encrypt(
        JSON.stringify(req.body.password),
        envfile.crypto_key
      ).toString();
      let time = helper.unixTimestamp();

      let otp = Math.floor(1000 + Math.random() * 9000);
      console.log(otp);
      req.body.password = password;
      req.body.login_time = time;
      req.body.otp = otp;

      const signup_user = await users.create(req.body);
      // Generate JWT token
      const token = jwt.sign(
        {
          data: {
            id: signup_user.id,
            login_time: signup_user.login_time,
          },
        },
        envfile.crypto_key
      );
      const customer = await stripe.customers.create({
        email: signup_user.email,
      });

      const stripe_id = customer.id;
      await users.update({
        stripe_id: stripe_id,
      }, {
        where: {
          id: signup_user.id,
        },
      });
      let findUser = await users.findOne({
        where: {
          id: signup_user.id,
        },
        raw: true,
      }); 

      findUser.token = token;
      await otp_email(otp, findUser.email, "One time password for email verification", findUser.email);
      if (req.body.role == 2) {
        //  >>>>>>>>>>>>>>>>>>>>>>>>>>>  coach_schedule_days   >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> //
        let days_array = [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ];
        for (let i = 0; i < days_array.length; i++) {
          var element = days_array[i];
          let data = {
            user_id: findUser.id,
            name: element,
            day: i + 1,
          };
          const coach_schedule_day = await coach_schedule_days.create(data);
        }
        //  >>>>>>>>>>>>>>>>>>>>>>>>>>>  create_sport   >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> //
        let find_sports = await sports.findAll();
        let Sport = find_sports[0].dataValues.id;
        let create_sport = await user_sports.create({
          user_id: findUser.id,
          sport_id: Sport,
        });

        // let find_admin_id = await users.findOne({
        //   where: {
        //     role: 0,
        //   },
        //   raw: true,
        //   order: [["createdAt", "DESC"]], // Order by createdAt in descending order
        // });

        // let create_room = await rooms.create({
        //   sender_id: findUser.id,
        //   receiver_id: find_admin_id.id,
        // });
      }
       let find_admin_id = await users.findOne({
          where: {
            role: 0,
          },
          raw: true,
          order: [["createdAt", "DESC"]], // Order by createdAt in descending order
        });

        let create_room = await rooms.create({
          sender_id: findUser.id,
          receiver_id: find_admin_id.id,
        });
      return helper.success(res, "User signup successfully", findUser);
    } catch (error) {
      return helper.error403(res, error);
    }
  },
  login: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        email: "required|email",
        password: "required",
        // role: "required",
        device_token: "required|string",
        device_type: "required|integer",
      });

      let errorsResponse = await helper.checkValidation(v);
      if (errorsResponse) {
        return helper.error403(res, errorsResponse);
      }

      let check_user = await users.findOne({
        where: {
          email: req.body.email,
          // role: req.body.role,
          deleted_at: null,
        },
      });
      if (!check_user) {
        return helper.error403(res, "Email does not exist", {});
      }

      if (check_user.status == 0) {
        return helper.error403(
          res,
          "Your account has been suspended by the admin. Please contact the admin for assistance."
        );
      }
      var bytes = CryptoJS.AES.decrypt(check_user.password, envfile.crypto_key);
      let Decrypt_data = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
      let isMatch = Decrypt_data == req.body.password;
      if (isMatch == true) {
        let time = helper.unixTimestamp();
        var updateuser = await users.update(
          {
            device_token: req.body.device_token,
            device_type: req.body.device_type,
            login_time: time,
          },
          {
            where: {
              id: check_user.id,
            },
          }
        );
      } else {
        return helper.error403(res, "Password not matched!");
      }
      if (!check_user.stripe_id) {
        const customer = await stripe.customers.create({
          email: check_user.email,
        });
        const stripe_id = customer.id;
        await users.update({
          stripe_id: stripe_id,
        }, {
          where: {
            id: check_user.id,
          },
        });
      }
      let find_user = await users.findOne({
        where: {
          id: check_user.id,
        },
        raw: true,
        nest: true,
      });
      let token = jwt.sign(
        {
          data: {
            id: find_user.id,
            login_time: find_user.login_time,
          },
        },
        envfile.crypto_key
      );
      find_user.token = token;
      return helper.success(res, "Login successfully.", find_user);
    } catch (err) {
      return helper.error403(res, err);
    }
  },
  account_deleted: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        user_id: "required|integer",
      });
      let errorsResponse = await helper.checkValidation(v);
      if (errorsResponse) {
        return helper.error403(res, errorsResponse);
      }
      let UserId = req.body.user_id;

      const find_user = await users.findOne({
        where: {
          id: UserId,
      
        },
        raw: true,
        nest: true,
      });
      if (find_user) {

        let User = users.update(
          { deletedAt: deletedTime },
          {
            where: {
              id: UserId,
            },
          }
        );
        let chat_rooms = await rooms.destroy(
               {
            where: {
              [Op.or]: [
                { sender_id: UserId },
                { receiver_id: UserId },
              ],
            },
          }
        );
           
        return helper.success(res, "Account deleted succesfully!");
      } else {
        return helper.error403(res, "Account not found ");
      }
    } catch (error) {
      return helper.error403(res, error);
    }
  },
  socialLogin: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        social_id: "required|string",
        social_type: "required",
      });
      let errorsResponse = await helper.checkValidation(v);
      if (errorsResponse) {
        return helper.error403(res, errorsResponse);
      }
      let find_user = await users.findOne({
        where: {
          social_id: req.body.social_id,
          social_type: req.body.social_type,
        },
        raw: true,
        nest: true,
      });
      const time = helper.unixTimestamp();
      if (find_user) {
        let updateUser = await users.update(req.body, {
          where: { id: find_user.id },
        });
        let getUsers = await users.findOne({
          where: { id: find_user.id },
          raw: true,
          nest: true,
        });
        const token = jwt.sign(
          {
            id: getUsers.id,
            login_time: time,
          },
          ENV.crypto_key
        );
        getUsers.token = token;
        getUsers.token = token;
        return helper.success(res, "User Logged In successfully ", getUsers);
      } else {
        let userCreate = await users.create({
          login_time: time,
          social_id: req.body.social_id,
          social_type: req.body.social_type,
          role: req.body.role,
        });
        let getUsers = await users.findOne({
          where: { id: userCreate.dataValues.id },
          raw: true,
          nest: true,
        });
        const token = jwt.sign(
          {
            id: getUsers.id,
            login_time: time,
          },
          ENV.crypto_key
        );
        getUsers.token = token;
        return helper.success(res, "User Logged In successfully ", getUsers);
      }
    } catch (err) {
      return helper.error403(res, err);
    }
  },
  verifyotp: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        otp: "required|integer",
      });
      let errorsResponse = await helper.checkValidation(v);
      if (errorsResponse) {
        return helper.error403(res, errorsResponse);
      }
      let User_data = await users.findOne({
        where: {
          id: req.auth.id,
        },
        raw: true,
      });

      if (req.body.otp == User_data.otp) {
      let otp = Math.floor(1000 + Math.random() * 9000);
          var updated = await users.update(
          {
            otp: otp,
            otp_verify: 1,
          },
          {
            where: {
              id: req.auth.id,
            },
          }
        );

        let find_user = await users.findOne({
          where: {
            id: req.auth.id,
          },
          raw: true,
        });

        return helper.success(res, "Otp verify successfully", find_user);
      } else {
        return helper.error403(res, " Your OTP is Not Matched !");
      }
    } catch (error) {
      return helper.error403(res, error);
    }
  },
  resendotp: async (req, res) => {
    try {
      let otp = Math.floor(1000 + Math.random() * 9000);
       const sent = await users.update(
        {
          otp: otp,
          otp_verify: 0,
        },
        {
          where: {
            id: req.auth.id,
          },
        }
      );
      const user_find = await users.findOne({
        where: {
          id: req.auth.id,
        },
        raw: true,
      });
      await otp_email(otp, user_find.email, "Resend Otp", user_find.email);
      return helper.success(res, "Otp Resend Succesfully");
    } catch (error) {
      return helper.error(res, "Otp Not Send ! ");
    }
  },
  fileUpload: async (req, res) => {
    try {
      let folder = "users";
      let fileData = null;

      if (req.files && req.files.file) {
        fileData = await helper.fileUpload(req.files.file, folder);
      } else {
        return helper.error(res, "No file uploaded");
      }

      return helper.success(res, "File uploaded successfully", {
        file: fileData,
      });
    } catch (error) {
      console.log(error);

      return helper.error(res, "Error occurred during file upload");
    }
  },
  get_stripe_keys: async (req, res) => {
    try {
 
      let stripe_secret_key = envfile.stripe; 
      let stripe_publish_key = publish_key;

      let obj = {
        stripe_secret_key,
        stripe_publish_key
      };
  
      return helper.success(res, "Stripe keys retrieved successfully", obj); // Return obj with the response
    } catch (error) {
      return helper.error403(res, error);
    }
  },
  get_admin_commission: async (req, res) => {
    try {
  let find_admin=await users.findOne({
    where:{
      role:0
    }
  })

      let obj = {
        commission:find_admin.commission,
        // per_transaction:2.9
      };
  
      return helper.success(res, "Admin commission get successfully", obj); // Return obj with the response
    } catch (error) {
      return helper.error403(res, error);
    }
  },
  change_email: async (req, res) => {
    try {
 
      const v = new Validator(req.body, {
        email: "required|email", 
      });
  
      let errorsResponse = await helper.checkValidation(v);
      if (errorsResponse) {
        return helper.error403(res, errorsResponse);
      }

      const emailExists = await users.findOne({
        where: { email: req.body.email },
        raw: true,
      });
  
      if (emailExists) {
        return helper.error403(res, "This email is already in use. Please choose a different email.");
      }

      const find_User = await users.findOne({
        where: { id: req.auth.id },
        raw: true,
        nest: true,
      });
  
      if (!find_User) {
        return helper.error403(res, "User not found");
      }

      let otp = Math.floor(1000 + Math.random() * 9000);
  
      const updateUser = await users.update(
        {
          otp: otp,
          otp_email_verify: 0,
          temporary_email: req.body.email,
        },
        { where: { id: req.auth.id } }
      );
  
      if (updateUser) {
        await otp_email(otp, req.body.email, "Otp Sent Successfully", req.body.email);
  
        return helper.success(res, "OTP sent successfully to the new email!");
      } else {
        return helper.error403(res, "Failed to update user with OTP.");
      }
  
    } catch (error) {
      return helper.error403(res, "Error occurred while sending OTP: " + error.message);
    }
  },
     
  verify_otp_email: async (req, res) => {
    try {

      const v = new Validator(req.body, {
        otp: "required",
      });
  
      let errorsResponse = await helper.checkValidation(v);
      if (errorsResponse) {
        return helper.error403(res, errorsResponse);
      }
 
      const User_data = await users.findOne({
        where: { id: req.auth.id },
        raw: true,
      });
  
      if (!User_data) {
        return helper.error403(res, "User not found");
      }

      if (req.body.otp == User_data.otp) {
 
        let newOtp = Math.floor(1000 + Math.random() * 9000);
  
        const updateUser = await users.update(
          {
            email: User_data.temporary_email, 
            otp: newOtp,
            temporary_email: '',
            otp_email_verify: 1, 
          },
          { where: { id: req.auth.id } }
        );
  
        if (updateUser) {
          let updatedUser = await users.findOne({
            where: { id: req.auth.id },
            raw: true,
          });
  
          return helper.success(res, "OTP verified successfully, email updated", {});
        } else {
          return helper.error403(res, "Failed to update user after OTP verification.");
        }
  
      } else {
        return helper.error403(res, "Your OTP does not match.");
      }
  
    } catch (error) {
      return helper.error403(res, "Error occurred during OTP verification: " + error.message);
    }
  },
  resend_otp_email: async (req, res) => {
    try {
      let otp = Math.floor(1000 + Math.random() * 9000);
       const sent = await users.update(
        {
          // temporary_email:req.body.temporary_email,
          otp: otp,
          otp_email_verify: 0,
        },
        {
          where: {
            id: req.auth.id,
          },
        }
      );
      const user_find = await users.findOne({
        where: {
          id: req.auth.id,
        },
        raw: true,
      });
            
      await otp_email(otp, user_find.temporary_email, "Resend Otp", user_find.temporary_email);
      return helper.success(res, "Otp Re-sent Succesfully");
    } catch (error) {
      return helper.error(res, "Otp Not Sent ! ");
    }
  },
  

};
