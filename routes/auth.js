const router = require("express").Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const sgTransport = require("nodemailer-sendgrid-transport");
const otpGenerator = require('otp-generator');

const User = require("../models/User");
const Token = require("../models/Token");
const Otp = require("../models/Otp");
const { verifyToken } = require("../middleware/verifyToken");

const client = require('twilio')(process.env.TWILLO_ACCOUNT_ID, process.env.TWILLO_TOKEN);
// let refreshTokens = [];

const transport = nodemailer.createTransport(
  sgTransport({
    auth: {
      api_key: process.env.SENDGRID_API_KEY
    },
  })
);

// otp generate
router.post("/generateOtp", async (req, res, next) => {
  const phone = req.body.phone;
  const email = req.body.email;
  try {
    const newOtp = otpGenerator.generate(6, { digits: true, upperCaseAlphabets: false, lowerCaseAlphabets: false, specialChars: false });

    if (phone) {
      client.messages.create({
        body: 'Hi, Saurav...This is test otp ' + newOtp,
        from: '+16812498667',
        to: '+919038324462'
      }).then();
    } else {
      transport.sendMail({
        to: email,
        from: "srv.dollar@gmail.com",
        subject: 'Test OTP',
        html: `<h1>One Time Password</h1>
        <h2>Hello</h2>
        <p>Your test OTP is ${newOtp}</p>
        </div>`,
      }).then((data) => console.log(data));
    }

    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(newOtp, salt);
    // console.log(newOtp);
    const otp = new Otp({
      phone,
      email,
      otp: hashedOtp
    });
    await otp.save();
    res.status(200).json({ msg: 'OTP sent!' });
  } catch (err) {
    next(err);
  }
});
router.post("/verifyOtp", async (req, res, next) => {
  const phone = req.body.phone;
  const email = req.body.email;
  const otp = req.body.otp;
  try {
    let otps = [];
    if (phone) {
      otps = await Otp.find({
        phone
      });
    } else {
      otps = await Otp.find({
        email
      });
    }

    if (otps.length == 0) {
      const error = new Error("Invalid OTP!");
      error.statusCode = 401;
      throw error;
    }

    const rightOtp = otps[otps.length - 1];
    const validOtp = await bcrypt.compare(otp, rightOtp.otp);

    if (!validOtp) {
      const error = new Error("Invalid OTP!");
      error.statusCode = 401;
      throw error;
    }

    let user;

    if (phone) {
      await Otp.deleteMany({ phone });
      user = await User.findOne({ phone });
    } else {
      await Otp.deleteMany({ email });
      user = await User.findOne({ email });
    }

    const { confirmationCode, password, ...userData } = user._doc;
    const accessToken = generateToken(
      { id: user._id, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      "5m"
    );
    const refreshToken = generateToken(
      { id: user._id, isAdmin: user.isAdmin },
      process.env.REF_SECRET
    );
    const newToken = new Token({ token: refreshToken });
    await newToken.save();

    res.status(200).json({ ...userData, accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
});

// register
router.post("/register", async (req, res, next) => {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPass = await bcrypt.hash(req.body.password, salt);

    const confirmationCode = generateToken(
      {
        id: req.body.email,
        isAdmin: false
      },
      process.env.JWT_SECRET
    );

    const newUser = new User({
      fullName: req.body.fullName,
      phone: req.body.phone,
      email: req.body.email,
      password: hashedPass,
      confirmationCode
    });
    const user = await newUser.save();
    transport.sendMail({
      to: req.body.email,
      from: "srv.dollar@gmail.com",
      subject: 'Please confirm your account',
      html: `<h1>Email Confirmation</h1>
        <h2>Hello ${req.body.fullName}</h2>
        <p>Thank you for subscribing. Please confirm your email by clicking on the following link</p>
        <a href=http://localhost:8800/confirm/${confirmationCode}> Click here</a>
        </div>`,
    }).then((data) => console.log(data));
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

// verify user registration
router.get("/confirm/:confirmationCode", async (req, res, next) => {
  const token = req.params.confirmationCode;
  jwt.verify(token, process.env.JWT_SECRET, async (err, data) => {
    if (err) {
      const error = new Error("Session is invalid!");
      error.statusCode = 401;
      throw error;
    } else {
      try {
        const user = await User.findOneAndUpdate({
          email: data.id,
        }, { status: 'Active' }, { new: true }).exec(); //.select('-password').exec();

        if (!user) {
          const error = new Error("You are not registered!");
          error.statusCode = 401;
          throw error;
        }

        res.status(200).json(user);
      } catch (err) {
        next(err);
      }
    }
  });
});

// refresh token
router.post("/refresh", async (req, res, next) => {
  try {
    const refreshToken = req.body.token;
    if (!refreshToken) {
      const error = new Error("Missing refresh token!");
      error.statusCode = 401;
      throw error;
    }
    const findToken = await Token.findOne({ token: refreshToken });
    if (!findToken) {
      // console.log(1);
      const error = new Error("Refresh token is invalid!");
      error.statusCode = 403;
      throw error;
    }

    jwt.verify(refreshToken, process.env.REF_SECRET, async (err, user) => {
      if (err) {
        console.log(err);
        const error = new Error("Refresh Token is invalid!");
        error.statusCode = 403;
        throw error;
      } else {
        try {
          // await Token.deleteOne({ token: refreshToken });
          const newAccessToken = generateToken(
            { id: user.id, isAdmin: user.isAdmin },
            process.env.JWT_SECRET,
            "5m"
          );
          // const newRefreshToken = generateToken(
          //   { id: user.id, isAdmin: user.isAdmin },
          //   process.env.REF_SECRET
          // );
          // const newToken = new Token({ token: newRefreshToken });
          // await newToken.save();
          res.status(200).json({
            accessToken: newAccessToken
          });
        } catch (err) {
          next(err);
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

// logout
router.post("/logout", verifyToken, async (req, res, next) => {
  const refreshToken = req.body.token;
  await Token.deleteOne({ token: refreshToken });
  res.status(200).json({ msg: "You are logged out successfully!" });
});

// login
router.post("/login", async (req, res, next) => {
  try {
    const user = await User.findOne({
      email: req.body.email,
    }).exec(); //.select('-password').exec();

    if (!user) {
      const error = new Error("Wrong credentials!");
      error.statusCode = 401;
      throw error;
    }

    if (user.status != "Active") {
      const error = new Error("Pending Account. Please Verify Your Email!");
      error.statusCode = 401;
      throw error;
    }

    const validate = await bcrypt.compare(req.body.password, user.password);
    if (!validate) {
      const error = new Error("Wrong credentials!");
      error.statusCode = 401;
      throw error;
    }

    const accessToken = generateToken(
      { id: user._id, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      "5m"
    );
    const refreshToken = generateToken(
      { id: user._id, isAdmin: user.isAdmin },
      process.env.REF_SECRET
    );
    const newToken = new Token({ token: refreshToken });
    await newToken.save();

    const { confirmationCode, password, ...userData } = user._doc;
    res.status(200).json({ ...userData, accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
});

function generateToken(obj, secret, t) {
  if (t) {
    return jwt.sign(obj, secret, { expiresIn: t });
  } else {
    return jwt.sign(obj, secret);
  }
}

module.exports = router;
