var express = require('express');
var router = express.Router();
const AuthControler = require('../Controllers/Auth');
const StudentControler = require('../Controllers/Studentcontroller')
const CaochControler = require('../Controllers/Coachcontroller')
const CaochChatControler = require('../Controllers/coachChat')
const StudentChatControler = require('../Controllers/studentChat')
const CmsControler = require('../Controllers/Cmscontroller')
const Sportcontroller = require('../Controllers/Sportcontroller')
const Contactuscontroller = require('../Controllers/Contactuscontroller')
const Subcategorycontroller  = require('../Controllers/Subcategorycontroller')
const Questionscontroller  = require('../Controllers/questionscontroller')
const Answerscontroller  = require('../Controllers/answerscontroller')
const Notificationcontroller  = require('../Controllers/Notificationcontroller')
const Bookingcontroller = require('../Controllers/Bookingcontroller')
const Transactions = require('../Controllers/transactionscontroller')
const reviewcontroller = require('../Controllers/reviewcontroller')
const UserApis=require('../Controllers/ApiController/usersController')
const ReportController=require('../Controllers/reportcontroller')



// questions

router.get('/login', AuthControler.loginpage)
router.post('/login', AuthControler.login)
router.get('/dashboard', AuthControler.dashboard)
router.get('/profile', AuthControler.profile)
router.post('/profile', AuthControler.edit_profile)
router.get('/changepasswordpage', AuthControler.changepasswordpage)
router.post('/changepasswordpage', AuthControler.changepassword)
router.get('/logout', AuthControler.logout)
router.get("/resetpassword", UserApis.resetpassword);
router.post("/reset_password_post", UserApis.reset_password_post);
router.get("/list_app_downtime", AuthControler.list_app_downtime);
router.get("/add_downtime_page", AuthControler.add_downtime_page);
router.post("/add_app_downtime", AuthControler.add_app_downtime);
router.post("/deleted_downtime", AuthControler.deleted_downtime);








router.post('/get_user_data', AuthControler.get_user_data)
router.post('/get_location_data', AuthControler.get_location_data)
router.post('/get_booking', AuthControler.get_booking)
router.post('/retention_rate', AuthControler.retention_rate)
router.post('/growth_rate', AuthControler.growth_rate)
router.post('/average_transaction', AuthControler.average_transaction)
router.post('/churn_rate', AuthControler.churn_rate)
router.post("/fileUpload_message", AuthControler.fileUpload_message);






// Users Routes // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>Users Routes
router.get('/studentadd', StudentControler.student) 
router.post('/studentadd', StudentControler.studentadd) 
router.get('/studentlisting', StudentControler.studentlisting)
router.get('/studentview/:id', StudentControler.studentview)
router.get('/studentedit/:id', StudentControler.studentedit)
router.post('/studentviewupdate/:id', StudentControler.studentviewupdate)
router.post('/deletedstudent', StudentControler.deletedstudent)
router.post('/student_status', StudentControler.student_status)
router.post('/verified_status', StudentControler.verified_status)


// Caoch Routes // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>Users Routes
router.get('/coachadd', CaochControler.coach) 
router.post('/coachadd', CaochControler.coachadd) 
router.get('/caochlisting', CaochControler. Caochlisting)
router.get('/verify_request', CaochControler. verify_request)

router.get('/caochview/:id', CaochControler. Caochview)
router.get('/coachedit/:id', CaochControler.Coachedit)
router.post('/caochviewupdate/:id', CaochControler.caochviewupdate)
router.post('/deletedcoach', CaochControler.deleted_Caoch)
router.post('/caoch_status', CaochControler. Caoch_status)
router.post('/add_language', CaochControler. add_language)
router.post('/add_document', CaochControler.add_document)
router.post('/deleted_language', CaochControler.deleted_language)





// Booking Routes // >>>>>>>>>>>>>>>>>>>>>>>>>>>> Booking >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>Booking Routes

router.get('/bookinglisting', Bookingcontroller.bookinglisting)
router.get('/bookingview/:id', Bookingcontroller.bookingview)
router.post('/deletedbooking', Bookingcontroller.deletedbooking)

