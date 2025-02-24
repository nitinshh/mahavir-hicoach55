var express = require("express");
var router = express.Router();
const helper = require("../helpers/helper");
const AuthApis = require("../Controllers/ApiController/authCountroller");
const UserApis = require("../Controllers/ApiController/usersController");
const contentApis = require("../Controllers/ApiController/contentsController");
const notificationApis = require("../Controllers/ApiController/notificationController");
const contactusController = require("../Controllers/ApiController/contactusController")
const PackagesController = require("../Controllers/ApiController/PackagesController")
const RatingController = require("../Controllers/ApiController/ratingController")
const SlotController = require("../Controllers/ApiController/Slotcontroller")
const favouriteController = require("../Controllers/ApiController/favouriteController")
const LandingPages = require("../Controllers/ApiController/LandingPagesController")
const ClassController=require('../Controllers/ApiController/classController')
const bookingController=require('../Controllers/ApiController/bookingController');
const usersController = require("../Controllers/ApiController/usersController");
const authCountroller = require("../Controllers/ApiController/authCountroller");
const reviewcontroller=require('../Controllers/ApiController/reviewsController')
const homeController=require('../Controllers/ApiController/homeController');
const classController = require("../Controllers/ApiController/classController");
const PaymentController = require("../Controllers/ApiController/paymentController");


