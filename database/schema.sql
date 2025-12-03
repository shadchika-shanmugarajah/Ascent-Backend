-- Create Database (Run this manually if database doesn't exist)
-- CREATE DATABASE StudentRegistration;
-- GO
-- USE StudentRegistration;
-- GO

-- Create Students Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Students]') AND type in (N'U'))
BEGIN
    CREATE TABLE Students (
        StudentID INT PRIMARY KEY IDENTITY(1,1),
        FirstName NVARCHAR(100) NOT NULL,
        LastName NVARCHAR(100) NOT NULL,
        Email NVARCHAR(255) NOT NULL UNIQUE,
        PhoneNumber NVARCHAR(20),
        DateOfBirth DATE,
        Address NVARCHAR(500),
        CreatedAt DATETIME DEFAULT GETDATE()
    );
END
GO

-- Create Courses Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Courses]') AND type in (N'U'))
BEGIN
    CREATE TABLE Courses (
        CourseID INT PRIMARY KEY IDENTITY(1,1),
        CourseCode NVARCHAR(50) NOT NULL UNIQUE,
        CourseName NVARCHAR(200) NOT NULL,
        Description NVARCHAR(1000),
        Credits INT DEFAULT 3,
        CreatedAt DATETIME DEFAULT GETDATE()
    );
END
GO

-- Create StudentCourses Junction Table (Many-to-Many Relationship)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[StudentCourses]') AND type in (N'U'))
BEGIN
    CREATE TABLE StudentCourses (
        StudentCourseID INT PRIMARY KEY IDENTITY(1,1),
        StudentID INT NOT NULL,
        CourseID INT NOT NULL,
        EnrollmentDate DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (StudentID) REFERENCES Students(StudentID) ON DELETE CASCADE,
        FOREIGN KEY (CourseID) REFERENCES Courses(CourseID) ON DELETE CASCADE,
        UNIQUE(StudentID, CourseID)
    );
END
GO

-- Insert Sample Courses
IF NOT EXISTS (SELECT * FROM Courses WHERE CourseCode = 'CS101')
BEGIN
    INSERT INTO Courses (CourseCode, CourseName, Description, Credits) VALUES
    ('CS101', 'Introduction to Computer Science', 'Fundamentals of computer science and programming', 3),
    ('MATH101', 'Calculus I', 'Differential and integral calculus', 4),
    ('ENG101', 'English Composition', 'Basic writing and communication skills', 3),
    ('PHYS101', 'Physics I', 'Mechanics and thermodynamics', 4),
    ('CHEM101', 'General Chemistry', 'Basic principles of chemistry', 4),
    ('BIO101', 'Biology I', 'Introduction to biological sciences', 4),
    ('HIST101', 'World History', 'Survey of world history', 3),
    ('PSY101', 'Introduction to Psychology', 'Basic psychological principles', 3);
END
GO

-- Quick Fix Script: Add Category column and update courses
-- Run this if courses are not visible

-- Step 1: Add Category column if missing
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[Courses]') 
    AND name = 'Category'
)
BEGIN
    ALTER TABLE Courses ADD Category NVARCHAR(50) DEFAULT 'General';
    PRINT 'Category column added.';
END
ELSE
BEGIN
    PRINT 'Category column already exists.';
END
GO

-- Step 2: Update existing courses with categories
UPDATE Courses SET Category = 'IT' WHERE CourseCode LIKE 'CS%' AND (Category IS NULL OR Category = 'General');
UPDATE Courses SET Category = 'Mathematics' WHERE CourseCode LIKE 'MATH%' AND (Category IS NULL OR Category = 'General');
UPDATE Courses SET Category = 'Science' WHERE CourseCode IN ('PHYS101', 'CHEM101', 'BIO101') AND (Category IS NULL OR Category = 'General');
UPDATE Courses SET Category = 'Language & Communication' WHERE CourseCode LIKE 'ENG%' AND (Category IS NULL OR Category = 'General');
UPDATE Courses SET Category = 'Social Sciences' WHERE CourseCode IN ('HIST101', 'PSY101') AND (Category IS NULL OR Category = 'General');
UPDATE Courses SET Category = 'General' WHERE Category IS NULL;
GO

-- Step 3: Insert new IT courses if they don't exist
IF NOT EXISTS (SELECT * FROM Courses WHERE CourseCode = 'CS201')
BEGIN
    INSERT INTO Courses (CourseCode, CourseName, Description, Category, Credits) VALUES
    ('CS201', 'Data Structures and Algorithms', 'Advanced data structures including trees, graphs, and hash tables. Algorithm analysis and optimization techniques.', 'IT', 4),
    ('CS301', 'Database Management Systems', 'Learn SQL, database design, normalization, and database administration. Hands-on experience with modern DBMS.', 'IT', 4),
    ('CS302', 'Web Development', 'Build modern web applications using HTML, CSS, JavaScript, and frameworks. Full-stack development concepts.', 'IT', 4),
    ('CS303', 'Software Engineering', 'Software development lifecycle, agile methodologies, version control, and collaborative development practices.', 'IT', 3),
    ('CS304', 'Network Security', 'Cybersecurity fundamentals, encryption, network protocols, and security best practices for IT professionals.', 'IT', 4),
    ('CS305', 'Cloud Computing', 'Introduction to cloud platforms, virtualization, containerization, and cloud architecture patterns.', 'IT', 3),
    ('CS306', 'Mobile App Development', 'Develop mobile applications for iOS and Android platforms using modern frameworks and tools.', 'IT', 4);
    PRINT 'New IT courses added.';
END
ELSE
BEGIN
    PRINT 'IT courses already exist.';
END
GO

-- Step 4: Insert MATH102 if it doesn't exist
IF NOT EXISTS (SELECT * FROM Courses WHERE CourseCode = 'MATH102')
BEGIN
    INSERT INTO Courses (CourseCode, CourseName, Description, Category, Credits) VALUES
    ('MATH102', 'Linear Algebra', 'Vectors, matrices, systems of equations, and linear transformations.', 'Mathematics', 3);
    PRINT 'MATH102 added.';
END
GO

-- Step 5: Verify courses exist
SELECT COUNT(*) AS TotalCourses, Category, COUNT(*) AS CountPerCategory
FROM Courses
GROUP BY Category
ORDER BY Category;
GO

PRINT 'Fix completed! Check the results above.';

