const { Attribute } = require('@aws-sdk/client-rekognition');
const helper = require('../helpers/helper')
const db = require('../models')
var CryptoJS = require("crypto-js");
const cron = require("node-cron");
const ENV = process.env
const { Op, fn, col } = require('sequelize');
const sequelize = require("sequelize");
var moment = require("moment");
const { fileLoader } = require('ejs');
var title = "dashboard"
const { users, bookings, contactus, sports, app_downtime_record } = require("../models");
const currentDateTime = moment(); 
const currentDate = currentDateTime.format('YYYY-MM-DD'); 
const currentTime = currentDateTime.format('HH:mm');  

cron.schedule('*/1 * * * *', async () => {  // Run every minute
  try {
 
    const recordsToUpdate = await app_downtime_record.findAll({
      where: {
        date: currentDate, // Date matching current date
        start_time: {
          [Op.lte]: currentTime, // Start time <= current time
        },
        status: 0, 
      },
    });

    for (const record of recordsToUpdate) {
      await record.update({ status: 1 });
      console.log(`Updated record with ID ${record.id} to Ongoing.`);
    }
  } catch (error) {
    console.error('Error in Cron Job 1 (Ongoing Status):', error);
  }
});

cron.schedule('*/1 * * * *', async () => {  // Run every minute
  try {
     const recordsToUpdate = await app_downtime_record.findAll({
      where: {
        date: currentDate, 
        end_time: {
          [Op.lte]: currentTime, // End time <= current time
        },
        status: 1, // Only update if status is 1 (Ongoing)
      },
    });

    for (const record of recordsToUpdate) {
      await record.update({ status: 2 });
      console.log(`Updated record with ID ${record.id} to Complete.`);
    }
  } catch (error) {
    console.error('Error in Cron Job 2 (Complete Status):', error);
  }
});

