
const helper = require('../helpers/helper')
var CryptoJS = require("crypto-js");
const db = require('../models')
const ENV = process.env
const users = db.users
const questions = db.questions
const answers = db.answers
var title = "answers"
var sequelize = require('sequelize')
module.exports = {

    
    
    answers: async (req, res) => {
        try {
            if (!req.session.admin) return res.redirect("/admin/login");
            let session = req.session.admin
            res.render('Admin/answers/add', { session, Id: req.query.id, title })
        } catch (error) {
            return helper.error(res, error)
        }
    },
    answersadd: async (req, res) => {
        try {
            if (!Array.isArray(req.body.answer)) req.body.answer = [req.body.answer];
            let obj = []
            req.body.answer.map((e) => {
                let data = {
                    question_id: req.query.id,
                    answer: e
                }
                obj.push(data)
            })
            const createanswers = await answers.bulkCreate(obj)
            req.flash('success', 'This answers add succesfully ');
            res.redirect(`/admin/questionsedit/${req.query.id}`)
        } catch (error) {
            return helper.error(res, error)
        }
    },
    answersview: async (req, res) => {
        try {
            if (!req.session.admin) return res.redirect("/admin/login");
            let session = req.session.admin
            const answersview = await answers.findOne({
                where: {
                    id: req.params.id
                }
            })
            res.render('Admin/answers/view', { answersview, id: req.query.id, session, title })
        } catch (error) {
            return helper.error(res, error)

        }
    },
    answersedit: async (req, res) => {
        try {
            if (!req.session.admin) return res.redirect("/admin/login");
            let session = req.session.admin
            const answersview = await answers.findOne({
                where: {
                    id: req.params.id
                }
            })


            res.render('Admin/answers/edit', { answersview, id: req.query.id, session, title })
        } catch (error) {
            return helper.error(res, error)

        }
    },
    answersviewupdate: async (req, res) => {
        try {

            // console.log(req.body,">>>>>>>>>>>>");
            // return
            const find_name = await answers.findOne({
                where: {
                    answer: req.body.answer
                },
                raw: true, nest: true
            })

            if (find_name) {
                req.flash('error', 'This answers alredy exit ');
                res.redirect(`back`);
            } else {
                const upadteanswers = await answers.update(req.body, {
                    where: {
                        id: req.params.id
                    }
                })
                res.redirect(`back`)
            }

        } catch (error) {

        }
    },
    answers_status: async (req, res) => {
        try {
            console.log(req.body, ">>>>>>>error>>>");
            const find_status = await answers.update({ status: req.body.value }, {
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
    deletedanswers: async (req, res) => {
        try {
            let deletedTime = sequelize.literal('CURRENT_TIMESTAMP')
            const answersdelete = await answers.update({ deletedAt: deletedTime }, {
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