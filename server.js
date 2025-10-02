

// // Import necessary modules
// const express = require('express');
// const http =require('http');
// const { Server } = require('socket.io');
// const mongoose = require('mongoose');
// const multer = require('multer');
// const { GridFsStorage } = require('multer-gridfs-storage');
// const cors = require('cors');
// require('dotenv').config();

// // Initialize Express app and HTTP server
// const app = express();
// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: "*", // Allow all origins for simplicity, restrict in production
//   }
// });

// // Middleware
// app.use(cors());
// app.use(express.static('public')); // Serve frontend files from 'public' directory

// // --- MongoDB and Mongoose Setup ---
// const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/studyhub';

// // Create a promise that resolves with the connection object
// const connPromise = mongoose.connect(mongoURI)
//   .then(m => {
//     console.log('MongoDB connected successfully.');
//     // THE FIX: Return the native `db` object for compatibility
//     return m.connection.db; 
//   })
//   .catch(err => {
//     console.error('MongoDB connection error:', err);
//     process.exit(1); // Exit if DB connection fails
//   });

// // Message Schema for Chat
// const MessageSchema = new mongoose.Schema({
//   username: { type: String, required: true },
//   text: { type: String, required: true },
//   timestamp: { type: Date, default: Date.now }
// });
// const Message = mongoose.model('Message', MessageSchema);


// // --- GridFS Setup for File Storage ---
// let gfs;
// // We still need the raw connection object for the 'open' event listener
// const conn = mongoose.connection;
// conn.once('open', () => {
//     // Initialize stream
//     gfs = new mongoose.mongo.GridFSBucket(conn.db, {
//         bucketName: 'uploads'
//     });
//     console.log('GridFS has been initialized.');
// });

// // Create storage engine
// const storage = new GridFsStorage({
//   db: connPromise, // Pass the promise that resolves to the native DB object
//   file: (req, file) => {
//     return new Promise((resolve, reject) => {
//         const filename = file.originalname;
//         const fileInfo = {
//           filename: filename,
//           bucketName: 'uploads'
//         };
//         resolve(fileInfo);
//     });
//   }
// });
// const upload = multer({ storage });


// // --- API Routes ---

// // @route POST /upload
// // @desc  Uploads file to DB
// app.post('/upload', upload.single('file'), (req, res) => {
//   // On successful upload, we should also notify clients to refresh their file list
//   io.emit('fileUploaded');
//   res.json({ file: req.file });
// });

// // @route GET /files
// // @desc  Display all files in JSON
// app.get('/files', async (req, res) => {
//     try {
//         const files = await conn.db.collection('uploads.files').find().toArray();
//         if (!files || files.length === 0) {
//             return res.status(404).json({ err: 'No files exist' });
//         }
//         return res.json(files);
//     } catch (error) {
//         return res.status(500).json({ err: 'Server error' });
//     }
// });


// // @route GET /files/:filename
// // @desc Display single file object
// app.get('/files/:filename', async (req, res) => {
//     // Safety Check: Ensure GridFS is initialized
//     if (!gfs) {
//         return res.status(500).json({ err: 'GridFS not initialized' });
//     }
//     try {
//         const file = await conn.db.collection('uploads.files').findOne({ filename: req.params.filename });
//         if (!file) {
//             return res.status(404).json({ err: 'No such file exists' });
//         }
//         const readstream = gfs.openDownloadStream(file._id);
//         readstream.pipe(res);
//     } catch (error) {
//         return res.status(500).json({ err: 'Server error' });
//     }
// });


// // --- Socket.io Real-time Chat Logic ---
// io.on('connection', (socket) => {
//   console.log('A new user connected');
//   const username = 'User' + Math.floor(Math.random() * 1000);

//   // Load old messages from the database
//   Message.find().sort({ timestamp: 1 }).then(messages => {
//     socket.emit('load old messages', messages);
//   }).catch(err => console.error(err));


//   // Listen for new chat messages
//   socket.on('chatMessage', (data) => {
//     const newMessage = new Message({
//       username: username,
//       text: data.text
//     });

//     // Save message to DB
//     newMessage.save().then(message => {
//       // Broadcast the new message to all connected clients
//       io.emit('chatMessage', message);
//     }).catch(err => console.error(err));
//   });

//   // Handle disconnection
//   socket.on('disconnect', () => {
//     console.log('User disconnected');
//   });
// });

// // Start the server
// const PORT = process.env.PORT || 3000;
// server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));


// // Import necessary modules
// const express = require('express');
// const http = require('http');
// const { Server } = require('socket.io');
// const mongoose = require('mongoose');
// const multer = require('multer');
// // --- FIX: Changed the import syntax for GridFsStorage ---
// const GridFsStorage = require('multer-gridfs-storage');
// const cors = require('cors');
// require('dotenv').config();

// // --- Main Server Function ---
// const startServer = async () => {
//     try {
//         // --- MongoDB and Mongoose Setup ---
//         const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/studyhub';
//         await mongoose.connect(mongoURI, {
//             useNewUrlParser: true,
//             useUnifiedTopology: true,
//         });
//         console.log('MongoDB connected successfully.');

//         // Initialize Express app
//         const app = express();
//         const server = http.createServer(app);
//         const io = new Server(server, {
//             cors: { origin: "*" }
//         });

//         // Middleware
//         app.use(cors());
//         app.use(express.static('public'));

//         // Get the native database object from the Mongoose connection
//         const db = mongoose.connection.db;

