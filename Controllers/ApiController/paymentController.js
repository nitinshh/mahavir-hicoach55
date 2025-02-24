const db = require("../../models");
const envfile = process.env;
const helper = require("../../helpers/helper");
const { Validator } = require("node-input-validator");
const sequelize = require("sequelize");
const moment = require('moment');
const Op = sequelize.Op;
const stripe = require("stripe")(
    envfile.stripe
);
const publish_key = envfile.publish_key
const { users, bookings, transactions, user_packages, notifications, sockets } = require("../../models");


transactions.belongsTo(users, {
    foreignKey: "coach_id",
    as: "coachdatas",
});
transactions.belongsTo(users, {
    foreignKey: "user_id",
    as: "userdatas",
});


// cron.schedule("0 * * * *", async () => {
//     try {
//       let today_data = new Date();
//       let start_date = moment(today_data).format("YYYY-MM-DD");
//       let future_date = moment(today_data).add(1, "days").format("YYYY-MM-DD");
  
//       const find_all = await transactions.findAll({
//         where: {
//             settlement_status:0,
//                  },
//         order: [["id", "DESC"]],
//       });
  
//       for (let index = 0; index < find_all.length; index++) {
//         const transactionId = find_all[index].id;
//         const bookingId = find_all[index].booking_id;
//         const req_amount = find_all[index].net_amount;
  
//         const find_booking = await bookings.findOne({
//           where: { id: bookingId },
//           raw: true,
//         });
  
//         // Check job status is completed for both user and vendor
//         if (find_booking.booking_status == 2 && find_booking.payment_status == 1) {
//           const find_coach = await users.findOne({
//             where: { id: find_booking.coach_id },
//             raw: true,
//           });
  
//           const user_wallet = find_coach.wallet_amount;
//           const total_amount = parseFloat(user_wallet) + parseFloat(req_amount);
//           const balance = await stripe.balance.retrieve();
//           let isBalanceSufficient = false;
  
//           // Check if Stripe balance is sufficient
//           for (const availableBalance of balance.available) {
//             const amount = availableBalance.amount / 100;
//             if (parseFloat(req_amount) <= amount) {
//               isBalanceSufficient = true;
//               break;
//             }
//           }
  
//           if (!isBalanceSufficient) {
//             console.log("You can't withdraw the amount now. Please try again later!");
//             return helper.error403(
//               res,
//               "You can't withdraw the amount now. Please try again later!"
//             );
//           } else {
//             const transferResponse = await stripe.transfers.create({
//               amount: Math.round(req_amount * 100),
//               currency: "SGD",
//               destination: find_coach.stripeAccountId,
//               transfer_group: new Date() + " transfer date",
//             });
  
//             await users.update(
//               { wallet_amount: total_amount },
//               { where: { id: find_coach.id } }
//             );
//             await transactions.update(
//               {
//                 settlement_status: 1,
//                 settlement_date: start_date,
//               },
//               { where: { id: transactionId } }
//             );
//           }
//         }
//       }
  
//       return helper.success("Data processed successfully");
//     } catch (error) {
//       console.error("Error processing transactions:", error);
//       return helper.error403(res, error);
//     }
//   });
  
