const db = require("../../models");
const envfile = process.env;
let CryptoJS = require("crypto-js");
const cron = require('node-cron');
const crypto = require('crypto');
const helper = require("../../helpers/helper");
const { Validator } = require("node-input-validator");
const sequelize = require("sequelize");
const { Op } = require("sequelize"); 

let deletedTime = sequelize.literal("CURRENT_TIMESTAMP");
const stripe = require("stripe")(
  envfile.stripe
);
const { users, user_cerificates, user_languages, packages, user_sports, sports, selected_age_groups, user_saved_coahces, bookings, user_packages } = require("../../models");

const stripeReturnUrl = "https://app.hicoach.app/Api/stripe_connect";
// const stripeReturnUrl = "http://localhost:1414/Api/stripe_connect";
users.hasMany(selected_age_groups, {
  foreignKey: "user_id",
  as: "age_groups",
});

user_saved_coahces.belongsTo(users, {
  foreignKey: "coach_id",
  as: "coach",
});
packages.belongsTo(users, {
  foreignKey: "user_id",
  as: "coachName",
});
user_packages.belongsTo(packages, {
  foreignKey: "package_id",
  as: "packageName",
});

function getCurrentDateFormatted() {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
  const year = today.getFullYear();
  return `${day}/${month}/${year}`;
}
cron.schedule("0 3 * * *", async function () {
  try {

    let find_package = await user_packages.findAll({
      where: {
        expired_date: {
          [Op.lt]: new Date() 
        },
      },
      raw: true,
    });

    for (let package of find_package) {
      let ndata = {
        msg: `Your package has expired`,
        title: "HiCoach",
        request_id: package.id,
        message: `Your package has expired`,
        sender_image: ``,
        sender_id: ``,
        sender_name: `Admin`,
        type: 10,
      };

      let find_user = await users.findOne({
        where: {
          id: package.user_id,
        },
        raw: true,
      });

      if (find_user.notify_class_requests == "yes") {

        await helper.sendPushNotification(find_user.device_token, ndata);
      } else {
        console.log(`Notification turned off for user_id: ${find_user.id}`);
      }

      await user_packages.destroy({
        where: {
          id: package.id,
        },
      });
      console.log(`Expired package with id ${package.id} has been deleted.`);
    }
  } catch (error) {
    console.error('Error in cron job:', error);
  }
});

