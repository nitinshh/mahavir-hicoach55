const envfile = process.env;
let CryptoJS = require("crypto-js");
const helper = require("../../helpers/helper");
const { Validator } = require("node-input-validator");
const sequelize = require("sequelize");
const Op = sequelize.Op
const { users, rating_reviews } = require("../../models");
var deletedTime = sequelize.literal('CURRENT_TIMESTAMP')

module.exports = {

    rating: async (req, res) => {
        try {
            let find_rating = await rating_reviews.findAll({
                attributes: {
                    include: [
                        [
                            sequelize.literal(
                                `(SELECT AVG(rating) FROM rating_reviews WHERE rating_reviews.coach_id = ${req?.auth?.id} )`,
                            ),
                            "avg_rating"
                        ],

                        [
                            sequelize.literal(
                                `(SELECT Count(*) FROM rating_reviews Where rating_reviews.rating = 5 and rating_reviews.coach_id = ${req?.auth?.id} )`,
                            ),
                            "five_rating",
                        ], [
                            sequelize.literal(
                                `(SELECT Count(*) FROM rating_reviews Where rating_reviews.rating = 4 and rating_reviews.coach_id = ${req?.auth?.id} )`,
                            ),
                            "four_rating",
                        ], [
                            sequelize.literal(
                                `(SELECT Count(*) FROM rating_reviews Where rating_reviews.rating = 3 and rating_reviews.coach_id = ${req?.auth?.id})`,
                            ),
                            "three_rating",
                        ], [
                            sequelize.literal(
                                `(SELECT Count(*) FROM rating_reviews Where rating_reviews.rating = 2 and rating_reviews.coach_id = ${req?.auth?.id})`,
                            ),
                            "two_rating",
                        ], [
                            sequelize.literal(
                                `(SELECT Count(*) FROM rating_reviews Where rating_reviews.rating = 1 and rating_reviews.coach_id = ${req?.auth?.id})`,
                            ),
                            "one_rating",
                        ],
                    ]
                },
                include: [

                    {
                        model: users,
                        as: "student_details"
                    },
                    {
                        model: users,
                        as: "coach_details"
                    },
                ],
                where: {
                    coach_id: req.auth.id
                },
                raw: true,
                nest: true
            })

            return helper.success(res, "Get rating succesfully", find_rating);
        } catch (error) {
            console.log(error);
            return helper.error403(res, error);
        }
    },
}