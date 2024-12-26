const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    unique: true
  },
  googleId: {
    type: String,
    unique: true,

  }
});

UserSchema.plugin(passportLocalMongoose);

const UserModel = mongoose.model('user', UserSchema);
module.exports = UserModel;