//         // Initialize GridFS stream AFTER connection is successful
//         const gfs = new mongoose.mongo.GridFSBucket(db, {
//             bucketName: 'uploads'
//         });
//         console.log('GridFS has been initialized.');

//         // --- Create storage engine now that we have a stable DB connection ---
//         const storage = new GridFsStorage({
//             db: db,
//             file: (req, file) => {
//                 return {
//                     bucketName: 'uploads',
//                     filename: file.originalname
//                 };
//             }
//         });

//         const upload = multer({ storage });

//         // --- API Routes ---

//         // @route POST /upload
//         app.post('/upload', upload.single('file'), (req, res) => {
//             io.emit('fileUploaded');
//             res.status(201).json({ file: req.file });
//         });

//         // @route GET /files
//         app.get('/files', async (req, res) => {
//             try {
//                 const files = await db.collection('uploads.files').find().toArray();
//                 return res.json(files);
//             } catch (error) {
//                 res.status(500).json({ err: 'Server error' });
//             }
//         });

//         // @route GET /files/:filename
//         app.get('/files/:filename', async (req, res) => {
//             try {
//                 const file = await db.collection('uploads.files').findOne({ filename: req.params.filename });
//                 if (!file) {
//                     return res.status(404).json({ err: 'No such file exists' });
//                 }
//                 const readstream = gfs.openDownloadStream(file._id);
//                 readstream.pipe(res);
//             } catch (error) {
//                 res.status(500).json({ err: 'Server error' });
//             }
//         });
        
//         // Message Schema
//         const MessageSchema = new mongoose.Schema({
//             username: { type: String, required: true },
//             text: { type: String, required: true },
//             timestamp: { type: Date, default: Date.now }
//         });
//         const Message = mongoose.model('Message', MessageSchema);

//         // --- Socket.io Real-time Chat Logic ---
//         io.on('connection', (socket) => {
//             console.log('A new user connected');
//             socket.on('chatMessage', (data) => {
//                 const newMessage = new Message({
//                     username: "User" + Math.floor(Math.random() * 1000),
//                     text: data.text
//                 });
//                 newMessage.save().then(message => {
//                     io.emit('chatMessage', message);
//                 });
//             });
//             socket.on('disconnect', () => {
//                 console.log('User disconnected');
//             });
//         });

//         // --- Start the server ---
//         const PORT = process.env.PORT || 3000;
//         server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

//     } catch (err) {
//         console.error('FATAL SERVER ERROR:', err);
//         process.exit(1);
//     }
// };

// // --- Run the server ---
// startServer();


// Import necessary modules
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const cors = require('cors');
require('dotenv').config();

// --- Main Server Function ---
const startServer = async () => {
    try {
        // --- MongoDB and Mongoose Setup ---
        const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/studyhub';
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected successfully.');

        // Initialize Express app
        const app = express();
        const server = http.createServer(app);
        const io = new Server(server, {
            cors: { origin: "*" }
        });

        // Middleware
        app.use(cors());
        app.use(express.static('public'));

        const db = mongoose.connection.db;
        const gfs = new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });
        console.log('GridFS has been initialized.');

        const storage = new GridFsStorage({
            db: db,
            file: (req, file) => ({ bucketName: 'uploads', filename: file.originalname })
        });
        const upload = multer({ storage });

        // --- API Routes for Files ---
        app.post('/upload', upload.single('file'), (req, res) => {
            io.emit('fileUploaded');
            res.status(201).json({ file: req.file });
        });
        app.get('/files', async (req, res) => {
            try {
                const files = await db.collection('uploads.files').find().toArray();
                return res.json(files);
            } catch (error) { res.status(500).json({ err: 'Server error' }); }
        });
        app.get('/files/:filename', async (req, res) => {
            try {
                const file = await db.collection('uploads.files').findOne({ filename: req.params.filename });
                if (!file) return res.status(404).json({ err: 'No such file exists' });
                gfs.openDownloadStream(file._id).pipe(res);
            } catch (error) { res.status(500).json({ err: 'Server error' }); }
        });
        
        // --- Message Schema and Model ---
        const MessageSchema = new mongoose.Schema({
            username: { type: String, required: true },
            text: { type: String, required: true },
            timestamp: { type: Date, default: Date.now }
        });
        const Message = mongoose.model('Message', MessageSchema);

        // --- API Route to Get All Messages ---
        app.get('/messages', async (req, res) => {
            try {
                const messages = await Message.find().sort({ timestamp: 1 });
                res.json(messages);
            } catch (error) {
                res.status(500).json({ err: 'Could not fetch messages' });
            }
        });

        // --- Socket.io Real-time Logic ---
        io.on('connection', (socket) => {
            console.log('A new user connected');
            // Broadcast the new user count to everyone
            io.emit('updateUserCount', io.sockets.sockets.size);

            socket.on('chatMessage', (data) => {
                const newMessage = new Message({
                    username: "User" + Math.floor(Math.random() * 1000), // You can enhance this later
                    text: data.text
                });
                // Save the message, then broadcast it
                newMessage.save().then(message => {
                    io.emit('chatMessage', message);
                });
            });

            socket.on('disconnect', () => {
                console.log('User disconnected');
                // Broadcast the updated user count to everyone
                io.emit('updateUserCount', io.sockets.sockets.size);
            });
        });

        // --- Start the server ---
        const PORT = process.env.PORT || 3000;
        server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

    } catch (err) {
        console.error('FATAL SERVER ERROR:', err);
        process.exit(1);
    }
};

// --- Run the server ---
startServer();