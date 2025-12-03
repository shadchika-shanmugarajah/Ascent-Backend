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
    
    const course = result.recordset[0];
    // Add category
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
    
    res.json({ ...course, Category: category });
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

// Create new course
router.post('/', async (req, res) => {
  try {
    const { courseCode, courseName, description, credits, category } = req.body;
    
    if (!courseCode || !courseName) {
      return res.status(400).json({ error: 'CourseCode and CourseName are required' });
    }
    
    const pool = await getPool();
    const result = await pool.request()
      .input('courseCode', sql.NVarChar, courseCode)
      .input('courseName', sql.NVarChar, courseName)
      .input('description', sql.NVarChar, description || null)
      .input('credits', sql.Int, credits || 3)
      .query(`
        INSERT INTO Courses (CourseCode, CourseName, Description, Credits)
        OUTPUT INSERTED.*
        VALUES (@courseCode, @courseName, @description, @credits)
      `);
    
    const course = result.recordset[0];
    // Add category
    let cat = 'General';
    const code = course.CourseCode || '';
    if (code.startsWith('CS')) {
      cat = 'IT';
    } else if (code.startsWith('MATH')) {
      cat = 'Mathematics';
    } else if (['PHYS101', 'CHEM101', 'BIO101'].includes(code)) {
      cat = 'Science';
    } else if (code.startsWith('ENG')) {
      cat = 'Language & Communication';
    } else if (['HIST101', 'PSY101'].includes(code)) {
      cat = 'Social Sciences';
    }
    
    res.status(201).json({ ...course, Category: cat });
  } catch (error) {
    console.error('Error creating course:', error);
    if (error.number === 2627) {
      res.status(400).json({ error: 'Course code already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create course' });
    }
  }
});

// Update course
router.put('/:id', async (req, res) => {
  try {
    const courseId = parseInt(req.params.id);
    const { courseCode, courseName, description, credits } = req.body;
    
    if (!courseCode || !courseName) {
      return res.status(400).json({ error: 'CourseCode and CourseName are required' });
    }
    
    const pool = await getPool();
    const result = await pool.request()
      .input('courseId', sql.Int, courseId)
      .input('courseCode', sql.NVarChar, courseCode)
      .input('courseName', sql.NVarChar, courseName)
      .input('description', sql.NVarChar, description || null)
      .input('credits', sql.Int, credits || 3)
      .query(`
        UPDATE Courses
        SET CourseCode = @courseCode,
            CourseName = @courseName,
            Description = @description,
            Credits = @credits
        WHERE CourseID = @courseId
      `);
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    // Fetch updated course
    const updatedResult = await pool.request()
      .input('courseId', sql.Int, courseId)
      .query('SELECT * FROM Courses WHERE CourseID = @courseId');
    
    const course = updatedResult.recordset[0];
    // Add category
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
    
    res.json({ ...course, Category: category });
  } catch (error) {
    console.error('Error updating course:', error);
    if (error.number === 2627) {
      res.status(400).json({ error: 'Course code already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update course' });
    }
  }
});

// Delete course
router.delete('/:id', async (req, res) => {
  try {
    const courseId = parseInt(req.params.id);
    const pool = await getPool();
    
    // Check if course exists
    const checkResult = await pool.request()
      .input('courseId', sql.Int, courseId)
      .query('SELECT CourseID FROM Courses WHERE CourseID = @courseId');
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    // Delete course (CASCADE will handle StudentCourses)
    await pool.request()
      .input('courseId', sql.Int, courseId)
      .query('DELETE FROM Courses WHERE CourseID = @courseId');
    
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

module.exports = router;

