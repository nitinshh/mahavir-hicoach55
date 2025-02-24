
const helper = require('../helpers/helper')
var CryptoJS = require("crypto-js");
const db = require('../models')
const ENV = process.env
const users = db.users
const Transactions = db.transactions
const bookings = db.bookings
var sequelize = require('sequelize');
const Op = sequelize.Op
const title = "coach"

const packages = db.packages
const user_languages = db.user_languages
const user_cerificates = db.user_cerificates
const coach_schedule_days = db.coach_schedule_days
const coach_schedule_times = db.coach_schedule_times
const user_sports = db.user_sports
const sports = db.sports
const coaching_experience = db.coaching_experience
const playing_experience = db.playing_experience




// Helper function to format dates as "YYYY-MM-DD"
async function formatDate(date) {
    const year = await date.getFullYear();
    const month = String(await date.getMonth() + 1).padStart(2, '0');
    const day = String(await date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Current date
var currentDate = new Date();



users.hasMany(packages, {
    foreignKey: "user_id",
    as: "package_details",
});
users.hasMany(user_languages, {
    foreignKey: "user_id",
    as: "language_details",
});
users.hasMany(user_cerificates, {
    foreignKey: "user_id",
    as: "cerificates_details",
});
coach_schedule_days.hasMany(coach_schedule_times, {
    foreignKey: "coach_schedule_day_id",
    as: "times_details",
});




users.hasMany(user_sports, {
    foreignKey: "user_id",
    as: "user_sports_details",
});

user_sports.belongsTo(sports, {
    foreignKey: "sport_id",
    as: "sports_details",
});

module.exports = {
    coach: async (req, res) => {
        try {
            if (!req.session.admin) return res.redirect("/admin/login");
            let session = req.session.admin
            let coach_schedule_day = await coach_schedule_days.findAll()

            res.render('Admin/coach/add', { session, title, coach_schedule_day })
        } catch (error) {
            return helper.error(res, error)
        }
    },
    coachadd: async (req, res) => {
        try {


            const find_name = await users.findOne({
                where: {
                    email: req.body.email,
                    role: 2
                }
            })
            let Encrypt_data = CryptoJS.AES.encrypt(JSON.stringify(req.body?.password), ENV.crypto_key).toString();
            req.body.password = Encrypt_data

            if (find_name) {
                req.flash('error', 'This coach alredy exit ');
                res.redirect(`back`);
            } else {
                let folder = "users"
                if (req.files && req.files.image) {
                    let Image = await helper.fileUpload(req.files.image, folder)
                    req.body.image = Image
                }

                if (req.files && req.files.cover_video) {
                    let Cover_video = await helper.fileUpload(req.files.cover_video, folder)
                    req.body.cover_video = Cover_video
                }

                req.body.role = 2
                const createcoach = await users.create(req.body)

                let find_coach = await users.findOne({
                    where: {
                        id: createcoach.dataValues.id
                    },
                    raw: true,
                    nest: true
                })
                //  >>>>>>>>>>>>>>>>>>>>>>>>>>>  Language  >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> //

                // let Language = Array.isArray(req.body.language) ? req.body.language : [req.body.language];
                // Promise.all(
                //     Language.map(async (lng) => {
                //         let data_lng = {
                //             user_id: find_coach.id,
                //             language: lng
                //         }
                //         const userdelete = await user_languages.create(data_lng)
                //     })
                // )
                //  >>>>>>>>>>>>>>>>>>>>>>>>>>>  document  >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> //

                // if (req.files && req.files.document) {
                //     let documentImages = Array.isArray(req.files.document) ? req.files.document : [req.files.document];

                //     Promise.all(
                //         documentImages.map(async (doc) => {
                //             let doc_img = await helper.fileUpload(doc, folder)
                //             let doc_data = {
                //                 user_id: find_coach.id,
                //                 document: doc_img
                //             }
                //             const userdelete = await user_cerificates.create(doc_data)
                //         })
                //     )
                // }
                //  >>>>>>>>>>>>>>>>>>>>>>>>>>>  coach_schedule_days   >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> //
                // let days_array = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                // for (let i = 0; i < days_array.length; i++) {
                //     var element = days_array[i];
                //     let data = {
                //         user_id: find_coach.id,
                //         name: element,
                //         day: i + 1
                //     }
                //     const coach_schedule_day = await coach_schedule_days.create(data)
                // }
                //  >>>>>>>>>>>>>>>>>>>>>>>>>>>  create_sport   >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> //
                // let find_sports = await sports.findAll()
                // let Sport = find_sports[0].dataValues.id
                // let create_sport = await user_sports.create({ user_id: find_coach.id, sport_id: Sport })
                req.flash('success', 'This Coach add succesfully ');
                res.redirect('/admin/caochlisting');
            }
        } catch (error) {
            console.log(error, ">>>>>>");
            return helper.error(res, error)
        }
    },
    Caochlisting: async (req, res) => {
        try {
            if (!req.session.admin) return res.redirect("/admin/login");
    

            const find_user = await users.findAll({
                attributes: {
                    include: [
                        [
                            sequelize.literal(
                                `(SELECT Count(*) FROM bookings WHERE bookings.coach_id = users.id )`,
                            ),
                            "total_booking"
                        ],
                        [
                            sequelize.literal(
                                `(SELECT COALESCE(SUM(coach_amount), 0) FROM transactions WHERE transactions.coach_id = users.id )`,
                            ),
                            "total_earning"
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
                    deletedAt: null, role: 2, is_verified: 2
                },
                order: [['id', 'DESC']],
                raw: true,
                nest: true
            });

            const total_earning_all_coaches = find_user.reduce((acc, user) => acc + parseFloat(user.total_earning || 0), 0);
    

            const find_retention = await users.count({
                where: {
                    deletedAt: null, role: 2, status: 0
                }
            });
    
            const retention_data = find_user.length > 0 ? ((find_retention / find_user.length) * 100).toFixed(2) : 0;
    
            let session = req.session.admin;
            res.render('Admin/coach/listing', { session, find_user, total_earning_all_coaches, retention_data, title: "Coach Listing" });
    
        } catch (error) {
            return helper.error(res, error);
        }
    },
    
    verify_request: async (req, res) => {
        try {
            if (!req.session.admin) return res.redirect("/admin/login");

            const find_user = await users.findAll({
                attributes: {
                    include: [
                        [
                            sequelize.literal(
                                `(SELECT Count(*) FROM bookings WHERE bookings.coach_id = users.id )`,
                            ),
                            "total_booking"
                        ],
                        [
                            sequelize.literal(
                                `(SELECT COALESCE(SUM(coach_amount), 0) FROM transactions WHERE transactions.coach_id = users.id )`,
                            ),
                            "total_earning"
                        ]
                    ]
                },
                where: {
                    deletedAt: null, role: 2, is_verified: [0,1]
                },
                order: [['id', 'DESC']],
                raw: true,
                nest: true
            });

            const total_earning_all_coaches = find_user.reduce((acc, user) => acc + parseFloat(user.total_earning || 0), 0);
    

            const find_retention = await users.count({
                where: {
                    deletedAt: null, role: 2, status: 0
                }
            });
    
            const retention_data = find_user.length > 0 ? ((find_retention / find_user.length) * 100).toFixed(2) : 0;
    
            let session = req.session.admin;
            res.render('Admin/coach/verify_request', { session, find_user, total_earning_all_coaches, retention_data, title: "Coach Listing1" });
        } catch (error) {
            return helper.error(res, error)
        }
    },
    Caochview: async (req, res) => {
        try {
            if (!req.session.admin) return res.redirect("/admin/login");
            let session = req.session.admin



            const userview = await users.findOne({
                include: [
                    {
                        model: packages,
                        as: "package_details"
                    },
                    {
                        model: user_languages,
                        as: "language_details"
                    },
                    {
                        model: user_cerificates,
                        as: "cerificates_details"
                    },
                    {
                        model: user_sports,
                        as: "user_sports_details",
                        include: [{
                            model: sports,
                            as: "sports_details"
                        }]
                    },

                ],
                attributes: {
                    include: [
                        
                        [
                            sequelize.literal(
                                `(SELECT Count(*) FROM bookings Where bookings.coach_id = users.id And bookings.booking_status = 3 )`,
                            ),
                            "cancel_booking"
                        ],
                        [
                        sequelize.literal(
                            `(SELECT Count(*) FROM bookings Where bookings.coach_id = users.id )`,
                        ),
                        "total_booking"
                    ],
                    [
                        sequelize.literal(
                            `(SELECT SUM(coach_amount) FROM transactions Where transactions.coach_id = users.id )`,
                        ),
                        "total_earning"
                    ]

                    ]
                },
                where: {
                    id: req.params.id
                },
                // raw:true,
                // nest:true
            })
            // console.log(userview,">>>>>>>>>>userview>>>>>>>");
            // return

            const nextDayDate = new Date();
            nextDayDate.setDate(currentDate.getDate() + 1);
            // Last week's date
            const lastWeeklyDate = new Date();
            lastWeeklyDate.setDate(currentDate.getDate() - 7);
            // Last month's start and end dates
            const lastMonthlyDate = new Date();
            lastMonthlyDate.setMonth(currentDate.getMonth() - 1);
            // Start of last month
            const startOfLastMonth = new Date(lastMonthlyDate.getFullYear(), lastMonthlyDate.getMonth(), 1);
            // End of last month
            const endOfLastMonth = new Date(lastMonthlyDate.getFullYear(), lastMonthlyDate.getMonth() + 1, 0);
            // Last year's start and end dates
            const lastYearlyDate = new Date();
            lastYearlyDate.setFullYear(currentDate.getFullYear() - 1);
            // Start of last year
            const startOfLastYear = new Date(lastYearlyDate.getFullYear(), 0, 1);
            // End of last year
            const endOfLastYear = new Date(lastYearlyDate.getFullYear(), 11, 31);


            const Type = req.query.type
            var whereTranstion = {}
            var attributed = {}
            if (Type == 1) {
                // Montly Type == 1 NOT for net a current date 
                var last_date = await formatDate(startOfLastMonth);
                var next_date = await formatDate(endOfLastMonth);
                whereTranstion = {
                    deletedAt: null,
                    coach_id: req.params.id,
                    createdAt: {
                        [Op.between]: [last_date, next_date]
                    }
                }
                attributed = {
                    include: [
                        [
                            sequelize.literal(
                                `(SELECT SUM(coach_amount) FROM transactions WHERE coach_id = ${req.params.id} AND created_at BETWEEN '${last_date}' AND '${next_date}')`
                            ),
                            "total_earning"
                        ]
                    ]
                }
            } else if (Type == 2) {
                // Years Type == 2
                var last_date = await formatDate(startOfLastYear)
                var next_date = await formatDate(endOfLastYear)
                whereTranstion = {
                    deletedAt: null,
                    coach_id: req.params.id,
                    createdAt: {
                        [Op.between]: [last_date, next_date]
                    }
                }
                attributed = {
                    include: [
                        [
                            sequelize.literal(
                                `(SELECT SUM(coach_amount) FROM transactions WHERE coach_id = ${req.params.id} AND created_at BETWEEN '${last_date}' AND '${next_date}')`
                            ),
                            "total_earning"
                        ]
                    ]
                }
            } else if (Type == 3) {
                // Weeks Type == 3
                console.log();
                var last_date = await formatDate(lastWeeklyDate)
                var next_date = await formatDate(nextDayDate)
                whereTranstion = {
                    deletedAt: null,
                    coach_id: req.params.id,
                    createdAt: {
                        [Op.between]: [last_date, next_date]
                    }
                }

                attributed = {
                    include: [
                        [
                            sequelize.literal(
                                `(SELECT SUM(coach_amount) FROM transactions WHERE coach_id = ${req.params.id} AND created_at BETWEEN '${last_date}' AND '${next_date}')`
                            ),
                            "total_earning"
                        ]
                    ]
                }
            } else {
                whereTranstion = {
                    deletedAt: null,
                    coach_id: req.params.id,
                }
                attributed = {
                    include: [
                        [
                            sequelize.literal(
                                `(SELECT SUM(coach_amount) FROM transactions WHERE coach_id = ${req.params.id})`
                            ),
                            "total_earning"
                        ]
                    ]
                }
            }
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
                attributes: attributed,
                where: whereTranstion
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
                    coach_id: req.params.id
                },
                raw: true, nest: true
            })
            const coach_schedule_day = await coach_schedule_days.findAll({
                include: [

                    {
                        model: coach_schedule_times,
                        as: "times_details"
                    },
                ],
                where: {
                    user_id: req.params.id
                },
                // raw:true,nest:true
            })

            // var bytes = CryptoJS.AES.decrypt(userview.password, ENV.crypto_key);
            // let Decrypt_data = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
            // console.log(coach_schedule_time,">>>>>BACKEND DATA >>>>");

            res.render('Admin/coach/view', { coach_schedule_day, userview, find_transaction, find_bookings,session, title })
        } catch (error) {
            console.log(error, ">>>>error>>>");
            return helper.error(res, error)

        }
    },
    
    Coachedit: async (req, res) => {
        try {
            if (!req.session.admin) return res.redirect("/admin/login");
            let session = req.session.admin


            const userview = await users.findOne({
                include: [
                    {
                        model: packages,
                        as: "package_details"
                    },
                    {
                        model: user_languages,
                        as: "language_details"
                    },
                    {
                        model: user_cerificates,
                        as: "cerificates_details"
                    }
                ],
                where: {
                    id: req.params.id
                }
            })
            res.render('Admin/coach/edit', { userview, session, title })
        } catch (error) {
            return helper.error(res, error)

        }
    },
    caochviewupdate: async (req, res) => {
        try {


            let folder = "users"
            if (req.files && req.files.image) {
                let images = await helper.fileUpload(req.files.image, folder)
                req.body.image = images
            }
            if (req.files && req.files.cover_video) {
                let cover_video_image = await helper.fileUpload(req.files.cover_video, folder)
                req.body.cover_video = cover_video_image
            }


            const upadteCategory = await users.update(req.body, {
                where: {
                    id: req.params.id
                }
            })
            req.flash('success', 'Coach update succesfully');
            res.redirect(`/admin/caochlisting`);

        } catch (error) {
            console.log(error, ">>>>>ERORR>>");
        }
    },
    Caoch_status: async (req, res) => {
        try {
            console.log(req.body, ">>>>>>>error>>>");
            const find_status = await users.update({ status: req.body.value,
                login_time:0
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
    deleted_Caoch: async (req, res) => {
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
    add_language: async (req, res) => {
        try {

            let user_Id = req.body.user_id
            let language = req.body.name

            const userdelete = await user_languages.create({
                language: language,
                user_id: user_Id
            })
            res.send(true)
        } catch (error) {
            return helper.error(res, error)
        }
    },

    add_document: async (req, res) => {
        try {
            let folder = "users"
            if (req.files && req.files.document) {
                // let documentImages = Array.isArray(req.files.document) ? req.files.document : [req.files.document];
                if (req.files && req.files.document) {
                    let document_image = await helper.fileUpload(req.files.document, folder)
                    req.body.document = document_image
                }
            }
            const userdelete = await user_cerificates.create(req.body)
            res.send(true)
        } catch (error) {
            console.log(error);
            return helper.error(res, error)
        }
    },

    deleted_language: async (req, res) => {
        try {
            let deletedTime = sequelize.literal('CURRENT_TIMESTAMP')
            const userdelete = await user_languages.update({ deletedAt: deletedTime }, {
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