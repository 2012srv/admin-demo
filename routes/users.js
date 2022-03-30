const router = require('express').Router();
const bcrypt = require('bcrypt');

const { verifyToken, verifyTokenAdmin, verifyTokenAuthorization } = require('../middleware/verifyToken');
const User = require('../models/User');

// Update
router.put('/:id', verifyTokenAuthorization, async (req, res, next) => {
    if(req.body.password) {
        const salt = await bcrypt.genSalt(10);
        req.body.password = await bcrypt.hash(req.body.password, salt);
    }

    try {        
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            {$set:req.body},
            {new:true}
        );
        res.status(200).json({msg:"Updated!", user:updatedUser});
    } catch(err) {
        next(err);
    }
});

// Delete
router.delete("/:id", verifyTokenAuthorization, async (req, res, next) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.status(200).json({msg:'Deleted!', success: true});
    } catch(err) {
        next(err);
    }
});

// Get User
router.get("/find/:id", verifyToken, async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        const {password, ...rest} = user._doc;
        res.status(200).json({...rest});
    } catch(err) {
        next(err);
    }
});

// Get All User
router.get("/", verifyTokenAdmin, async (req, res, next) => {
    const query = req.query.new;
    try {
        const users = query ? await User.find().sort({_id:-1}).limit(10) : await User.find();
        res.status(200).json(users);
    } catch(err) {
        next(err);
    }
});

// Get User Stat
router.get("/stats", verifyTokenAdmin, async (req, res, next) => {
    const date = new Date();
    const lastYear = new Date(date.setFullYear(date.getFullYear()-1));

    try {
        const data = await User.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte:lastYear
                    }
                }
            },
            {
                $project:{
                    month:{
                        $month: "$createdAt",
                    }
                }
            },
            {
                $group:{
                    _id:"$month",
                    total:{
                        $sum: 1
                    }
                }
            }
        ]);
        res.status(200).json(data);
    } catch(err) {
        next(err);
    }
});

module.exports = router;