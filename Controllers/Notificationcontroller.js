const helper = require('../helpers/helper')
var CryptoJS = require("crypto-js");
const db = require('../models')
const ENV = process.env
const users = db.users
const categories = db.categories
const games = db.games
const games_round = db.games_round
const subcategory = db.subcategory
const notifications = db.notifications

module.exports = {
    // Notification //
    Notification: async (req, res) => {
        try {

            let Role = req.query.role
            if (!req.session.admin) return res.redirect("/admin/login");
             const find_user = await users.findAll({
                where: {
                    deletedAt: null, role: Role
                },
                order:[["id","DESC"]],
            })
            let session = req.session.admin
            res.render("Admin/Notification/notification", { users: find_user,session,Role, title: "notification", })
        } catch (error) {
            console.log("error", error)
        }
    },
    // send_notification
    send_notification: async (req, res) => {
        try {
            let Message_data = req.body.msg;
            let all_ids = JSON.parse(req.body.ids).map(str => Number(str));

            let find_users = await users.findAll({
                where: {
                    id: all_ids
                },
                raw: true, nest: true
            });

            const admin = await users.findOne({
                where: { role: 0 },
                raw: true,
                nest: true
            });
    
            if (!admin) {
                return res.json({
                    success: false,
                    code: 400,
                    message: "Admin not found"
                });
            }

            for (const user of find_users) {
                if (!user) {
                    console.log(`No user found for id: ${user.id}`);
                    continue;
                }

                let ndata = {
                    msg: `Admin ${admin.first_name} ${admin.last_name} sent a new notification`,
                    title: "Notification",
                    message: Message_data,
                    sender_image: `${admin.image}`,
                    sender_id: `${admin.id}`,
                    sender_name: `${admin.first_name} ${admin.last_name}`,
                    type: 1,
                };

                let notification_data = {
                    sender_id: admin.id,
                    receiver_id: user.id,
                    message: Message_data,
                    notification_type:15,
                    
                };
                // SELECT `id`, `sender_id`, `receiver_id`, `request_id`, `notification_type`, `reason`, `start_time`, `end_time`, `date`, `title`, `body`, `data`, `created_at`, `updated_at`, `deleted_at` FROM `notifications` WHERE 1
                const Notification_create = await notifications.create(notification_data);
         
                if (user.notify_class_requests == "yes") {
                    console.log("Sending push notification to user:", user.id);
                    helper.sendPushNotification(user.device_token, ndata);
                } else {
                    console.log(`User ${user.id} has notifications disabled.`);
                }
            }
    
            res.json({
                success: true,
                code: 200,
                message: "Notifications sent successfully"
            });
        } catch (error) {
            console.log(error, ">>>>>>>>>>");
            res.json({
                success: false,
                code: 400,
                message: error.message || "An error occurred"
            });
        }
    },
    
}