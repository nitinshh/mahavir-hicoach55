const db = require("../../models");
const helper = require("../../helpers/helper");
const { Validator } = require("node-input-validator");
const sequelize = require("sequelize");
const Contactus = db.contactus;

let Contactus_Mail = "hicoach@test.com"
async function otp_email(discription, Username, subject, email) {
  console.log(discription, Username, subject, email);
  let message = `<!DOCTYPE html>
  <html>
  <head>
    <title>HiCoach</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link
      href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap"
      rel="stylesheet">
    <style>
      * {
        padding: 0;
        margin: 0;
        font-family: 'Poppins', sans-serif;
        border-collapse: collapse;
      }
    </style>
  </head>
  <body>
    <div style="width: 530px;margin: auto;">
      <div style="background: #ea9353;padding: 30px 30px;box-sizing: border-box;">  
      <table style="width: 100%;">
        <tbody><tr>
          <td>
            <div style="background: #fff;box-sizing: border-box;padding: 0;border-radius:30px;">
              <table style="width: 100%;">
                <tbody><tr>
               
                 <td style="padding: 30px 0 30px;text-align: center;">
                 <img style="width:170px" src="https://app.beyondboardsandbags.com/Logo/LOGO.png" alt="" />
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0;">
                  <div style="background: #f5f5f5; border-radius: 36px; padding: 32px 20px;">
                    <h4 style="font-size: 26px; margin-bottom: 20px; text-align: center;">Contact US</h4>
                    <p style="font-size: 16px; margin: 0 0 9px;"><strong>User Name</strong>: ${discription.name + discription.last_name}</p>
                    <p style="font-size: 16px; margin: 0 0 9px;"><strong>User Email</strong>:${discription.email}</p>
                    <p style="font-size: 16px; margin: 0 0 9px;"><strong>Discription</strong></p>
                    <p style="font-size: 14px">${discription.content}</p>
                  </div>
                  </td>
                </tr>
              </tbody></table>
            </div>
          </td>
        </tr>
      </tbody></table>      
    </div>
    </div>
  </body>
  </html>`;

  await helper.send_email(message, email, subject);
}
module.exports = {
  contactus: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        first_name: "required",
        last_name: "required",
        email: "required",
        content: "required",
      });
      let errorsResponse = await helper.checkValidation(v);
      if (errorsResponse) {
        return helper.error403(res, errorsResponse);
      }
      req.body.user_id = req.auth.id
      const Contact = await Contactus.create(req.body);

      let find_contactus = await Contactus.findOne({
        where: {
          id: Contact.dataValues.id,
        },
        raw: true,
      });
      // await otp_email(find_contactus, find_contactus.email, "Contact Us", Contactus_Mail);

      if (Contact) {
        return helper.success(
          res,
          " Contactus Get Succesfully ",
          find_contactus
        );
      }
    } catch (error) {
      return helper.error403(res, error);
    }
  },
  contactUslisting: async (req, res) => {
    try {
     
        const find_contactus = await Contactus.findAll({
            where: {
                deletedAt: null,
            }
        })

        if (find_contactus) {
          return helper.success(
            res,
            " Contactus Get Succesfully ",
            find_contactus[0]
          );
        }
    } catch (error) {
        return helper.error(res, error)
    }
},
};
