
const helper = require('../helpers/helper')
const db = require('../models')
const ENV = process.env
const users = db.users
var sequelize = require('sequelize');
const Op = sequelize.Op
const title = "studentChat"

module.exports = {

    studentChat: async (req, res) => {
        try {
            if (!req.session.admin) return res.redirect("/admin/login");
            let session = req.session.admin
            res.render('Admin/StudentChat/studentChat',{title:title,session})
        } catch (error) {
            helper.error(res, error)
        }
    }
}