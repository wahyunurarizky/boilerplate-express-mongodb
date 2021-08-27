const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, 'please tell us your name'],
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: [true, 'email already have'],
    lowercase: true,
    validate: [validator.isEmail, 'please provide a valid email'], //come from validator js
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'please provide a password'],
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'please confirm your password'],
    validate: {
      // THIS ONLY WORKS ON SAVE
      validator: function (el) {
        return el === this.password; // just returning true or false
      },
      message: 'password are not the same',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

userSchema.index({
  name: 1,
});

// jgn lupa next param
// doc midleware sebelum save, seperti create and update
userSchema.pre('save', async function (next) {
  // jika tidak ada perubahan password, yg mana artinya.
  // tidak membuat password baru. maka lanjut, tidak usah hash password
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);

  this.passwordConfirm = undefined; //kita telah memvalidasi sebelumnya di schema diatas, dengan membuat validator
  // kita sudah tidak lagi memerlukan passwordConfirm laginext
  next();
});

userSchema.pre('save', function (next) {
  // jika password tidak berubah atau dokumen baru dibuat, tidak usah jalankan lanjutan / return next()
  if (!this.isModified('password') || this.isNew) return next();

  // supaya dibuat tidak berbarengan dengan jwt
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// untuk hanya mendapatkan user yg activenya true saja
userSchema.pre(/^find/, function (next) {
  // this find is point to current query
  this.find({ active: { $ne: false } });
  next();
});

// instance method, method thats gonna be available for all document in collection
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  // return true jika cocok
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    // changed 2021-04-30T00:00:00.000Z to ms | bagi 1000 karna jwttimestamp dalam second. base 10
    const changedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimeStamp; //misal token waktu 2 jan < waktu ganti password 3jan return true
  }

  // kalo belom pernah changed password
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
