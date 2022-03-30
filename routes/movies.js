const router = require('express').Router();

const { verifyToken, verifyTokenAdmin, verifyTokenAuthorization } = require('../middleware/verifyToken');
const Movie = require('../models/Movie');

// Create
router.post('/', verifyTokenAdmin, async (req, res, next) => {
    try {  
        const newMovie = new Movie(req.body);   
        const savedMovie = await newMovie.save();   
        res.status(201).json(savedMovie);
    } catch(err) {
        next(err);
    }
});

// Update
router.put('/:id', verifyTokenAdmin, async (req, res, next) => {
    try {  
        const updateMovie = await Movie.findByIdAndDelete(
            req.params.id,
            {$set:req.body},
            {new:true}
        )
        res.status(200).json(updateMovie);
    } catch(err) {
        next(err);
    }
});

// Delete
router.delete('/:id', verifyTokenAdmin, async (req, res, next) => {
    try {  
        await Movie.findByIdAndDelete(req.params.id);
        res.status(200).json({msg:'Deleted!', success: true});
    } catch(err) {
        next(err);
    }
});

// Get
router.get('/find/:id', verifyToken, async (req, res, next) => {
    try {  
        const movie = await Movie.findById(req.params.id);
        res.status(200).json(movie);
    } catch(err) {
        next(err);
    }
});

// Get Random
router.get('/random', verifyToken, async (req, res, next) => {
    const type = req.query.type;
    let movie;
    try {  
        if(type==='series') {
            movie = await Movie.aggregate([
                {$match:{isSeries: true}},
                {$sample:{size:1}},
            ]);
        } else {
            movie = await Movie.aggregate([
                {$match:{isSeries: false}},
                {$sample:{size:1}},
            ]);
        }
        res.status(200).json(movie);
    } catch(err) {
        next(err);
    }
});

// Get all
router.get('/', verifyToken, async (req, res, next) => {
    try {  
        const movies = await Movie.find();
        res.status(200).json(movies.reverse());
    } catch(err) {
        next(err);
    }
});


module.exports = router;