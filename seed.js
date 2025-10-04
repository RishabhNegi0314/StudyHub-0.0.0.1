const mongoose = require('mongoose');
require('dotenv').config();

// --- The Data You Want to Add ---
// Add as many file objects as you like to this array.
const filesToSeed = [
    {
        filename: 'calculus-notes.pdf',
        contentType: 'application/pdf',
        length: 2411724, // File size in bytes (e.g., 2.3 MB)
        uploadDate: new Date(),
        metadata: {
            subject: 'Mathematics',
            module: 'Module 1'
        }
    },
    {
        filename: 'quantum-mechanics-intro.pdf',
        contentType: 'application/pdf',
        length: 1887436, // e.g., 1.8 MB
        uploadDate: new Date(),
        metadata: {
            subject: 'Physics',
            module: 'Module 2'
        }
    },
    {
        filename: 'organic-compounds.docx',
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        length: 967680, // e.g., 945 KB
        uploadDate: new Date(),
        metadata: {
            subject: 'Chemistry',
            module: 'Syllabus'
        }
    }
];

// --- The Seeding Script ---
const runSeed = async () => {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/studyhub';
    
    try {
        await mongoose.connect(mongoURI);
        console.log('MongoDB connected for seeding...');

        const db = mongoose.connection.db;
        const filesCollection = db.collection('uploads.files');
        
        // Clear existing data to avoid duplicates (optional)
        await filesCollection.deleteMany({});
        console.log('Cleared existing files.');

        // Insert the new data
        await filesCollection.insertMany(filesToSeed);
        console.log('✅ Database has been seeded successfully!');

    } catch (error) {
        console.error('Error seeding the database:', error);
    } finally {
        // Close the connection
        await mongoose.connection.close();
        console.log('MongoDB connection closed.');
    }
};

// --- Run the Script ---
runSeed();