module.exports = {
 
    // payment_api: async (req, res) => {
    //     try {
    //         const v = new Validator(req.body, {
    //             booking_id: "required",
    //             coach_id: "required",
    //             amount: "required",
    //         });

    //         let errorsResponse = await helper.checkValidation(v);
    //         if (errorsResponse) {
    //             return helper.error403(res, errorsResponse);
    //         }
    //         const find_admincomission = await users.findOne({
    //             attributes: [`commission`],
    //             where: { role: 0 },
    //             raw: true

    //         });
    //         const find_booking = await bookings.findOne({
    //             where: { id: req.body.booking_id },
    //             raw: true
    //         });
    //         req.body.amount = parseFloat(req.body.amount).toFixed(2);
    //         const Amount = req.body.amount;
    //         const adminCommison = parseFloat(find_admincomission.commission);
    //         const adminFees = ((adminCommison / 100) * Amount).toFixed(2);
    //         const stripe_fee = 0.029;
    //         const Fixed_Fee = 0.3;
    //         const value = Amount * stripe_fee;
    //         const stripe_total_fee = value + Fixed_Fee;
    //         const StripeFee = parseFloat(stripe_total_fee).toFixed(2);
    //         const appFees = parseFloat(adminFees) + parseFloat(StripeFee);
    //         const netAmount = Amount - appFees;

    //         let student_details = await db.users.findOne({
    //             where: {
    //                 id: req.auth.id,
    //             },
    //             raw: true,
    //         });
    //         let Coach_details = await users.findOne({
    //             where: {
    //                 id: req.body.coach_id,
    //             },
    //             raw: true,
    //             nest: true
    //         });
    //         let payment_type = 1
    //         let payment = await helper.stripePayment(req.body.amount, student_details, find_booking, Coach_details, payment_type);

    //         if (payment) {
    //             let paymentResponse = {
    //                 paymentIntent: payment.paymentIntent.client_secret,
    //                 ephemeralKey: payment.ephemeralKey.secret,
    //                 customer: student_details.stripe_id,
    //                 publishableKey: publish_key,
    //                 transactionId: payment.paymentIntent.id,
    //             };

    //             let transaction_data = await db.transactions.create({
    //                 user_id: req.auth.id,
    //                 coach_id: find_booking.coach_id,
    //                 type: 1,////booking
    //                 booking_id: find_booking.id,
    //                 amount: req.body.amount,
    //                 commission: find_admincomission.commission,
    //                 commission_amount: adminFees,
    //                 coach_amount: netAmount,
    //                 settlement_status: 0,
    //                 stripe_charge: stripe_fee,
    //                 net_amount: netAmount,
    //                 payment_mode: 0, 
    //                 transaction_id: payment.paymentIntent.id,
    //             });

    //             return helper.success(res, "Payment process complete Successfully", {
    //                 paymentResponse,
    //             });
    //         }
    //     } catch (error) {
    //         console.log(error);
    //         return helper.error403(res, "Error occurred while processing payment");
    //     }
    // },
    // payment_api: async (req, res) => {
    //     try {
    //         const v = new Validator(req.body, {
    //             booking_id: "required",
    //             coach_id: "required",
    //             amount: "required",
    //         });
    
    //         let errorsResponse = await helper.checkValidation(v);
    //         if (errorsResponse) {
    //             return helper.error403(res, errorsResponse);
    //         }
    
    //         const find_admincomission = await users.findOne({
    //             attributes: [`commission`],
    //             where: { role: 0 },
    //             raw: true
    //         });
    
    //         const find_booking = await bookings.findOne({
    //             where: { id: req.body.booking_id },
    //             raw: true
    //         });
    
    //         req.body.amount = parseFloat(req.body.amount).toFixed(2);
    //         const Amount = req.body.amount;
    
    //         // Stripe fee calculation
    //         const stripe_fee = 0.029;
    //         const Fixed_Fee = 0.3;
    //         const stripeVariableFee = Amount * stripe_fee;
    //         const stripe_total_fee = stripeVariableFee + Fixed_Fee;
    //         const StripeFee = parseFloat(stripe_total_fee).toFixed(2);
    
    //         // Subtract Stripe fee from Amount first
    //         const amountAfterStripeFee = Amount - stripe_total_fee;
    
    //         // Admin commission calculation based on remaining amount
    //         const adminCommison = parseFloat(find_admincomission.commission);
    //         const adminFees = ((adminCommison / 100) * amountAfterStripeFee).toFixed(2);
    
    //         // Calculate net amount after all fees
    //         const netAmount = amountAfterStripeFee - parseFloat(adminFees);
    
    //         let student_details = await db.users.findOne({
    //             where: {
    //                 id: req.auth.id,
    //             },
    //             raw: true,
    //         });
    
    //         let Coach_details = await users.findOne({
    //             where: {
    //                 id: req.body.coach_id,
    //             },
    //             raw: true,
    //             nest: true
    //         });
    
    //         let payment_type = 1;
    //         let payment = await helper.stripePayment(req.body.amount, student_details, find_booking, Coach_details, payment_type);
    
    //         if (payment) {
    //             let paymentResponse = {
    //                 paymentIntent: payment.paymentIntent.client_secret,
    //                 ephemeralKey: payment.ephemeralKey.secret,
    //                 customer: student_details.stripe_id,
    //                 publishableKey: publish_key,
    //                 transactionId: payment.paymentIntent.id,
    //             };
    
    //             let transaction_data = await db.transactions.create({
    //                 user_id: req.auth.id,
    //                 coach_id: find_booking.coach_id,
    //                 type: 1, // booking
    //                 booking_id: find_booking.id,
    //                 amount: req.body.amount,
    //                 commission: find_admincomission.commission,
    //                 commission_amount: adminFees,
    //                 coach_amount: netAmount,
    //                 settlement_status: 0,
    //                 stripe_charge: StripeFee,
    //                 net_amount: netAmount,
    //                 payment_mode: 0, 
    //                 transaction_id: payment.paymentIntent.id,
    //             });
    
    //             return helper.success(res, "Payment process complete Successfully", {
    //                 paymentResponse,
    //             });
    //         }
    //     } catch (error) {
    //         console.log(error);
    //         return helper.error403(res, "Error occurred while processing payment");
    //     }
    // },
    payment_api: async (req, res) => {
        try {
            const v = new Validator(req.body, {
                booking_id: "required",
                coach_id: "required",
                amount: "required",
            });
    
            let errorsResponse = await helper.checkValidation(v);
            if (errorsResponse) {
                return helper.error403(res, errorsResponse);
            }
    
            const find_admincomission = await users.findOne({
                attributes: [`commission`],
                where: { role: 0 },
                raw: true
            });
    
            const find_booking = await bookings.findOne({
                where: { id: req.body.booking_id },
                raw: true
            });
    
            req.body.amount = parseFloat(req.body.amount).toFixed(2);
            const Amount = req.body.amount;
    
            // Step 1: Admin commission is deducted first
            const adminCommison = parseFloat(find_admincomission.commission);
            const adminFees = ((adminCommison / 100) * Amount).toFixed(2);
    
            // Step 2: Deduct Stripe fee from admin commission
            const stripe_fee = 0.029;
            const Fixed_Fee = 0.3;
            const stripeVariableFee = Amount * stripe_fee;
            const stripe_total_fee = stripeVariableFee + Fixed_Fee;
            const StripeFee = parseFloat(stripe_total_fee).toFixed(2);
    
            // Admin commission after Stripe fee deduction
            const adminFeesAfterStripe = adminFees - stripe_total_fee;
    
            // Step 3: Calculate net amount for the coach
            const netAmount = Amount - parseFloat(adminFees);
    
            let student_details = await db.users.findOne({
                where: {
                    id: req.auth.id,
                },
                raw: true,
            });
    
            let Coach_details = await users.findOne({
                where: {
                    id: req.body.coach_id,
                },
                raw: true,
                nest: true
            });
    
            let payment_type = 1;
            let payment = await helper.stripePayment(req.body.amount, student_details, find_booking, Coach_details, payment_type);
    
            if (payment) {
                let paymentResponse = {
                    paymentIntent: payment.paymentIntent.client_secret,
                    ephemeralKey: payment.ephemeralKey.secret,
                    customer: student_details.stripe_id,
                    publishableKey: publish_key,
                    transactionId: payment.paymentIntent.id,
                };
    
                let transaction_data = await db.transactions.create({
                    user_id: req.auth.id,
                    coach_id: find_booking.coach_id,
                    type: 1, // booking
                    booking_id: find_booking.id,
                    amount: req.body.amount,
                    commission: find_admincomission.commission,
                    commission_amount: adminFeesAfterStripe.toFixed(2),
                    coach_amount: netAmount,
                    settlement_status: 0,
                    stripe_charge: StripeFee,
                    net_amount: netAmount,
                    payment_mode: 0,
                    transaction_id: payment.paymentIntent.id,
                });
    
                return helper.success(res, "Payment process complete Successfully", {
                    paymentResponse,
                });
            }
        } catch (error) {
            console.log(error);
            return helper.error403(res, "Error occurred while processing payment");
        }
    },
    
    
    payment_api_package: async (req, res) => {
        try {
            const v = new Validator(req.body, {
                package_id: "required",
                amount: "required",
            });

            let errorsResponse = await helper.checkValidation(v);
            if (errorsResponse) {
                return helper.error403(res, errorsResponse);
            }
            const find_admincomission = await users.findOne({
                attributes: [`commission`],
                where: { role: 0 },
                raw: true

            });
            const find_package = await user_packages.findOne({
                where: { id: req.body.package_id },
                raw: true

            });

            req.body.amount = parseFloat(req.body.amount).toFixed(2);
            const Amount = req.body.amount;
            const adminCommison = parseFloat(find_admincomission.commission);
            const adminFees = ((adminCommison / 100) * Amount).toFixed(2);
            const stripe_fee = 0.029;
            const Fixed_Fee = 0.3;
            const value = Amount * 0.029;
            const stripe_total_fee = value + Fixed_Fee;
            const StripeFee = parseFloat(stripe_total_fee).toFixed(2);
            const appFees = parseFloat(adminFees) + parseFloat(StripeFee);
            const netAmount = Amount - appFees;

            let student_details = await users.findOne({
                where: {
                    id: find_package.user_id,
                },
                raw: true,
            });
            let Coach_details = await users.findOne({
                where: {
                    id: find_package.coach_id,
                },
                raw: true,
                nest: true
            });

            let payment_type = 2
            let payment = await helper.stripePayment(req.body.amount, student_details, find_package, Coach_details, payment_type);

            if (payment) {
                let paymentResponse = {
                    paymentIntent: payment.paymentIntent.client_secret,
                    ephemeralKey: payment.ephemeralKey.secret,
                    customer: student_details.stripe_id,
                    publishableKey: publish_key,
                    transactionId: payment.paymentIntent.id,
                };

                let transaction_data = await transactions.create({
                    user_id: req.auth.id,
                    coach_id: find_package.coach_id,
                    type: 2,////buy package
                    booking_id: find_package.id,
                    amount: req.body.amount,
                    commission: find_admincomission.commission,
                    commission_amount: adminFees,
                    coach_amount: netAmount,
                    payment_status: 0,
                    stripe_charge: stripe_fee,
                    net_amount: netAmount,
                    payment_mode: 0, // Assuming payment is successful
                    transaction_id: payment.paymentIntent.id,
                });

                return helper.success(res, "Payment process complete Successfully", {
                    paymentResponse,
                });
            }
        } catch (error) {
            console.log(error);
            return helper.error403(res, "Error occurred while processing payment");
        }
    },
    stripe_status_update: (io) => {
        return async (req, res) => {
  
        try {

            // const balance = await stripe.balance.retrieve();
            // console.log('Balance:', balance);return;
            const find_transaction = await transactions.findOne({
                where: {
                    transaction_id: req.body.transaction_id,
                },
                raw: true,
            });

            if (find_transaction) {
                if (find_transaction.type == 1) {
                    let job_detatils = await bookings.findOne({
                        include: [
                            {
                                model: users,
                                as: "coachDetails"
                            },
                            {
                                model: users,
                                as: "userDetails"
                            }
                        ],
                        where: {
                            id: find_transaction.booking_id,
                        },
                      
                    });
                    await bookings.update(
                        {
                            payment_status: 1, // 1= success
                        },
                        {
                            where: {
                                id: job_detatils.id,
                            },
                        }
                    );
                    // Notification data
                    let ndata = {
                        msg: `${job_detatils.userDetails.first_name} ${job_detatils.userDetails.last_name} created a new booking`,
                        title: "HiCoach",
                        request_id: job_detatils.id,
                        message: `${job_detatils.userDetails.first_name} ${job_detatils.userDetails.last_name} created a new booking`,
                        sender_image: `${job_detatils.userDetails.image}`,
                        sender_id: `${job_detatils.userDetails.id}`,
                        sender_name: `${job_detatils.userDetails.first_name} ${job_detatils.userDetails.last_name} `,
                        type: 5,
                    };

                    if (job_detatils.coachDetails.notify_class_requests == "yes") {

                        helper.sendPushNotification(job_detatils.coachDetails.device_token, ndata);
                    } else {
                        console.log(`Notification turned off for user_id: ${job_detatils.coachDetails.id}`);
                    }
                    await notifications.create({
                        request_id: job_detatils.id,
                        sender_id: job_detatils.userDetails.id,
                        receiver_id: job_detatils.coach_id,
                        notification_type: 5,
                        title: "New Booking",
                        body: `${job_detatils.userDetails.first_name} ${job_detatils.userDetails.last_name} created a new booking`,
                        data: JSON.stringify({ booking_id: job_detatils.id }),
                    });
                    let find_coach_socket = await sockets.findOne({
                        where: {
                            user_id: job_detatils.coach_id,
                        },
                        raw: true,
                    });

                    let success_message = {
                        success_message: "Booking created successfully",
                        data: job_detatils,
                    };

                    if (find_coach_socket && find_coach_socket.socket_id) {
                        io.to(find_coach_socket.socket_id).emit(
                            "class_request",
                            success_message
                        );
                    }
                } else {
                    let job_detatils = await user_packages.findOne({
                        where: {
                            id: find_transaction.booking_id,
                        },
                        raw: true,
                    });
                    await user_packages.update(
                        {
                            payment_status: 1, // 1= success
                        },
                        {
                            where: {
                                id: job_detatils.id,
                            },
                        }
                    );
                }
                await transactions.update(
                    {
                        payment_status: 1, //   1= success ,inprogress
                    },
                    {
                        where: {
                            id: find_transaction.id,
                        },
                    }
                );

                let msg = "Payment successfully done";
                return helper.success(res, msg);
            }
        } catch (error) {
            return helper.error403(res, error);
        }
    }},
    coach_transactions: async (req, res) => {
        try {
            const v = new Validator(req.body, {
                type: "required",
            });

            let errorsResponse = await helper.checkValidation(v);
            if (errorsResponse) {
                return helper.error403(res, errorsResponse);
            }

            let dateRange = {};
            let groupBy = '';
            let rangeLabels = [];

            if (req.body.type == 1) {
                // Current day
                dateRange = {
                    [Op.gte]: moment().startOf('day').toDate(),
                    [Op.lte]: moment().endOf('day').toDate()
                };
                groupBy = 'hour';
            } else if (req.body.type == 2) {
                // Current month (day-wise)
                dateRange = {
                    [Op.gte]: moment().startOf('month').toDate(),
                    [Op.lte]: moment().endOf('month').toDate()
                };
                groupBy = 'day';
                rangeLabels = Array.from({ length: moment().daysInMonth() }, (_, i) => moment().startOf('month').add(i, 'days').format('YYYY-MM-DD'));
            } else if (req.body.type == 3) {
                // Last six months (month-wise)
                dateRange = {
                    [Op.gte]: moment().subtract(5, 'months').startOf('month').toDate(),
                    [Op.lte]: moment().endOf('month').toDate()
                };
                groupBy = 'month';
                rangeLabels = Array.from({ length: 5 }, (_, i) => moment().subtract(i, 'months').format('YYYY-MM')).reverse();
            } else if (req.body.type == 4) {
                // Last 12 months (month-wise)
                dateRange = {
                    [Op.gte]: moment().subtract(12, 'months').startOf('month').toDate(),
                    [Op.lte]: moment().endOf('month').toDate()
                };
                groupBy = 'month';
                rangeLabels = Array.from({ length: 12 }, (_, i) => moment().subtract(i, 'months').format('YYYY-MM')).reverse();
            } else if (req.body.type == 5) {
                // Last 5 years (year-wise)
                dateRange = {
                    [Op.gte]: moment().subtract(5, 'years').startOf('year').toDate(),
                    [Op.lte]: moment().endOf('year').toDate()
                };
                groupBy = 'year';
                rangeLabels = Array.from({ length: 5 }, (_, i) => moment().subtract(i, 'years').format('YYYY')).reverse();
            }

            const transactions_data = await transactions.findAll({
                where: {
                    coach_id: req.auth.id,
                    created_at: dateRange
                },
                attributes: [
                    [sequelize.fn('SUM', sequelize.col('amount')), 'total_earning'],
                    [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), groupBy === 'hour' ? '%Y-%m-%d %H' : (groupBy === 'day' ? '%Y-%m-%d' : (groupBy === 'month' ? '%Y-%m' : '%Y'))), 'grouped_date']
                ],
                group: ['grouped_date'],
                raw: true,
            });

            // Create a map of transactions data
            let transactionMap = transactions_data.reduce((map, item) => {
                map[item.grouped_date] = parseFloat(item.total_earning) || 0;
                return map;
            }, {});

            // Fill missing dates with 0
            let result = rangeLabels.map(label => ({
                grouped_date: label,
                total_earning: transactionMap[label] || 0
            }));
            const list = await transactions.findAll({

                include: [
                    {
                        model: users,
                        as: 'userdatas',
                        attributes: ['id', 'first_name', 'last_name', 'email', 'image'] // Attributes specific to the userdatas
                    }
                ],
                where: {
                    coach_id: req.auth.id,
                    created_at: dateRange
                },

                order: [["id", "DESC"]],

                limit: 5
            });
            obj = {
                transactions_data: result,
                list: list
            }
            return helper.success(res, "Transaction data fetched successfully", obj);

        } catch (error) {
            console.log(error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },
    coach_transactions_list: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.pageSize) || 10;
            const offset = (page - 1) * limit;

            const { count, rows: list } = await transactions.findAndCountAll({
                include: [
                    {
                        model: users,
                        as: 'userdatas',
                        attributes: ['id', 'first_name', 'last_name', 'email', 'image'] // Attributes specific to the userdatas
                    }
                ],
                where: {
                    coach_id: req.auth.id
                },
                order: [['id', 'DESC']],
                limit,
                offset
            });
            const totalPages = Math.ceil(count / limit);
            return helper.success(res, "Transaction data fetched successfully", {
                list,
                currentPage: page,
                totalPages,
                totalRecords: count,
            });

        } catch (error) {
            console.log(error);
            return helper.failed(res, "Error fetching transaction data", error);
        }
    },
    student_transactions: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.pageSize) || 10;
            const offset = (page - 1) * limit;

            const { count, rows: list } = await transactions.findAndCountAll({
                include: [
                    {
                        model: users,
                        as: 'coachdatas',
                        attributes: ['id', 'first_name', 'last_name', 'email', 'image'] // Attributes specific to the userdatas
                    }
                ],
                where: {
                    user_id: req.auth.id,
                },
                order: [["id", "DESC"]],
                limit,
                offset

            });
            const totalPages = Math.ceil(count / limit);
            return helper.success(res, "Transaction data fetched successfully", {
                list,
                currentPage: page,
                totalPages,
                totalRecords: count,
            });

        } catch (error) {
            console.log(error);
            return helper.failed(res, "Error fetching transaction data", error);
        }
    },

   
}