// review Routes // >>>>>>>>>>>>>>>>>>>>>>>>>>>> review >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>review Routes
router.get('/reviewlisting', reviewcontroller.reviewlisting)
router.get('/reviewview/:id', reviewcontroller.reviewview)
router.post('/deletedreview', reviewcontroller.deletedreview)
router.get('/reviewedit/:id', reviewcontroller.reviewedit)
router.post('/reviewviewupdate/:id', reviewcontroller.reviewviewupdate)

// Transactions Routes // >>>>>>>>>>>>>>>>>>>>>>>>>>>> Transactions >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>Transactions Routes

router.get('/transactionlisting', Transactions.transactionlisting)
router.get('/transactionview/:id', Transactions.transactionview)
router.post('/deletedtransaction', Transactions.deletedtransaction)


// privacy policy //  >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>privacy policy
router.get('/privacy_policy', CmsControler.privacy_policy)
router.get('/aboutus', CmsControler.AboutUs)
router.get('/terms', CmsControler.terms)
router.post('/privacy_policy',CmsControler.privacy_policy_update)
router.post('/aboutus', CmsControler.AboutUs_update)
router.post('/terms', CmsControler.terms_update)
// Sportcontroller Routes // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>category Routes

router.get('/sportadd', Sportcontroller.sport) 
router.post('/sportadd', Sportcontroller.sportadd) 
router.get('/sportlisting', Sportcontroller.sportlisting)
router.get('/sportview/:id', Sportcontroller.sportview)
router.get('/sportedit/:id', Sportcontroller.sportedit)
router.post('/sportviewupdate/:id', Sportcontroller.sportviewupdate)
router.post('/deletedsport', Sportcontroller.deletedsport)
router.post('/sport_status', Sportcontroller.sport_status)

// CaochChatControler  Routes // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>Notificatin  Routes

router.get('/coachChat', CaochChatControler.coachChat)
router.get('/studentChat', StudentChatControler.studentChat)




// Notifiaction  Routes // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>Notificatin  Routes

router.get("/notification",Notificationcontroller.Notification);
router.post("/send_notification",Notificationcontroller.send_notification);

// Questions Routes // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>category Routes

router.get('/questions', Questionscontroller.questions) 
router.post('/questionsadd', Questionscontroller.questionsadd) 
router.get('/questionslisting', Questionscontroller.questionslisting)
router.get('/questionsview/:id', Questionscontroller.questionsview)
router.get('/questionsedit/:id', Questionscontroller.questionsedit)
router.post('/questionsviewupdate/:id', Questionscontroller.questionsviewupdate)
router.post('/deletedquestions', Questionscontroller.deletedquestions)
router.post('/questions_status', Questionscontroller.questions_status)



// Answers Routes // >>>>>>>>>>>>>>>>>>>>>>>>>>  Games   >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>Answers Routes

router.get('/answers', Answerscontroller.answers) 
router.post('/answersadd', Answerscontroller.answersadd) 
router.get('/answersview/:id', Answerscontroller.answersview)
router.get('/answersedit/:id', Answerscontroller.answersedit)
router.post('/answersviewupdate/:id', Answerscontroller.answersviewupdate)
router.post('/deleted_answers', Answerscontroller.deletedanswers)
router.post('/answers_status', Answerscontroller.answers_status)




// subcategory Routes // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>subcategory Routes
router.get('/subcategory', Subcategorycontroller.subcategory) 
router.post('/subcategoryadd', Subcategorycontroller.subcategoryadd) 
router.get('/subcategorylisting', Subcategorycontroller.subcategorylisting)
router.get('/subcategoryview/:id', Subcategorycontroller.subcategoryview)
router.get('/subcategoryedit/:id', Subcategorycontroller.subcategoryedit)
router.post('/subcategoryviewupdate/:id', Subcategorycontroller.subcategoryviewupdate)
router.post('/deletedsubcategory', Subcategorycontroller.deletedsubcategory)
router.post('/subcategory_status', Subcategorycontroller.subcategory_status)

// contactUs Routes // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>contactUs Routes
router.get('/contactuslisting', Contactuscontroller.contactUslisting)
router.post('/deletedcontactus', Contactuscontroller.deletedcontactUs)
router.get('/contactusview/:id', Contactuscontroller.contactusview)

// Guid_coach

//Report Users///
router.get('/report_listing',ReportController.report_listing)
module.exports = router;
