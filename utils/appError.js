// inherits Error which means AppError = Error
// app error digunakan untuk operational error, which means that important dor client, ngasal cok

class AppError extends Error {
  constructor(message, statusCode) {
    // we should calling super, just like calling new Error(message)
    super(message);
    this.statusCode = statusCode;
    this.status = `${this.statusCode}`.startsWith('4') ? 'fail' : 'error';

    // operational error : error that we can predict like people input or validator errors
    // true jika digunakan untuk production, jika error karna netweork, karna third party package yg error
    // tidak usah ditampilkan ke client
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
