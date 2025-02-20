import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true }, // now required
  email: { type: String, required: true, unique: true },
  mobile: { type: String, required: true, unique: true }, // enforce uniqueness
  password: { type: String, required: true }, // In production, store hashed passwords
  online: { type: Boolean, default: false }
});

export default mongoose.model('User', UserSchema);
