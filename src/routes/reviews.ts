import express, { Request, Response, NextFunction } from 'express';
import Review from '../models/Review';
import Company from '../models/Company';
import { protect, authorize } from '../middleware/auth';

const router = express.Router({ mergeParams: true });

// @desc    Get reviews
// @route   GET /api/reviews
// @route   GET /api/companies/:companyId/reviews
// @access  Public
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        let query;

        if (req.params.companyId) {
            query = Review.find({ companyId: req.params.companyId });
        } else {
            query = Review.find().populate({
                path: 'companyId',
                select: 'name description'
            });
        }

        const reviews = await query;

        res.status(200).json({
            success: true,
            count: reviews.length,
            data: reviews
        });
    } catch (err) {
        next(err);
    }
});

// @desc    Get single review
// @route   GET /api/reviews/:id
// @access  Public
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const review = await Review.findById(req.params.id).populate({
            path: 'companyId',
            select: 'name description'
        });

        if (!review) {
            return res.status(404).json({ success: false, error: 'No review found with the id of ' + req.params.id });
        }

        res.status(200).json({
            success: true,
            data: review
        });
    } catch (err) {
        next(err);
    }
});

// @desc    Add review
// @route   POST /api/companies/:companyId/reviews
// @access  Private
router.post('/', protect, async (req: Request, res: Response, next: NextFunction) => {
    try {
        req.body.companyId = req.params.companyId;
        req.body.authorId = req.user!._id;

        const company = await Company.findById(req.params.companyId);

        if (!company) {
            return res.status(404).json({ success: false, error: 'No company with the id of ' + req.params.companyId });
        }

        const review = await Review.create(req.body);

        res.status(201).json({
            success: true,
            data: review
        });
    } catch (err) {
        next(err);
    }
});

// @desc    Update review
// @route   PUT /api/reviews/:id
// @access  Private
router.put('/:id', protect, async (req: Request, res: Response, next: NextFunction) => {
    try {
        let review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({ success: false, error: 'No review found with the id of ' + req.params.id });
        }

        // Make sure review belongs to user or user is admin
        if (review.authorId.toString() !== req.user!._id.toString() && req.user!.role !== 'admin') {
            return res.status(401).json({ success: false, error: 'Not authorized to update review' });
        }

        review = await Review.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
            success: true,
            data: review
        });
    } catch (err) {
        next(err);
    }
});

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Private
router.delete('/:id', protect, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({ success: false, error: 'No review found with the id of ' + req.params.id });
        }

        // Make sure review belongs to user or user is admin
        if (review.authorId.toString() !== req.user!._id.toString() && req.user!.role !== 'admin') {
            return res.status(401).json({ success: false, error: 'Not authorized to delete review' });
        }

        await review.deleteOne();

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (err) {
        next(err);
    }
});

export default router;
