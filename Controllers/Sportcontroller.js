
const helper = require('../helpers/helper')
var CryptoJS = require("crypto-js");
const db = require('../models')
const ENV = process.env
const users = db.users
const sport = db.sports
var title = "sport"
var sequelize = require('sequelize')
module.exports = {
    sport: async (req, res) => {
        try {
            if (!req.session.admin) return res.redirect("/admin/login");
            let session = req.session.admin
            res.render('Admin/sport/add', { session, title })
        } catch (error) {
            return helper.error(res, error)
        }
    },
    sportadd: async (req, res) => {
        try {

            console.log(req.body, ">>>>>>>>categoryadd>>>>>>>>");
            // return
            const find_name = await sport.findOne({
                where: {
                    name: req.body.name
                }
            })

            if (find_name) {
                req.flash('error', 'This sport alredy exit ');
                res.redirect(`back`);
            } else {
                let folder = "sport"
                if (req.files && req.files.logo) {
                    let Logo = await helper.fileUpload(req.files.logo, folder)
                    req.body.logo = Logo
                }
                const createsport = await sport.create(req.body)
                req.flash('success', 'This sport alredy exit ');
                res.redirect('/admin/sportlisting');
            }

        } catch (error) {
            console.log(error,">>>>>>");
            return helper.error(res, error)
        }
    },
    sportlisting: async (req, res) => {
        try {
            if (!req.session.admin) return res.redirect("/admin/login");
            const find_sport = await sport.findAll({
                where: {
                    deletedAt: null,
                },
                order:[["id","DESC"]],
            })
            let session = req.session.admin
            res.render('Admin/sport/listing', { session, find_sport, title })
        } catch (error) {
            return helper.error(res, error)
        }
    },
    sportview: async (req, res) => {
        try {
            if (!req.session.admin) return res.redirect("/admin/login");
            let session = req.session.admin
            const sportview = await sport.findOne({
                where: {
                    id: req.params.id
                }
            })
            res.render('Admin/sport/view', { sportview, session, title })
        } catch (error) {
            return helper.error(res, error)

        }
    },
    sportedit: async (req, res) => {
        try {
            if (!req.session.admin) return res.redirect("/admin/login");
            let session = req.session.admin
            const sportview = await sport.findOne({
                where: {
                    id: req.params.id
                }
            })
            res.render('Admin/sport/edit', { sportview, session, title })
        } catch (error) {
            return helper.error(res, error)

        }
    },
    sportviewupdate: async (req, res) => {
        try {

            // console.log(req.body,">>>>>>>>>>>>");
            // return
            let folder = "sport"
            // if (req.files && req.files.image) {
            //     let images = await helper.fileUpload(req.files.image, folder)
            //     req.body.image = images
            // }
            if (req.files && req.files.logo) {
                let logo_image = await helper.fileUpload(req.files.logo, folder)
                req.body.logo = logo_image
            }

            const upadteCategory = await sport.update(req.body, {
                where: {
                    id: req.params.id
                }
            })
            req.flash('success', 'sport update succesfully');
            res.redirect(`/admin/sportlisting`);

        } catch (error) {

        }
    },
    sport_status: async (req, res) => {
        try {
            console.log(req.body, ">>>>>>>error>>>");
            const find_status = await sport.update({ status: req.body.value }, {
                where: {
                    id: req.body.id
                }
            })

            console.log(find_status, ">>>>>>");
            res.send(true)
        } catch (error) {
            console.log(error);
            return helper.error(res, error)
        }
    },
    deletedsport: async (req, res) => {
        try {
            let deletedTime = sequelize.literal('CURRENT_TIMESTAMP')
            const userdelete = await sport.update({ deletedAt: deletedTime }, {
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