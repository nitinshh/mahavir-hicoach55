const db = require("../../models");
const envfile = process.env;
const cron = require("node-cron");
let CryptoJS = require("crypto-js");
const helper = require("../../helpers/helper");
const { Validator } = require("node-input-validator");
const sequelize = require("sequelize");
const { Op } = require("sequelize"); // Import Sequelize operators for comparisons
const { Attribute } = require("@aws-sdk/client-rekognition");
const moment = require("moment"); // Assuming you're using Moment.js for date handling
const { user_package } = require("./usersController");
const transactions = require("../../models/transactions");
const stripe = require("stripe")(
  envfile.stripe
);
const publish_key = envfile.publish_key
const {
  users, coach_schedule_days, coach_schedule_times, cancel_reasons, classes, booking_cancels,
  class_invitation, notifications, bookings, packages, user_sports, sports,
  user_packages, sockets, booking_slotes
} = require("../../models");
const { payment } = require("paypal-rest-sdk");
let deletedTime = sequelize.literal("CURRENT_TIMESTAMP");
bookings.belongsTo(users, {
  foreignKey: "coach_id",
  as: "coachDetails",
});
bookings.belongsTo(users, {
  foreignKey: "user_id",
  as: "userDetails",
});
bookings.belongsTo(packages, {
  foreignKey: "package_id",
  as: "packageDetails",
});
bookings.belongsTo(classes, {
  foreignKey: "class_id",
  as: "classDetails",
});
users.hasMany(coach_schedule_days, {
  foreignKey: "user_id",
  as: "days",
});
users.hasMany(bookings, {
  foreignKey: "coach_id",
  as: "bookingData",
});
bookings.hasMany(booking_slotes, {
  foreignKey: "booking_id",
  as: "slot_time",
});
const currentDate = new Date();
const formattedDate1 = `${("0" + currentDate.getDate()).slice(-2)}-${(
  "0" +
  (currentDate.getMonth() + 1)
).slice(-2)}-${currentDate.getFullYear()}`;
const formattedDate = currentDate.toISOString().split('T')[0]; // Output: '2025-02-05'
const currentTime = new Date().toTimeString().slice(0, 5); // 'HH:MM' format
const updateBookingStatus = async () => {
  try {

     ///
    const updatedExpiredBookings = await bookings.update(
      {
        booking_status: 2, // Complete
      },
      {
        where: {
          date1: {
            [Op.lt]: new Date(formattedDate),  // Use a Date object for comparison
          },
          booking_status: [0, 1],
          payment_status: 1,
        },
      }
    );
    const updatedSameDayExpiredBookings = await bookings.update(
      {
        booking_status: 2, // Complete
      },
      {
        where: {

          date1: {
            [Op.eq]: new Date(formattedDate),  // Use a Date object for comparison
          },
          end_time: {
            [Op.lt]: currentTime,
          },
          booking_status: [0, 1],
          payment_status: 1,
        },
      }
    );
    const updatedBookings_cancel = await bookings.update(
      {
        booking_status: 3, // Canceled
      },
      {
        where: {

          date1: {
            [Op.lte]: new Date(formattedDate),  // Use a Date object for comparison
          },
          end_time: {
            [Op.lt]: currentTime,
          },
          booking_status: 0,
          payment_status: 0,
        },
      }
    );

  } catch (error) {
    console.error("Error in the cron job:", error);
  }
};

// Schedule the task to run every 5 minutes
cron.schedule("*/2 * * * *", async () => {
  console.log("Cron job triggered: Running every 5 minutes");
  await updateBookingStatus();
});

////booking cancel///
cron.schedule("1 0 * * *", async () => {
  // console.log("Cron job triggered: Running every 1 minutes");
  try {
    let currentDate = new Date();
    let formattedDate = ("0" + currentDate.getDate()).slice(-2) + "-" +
      ("0" + (currentDate.getMonth() + 1)).slice(-2) + "-" +
      currentDate.getFullYear();

    let find_booking = await bookings.findAll({
      where: {
        booking_status: 3,
        is_reccuring: 2,
        cancel_reacuring_removal_date: formattedDate // Use formattedDate in DD-MM-YYYY format
      }
    });

    for (let booking of find_booking) {
      await bookings.update(
        {
          booking_status: 1,
          cancel_reacuring_removal_date: 0 // Set to null for better handling
        },
        {
          where: {
            id: booking.id
          }
        }
      );

      await booking_cancels.destroy({
        where: {
          booking_id: booking.id
        }
      });
    }

    res.status(200).json({
      success: true,
      message: "Bookings and cancel requests processed successfully"
    });
  } catch (error) {
    return helper.error403(res, error.message);
  }
});

