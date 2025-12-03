const express = require('express');
const cors = require('cors');
const studentsRouter = require('./routes/students');
const coursesRouter = require('./routes/courses');
const { getPool, closePool } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/students', studentsRouter);
app.use('/api/courses', coursesRouter);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await getPool();
    res.json({ status: 'OK', message: 'Server and database are connected' });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', message: 'Database connection failed' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  try {
    await getPool();
    console.log('Database connection established');
  } catch (error) {
    console.error('Failed to connect to database:', error.message);
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  await closePool();
  process.exit(0);
});

