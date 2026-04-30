const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { success, error } = require('../utils/response');

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return error(res, 'name, email and password required', 400);

    const existing = await User.findOne({ email });
    if (existing) return error(res, 'Email already registered', 409);

    const user = await User.create({ name, email, passwordHash: password, role: role || 'student' });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    success(res, { token, user: user.toSafeObject() }, 'Registered', 201);
  } catch (err) { next(err); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return error(res, 'email and password required', 400);

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return error(res, 'Invalid credentials', 401);
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    success(res, { token, user: user.toSafeObject() });
  } catch (err) { next(err); }
});

module.exports = router;
