const path = require('path');
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');
// const compression = require('compression');

const AppError = require('./utils/appError');

const userRouter = require('./routes/userRoutes');

// *****************************declare app**************************
const app = express();

app.use(cors());

// app.set('view engine', 'pug');
// app.set('views', path.join(__dirname, 'views'));

// set security http headers
app.use(helmet());

// preventing dos and bruteforce dengan rate lmiting
const limiter = rateLimit({
  max: 100, //100 request
  windowMs: 60 * 60 * 1000, //per jam
  message: 'To many request from this IP, please try again in an hour',
});
app.use('/api', limiter);

// body parser
app.use(express.json({ limit: '15kb' }));
app.use(express.urlencoded({ extended: true, limit: '15kb' }));

// data sanitization after body parser is perfect place
// 1) data sanitization against nosql query injection
app.use(mongoSanitize());

// 2) data sanitization against xss
// clean any user i n put from malisius html code, by converting all html symbol
app.use(xss());

// prevent paameter polution
// whitelist: pengecualian
app.use(
  hpp({
    whitelist: [],
  })
);

// serving static files
app.use(express.static(path.join(__dirname, 'public')));

// app.use(compression());

// *************************ROUTES***************************

app.use('/api/v1/users', userRouter);

// handling un handled routes
// all means get,post and etc
app.all('*', (req, res, next) => {
  // if the next recieve arguments, express assume that is an error,
  // and will be pass all middleware stack and go straight to middleware error in below
  next(new AppError(`Cant find ${req.originalUrl} on this server`, 404));
});

// error handling middleweere by express,

app.use(require('./controllers/errorControllers'));

module.exports = app;
