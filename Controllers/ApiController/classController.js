const envfile = process.env;
let CryptoJS = require("crypto-js");
const helper = require("../../helpers/helper");
const { Validator } = require("node-input-validator");
const sequelize = require("sequelize");
const { Attribute } = require("@aws-sdk/client-rekognition");
const moment = require("moment"); // Assuming you're using Moment.js for date handling
const { request } = require("express");
const { Op } = require("sequelize");
const { users, coach_schedule_days, coach_schedule_times, cancel_reasons, classes, class_invitation, notifications, bookings, sockets, user_saved_coahces, booking_slotes } = require("../../models");
let deletedTime = sequelize.literal("CURRENT_TIMESTAMP");
bookings.hasMany(booking_slotes, {
  foreignKey: "booking_id",
  as: "slot_times",
});
module.exports = {
  add_class: (io) => {
    return async (req, res) => {
      try {
        let studentsIds = req.body.students_id;

        if (typeof studentsIds === "string") {
          studentsIds = studentsIds
            .replace(/[\[\]]/g, "")
            .split(",")
            .map((e) => e.trim());
        }

        if (!Array.isArray(studentsIds)) {
          studentsIds = [studentsIds];
        }

        studentsIds = studentsIds
          .map((id) => parseInt(id, 10))
          .filter((id) => !isNaN(id));

        const [day, month, year] = req.body.date.split("-"); // Assuming the date format is DD-MM-YYYY
        const isoDate = `${year}-${month}-${day}`; // Proper ISO date format YYYY-MM-DD

        if (!req.body.start_time || !req.body.end_time) {
          return helper.error403(res, "start_time and end_time are required");
        }
        let dayOfWeek = moment(req.body.date, "DD-MM-YYYY").isoWeekday();

        const newClass = await classes.create({
          coach_id: req.auth.id,
          date: req.body.date,
          date1:isoDate,
          location: req.body.location,
          latitude: req.body.latitude,
          longitude: req.body.longitude,
          is_repeat: req.body.is_repeat, // 1 = once, 2 = repeated
          amount: req.body.amount,
          start_time: req.body.start_time,
          end_time: req.body.end_time,
        });

        const startTime = new Date(`${isoDate}T${req.body.start_time}:00`);
        const endTime = new Date(`${isoDate}T${req.body.end_time}:00`);

        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
          return helper.error403(res, "Invalid start_time or end_time format");
        }
        const durationInHours = (endTime - startTime) / (1000 * 60 * 60);
        if (durationInHours <= 0) {
          return helper.error403(res, "End time must be after start time");
        }

        let find_coach_schedule_days = await coach_schedule_days.findOne({
          where: {
            day: dayOfWeek,
            user_id: req.auth.id,
          },
          raw: true,
        });
        coach_schedule_times;

        const createBooking = await bookings.create({
          user_id: 0,
          coach_id: req.auth.id,
          class_id: newClass.id,
          booking_type: "class", // Special class
          coach_schedule_time_id: find_coach_schedule_days.id,
          start_time: req.body.start_time,
          end_time: req.body.end_time,
          date: req.body.date,
          date1:isoDate,
          time_in_hr: durationInHours, // Correctly calculated duration in hours
          is_reccuring: req.body.is_repeat, // 1 => once, 2 => repeated
          location: req.body.location,
          latitude: req.body.latitude,
          longitude: req.body.longitude,
        });
        const booking_slotes_add = await booking_slotes.create({
          booking_id: createBooking.id,
          start_time: req.body.start_time,
          end_time: req.body.end_time,
          date: req.body.date,
        });

        const invitations = studentsIds.map((studentId) => ({
          class_id: newClass.id,
          booking_id: createBooking.id,
          student_id: studentId,
        }));

        for (const studentId of studentsIds) {
          let receiver = await users.findOne({
            attributes: {
              include: [
                [
                  sequelize.literal(
                    `(SELECT socket_id FROM sockets WHERE users.id = sockets.user_id LIMIT 1)`
                  ),
                  "socket_id",
                ]

              ],
            },
            where: {
              id: studentId,
            },
          });

          let ndata = {
            msg: `Coach ${req.auth.first_name} ${req.auth.last_name} sent a new request for a special class`,
            title: "HiCoach",
            request_id: createBooking.id,
            message: `Coach ${req.auth.first_name} ${req.auth.last_name} sent a new request for a special class`,
            sender_image: `${req.auth.image}`,
            sender_id: `${req.auth.id}`,
            sender_name: `${req.auth.first_name} ${req.auth.last_name}`,
            type: 1,
          };
          if (receiver && receiver.notify_class_requests == "yes") {
            console.log("Notifications enabled for user:", receiver.id);
            helper.sendPushNotification(receiver.device_token, ndata);
          } else if (!receiver) {
            console.log(`No user found for studentId: ${studentId}`);
          } else {
            console.log(
              `Notification turned off or not configured for user_id: ${receiver.id}`
            );
          }
          //
          let success_message = {
            success_message: "New class added by coach",
            data: createBooking,
          };

          if (receiver && receiver.socket_id) {
            io.to(receiver.socket_id).emit("home_student", success_message);
            io.to(receiver.socket_id).emit("notificationlist", success_message);
          }
        }

        await class_invitation.bulkCreate(invitations);
        function convertTo12HrFormat(time24) {
          const [hours, minutes] = time24.split(':');
          const suffix = hours >= 12 ? 'PM' : 'AM';
          const hours12 = hours % 12 || 12; // Converts 0 to 12 for midnight
          return `${hours12}:${minutes} ${suffix}`;
        }

        const start_Time = req.body.start_time;
        const end_Time = req.body.end_time;

        const startTime12Hr = convertTo12HrFormat(start_Time);
        const endTime12Hr = convertTo12HrFormat(end_Time);

        console.log(`Start Time: ${startTime12Hr}, End Time: ${endTime12Hr}`);

        const notidata = studentsIds.map((student) => ({
          request_id: createBooking.id,
          sender_id: req.auth.id,
          receiver_id: student,
          notification_type: 1,
          start_time: startTime12Hr,
          end_time: endTime12Hr,
          date: req.body.date,
          title: "Class request",
          body: `Coach ${req.auth.first_name} ${req.auth.last_name} sent a new request for a special class`,
          data: "",
        }));
        await notifications.bulkCreate(notidata);

        return helper.success(res, "Class created successfully", newClass);
      } catch (error) {
        console.error("Error in add_class:", error);
        return helper.error403(res, error.message);
      }
    };
  },
  students_listing: async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query; 
      const offset = (page - 1) * limit;

      let find_booking = await bookings.findAll({
        where: {
          coach_id: req.auth.id,
          deleted_at: null,
          user_id: {
            [Op.ne]: 0, 
          },
        },
        raw: true,
      });
      let those_user_save_coach = await user_saved_coahces.findAll({
        where: {
          coach_id: req.auth.id,
        },
        raw: true,
      });

      let ids = find_booking.map((e) => e.user_id);
      let ids1 = those_user_save_coach.map((e) => e.user_id);

      let combinedArray = [...ids, ...ids1];

      const { count, rows: get_students } = await users.findAndCountAll({
        attributes: [
          [
            sequelize.literal(
              `COALESCE(
                                (SELECT SUM(time_in_hr)
                                 FROM bookings 
                                 WHERE bookings.user_id = users.id 
                                 AND bookings.coach_id =  ${req.auth.id}
                                 AND bookings.deleted_at IS NULL), 0)`
            ),
            "total_hours_spent",
          ],
          [
            sequelize.literal(
              `COALESCE(
                                (SELECT created_at
                                 FROM bookings 
                                 WHERE bookings.user_id = users.id 
                                 AND bookings.coach_id = ${req.auth.id} 
                                 AND bookings.deleted_at IS NULL 
                                 ORDER BY bookings.created_at DESC 
                                 LIMIT 1), NULL)`
            ),
            "last_class",
          ],
          "id",
          "role",
          "email",
          "image",
          "first_name",
          "last_name",
          "about_me",
        ],
        where: {
          role: 1, 
          status: 1,
          deleted_at: null,
          id: combinedArray, 
        },
        limit: parseInt(limit), 
        offset: parseInt(offset), 
        raw: true,
      });

      if (!get_students.length) {
        return helper.success(res, "No students found", {});
      }

      const totalPages = Math.ceil(count / limit);
      return helper.success(res, "Get Students list successfully", {
        students: get_students,
        currentPage: parseInt(page),
        totalPages: totalPages,
        totalStudents: count,
      });
    } catch (error) {
      return helper.error403(res, error.message);
    }
  },
  get_slot_by_day: async (req, res) => {
    try {
      const { date } = req.body;
     let todayDate=date.split('-').reverse().join('-')
      
        let dayOfWeek = moment(date, "DD-MM-YYYY").isoWeekday();
        
      const user_id = req.body.user_id || req.auth.id;

      let find_day = await coach_schedule_days.findOne({
        include: [
          {
            model: coach_schedule_times,
            as: "times_details",
          },
        ],
        where: {
          user_id: user_id,
          day: dayOfWeek,
          status: 1,
        },
      });
      if (!find_day) {
        return helper.success(
          res,
          "No schedule found for the selected day",
          {}
        );
      }
      const generateHourlySlots = (startTime, endTime, travelTime) => {
        const slots = [];
        let start = moment(startTime, "HH:mm");
        const end = moment(endTime, "HH:mm");
     
        while (start < end) {
          let slotEnd = moment.min(start.clone().add(1, "hour"), end); 
          slots.push({
            start_time: start.format("H:mm"), // 6:30
            end_time: slotEnd.format("H:mm"), // 7:30 or end of the time range
            status: 0
          });
          start = slotEnd; // Move start to next slot's start time
        }
        return slots;
      };
      let all_slots = [];
      if (Array.isArray(find_day.times_details)) {
        find_day.times_details.forEach((time) => {
          const hourlySlots = generateHourlySlots(
            time.start_time,
            time.end_time
          );
          all_slots = all_slots.concat(hourlySlots); // Combine all slots
        });
      }
      // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>  // Adding missing slots with a status 1  <<<<<<<<<<<<<<<<<<<<<<<<<<<
      let timeSlots = all_slots
      function addMissingSlots(slots) {
        for (let i = 0; i < slots.length - 1; i++) {
          let currentSlot = slots[i];
          let nextSlot = slots[i + 1];

          // If there is a gap between the slots
          if (currentSlot.end_time !== nextSlot.start_time) {
            let gapStartTime = currentSlot.end_time;
            let gapEndTime = nextSlot.start_time;

            // Split the gap into hourly slots (1 hour) and add with status: 1
            let startTime = gapStartTime;
            while (startTime !== gapEndTime) {
              let endTime = incrementTimeByHour(startTime);
              slots.splice(i + 1, 0, { start_time: startTime, end_time: endTime, status: 1 });
              startTime = endTime;
              i++; // Skip the newly added slot
            }
          }
        }

        return slots;
      }
      function incrementTimeByHour(time) {
        let [hours, minutes] = time.split(':').map(Number);
        hours += 1;
        if (hours === 24) hours = 0; // Reset to 00:00 if hours go beyond 24
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      }
      // Adding missing slots with a status 1
      let timeSloted = addMissingSlots(timeSlots);
      // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>  // END  Adding missing slots with a status 1  <<<<<<<<<<<<<<<<<<<<<<<<<<<
      let find_booking = await bookings.findAll({
        include: [
          {
            model: booking_slotes,
            as: "slot_times",
          }
        ],
        where: {
          coach_id: user_id,
          date1: new Date(todayDate),
          [Op.or]: [
            {
              booking_status: [1, 2], 
            },
            {
              user_id: req.auth.id, 
              booking_status: [0],
            }
          ],
        },

      });
      let bookedSlots = find_booking.map(booking => booking.toJSON());

      let transformedSlotTimes = bookedSlots.flatMap(slot => 
        slot.slot_times.map(slotTime => ({
          start_time: slotTime.start_time,
          end_time: slotTime.end_time,
          status: 0 // Default value for status
        }))
      );
 
      if (Array.isArray(find_booking)) {
        find_booking.forEach((booking) => {
          const bookedHourlySlots = generateHourlySlots(
            booking.start_time,
            booking.end_time
          );
          bookedSlots = bookedSlots.concat(bookedHourlySlots); // Combine booked hourly slots
        });
      }

      let find_user = await users.findOne({
        where: {
          id: user_id
        }, raw: true
      })
      const filtered_slots = timeSloted.filter(slot => slot.status === 0);
      let travelTime = find_user.travel_time
      let is_travel = find_user.willing_to_travel == "yes" ? 1 : 0
      if (is_travel == 0) {
        var obj = {
          all_slots: filtered_slots,
          bookedSlots: bookedSlots,
        };
      } else {
        // >>>>>>>>>>>>>>>>>>>>>>>>>> Checked  Main Sloat <<<<<<<<<<<<<<<<<<<<<<<<<<<<//
        function convertToTime(timeString) {
          let [hours, minutes] = timeString.split(":").map(Number);
          let date = new Date();
          date.setHours(hours, minutes, 0, 0);
          return date;
        }
        function convertToTimeString(date) {
          let hours = date.getHours().toString().padStart(2, "0");
          let minutes = date.getMinutes().toString().padStart(2, "0");
          return `${hours}:${minutes}`;
        }
        function isBooked(slot, bookedSlots) {
          return bookedSlots.some(
            (bookedSlot) => {
              let slotStart = convertToTime(slot.start_time);
              let slotEnd = convertToTime(slot.end_time);
              let bookedStart = convertToTime(bookedSlot.start_time);
              let bookedEnd = convertToTime(bookedSlot.end_time);
        
              return slotStart < bookedEnd && slotEnd > bookedStart; // Check for overlap
            }
          );
        }
        function adjustSlots(all_slots, bookedSlots, travel_time) {
          let adjustedSlots = []; // Result array to hold adjusted slots
        
          for (let i = 0; i < all_slots.length; i++) {
            let currentSlot = all_slots[i];
            let previousSlot = all_slots[i - 1];
            let nextSlot = all_slots[i + 1];
        
            let startTime = convertToTime(currentSlot.start_time);
            let endTime = convertToTime(currentSlot.end_time);
        
            // Adjust start time if the previous slot is booked
            if (previousSlot && isBooked(previousSlot, bookedSlots)) {
              startTime.setMinutes(startTime.getMinutes() + travel_time);
            }
        
            // Adjust end time if the next slot is booked
            if (nextSlot && isBooked(nextSlot, bookedSlots)) {
              endTime.setMinutes(endTime.getMinutes() - travel_time);
            }
        
            // Ensure slots don't overlap with multi-hour bookings
            if (isBooked(currentSlot, bookedSlots)) {
              startTime = convertToTime(currentSlot.start_time); // Reset to original start
              endTime = convertToTime(currentSlot.end_time);   // Reset to original end
            }
        
            // Add the adjusted or unchanged slot to result array
            adjustedSlots.push({
              start_time: convertToTimeString(startTime),
              end_time: convertToTimeString(endTime),
              status: currentSlot.status
            });
          }
        
          return adjustedSlots;
        }
        
        const all_slots = timeSloted
        const travel_time = travelTime; // 10 minutes travel time
        const adjustedSlots = adjustSlots(all_slots, bookedSlots, travel_time);
        const filtered_slots = adjustedSlots.filter(slot => slot.status === 0);
        // >>>>>>>>>>>>>>>>>>>>>>>>>>  end Checked  Main Sloat <<<<<<<<<<<<<<<<<<<<<<<<<<<<//
        var obj = {
          all_slots: filtered_slots,
          bookedSlots: transformedSlotTimes,
        };
      }
      return helper.success(res, "Get slots successfully", obj);
    } catch (error) {
      console.log(error);
      return helper.error403(res, error.message);
    }
  },
  cancel_reasons_listing: async (req, res) => {
    try {
      const get_students = await cancel_reasons.findAll({
        raw: true,
      });

      return helper.success(res, "Get reasons list successfully", get_students);
    } catch (error) {
      return helper.error403(res, error.message);
    }
  },
  accept_reject_class_request: (io) => {
    return async (req, res) => {
      try {        
        const v = new Validator(req.body, {
          request_id: "required",
          status: "required",
        });

        let errorsResponse = await helper.checkValidation(v);
        if (errorsResponse) {
          return helper.error403(res, errorsResponse);
        }

        let find_request = await class_invitation.findOne({
          attributes: {
            include: [
              [
                sequelize.literal(
                  `(SELECT coach_id FROM bookings WHERE class_invitation.booking_id=bookings.id)`
                ),
                "coach_id",
              ],
             
              [
                sequelize.literal(
                  `(SELECT start_time FROM bookings WHERE class_invitation.booking_id=bookings.id)`
                ),
                "start_time",
              ],
              [
                sequelize.literal(
                  `(SELECT end_time FROM bookings WHERE class_invitation.booking_id=bookings.id)`
                ),
                "end_time",
              ],
              [
                sequelize.literal(
                  `(SELECT date FROM bookings WHERE class_invitation.booking_id=bookings.id)`
                ),
                "date",
              ],
            ],
          },
          where: {
            booking_id: req.body.request_id,
            student_id: req.auth.id,
          },
          raw: true,
        });

        if (!find_request || !find_request.id) {
          return helper.error403(res, "Request not found or invalid", {});
        }

        if (find_request.is_accept == 1) {
          return helper.error403(
            res,
            "This request has already been accepted by another user."
          );
        }
        let update_status = await class_invitation.update(
          {
            is_accept: req.body.status,
          },
          {
            where: {
              id: find_request.id,
            },
          }
        );

        if (!update_status || update_status[0] == 0) {
          console.log(
            `Failed to update class invitation with id: ${find_request.id}`
          );
          return helper.error403(res, "Failed to update class invitation.");
        }

        await notifications.destroy({
          where: {
            request_id: req.body.request_id,
          },
        });

        let message = "";

        if (req.body.status == 1) {
          await bookings.update(
            {
              booking_status: req.body.status,
              user_id: req.auth.id,
            },
            {
              where: {
                id: req.body.request_id,
              },
            }
          );

          await class_invitation.destroy({
            where: {
              booking_id: req.body.request_id,
              student_id: {
                [sequelize.Op.ne]: req.auth.id, 
              },
            },
          });

          message = "Request accepted and other invitations deleted";
        } else if (req.body.status == 2) {
          message = "Request rejected";
        }

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

        console.log(`Start Time: ${startTime12Hr}, End Time: ${endTime12Hr}`);

        let send_notification = await notifications.create({
          request_id: req.body.request_id,
          sender_id: req.auth.id,
          receiver_id: find_request.coach_id,
          notification_type: 10,
          start_time: startTime12Hr,
          end_time: endTime12Hr,
          date: find_request.date,
          title: `Class request ${message}`,
          body: `${req.auth.first_name} ${req.auth.last_name} ${message} your class request`,
          data: ""
        });
        let coach = await users.findOne({
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
            id: find_request.coach_id,
          },
          raw: true,
        });
        console.log(coach,"KKKKKKKKKKKKKKKKKKKKKKKKKKKKK");
        
        if (!coach) {
          console.log(`Coach with id ${find_request.coach_id} not found.`);
        }
        let ndata = {
          msg: message,
          title: "HiCoach",
          request_id: req.body.request_id,
          message: message,
          sender_image: `${req.auth.image || ""}`,
          sender_id: `${req.auth.id}`,
          sender_name: `${req.auth.first_name || ""} ${req.auth.last_name || ""
            }`,
          type: 2,
        };

        if (coach?.notify_class_requests === "yes") {
          helper.sendPushNotification(coach.device_token, ndata);
        } else {
          console.log(
            `Notification turned off for user_id: ${coach?.id || "unknown"}`
          );
        }
        //
        let receiver = await users.findOne({
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
            id: find_request.student_id,
          },
        });
      

        let success_message = {
          success_message: "Class accepted / Rejected by  coach",
          data: receiver,
        };

        if (receiver && receiver.socket_id) {
          io.to(receiver.socket_id).emit("class_request", success_message);
          io.to(receiver.socket_id).emit("classes_today", success_message);

        }
        if (coach && coach.socket_id) {
          io.to(coach.socket_id).emit("class_request", success_message);
          io.to(coach.socket_id).emit("classes_today", success_message);

        }
    
        return helper.success(res, message, {});
      } catch (error) {
        return helper.error403(res, error.message);
      }
    };
  },
  add_customize_class: (io) => {
    return async (req, res) => {
      try {
        const {
          date,
          start_time,
          end_time,
          price,
          coach_id,
          location,
          latitude,
          longitude,
          is_repeat,
        } = req.body;

        if (!date || !start_time || !end_time || !coach_id) {
          return helper.error403(
            res,
            "date, start_time, end_time, and coach_id are required"
          );
        }

        const [day, month, year] = date.split("-");
        if (!day || !month || !year) {
          return helper.error403(
            res,
            "Invalid date format, expected DD-MM-YYYY"
          );
        }

        const isoDate = `${year}-${month}-${day}`; // ISO format YYYY-MM-DD

        const startTime = new Date(`${isoDate}T${start_time}:00`);
        const endTime = new Date(`${isoDate}T${end_time}:00`);

        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
          return helper.error403(res, "Invalid start_time or end_time format");
        }

        const durationInHours = (endTime - startTime) / (1000 * 60 * 60);
        if (durationInHours <= 0) {
          return helper.error403(res, "End time must be after start time");
        }
        // Calculate the day of the week (1 = Monday, 7 = Sunday)
        const dayOfWeek = moment(date, "DD-MM-YYYY").isoWeekday();

        // Create a new class
        const newClass = await classes.create({
          user_id: req.auth.id,
          coach_id,
          date, 
          location,
          latitude,
          longitude,
          is_repeat, // 1 = once, 2 = repeated
          start_time,
          end_time,
          amount: price,
        });

        const find_coach_schedule_days = await coach_schedule_days.findOne({
          where: { day: dayOfWeek, user_id: coach_id },
          raw: true,
        });

        if (!find_coach_schedule_days) {
          return helper.error403(
            res,
            "Coach is not available on the selected day"
          );
        }

        const createBooking = await bookings.create({
          coach_id,
          user_id: req.auth.id,
          class_id: newClass.id,
          booking_type: "customize", // Special class
          coach_schedule_time_id: find_coach_schedule_days.id,
          start_time,
          end_time,
          price,
          date,
          date1:isoDate,
          time_in_hr: durationInHours, // Correctly calculated duration in hours
          is_reccuring: is_repeat, // 1 => once, 2 => repeated
          location,
          latitude,
          longitude,
        });

        const booking_slotes_add = await booking_slotes.create({
          booking_id: createBooking.id,
          start_time: start_time,
          end_time: end_time,
          date: date,
        });

        const find_receiver_socket = await sockets.findOne({
          where: { user_id: coach_id },
          raw: true,
        });

        const success_message = {
          success_message: "New class added by student",
          data: createBooking,
        };

        if (find_receiver_socket && find_receiver_socket.socket_id) {
          io.to(find_receiver_socket.socket_id).emit(
            "class_request",
            success_message
          );
          io.to(find_receiver_socket.socket_id).emit(
            "notificationlist",
            success_message
          );
        }

        function convertTo12HrFormat(time24) {
          const [hours, minutes] = time24.split(':');
          const suffix = hours >= 12 ? 'PM' : 'AM';
          const hours12 = hours % 12 || 12; // Converts 0 to 12 for midnight
          return `${hours12}:${minutes} ${suffix}`;
        }

        const startTime1 = start_time;
        const endTime1 = end_time;

        const startTime12Hr = convertTo12HrFormat(startTime1);
        const endTime12Hr = convertTo12HrFormat(endTime1);
 
        await notifications.create({
          request_id: createBooking.id,
          sender_id: req.auth.id,
          receiver_id: coach_id,
          notification_type: 5,
          start_time:startTime12Hr,
          end_time:endTime12Hr,
          date,
          title: "Class request",
          body: `${req.auth.first_name} ${req.auth.last_name} sent a new request for a booking class`,
          data: "",
        });
      
        return helper.success(res, "Class created successfully", createBooking);
      } catch (error) {
        console.error("Error in add_customize_class:", error);
        return helper.error403(res, error.message);
      }
    };
  },
  // get_slot_by_day: async (req, res) => {
  //   try {
  //     const { date } = req.body;
  //     // Convert date to day of the week
  //     let dayOfWeek = moment(date, "DD-MM-YYYY").isoWeekday();
  //     const user_id = req.body.user_id || req.auth.id;
  //     // Find the schedule for the selected day
  //     let find_day = await coach_schedule_days.findOne({
  //       include: [
  //         {
  //           model: coach_schedule_times,
  //           as: "times_details",
  //         },
  //       ],
  //       where: {
  //         user_id: user_id,
  //         day: dayOfWeek,
  //         status: 1,
  //       },
  //     });
  //     if (!find_day) {
  //       return helper.success(
  //         res,
  //         "No schedule found for the selected day",
  //         {}
  //       );
  //     }
  //     const generateHourlySlots = (startTime, endTime, travelTime) => {
  //       const slots = [];
  //       let start = moment(startTime, "HH:mm");
  //       const end = moment(endTime, "HH:mm");

  //       // Creating slots in 1-hour increments
  //       while (start < end) {
  //         let slotEnd = moment.min(start.clone().add(1, "hour"), end); // End slot at the earlier of 1 hour later or the specified end time
  //         slots.push({
  //           start_time: start.format("H:mm"), // 6:30
  //           end_time: slotEnd.format("H:mm"), // 7:30 or end of the time range
  //           status: 0
  //         });
  //         start = slotEnd; // Move start to next slot's start time
  //       }
  //       return slots;
  //     };
  //     let all_slots = [];
  //     if (Array.isArray(find_day.times_details)) {
  //       find_day.times_details.forEach((time) => {
  //         const hourlySlots = generateHourlySlots(
  //           time.start_time,
  //           time.end_time
  //         );
  //         all_slots = all_slots.concat(hourlySlots); // Combine all slots
  //       });
  //     }
  //     // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>  // Adding missing slots with a status 1  <<<<<<<<<<<<<<<<<<<<<<<<<<<
  //     let timeSlots = all_slots
  //     function addMissingSlots(slots) {
  //       for (let i = 0; i < slots.length - 1; i++) {
  //         let currentSlot = slots[i];
  //         let nextSlot = slots[i + 1];

  //         // If there is a gap between the slots
  //         if (currentSlot.end_time !== nextSlot.start_time) {
  //           let gapStartTime = currentSlot.end_time;
  //           let gapEndTime = nextSlot.start_time;

  //           // Split the gap into hourly slots (1 hour) and add with status: 1
  //           let startTime = gapStartTime;
  //           while (startTime !== gapEndTime) {
  //             let endTime = incrementTimeByHour(startTime);
  //             slots.splice(i + 1, 0, { start_time: startTime, end_time: endTime, status: 1 });
  //             startTime = endTime;
  //             i++; // Skip the newly added slot
  //           }
  //         }
  //       }

  //       return slots;
  //     }
  //     function incrementTimeByHour(time) {
  //       let [hours, minutes] = time.split(':').map(Number);
  //       hours += 1;
  //       if (hours === 24) hours = 0; // Reset to 00:00 if hours go beyond 24
  //       return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  //     }
  //     // Adding missing slots with a status 1
  //     let timeSloted = addMissingSlots(timeSlots);
  //     // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>  // END  Adding missing slots with a status 1  <<<<<<<<<<<<<<<<<<<<<<<<<<<
  //     let find_booking = await bookings.findAll({
  //       include: [
  //         {
  //           model: booking_slotes,
  //           as: "slot_times",
  //         }
  //       ],
  //       where: {
  //         coach_id: user_id,
  //         date: date,
  //         [Op.or]: [
  //           {
  //             booking_status: [1, 2], // for other bookings
  //           },
  //           {
  //             user_id: req.auth.id, // for user's booking
  //             booking_status: [0],
  //           }
  //         ],
  //       },

  //     });
  //     let bookedSlots = find_booking.map(booking => booking.toJSON());

  //     let transformedSlotTimes = bookedSlots.flatMap(slot => 
  //       slot.slot_times.map(slotTime => ({
  //         start_time: slotTime.start_time,
  //         end_time: slotTime.end_time,
  //         status: 0 // Default value for status
  //       }))
  //     );
 
  //     if (Array.isArray(find_booking)) {
  //       find_booking.forEach((booking) => {
  //         const bookedHourlySlots = generateHourlySlots(
  //           booking.start_time,
  //           booking.end_time
  //         );
  //         bookedSlots = bookedSlots.concat(bookedHourlySlots); // Combine booked hourly slots
  //       });
  //     }
  //     bookedSlots
  //     let find_user = await users.findOne({
  //       where: {
  //         id: user_id
  //       }, raw: true
  //     })
  //     // const filtered_slots = timeSloted.filter(slot => slot.status === 0);
  //     let travelTime = find_user.travel_time
  //     let is_travel = find_user.willing_to_travel == "yes" ? 1 : 0
  //     if (is_travel == 0) {
  //       var obj = {
  //         all_slots: timeSloted,
  //         bookedSlots: bookedSlots,
  //       };
  //     } else {
  //       // >>>>>>>>>>>>>>>>>>>>>>>>>> Checked  Main Sloat <<<<<<<<<<<<<<<<<<<<<<<<<<<<//
  //       function convertToTime(timeString) {
  //         let [hours, minutes] = timeString.split(":").map(Number);
  //         let date = new Date();
  //         date.setHours(hours, minutes, 0, 0);
  //         return date;
  //       }
  //       function convertToTimeString(date) {
  //         let hours = date.getHours().toString().padStart(2, "0");
  //         let minutes = date.getMinutes().toString().padStart(2, "0");
  //         return `${hours}:${minutes}`;
  //       }
  //       function isBooked(slot, bookedSlots) {
  //         return bookedSlots.some(
  //           (bookedSlot) => {
  //             let slotStart = convertToTime(slot.start_time);
  //             let slotEnd = convertToTime(slot.end_time);
  //             let bookedStart = convertToTime(bookedSlot.start_time);
  //             let bookedEnd = convertToTime(bookedSlot.end_time);
        
  //             return slotStart < bookedEnd && slotEnd > bookedStart; // Check for overlap
  //           }
  //         );
  //       }
  //       function adjustSlots(all_slots, bookedSlots, travel_time) {
  //         let adjustedSlots = []; // Result array to hold adjusted slots
        
  //         for (let i = 0; i < all_slots.length; i++) {
  //           let currentSlot = all_slots[i];
  //           let previousSlot = all_slots[i - 1];
  //           let nextSlot = all_slots[i + 1];
        
  //           let startTime = convertToTime(currentSlot.start_time);
  //           let endTime = convertToTime(currentSlot.end_time);
        
  //           // Adjust start time if the previous slot is booked
  //           if (previousSlot && isBooked(previousSlot, bookedSlots)) {
  //             startTime.setMinutes(startTime.getMinutes() + travel_time);
  //           }
        
  //           // Adjust end time if the next slot is booked
  //           if (nextSlot && isBooked(nextSlot, bookedSlots)) {
  //             endTime.setMinutes(endTime.getMinutes() - travel_time);
  //           }
        
  //           // Ensure slots don't overlap with multi-hour bookings
  //           if (isBooked(currentSlot, bookedSlots)) {
  //             startTime = convertToTime(currentSlot.start_time); // Reset to original start
  //             endTime = convertToTime(currentSlot.end_time);   // Reset to original end
  //           }
        
  //           // Add the adjusted or unchanged slot to result array
  //           adjustedSlots.push({
  //             start_time: convertToTimeString(startTime),
  //             end_time: convertToTimeString(endTime),
  //             status: currentSlot.status
  //           });
  //         }
        
  //         return adjustedSlots;
  //       }
  //       const all_slots = timeSloted
  //       const travel_time = travelTime; // 10 minutes travel time
  //       const adjustedSlots = adjustSlots(all_slots, bookedSlots, travel_time);
  //       // const filtered_slots = adjustedSlots.filter(slot => slot.status === 0);
  //       // >>>>>>>>>>>>>>>>>>>>>>>>>>  end Checked  Main Sloat <<<<<<<<<<<<<<<<<<<<<<<<<<<<//
  //       var obj = {
  //         all_slots: adjustedSlots,
  //         bookedSlots: transformedSlotTimes,
  //       };
  //     }
  //     return helper.success(res, "Get slots successfully", obj);
  //   } catch (error) {
  //     console.log(error);
  //     return helper.error403(res, error.message);
  //   }
  // },
  get_slot_by_day_new: async (req, res) => {
    try {
      const { date } = req.body;
      const user_id = req.body.user_id || req.auth.id;

      let dayOfWeek = moment(date, "DD-MM-YYYY").isoWeekday();

      let find_day = await coach_schedule_days.findOne({
        include: [
          {
            model: coach_schedule_times,
            as: "times_details",
          },
        ],
        where: {
          user_id: user_id,
          day: dayOfWeek,
          status: 1,
        },
      });
  
      if (!find_day) {
        return helper.success(
          res,
          "No schedule found for the selected day",
          {}
        );
      }

      const generateFullDaySlots = () => {
        const slots = [];
        let start = moment("00:00", "HH:mm");
  
        for (let i = 0; i < 24; i++) {
          let slotEnd = start.clone().add(1, "hour");
          slots.push({
            start_time: start.format("H:mm"),
            end_time: slotEnd.format("H:mm"),
            status: 1 // Mark all initial 24-hour slots as missing (status: 1)
          });
          start = slotEnd;
        }
        return slots;
      };

      const generateHourlySlots = (startTime, endTime) => {
        const slots = [];
        let start = moment(startTime, "HH:mm");
        const end = moment(endTime, "HH:mm");
  
        while (start < end) {
          let slotEnd = moment.min(start.clone().add(1, "hour"), end);
          slots.push({
            start_time: start.format("H:mm"),
            end_time: slotEnd.format("H:mm"),
            status: 0 
          });
          start = slotEnd;
        }
        return slots;
      };

      let all_slots = generateFullDaySlots();
  
      if (Array.isArray(find_day.times_details)) {
        find_day.times_details.forEach((time) => {
          const coachSlots = generateHourlySlots(time.start_time, time.end_time);

          coachSlots.forEach(coachSlot => {
            all_slots = all_slots.map(slot => {
              if (slot.start_time == coachSlot.start_time && slot.end_time == coachSlot.end_time) {
                return coachSlot; 
              }
              return slot;
            });
          });
        });
      }

      let find_booking = await bookings.findAll({
        include: [
          {
            model: booking_slotes,
            as: "slot_times",
          }
        ],
        where: {
          coach_id: user_id,
          date1:date.split('-').reverse().join('-'),
          booking_status: [1,2],
 
        },
      });

 
      let bookedSlots = find_booking.flatMap(booking => 
        booking.slot_times.map(slotTime => ({
          start_time: slotTime.start_time,
          end_time: slotTime.end_time,
          status: 0 
        }))
      );

      all_slots = all_slots.map(slot => {
        if (bookedSlots.some(bookedSlot => 
          slot.start_time == bookedSlot.start_time && slot.end_time == bookedSlot.end_time)) {
          return {
            ...slot,
            status: 0 
          };
        }
        return slot;
      });
  
      let find_user = await users.findOne({
        where: { id: user_id },
        raw: true
      });
  
      let travelTime = find_user.travel_time;
      let is_travel = find_user.willing_to_travel == "yes" ? 1 : 0;
  
      if (is_travel == 0) {
        var obj = {
          all_slots: all_slots,
          bookedSlots: bookedSlots,
        };
      } else {
        // Slot adjustment logic for travel time
        function convertToTime(timeString) {
          let [hours, minutes] = timeString.split(":").map(Number);
          let date = new Date();
          date.setHours(hours, minutes, 0, 0);
          return date;
        }
  
        function convertToTimeString(date) {
          let hours = date.getHours().toString().padStart(2, "0");
          let minutes = date.getMinutes().toString().padStart(2, "0");
          return `${hours}:${minutes}`;
        }
  
        function isBooked(slot, bookedSlots) {
          return bookedSlots.some(bookedSlot => {
            let slotStart = convertToTime(slot.start_time);
            let slotEnd = convertToTime(slot.end_time);
            let bookedStart = convertToTime(bookedSlot.start_time);
            let bookedEnd = convertToTime(bookedSlot.end_time);
  
            return slotStart < bookedEnd && slotEnd > bookedStart; // Check for overlap
          });
        }
  
        function adjustSlots(all_slots, bookedSlots, travel_time) {
          let adjustedSlots = [];
  
          for (let i = 0; i < all_slots.length; i++) {
            let currentSlot = all_slots[i];
            let previousSlot = all_slots[i - 1];
            let nextSlot = all_slots[i + 1];
  
            let startTime = convertToTime(currentSlot.start_time);
            let endTime = convertToTime(currentSlot.end_time);
  
            if (previousSlot && isBooked(previousSlot, bookedSlots)) {
              startTime.setMinutes(startTime.getMinutes() + travel_time);
            }
  
            if (nextSlot && isBooked(nextSlot, bookedSlots)) {
              endTime.setMinutes(endTime.getMinutes() - travel_time);
            }
  
            if (isBooked(currentSlot, bookedSlots)) {
              startTime = convertToTime(currentSlot.start_time); // Reset to original start
              endTime = convertToTime(currentSlot.end_time);   // Reset to original end
            }
              adjustedSlots.push({
              start_time: convertToTimeString(startTime),
              end_time: convertToTimeString(endTime),
              status: currentSlot.status
            });
          }
  
          return adjustedSlots;
        }
  
        const adjustedSlots = adjustSlots(all_slots, bookedSlots, travelTime);
  
        var obj = {
          all_slots: adjustedSlots,
          bookedSlots: bookedSlots,
        };
      }
  
      return helper.success(res, "Get slots successfully", obj);
    } catch (error) {
      console.log(error);
      return helper.error403(res, error.message);
    }
  },
  
  
};
