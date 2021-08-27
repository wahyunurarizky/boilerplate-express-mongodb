/* eslint-disable arrow-body-style */
const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
// const sendEmail = require('../utils/email');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    // that we cookie cannot modified anyway in browser. to prevent cross ss attavck xss
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  res.cookie('jwt', token, cookieOptions);

  // menghilangkan dari output. ini tidak akan merubah database karena kta tidak melakukan save
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.isLoggedIn = async (req, res, next) => {
  try {
    // 1) getting token and check is it's there
    if (req.cookies.jwt) {
      // 2) validate token is valid or not / verification token
      // promisify untuk membuat function menjadi promise
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );
      // decoded = { id: '606834ffaafb1932b8a83c08', iat: 1617444009, exp: 1620036009 }

      // 3) check if user still exist
      const freshUser = await User.findById(decoded.id);
      if (!freshUser) return next();

      // 4) check if user changed password after the jwt was issued
      if (freshUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // there is a logged in user
      res.locals.user = freshUser;
      return next();
    }

    next();
  } catch (err) {
    return next();
  }
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role,
  });

  // sign(payload,secret,option) membuat token
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  // basic desctructuring
  const { email, password } = req.body;
  console.log(email, password);
  // if email and password exist
  if (!email || !password) {
    return next(new AppError('please provide email and password', 400));
  }

  // check if user exist && password correct

  // karena dalam user model password select: false, maka user tidak memasukkan password
  // kita harus mengakali
  const user = await User.findOne({ email }).select('+password');
  // jika tidak ada user yg dengan email itu. atau passwordnya tidak sama
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('incorrect email or password', 401)); //401 is unauthorized
  }
  // send token to the client
  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({
    status: 'success',
  });
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1) getting token and check is it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Bearer asdsadaskjsoid aodijasidjaodiaohsidaoh so split sapasi dan get aray 1
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  // jika tidak ada token pada authorization header
  if (!token) {
    return next(
      new AppError('you are not logged in, please logini to get access', 401)
    );
  }

  // 2) validate token is valid or not / verification token
  // promisify untuk membuat function menjadi promise
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  // decoded = { id: '606834ffaafb1932b8a83c08', iat: 1617444009, exp: 1620036009 }

  // 3) check if user still exist
  const freshUser = await User.findById(decoded.id);
  if (!freshUser)
    return next(
      new AppError('The user belonging to this token does not exist', 401)
    );

  // 4) check if user changed password after the jwt was issued
  if (freshUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('user recently changed password, please login again', 401)
    );
  }

  // bisa akses ke protected route
  req.user = freshUser;
  res.locals.user = freshUser;
  // ini sangat penting karena req.user bisa digunakan kedepannya
  next();
});

// cek apakah req.user.role diizinkan untuk mengakses request
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('you do not have a permission to perform this action', 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) get user based on posted email
  // const user = await User.findOne({ email: req.body.email });
  // if (!user) {
  //   return next(new AppError('there is no users with that email address', 404));
  // }
  // // 2) generate the random reset token
  // const resetToken = user.createPasswordResetToken();
  // await user.save({ validateBeforeSave: false });
  // // 3) send it to users email
  // const resetURL = `${req.protocol}://${req.get(
  //   'host'
  // )}/api/v1/users/resetPassword/${resetToken}`;
  // console.log(resetURL);
  // const message = `Forgot your password ? submit a patch request with yout new password and passwordConfirm to : ${resetURL}.\nif you didn't forget your password please ignore this email`;
  // try {
  //   await sendEmail({
  //     email: user.email,
  //     subject: 'your password reset token (valid for 10 minutes)',
  //     message,
  //   });
  //   res.status(200).json({
  //     status: 'success',
  //     message: 'token sent to email',
  //   });
  // } catch (err) {
  //   user.passwordResetToken = undefined;
  //   user.passwordResetExpires = undefined;
  //   await user.save({ validateBeforeSave: false });
  //   return next(
  //     new AppError(
  //       'there was an error while sending the email. Try Again later',
  //       500
  //     )
  //   );
  // }

  return res.send('nggak dulu');
});
exports.resetPassword = catchAsync(async (req, res, next) => {
  // get user based on the token
  const hashedtoken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  console.log(hashedtoken);

  const user = await User.findOne({
    passwordResetToken: hashedtoken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // if toke has not expired, and there is use, set the new Password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();
  // 3)update changedPasswordAt property for the user

  // 4) log in the user and send jwt
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) get the user form the collection
  const user = await User.findById(req.user.id).select('+password');
  console.log(user);
  console.log(req.body);
  // 2) check if posted password is correct

  if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
    console.log('adsasdas');
    return next(new AppError('your current password is wrong', 401));
  }

  // 3) if the password is correct , update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  // 4) log in with new password, send jwt
  createSendToken(user, 200, res);
});