module.exports = function (io) {
    
// >>>>>>>>>>>>>>>>>>>>>>>>>>>> LandingPages apis <<<<<<<<<<<<<<<<<<<<<<<<<< //
router.use(helper.checkMaintenance)
router.get("/Privacy_Policy", LandingPages.privacy_policy);
// >>>>>>>>>>>>>>>>>>>>>>>>>>>>GLOBAL  apis <<<<<<<<<<<<<<<<<<<<<<<<<< //
router.post("/account_deleted", AuthApis.account_deleted);
router.post("/encryption", AuthApis.encryption);
router.post("/fileUpload", authCountroller.fileUpload);
router.get("/stripe_connect",UserApis.stripe_connect);
router.get("/stripe_connect_return",UserApis.stripe_connect_return);
router.get("/get_admin_commission",AuthApis.get_admin_commission);

//////////////////////////// middleware user here  //////////////////////////////
// auth apis //
// >>>>>>>>>>>>>>>>>>>>>>>>>>>> Cms Apis<<<<<<<<<<<<<<<<<<<<<<<<<< //
router.get("/community_guidelines", contentApis.community_guidelines);
router.get("/termsAndConditions", contentApis.termsAndConditions);
router.use(helper.verifykey);

router.get("/get_stripe_keys",AuthApis.get_stripe_keys);
router.post("/exit_account", AuthApis.exit_account);
router.post("/signUp", AuthApis.signUp);
router.post("/login", AuthApis.login);
router.post("/social_login", AuthApis.socialLogin);
router.post("/passwordforget", UserApis.passwordforget);

// Add Middleware And Apis>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Add Middleware And Apis>>>>>>>>>>>>>>>>>>>>>
router.use(helper.verifyUser);

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>Profile apis <<<<<<<<<<<<<<<<<<<<<<<<<< //
router.post("/change_email",AuthApis.change_email);
router.post("/verify_otp_email",AuthApis.verify_otp_email);
router.post("/resend_otp_email",AuthApis.resend_otp_email);
router.post("/editprofile", UserApis.editprofile);
router.post("/travelling_time", UserApis.travelling_time);
router.post("/verify_request_to_admin", UserApis.verify_request_to_admin);
router.get("/account_link", UserApis.account_link);



router.get("/getprofile", UserApis.getprofile);
router.post("/changepassword", UserApis.changepassword);
router.post("/save_loaction", UserApis.save_loaction);

router.get("/allCoach", UserApis.allCoach);
router.post("/near_by_coach", UserApis.near_by_coach);
router.post("/coach_details", UserApis.coach_details);
router.post("/user_saved_coaches", UserApis.user_saved_coaches);
router.post("/get_save_coaches", UserApis.get_save_coaches);
router.get("/user_package", UserApis.user_package);
router.post("/purchase_package", UserApis.purchase_package);

router.post("/delete_cerificate", UserApis.delete_cerificate);
router.post("/verifyotp", AuthApis.verifyotp);
router.post("/resendotp", AuthApis.resendotp);
router.post("/logout", UserApis.logout);

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>Packages apis <<<<<<<<<<<<<<<<<<<<<<<<<< //
router.post("/add_package", PackagesController.add_package);
router.post("/delete_package", PackagesController.delete_package);
router.post("/listing_package", PackagesController.listing_package);
router.post("/package_details", PackagesController.package_details);


// >>>>>>>>>>>>>>>>>>>>>>>>>>>> Slot apis <<<<<<<<<<<<<<<<<<<<<<<<<< //
router.get("/get_days", SlotController.get_days);
router.post("/add_coach_slot", SlotController.add_coach_slot);
router.get("/get_slots", SlotController.get_slots);
router.post('/day_on_Off',SlotController.day_on_Off)
router.post('/promote_slot',SlotController.promote_slot)
router.post('/get_week_slotes',SlotController.get_week_slotes)



// >>>>>>>>>>>>>>>>>>>>>>>>>>>>Rating apis <<<<<<<<<<<<<<<<<<<<<<<<<< //
router.get("/rating", RatingController.rating);
// >>>>>>>>>>>>>>>>>>>>>>>>>>>>Notification apis <<<<<<<<<<<<<<<<<<<<<<<<<< //
router.get("/notificationlist", notificationApis.notificationlist);
router.post("/notificationStatus", notificationApis.notificationStatus);
router.get("/notificationcount", notificationApis.notificationcount);

// >>>>>>>>>>>>>>>>>>>>>>>>>>>> favourite  Apis <<<<<<<<<<<<<<<<<<<<<<<<<< //

router.post("/favourite_games", favouriteController.favourite_games);
router.get("/favourite_listing", favouriteController.favourite_listing);

// >>>>>>>>>>>>>>>>>>>>>>>>>>>> Contactus Apis <<<<<<<<<<<<<<<<<<<<<<<<<< //
router.post("/contactus", contactusController.contactus);
router.get("/contactUslisting", contactusController.contactUslisting);


// >>>>>>>>>>>>>>>>>>>>>>>>>>>> Class Apis <<<<<<<<<<<<<<<<<<<<<<<<<< //
router.get("/students_listing", ClassController.students_listing);
router.post("/get_slot_by_day", ClassController.get_slot_by_day);
router.post("/get_slot_by_day_new", ClassController.get_slot_by_day_new);

router.get("/cancel_reasons_listing", ClassController.cancel_reasons_listing);
router.post("/add_class", ClassController.add_class(io));
router.post("/accept_reject_class_request", ClassController.accept_reject_class_request(io));


router.post("/add_booking", bookingController.add_booking(io));
router.post("/accept_reject_booking", bookingController.accept_reject_booking(io));
router.post("/cancel_booking", bookingController.cancel_booking(io));
router.post("/accept_reject_cancel_request", bookingController.accept_reject_cancel_request(io));
router.post("/cancel_booking_without_accept", bookingController.cancel_booking_without_accept(io));

router.post("/add_customize_class", classController.add_customize_class(io));


router.post("/booking_details", bookingController.booking_details);
router.get("/upcoming_booking", bookingController.upcoming_booking);
router.get("/previous_booking", bookingController.previous_booking);
router.get("/recurring_classes", bookingController.recurring_classes);
router.get("/complete_booking", bookingController.complete_booking);
router.get("/upcoming_booking_coach", bookingController.upcoming_booking_coach);
router.get("/previous_booking_coach", bookingController.previous_booking_coach);
router.get("/recurring_classes_coach", bookingController.recurring_classes_coach);
router.get("/complete_booking_coach", bookingController.complete_booking_coach);
router.post("/recurring_cancel_booking", bookingController.recurring_cancel_booking);
router.get("/testing_api", bookingController.testing_api);

// /reviews controllers///
router.post("/reviewslisting", reviewcontroller.reviewslisting);
router.post("/add_reviews", reviewcontroller.add_reviews);
router.post("/review_view", reviewcontroller.review_view);
router.post("/review_edit", reviewcontroller.review_edit);

router.get('/home_student',homeController.home_student)
router.get('/home_coach',homeController.home_coach)
router.get('/classes_today',homeController.classes_today)
router.get('/cancel_classes',homeController.cancel_classes)
router.get('/class_request',homeController.class_request)
router.get('/upcoming_lessons',homeController.upcoming_lessons)
router.get('/hot_slot',homeController.hot_slot)
router.get('/high_rated_coach',homeController.high_rated_coach)

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> PaymentController <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< //
router.post('/payment_api',PaymentController.payment_api)
router.post('/payment_api_package',PaymentController.payment_api_package)
router.get('/student_transactions',PaymentController.student_transactions)
router.post('/coach_transactions',PaymentController.coach_transactions)
router.get('/coach_transactions_list',PaymentController.coach_transactions_list)
router.post('/stripe_status_update',PaymentController.stripe_status_update(io))

// router.post('/payment_api',PaymentController.payment_api)

return router;
}

// >>>>>>>>>>>>>>>>>>>>>>>>>>>> Contactus Apis <<<<<<<<<<<<<<<<<<<<<<<<<< //

// module.exports = router;
