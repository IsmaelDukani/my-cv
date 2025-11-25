import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cvRoutes from './routes/cvs';
import userRoutes from './routes/users';
import { errorHandler } from './middleware/errorHandler';
import pool from './config/database';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// Middleware
app.use(cors({
    origin: true, // Allow all origins for development
    credentials: true,
}));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/cvs', cvRoutes);
app.use('/api/user', userRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
const startServer = async () => {
    try {
        // Test database connection
        await pool.query('SELECT NOW()');
        console.log('✅ Database connection successful');

        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔗 API URL: http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

export default app;
