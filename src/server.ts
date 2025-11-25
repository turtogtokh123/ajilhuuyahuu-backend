import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import companyRoutes from './routes/companies';
import reviewRoutes from './routes/reviews';

// Load environment variables
dotenv.config();

const app = express();

// Trust proxy - Required for Vercel, Heroku, and other platforms behind proxies
app.set('trust proxy', 1);

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// Database Connection
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI as string);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return true;
    } catch (error) {
        console.error(`MongoDB Connection Error: ${(error as Error).message}`);
        console.log('Will retry MongoDB connection in 5 seconds...');
        return false;
    }
};

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    const health = {
        status: 'OK',
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    };
    res.json(health);
});

// Routes
app.get('/', (req: Request, res: Response) => {
    res.json({ message: 'Welcome to the Company Review API' });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/reviews', reviewRoutes);

// Error Handling Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: 'Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

const PORT = parseInt(process.env.PORT || '5000', 10);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI as string)
    .then(() => console.log(`MongoDB Connected: ${mongoose.connection.host}`))
    .catch((error) => {
        console.error(`MongoDB Connection Error:`, error);
        // Don't exit, let the server run even if DB fails initially
    });

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    console.log(`Health check available at /health`);
});

// Basic error handling for uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    // Keep running
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    // Keep running
});
