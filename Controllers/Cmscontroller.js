
const helper = require('../helpers/helper')
var CryptoJS = require("crypto-js");
const db = require('../models')
const ENV = process.env
const cms = db.cms
var privacy_title = "privacy"
var about_title = "about"
var terms_title = "terms"
module.exports = {

    privacy_policy: async (req, res) => {
        try {
            if (!req.session.admin) return res.redirect("/admin/login");
            const privacy_policy = await cms.findOne({
                where: {
                    deletedAt: null, type: 1
                }
            })
           
            let session = req.session.admin


            res.render('Admin/cms/privacypolicy', { session, title: privacy_title, privacy_policy })
        } catch (error) {
            return helper.error(res, error)
        }
    },
    AboutUs: async (req, res) => {
        try {
            if (!req.session.admin) return res.redirect("/admin/login");
            let session = req.session.admin
            const aboutus = await cms.findOne({
                where: {
                    deletedAt: null, type: 3
                }
            })
            console.log(aboutus, ">>>>>>title>>>>>>>>");
            res.render('Admin/cms/aboutus', { session, title: about_title, aboutus })
        } catch (error) {
            return helper.error(res, error)

        }
    },
    terms: async (req, res) => {
        try {
            if (!req.session.admin) return res.redirect("/admin/login");
            let session = req.session.admin
            const terms = await cms.findOne({ where: { type: 2, deletedAt: null }, raw: true, nest: true })
            console.log(terms, ">>>>>>>terms>>>>>>");
            res.render('Admin/cms/terms', { session, title: terms_title, terms })
        } catch (error) {
            return helper.error(res, error)

        }
    },
    privacy_policy_update: async (req, res) => {
        try {

            const upadteprivacy = await cms.update(req.body, {
                where: {
                    type: 1
                }
            },)
            res.redirect(`back`)
        } catch (error) {

        }
    },
    AboutUs_update: async (req, res) => {
        try {

            const upadteprivacy = await cms.update(req.body, {
                where: {
                    type: 3
                }
            })
            res.redirect(`back`)
        } catch (error) {

        }
    },
    terms_update: async (req, res) => {
        try {
            console.log(">>>>>>UPADTE DONE ");
            const upadteprivacy = await cms.update(req.body, {
                where: {
                    type: 2
                }
            })
            res.redirect(`back`)
        } catch (error) {

        }
    },
}