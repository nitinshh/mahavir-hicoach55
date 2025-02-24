
const helper = require('../helpers/helper')
var CryptoJS = require("crypto-js");
const db = require('../models')
const ENV = process.env
const users = db.users
const Transactions = db.transactions
const bookings = db.bookings
var sequelize = require('sequelize');
const Op = sequelize.Op
const title = "student"
// user_answers.belongsTo(questions, {
//     foreignKey: "question_id",
//     as: "question_details"
// })
// user_answers.belongsTo(answers, {
//     foreignKey: "answers_id",
//     as: "answer_details",
// })
module.exports = {

    student: async (req, res) => {
        try {
            if (!req.session.admin) return res.redirect("/admin/login");
            let session = req.session.admin
            res.render('Admin/student/add', { session, title, })
        } catch (error) {
            return helper.error(res, error)
        }
    },
    studentadd: async (req, res) => {
        try {

            const find_name = await users.findOne({
                where: {
                    email: req.body.email,
                    role: 1
                }
            })
            let Encrypt_data = CryptoJS.AES.encrypt(JSON.stringify(req.body?.password), ENV.crypto_key).toString();
            req.body.password = Encrypt_data

            if (find_name) {
                req.flash('error', 'This student alredy exit ');
                res.redirect(`back`);
            } else {
                let folder = "users"
                if (req.files && req.files.image) {
                    let Image = await helper.fileUpload(req.files.image, folder)
                    req.body.image = Image
                }

                req.body.role = 1
                const createstudent = await users.create(req.body)

                let find_coach = await users.findOne({
                    where: {
                        id: createstudent.dataValues.id
                    },
                    raw: true,
                    nest: true
                })

                req.flash('success', 'This Student add succesfully ');
                res.redirect('/admin/studentlisting');
            }
        } catch (error) {
            console.log(error, ">>>>>>");
            return helper.error(res, error)
        }
    },
    studentlisting: async (req, res) => {
        try {
            if (!req.session.admin) return res.redirect("/admin/login");
            const find_user = await users.findAll({
                attributes: {
                    include: [
                        [
                        sequelize.literal(
                            `(SELECT Count(*) FROM bookings Where bookings.user_id = users.id )`,
                        ),
                        "total_booking"
                    ],
                    [
                        sequelize.literal(
                            `(SELECT COALESCE(SUM(amount), 0) FROM transactions Where transactions.user_id = users.id )`,
                        ),
                        "total_spend"
                    ],
                    [
                        sequelize.literal(
                            `(SELECT Count(*) FROM reports Where reports.reported_to = users.id )`,
                        ),
                        "reported_count"
                    ],
                    
                    ]
                },
                where: {
                    deletedAt: null, role: 1
                },
                order: [["id", "DESC"]],
                raw: true,
                nest: true
            })
            let session = req.session.admin
            res.render('Admin/student/listing', { session, find_user, title })
        } catch (error) {
            return helper.error(res, error)
        }
    },
    studentview: async (req, res) => {
        try {
            if (!req.session.admin) return res.redirect("/admin/login");
            let session = req.session.admin
            const userview = await users.findOne({
                attributes: {
                    include: [

                        [
                            sequelize.literal(
                                `(SELECT COALESCE(SUM(amount), 0) FROM transactions Where transactions.user_id = users.id )`,
                            ),
                            "total_spend"
                        ]
                    ]
                },
                where: {
                    id: req.params.id
                }
            })

            // console.log(userview);
            // return
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
                    user_id: req.params.id
                },
            })
            const find_bookings = await bookings.findAll({
                attributes: {
                    include: [
                        [
                            sequelize.literal(
                                `(SELECT COALESCE(type, 0) FROM booking_cancels WHERE booking_cancels.booking_id = bookings.id LIMIT 1)`
                            ),
                            "cancel_request",
                        ],
                    ],
                },
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
                    user_id: req.params.id
                },

                raw: true, nest: true
            })


            res.render('Admin/student/view', { userview, find_transaction, find_bookings, session, title })
        } catch (error) {
            console.log(error, ">>>>error>>>");
            return helper.error(res, error)

        }
    },
    student_status: async (req, res) => {
        try {

            const find_status = await users.update({
                status: req.body.value,
                login_time: 0
            }, {
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
    verified_status: async (req, res) => {
        try {

            // Update the user's verification status
            const find_status = await users.update({ is_verified: req.body.value }, {
                where: {
                    id: req.body.id
                }
            });

            // send push
            let user_data = await users.findOne({
                where: {
                    id: req.body.id,
                },
                raw: true,
            });
            let message = `Your account verified successfully by Admin`
            // Notification data
            let ndata = {
                msg: message,
                title: "HiCoach",
                request_id: req.body.id,
                message: message,
                sender_image: `${req.session.admin.image || ""}`,
                sender_id: `${req.session.admin.id}`,
                sender_name: `${req.session.admin.first_name || ""} ${req.session.admin.last_name || ""
                    }`,
                type: 10,
            };

            // Send notifications to the coach if enabled
            if (user_data?.notify_class_requests === "yes") {
                helper.sendPushNotification(user_data.device_token, ndata);
            } else {
                console.log(
                    `Notification turned off for user_id: ${user_data?.id || "unknown"}`
                );
            }

            // If the update is successful, send a success response
            if (find_status[0] > 0) {
                return res.json({ success: true }); // Send success flag back
            } else {
                return res.status(400).json({ success: false, message: "User not found or no changes made." });
            }
        } catch (error) {
            console.log(error);
            return helper.error(res, error); // Handle errors
        }
    },

    deletedstudent: async (req, res) => {
        try {
            let deletedTime = sequelize.literal('CURRENT_TIMESTAMP')
            const userdelete = await users.update({ deletedAt: deletedTime }, {
                where: {
                    id: req.body.id
                }
            })
            res.send(true)
        } catch (error) {
            return helper.error(res, error)
        }
    },
    studentedit: async (req, res) => {
        try {
            if (!req.session.admin) return res.redirect("/admin/login");
            let session = req.session.admin
            const userview = await users.findOne({
                attributes: {
                    include: [

                        [
                            sequelize.literal(
                                `(SELECT SUM(amount) FROM transactions Where transactions.user_id = users.id )`,
                            ),
                            "total_spend"
                        ]
                    ]
                },
                where: {
                    id: req.params.id
                }
            })
            res.render('Admin/student/edit', { userview, session, title })
        } catch (error) {
            return helper.error(res, error)

        }
    },
    studentviewupdate: async (req, res) => {
        try {


            let folder = "users"
            if (req.files && req.files.image) {
                let images = await helper.fileUpload(req.files.image, folder)
                req.body.image = images
            }


            const upadteCategory = await users.update(req.body, {
                where: {
                    id: req.params.id
                }
            })
            req.flash('success', 'Student update succesfully');
            res.redirect(`/admin/studentlisting`);

        } catch (error) {
            console.log(error, ">>>>>ERORR>>");
        }
    },
}