module.exports = {

  loginpage: async (req, res) => {
    try {
      res.render('Admin/login',)
    } catch (error) {
      return helper.error(res, error)
    }
  },
  login: async (req, res) => {
    try {

      const find_data = await users.findOne({
        where: {
          email: req.body.email, deletedAt: null, role: 0
        }
      })
      if (find_data == null) {
        req.flash('error', 'Please enter valid email')
        res.redirect("/admin/login");
      } else {
        // Decrypt
        var bytes = CryptoJS.AES.decrypt(find_data.password, ENV.crypto_key);
        let Decrypt_data = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        let check_password = Decrypt_data == req.body.password
        if (check_password == true) {
          req.session.admin = find_data
          req.flash('success', 'You are login in successfully');
          res.redirect("/admin/dashboard");
        } else {
          req.flash("error", "Please enter valid  password");
          res.redirect("/admin/login");
        }
      }

    } catch (error) {
      console.log(error);
      return helper.error(res, error)
    }
  },

  dashboard: async (req, res) => {
    try {
      if (!req.session.admin) return res.redirect("/admin/login");
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      let session = req.session.admin

      const newUser = await users.count({
        where: {
          role: 1,
          deletedAt: null,
          createdAt: {
            [Op.gte]: oneMonthAgo
          }
        }
      });
      const downtimeCount = await app_downtime_record.count({

      });
      const newCoach = await users.count({
        where: {
          role: 2,
          deletedAt: null,
          createdAt: {
            [Op.gte]: oneMonthAgo
          }
        }
      });
      const bookingData = await bookings.findAll({
        where: {
          deletedAt: null,
          createdAt: {
            [Op.gte]: oneMonthAgo
          }
        }, raw: true
      });
      const uniqueUserIds = new Set();
      const uniqueCoachIds = new Set();
      bookingData.forEach((booking) => {
        if (booking.user_id) uniqueUserIds.add(booking.user_id); // Add unique user_id
        if (booking.coach_id) uniqueCoachIds.add(booking.coach_id); // Add unique coach_id
      });
      const activeStudent = uniqueUserIds.size;
      const activeCoach = uniqueCoachIds.size;
      const totalUserCount = await users.count({
        where: {
          deletedAt: null
        }
      });
      let totalActive = activeStudent + activeCoach;
      const retentionRate = ((totalActive / totalUserCount) * 100).toFixed(2);

      const referral = await users.count({
        where: {
          deletedAt: null,
          referral: {
            [Op.ne]: ""
          },
        }, raw: true
      });

      const complateBooking = await bookings.count({ where: { deletedAt: null, booking_status: 2 } });
      const totalBooking = await bookings.count({ where: { deletedAt: null } });
      const SessionCompletion = ((complateBooking / totalBooking) * 100).toFixed(2);
      const AmountSpent = await bookings.sum('price', { where: { deletedAt: null, booking_status: 2 } });
      const Averagetransaction = (AmountSpent / complateBooking).toFixed(2);
      const Customerlifetime = (AmountSpent / totalUserCount).toFixed(2);
      const contactusCount = await contactus.count({ where: { deletedAt: null } })
      let data = await bookings.findAll({
        where: {
          booking_status: 2
        },
        attributes: [
          'location',
          [sequelize.fn('COUNT', sequelize.col('location')), 'location_count']
        ],
        group: ['location'],
        order: [
          [sequelize.fn('COUNT', sequelize.col('location')), 'DESC']
        ],
        raw: true
      });
      const topCity = data.length
      let sports1 = await sports.count({ where: { deletedAt: null } })



      const startOfCurrentPeriod = new Date(oneMonthAgo);
      startOfCurrentPeriod.setMonth(oneMonthAgo.getMonth() - 1);
      const endOfCurrentPeriod = oneMonthAgo;

      const startOfPreviousPeriod = new Date(startOfCurrentPeriod);
      startOfPreviousPeriod.setMonth(startOfPreviousPeriod.getMonth() - 1);
      const endOfPreviousPeriod = startOfCurrentPeriod;
      const currentPeriodUserCount = await users.count({
        where: {
          deletedAt: null,
          createdAt: { [Op.between]: [startOfCurrentPeriod, endOfCurrentPeriod] },
        },
      });

      const previousPeriodUserCount = await users.count({
        where: {
          deletedAt: null,
          createdAt: { [Op.between]: [startOfPreviousPeriod, endOfPreviousPeriod] },
        },
      });
      const currentPeriodRevenue = await bookings.sum('price', {
        where: {
          deletedAt: null,
          createdAt: { [Op.between]: [startOfCurrentPeriod, endOfCurrentPeriod] },
        },
      });

      const previousPeriodRevenue = await bookings.sum('price', {
        where: {
          deletedAt: null,
          createdAt: { [Op.between]: [startOfPreviousPeriod, endOfPreviousPeriod] },
        },
      });
      const userGrowthPercentage = previousPeriodUserCount
        ? (((currentPeriodUserCount - previousPeriodUserCount) / previousPeriodUserCount) * 100).toFixed(2)
        : 0;

      const revenueGrowthPercentage = previousPeriodRevenue
        ? (((currentPeriodRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100).toFixed(2)
        : 0;
      const growth = {
        userGrowthPercentage, revenueGrowthPercentage
      }

      const churnRate = (((totalUserCount - totalActive) / totalUserCount) * 100).toFixed(2);
      console.log(totalUserCount, "totalUserCount");
      console.log(totalActive, "totalActive");
      console.log(churnRate, "churnRate");
      
      
      res.render('Admin/dashboard', { session, downtimeCount, newUser, newCoach, activeStudent, activeCoach, retentionRate, SessionCompletion, Averagetransaction, AmountSpent, Customerlifetime, referral, growth, topCity, churnRate, sports1, contactusCount, title })
    } catch (error) {
      return helper.error(res, error)
    }
  },
  profile: async (req, res) => {
    try {
      if (!req.session.admin) return res.redirect("/admin/login");
      let session = req.session.admin
      const profile = await users.findOne({
        where: {
          email: req.session.admin.email
        }
      })
      res.render('Admin/profile', { profile, session, title })

    } catch (error) {
      return helper.error(res, error)

    }
  },
  edit_profile: async (req, res) => {
    try {
      if (!req.session.admin) return res.redirect("/admin/login");
      let folder = "users"
      if (req.files && req.files.image) {
        let images = await helper.fileUpload(req.files.image, folder)
        req.body.image = images
      }
      const profile = await users.update(req.body, {
        where: {
          id: req.session.admin.id
        }
      })

      const find_data = await users.findOne({
        where: {
          id: req.session.admin.id
        }
      })

      req.session.admin = find_data
      res.redirect('/admin/profile')
    } catch (error) {
      return helper.error(res, error)
    }
  },
  changepasswordpage: async (req, res) => {
    try {
      if (!req.session.admin) return res.redirect("/admin/login");
      let session = req.session.admin
      res.render('Admin/changepassword', { session, title })
    } catch (error) {
      return helper.error(res, error)
    }
  },
  changepassword: async (req, res) => {
    try {
      if (!req.session.admin) return res.redirect("/admin/login");
      let session = req.session.admin
      let findAdmin = await users.findOne({
        where: {
          id: session.id
        }
      })
      let Encrypt_data = findAdmin.password
      // Decrypt
      var bytes = CryptoJS.AES.decrypt(Encrypt_data, ENV.crypto_key);
      var Decrypt_data = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
      let check_old = Decrypt_data === +req.body.oldpassword
      // Encrypt
      var data = +req.body.newpassword
      var Newpassword = CryptoJS.AES.encrypt(JSON.stringify(data), ENV.crypto_key).toString();
      if (check_old == true) {

        let update_password = await users.update({ password: Newpassword }, {
          where: {
            id: session.id
          }
        })
        req.flash('success', 'Update password succesfully')
        res.redirect("/admin/login")
      } else {
        req.flash('error', 'Please enter valid old password')
        res.redirect("/admin/changepasswordpage")
      }
    } catch (error) {
      return helper.error(res, error)
    }
  },
  logout: async (req, res) => {
    try {
      delete req.session.admin
      res.redirect('/admin/login')
    } catch (error) {
      return helper.error(res, error)

    }
  },
  get_user_data: async (req, res) => {
    try {
      const { filterValue, type } = req.body; // type 1 for new student 2 for new coach 3 active student 4 for active coach 
      let data = []
      if (type == 1 || type == 2) {
        data = await helper.newUser(filterValue, type);
      } else if (type == 3 || type == 4) {
        data = await helper.activeUser(filterValue, type);
      } else {
        data = await helper.referralUser(filterValue, type);

      }
      return res.status(200).json({
        statusCode: 200,
        data: data,
      });
    } catch (error) {
      console.error('Error fetching active/inactive users:', error);
      res.status(500).json({ message: 'An error occurred while fetching data.' });
    }
  },
  get_booking: async (req, res) => {
    try {
      const { filterValue, type } = req.body;
      let dates = [];

      const now = new Date();
      let startDate, endDate, dateFormat, groupBy;
      if (filterValue == 0) {
        endDate = new Date();
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        dateFormat = '%Y-%m';
        groupBy = 'month';
        now.setMonth(now.getMonth() + 1);
        for (let i = 0; i < 12; i++) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          dates.unshift(date.toISOString().slice(0, 7));
        }
      } else if (filterValue == 1) {
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        dateFormat = '%Y-%m-%d';
        groupBy = 'day';
        for (let i = 0; i < 30; i++) {
          const date = new Date(now);
          date.setDate(now.getDate() - i);
          dates.unshift(date.toISOString().slice(0, 10));
        }
      } else if (filterValue == 2) {
        endDate = new Date();
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 2);
        dateFormat = '%Y';
        groupBy = 'year';
        const currentYear = now.getFullYear();
        dates = [currentYear - 2, currentYear - 1, currentYear];
      }
      const column = type == 'Revenue'
        ? [fn('SUM', col('price')), 'count']  // we have sum in count key 
        : [fn('COUNT', col('id')), 'count'];
      const monthlyUserCounts = await bookings.findAll({
        attributes: [
          [fn('DATE_FORMAT', col('created_at'), dateFormat), groupBy],
          column,
        ],
        where: {
          created_at: {
            [Op.gte]: startDate,
            [Op.lte]: endDate,
          },
          booking_status: 2,
          deletedAt: null,
        },
        group: [fn('DATE_FORMAT', col('created_at'), dateFormat)],
        order: [[fn('DATE_FORMAT', col('created_at'), dateFormat), 'ASC']],
        raw: true,
      });
      console.log(monthlyUserCounts);

      const countsMap = monthlyUserCounts.reduce((acc, row) => {
        acc[row[groupBy]] = parseInt(row.count, 10);
        return acc;
      }, {});

      let finalData = await dates.map(date => ({
        dataType: date,
        count: countsMap[date] || 0,
      }));

      return res.status(200).json({
        statusCode: 200,
        data: finalData,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
      res.status(500).send("Internal Server Error");
    }
  },
  get_location_data: async (req, res) => {
    try {

      let data = await bookings.findAll({
        where: {
          booking_status: 2
        },
        attributes: [
          'location',
          [sequelize.fn('COUNT', sequelize.col('location')), 'location_count']
        ],
        group: ['location'],
        order: [
          [sequelize.fn('COUNT', sequelize.col('location')), 'DESC']
        ],
        limit: 10,
        raw: true
      });
      let formattedData = data.map(item => item.location);
      let counts = data.map(item => item.location_count);
      let obj = {
        location: formattedData,
        numberOfcount: counts
      }
      res.send(obj);
    } catch (error) {
      console.error("Error fetching data:", error);
      res.status(500).send("Internal Server Error");
    }
  },
  retention_rate: async (req, res) => {
    try {
      const { filterValue, type } = req.body;
      let dates = [];
      const now = new Date();
      let startDate, endDate, dateFormat, groupBy;

      if (filterValue == 0) {
        endDate = new Date();
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        dateFormat = '%Y-%m';
        groupBy = 'month';
        now.setMonth(now.getMonth() + 1);
        for (let i = 0; i < 12; i++) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          dates.unshift(date.toISOString().slice(0, 7));
        }
      } else if (filterValue == 1) {
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        dateFormat = '%Y-%m-%d';
        groupBy = 'day';
        for (let i = 0; i < 30; i++) {
          const date = new Date(now);
          date.setDate(now.getDate() - i);
          dates.unshift(date.toISOString().slice(0, 10));
        }
      } else if (filterValue == 2) {
        endDate = new Date();
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 2);
        dateFormat = '%Y';
        groupBy = 'year';
        const currentYear = now.getFullYear();
        dates = [currentYear - 2, currentYear - 1, currentYear];
      }

      const coachData = await helper.fetchCounts(2, dateFormat, startDate, endDate, groupBy, dates);
      const studentData = await helper.fetchCounts(1, dateFormat, startDate, endDate, groupBy, dates);
      return res.status(200).json({
        statusCode: 200,
        data: {
          dates,
          coachData,
          studentData,
        },
      });
    } catch (error) {
      console.error("Error fetching data:", error);
      res.status(500).send("Internal Server Error");
    }
  },
  growth_rate: async (req, res) => {
    try {
      const { filterValue } = req.body; // 0: Monthly, 1: Weekly, 2: Daily

      let dateFormat, groupBy, startDate, endDate;
      let dates = [];
      const now = new Date();

      if (filterValue == 0) {
        endDate = new Date();
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        dateFormat = '%Y-%m';
        groupBy = 'month';
        now.setMonth(now.getMonth() + 1);
        for (let i = 0; i < 12; i++) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          dates.unshift(date.toISOString().slice(0, 7));
        }
      } else if (filterValue == 1) {
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        dateFormat = '%Y-%m-%d';
        groupBy = 'day';
        for (let i = 0; i < 30; i++) {
          const date = new Date(now);
          date.setDate(now.getDate() - i);
          dates.unshift(date.toISOString().slice(0, 10));
        }
      } else if (filterValue == 2) {
        endDate = new Date();
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 2);
        dateFormat = '%Y';
        groupBy = 'year';
        const currentYear = now.getFullYear();
        dates = [currentYear - 2, currentYear - 1, currentYear];
      }


      // Fetch user data
      const userCounts = await users.findAll({
        attributes: [
          [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), dateFormat), 'date'],
          [sequelize.literal(`SUM(CASE WHEN role = 1 THEN 1 ELSE 0 END)`), 'studentCount'],
          [sequelize.literal(`SUM(CASE WHEN role = 2 THEN 1 ELSE 0 END)`), 'coachCount'],
        ],
        where: {
          deletedAt: null,
          created_at: {
            [sequelize.Op.between]: [startDate, endDate],
          },
        },
        group: [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), dateFormat)],
        order: [[sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), dateFormat), 'ASC']],
        raw: true,
      });

      // Fetch revenue data
      const revenueCounts = await bookings.findAll({
        attributes: [
          [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), dateFormat), 'date'],
          [sequelize.fn('SUM', sequelize.col('price')), 'totalRevenue'],
        ],
        where: {
          deletedAt: null,
          created_at: {
            [sequelize.Op.between]: [startDate, endDate],
          },
        },
        group: [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), dateFormat)],
        order: [[sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), dateFormat), 'ASC']],
        raw: true,
      });

      const normalizeData = (data, key) => {
        const dataMap = data.reduce((acc, item) => {
          acc[item.date] = item;
          return acc;
        }, {});

        return dates.map(date => ({
          date,
          [key]: dataMap[date]?.[key] || 0,
        }));
      };

      const normalizedUserCounts = normalizeData(userCounts, 'studentCount');
      const normalizedCoachCounts = normalizeData(userCounts, 'coachCount');
      const normalizedRevenueCounts = normalizeData(revenueCounts, 'totalRevenue');

      const calculateGrowth = (data, key) => {
        return data.map((item, index) => {
          const prevValue = index > 0 ? data[index - 1][key] : 0;
          const currValue = item[key];
          const growth =
            prevValue > 0 ? (((currValue - prevValue) / prevValue) * 100).toFixed(2) : 0;
          return {
            ...item,
            growth: parseFloat(growth),
          };
        });
      };

      const studentGrowth = calculateGrowth(normalizedUserCounts, 'studentCount');
      const coachGrowth = calculateGrowth(normalizedCoachCounts, 'coachCount');
      const revenueGrowth = calculateGrowth(normalizedRevenueCounts, 'totalRevenue');
      const combinedData = dates.map((date, index) => ({
        date,
        studentCount: studentGrowth[index]?.studentCount || 0,
        studentGrowth: studentGrowth[index]?.growth || 0,
        coachCount: coachGrowth[index]?.coachCount || 0,
        coachGrowth: coachGrowth[index]?.growth || 0,
        totalRevenue: revenueGrowth[index]?.totalRevenue || 0,
        revenueGrowth: revenueGrowth[index]?.growth || 0,
      }));

      return res.status(200).json({
        statusCode: 200,
        data: combinedData,
      });
    } catch (error) {
      console.error('Error calculating platform growth:', error);
      res.status(500).send('Internal Server Error');
    }
  },
  average_transaction: async (req, res) => {
    try {
      const { filterValue } = req.body; // 0: Monthly, 1: Weekly, 2: Daily
      let dateFormat, groupBy, startDate, endDate;
      let dates = [];
      const now = new Date();

      // Determine date range and format
      if (filterValue == 0) {
        endDate = new Date();
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        dateFormat = '%Y-%m';
        groupBy = 'month';
        now.setMonth(now.getMonth() + 1);
        for (let i = 0; i < 12; i++) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          dates.unshift(date.toISOString().slice(0, 7));
        }
      } else if (filterValue == 1) {
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        dateFormat = '%Y-%m-%d';
        groupBy = 'day';
        for (let i = 0; i < 30; i++) {
          const date = new Date(now);
          date.setDate(now.getDate() - i);
          dates.unshift(date.toISOString().slice(0, 10));
        }
      } else if (filterValue == 2) {
        endDate = new Date();
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 2);
        dateFormat = '%Y';
        groupBy = 'year';
        const currentYear = now.getFullYear();
        dates = [currentYear - 2, currentYear - 1, currentYear];
      }
      const transactions = await bookings.findAll({
        attributes: [
          [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), dateFormat), 'date'],
          [sequelize.fn('SUM', sequelize.col('price')), 'totalSpent'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'transactionCount'],
        ],
        where: {
          created_at: {
            [sequelize.Op.between]: [startDate, endDate],
          },
        },
        group: [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), dateFormat)],
        raw: true,
      });

      const data = dates.map((date) => {
        const transaction = transactions.find((t) => t.date === date) || {};
        const totalSpent = transaction.totalSpent || 0;
        const transactionCount = transaction.transactionCount || 0;
        const average = transactionCount > 0 ? (totalSpent / transactionCount).toFixed(2) : '0.00';
        return { date, average };
      });

      return res.status(200).json({
        statusCode: 200,
        data,
      });
    } catch (error) {
      console.error('Error calculating average transaction value:', error);
      res.status(500).send('Internal Server Error');
    }
  },
  churn_rate: async (req, res) => {
    try {
      const { filterValue } = req.body; // 0: Monthly, 1: Weekly, 2: Daily
      let dateFormat, groupBy, startDate, endDate;
      let dates = [];
      const now = new Date();

      // Determine date range and format
      if (filterValue == 0) {
        endDate = new Date();
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        dateFormat = '%Y-%m';
        groupBy = 'month';
        now.setMonth(now.getMonth() + 1);
        for (let i = 0; i < 12; i++) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          dates.unshift(date.toISOString().slice(0, 7));
        }
      } else if (filterValue == 1) {
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        dateFormat = '%Y-%m-%d';
        groupBy = 'day';
        for (let i = 0; i < 30; i++) {
          const date = new Date(now);
          date.setDate(now.getDate() - i);
          dates.unshift(date.toISOString().slice(0, 10));
        }
      } else if (filterValue == 2) {
        endDate = new Date();
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 2);
        dateFormat = '%Y';
        groupBy = 'year';
        const currentYear = now.getFullYear();
        dates = [currentYear - 2, currentYear - 1, currentYear];
      }
      let student = await helper.newUser(filterValue, 1);
      let coach = await helper.newUser(filterValue, 1);
      let activeStudent = await helper.activeUser(filterValue, 2);
      let activeCoach = await helper.activeUser(filterValue, 2);
      for (let i = 0; i < student.length; i++) {
        let churnRate = ((student[i].count / activeStudent[i].count) * 100).toFixed(2);
        student[i].churnRate = isNaN(churnRate) || !isFinite(churnRate) ? "0.00" : churnRate;
      }
      for (let i = 0; i < coach.length; i++) {
        let churnRate = ((coach[i].count / activeCoach[i].count) * 100).toFixed(2);
        coach[i].churnRate = isNaN(churnRate) || !isFinite(churnRate) ? "0.00" : churnRate;
      }

      return res.status(200).json({
        statusCode: 200,
        student,
        coach
      });
    } catch (error) {
      console.error('Error calculating average transaction value:', error);
      res.status(500).send('Internal Server Error');
    }
  },
  fileUpload_message: async (req, res) => {
    try {

      let image = await helper.files_upload(req.files.file, "")

      console.log(image, "+++++++++++++++++++++++++++==image");
      res.send(image)

    } catch (error) {

      console.log(error, '================error=================')

    }

  },
  add_downtime_page: async (req, res) => {
    try {
      if (!req.session.admin) return res.redirect("/admin/login");
      let session = req.session.admin
      res.render('Admin/add_downtime_page', {
        session, title: "Down Time"
      });
    } catch (error) {
      return helper.error(res, error);
    }
  },
  add_app_downtime: async (req, res) => {
    try {
      const { date, end_time, start_time } = req.body;

      const app_down_exist = await app_downtime_record.findOne({
        where: {
          date: date,
          start_time: start_time,
          end_time: end_time,
        }
      });

      if (app_down_exist) {
        req.flash('error', 'Downtime record already exists');
        return res.redirect("/admin/add_app_downtime");
      }

      await app_downtime_record.create({
        date: date,
        start_time: start_time,
        end_time: end_time,
      });

      return res.redirect('/admin/list_app_downtime');
    } catch (error) {
      return helper.error(res, error);
    }
  },
  list_app_downtime: async (req, res) => {
    try {
      if (!req.session.admin) return res.redirect("/admin/login");
      const app_downtime_records = await app_downtime_record.findAll({
        order: [['date', 'DESC'], ['start_time', 'ASC']],
      });
      let session = req.session.admin
      res.render('Admin/app_downtime_list', {
        app_downtime_records, session, title: "Down Time"
      });
    } catch (error) {
      return helper.error(res, error);
    }
  },
  deleted_downtime: async (req, res) => {
    try {
      const userdelete = await app_downtime_record.destroy({
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