var createError = require('http-errors');
var express = require('express');
var app = express();
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var bodyParser = require('body-parser')
var fileUpload = require('express-fileupload')
let session = require('express-session');
const flash = require('express-flash');
const socketIo = require('socket.io');
const server = require('http').createServer(app); 

var io = socketIo(server); 
var AdminRouter = require('./routes/Admin');
var ApiRouter = require('./routes/ApiRoutes')(io);
require('dotenv').config()

app.locals.moment = require('moment');

require('./socket/socket')(io)
const PORT = process.env.PORT
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }))
app.use(fileUpload());
app.use(flash());
app.use(session({ secret: 'session' }));
app.use('/admin', AdminRouter);
app.use('/Api', ApiRouter);


// sequelize-auto -h 127.0.0.1 -d hi_coach -u root -x '' -p 3306  --dialect mysql -c ./config/config.json -o ./models/ -t user_saved_coahces
server.listen(PORT,(req,res)=>{
  console.log(`Your server start with port ${PORT}`);
})
