const AppError = require('../utils/appError');

const handleCastErrorDB = (err) => {
  const message = `invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  // untuk mendapatkan string didalam quotes wkwkw
  const value = err.errmsg.match(/(["'])(?:(?=(\\?))\2.)*?\1/)[0];
  // console.log(value);
  // [
  //   '"The Forest Hiker"',
  //   '"',
  //   '',
  //   index: 84,
  //   input: 'E11000 duplicate key error collection: natours.tours index: name_1 dup key: { name: "The Forest Hiker" }',
  //   groups: undefined
  // ]
  return new AppError(`duplicates value ${value}`, 400);
};

const handleValidationErrorDB = (err) => {
  // membuat array yg berisi err.message
  const errors = Object.values(err.errors).map((el) => el.message);

  const message = `Invalid input data: ${errors.join(', ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token. please login again', 401);

const handleJWTExpired = () =>
  new AppError('Your token is expired. please login again', 401);

const sendErrorDev = (err, req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    console.error('ERROR', err);
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      stack: err.stack,
    });
  } else {
    console.error('ERROR', err);
    res.status(err.statusCode).render('error', {
      title: 'something went wrong',
      message: err.message,
    });
  }
};
const sendErrorProd = (err, req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    console.error('ERROR', err);

    // programming or other unknown error
    return res.status(500).json({
      status: 'error',
      message: 'something went very wrong',
    });
  }
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'something went wrong',
      msg: err.message,
    });
  }
  // supaya bisa tampil di hosting kita
  console.error('ERROR', err);

  // programming or other unknown error
  return res.status(err.statusCode).render('error', {
    title: 'something went wrong',
    msg: 'please try again later',
  });
};

// express will know that is error handling midleware by defining 4 params
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  console.log('eeee', err);

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    // misal object id ngasal
    let error = err;
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError')
      error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpired();

    sendErrorProd(error, req, res);
  }
};
