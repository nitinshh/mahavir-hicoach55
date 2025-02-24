const db = require("../../models");
const envfile = process.env;
const cron = require('node-cron');
let CryptoJS = require("crypto-js");
const helper = require("../../helpers/helper");
const { Validator } = require("node-input-validator");
const sequelize = require("sequelize");
const { Op } = require('sequelize');
const { Attribute } = require("@aws-sdk/client-rekognition");
const moment = require('moment');
const { user_package } = require("./usersController");
const {
    users, coach_schedule_days, coach_schedule_times, cancel_reasons, classes, booking_cancels,
    class_invitation, notifications, bookings, packages, user_sports, sports,
    user_packages, user_saved_coahces, promote_slot
} = require("../../models");
const currentDate = new Date();
const formattedDate = currentDate.toISOString().split('T')[0]; // Output: '2025-02-05'
const currentTime = currentDate.toTimeString().slice(0, 5); // 'HH:MM' format
const formattedDate1 = `${('0' + currentDate.getDate()).slice(-2)}-${('0' + (currentDate.getMonth() + 1)).slice(-2)}-${currentDate.getFullYear()}`;
module.exports = {

    home_student: async (req, res) => {
        try {
            const currentDate = new Date();
            const formattedDate = `${('0' + currentDate.getDate()).slice(-2)}-${('0' + (currentDate.getMonth() + 1)).slice(-2)}-${currentDate.getFullYear()}`;
            const currentTime = currentDate.toTimeString().slice(0, 5); // 'HH:MM' format

            let upcoming_lessons = await bookings.findAll({
                include: [
                    {
                        model: users,
                        as: "coachDetails",
                        include: [
                            {
                                model: user_sports,
                                as: "user_sports_details",
                                required: false,
                                include: [{
                                    model: sports,
                                    as: "sports_details"
                                }]
                            },
                        ]
                    },
                    {
                        model: packages,
                        as: "packageDetails"
                    },
                ],
                where: {
                    user_id: req.auth.id,
                    [Op.or]: [
                        {
                            date: {
                                [Op.gt]: formattedDate
                            }
                        },
                        {
                            date: formattedDate,
                            start_time: {
                                [Op.gte]: currentTime
                            }
                        }
                    ]
                },
                limit: 5
            });
            let high_rated_coach = await users.findAll({
                attributes: [
                    [
                        sequelize.literal(
                            `(SELECT COALESCE(spend_time, 0) FROM complete_tasks WHERE userActivity.id = complete_tasks.task_id AND complete_tasks.date = '${req.body.date}')`
                        ),
                        'spend_time',
                    ],
                    [
                        sequelize.literal(
                            `(SELECT COALESCE(is_complete, 0) FROM complete_tasks WHERE userActivity.id = complete_tasks.task_id AND complete_tasks.date = '${req.body.date}')`
                        ),
                        'is_complete',
                    ],
                    `id`, `title`, `srNo`, `schedule_id`, `due_date`, `duration`, `status`, `is_pause`, `createdAt`, `updatedAt`, `deletedAt`
                ],
                where: {
                    role: 2
                },
                order: [
                    [sequelize.literal("rating_count"), "DESC"],
                    [sequelize.literal("avg_rating"), "DESC"]
                ],
                limit: 5
            });

            let hot_slot = await class_invitation.findAll({
                attributes: [
                    [
                        sequelize.literal(
                            `(SELECT CONCAT(users.first_name, ' ', users.last_name) 
                              FROM users 
                              INNER JOIN classes ON classes.coach_id = users.id 
                              WHERE class_invitation.class_id = classes.id)`
                        ),
                        "coach_name"
                    ],
                    [
                        sequelize.literal(
                            `(SELECT users.image 
                              FROM users 
                              INNER JOIN classes ON classes.coach_id = users.id 
                              WHERE class_invitation.class_id = classes.id)`
                        ),
                        "coach_image"
                    ],
                    [
                        sequelize.literal(
                            `(SELECT date 
                              FROM classes 
                              WHERE class_invitation.class_id = classes.id)`
                        ),
                        "date"
                    ],
                    [
                        sequelize.literal(
                            `(SELECT start_time 
                              FROM classes 
                              WHERE class_invitation.class_id = classes.id)`
                        ),
                        "start_time"
                    ],
                    [
                        sequelize.literal(
                            `(SELECT end_time
                              FROM classes 
                              WHERE class_invitation.class_id = classes.id)`
                        ),
                        "end_time"
                    ],
                    `id`, `class_id`, `student_id`, `is_accept`, `booking_id`, `class_status`, `created_at`, `updated_at`
                ],
                where: {
                    student_id: req.auth.id,
                },
                order: [
                    ["id", "DESC"],
                ],
                limit: 5
            });

            let obj = {
                upcoming_lessons: upcoming_lessons,
                hot_slot: hot_slot,
                high_rated_coach: high_rated_coach
            }
            return helper.success(res, "Get home data successfully", obj);
        } catch (error) {
            console.log(error);
            return helper.error403(res, error);
        }
    },
    upcoming_lessons: async (req, res) => {
        try {
            let { page = 1, limit = 10 } = req.query;
            page = parseInt(page);
            limit = parseInt(limit);
            const offset = (page - 1) * limit;

            let classes_today = await bookings.findAndCountAll({
                include: [
                    {
                        model: users,
                        as: "coachDetails",
                    },
                ],
                where: {
                    booking_status: 1,
                    user_id: req.auth.id,
                    [Op.or]: [
                        {

                            date1: {
                                [Op.gt]: new Date(formattedDate),  // Use a Date object for comparison
                            },
                        },
                        {

                            date1: {
                                [Op.eq]: new Date(formattedDate),  // Use a Date object for comparison
                            },

                            start_time: {
                                [Op.gte]: currentTime
                            }
                        }
                    ]
                },
                order: [
                    ["id", "DESC"],
                ],
                limit,
                offset,
            });

            const totalPages = Math.ceil(classes_today.count / limit);

            return helper.success(res, "Get today upcomming lessons successfully", {
                classes: classes_today.rows,
                currentPage: page,
                totalPages,
                totalClasses: classes_today.count,
            });

        } catch (error) {
            console.log(error);
            return helper.error403(res, error);
        }
    },
    hot_slot: async (req, res) => {
        try {

            let { page = 1, limit = 10 } = req.query;
            page = parseInt(page);
            limit = parseInt(limit);
            const offset = (page - 1) * limit;

            let find_booking = await bookings.findAll({
                where: {
                    user_id: req.auth.id,
                    deleted_at: null,
                },
                raw: true,
            });

            let those_user_save_coach = await user_saved_coahces.findAll({
                where: {
                    user_id: req.auth.id,
                },
                raw: true,
            });

            let ids = find_booking.map((e) => e.coach_id);
            let ids1 = those_user_save_coach.map((e) => e.coach_id);

            let combinedArray = [...new Set([...ids, ...ids1])];

            let find_promot_slot = await promote_slot.findAndCountAll({
                include: [
                    {
                        model: db.users,
                        as: "coachDetails1",
                    },
                    {
                        model: db.promote_slotes_times,
                        as: "promote_slot_data",
                    },
                ],
                where: {
                    coach_id: combinedArray,
                    date: formattedDate1,
                },
                limit: limit,
                offset: offset,
            });

            const totalPages = Math.ceil(find_promot_slot.count / limit);

            return helper.success(res, "Get hot slots successfully", {
                classes: find_promot_slot.rows,
                currentPage: page,
                totalPages,
                totalClasses: find_promot_slot.count,
            });

        } catch (error) {
            console.log(error);
            return helper.error403(res, error);
        }
    },

    high_rated_coach: async (req, res) => {
        try {
            let { page = 1, limit = 10, radius = 500 } = req.query; // Default radius is 50 km
            page = parseInt(page);
            limit = parseInt(limit);
            const offset = (page - 1) * limit;

            let high_rated_coach = await users.findAll({
                attributes: {
                    include: [
                        [
                            sequelize.literal(`
                                3959 * acos(
                                    cos(radians(${req.auth.latitude})) * 
                                    cos(radians(users.latitude)) * 
                                    cos(radians(${req.auth.longitude}) - radians(users.longitude)) + 
                                    sin(radians(${req.auth.latitude})) * 
                                    sin(radians(users.latitude))
                                )
                            `),
                            'distance'
                        ],
                        [
                            sequelize.literal(
                                `COALESCE((SELECT AVG(rating) FROM rating_reviews WHERE rating_reviews.coach_id = users.id), 0)`
                            ),
                            "avg_rating"
                        ],
                        [
                            sequelize.literal(
                                `COALESCE((SELECT COUNT(*) FROM rating_reviews WHERE rating_reviews.coach_id = users.id), 0)`
                            ),
                            "rating_count"
                        ],
                    ]
                },
                where: {
                    role: 2,
                },

                having: sequelize.literal(`
                    distance <= ${radius} AND 
                    COALESCE((SELECT AVG(rating) FROM rating_reviews WHERE rating_reviews.coach_id = users.id), 0) > 0
                `),
                order: [
                    [sequelize.literal("rating_count"), "DESC"],
                    [sequelize.literal("avg_rating"), "DESC"],
                    ["id", "DESC"]
                ],
                limit,
                offset,
            });

            return helper.success(res, "Get high-rated coaches successfully", {
                coaches: high_rated_coach,
                currentPage: page,
                totalPages: Math.ceil(high_rated_coach.length / limit),
                totalCoaches: high_rated_coach.length
            });

        } catch (error) {
            console.log(error);
            return helper.error403(res, error.message || "An error occurred");
        }
    },
    home_coach: async (req, res) => {
        try {
            let classes_today = await bookings.findAll({
                include: [
                    {
                        model: users,
                        as: "userDetails",
                    },
                ],
                where: {
                    booking_status: 1,
                    coach_id: req.auth.id,
                    [Op.or]: [
                        {

                            date1: {
                                [Op.gt]: new Date(formattedDate),  // Use a Date object for comparison
                            },
                        },
                        {
                            date1: {
                                [Op.eq]: new Date(formattedDate),  // Use a Date object for comparison
                            },
                            start_time: {
                                [Op.gte]: currentTime
                            }
                        }
                    ]
                },
                limit: 5
            });
            let cancel_class = await db.booking_cancels.findAll({
                include: [
                    {
                        model: db.users,
                        as: "userName",
                    },
                ],
                where: {
                    coach_id: req.auth.id,
                    status: 0,
                    type: 2

                },
                limit: 5,
            });

            let classes_request = await bookings.findAll({
                include: [
                    {
                        model: users,
                        as: "userDetails",
                    },
                ],
                where: {
                    booking_status: 3,
                    coach_id: req.auth.id,

                },
                limit: 5
            });
            let obj = {
                classes_today: classes_today,
                cancel_class: cancel_class,
                classes_request: classes_request
            }

            return helper.success(res, "Get slots successfully", obj);
        } catch (error) {
            console.log(error);
            return helper.error403(res, error);
        }
    },
    classes_today: async (req, res) => {
        try {
            let { page = 1, limit = 10 } = req.query;
            page = parseInt(page);
            limit = parseInt(limit);
            const offset = (page - 1) * limit;

            let classes_today = await bookings.findAndCountAll({
                include: [
                    {
                        model: users,
                        as: "userDetails",
                    },
                ],
                where: {
                    booking_status: 1,
                    coach_id: req.auth.id,
                    user_id: {
                        [Op.ne]: 0
                    },
                    date1: {
                        [Op.eq]: new Date(formattedDate),  // Use a Date object for comparison
                    },
                    start_time: {
                        [Op.gte]: currentTime
                    }

                },
                order: [
                    ["id", "DESC"],

                ],
                limit,
                offset,
            });

            const totalPages = Math.ceil(classes_today.count / limit);

            return helper.success(res, "Get today classes successfully", {
                classes: classes_today.rows,
                currentPage: page,
                totalPages,
                totalClasses: classes_today.count,
            });

        } catch (error) {
            console.log(error);
            return helper.error403(res, error);
        }
    },
    cancel_classes: async (req, res) => {
        try {

            let { page = 1, limit = 10 } = req.query;
            page = parseInt(page);
            limit = parseInt(limit);
            const offset = (page - 1) * limit;
            let cancel_classess = await bookings.findAndCountAll({
                include: [
                    {
                        model: users,
                        as: "userDetails",
                    },
                ],

                where: {
                    booking_status: 3,
                    coach_id: req.auth.id,

                },

                order: [
                    ["id", "DESC"],
                ],
                limit,
                offset,
            });
            const totalPages = Math.ceil(cancel_classess.count / limit);
            return helper.success(res, "Get cancel classes successfully", {
                classes: cancel_classess.rows,
                currentPage: page,
                totalPages,
                totalClasses: cancel_classess.count,
            });

        } catch (error) {
            console.log(error);
            return helper.error403(res, error);
        }
    },
    class_request: async (req, res) => {
        try {
            const currentDate = new Date();
            const formattedDate = `${('0' + currentDate.getDate()).slice(-2)}-${('0' + (currentDate.getMonth() + 1)).slice(-2)}-${currentDate.getFullYear()}`;
            const currentTime = currentDate.toTimeString().slice(0, 5); // 'HH:MM' format

            let { page = 1, limit = 10 } = req.query;
            page = parseInt(page);
            limit = parseInt(limit);
            const offset = (page - 1) * limit;

            let classes_request = await bookings.findAndCountAll({
                include: [
                    {
                        model: users,
                        as: "userDetails",
                    },
                ],
                where: {
                    booking_status: 0,
                    coach_id: req.auth.id,
                    user_id: {
                        [Op.ne]: 0
                    },
                    [Op.or]: [
                        {
                            date1: {
                                [Op.gt]: new Date(formattedDate),  // Use a Date object for comparison
                            },
                        },
                        {
                            date1: {
                                [Op.eq]: new Date(formattedDate),  // Use a Date object for comparison
                            },
                            start_time: {
                                [Op.gte]: currentTime
                            }
                        }
                    ]
                },
                order: [
                    ["id", "DESC"],
                ],
                limit,
                offset,
            });

            const totalPages = Math.ceil(classes_request.count / limit);

            return helper.success(res, "Get classes request successfully", {
                classes: classes_request.rows,
                currentPage: page,
                totalPages: totalPages > 0 ? totalPages : 1,
                totalClasses: classes_request.count,
            });

        } catch (error) {
            console.log(error);
            return helper.error403(res, error);
        }
    }




}