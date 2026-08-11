import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import { initDb } from './src/config/db.js';
import apiRoutes from './src/routes/api.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api', apiRoutes);

// Base route
app.get('/', (req, res) => {
  res.json({ message: 'RVS Eco Projects API Server' });
});

// Initialize database and start listening
const startServer = async () => {
  console.log('Initializing database tables...');
  await initDb();
  
  app.listen(PORT, () => {
    console.log(`Server is running in production mode on port ${PORT}`);
  });
};

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
