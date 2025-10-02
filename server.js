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