const helper = require("../../helpers/helper");
const { Validator } = require("node-input-validator");
const sequelize = require("sequelize");
const Op = sequelize.Op;
const db = require("../../models");
const ENV = process.env;
const { users, rating_reviews: review  } = require("../../models");

var title = "review";

module.exports = {
  add_reviews: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        coach_id: "required",
        booking_id: "required",
        rating: "required|integer|min:1|max:5",
        review: "required|string",
      });

      let errorsResponse = await helper.checkValidation(v);
      if (errorsResponse) {
        return helper.error403(res, errorsResponse);
      }

      let existingReview = await review.findOne({
        where: {
          user_id: req.auth.id,
          booking_id: req.body.booking_id,
        },
        raw: true,
      });

      if (existingReview) {
        await review.destroy({
          where: {
            id: existingReview.id,
          },
        });
      }

      req.body.user_id = req.auth.id;

      const newReview = await review.create(req.body);

      let coach = await db.users.findOne({
        where: {
          id: req.body.coach_id,         },
        raw: true,
      });

      if (!coach) {
        return helper.error403(res, "Coach not found.");
      }

      let ndata = {
        msg: `${req.auth.first_name} ${req.auth.last_name} rated you`,
        title: "HiCoach",
        request_id: req.body.booking_id,
        message: `${req.auth.first_name} ${req.auth.last_name} gave you a rating of ${req.body.rating}`,
        sender_image: `${req.auth.image}`,
        sender_id: `${req.auth.id}`,
        sender_name: `${req.auth.first_name} ${req.auth.last_name}`,
        type: 7,
      };

      if (coach.notify_class_requests === "yes") {
        helper.sendPushNotification(coach.device_token, ndata);
      } else {
        console.log(`Notifications are turned off for coach_id: ${coach.id}`);
      }

      return helper.success(
        res,
        "Rating and review submitted successfully",
        newReview
      );
    } catch (error) {

      console.error("Error submitting review:", error);
      return helper.error403(
        res,
        "An error occurred while submitting the review.",
        error
      );
    }
  },

  reviewslisting: async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      let rating = await users.findOne({
        attributes: {
          include: [
            [
              sequelize.literal(
                `(SELECT AVG(rating) FROM rating_reviews WHERE rating_reviews.coach_id = ${req?.auth?.id} )`
              ),
              "avg_rating",
            ],
            [
              sequelize.literal(
                `(SELECT Count(*) FROM rating_reviews Where rating_reviews.rating = 5 and rating_reviews.coach_id = ${req?.auth?.id} )`
              ),
              "five_rating",
            ],
            [
              sequelize.literal(
                `(SELECT Count(*) FROM rating_reviews Where rating_reviews.rating = 4 and rating_reviews.coach_id = ${req?.auth?.id} )`
              ),
              "four_rating",
            ],
            [
              sequelize.literal(
                `(SELECT Count(*) FROM rating_reviews Where rating_reviews.rating = 3 and rating_reviews.coach_id = ${req?.auth?.id})`
              ),
              "three_rating",
            ],
            [
              sequelize.literal(
                `(SELECT Count(*) FROM rating_reviews Where rating_reviews.rating = 2 and rating_reviews.coach_id = ${req?.auth?.id})`
              ),
              "two_rating",
            ],
            [
              sequelize.literal(
                `(SELECT Count(*) FROM rating_reviews Where rating_reviews.rating = 1 and rating_reviews.coach_id = ${req?.auth?.id})`
              ),
              "one_rating",
            ],
          ],
        },
        where: {
          id: req.body.coach_id || req.auth.id,
        },
      });

      const { count, rows: find_review } = await review.findAndCountAll({
        include: [
          {
            model: users,
            as: "student_details",
          },
          {
            model: users,
            as: "coach_details",
          },
        ],
        where: {
          deletedAt: null,
          coach_id: req.body.coach_id || req.auth.id,
        },
        limit: parseInt(limit), 
        offset: parseInt(offset), 
      });

      let obj = {
        rating: rating,
        find_review: find_review,
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalReviews: count,
      };

      return helper.success(res, "Get reviews successfully", obj);
    } catch (error) {
      return helper.error403(res, error.message || error);
    }
  },

  review_view: async (req, res) => {
    try {
      const find_review = await review.findOne({
        include: [
          {
            model: users,
            as: "student_details",
          },
          {
            model: users,
            as: "coach_details",
          },
        ],
        where: {
          deletedAt: null,
          id: req.body.review_id,
        },
        raw: true,
        nest: true,
      });

      return helper.success(res, "GeT reviews succesfully", find_review);
    } catch (error) {
      return helper.error403(res, error);
    }
  },
  review_edit: async (req, res) => {
    try {

      const v = new Validator(req.body, {
        review_id: "required", 
        rating: "integer|min:1|max:5", 
        review: "string", 
      });

      let errorsResponse = await helper.checkValidation(v);
      if (errorsResponse) {
        return helper.error403(res, errorsResponse);
      }

      const find_review = await review.findOne({
        where: {
          id: req.body.review_id,
          user_id: req.auth.id,
        },
      });

      if (!find_review) {
        return helper.error403(
          res,
          "Review not found or you are not authorized to edit it."
        );
      }

      await review.update(req.body, {
        where: {
          id: req.body.review_id,
        },
      });

      const find_review_updated = await review.findOne({
        where: {
          id: req.body.review_id,
        },
        raw: true,
      });

      return helper.success(
        res,
        "Review updated successfully",
        find_review_updated
      );
    } catch (error) {
      return helper.error403(
        res,
        "An error occurred while updating the review",
        error
      );
    }
  },
};
