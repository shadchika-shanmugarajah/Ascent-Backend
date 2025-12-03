const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../config/database');

// Get all students
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT s.*, 
        STUFF((
          SELECT ', ' + c.CourseName
          FROM StudentCourses sc
          INNER JOIN Courses c ON sc.CourseID = c.CourseID
          WHERE sc.StudentID = s.StudentID
          FOR XML PATH('')
        ), 1, 2, '') AS EnrolledCourses
      FROM Students s
      ORDER BY s.CreatedAt DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// Get student by ID with courses
router.get('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const studentId = parseInt(req.params.id);
    
    // Get student details
    const studentResult = await pool.request()
      .input('studentId', sql.Int, studentId)
      .query('SELECT * FROM Students WHERE StudentID = @studentId');
    
    if (studentResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    // Get enrolled courses
    const coursesResult = await pool.request()
      .input('studentId', sql.Int, studentId)
      .query(`
        SELECT c.*, sc.EnrollmentDate
        FROM StudentCourses sc
        INNER JOIN Courses c ON sc.CourseID = c.CourseID
        WHERE sc.StudentID = @studentId
      `);
    
    res.json({
      ...studentResult.recordset[0],
      courses: coursesResult.recordset
    });
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ error: 'Failed to fetch student' });
  }
});

// Create new student
router.post('/', async (req, res) => {
  try {
    const { firstName, lastName, email, phoneNumber, dateOfBirth, address, courseIds } = req.body;
    
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'FirstName, LastName, and Email are required' });
    }
    
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    
    await transaction.begin();
    
    try {
      // Insert student
      const studentResult = await transaction.request()
        .input('firstName', sql.NVarChar, firstName)
        .input('lastName', sql.NVarChar, lastName)
        .input('email', sql.NVarChar, email)
        .input('phoneNumber', sql.NVarChar, phoneNumber || null)
        .input('dateOfBirth', sql.Date, dateOfBirth || null)
        .input('address', sql.NVarChar, address || null)
        .query(`
          INSERT INTO Students (FirstName, LastName, Email, PhoneNumber, DateOfBirth, Address)
          OUTPUT INSERTED.StudentID
          VALUES (@firstName, @lastName, @email, @phoneNumber, @dateOfBirth, @address)
        `);
      
      const studentId = studentResult.recordset[0].StudentID;
      
      // Insert course enrollments if provided
      if (courseIds && Array.isArray(courseIds) && courseIds.length > 0) {
        for (const courseId of courseIds) {
          await transaction.request()
            .input('studentId', sql.Int, studentId)
            .input('courseId', sql.Int, courseId)
            .query(`
              INSERT INTO StudentCourses (StudentID, CourseID)
              VALUES (@studentId, @courseId)
            `);
        }
      }
      
      await transaction.commit();
      
      // Fetch the complete student record with courses
      const completeStudent = await pool.request()
        .input('studentId', sql.Int, studentId)
        .query(`
          SELECT s.*, 
            STUFF((
              SELECT ', ' + c.CourseName
              FROM StudentCourses sc
              INNER JOIN Courses c ON sc.CourseID = c.CourseID
              WHERE sc.StudentID = s.StudentID
              FOR XML PATH('')
            ), 1, 2, '') AS EnrolledCourses
          FROM Students s
          WHERE s.StudentID = @studentId
        `);
      
      res.status(201).json(completeStudent.recordset[0]);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error creating student:', error);
    if (error.number === 2627) { // Unique constraint violation
      res.status(400).json({ error: 'Email already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create student' });
    }
  }
});

// Update student
router.put('/:id', async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    const { firstName, lastName, email, phoneNumber, dateOfBirth, address } = req.body;
    
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'FirstName, LastName, and Email are required' });
    }
    
    const pool = await getPool();
    await pool.request()
      .input('studentId', sql.Int, studentId)
      .input('firstName', sql.NVarChar, firstName)
      .input('lastName', sql.NVarChar, lastName)
      .input('email', sql.NVarChar, email)
      .input('phoneNumber', sql.NVarChar, phoneNumber || null)
      .input('dateOfBirth', sql.Date, dateOfBirth || null)
      .input('address', sql.NVarChar, address || null)
      .query(`
        UPDATE Students
        SET FirstName = @firstName,
            LastName = @lastName,
            Email = @email,
            PhoneNumber = @phoneNumber,
            DateOfBirth = @dateOfBirth,
            Address = @address
        WHERE StudentID = @studentId
      `);
    
    res.json({ message: 'Student updated successfully' });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ error: 'Failed to update student' });
  }
});

// Delete student
router.delete('/:id', async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    const pool = await getPool();
    
    await pool.request()
      .input('studentId', sql.Int, studentId)
      .query('DELETE FROM Students WHERE StudentID = @studentId');
    
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

// Enroll student in courses
router.post('/:id/courses', async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    const { courseIds } = req.body;
    
    if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return res.status(400).json({ error: 'Course IDs array is required' });
    }
    
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    
    await transaction.begin();
    
    try {
      for (const courseId of courseIds) {
        await transaction.request()
          .input('studentId', sql.Int, studentId)
          .input('courseId', sql.Int, courseId)
          .query(`
            IF NOT EXISTS (SELECT 1 FROM StudentCourses WHERE StudentID = @studentId AND CourseID = @courseId)
            BEGIN
              INSERT INTO StudentCourses (StudentID, CourseID)
              VALUES (@studentId, @courseId)
            END
          `);
      }
      
      await transaction.commit();
      res.json({ message: 'Courses enrolled successfully' });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error enrolling courses:', error);
    res.status(500).json({ error: 'Failed to enroll courses' });
  }
});

// Remove course enrollment
router.delete('/:id/courses/:courseId', async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    const courseId = parseInt(req.params.courseId);
    
    const pool = await getPool();
    await pool.request()
      .input('studentId', sql.Int, studentId)
      .input('courseId', sql.Int, courseId)
      .query('DELETE FROM StudentCourses WHERE StudentID = @studentId AND CourseID = @courseId');
    
    res.json({ message: 'Course enrollment removed successfully' });
  } catch (error) {
    console.error('Error removing course enrollment:', error);
    res.status(500).json({ error: 'Failed to remove course enrollment' });
  }
});

module.exports = router;