///  1 hr before send push  notifications per minute//
cron.schedule("* * * * *", async () => {
  try {
    const currentTime = new Date();
    const oneHourLater = new Date(currentTime.getTime() + 60 * 60 * 1000);
    const formattedTime = oneHourLater.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });  // 'HH:mm' format

    let find_booking = await bookings.findAll({
      where: {
        booking_status: 1,
        payment_status: 1,
        date1: {
          [Op.eq]: new Date(formattedDate),

        },
        start_time: {
          [Op.eq]: formattedTime,
        },
      },
    });
    if (find_booking.length > 0) {

      for (const booking of find_booking) {
        let coach = await users.findOne({
          where: {
            id: booking.coach_id,
          },
          raw: true,
        });
        
        let student = await users.findOne({
          where: {
            id: booking.user_id,
          },
          raw: true,
        });

        let convertedTime = moment(booking.start_time, "HH:mm").format("hh:mm A");
        if (coach.notify_class_requests == "yes") {
   
          let ndata = {
            msg: `Reminder: Class with ${student.full_name} will start in 1 hour at ${convertedTime}  `,
            title: "HiCoach",
            request_id: booking.id,
            message: `Reminder: Class with ${student.full_name} will start in 1 hour at ${convertedTime} `,
            sender_image: ``,
            sender_id: ``,
            sender_name: ``,
            type: 12,
          };
          helper.sendPushNotification(coach.device_token, ndata);
        } else {
          console.log(
            `Notification turned off for user_id: ${coach?.id || "unknown"}`
          );
        }

        if (student.notify_class_requests == "yes") {

          let ndata = {
            msg: `Reminder: Class with ${coach.full_name} will start in 1 hour at ${convertedTime} `,
            title: "HiCoach",
            request_id: booking.id,
            message: `Reminder: Class with ${coach.full_name} will start in 1 hour at ${convertedTime}`,
            sender_image: ``,
            sender_id: ``,
            sender_name: ``,
            type: 12,
          };
          helper.sendPushNotification(student.device_token, ndata);
        } else {
          console.log(
            `Notification turned off for user_id: ${student?.id || "unknown"}`
          );
        }
      }
    } else {
      console.log('No bookings found for the specified time.');
    }

  } catch (error) {

    return helper.error403(res, error.message);
  }
});
module.exports = {
  add_booking: (io) => {
    return async (req, res) => {
      try {

        const v = new Validator(req.body, {
          coach_id: "required|integer",
          location: "required|string",
          latitude: "required|numeric",
          longitude: "required|numeric",
          is_repeat: "required|integer",
          price: "required|numeric",
          start_time: "required", // HH:mm format
          end_time: "required", // HH:mm format
          date: "required", // In DD-MM-YYYY format
        });

        let errorsResponse = await helper.checkValidation(v);
        if (errorsResponse) {
          return helper.error403(res, errorsResponse);
        }

        const [day, month, year] = req.body.date.split("-");
        const formattedDated = `${day}-${month}-${year}`;
        const isoDate = `${year}-${month}-${day}`;

        const coach = await users.findOne({
          where: { id: req.body.coach_id },
          raw: true,
        });
        if (!coach) {
          return helper.error403(res, "Coach not found");
        }
        let startTime = new Date(`${isoDate}T${req.body.start_time}:00`);
        let endTime = new Date(`${isoDate}T${req.body.end_time}:00`);

        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
          return helper.error403(res, "Invalid start_time or end_time format");
        }

        let durationInHours = (endTime - startTime) / (1000 * 60 * 60);
        if (durationInHours <= 0) {
          return helper.error403(res, "End time must be after start time");
        }

        if (req.body.package_id != 0) {
          let find_package = await user_packages.findOne({
            where: {
              package_id: req.body.package_id,
              user_id: req.auth.id,
            },
            raw: true,
          });

          if (!find_package) {
            return helper.error403(res, "User has not purchased this package");
          }

          let remainingCredits = find_package.credits - durationInHours;
          if (remainingCredits < 0) {
            return helper.error403(
              res,
              "Insufficient credit points in this package"
            );
          }

          await user_packages.update(
            { credits: remainingCredits },
            {
              where: {
                package_id: req.body.package_id,
                user_id: req.auth.id,
              },
            }
          );
        }
        const newBooking = await bookings.create({
          coach_id: req.body.coach_id,
          user_id: req.auth.id,
          package_id: req.body.package_id || 0,
          location: req.body.location,
          latitude: req.body.latitude,
          longitude: req.body.longitude,
          is_reccuring: req.body.is_repeat,
          price: req.body.price,
          booking_type: "slot",
          start_time: req.body.start_time,
          end_time: req.body.end_time,
          time_in_hr: durationInHours,
          date: formattedDated,
          date1: formattedDated.split('-').reverse().join('-')
        });

        let slotesArray;
        try {
          slotesArray = JSON.parse(req.body.slotes);
        } catch (error) {
          slotesArray = req.body.slotes
            .replace(/(\d{2}:\d{2}-\d{2}:\d{2})/g, '"$1"')
            .replace(/'/g, '"');
          slotesArray = JSON.parse(slotesArray);
        }

        for (let slot of slotesArray) {
          let [start_time, end_time] = slot.split("-");

          const booking_slotes_add = await booking_slotes.create({
            booking_id: newBooking.id,
            start_time: start_time.trim(),
            end_time: end_time.trim(),
            date: formattedDated,
          });
        }

        if (req.body.package_id != 0) {
          let ndata = {
            msg: `${req.auth.first_name} ${req.auth.last_name} created a new booking`,
            title: "HiCoach",
            request_id: newBooking.id,
            message: `${req.auth.first_name} ${req.auth.last_name} created a new booking`,
            sender_image: `${req.auth.image}`,
            sender_id: `${req.auth.id}`,
            sender_name: `${req.auth.first_name} ${req.auth.last_name} `,
            type: 5,
          };

          if (coach.notify_class_requests == "yes") {

            helper.sendPushNotification(coach.device_token, ndata);
          } else {
            console.log(`Notification turned off for user_id: ${coach.id}`);
          }
          await notifications.create({
            request_id: newBooking.id,
            sender_id: req.auth.id,
            receiver_id: req.body.coach_id,
            notification_type: 5,
            title: "New Booking",
            body: `${req.auth.first_name} ${req.auth.last_name} created a new booking`,
            data: JSON.stringify({ booking_id: newBooking.id }),
          });
          let find_receiver_socket = await sockets.findOne({
            where: {
              user_id: req.body.coach_id,
            },
            raw: true,
          });

          let success_message = {
            success_message: "Booking created successfully",
            data: newBooking,
          };

          if (find_receiver_socket && find_receiver_socket.socket_id) {
            io.to(find_receiver_socket.socket_id).emit(
              "class_request",
              success_message
            );
          }
        }
        return helper.success(res, "Booking created successfully", newBooking);
      } catch (error) {
        console.error("Error in add_booking:", error);
        return helper.error403(res, error.message);
      }
    };
  },
  accept_reject_booking: (io) => {

    return async (req, res) => {
      try {
        const v = new Validator(req.body, {
          booking_id: "required",
          status: "required",
        });

        let errorsResponse = await helper.checkValidation(v);
        if (errorsResponse) {
          return helper.error403(res, errorsResponse);
        }

        let find_request = await bookings.findOne({
          attributes: {
            include: [
              [
                sequelize.literal(`(SELECT COALESCE(transaction_id, 0) FROM transactions WHERE transactions.booking_id = bookings.id LIMIT 1)`), 'transaction_id'
              ],
              [
                sequelize.literal(`(SELECT COALESCE(net_amount, 0) FROM transactions WHERE transactions.booking_id = bookings.id LIMIT 1)`), 'net_amount'
              ]
            ]
          },
          where: {
            id: req.body.booking_id,
          },
          raw: true,
        });

        if (find_request == null) {
          return helper.error403(res, "request not found", {});
        }
        let update_status = await bookings.update(
          {
            booking_status: req.body.status,
          },
          {
            where: {
              id: req.body.booking_id,
            },
          }
        );

        let message = "";

        if (req.body.status == 1) {
          message = "accepted";
          const find_other_bookings = await bookings.findAll({
            where: {
              start_time: find_request.start_time,
              coach_id: find_request.coach_id,
              date: find_request.date,
              id: { [Op.not]: find_request.id },
              payment_status: 0

            },
            raw: true,
          });

          const userIds = find_other_bookings.map((booking) => booking.user_id);
          const bookingIds = find_other_bookings.map((booking) => booking.id);

          await bookings.update(
            { booking_status: 1 },
            {
              where: {
                id: bookingIds,
              },
            }
          );

          for (const [index, userId] of userIds.entries()) {
            try {
              const find_user_data = await users.findOne({
                where: { id: userId },
                raw: true,
              });

              const ndata = {
                msg: `${req.auth.first_name} ${req.auth.last_name} rejected your booking request`,
                title: "HiCoach",
                request_id: bookingIds[index],
                message: `${req.auth.first_name} ${req.auth.last_name} rejected your booking request`,
                sender_image: req.auth.image,
                sender_id: req.auth.id,
                sender_name: `${req.auth.first_name} ${req.auth.last_name}`,
                type: 3,
              };

              if (find_user_data.notify_class_requests === "yes") {
                await helper.sendPushNotification(find_user_data.device_token, ndata);
              } else {
                console.log(`Notification turned off for user_id: ${find_user_data.id}`);
              }

              console.log(`Push notification sent to user ID: ${userId}`);
            } catch (error) {
              console.error(`Failed to send push notification to user ID: ${userId}`, error);
            }
          }

          console.log("All operations completed");

        } else if (req.body.status == 5) {

          message = "rejected";
          if (find_request.package_id != 0) {
            let find_pakage = await user_packages.findOne({
              where: {
                package_id: find_request.package_id,
                user_id: find_request.user_id,
              },
              raw: true,
            });

            if (!find_pakage) {
              return helper.error403(res, "User has not purchased this package");
            }

            let updatedCredits = find_pakage.credits + find_request.time_in_hr;
            await user_packages.update(
              { credits: updatedCredits },
              {
                where: {
                  id: find_pakage.id
                },
              }
            );
          }
          ///####
          // const refund = await stripe.refunds.create({
          //   charge: 'ch_1NirD82eZvKYlo2CIvbtLWuY',
          // });

          ///####
          //  else {
          //   const refund = await stripe.refunds.create({
          //     payment_intent: find_request.transction_id,
          //     amount: find_request.net_amount,
          //   });
          // }
        }

        let userdata = await users.findOne({
          where: {
            id: find_request.user_id,
          },
          raw: true,
        });

        let ndata = {
          msg: `${req.auth.first_name} ${req.auth.last_name} ${message} your booking request`,
          title: "HiCoach",
          request_id: req.body.booking_id,
          message: `${req.auth.first_name} ${req.auth.last_name} ${message} your booking request`,
          sender_image: `${req.auth.image}`,
          sender_id: `${req.auth.id}`,
          sender_name: `${req.auth.first_name} ${req.auth.last_name} `,
          type: 3,
        };

        if (userdata.notify_class_requests == "yes") {

          helper.sendPushNotification(userdata.device_token, ndata);
        } else {
          console.log(`Notification turned off for user_id: ${userdata.id}`);
        }
        let noti_destroy = await notifications.destroy({
          where: {
            request_id: req.body.booking_id,
          },
        });

        let message2 = req.body.status == 1 ? "accepted" : "rejected";

        let notificationCreate = await notifications.create({
          request_id: req.body.booking_id,
          sender_id: req.auth.id,
          receiver_id: find_request.user_id,
          notification_type: 3,
          title: `Booking ${message2}`,
          body: `${req.auth.first_name} ${req.auth.last_name} has ${message2} your booking request`,
          data: "",
        });

        let find_receiver_socket = await sockets.findOne({
          where: {
            user_id: req.auth.id,
          },
          raw: true,
        });

        let success_message = {
          success_message: "Booking accepted / rejected successfully",
          data: find_request,
        };

        if (find_receiver_socket && find_receiver_socket.socket_id) {
          io.to(find_receiver_socket.socket_id).emit(
            "class_request",
            success_message
          );
          io.to(find_receiver_socket.socket_id).emit(
            "classes_today",
            success_message
          );
        }
        return helper.success(
          res,
          `Booking request ${message} successfully`,
          {}
        );
      } catch (error) {
        console.log("Error in accept_reject_class_request:", error);
        return helper.error403(res, error.message);
      }
    };
  },
  cancel_booking: (io) => {
    return async (req, res) => {
      try {
        const v = new Validator(req.body, {
          booking_id: "required",
          reason_id: "required",
        });

        let errorsResponse = await helper.checkValidation(v);
        if (errorsResponse) {
          return helper.error403(res, errorsResponse);
        }
        let find_request = await bookings.findOne({
          where: {
            id: req.body.booking_id,
          },
          raw: true,
        });

        if (!find_request) {
          return helper.error403(res, "Booking not found", {});
        }
        let find_reason = await cancel_reasons.findOne({
          where: {
            id: req.body.reason_id,
          },
          raw: true,
        });

        let reason_title = find_reason ? find_reason.title : "";
        var receiverId = 0;
        var type = 0;
        if (req.auth.role == 1) {
          receiverId = find_request.coach_id;
          type = 1;
        } else {
          receiverId = find_request.user_id;
          type = 2;
        }

        await booking_cancels.create({
          user_id: req.auth.id,
          booking_id: find_request.id,
          coach_id: find_request.coach_id,
          reason: reason_title,
          type: type,
          description: req.body.description || "",
        });
        function convertTo12HrFormat(time24) {
          const [hours, minutes] = time24.split(':');
          const suffix = hours >= 12 ? 'PM' : 'AM';
          const hours12 = hours % 12 || 12; // Converts 0 to 12 for midnight
          return `${hours12}:${minutes} ${suffix}`;
        }

        const startTime = find_request.start_time;
        const endTime = find_request.end_time;

        const startTime12Hr = convertTo12HrFormat(startTime);
        const endTime12Hr = convertTo12HrFormat(endTime);

        await notifications.create({
          sender_id: req.auth.id,
          request_id: find_request.id,
          receiver_id: receiverId,
          notification_type: 4,
          date: find_request.date,
          start_time: startTime12Hr,
          end_time: endTime12Hr,
          reason: find_reason ? find_reason.title : "",
          title: `${req.auth.first_name} ${req.auth.last_name} sent a cancel booking request`,
          data: "",
        });

        let message = "Booking 3cancellation request sent successfully";

        let find_receiver_socket = await users.findOne({
          attributes: {
            include: [
              [
                sequelize.literal(
                  `(SELECT socket_id FROM sockets WHERE users.id=sockets.user_id LIMIT 1)`
                ),
                "socket_id",
              ],
            ],
          },
          where: {
            id: receiverId,
          },
        });

        let success_message = {
          success_message: message,
          data: find_request,
        };

        if (find_receiver_socket && find_receiver_socket.socket_id) {
          io.to(find_receiver_socket.socket_id).emit(
            "cancel_classes",
            success_message
          );
          io.to(find_receiver_socket.socket_id).emit(
            "notificationlist",
            success_message
          );14
        }
        let ndata = {
          msg: `${req.auth.first_name} ${req.auth.last_name} sent a cancel booking request`,
          title: "HiCoach",
          request_id: req.body.booking_id,
          message: `${req.auth.first_name} ${req.auth.last_name} sent a cancel booking request`,
          sender_image: `${req.auth.image}`,
          sender_id: `${req.auth.id}`,
          sender_name: `${req.auth.first_name} ${req.auth.last_name}`,
          type: 4,
        };

        if (find_receiver_socket.notify_class_requests == "yes") {
          helper.sendPushNotification(find_receiver_socket.device_token, ndata);
        } else {
          console.log(
            `Notification turned off for user_id: ${find_receiver_socket.id}`
          );
        }
        return helper.success(res, message, {});
      } catch (error) {
        console.error("Error in cancel_booking:", error);
        return helper.error403(res, error.message);
      }
    };
  },
  accept_reject_cancel_request: (io) => {
    return async (req, res) => {
      try {
        const v = new Validator(req.body, {
          booking_cancel_id: "required",
          status: "required|integer|in:1,2", // 1=accept, 2=reject
        });

        let errorsResponse = await helper.checkValidation(v);
        if (errorsResponse) {
          return helper.error403(res, errorsResponse);
        }

        let cancel_request = await booking_cancels.findOne({
          attributes: {
            include: [
              [sequelize.literal(`(SELECT COALESCE(transaction_id, 0) FROM transactions WHERE transactions.booking_id = booking_cancels.booking_id)`), 'transction_id'],
              [sequelize.literal(`(SELECT COALESCE(net_amount, 0) FROM transactions WHERE transactions.booking_id = booking_cancels.booking_id)`), 'net_amount']
            ]
          },
          where: {
            booking_id: req.body.booking_cancel_id,
            status: 0,
          },
          raw: true,
        });

        if (!cancel_request) {
          return helper.error403(res, "Cancel request not found or already processed", {});
        }

        let msg = req.body.status == 1 ? "accepted" : "rejected";

        if (req.body.status == 1) {
          await bookings.update(
            {
              booking_status: 3, // Mark booking as canceled
              cancel_status: 1,  // Cancellation accepted
            },
            {
              where: {
                id: cancel_request.booking_id,
              },
            }
          );

          await booking_cancels.update(
            {
              status: req.body.status,
            },
            {
              where: {
                id: cancel_request.id,
              },
            }
          );
          // const refund = await stripe.refunds.create({
          //   payment_intent: cancel_request.transction_id,
          //   amount: cancel_request.net_amount,
          // });
        } else {
          let destroy_data = await booking_cancels.destroy({
            where: {
              id: cancel_request.id,
            },
          });
        }

        await notifications.destroy({
          where: {
            request_id: cancel_request.booking_id,
          },
        });

        await notifications.create({
          sender_id: req.auth.id,
          receiver_id: cancel_request.user_id,
          notification_type: 5,
          title: `Your cancellation request for booking has been ${msg}`,
          data: "",
        });

        let find_receiver_socket = await users.findOne({
          attributes: {
            include: [
              [
                sequelize.literal(
                  `(SELECT socket_id FROM sockets WHERE users.id = sockets.user_id LIMIT 1)`
                ),
                "socket_id",
              ],
            ],
          },
          where: {
            id: cancel_request.user_id,
          },
        });

        let success_message = {
          success_message: "Cancel request accepted/rejected by coach",
          data: notifications,
        };

        if (find_receiver_socket && find_receiver_socket.socket_id) {
          io.to(find_receiver_socket.socket_id).emit("home_student", success_message);
        }
        let message = `Cancel request ${msg.toLowerCase()} successfully`;

        let ndata = {
          msg: `Your cancellation request for booking has been ${msg} by ${req.auth.first_name} ${req.auth.last_name}`,
          title: "HiCoach",
          request_id: req.body.booking_cancel_id,
          message: `Your cancellation request for booking has been ${msg} by ${req.auth.first_name} ${req.auth.last_name}`,
          sender_image: `${req.auth.image}`,
          sender_id: `${req.auth.id}`,
          sender_name: `${req.auth.first_name} ${req.auth.last_name}`,
          type: 5,
        };

        if (find_receiver_socket.notify_class_requests === "yes") {
          helper.sendPushNotification(find_receiver_socket.device_token, ndata);
        } else {
          console.log(`Notification turned off for user_id: ${find_receiver_socket.id}`);
        }

        return helper.success(res, message, {});
      } catch (error) {
        console.error("Error in accept_reject_cancel_request:", error);
        return helper.error403(res, error.message);
      }
    };
  },
  cancel_booking_without_accept: (io) => {
    return async (req, res) => {
      try {
        const v = new Validator(req.body, {
          booking_id: "required",
        });

        let errorsResponse = await helper.checkValidation(v);
        if (errorsResponse) {
          return helper.error403(res, errorsResponse);
        }

        let find_request = await bookings.findOne({
          where: {
            id: req.body.booking_id,
          },
          raw: true,
        });

        if (!find_request) {
          return helper.error403(res, "Booking not found", {});
        }

        await bookings.update(
          {
            booking_status: 5,
            cancel_status: 1,
          },
          {
            where: {
              id: req.body.booking_id,
            },
          }
        );
        let message = "Booking cancellation successfully";
        let find_receiver_socket = await users.findOne({
          attributes: {
            include: [
              [
                sequelize.literal(
                  `(SELECT socket_id FROM sockets WHERE users.id = sockets.user_id LIMIT 1)`
                ),
                "socket_id",
              ],
            ],
          },
          where: {
            id: find_request.coach_id,
          }, raw: true
        });

        let success_message = {
          success_message: "Cancel request accepted/rejected by coach",
          data: {},
        };

        if (find_receiver_socket && find_receiver_socket.socket_id) {
          io.to(find_receiver_socket.socket_id).emit("class_request", success_message);
        }

        return helper.success(res, message, {});
      } catch (error) {
        console.error("Error in cancel_booking:", error);
        return helper.error403(res, error.message);
      }
    };
  },
  upcoming_booking: async (req, res) => {
    try {
    
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;
      const { count, rows: find_booking } = await bookings.findAndCountAll({
        include: [
          {
            model: booking_slotes,
            as: "slot_time",
          },
          {
            model: users,
            as: "coachDetails",
            include: [
              {
                model: user_sports,
                as: "user_sports_details",
                required: false,
                include: [
                  {
                    model: sports,
                    as: "sports_details",
                  },
                ],
              },
            ],
          },
          {
            model: packages,
            as: "packageDetails",
          },
        ],

        where: {
          booking_status: [0, 1],
          cancel_status: 0,
          user_id: req.auth.id,
          [Op.or]: [
            {

              date1: {
                [Op.eq]: new Date(formattedDate),  // Use a Date object for comparison
              },
              start_time: {
                [Op.gte]: currentTime,
              },
            },
            {
              date1: {
                [Op.gt]: new Date(formattedDate),  // Use a Date object for comparison
              },

            },
          ],
        },
        order: [
          ["date", "ASC"],
          ["start_time", "ASC"],
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      if (!find_booking.length) {
        return helper.success(res, "No upcoming bookings found", {});
      }

      const totalPages = Math.ceil(count / limit);
      return helper.success(res, "Upcoming bookings retrieved successfully", {
        bookings: find_booking,
        currentPage: parseInt(page),
        totalPages: totalPages,
        totalBookings: count,
      });
    } catch (error) {
      console.log(error);
      return helper.error403(res, error.message);
    }
  },
  upcoming_booking_coach: async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query; // Default values: page 1, limit 10
      const offset = (page - 1) * limit;
      const { count, rows: find_booking } = await bookings.findAndCountAll({
        include: [
          {
            model: users,
            as: "userDetails",
            include: [
              {
                model: user_sports,
                as: "user_sports_details",
                required: false,
                include: [
                  {
                    model: sports,
                    as: "sports_details",
                  },
                ],
              },
            ],
          },
          {
            model: packages,
            as: "packageDetails",
          },
          {
            model: booking_slotes,
            as: "slot_time",
          },

        ],

        where: {
          booking_status: 1,
          payment_status: 1,
          cancel_status: 0,
          user_id: {
            [Op.ne]: 0,
          },
          coach_id: req.auth.id,
          [Op.or]: [
            {

              date1: {
                [Op.eq]: new Date(formattedDate),  // Use a Date object for comparison
              },
              start_time: {
                [Op.gte]: currentTime,
              },
            },
            {

              date1: {
                [Op.gt]: new Date(formattedDate),  // Use a Date object for comparison

              },
            },
          ],
        },
        order: [
          ["date", "ASC"],
          ["start_time", "ASC"],
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      if (!find_booking.length) {
        return helper.success(res, "No upcoming bookings found", {});
      }
      const totalPages = Math.ceil(count / limit);
      return helper.success(res, "Upcoming bookings retrieved successfully", {
        bookings: find_booking,
        currentPage: parseInt(page),
        totalPages: totalPages,
        totalBookings: count,
      });
    } catch (error) {
      console.log(error);
      return helper.error403(res, error.message);
    }
  },
  previous_booking: async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;
      const { count, rows: find_booking } = await bookings.findAndCountAll({
        include: [
          {
            model: users,
            as: "coachDetails",
            include: [
              {
                model: user_sports,
                as: "user_sports_details",
                required: false,
                include: [
                  {
                    model: sports,
                    as: "sports_details",
                  },
                ],
              },
            ],
          },
          {
            model: packages,
            as: "packageDetails",
          },
        ],
        where: {
          cancel_status: 0,
          user_id: req.auth.id,

          date1: {
            [Op.lt]: new Date(formattedDate),  // Use a Date object for comparison
          },
        },
        order: [["id", "DESC"]],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      if (!find_booking.length) {
        return helper.success(res, "No previous bookings found", {});
      }

      const totalPages = Math.ceil(count / limit);
      return helper.success(res, "Previous bookings retrieved successfully", {
        bookings: find_booking,
        currentPage: parseInt(page),
        totalPages: totalPages,
        totalBookings: count,
      });
    } catch (error) {
      console.log(error);
      return helper.error403(res, error.message);
    }
  },
  previous_booking_coach: async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query; // Default values: page 1, limit 10
      const offset = (page - 1) * limit;
      const { count, rows: find_booking } = await bookings.findAndCountAll({
        include: [
          {
            model: users,
            as: "userDetails",
            include: [
              {
                model: user_sports,
                as: "user_sports_details",
                required: false,
                include: [
                  {
                    model: sports,
                    as: "sports_details",
                  },
                ],
              },
            ],
          },
          {
            model: packages,
            as: "packageDetails",
          },
        ],
        where: {
          cancel_status: 0,
          coach_id: req.auth.id,
          date1: {
            [Op.lt]: new Date(formattedDate),  // Use a Date object for comparison
          },
        },
        order: [["id", "DESC"]],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      if (!find_booking.length) {
        return helper.success(res, "No previous bookings found", {});
      }

      const totalPages = Math.ceil(count / limit);
      return helper.success(res, "Previous bookings retrieved successfully", {
        bookings: find_booking,
        currentPage: parseInt(page),
        totalPages: totalPages,
        totalBookings: count,
      });
    } catch (error) {
      console.log(error);
      return helper.error403(res, error.message);
    }
  },
  booking_details: async (req, res) => {
    try {

      let find_request = await bookings.findOne({
        attributes: [

          [
            sequelize.literal(
              `(SELECT COALESCE(type, 0) FROM booking_cancels WHERE booking_cancels.booking_id = bookings.id AND booking_cancels.deleted_at IS NULL LIMIT 1)`
            ),
            "cancel_request",
          ],
          `id`,
          `user_id`,
          `coach_id`,
          `booking_status`,
          `cancel_status`,
          `booking_type`,
          `coach_schedule_time_id`,
          `location`,
          `latitude`,
          `longitude`,
          `start_time`,
          `end_time`,
          `time_in_hr`,
          `date`,
          `date1`,
          `package_id`,
          `class_id`,
          `price`,
          `discount`,
          `payment_status`,
          `is_reccuring`,
          `created_at`,
          `updated_at`,
          `deleted_at`,
        ],
        include: [
          {
            model: users,
            as: "coachDetails",
            attributes: [
              [
                sequelize.literal(
                  `COALESCE((SELECT AVG(rating) FROM rating_reviews WHERE rating_reviews.coach_id = bookings.coach_id), 0)`
                ),
                "avg_rating",
              ],

              [
                sequelize.literal(
                  `COALESCE((SELECT COUNT(*) FROM rating_reviews WHERE rating_reviews.coach_id = bookings.coach_id), 0)`
                ),
                "rating_count",
              ],
              "id",
              "first_name",
              "last_name",
              "email",
              "image",
              "about_me",
              "hourly_rate",
              "cover_video",
              "thumbnail",
              "is_verified",
              "provide_balls",
              "address",
              "latitude",
              "longitude",
              "own_courts",
              "playing_experience",
              "coaching_experience",
              "willing_to_travel",
              "commission",
            ],
            include: [
              {
                model: user_sports,
                as: "user_sports_details",
                required: false,
                include: [
                  {
                    model: sports,
                    as: "sports_details",
                  },
                ],
              },
            ],
          },
          {
            model: packages,
            as: "packageDetails",
          },
          {
            model: users,
            as: "userDetails",
            attributes: [
              [
                sequelize.literal(
                  `COALESCE((SELECT rating FROM rating_reviews WHERE rating_reviews.booking_id = bookings.id AND rating_reviews.user_id=${req.auth.id}), 0)`
                ),
                "ratingbyme",
              ],
              [
                sequelize.literal(
                  `COALESCE((SELECT review FROM rating_reviews WHERE rating_reviews.booking_id = bookings.id AND rating_reviews.user_id=${req.auth.id}), '')`
                ),
                "reviewbyme",
              ],
              "id",
              "first_name",
              "last_name",
              "email",
              "image",
              "about_me",
              "hourly_rate",
              "cover_video",
              "thumbnail",
              "is_verified",
              "provide_balls",
              "address",
              "latitude",
              "longitude",
              "own_courts",
              "playing_experience",
              "coaching_experience",
              "willing_to_travel",
              "commission",
            ],
          },
        ],
        where: {
          id: req.body.booking_id,
        },
      });

      if (find_request == null) {
        return helper.error403(res, "Booking not found", {});
      }
      return helper.success(
        res,
        "Bookings retrieved successfully",
        find_request
      );
    } catch (error) {
      console.log(error);
    }
  },
  recurring_classes: async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      const { count, rows: find_booking } = await bookings.findAndCountAll({
        attributes: {
          include: [

            [
              sequelize.literal(
                `(SELECT COALESCE(type, 0) FROM booking_cancels WHERE booking_cancels.booking_id = bookings.id AND booking_cancels.deleted_at IS NULL LIMIT 1)`
              ),
              "cancel_request",
            ],
          ],
        },
        include: [
          {
            model: users,
            as: "coachDetails",
            include: [
              {
                model: user_sports,
                as: "user_sports_details",
                required: false,
                include: [
                  {
                    model: sports,
                    as: "sports_details",
                  },
                ],
              },
            ],
          },
          {
            model: classes,
            as: "classDetails",
          },
        ],
        where: {
          cancel_status: 0,
          booking_status: [1, 2],
          user_id: req.auth.id,
          is_reccuring: 2,

        },
        order: [["id", "DESC"]],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      if (!find_booking.length) {
        return helper.success(res, "No recurring bookings found", {
          bookings: [],
          currentPage: parseInt(page),
          totalPages: 0,
          totalBookings: 0,
        });
      }

      const totalPages = Math.ceil(count / limit);
      return helper.success(res, "Recurring bookings retrieved successfully", {
        bookings: find_booking,
        currentPage: parseInt(page),
        totalPages: totalPages,
        totalBookings: count,
      });
    } catch (error) {
      console.error("Error fetching recurring bookings:", error);
      return helper.error403(res, "Error fetching recurring bookings", error.message);
    }
  },
  recurring_classes_coach: async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query; // Default values: page 1, limit 10
      const offset = (page - 1) * limit;

      const { count, rows: find_booking } = await bookings.findAndCountAll({
        attributes: {
          include: [

            [
              sequelize.literal(
                `(SELECT COALESCE(type, 0) FROM booking_cancels WHERE booking_cancels.booking_id = bookings.id AND booking_cancels.deleted_at IS NULL LIMIT 1)`
              ),
              "cancel_request",
            ],
          ],
        },
        include: [
          {
            model: users,
            as: "userDetails",

            include: [
              {
                model: user_sports,
                as: "user_sports_details",
                required: false,
                include: [
                  {
                    model: sports,
                    as: "sports_details",
                  },
                ],
              },
            ],
          },
          {
            model: classes,
            as: "classDetails",

          },
        ],
        where: {
          cancel_status: 0,
          booking_status: [1, 2],
          coach_id: req.auth.id,
          is_reccuring: 2,
        },
        order: [["id", "DESC"]],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      if (!find_booking.length) {
        return helper.success(res, "No recurring bookings found", {});
      }

      const totalPages = Math.ceil(count / limit);
      return helper.success(res, "Recurring bookings retrieved successfully", {
        bookings: find_booking,
        currentPage: parseInt(page),
        totalPages: totalPages,
        totalBookings: count,
      });
    } catch (error) {
      console.error("Error fetching recurring bookings:", error);
      return helper.error403(res, "Error fetching recurring bookings", error.message);
    }
  },
  recurring_cancel_booking: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        booking_id: "required",
      });
      let errorsResponse = await helper.checkValidation(v);
      if (errorsResponse) {
        return helper.error403(res, errorsResponse);
      }
      let find_request = await bookings.findOne({
        where: {
          id: req.body.booking_id,
        },
        raw: true,
      });

      if (find_request == null) {
        return helper.error403(res, "Booking not found", {});
      }
      var receiverId = 0;
      var type = 0;
      if (req.auth.role == 1) {
        receiverId = find_request.coach_id;
        type = 1;
      } else {
        receiverId = find_request.user_id;
        type = 2;
      }

      if (req.body.reason_id) {
        const dateString = find_request.date;
        const dateParts = dateString.split('-');
        const parsedDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);  // Convert to YYYY-MM-DD 
        const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const providedWeekday = parsedDate.getDay();
        console.log(`Weekday of the provided date: ${weekdays[providedWeekday]}`);  // Output: Sunday

        function formatDate(date) {
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return `${day}-${month}-${year}`;
        }
        function getNextWeekdayDate(targetWeekday) {
          const currentDay = currentDate.getDay();
          const daysUntilNextWeekday = (targetWeekday + 6 - currentDay) % 7 || 6;
          currentDate.setDate(currentDate.getDate() + daysUntilNextWeekday);
          return currentDate;
        }
        const nextWeekdayDate = getNextWeekdayDate(providedWeekday);

        await bookings.update(
          {
            reacuring_day: weekdays[providedWeekday],
            cancel_reacuring_removal_date: formatDate(nextWeekdayDate),
          },
          {
            where: {
              id: req.body.booking_id,
            },
          }
        );
        let find_reason = await cancel_reasons.findOne({
          where: {
            id: req.body.reason_id,
          },
          raw: true,
        });

        let reason_title = find_reason ? find_reason.title : "";

        await booking_cancels.create({
          user_id: find_request.user_id,
          booking_id: find_request.id,
          coach_id: find_request.coach_id,
          reason: reason_title,
          type: type,
          description: req.body.description || "",
        });


        function convertTo12HrFormat(time24) {
          const [hours, minutes] = time24.split(':');
          const suffix = hours >= 12 ? 'PM' : 'AM';
          const hours12 = hours % 12 || 12; // Converts 0 to 12 for midnight
          return `${hours12}:${minutes} ${suffix}`;
        }

        const startTime = find_request.start_time;
        const endTime = find_request.end_time;
        const startTime12Hr = convertTo12HrFormat(startTime);
        const endTime12Hr = convertTo12HrFormat(endTime);

        await notifications.create({
          sender_id: req.auth.id,
          request_id: find_request.id,
          receiver_id: receiverId,
          notification_type: 4,
          date: find_request.date,
          start_time: startTime12Hr,
          end_time: endTime12Hr,
          reason: find_reason ? find_reason.title : "",
          title: `${req.auth.first_name} ${req.auth.last_name} sent a cancel booking request`,
          data: "",
        });

        let message = "Booking cancellation request sent successfully";

        let find_receiver_socket = await users.findOne({
          attributes: {
            include: [
              [
                sequelize.literal(
                  `(SELECT socket_id FROM sockets WHERE users.id=sockets.user_id LIMIT 1)`
                ),
                "socket_id",
              ],
            ],
          },
          where: {
            id: receiverId,
          },
        });

        let success_message = {
          success_message: message,
          data: find_request,
        };

        if (find_receiver_socket && find_receiver_socket.socket_id) {
          io.to(find_receiver_socket.socket_id).emit(
            "cancel_classes",
            success_message
          );
          io.to(find_receiver_socket.socket_id).emit(
            "notificationlist",
            success_message
          );
        }

        let ndata = {
          msg: `${req.auth.first_name} ${req.auth.last_name} sent a request for  cancel reacuring class for this week`,
          title: "HiCoach",
          request_id: req.body.booking_id,
          message: `${req.auth.first_name} ${req.auth.last_name} sent a request for  cancel reacuring class for this week`,
          sender_image: `${req.auth.image}`,
          sender_id: `${req.auth.id}`,
          sender_name: `${req.auth.first_name} ${req.auth.last_name}`,
          type: 4,
        };

        if (find_receiver_socket.notify_class_requests == "yes") {
          helper.sendPushNotification(find_receiver_socket.device_token, ndata);
        } else {
          console.log(
            `Notification turned off for user_id: ${find_receiver_socket.id}`
          );
        }
        return helper.success(res, message, {});
      } else {
        await booking_cancels.create({
          user_id: find_request.user_id,
          booking_id: find_request.id,
          coach_id: find_request.coach_id,
          reason: "Reaccuring cancel permanently",
          type: type,
          status: 1,
          description: "",
        });

        await bookings.update(
          {
            booking_status: 3, // Mark booking as canceled
            cancel_status: 1,  // Cancellation accepted
          },
          {
            where: {
              id: find_request.id,
            },
          }
        );
        let find_receiver = await users.findOne({

          where: {
            id: receiverId,
          },
        });

        let message = "Booking cancellation successfully";

        let ndata = {
          msg: `${req.auth.first_name} ${req.auth.last_name}  cancel reacuring class for this week`,
          title: "HiCoach",
          request_id: find_request.id,
          message: `${req.auth.first_name} ${req.auth.last_name} cancel reacuring class for this week`,
          sender_image: `${req.auth.image}`,
          sender_id: `${req.auth.id}`,
          sender_name: `${req.auth.first_name} ${req.auth.last_name}`,
          type: 4,
        };

        if (find_receiver.notify_class_requests == "yes") {
          helper.sendPushNotification(find_receiver.device_token, ndata);
        } else {
          console.log(
            `Notification turned off for user_id: ${find_receiver.id}`
          );
        }
        return helper.success(res, message, {});
      }
    } catch (error) {
      console.log("Error in cancel_booking:", error);
      return helper.error403(res, error.message);
    }
  },
  complete_booking: async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      const { count, rows: find_booking } = await bookings.findAndCountAll({
        include: [
          {
            model: users,
            as: "coachDetails",
            include: [
              {
                model: user_sports,
                as: "user_sports_details",
                required: false,
                include: [
                  {
                    model: sports,
                    as: "sports_details",
                  },
                ],
              },
            ],
          },
          {
            model: classes,
            as: "classDetails",
          },
        ],
        where: {
          booking_status: [2, 3, 5],
          user_id: req.auth.id,
        },
        order: [["id", "DESC"]],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      if (!find_booking.length) {
        return helper.success(res, "No complete bookings found", {});
      }

      const totalPages = Math.ceil(count / limit);
      return helper.success(res, "Complete bookings retrieved successfully", {
        bookings: find_booking,
        currentPage: parseInt(page),
        totalPages: totalPages,
        totalBookings: count,
      });
    } catch (error) {
      console.log(error);
      return helper.error403(res, error.message);
    }
  },
  complete_booking_coach: async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query; // Default values: page 1, limit 10
      const offset = (page - 1) * limit;
      const { count, rows: find_booking } = await bookings.findAndCountAll({
        include: [
          {
            model: users,
            as: "userDetails",
            include: [
              {
                model: user_sports,
                as: "user_sports_details",
                required: false,
                include: [
                  {
                    model: sports,
                    as: "sports_details",
                  },
                ],
              },
            ],
          },
          {
            model: classes,
            as: "classDetails",
          },
        ],
        where: {
          booking_status: [2, 3],
          coach_id: req.auth.id,
        },
        order: [["id", "DESC"]],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      if (!find_booking.length) {
        return helper.success(res, "No complete bookings found", {});
      }

      const totalPages = Math.ceil(count / limit);
      return helper.success(res, "Complete bookings retrieved successfully", {
        bookings: find_booking,
        currentPage: parseInt(page),
        totalPages: totalPages,
        totalBookings: count,
      });
    } catch (error) {
      console.log(error);
      return helper.error403(res, error.message);
    }
  },
  // testing_api: async (req, res) => {
  //   try {
  //     let currentDate = new Date();
  //     let formattedDate = ("0" + currentDate.getDate()).slice(-2) + "-" +
  //       ("0" + (currentDate.getMonth() + 1)).slice(-2) + "-" +
  //       currentDate.getFullYear();

  //     let find_booking = await bookings.findAll({
  //       where: {
  //         booking_status: 3,
  //         is_reccuring: 2,
  //         cancel_reacuring_removal_date: formattedDate // Use formattedDate in DD-MM-YYYY format
  //       }
  //     });

  //     for (let booking of find_booking) {
  //       await bookings.update(
  //         {
  //           booking_status: 1,
  //           cancel_reacuring_removal_date: 0 // Set to null for better handling
  //         },
  //         {
  //           where: {
  //             id: booking.id
  //           }
  //         }
  //       );

  //       await booking_cancels.destroy({
  //         where: {
  //           booking_id: booking.id
  //         }
  //       });
  //     }

  //     res.status(200).json({
  //       success: true,
  //       message: "Bookings and cancel requests processed successfully"
  //     });
  //   } catch (error) {
  //     console.error("Error fetching schedule:", error);

  //     res.status(500).json({
  //       success: false,
  //       message: "An error occurred while fetching the schedule",
  //       error: error.message
  //     });
  //   }
  // }
  testing_api: async (req, res) => {
    try {
      const currentTime = new Date();

      const formattedDate = currentTime.toISOString().split('T')[0];

      const oneHourLater = new Date(currentTime.getTime() + 60 * 60 * 1000);
      const formattedTime = oneHourLater.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });  // 'HH:mm' format

      let find_booking = await bookings.findAll({
        where: {
          booking_status: 1,
          payment_status: 1,
          date1: {
            [Op.eq]: new Date(formattedDate),

          },
          start_time: {
            [Op.eq]: formattedTime,
          },
        },
      });

      if (find_booking.length > 0) {

        for (const booking of find_booking) {
          let coach = await users.findOne({
            where: {
              id: booking.coach_id,
            },
            raw: true,
          });

          let student = await users.findOne({
            where: {
              id: booking.user_id,
            },
            raw: true,
          });

          if (!coach) {
            console.log(`Coach with id ${booking.coach_id} not found.`);
          }

          let ndata = {
            msg: req.body.message,
            title: "HiCoach",
            request_id: req.body.request_id,
            message: `Reminder: your class starts in 1 hour at ${booking.start_time}`,
            sender_image: ``,
            sender_id: ``,
            sender_name: ``,
            type: 12,
          };

          if (coach?.notify_class_requests === "yes") {
            helper.sendPushNotification(coach.device_token, ndata);
          } else {
            console.log(
              `Notification turned off for user_id: ${coach?.id || "unknown"}`
            );
          }

          if (student?.notify_class_requests === "yes") {
            helper.sendPushNotification(student.device_token, ndata);
          } else {
            console.log(
              `Notification turned off for user_id: ${student?.id || "unknown"}`
            );
          }
        }
      } else {
        console.log('No bookings found for the specified time.');
      }
      return helper.success(res, "No bookings found for the specified time.", {});
    } catch (error) {
      console.error("Error fetching schedule:", error);

      res.status(500).json({
        success: false,
        message: "An error occurred while fetching the schedule",
        error: error.message,
      });
    }
  }

};
