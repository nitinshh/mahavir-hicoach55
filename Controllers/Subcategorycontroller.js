
const helper = require('../helpers/helper')
var CryptoJS = require("crypto-js");
const db = require('../models')
const ENV = process.env
const users = db.users
const categories = db.categories
const subcategory = db.subcategory
var title = "subcategory"
var sequelize = require('sequelize')
// db.post.hasMany(db.postLike, {
//     foreignKey: "pLike",
//     as: "postLikes",
//   });

// subcategory.belongsTo(categories, {
//     foreignKey: "category_id",
//     as: "category",
// })
module.exports = {
    subcategory: async (req, res) => {
        try {
            if (!req.session.admin) return res.redirect("/admin/login");
            const find_category = await categories.findAll({
                where: {
                    deletedAt: null,
                },
                order:[["id","DESC"]],
            })

            let session = req.session.admin
            res.render('Admin/subcategory/add', { session, title, find_category:find_category})
        } catch (error) {
            return helper.error(res, error)
        }
    },
    subcategoryadd: async (req, res) => {
        try {

            // console.log(req.body, ">>>>>>>>categoryadd>>>>>>>>");
            // return
            const find_name = await subcategory.findOne({
                where: {
                    name: req.body.name
                }
            })

            if (find_name) {
                req.flash('error', 'This subcategory alredy exit ');
                res.redirect(`back`);
            } else {
                // let folder = "subcategory"
                // if (req.files && req.files.image) {
                //     let images = await helper.fileUpload(req.files.image, folder)
                //     req.body.image = images
                // }
                const createCategory = await subcategory.create(req.body)
                req.flash('success', 'This subcategory add Sucessfully ');
                res.redirect('/admin/subcategorylisting');
            }

        } catch (error) {
            return helper.error(res, error)
        }
    },
    subcategorylisting: async (req, res) => {
        try {
            if (!req.session.admin) return res.redirect("/admin/login");
            const find_subcategory = await subcategory.findAll({
                include: [{
                    model: categories,
                    as: "category"
                }],
                where: {
                    deletedAt: null,
                }
            })
            let session = req.session.admin
            res.render('Admin/subcategory/listing', { session, find_subcategory, title })
        } catch (error) {
            return helper.error(res, error)
        }
    },
    subcategoryview: async (req, res) => {
        try {
            if (!req.session.admin) return res.redirect("/admin/login");
            let session = req.session.admin
            const subcategoryview = await subcategory.findOne({
                include: [{
                    model: categories,
                    as: "category"
                }],
                where: {
                    id: req.params.id
                }
            })
            res.render('Admin/subcategory/view', { subcategoryview, session, title })
        } catch (error) {
            return helper.error(res, error)

        }
    },
    subcategoryedit: async (req, res) => {
        try {
            if (!req.session.admin) return res.redirect("/admin/login");
            let session = req.session.admin
            const subcategoryview = await subcategory.findOne({
                include: [{
                    model: categories,
                    as: "category"
                }],
                where: {
                    id: req.params.id
                }
            })
            res.render('Admin/subcategory/edit', { subcategoryview, session, title })
        } catch (error) {
            return helper.error(res, error)

        }
    },
    subcategoryviewupdate: async (req, res) => {
        try {

                const upadtesubcategory = await subcategory.update(req.body, {
                    where: {
                        id: req.params.id
                    }
                })
                req.flash('success', 'Subcategory update succesfully' );
                res.redirect(`/admin/subcategorylisting`);
            

        } catch (error) {
console.log(error,">>>>>>>>");
        }
    },
    subcategory_status: async (req, res) => {
        try {
            console.log(req.body, ">>>>>>>error>>>");
            const find_status = await subcategory.update({ status: req.body.value }, {
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
    deletedsubcategory: async (req, res) => {
        try {
            let deletedTime = sequelize.literal('CURRENT_TIMESTAMP')
            const subcategorydelete = await subcategory.update({ deletedAt: deletedTime }, {
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