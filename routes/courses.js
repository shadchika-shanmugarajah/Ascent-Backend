const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../config/database');

// Get all courses - SIMPLIFIED to match working students route
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    
    // Simple query - exactly like students route
    const result = await pool.request().query(`
      SELECT 
        CourseID,
        CourseCode,
        CourseName,
        Description,
        Credits,
        CreatedAt
      FROM Courses
      ORDER BY CourseCode
    `);
    
    // Add Category and EnrollmentCount in JavaScript (simple and safe)
    const courses = result.recordset.map(course => {
      // Determine category from course code
      let category = 'General';
      const code = course.CourseCode || '';
      if (code.startsWith('CS')) {
        category = 'IT';
      } else if (code.startsWith('MATH')) {
        category = 'Mathematics';
      } else if (['PHYS101', 'CHEM101', 'BIO101'].includes(code)) {
        category = 'Science';
      } else if (code.startsWith('ENG')) {
        category = 'Language & Communication';
      } else if (['HIST101', 'PSY101'].includes(code)) {
        category = 'Social Sciences';
      }
      
      return {
        ...course,
        Category: category,
        EnrollmentCount: 0 // Will add enrollment count later if needed
      };
    });
    
    res.json(courses);
  } catch (error) {
    console.error('=== ERROR FETCHING COURSES ===');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error number:', error.number);
    if (error.originalError) {
      console.error('Original error:', error.originalError.message);
    }
    console.error('Full error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch courses', 
      details: error.message,
      code: error.code 
    });
  }
});

// Get course by ID
router.get('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const courseId = parseInt(req.params.id);
    
    const result = await pool.request()
      .input('courseId', sql.Int, courseId)
      .query('SELECT * FROM Courses WHERE CourseID = @courseId');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

module.exports = router;

