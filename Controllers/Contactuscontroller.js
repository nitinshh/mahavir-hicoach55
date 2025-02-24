
const helper = require('../helpers/helper')
var CryptoJS = require("crypto-js");
const db = require('../models')
const ENV = process.env
const contactus = db.contactus
var title = "contactus"
var sequelize = require('sequelize')
module.exports = {
    contactUslisting: async (req, res) => {
        try {
            if (!req.session.admin) return res.redirect("/admin/login");
            const find_contactus = await contactus.findAll({
                where: {
                    deletedAt: null,
                },
                order:[["id","DESC"]],
            })
            let session = req.session.admin
            res.render('Admin/contactUs/listing', { session, find_contactus, title })
        } catch (error) {
            return helper.error(res, error)
        }
    },
    deletedcontactUs: async (req, res) => {
        try {
           let deletedTime =  sequelize.literal('CURRENT_TIMESTAMP')
            const userdelete = await contactus.update({ deletedAt:deletedTime}, {
                where: {
                    id: req.body.id
                }
            })
            res.send(true)
        } catch (error) {
            return helper.error(res, error)
        }
    },
    contactusview: async (req, res) => {
        try {
            if (!req.session.admin) return res.redirect("/admin/login");
            let session = req.session.admin
            const find_contactus = await contactus.findOne({
                where: {
                    deletedAt: null,
                    id: req.params.id
                },
                raw: true,
                nest: true
            })
            console.log(find_contactus,">>>>>find_contactus>>>>");
            res.render('Admin/contactUs/view', { find_contactus, session, title })
        } catch (error) {
            return helper.error(res, error)

        }
    },
}