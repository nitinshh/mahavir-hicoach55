
const helper = require('../helpers/helper')
var CryptoJS = require("crypto-js");
const db = require('../models')
const ENV = process.env
const users = db.users
const questions = db.questions
const answers = db.answers
var title = "questions"
var sequelize = require('sequelize')
module.exports = {
    questions: async (req, res) => {
        try {
            if (!req.session.admin) return res.redirect("/admin/login");
            let session = req.session.admin
            res.render('Admin/questions/add', { session, title })
        } catch (error) {
            return helper.error(res, error)
        }
    },
    questionsadd: async (req, res) => {
        try {

            console.log(req.body, ">>>>>>>>categoryadd>>>>>>>>");
            // return
            const find_name = await questions.findOne({
                where: {
                    question: req.body.question
                }
            })

            if (find_name) {
                req.flash('error', 'This questions alredy exit ');
                res.redirect(`back`);
            } else {
               
                const createquestions = await questions.create(req.body)
                req.flash('success', 'This questions alredy exit ');
                res.redirect('/admin/questionslisting');
            }

        } catch (error) {
            console.log(error,">>>>>>>>>");
            return helper.error(res, error)
        }
    },
    questionslisting: async (req, res) => {
        try {
            if (!req.session.admin) return res.redirect("/admin/login");
            const find_questions = await questions.findAll({
                where: {
                    deletedAt: null,
                },
                order:[["id","DESC"]],
            })
            let session = req.session.admin
            res.render('Admin/questions/listing', { session, find_questions, title })
        } catch (error) {
        console.log(error,">>>>>>>>");
            return helper.error(res, error)
        }
    },
    questionsview: async (req, res) => {
        try {
            if (!req.session.admin) return res.redirect("/admin/login");
            let session = req.session.admin
            const questionsview = await questions.findOne({
                where: {
                    id: req.params.id
                }
            })
            res.render('Admin/questions/view', { questionsview, session, title })
        } catch (error) {
            return helper.error(res, error)

        }
    },
    questionsedit: async (req, res) => {
        try {
            if (!req.session.admin) return res.redirect("/admin/login");
            let session = req.session.admin
            const questionsview = await questions.findOne({
                where: {
                    id: req.params.id
                }
            })

            const find_answers = await answers.findAll({
                where: {
                    question_id:req.params.id,
                    deletedAt: null,
                }
            })
            res.render('Admin/questions/edit', { questionsview, find_answers:find_answers,session, title })
        } catch (error) {
            return helper.error(res, error)

        }
    },
    questionsviewupdate: async (req, res) => {
        try {

            // console.log(req.body,">>>>>>>>>>>>");
            // return
            const find_name = await questions.findOne({
                where: {
                    question: req.body.question
                },
                raw:true,nest:true
            })

            if (find_name) {
                req.flash('error', 'This questions alredy exit ');
                res.redirect(`back`);
            } else {
                const upadtequestions= await questions.update(req.body, {
                    where: {
                        id: req.params.id
                    }
                })
                res.redirect(`back`)
            }

        } catch (error) {

        }
    },
    questions_status: async (req, res) => {
        try {
            console.log(req.body, ">>>>>>>error>>>");
            const find_status = await questions.update({ status: req.body.value }, {
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
    deletedquestions: async (req, res) => {
        try {
            let deletedTime = sequelize.literal('CURRENT_TIMESTAMP')
            const questionsdelete = await questions.update({ deletedAt: deletedTime }, {
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