module.exports = {

  stripe_connect: async (req, res) => {
    try {
      let hasAccountId;
      let state = req.query.state;
      const userData = await users.findOne({
        where: {
          id: state,
        },
        raw: true,
      });
      const responseData = await stripe.accounts.retrieve(
        userData.stripeAccountId
      );

      if (responseData?.charges_enabled == false) {
        hasAccountId = 0;
      } else {
        hasAccountId = 1;
      }
      await users.update(
        {
          stripeAccountId: responseData?.id,
          hasAccountId: hasAccountId,
        },
        {
          where: {
            id: state,
          },
        }
      );
      const update_user = await users.findOne({
        where: {
          id: state,
        },
        raw: true,
      });
      return
      // return res.send("Success")
      // if (responseData?.charges_enabled == true) {
      //   return res.render("stripeurl", {
      //     msg: req.flash("msg"),
      //     update_user,
      //   });
      // } else {
      //   console.log("==========================");
      //   return res.render("cancelurl", {
      //     msg: req.flash("msg"),
      //   });
      // }
    } catch (err) {
      console.log(err, "============================");
      return res.send("Error during add account ")
      // return res.render("cancelurl", { msg: req.flash("msg") });
    }
  },
  stripe_connect_return: async (req, res) => {
    try {
      let hasAccountId;
      let state = req.auth.id;
      const userData = await users.findOne({
        where: {
          id: state,
        },
        raw: true,
      });
      const responseData = await stripe.accounts.retrieve(
        userData.stripeAccountId
      );
      if (responseData?.charges_enabled == false) {
        hasAccountId = 0;
      } else {
        hasAccountId = 1;
      }
      await users.update(
        {
          stripeAccountId: responseData?.id,
          hasAccountId: hasAccountId,
        },
        {
          where: {
            id: state,
          },
        }
      );
      const update_user = await users.findOne({
        where: {
          id: state,
        },
        raw: true,
      });
      return helper.success(
        res,
        "successfully retrieved",
        {}
      );

    } catch (err) {
      return res.send("Error during add account ")
    }
  },
  editprofile: async (req, res) => {
    try {

      let folder = "users";
      if (req.files && req.files.image) {
        let images = await helper.fileUpload(req.files.image, folder);
        req.body.image = images;
      }
      if (req.files && req.files.thumbnail) {
        let thumbnails = await helper.fileUpload(req.files.thumbnail, folder);
        req.body.thumbnail = thumbnails;
      }
      if (req.files && req.files.cover_video) {
        let videos = await helper.fileUpload(req.files.cover_video, folder);
        req.body.cover_video = videos;
      }
   
      const firstName = req.body.first_name || '';
      const lastName = req.body.last_name || '';
      const full_name = `${firstName.trim()} ${lastName.trim()}`.trim();
      
      req.body.full_name = full_name;
      const update = await users.update(req.body, {
        where: {
          id: req.auth.id,
        },
        raw: true,
      });
      let updateduser = await users.findOne({
        where: {
          id: req.auth.id,
        },
        raw: true,
        nest: true,
      });
      updateduser.password = undefined;
      //  >>>>>>>>>>>>>>>>>>>>>>>>>>>  language  >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> //
      if (req.body.language) {
        const Language_destroy = await user_languages.destroy({
          where: {
            user_id: req.auth.id,
          },
        });
        // console.log((req.body.language).split(','),">>>>>>>");
        // return
        let Language = req.body.language.split(",");
        Promise.all(
          Language.map(async (lng) => {
            let data_lng = {
              user_id: updateduser.id,
              language: lng,
            };
            const userdelete = await user_languages.create(data_lng);
          })
        );
      }
      //  >>>>>>>>>>>>>>>>>>>>>>>>>>>  document  >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> //
      if (req.files && req.files.document) {
        let documentImages = Array.isArray(req.files.document)
          ? req.files.document
          : [req.files.document];

        Promise.all(
          documentImages.map(async (doc) => {
            let doc_img = await helper.fileUpload(doc, folder);
            let doc_data = {
              user_id: updateduser.id,
              document: doc_img,
            };
            const userdelete = await user_cerificates.create(doc_data);
          })
        );
      }
      if (req.body.age_group) {
        await selected_age_groups.destroy({
          where: {
            user_id: req.auth.id,
          },
        });
        // Check if req.body.age_group is a string, and split it into an array
        if (typeof req.body.age_group === "string") {
          req.body.age_group = req.body.age_group
            .split(",")
            .map((e) => e.trim()); // Split and trim any extra spaces
        }
        // Create an array of objects based on age groups
        const obj = req.body.age_group.map((e) => ({
          user_id: req.auth.id,
          age: e,
        }));
        // Bulk create the age groups
        const createAgeGroups = await selected_age_groups.bulkCreate(obj);
      }

      return helper.success(res, "Profile Updated Succesfully", updateduser);
    }
    catch (error) {
      return helper.error403(res, error);
    }
  },
  getprofile: async (req, res) => {
    try {
      const profile = await users.findOne({
        attributes: [

          [
            sequelize.literal(
              `COALESCE((SELECT AVG(rating) FROM rating_reviews WHERE rating_reviews.coach_id = users.id), 0)`
            ),
            "avg_rating",
          ],

          [
            sequelize.literal(
              `COALESCE((SELECT COUNT(*) FROM rating_reviews WHERE rating_reviews.coach_id = users.id), 0)`
            ),
            "rating_count",
          ],

          [
            sequelize.literal(
              `COALESCE(
                                (SELECT COUNT(*) 
                                 FROM bookings 
                                 WHERE bookings.coach_id = ${req.auth.id}
                                 AND bookings.is_reccuring = 2 
                                 AND bookings.booking_status IN (1, 2) 
                                 AND bookings.deleted_at IS NULL), 0)` 
            ),
            "recurringClass", 
          ],

          [
            sequelize.literal(
              `COALESCE((SELECT COUNT(*) FROM packages WHERE packages.user_id = users.id), 0)`
            ),
            "packages",
          ],

          [
            sequelize.literal(
              `COALESCE(
                                (SELECT COUNT(DISTINCT users.id) 
                                 FROM users 
                                 INNER JOIN bookings ON bookings.user_id = users.id 
                                 WHERE bookings.coach_id = ${req.auth.id}
                                 AND users.role = 1 
                                 AND bookings.deleted_at IS NULL), 0)` // Ensure bookings are not soft-deleted
            ),
            "students", // Alias for the count of unique students (role = 1)
          ],

          [
            sequelize.literal(
              `COALESCE(
                                (SELECT COUNT(*) 
                                 FROM coach_schedule_times 
                                 WHERE coach_schedule_times.user_id = users.id AND
                               coach_schedule_times.deleted_at IS NULL), 0)`
            ),
            "schedule_count", // Alias for the count of upcoming schedules
          ],
          [
            sequelize.literal(
              `COALESCE((SELECT COUNT(*) FROM user_saved_coahces WHERE user_saved_coahces.user_id = users.id), 0)`
            ),
            "save_coach_s",
          ],
          [
            sequelize.literal(
              `COALESCE(
                                (SELECT COUNT(*) 
                                 FROM bookings 
                                 WHERE bookings.user_id = ${req.auth.id}
                                 AND bookings.is_reccuring = 2
                                 AND bookings.booking_status IN (1, 2) 
                                 AND bookings.deleted_at IS NULL), 0)` // Ensures valid booking statuses and no soft deletes
            ),
            "recurring_class_s", // Alias for the count of recurring bookings
          ],
          [
            sequelize.literal(
              `COALESCE((SELECT COUNT(*) FROM user_packages WHERE user_packages.user_id = users.id), 0)`
            ),
            "packages_s",
          ],

          // Standard user attributes
          "id",
          "first_name",
          "last_name",
          "email",
          "image",
          "about_me",
          "hourly_rate",
          "cover_video",
          "thumbnail",
          "is_verified",
          "provide_balls",
          "address",
          "latitude",
          "longitude",
          "address_save",
          "latitude_save",
          "longitude_save",
          "travel_time",
          "own_courts",
          "playing_experience",
          "coaching_experience",
          "willing_to_travel",
          "commission",
          "stripe_id", "stripeAccountId", "hasAccountId",
        ],
        include: [
          // Package details for the user (coach)
          {
            model: packages,
            as: "package_details",
            required: false,
          },
          // Language details
          {
            model: user_languages,
            as: "language_details",
            required: false,
            where: {
              deletedAt: null,
            },
          },
          // Certificates details
          {
            model: user_cerificates,
            as: "cerificates_details",
            required: false,
            where: {
              deletedAt: null,
            },
          },
          // Age group details
          {
            model: selected_age_groups,
            as: "age_groups",
          },
          // Sports and user-sports relationship
          {
            model: user_sports,
            as: "user_sports_details",
            required: false,
            include: [
              {
                model: sports,
                as: "sports_details",
              },
            ],
          },
        ],
        where: {
          id: req.auth.id, // Current logged-in user (coach)
        },
      });

      // Return success response with profile data
      return helper.success(res, "User Profile Get Successfully", profile);
    } catch (error) {
      // Return error response in case of failure
      return helper.error403(res, error);
    }
  },

  changepassword: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        oldpassword: "required",
        newpassword: "required",
      });

      let errorsResponse = await helper.checkValidation(v);
      if (errorsResponse) {
        return helper.error403(res, errorsResponse);
      }

      const find_User = await users.findOne({
        where: {
          id: req.auth.id,
        },
        raw: true,
        nest: true,
      });
      var User_password = CryptoJS.AES.decrypt(
        find_User.password,
        envfile.crypto_key
      );
      var get_password = User_password.toString(CryptoJS.enc.Utf8);
      var compare = get_password == JSON.stringify(req.body.oldpassword);
      if (compare == false) {
        return helper.error403(
          res,
          "Old password is wrong! Please enter valid password"
        );
      } else {
        let Password_encrypt = CryptoJS.AES.encrypt(
          JSON.stringify(req.body.newpassword),
          envfile.crypto_key
        ).toString();
        const update = await users.update(
          {
            password: Password_encrypt,
          },
          {
            where: {
              id: req.auth.id,
            },
          }
        );
      }
      return helper.success(res, "Password Updated Is Succesfully !");
    } catch (error) {
      return helper.error403(res, error);
    }
  },
  passwordforget: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        email: "required",
      });
      let errorsResponse = await helper.checkValidation(v);
      if (errorsResponse) {
        return helper.error403(res, errorsResponse);
      }

      const find_email = await users.findOne({
        where: {
          email: req.body.email,
        },
        raw: true,
      });

      if (find_email == null) {
        return helper.error403(res, "This Email Is Not Registered");
      } else {
        // Use a consistent hash (like SHA256) for the token
        let token = crypto.createHash('sha256').update(find_email.email + Date.now()).digest('hex');

        const update = await users.update(
          {
            hashToken: token,
          },
          {
            where: {
              email: find_email.email,
            },
          }
        );

        let getUrl = `${req.protocol}://${req.get("host")}/admin/resetpassword?token=${token}`;

        let forgot_password_html = getUrl;

        let mail = {
          from: "hello@hicoach.app",
          to: req.body.email,
          subject: "HiCoach | HiCoach Password Link",
          html: forgot_password_html,
        };

        helper.send_email_forgot(mail, forgot_password_html);

        return helper.success(res, "Email Sent Successfully", {
          url: getUrl,
        });
      }
    } catch (error) {
      console.log(error);
    }
  },

  resetpassword: async (req, res) => {
    try {

      const findUser = await users.findOne({
        where: {
          hashToken: req.query.token,  // Compare the token here
        },
        raw: true,
      });
      if (findUser) {
        res.render("Admin/reset_password", { findUser });
      } else {
        res.render("Admin/session_expire");
      }
    } catch (error) {
      console.log(error, "error-----------------------");
    }
  },
  reset_password_post: async function (req, res) {
    try {

      const findUser = await db.users.findOne({
        where: {
          id: req.body.id,
        },
      });
      if (findUser) {
        let time = helper.unixTimestamp();

        let plainpassword = req.body.password
        let encryptpassword = CryptoJS.AES.encrypt(
          JSON.stringify(plainpassword),
          envfile.crypto_key
        ).toString();

        await db.users.update(
          { password: encryptpassword, hashToken: time },
          {
            where: {
              id: findUser.id,
            },
          }
        );

        res.render("Admin/success_page");
      } else {
        res.render("Admin/session_expire");
      }
    } catch (err) {
      helper.failed(res, err);
    }
  },
  allCoach: async (req, res) => {
    try {
      // Set default page and pageSize values if not provided in the query
      let page = parseInt(req.query.page) || 1;
      let pageSize = parseInt(req.query.pageSize) || 10;

      // Calculate offset for pagination
      let offset = (page - 1) * pageSize;

      // Build the where clause based on the type
      let where;
      if (req.query.type == 1) {
        where = {
          deletedAt: null,
          role: 2,
          willing_to_travel: "yes",
        };
      } else if (req.query.type == 2) {
        where = {
          deletedAt: null,
          role: 2,
          willing_to_travel: "no",
        };
      } else {
        where = {
          deletedAt: null,
          role: 2,
        };
      }

      // Fetch coaches with pagination
      let find_coach = await users.findAndCountAll({
        where: where,
        limit: pageSize,
        offset: offset,
      });

      // Structure response with pagination details
      let response = {
        totalItems: find_coach.count,
        totalPages: Math.ceil(find_coach.count / pageSize),
        currentPage: page,
        coaches: find_coach.rows,
      };

      return helper.success(
        res,
        "All coaches successfully retrieved",
        response
      );
    } catch (error) {
      console.log(error, ">>>>>>>>>>ERROR >>>>");
      return helper.error403(res, error);
    }
  },

  near_by_coach: async (req, res) => {
    try {
      let whereas = {
        deletedAt: null,
        role: 2,
        hasAccountId:1
      };

      if (req.body.searchKey) {
        whereas = {
          ...whereas,
          [Op.or]: [
            { full_name: { [Op.like]: `%${req.body.searchKey}%` } },
            { email: { [Op.like]: `%${req.body.searchKey}%` } },
          ],
          country_code:req.auth.country_code
        };
      }
   
      if (req.body.is_verified) {
        whereas.is_verified =
          req.body.is_verified == 1 ? 2 : { [Op.or]: [0, 1, 2] };
      }

      let order = [];
      let find_coach;

      const hasValidCoordinates =
        req.body.latitude && req.body.longitude && req.body.latitude !== 0 && req.body.longitude !== 0;

      if (hasValidCoordinates) {

        if (req.body.price) {
          order.push(["hourly_rate", "DESC"]); 
        } else {
          order.push([
            sequelize.literal(`
              3959 * acos(
              cos(radians(${req.body.latitude})) *
              cos(radians(users.latitude)) *
              cos(radians(${req.body.longitude}) - radians(users.longitude)) +
              sin(radians(${req.body.latitude})) *
              sin(radians(users.latitude))
              )
            `),
            "ASC",
          ]); 
        }

        find_coach = await db.users.findAll({
          attributes: [
            "id",
            "role",
            "email",
            "image",
            "first_name",
            "last_name",
            "about_me",
            "hourly_rate",
            "cover_video",
            "address",
            "latitude",
            "longitude",
            "own_courts",
            "willing_to_travel",
            "provide_balls",
            "notify_upcoming_classes",
            "notify_transactions",
            "wallet_amount",
            "commission",
            "is_verified",
            "playing_experience",
            "coaching_experience",
            [
              sequelize.literal(`
                3959 * acos(
                  cos(radians(${req.body.latitude})) *
                  cos(radians(users.latitude)) *
                  cos(radians(${req.body.longitude}) - radians(users.longitude)) +
                  sin(radians(${req.body.latitude})) *
                  sin(radians(users.latitude))
                )
              `),
              "distance",
            ],
            [
              sequelize.literal(
                `COALESCE((SELECT AVG(rating) FROM rating_reviews WHERE rating_reviews.coach_id = users.id), 0)`
              ),
              "avg_rating",
            ],
            [
              sequelize.literal(
                `COALESCE((SELECT COUNT(*) FROM rating_reviews WHERE rating_reviews.coach_id = users.id), 0)`
              ),
              "rating_count",
            ],
            [
              sequelize.literal(
                `COALESCE((SELECT COUNT(*) FROM user_saved_coahces WHERE user_saved_coahces.coach_id = users.id AND user_saved_coahces.user_id=${req.auth.id}), 0)`
              ),
              "is_save",
            ],
            [
              sequelize.literal(
                `COALESCE((SELECT COUNT(*) FROM coach_schedule_times WHERE coach_schedule_times.user_id = users.id), 0)`
              ),
              "is_schedule",
            ],
          ],
          where: {
            ...whereas,
            ...(req.body.hourly_rate && {
              hourly_rate: { [Op.lte]: req.body.hourly_rate },
            }),
          },
          having: sequelize.literal(`
            distance <= ${req.body.miles || 50} 
            AND is_schedule > 0
          `), 
          order: order,
        });
      } else {
      
        find_coach = await db.users.findAll({
          attributes: [
            "id",
            "role",
            "email",
            "image",
            "first_name",
            "last_name",
            "about_me",
            "hourly_rate",
            "cover_video",
            "address",
            "latitude",
            "longitude",
            "own_courts",
            "willing_to_travel",
            "provide_balls",
            "notify_upcoming_classes",
            "notify_transactions",
            "wallet_amount",
            "commission",
            "is_verified",
            "playing_experience",
            "coaching_experience",
            [
              sequelize.literal(
                `COALESCE((SELECT AVG(rating) FROM rating_reviews WHERE rating_reviews.coach_id = users.id), 0)`
              ),
              "avg_rating",
            ],
            [
              sequelize.literal(
                `COALESCE((SELECT COUNT(*) FROM rating_reviews WHERE rating_reviews.coach_id = users.id), 0)`
              ),
              "rating_count",
            ],
            [
              sequelize.literal(
                `COALESCE((SELECT COUNT(*) FROM user_saved_coahces WHERE user_saved_coahces.coach_id = users.id AND user_saved_coahces.user_id=${req.auth.id}), 0)`
              ),
              "is_save",
            ],
            [
              sequelize.literal(
                `COALESCE((SELECT COUNT(*) FROM coach_schedule_times WHERE coach_schedule_times.user_id = users.id), 0)`
              ),
              "is_schedule",
            ],
          ],
          where: {
            ...whereas,
            ...(req.body.hourly_rate && {
              hourly_rate: { [Op.lte]: req.body.hourly_rate },
            }),
          },
          order: [["first_name", "ASC"]], 
        });
      }

      return helper.success(res, "Coaches retrieved successfully", find_coach);
    } catch (error) {
      console.log("Error in near_by_coach:", error);
      return helper.error403(res, error.message);
    }
  },

  coach_details: async (req, res) => {
    try {
      const profile = await users.findOne({
        attributes: [
          [
            sequelize.literal(
              `COALESCE((SELECT AVG(rating) FROM rating_reviews WHERE rating_reviews.coach_id = users.id), 0)`
            ),
            "avg_rating",
          ],
          [
            sequelize.literal(
              `COALESCE((SELECT COUNT(*) FROM user_saved_coahces WHERE user_saved_coahces.coach_id = users.id AND user_saved_coahces.user_id=${req.auth.id}), 0)`
            ),
            "is_save",
          ],

          [
            sequelize.literal(
              `COALESCE((SELECT COUNT(*) FROM rating_reviews WHERE rating_reviews.coach_id = users.id), 0)`
            ),
            "rating_count",
          ],
          "id",
          "first_name",
          "last_name",
          "email",
          "image",
          "about_me",
          "hourly_rate",
          "cover_video",
          "thumbnail",
          "is_verified",
          "provide_balls",
          "address",
          "latitude",
          "longitude",
          "own_courts",
          "playing_experience",
          "coaching_experience",
          "willing_to_travel",
          "commission", // Add more attributes as needed
        ],
        include: [
          {
            model: packages,
            as: "package_details",
            required: false,
          },
          {
            model: user_languages,
            as: "language_details",
            required: false,
            where: {
              deletedAt: null,
            },
          },
          {
            model: user_cerificates,
            as: "cerificates_details",
            required: false,
            where: {
              deletedAt: null,
            },
          },
          {
            model: selected_age_groups,
            as: "age_groups",
            required: false, // Assuming this should be optional
          },
          {
            model: user_sports,
            as: "user_sports_details",
            required: false,
            include: [
              {
                model: sports,
                as: "sports_details",
                required: false,
              },
            ],
          },
        ],

        where: {
          id: req.body.coach_id,
        },
      });
      return helper.success(res, "Coach Profile Get Successfully", profile);
    } catch (error) {
      console.log(error);

      // return helper.error403(res, error.message);
    }
  },
  user_saved_coaches: async (req, res) => {
    try {
      // Check if the coach exists
      const get_coach = await users.findOne({
        where: {
          id: req.body.coach_id,
        },
      });

      if (!get_coach) {
        return helper.error403(res, "Coach not found");
      }

      // Check if the coach is already saved by the user
      let find_already_fav = await user_saved_coahces.findOne({
        where: {
          user_id: req.auth.id,
          coach_id: req.body.coach_id,
        },
      });

      // If the status is 1 (add to favorites)
      if (req.body.status == 1) {
        if (!find_already_fav) {
          // Add the coach to favorites if not already saved
          let add_fav = await user_saved_coahces.create({
            user_id: req.auth.id,
            coach_id: req.body.coach_id,
          });
        }
      } else if (req.body.status == 0) {
        // If the status is 0 (remove from favorites), delete the entry
        if (find_already_fav) {
          await user_saved_coahces.destroy({
            where: {
              user_id: req.auth.id,
              coach_id: req.body.coach_id,
            },
          });
        }
      }

      return helper.success(res, "Coach profile updated successfully.");
    } catch (error) {
      return helper.error403(res, error.message);
    }
  },
  get_save_coaches: async (req, res) => {
    try {
      const { page = 1, limit = 10, searchKey = "", miles } = req.query; // Added miles to query parameters
      const offset = (page - 1) * limit;


      let latitude = req.body?.latitude == undefined ? 0 : req.body?.latitude
      let longitude = req.body?.longitude == undefined ? 0 : req.body?.longitude

      // const distanceCalculation = sequelize.literal(`
      //   3959 * acos(
      //     cos(radians(${latitude})) *
      //     cos(radians(coach.latitude)) *
      //     cos(radians(${longitude}) - radians(coach.longitude)) +
      //     sin(radians(${latitude})) *
      //     sin(radians(coach.latitude))
      //   )
      // `);


      const coachSearchFilters = {
        [Op.or]: [
          { first_name: { [Op.like]: `%${searchKey}%` } },
          { last_name: { [Op.like]: `%${searchKey}%` } },
        ],
      };

      // if (miles) {
      //   coachSearchFilters[Op.and] = [
      //     sequelize.where(distanceCalculation, { [Op.lte]: miles }), 
      //   ];
      // }



      if (latitude !== 0 && longitude !== 0) {
        ordered = [[sequelize.literal("distance"), "ASC"]]
      } else {
        ordered = {
        }
      }

      const { count, rows: fav_coaches } = await user_saved_coahces.findAndCountAll({
        where: {
          user_id: req.auth.id,
        },
        include: [
          {
            model: users,
            as: "coach",
            attributes: [
              "id",
              "role",
              "email",
              "image",
              "first_name",
              "last_name",
              "about_me",
              "hourly_rate",
              "cover_video",
              "address",
              "latitude",
              "longitude",
              "own_courts",
              "willing_to_travel",
              "provide_balls",
              "notify_upcoming_classes",
              "notify_transactions",
              "wallet_amount",
              "commission",
              "is_verified",
              "playing_experience",
              "coaching_experience",
              [sequelize.literal(`
                3959 * acos(
                  cos(radians(${latitude})) *
                  cos(radians(coach.latitude)) *
                  cos(radians(${longitude}) - radians(coach.longitude)) +
                  sin(radians(${latitude})) *
                  sin(radians(coach.latitude))
                )
              `), 'distance']

            ],
            where: coachSearchFilters,
            order: ordered,

          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),

      });

      // Check if any favorite coaches exist
      if (!fav_coaches.length) {
        return helper.success(res, "No favorite coaches found", {});
      }

      // Return the list of favorite coaches with pagination metadata
      const totalPages = Math.ceil(count / limit);
      return helper.success(res, "Favorite coaches retrieved successfully", {
        coaches: fav_coaches,
        currentPage: parseInt(page),
        totalPages: totalPages,
        totalCoaches: count,
      });
    } catch (error) {
      return helper.error403(res, error.message);
    }
  },
  user_package: async (req, res) => {
    try {
      // Get pagination parameters from request query (default: page 1, limit 10)
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      // Find all bookings for the current user with pagination
      let packageList = await user_packages.findAndCountAll({
        include: [
          {
            model: packages,
            as: "packageName",
            include: [
              {
                model: users,
                as: "coachName",
              },
            ],
          },
        ],
        where: {
          user_id: req.auth.id,
        },
        limit: limit, // Set limit for pagination
        offset: offset, // Set offset for pagination
      });

      // Calculate total pages
      const totalPages = Math.ceil(packageList.count / limit);

      // Return paginated response
      return helper.success(res, "Package list retrieved successfully", {
        data: packageList.rows,
        currentPage: page,
        totalPages: totalPages,
        totalItems: packageList.count,
      });
    } catch (error) {
      // Return error response if something goes wrong
      return helper.error403(res, error.message || error);
    }
  },
  delete_cerificate: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        id: "required",
      });
      let errorsResponse = await helper.checkValidation(v);
      if (errorsResponse) {
        return helper.error403(res, errorsResponse);
      }
      let Id = req.body.id;
      let find_coach = await user_cerificates.update(
        { deletedAt: deletedTime },
        {
          where: {
            id: Id,
          },
        }
      );
      return helper.success(res, "Cerificate deleted Succesfully");
    } catch (error) {
      return helper.error403(res, error);
    }
  },
  logout: async (req, res) => {
    try {
      let time = helper.unixTimestamp();
      const logout = await users.update(
        {
          login_time: time,
          device_token: ""
        },
        {
          where: {
            id: req.auth.id,
          },
        }
      );
      return helper.success(res, "Logout Successfully");
    } catch (error) {
      return helper.error403(res, error);
    }
  },
  purchase_package: async (req, res) => {
    try {
      // Validate the request body
      const v = new Validator(req.body, {
        package_id: "required", // Ensure package_id is provided
      });
      let errorsResponse = await helper.checkValidation(v);
      if (errorsResponse) {
        return helper.error403(res, errorsResponse);
      }

      let find_package = await packages.findOne({
        where: {
          id: req.body.package_id,
        },
        raw: true,
      });

      if (!find_package) {
        return helper.error403(res, "Package not found");
      }

      let already_bought = await user_packages.findOne({
        where: {
          package_id: req.body.package_id,
          user_id: req.auth.id,
          coach_id: find_package.user_id
        },
        raw: true,
      });

      if (already_bought) {
        if (already_bought.credits == 0) {
          // Calculate the expiry date (6 months from now)
          let expired_date = new Date();
          expired_date.setMonth(expired_date.getMonth() + 6);
          let formattedDate = expired_date.toLocaleDateString("en-GB"); // Format the date as "DD-MM-YYYY"

          await user_packages.update(
            {
              credits: find_package.number_of_hours || 10, // Assuming credits come from the package
              expired_date: formattedDate,
              status: 1,
            },
            {
              where: {
                id: already_bought.id,
              },
            }
          );

          let updated_data = await user_packages.findOne({
            where: { id: already_bought.id },
            raw: true,
          });

          return helper.success(
            res,
            "Package renewed successfully",
            updated_data
          );
        } else {
          return helper.success(
            res,
            "Package already purchased",
            already_bought
          );
        }
      } else {

        let expired_date = new Date();
        expired_date.setMonth(expired_date.getMonth() + 6);
        let formattedDate = expired_date.toLocaleDateString("en-GB"); // Format the date as "DD-MM-YYYY"

        let add_package = await user_packages.create({
          user_id: req.auth.id,
          package_id: req.body.package_id,
          credits: find_package.number_of_hours || 10,
          expired_date: formattedDate,
          status: 1,
        });

        let find_data = await user_packages.findOne({
          where: {
            id: add_package.id,
          },
          raw: true,
        });

        return helper.success(res, "Package purchased successfully", find_data);
      }
    } catch (error) {
      return helper.error403(res, error.message);
    }
  },
  travelling_time: async (req, res) => {
    try {
      // Handle image upload if provided

      const update = await users.update(req.body, {
        where: {
          id: req.auth.id,
        },
        raw: true,
      });
      let updateduser = await users.findOne({
        where: {
          id: req.auth.id,
        },
        raw: true,
        nest: true,
      });
      updateduser.password = undefined;

      return helper.success(res, "Profile Updated Succesfully", updateduser);
    } catch (error) {
      return helper.error403(res, error);
    }
  },
  verify_request_to_admin: async (req, res) => {
    try {
      let find_user = await users.findOne({
        where: {
          id: req.auth.id,
        },
        raw: true,
        nest: true,
      });

      if (!find_user) {
        return helper.error403(res, "User not found");
      }

      if (find_user.is_verified === 1) {
        return helper.success(res, "Request already sent to Admin", find_user);
      }

      if (find_user.is_verified === 2) {
        return helper.success(
          res,
          "Your profile is already verified",
          find_user
        );
      }

      if (find_user.is_verified === 0) {
        await users.update(
          { is_verified: 1 },
          {
            where: { id: req.auth.id },
          }
        );

        let updated_user = await users.findOne({
          where: {
            id: req.auth.id,
          },
          raw: true,
          nest: true,
        });

        return helper.success(res, "Request sent successfully", updated_user);
      }
    } catch (error) {
      return helper.error403(
        res,
        "An error occurred while processing the request",
        error
      );
    }
  },
  account_link: async (req, res) => {
    try {
      const user1 = await users.findOne({
        where: { id: req.auth.id },
        raw: true
      });
      if (user1.role == 2 && user1.hasAccountId == 0) {
        console.log("add account ");

        const accountLink = await helper.create_stripe_connect_url(
          stripe,
          user1,
          stripeReturnUrl + `?state=${user1.id}`
        );
        return helper.success(
          res,
          "Please add stripe account first",
          accountLink
        );
      } else {
        if (user1) {
          return helper.error403(res, "account already added");
        }
      }
    } catch (error) {
      console.log(error);
      return helper.error403(
        res,
        "An error occurred while processing the request",
        error
      );

    }
  },
  save_loaction: async (req, res) => {
    try {
      // const v = new Validator(req.body, {
      //   latitude: "required",
      //   longitude: "required",
      //   address: "required",

      // });

      // let errorsResponse = await helper.checkValidation(v);
      // if (errorsResponse) {
      //   return helper.error403(res, errorsResponse);
      // }

        const update = await users.update({
        address_save: req.body.address||'',
        latitude_save: req.body.latitude||0,
        longitude_save: req.body.longitude||0,
      }, {
        where: {
          id: req.auth.id,
        },
        raw: true,
      });
      let updateduser = await users.findOne({
        where: {
          id: req.auth.id,
        },
        raw: true,
        nest: true,
      });
      updateduser.password = undefined;

      return helper.success(res, "Location Updated Succesfully", updateduser);
    }
    catch (error) {
      return helper.error403(res, error);
    }
  },
};
