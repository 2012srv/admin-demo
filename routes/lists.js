const router = require('express').Router();

const { verifyToken, verifyTokenAdmin, verifyTokenAuthorization } = require('../middleware/verifyToken');
const List = require('../models/List');

// Create
router.post('/', verifyTokenAdmin, async (req, res, next) => {
    try {  
        const newList = new List(req.body);   
        const savedList = await newList.save();   
        res.status(201).json(savedList);
    } catch(err) {
        next(err);
    }
});

// Delete
router.delete('/:id', verifyTokenAdmin, async (req, res, next) => {
    try {  
        await List.findByIdAndDelete(req.params.id);
        res.status(200).json({msg:'Deleted!', success: true});
    } catch(err) {
        next(err);
    }
});

// Get
router.get('/', verifyToken, async (req, res, next) => {
    const type = req.query.type;
    const genre = req.query.genre;
    let list = [];
    try {  
        if(type) {
            if(genre) {
                list = await List.aggregate([
                    {$sample:{size:10}},
                    {$match: {type:type, genre:genre}}
                ]);
            } else {
                list = await List.aggregate([
                    {$sample:{size:10}},
                    {$match: {type:type}}
                ]);
            }
        } else {
            list = await List.aggregate([{$sample:{size:10}}]);
        }
        res.status(200).json(list);
    } catch(err) {
        next(err);
    }
});

module.exports = router;