
const helper = require('../helpers/helper')
var CryptoJS = require("crypto-js");
const db = require('../models')
const ENV = process.env
const users = db.users
const reports = db.reports
var title = "review"
var sequelize = require('sequelize')
reports.belongsTo(users, {
    foreignKey: "reported_by",
    as: "reported_by_name",
});
reports.belongsTo(users, {
    foreignKey: "reported_to",
    as: "reported_to_name",
});

module.exports = {

    report_listing: async (req, res) => {
        try {
            if (!req.session.admin) return res.redirect("/admin/login");
            const find_reports = await reports.findAll({
                include: [

                    {
                        model: users,
                        as: "reported_by_name",
                        attributes: ['id', 'first_name', 'last_name', 'email', 'image','role']
                    },
                    {
                        model: users,
                        as: "reported_to_name",
                        attributes: ['id', 'first_name', 'last_name', 'email', 'image','role']
                    },
                ],
            
                order:[["id","DESC"]],
                raw: true, nest: true
            })

            let session = req.session.admin
            
            res.render('Admin/review/report_listing', { session, find_reports, title:"Report Users" })
        } catch (error) {
            return helper.error(res, error)
        }
    }
}