const envfile = process.env;
let CryptoJS = require("crypto-js");
const helper = require("../../helpers/helper");
const { Validator } = require("node-input-validator");
const moment = require("moment");
const sequelize = require('sequelize');
const Op = sequelize.Op;
const { users, coach_schedule_days, booking_slotes, coach_schedule_times, promote_slotes_times, promote_slot, user_saved_coahces, bookings } = require("../../models");
const { stringify } = require("uuid");
module.exports = {
 
    get_days: async (req, res) => {
        try {
            let find_days = await coach_schedule_days.findAll({
                where: {
                    user_id: req.auth.id
                },
            });
            return helper.success(res, "Get days succesfully", find_days);
        } catch (error) {
            return helper.error403(res, error);
        }
    },
    add_coach_slot: async (req, res) => {
        try {
            // Validate the request data
            const v = new Validator(req.body, {
                times: "required",  // Ensure 'times' is provided
            });

            let errorsResponse = await helper.checkValidation(v);
            if (errorsResponse) {
                return helper.error403(res, errorsResponse);
            }

            const user_id = req.auth.id;
            let parsedTimes = JSON.parse(req.body.times)

            if (!Array.isArray(parsedTimes)) {
                return helper.error403(res, "Invalid data structure. Expected an array of days with schedules.");
            }

            for (let dayObj of parsedTimes) {

                if (!dayObj.day || !Array.isArray(dayObj.schedules)) {
                    return helper.error403(res, "Each day must contain a valid 'day' and an array of 'schedules'.");
                }
                const dayNumber = dayObj.day;
                const schedules = dayObj.schedules;

                let existingSlots = await coach_schedule_times.findAll({
                    where: {
                        user_id: user_id,
                        coach_schedule_day_id: dayNumber,  // Correctly use dayNumber
                    },
                });
                if (existingSlots.length > 0) {
                    await coach_schedule_times.destroy({
                        where: {
                            user_id: user_id,
                            coach_schedule_day_id: dayNumber,  // Correctly use dayNumber
                        },
                    });
                }

                for (let schedule of schedules) {
                    const { start_time, end_time } = schedule;

                    if (typeof start_time !== 'string' || typeof end_time !== 'string') {
                        return helper.error403(res, "Start time and end time must be strings.");
                    }

                    await coach_schedule_times.create({
                        user_id: user_id,
                        coach_schedule_day_id: dayNumber,
                        start_time: start_time,
                        end_time: end_time,
                    });
                }
            }

            let Coach_slot = await coach_schedule_times.findAll({
                where: {
                    user_id: user_id,
                },
                raw: true,
                nest: true,
            });
            return helper.success(res, "Slots added successfully", Coach_slot);
        } catch (error) {
            console.error(error, 'Error while adding coach slots');
            return helper.error403(res, "An error occurred while adding coach slots");

        }
    },
    // add_coach_slot: async (req, res) => {
    //     try {
    //         console.log(req.body,"kkkkkkkkkkkkkkkkkkkkkkkkkkkkk");

    //         // Validate the request data
    //         const v = new Validator(req.body, {
    //             coach_schedule_day_id: "required",
    //             times: "required",

    //         });

    //         let errorsResponse = await helper.checkValidation(v);
    //         if (errorsResponse) {
    //             return helper.error403(res, errorsResponse);
    //         }

    //         let parsedTimes;
    //         try {
    //             parsedTimes = JSON.parse(req.body.times);
    //         } catch (error) {
    //             return helper.error403(res, "Invalid format for 'times' field. It should be a valid JSON array.");
    //         }

    //         req.body.user_id = req.auth.id;
    //         const { coach_schedule_day_id, user_id } = req.body;

    //         let existingSlots = await coach_schedule_times.findAll({
    //             where: {
    //                 user_id: user_id,
    //                 coach_schedule_day_id: coach_schedule_day_id
    //             }
    //         });

    //         if (existingSlots.length > 0) {
    //                await coach_schedule_times.destroy({
    //                 where: {
    //                     user_id: user_id,
    //                     coach_schedule_day_id: coach_schedule_day_id
    //                 }
    //             });
    //         }
    //         for (let i = 0; i < parsedTimes.length; i++) {
    //             const { start_time, end_time } = parsedTimes[i];

    //             await coach_schedule_times.create({
    //                 user_id: user_id,
    //                 coach_schedule_day_id: coach_schedule_day_id,
    //                 start_time: start_time,
    //                 end_time: end_time,

    //             });
    //         }
    //         let Coach_slot = await coach_schedule_times.findAll({
    //             where: {
    //                 user_id: user_id
    //             },
    //             raw: true,
    //             nest: true
    //         });

    //         return helper.success(res, "Slots added successfully", Coach_slot);
    //     } catch (error) {
    //         return helper.error403(res, error);
    //     }
    // },
    get_slots: async (req, res) => {
        try {
            let find_days = await coach_schedule_days.findAll({
                include: [

                    {
                        model: coach_schedule_times,
                        as: "times_details"
                    },
                ],
                where: {
                    user_id: req.auth.id
                }
            });


            return helper.success(res, "Get slotes succesfully", find_days);
        } catch (error) {
            return helper.error403(res, error);
        }
    },
    // get_slots: async (req, res) => {
    //     try {
    //         let find_days = await coach_schedule_days.findAll({
    //             include: [
    //                 {
    //                     model: coach_schedule_times,
    //                     as: "times_details"
    //                 },
    //             ],
    //             where: {
    //                 user_id: req.auth.id
    //             },
    //             nest: true // Keeps nested relations as arrays
    //         });

    //         // Helper function to split the time range into one-hour slots
    //         const generateHourlySlots = (startTime, endTime) => {
    //             let slots = [];
    //             let start = parseFloat(startTime.replace(":", "."));
    //             let end = parseFloat(endTime.replace(":", "."));

    //             // Creating 1-hour slots
    //             while (start < end) {
    //                 slots.push({
    //                     start_time: start.toFixed(2).replace(".", ":"),
    //                     end_time: (start + 1).toFixed(2).replace(".", ":")
    //                 });
    //                 start += 1; // Move to the next hour
    //             }
    //             return slots;
    //         };

    //         let all_slots = [];

    //         // Processing each day's time details to get one-hour slots
    //         find_days.forEach(day => {
    //             if (Array.isArray(day.times_details)) { // Ensure it's an array
    //                 day.times_details.forEach(time => {
    //                     const hourlySlots = generateHourlySlots(time.start_time, time.end_time);
    //                     all_slots = all_slots.concat(hourlySlots); // Combine all slots
    //                 });
    //             }
    //         });

    //         console.log(all_slots, "Combined Slots");

    //         return helper.success(res, "Get slots successfully", all_slots);
    //     } catch (error) {
    //         console.log(error); // Log any errors
    //         return helper.error403(res, error.message); // Send error response
    //     }
    // },

    day_on_Off: async (req, res) => {
        try {

            // Validate the request data
            const v = new Validator(req.body, {
                day_id: "required",
                status: "required",

            });

            let errorsResponse = await helper.checkValidation(v);
            if (errorsResponse) {
                return helper.error403(res, errorsResponse);
            }
            // Update the status for the specific day
            let updateStatus = await coach_schedule_days.update({
                status: req.body.status
            }, {
                where: {
                    id: req.body.day_id
                }
            });
            let getUpdate = await coach_schedule_days.findOne({
                where: {
                    id: req.body.day_id
                }, raw: true
            })

            // Define the message based on the status
            let msg = req.body.status == 1 ? 'Day On' : 'Day Off';

            // Send success response
            return helper.success(res, msg, getUpdate);
        } catch (error) {
            console.log(error);
            // Send error response
            return helper.error403(res, error.message);
        }
    },
    // promote_slot: async (req, res) => {
    //     try {
    //         const v = new Validator(req.body, {
    //             start_time: "required", // Validates HH:MM format
    //             end_time: "required",   // Validates HH:MM format
    //             date: "required",       // Validates DD-MM-YYYY format
    //         });

    //         let errorsResponse = await helper.checkValidation(v);
    //         if (errorsResponse) {
    //             return helper.error403(res, errorsResponse);
    //         }

    //         let add_slot = await promote_slot.create({
    //             coach_id: req.auth.id,
    //             // start_time: req.body.start_time,
    //             // end_time: req.body.end_time,
    //             date: req.body.date,

    //         });

    //         // Find all bookings for the coach
    //         let find_booking = await bookings.findAll({
    //             where: {
    //                 coach_id: req.auth.id,
    //                 deleted_at: null,
    //                 user_id: {
    //                     [Op.ne]: 0, // Ensure user_id is not 0
    //                 },
    //             },
    //             raw: true,
    //         });

    //         let those_user_save_coach = await user_saved_coahces.findAll({
    //             where: {
    //                 coach_id: req.auth.id,
    //             },
    //             raw: true,
    //         });

    //         let ids = find_booking.map((e) => e.user_id);
    //         let ids1 = those_user_save_coach.map((e) => e.user_id);

    //         let combinedArray = [...new Set([...ids, ...ids1])];

    //         for (const studentId of combinedArray) {
    //             try {
    //                 let receiver = await users.findOne({
    //                     attributes: {
    //                         include: [
    //                             [
    //                                 sequelize.literal(
    //                                     `(SELECT socket_id FROM sockets WHERE users.id = sockets.user_id LIMIT 1)`
    //                                 ),
    //                                 "socket_id",
    //                             ],
    //                         ],
    //                     },
    //                     where: {
    //                         id: studentId,
    //                     },
    //                 });

    //                 if (!receiver) {
    //                     console.log(`No user found for studentId: ${studentId}`);
    //                     continue;
    //                 }

    //                 let ndata = {
    //                     msg: `Coach ${req.auth.first_name} ${req.auth.last_name} has promoted new slots for booking from ${req.body.start_time} to ${req.body.end_time} on ${req.body.date}.`,
    //                     title: "HiCoach",
    //                     request_id: add_slot.id,
    //                     message: `Coach ${req.auth.first_name} ${req.auth.last_name} has promoted new slots for booking from ${req.body.start_time} to ${req.body.end_time} on ${req.body.date}.`,
    //                     sender_image: req.auth.image,
    //                     sender_id: req.auth.id,
    //                     sender_name: `${req.auth.first_name} ${req.auth.last_name}`,
    //                     type: 9,
    //                 };

    //                 console.log(receiver.notify_class_requests, "receiver.notify_class_requests");

    //                 if (receiver.notify_class_requests === "yes") {
    //                     console.log("Notifications enabled for user:", receiver.id);
    //                     helper.sendPushNotification(receiver.device_token, ndata);
    //                 } else {
    //                     console.log(`Notification turned off or not configured for user_id: ${receiver.id}`);
    //                 }
    //             } catch (error) {
    //                 console.error(`Error processing studentId ${studentId}:`, error.message);
    //             }
    //         }

    //         return helper.success(res, "Promotion added successfully", add_slot);
    //     } catch (error) {
    //         console.error("Error in promote_slot:", error);
    //         return helper.error403(res, "An error occurred while adding the promotion");
    //     }
    // },


    promote_slot: async (req, res) => {
        try {

            const v = new Validator(req.body, {
                date: "required",       // Validates DD-MM-YYYY format
            });

            let errorsResponse = await helper.checkValidation(v);
            if (errorsResponse) {
                return helper.error403(res, errorsResponse);
            }

            let add_slot = await promote_slot.create({
                coach_id: req.auth.id,
                date: req.body.date,
            });

            let slotsArray;

            slotsArray = JSON.parse(req.body.slots);

            for (let slot of slotsArray) {
                let [start_time, end_time] = slot.split("-");

                const booking_slots_add = await promote_slotes_times.create({
                    promote_id: add_slot.id,
                    start_time: start_time,
                    end_time: end_time,
                    date: req.body.date,
                });
            }

            let find_booking = await bookings.findAll({
                where: {
                    coach_id: req.auth.id,
                    deleted_at: null,
                    user_id: {
                        [Op.ne]: 0, // Ensure user_id is not 0
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

            let combinedArray = [...new Set([...ids, ...ids1])];

            for (const studentId of combinedArray) {
                try {
                    let receiver = await users.findOne({
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
                            id: studentId,
                        },
                    });

                    if (!receiver) {
                        console.log(`No user found for studentId: ${studentId}`);
                        continue;
                    }

                    let ndata = {
                        msg: `Coach ${req.auth.first_name} ${req.auth.last_name} has promoted new slots for booking from ${req.body.start_time} to ${req.body.end_time} on ${req.body.date}.`,
                        title: "HiCoach",
                        request_id: add_slot.id,
                        message: `Coach ${req.auth.first_name} ${req.auth.last_name} has promoted new slots for booking from ${req.body.start_time} to ${req.body.end_time} on ${req.body.date}.`,
                        sender_image: req.auth.image,
                        sender_id: req.auth.id,
                        sender_name: `${req.auth.first_name} ${req.auth.last_name}`,
                        type: 9,
                    };

                    console.log(receiver.notify_class_requests, "receiver.notify_class_requests");

                    if (receiver.notify_class_requests === "yes") {
                        console.log("Notifications enabled for user:", receiver.id);
                        helper.sendPushNotification(receiver.device_token, ndata);
                    } else {
                        console.log(`Notification turned off or not configured for user_id: ${receiver.id}`);
                    }
                } catch (error) {
                    console.error(`Error processing studentId ${studentId}:`, error.message);
                }
            }

            return helper.success(res, "Promotion added successfully", add_slot);
        } catch (error) {
            console.error("Error in promote_slot:", error);
            return helper.error403(res, "An error occurred while adding the promotion");
        }
    },

    //// slotes working fine 24 hr...........l.
    // get_week_slotes: async (req, res) => {
    //     try {
    //         const { date, user_id } = req.body;
    //         const inputDate = moment(date, "DD-MM-YYYY");

    //         // Set the number of occurrences you want (7 occurrences)
    //         const occurrencesCount = 7;

    //         // Retrieve the user's schedule from the database
    //         const find_days = await coach_schedule_days.findAll({
    //             include: [
    //                 {
    //                     model: coach_schedule_times,
    //                     as: "times_details",
    //                 },
    //             ],
    //             where: {
    //                 user_id: user_id,
    //                 status: 1,
    //             },
    //         });

    //         let nextOccurrences = [];

    //         // Function to generate time slots for a specific day (24-hour format)
    //         const generateFullDaySlots = () => {
    //             const slots = [];
    //             let start = moment("00:00", "HH:mm");

    //             for (let i = 0; i < 24; i++) {
    //                 let slotEnd = start.clone().add(1, "hour");
    //                 slots.push({
    //                     start_time: start.format("H:mm"),
    //                     end_time: slotEnd.format("H:mm"),
    //                     status: 1 // All slots are initially available (status: 1)
    //                 });
    //                 start = slotEnd;
    //             }
    //             return slots;
    //         };

    //         // Function to generate next occurrences for each day of the week
    //         const getNextOccurrences = (inputDate, dayOfWeek, occurrencesCount) => {
    //             let occurrences = [];
    //             let currentDay = inputDate.clone().startOf('week').add(dayOfWeek - 1, 'days');

    //             for (let i = 0; i < occurrencesCount; i++) {
    //                 occurrences.push({
    //                     day: currentDay.format('dddd'),
    //                     date: currentDay.format('DD-MM-YYYY'),
    //                 });
    //                 currentDay = currentDay.add(1, 'week');
    //             }

    //             return occurrences;
    //         };


    //         for (let schedule of find_days) {

    //             let weekDates = [];
    //             const dayOfWeek = schedule.day;  // The "day" value (1 = Monday, 2 = Tuesday, etc.)


    //             weekDates = getNextOccurrences(inputDate, dayOfWeek, occurrencesCount);

    //             // Add the schedule and next occurrences for this day
    //             nextOccurrences.push({
    //                 day: schedule.name,
    //                 schedule: schedule,
    //                 next_occurrences: weekDates,
    //             });
    //         }

    //         const generateSlotsForDay = (dayDetails) => {
    //             let all_slots = generateFullDaySlots();

    //             if (Array.isArray(dayDetails.times_details)) {
    //                 dayDetails.times_details.forEach((time) => {
    //                     const coachSlots = generateHourlySlots(time.start_time, time.end_time);


    //                     coachSlots.forEach(coachSlot => {
    //                         all_slots = all_slots.map(slot => {
    //                             if (slot.start_time === coachSlot.start_time && slot.end_time === coachSlot.end_time) {
    //                                 return coachSlot;
    //                             }
    //                             return slot;
    //                         });
    //                     });
    //                 });
    //             }

    //             return all_slots;
    //         };

    //         const generateHourlySlots = (startTime, endTime) => {
    //             const slots = [];
    //             let start = moment(startTime, "HH:mm");
    //             const end = moment(endTime, "HH:mm");

    //             while (start < end) {
    //                 let slotEnd = moment.min(start.clone().add(1, "hour"), end);
    //                 slots.push({
    //                     start_time: start.format("H:mm"),
    //                     end_time: slotEnd.format("H:mm"),
    //                     status: 0
    //                 });
    //                 start = slotEnd;
    //             }

    //             return slots;
    //         };

    //         let groupedSlots = [];

    //         nextOccurrences.forEach((occurrence) => {
    //             let daySlots = {
    //                 day: occurrence.day,
    //                 dates: occurrence.next_occurrences.map((dateDetails) => {
    //                     return {
    //                         date: dateDetails.date,
    //                         slots: generateSlotsForDay(occurrence.schedule),
    //                     };
    //                 })
    //             };

    //             groupedSlots.push(daySlots);
    //         });
    //         let currentDate = req.body.date; 
    //         let finalData = [];

    //         let currentDateComparable = new Date(currentDate.split("-").reverse().join("-"));

    //         groupedSlots.forEach(day => {
    //             day.dates.forEach(dateObj => {
    //                 let dateKey = dateObj.date;
    //                 let dateComparable = new Date(dateKey.split("-").reverse().join("-"));

    //                 if (dateComparable >= currentDateComparable) {
    //                     let slots = dateObj.slots;
    //                     finalData.push({ date: dateKey ,
    //                         slots: slots 
    //                     });
    //                 }
    //             });
    //         });

    //                  finalData.sort((a, b) => {
    //             let dateA = new Date(a.date.split("-").reverse().join("-")); 
    //             let dateB = new Date(b.date.split("-").reverse().join("-")); 
    //             return dateA - dateB;
    //         });
    //         let limitedData = finalData.slice(0, 7);
    //         let dateArray = finalData.map(item => Object.keys(item)[0]);

    //         let formattedDateArray = dateArray.map(date => moment(date, "DD-MM-YYYY").format("YYYY-MM-DD"));

    //         let find_booking = await bookings.findAll({
    //             include: [
    //                 {
    //                     model: booking_slotes,
    //                     as: "slot_times",
    //                 }
    //             ],
    //             where: {
    //                 coach_id: user_id,
    //                 date: {
    //                     [Op.in]: formattedDateArray // Check if the booking date is in dateArray
    //                 },
    //                 [Op.or]: [
    //                     {
    //                         booking_status: [1, 2], // for other bookings
    //                     },
    //                     {
    //                         user_id: req.auth.id, // for user's booking
    //                         booking_status: [0],
    //                     }
    //                 ],
    //             },
    //         });


    //         let bookedSlots = find_booking.flatMap(booking =>
    //             booking.slot_times.map(slotTime => ({
    //                 start_time: slotTime.start_time,
    //                 end_time: slotTime.end_time,
    //                 date: slotTime.date,
    //                 status: 0 // Treat booked slots with status 0
    //             }))
    //         );

    //         return helper.success(res, "Get slots successfully", {
    //             weekly_slots: limitedData,
    //             bookedSlots: bookedSlots
    //         });


    //     } catch (error) {
    //         console.log(error);
    //         return res.status(403).json({ error: error.message });
    //     }
    // },
    // get_week_slotes: async (req, res) => {
    //     try {
    //         const { date, user_id } = req.body;
    //         const inputDate = moment(date, "DD-MM-YYYY");

    //         const occurrencesCount = 7;

    //         const find_days = await coach_schedule_days.findAll({
    //             include: [
    //                 {
    //                     model: coach_schedule_times,
    //                     as: "times_details",
    //                 },
    //             ],
    //             where: {
    //                 user_id: user_id,
    //                 status: 1,
    //             },
    //         });


    //         let nextOccurrences = [];

    //         const getNextOccurrences = (inputDate, dayOfWeek, occurrencesCount) => {
    //             let occurrences = [];
    //             // Use isoWeek to ensure the week starts on Monday
    //             let currentDay = inputDate.clone().startOf('isoWeek').add(dayOfWeek - 1, 'days'); 

    //             for (let i = 0; i < occurrencesCount; i++) {
    //                 occurrences.push({
    //                     day: currentDay.format('dddd'),  // Get day name
    //                     date: currentDay.format('DD-MM-YYYY'),  // Get date in the desired format
    //                 });
    //                 currentDay = currentDay.add(1, 'week');
    //             }

    //             return occurrences;
    //         };

    //         for (let schedule of find_days) {
    //             let weekDates = [];
    //             const dayOfWeek = schedule.day;
    //             weekDates = getNextOccurrences(inputDate, dayOfWeek, occurrencesCount);

    //             nextOccurrences.push({
    //                 day: schedule.name,
    //                 schedule: schedule,
    //                 next_occurrences: weekDates,
    //             });
    //         }

    //         const generateSlotsForDay = (dayDetails) => {
    //             let all_slots = [];

    //             if (Array.isArray(dayDetails.times_details)) {
    //                 dayDetails.times_details.forEach((time) => {
    //                     const coachSlots = generateHourlySlots(time.start_time, time.end_time);

    //                     coachSlots.forEach(coachSlot => {
    //                         all_slots.push(coachSlot);
    //                     });
    //                 });
    //             }

    //             return all_slots;
    //         };

    //         const generateHourlySlots = (startTime, endTime) => {
    //             const slots = [];
    //             let start = moment(startTime, "HH:mm");
    //             const end = moment(endTime, "HH:mm");

    //             while (start < end) {
    //                 let slotEnd = moment.min(start.clone().add(1, "hour"), end);
    //                 slots.push({
    //                     start_time: start.format("H:mm"),
    //                     end_time: slotEnd.format("H:mm"),
    //                     status: 0
    //                 });
    //                 start = slotEnd;
    //             }

    //             return slots;
    //         };

    //         let groupedSlots = [];

    //         nextOccurrences.forEach((occurrence) => {
    //             let daySlots = {
    //                 day: occurrence.day,
    //                 dates: occurrence.next_occurrences.map((dateDetails) => {
    //                     return {
    //                         date: dateDetails.date,
    //                         slots: generateSlotsForDay(occurrence.schedule),
    //                     };
    //                 })
    //             };

    //             groupedSlots.push(daySlots);
    //         });

    //         let currentDate = req.body.date;
    //         let finalData = [];

    //         let currentDateComparable = new Date(currentDate.split("-").reverse().join("-"));

    //         groupedSlots.forEach(day => {
    //             day.dates.forEach(dateObj => {
    //                 let dateKey = dateObj.date;
    //                 let dateComparable = new Date(dateKey.split("-").reverse().join("-"));

    //                 if (dateComparable >= currentDateComparable) {
    //                     let slots = dateObj.slots;
    //                     finalData.push({
    //                         date: dateKey,
    //                         slots: slots
    //                     });
    //                 }
    //             });
    //         });

    //         finalData.sort((a, b) => {
    //             let dateA = new Date(a.date.split("-").reverse().join("-"));
    //             let dateB = new Date(b.date.split("-").reverse().join("-"));
    //             return dateA - dateB;
    //         });

    //         let get_final_data = finalData.filter(slot => slot.slots.length > 0);
    //         let limitedData = get_final_data.slice(0, 7);

    //         let dateArray = get_final_data.map(item => Object.keys(item)[0]);

    //         let formattedDateArray = dateArray.map(date => moment(date, "DD-MM-YYYY").format("YYYY-MM-DD"));

    //         let find_booking = await bookings.findAll({
    //             include: [
    //                 {
    //                     model: booking_slotes,
    //                     as: "slot_times",
    //                 }
    //             ],
    //             where: {
    //                 coach_id: user_id,
    //                 date: {
    //                     [Op.in]: formattedDateArray // Check if the booking date is in dateArray
    //                 },
    //                 [Op.or]: [
    //                     {
    //                         booking_status: [1, 2], // for other bookings
    //                     },
    //                     {
    //                         user_id: req.auth.id, // for user's booking
    //                         booking_status: [0],
    //                     }
    //                 ],
    //             },
    //         });


    //         let bookedSlots = find_booking.flatMap(booking =>
    //             booking.slot_times.map(slotTime => ({
    //                 start_time: slotTime.start_time,
    //                 end_time: slotTime.end_time,
    //                 date: slotTime.date,
    //                 status: 0 // Treat booked slots with status 0
    //             }))
    //         );

    //         return helper.success(res, "Get slots successfully", {
    //             weekly_slots: limitedData,
    //             bookedSlots: bookedSlots
    //         });


    //     } catch (error) {
    //         console.log(error);
    //         return res.status(403).json({ error: error.message });
    //     }
    // }

    // get_week_slotes: async (req, res) => {
    //     try {
    //         const { date, user_id } = req.body;
    //         const inputDate = moment(date, "DD-MM-YYYY");

    //         const occurrencesCount = 7;

    //         const find_days = await coach_schedule_days.findAll({
    //             include: [
    //                 {
    //                     model: coach_schedule_times,
    //                     as: "times_details",
    //                 },
    //             ],
    //             where: {
    //                 user_id: user_id,
    //                 status: 1,
    //             },
    //         });

    //         let nextOccurrences = [];

    //         const getNextOccurrences = (inputDate, dayOfWeek, occurrencesCount) => {
    //             let occurrences = [];
    //             // Use isoWeek to ensure the week starts on Monday
    //             let currentDay = inputDate.clone().startOf('isoWeek').add(dayOfWeek - 1, 'days'); 

    //             for (let i = 0; i < occurrencesCount; i++) {
    //                 occurrences.push({
    //                     day: currentDay.format('dddd'),  // Get day name
    //                     date: currentDay.format('DD-MM-YYYY'),  // Get date in the desired format
    //                 });
    //                 currentDay = currentDay.add(1, 'week');
    //             }

    //             return occurrences;
    //         };

    //         for (let schedule of find_days) {
    //             let weekDates = [];
    //             const dayOfWeek = schedule.day;
    //             weekDates = getNextOccurrences(inputDate, dayOfWeek, occurrencesCount);

    //             nextOccurrences.push({
    //                 day: schedule.name,  // Store the day name
    //                 next_occurrences: weekDates,  // Store the list of next occurrences
    //             });
    //         }

    //         // Now we only need to return the days and dates
    //         let finalData = [];

    //         nextOccurrences.forEach((occurrence) => {
    //             finalData.push({
    //                 day: occurrence.day,
    //                 dates: occurrence.next_occurrences.map((dateDetails) => dateDetails.date), // Only include date
    //             });
    //         });

    //         return helper.success(res, "Get slots successfully", {
    //             weekly_slots: finalData,  // Only returning day and date as requested
    //         });

    //     } catch (error) {
    //         console.log(error);
    //         return res.status(403).json({ error: error.message });
    //     }
    // }

    get_week_slotes: async (req, res) => {
        try {
            const { date, user_id } = req.body;
            const inputDate = moment(date, "DD-MM-YYYY");

            const occurrencesCount = 7;

            const find_days = await coach_schedule_days.findAll({
                include: [
                    {
                        model: coach_schedule_times,
                        as: "times_details",
                    },
                ],
                where: {
                    user_id: user_id,
                    status: 1,
                },
            });

            let nextOccurrences = [];

            const getNextOccurrences = (inputDate, dayOfWeek, occurrencesCount) => {
                let occurrences = [];
                let currentDay = inputDate.clone().startOf('isoWeek').add(dayOfWeek - 1, 'days');

                for (let i = 0; i < occurrencesCount; i++) {
                    occurrences.push({
                        day: currentDay.format('dddd'),
                        date: currentDay.format('DD-MM-YYYY'),
                    });
                    currentDay = currentDay.add(1, 'week');
                }

                return occurrences;
            };

            for (let schedule of find_days) {
                let weekDates = [];
                const dayOfWeek = schedule.day;
                weekDates = getNextOccurrences(inputDate, dayOfWeek, occurrencesCount);

                nextOccurrences.push({
                    day: schedule.name,
                    schedule: schedule,
                    next_occurrences: weekDates,
                });
            }

            const generateSlotsForDay = (dayDetails,slotedate) => {
                let all_slots = [];

                if (Array.isArray(dayDetails.times_details)) {
                    dayDetails.times_details.forEach((time) => {
                        const coachSlots = generateHourlySlots(time.start_time, time.end_time,slotedate);
                        coachSlots.forEach(coachSlot => {
                            all_slots.push(coachSlot);
                        });
                    });
                }
                return all_slots;
            };

            const generateHourlySlots = (startTime, endTime,slote_date) => {
                const slots = [];

                let start = moment(startTime, "HH:mm");
                const end = moment(endTime, "HH:mm");

                while (start < end) {
                    let slotEnd = moment.min(start.clone().add(1, "hour"), end);
                   
                   
                    slots.push({

                        date:slote_date,
                        start_time: start.format("H:mm"),
                        end_time: slotEnd.format("H:mm"),
                        status: 0

                    });
                    start = slotEnd;
                }

                return slots;
            };

            let groupedSlots = [];

            nextOccurrences.forEach((occurrence) => {
                let daySlots = {
                    day: occurrence.day,
                    dates: occurrence.next_occurrences.map((dateDetails) => {
                        return {
                            date: dateDetails.date,
                            slots: generateSlotsForDay(occurrence.schedule,dateDetails.date),
                        };
                    })
                };

                groupedSlots.push(daySlots);
            });

            let currentDate = req.body.date;
            let finalData = [];

            let currentDateComparable = new Date(currentDate.split("-").reverse().join("-"));

            groupedSlots.forEach(day => {
                day.dates.forEach(dateObj => {
                    let dateKey = dateObj.date;                  
                    let dateComparable = new Date(dateKey.split("-").reverse().join("-"));

                    if (dateComparable >= currentDateComparable) {
                        let slots = dateObj.slots;
                            finalData.push({
                            date: dateKey,
                            day: day.day,  
                            slots: slots
                        });
                    }
                });
            });

            finalData.sort((a, b) => {
                let dateA = new Date(a.date.split("-").reverse().join("-"));
                let dateB = new Date(b.date.split("-").reverse().join("-"));
                return dateA - dateB;
            });

            let get_final_data = finalData.filter(slot => slot.slots.length > 0);
            let limitedData = get_final_data.slice(0, 7);


            let dateArray = limitedData.map(item => item.date);

            let formattedDateArray = dateArray.map(date => moment(date, "DD-MM-YYYY").format("DD-MM-YYYY"));

            let find_booking = await bookings.findAll({
                include: [
                    {
                        model: booking_slotes,
                        as: "slot_times",
                    }
                ],
                where: {
                    coach_id: user_id,
                    booking_status: [1, 2],
                    date: formattedDateArray,
                    payment_status: 1
                    // [Op.or]: [
                    //     {
                    //         booking_status: [1, 2], // for other bookings
                    //     },
                    //     {
                    //         user_id: req.auth.id, // for user's booking
                    //         booking_status: [0],
                    //     }
                    // ],
                },
            });

            let bookedSlots = find_booking.flatMap(booking =>
                booking.slot_times.map(slotTime => ({
                    start_time: slotTime.start_time,
                    end_time: slotTime.end_time,
                    date: slotTime.date,
                    status: 0 // Treat booked slots with status 0
                }))
            );

            return helper.success(res, "Get slots successfully", {
                weekly_slots: limitedData,
                bookedSlots: bookedSlots
            });

        } catch (error) {
            console.log(error);
            return res.status(403).json({ error: error.message });
        }
    }





};
