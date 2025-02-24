const helper = require('../helpers/helper')
var CryptoJS = require("crypto-js");
const db = require('../models')
const ENV = process.env
const users = db.users
const Transactions = db.transactions
const bookings = db.bookings
var title = "transaction"
var sequelize = require('sequelize')
Transactions.belongsTo(users, {
    foreignKey: "user_id",
    as: "student_details",
});
Transactions.belongsTo(users, {
    foreignKey: "coach_id",
    as: "coach_details",
});
Transactions.belongsTo(bookings, {
    foreignKey: "booking_id",
    as: "booking_details",
});
module.exports = {

    transactionlisting: async (req, res) => {
        try {
            if (!req.session.admin) return res.redirect("/admin/login");
            const find_transaction = await Transactions.findAll({
                include: [

                    {
                        model: users,
                        as: "student_details"
                    },
                    {
                        model: users,
                        as: "coach_details"
                    },
                    {
                        model: bookings,
                        as: "booking_details"
                    },
                ],
                where: {
                    deletedAt: null,
                },
                order:[["id","DESC"]],
                raw: true, nest: true
            })
  
            let session = req.session.admin
            res.render('Admin/transaction/listing', { session, find_transaction, title })
        } catch (error) {
            return helper.error(res, error)
        }
    },
    transactionview: async (req, res) => {
        try {
            if (!req.session.admin) return res.redirect("/admin/login");
            let session = req.session.admin
            const find_transaction = await Transactions.findOne({
                include: [

                    {
                        model: users,
                        as: "student_details"
                    },
                    {
                        model: users,
                        as: "coach_details"
                    },
                    {
                        model: bookings,
                        as: "booking_details"
                    },
                ],
                where: {
                    deletedAt: null,
                    id: req.params.id
                },
                raw: true,
                nest: true
            })
            console.log(find_transaction, ">>>>>find_transaction>>>>");
            res.render('Admin/transaction/view', { find_transaction, session, title })
        } catch (error) {
            return helper.error(res, error)

        }
    },
    deletedtransaction: async (req, res) => {
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
}