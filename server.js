// *****************************************************************************

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const multer = require('multer');
const { GridFSBucket } = require('mongodb');
const cors = require('cors');
const methodOverride = require('method-override');
require('dotenv').config();

const startServer = async () => {
    try {
        const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/studyhub';
        await mongoose.connect(mongoURI);
        console.log('MongoDB connected successfully.');

        const conn = mongoose.connection;
        const gfs = new GridFSBucket(conn.db, {
            bucketName: 'uploads'
        });
        console.log('GridFS has been initialized.');

        const app = express();
        const server = http.createServer(app);
        const io = new Server(server, { cors: { origin: "*" } });

        // Middleware
        app.use(cors());
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));
        app.use(methodOverride('_method'));
        app.use(express.static('public'));

        const storage = multer.memoryStorage();
        const upload = multer({ storage });

        // --- API Routes for Files (CORRECTED) ---
        app.post('/upload', upload.single('file'), (req, res) => {
            const { subject, module } = req.body;
            if (!req.file || !subject || !module) {
                return res.status(400).send('Missing file, subject, or module.');
            }
            const uploadStream = gfs.openUploadStream(req.file.originalname, {
                metadata: { subject, module } // Save subject and module here
            });
            uploadStream.end(req.file.buffer);

            uploadStream.on('finish', () => {
                io.emit('fileUploaded');
                res.status(201).json({ file: req.file });
            });
            uploadStream.on('error', () => res.status(500).json({ err: 'Error uploading file.' }));
        });

        app.get('/files', async (req, res) => {
            const files = await gfs.find().toArray();
            const structuredFiles = {};
            files.forEach(file => {
                if (file.metadata) {
                    const { subject, module } = file.metadata;
                    if (!subject || !module) return;
                    if (!structuredFiles[subject]) {
                        structuredFiles[subject] = {};
                    }
                    structuredFiles[subject][module] = {
                        filename: file.filename,
                        id: file._id,
                        size: file.length,
                        uploadDate: file.uploadDate
                    };
                }
            });
            return res.json(structuredFiles);
        });

        app.get('/files/:filename', (req, res) => {
            const downloadStream = gfs.openDownloadStreamByName(req.params.filename);
            downloadStream.pipe(res);
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
            const messages = await Message.find().sort({ timestamp: 1 });
            res.json(messages);
        });

        // --- Socket.io Real-time Logic ---
        io.on('connection', (socket) => {
            const sessionUsername = "User" + Math.floor(Math.random() * 1000);
            io.emit('updateUserCount', io.sockets.sockets.size);
            socket.on('chatMessage', (data) => {
                const newMessage = new Message({ username: sessionUsername, text: data.text });
                newMessage.save().then(message => io.emit('chatMessage', message));
            });
            socket.on('disconnect', () => {
                io.emit('updateUserCount', io.sockets.sockets.size);
            });
        });

        // --- Start the server ---
        const PORT = process.env.PORT || 3000;
        server.listen(PORT, () => console.log(`🚀 Server is running on port ${PORT}`));

    } catch (err) {
        console.error('FATAL SERVER ERROR:', err);
        process.exit(1);
    }
};
startServer();