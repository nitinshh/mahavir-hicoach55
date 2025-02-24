
const helper = require('../helpers/helper')
var CryptoJS = require("crypto-js");
const db = require('../models')
const ENV = process.env
const users = db.users

const bookings = db.bookings


var title = "bookings"
var sequelize = require('sequelize')
bookings.belongsTo(users, {
    foreignKey: "user_id",
    as: "student_details",
});
bookings.belongsTo(users, {
    foreignKey: "coach_id",
    as: "coach_details",
});
// games.belongsTo(subcategory, {
//     foreignKey: "subcategoryId",
//     as: "subcategory",
// });
// games.belongsTo(categories, {
//     foreignKey: "categoryId",
//     as: "category",
// })
// games_round.belongsTo(subcategory, {
//     foreignKey: "subcategoryId",
//     as: "subcategory",
// });

// games_round.belongsTo(categories, {
//     foreignKey: "categoryId",
//     as: "category",
// })


module.exports = {

    bookinglisting: async (req, res) => {
        try {
            if (!req.session.admin) return res.redirect("/admin/login");
            const find_bookings = await bookings.findAll({
                // attributes: [
                //     [
                //       sequelize.literal(
                //         `(SELECT COALESCE(type, 0) FROM booking_cancels WHERE booking_cancels.booking_id = bookings.id LIMIT 1)`
                //       ),
                //       "cancel_request",
                //     ]],
                attributes: {
                    include: [
                      [
                        sequelize.literal(
                          `(SELECT COALESCE(type, 0) FROM booking_cancels WHERE booking_cancels.booking_id = bookings.id LIMIT 1)`
                        ),
                        "cancel_request",
                      ],
                    ],
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
                    deletedAt: null,
                },
                order:[["id","DESC"]],
                raw: true, nest: true
            })

            // console.log(find_bookings, ">>>>>>>>>>>>>find_bookings>>>>>>>");
            // return
            let session = req.session.admin
            res.render('Admin/booking/listing', { session, find_bookings, title })
        } catch (error) {
            return helper.error(res, error)
        }
    },
    bookingview: async (req, res) => {
        try {
            if (!req.session.admin) return res.redirect("/admin/login");
            let session = req.session.admin
            const find_booking = await bookings.findOne({
                attributes: {
                    include: [
                      [
                        sequelize.literal(
                          `(SELECT COALESCE(type, 0) FROM booking_cancels WHERE booking_cancels.booking_id = bookings.id LIMIT 1)`
                        ),
                        "cancel_request",
                      ],
                    ],
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
                    deletedAt: null,
                    id: req.params.id
                },
            
                raw: true,
                nest: true
            })

            res.render('Admin/booking/view', { find_booking, session, title })
        } catch (error) {
            return helper.error(res, error)

        }
    },
    bookingdelete: async (req, res) => {
        try {
            if (!req.session.admin) return res.redirect("/admin/login");
            let session = req.session.admin
            const find_round = await games_round.findAll({
                where: {
                    deletedAt: null,
                    games_id: req.params.id
                }
            })
            const find_game = await games.findOne({
                include: [
                    {
                        model: categories,
                        as: "category"
                    },
                    {
                        model: subcategory,
                        as: "subcategory"
                    },
                    {
                        model: users,
                        as: "user_details"
                    },
                ],
                where: {
                    deletedAt: null,
                    id: req.params.id
                },
                raw: true,
                nest: true
            })
            res.render('Admin/playgames/listinground', { find_round, find_game, session, title })
        } catch (error) {
            return helper.error(res, error)

        }
    },
    deletedbooking: async (req, res) => {
        try {
            let deletedTime = sequelize.literal('CURRENT_TIMESTAMP')
            const userdelete = await games.update({ deletedAt: deletedTime }, {
                where: {
                    id: req.body.id
                }
            })

            const find_round = await games_round.update({
                deletedAt: deletedTime
            }, {
                where: {
                    deletedAt: null,
                    games_id: req.body.id
                }
            })
            res.send(true)
        } catch (error) {
            return helper.error(res, error)
        }
    },
}