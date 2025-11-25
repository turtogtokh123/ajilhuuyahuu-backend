import express, { Request, Response, NextFunction } from 'express';
import Company from '../models/Company';
import { protect, authorize } from '../middleware/auth';
import reviewRouter from './reviews';

const router = express.Router();

// Re-route into other resource routers
router.use('/:companyId/reviews', reviewRouter);

// @desc    Get all companies
// @route   GET /api/companies
// @access  Public
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        let query;

        // Copy req.query
        const reqQuery = { ...req.query };

        // Fields to exclude
        const removeFields = ['select', 'sort', 'page', 'limit'];

        // Loop over removeFields and delete them from reqQuery
        removeFields.forEach(param => delete reqQuery[param]);

        // Create query string
        let queryStr = JSON.stringify(reqQuery);

        // Create operators ($gt, $gte, etc)
        queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

        // Finding resource
        query = Company.find(JSON.parse(queryStr)).populate('reviews');

        // Select Fields
        if (req.query.select) {
            const fields = (req.query.select as string).split(',').join(' ');
            query = query.select(fields);
        }

        // Sort
        if (req.query.sort) {
            const sortBy = (req.query.sort as string).split(',').join(' ');
            query = query.sort(sortBy);
        } else {
            query = query.sort('-createdAt');
        }

        // Pagination
        const page = parseInt(req.query.page as string, 10) || 1;
        const limit = parseInt(req.query.limit as string, 10) || 25;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const total = await Company.countDocuments();

        query = query.skip(startIndex).limit(limit);

        // Executing query
        const companies = await query;

        // Pagination result
        const pagination: any = {};

        if (endIndex < total) {
            pagination.next = {
                page: page + 1,
                limit
            };
        }

        if (startIndex > 0) {
            pagination.prev = {
                page: page - 1,
                limit
            };
        }

        res.status(200).json({
            success: true,
            count: companies.length,
            pagination,
            data: companies
        });
    } catch (err) {
        next(err);
    }
});

// @desc    Get single company
// @route   GET /api/companies/:id
// @access  Public
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const company = await Company.findById(req.params.id).populate('reviews');

        if (!company) {
            return res.status(404).json({ success: false, error: 'Company not found' });
        }

        res.status(200).json({ success: true, data: company });
    } catch (err) {
        next(err);
    }
});

// @desc    Create new company
// @route   POST /api/companies
// @access  Private (Admin)
router.post('/', protect, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const company = await Company.create(req.body);

        res.status(201).json({
            success: true,
            data: company
        });
    } catch (err) {
        next(err);
    }
});

// @desc    Update company
// @route   PUT /api/companies/:id
// @access  Private (Admin)
router.put('/:id', protect, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        let company = await Company.findById(req.params.id);

        if (!company) {
            return res.status(404).json({ success: false, error: 'Company not found' });
        }

        company = await Company.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({ success: true, data: company });
    } catch (err) {
        next(err);
    }
});

// @desc    Delete company
// @route   DELETE /api/companies/:id
// @access  Private (Admin)
router.delete('/:id', protect, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const company = await Company.findById(req.params.id);

        if (!company) {
            return res.status(404).json({ success: false, error: 'Company not found' });
        }

        await company.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        next(err);
    }
});

export default router;
