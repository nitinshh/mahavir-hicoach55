
const helper = require('../helpers/helper')
var CryptoJS = require("crypto-js");
const db = require('../models')
const ENV = process.env
const users = db.users
const review = db.rating_reviews
var title = "review"
var sequelize = require('sequelize')
review.belongsTo(users, {
    foreignKey: "user_id",
    as: "student_details",
});
review.belongsTo(users, {
    foreignKey: "coach_id",
    as: "coach_details",
});

module.exports = {

    reviewlisting: async (req, res) => {
        try {
            if (!req.session.admin) return res.redirect("/admin/login");
            const find_review = await review.findAll({
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

            // console.log(find_review, ">>>>>>>>>>>>>find_bookings>>>>>>>");
            // return
            let session = req.session.admin
            res.render('Admin/review/listing', { session, find_review, title })
        } catch (error) {
            return helper.error(res, error)
        }
    },

    reviewview: async (req, res) => {
        try {
            if (!req.session.admin) return res.redirect("/admin/login");
            let session = req.session.admin
            const find_review = await review.findOne({
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
            console.log(find_review,">>>>>find_review>>>>");
            res.render('Admin/review/view', { find_review, session, title })
        } catch (error) {
            return helper.error(res, error)

        }
    },
    
    reviewedit: async (req, res) => {
        try {
            if (!req.session.admin) return res.redirect("/admin/login");
            let session = req.session.admin
            const find_review = await review.findOne({
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
            res.render('Admin/review/edit', { find_review, session, title })
        } catch (error) {
            return helper.error(res, error)

        }
    },
    reviewviewupdate: async (req, res) => {
        try {
            // console.log(req.body,">>>>>>>>>>>>");
            // return
            const upadteCategory = await review.update(req.body, {
                where: {
                    id: req.params.id
                }
            })
            req.flash('success', 'Review update succesfully');
            res.redirect(`/admin/reviewlisting`);

        } catch (error) {

        }
    },
    deletedreview: async (req, res) => {
        try {
            let deletedTime = sequelize.literal('CURRENT_TIMESTAMP')
            const userdelete = await review.update({ deletedAt: deletedTime }, {
                where: {
                    id: req.body.id
                }
            })
            res.send(true)
        } catch (error) {
            return helper.error(res, error)
        }
    },
  
}