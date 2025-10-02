
document.addEventListener('DOMContentLoaded', () => {
    // --- Initialize Socket.IO connection ---
    // This requires <script src="/socket.io/socket.io.js"></script> in your HTML
    const socket = io();

    // --- Element References ---
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const userCountElement = document.getElementById('userCount');
    const notesUpload = document.getElementById('notesUpload');
    const notesList = document.getElementById('notesList');
    const browseBtn = notesUpload.querySelector('.btn');

    // --- Real-time Event Listeners from Server---

    // Listen for user count updates
    socket.on('updateUserCount', (count) => {
        userCountElement.textContent = count;
    });

    // Listen for incoming chat messages
    socket.on('chatMessage', (message) => {
        renderMessage(message);
    });

    // Listen for a signal that a file was uploaded successfully
    socket.on('fileUploaded', () => {
        fetchAndDisplayFiles(); // Refresh the file list
    });


    // --- Functions ---

    // Fetch message history from the server when the page loads
    async function fetchMessages() {
        try {
            const response = await fetch('/messages');
            const messages = await response.json();
            messages.forEach(message => {
                renderMessage(message);
            });
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    }

    // Add a single message to the chat window
    function renderMessage(doc) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user'; // Apply same style for all messages for simplicity
        messageDiv.innerHTML = `<div class="message-bubble"><strong>${doc.username}:</strong> ${doc.text}</div>`;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll to the bottom
    }

    // Send a message to the server
    function sendMessage() {
        const text = chatInput.value.trim();
        if (text) {
            socket.emit('chatMessage', { text });
            chatInput.value = '';
        }
    }

    // Fetch and display all uploaded files
    async function fetchAndDisplayFiles() {
        try {
            const res = await fetch('/files');
            const files = await res.json();
            notesList.innerHTML = ''; // Clear list before repopulating
            files.forEach(addNoteItem);
        } catch (e) {
            console.error('Failed to load files', e);
        }
    }
    
    // Add a single file to the notes list
    function addNoteItem(file) {
        const sizeInMB = (file.length / (1024 * 1024)).toFixed(2);
        const noteItem = document.createElement('div');
        noteItem.className = 'note-item';
        noteItem.innerHTML = `
            <div>
                <strong>${file.filename}</strong>
                <div style="font-size: 0.85rem; color: #64748b; margin-top: 4px;">
                    ${file.filename.split('.').pop().toUpperCase()} • ${sizeInMB} MB
                </div>
            </div>
            <a href="/files/${encodeURIComponent(file.filename)}" target="_blank" class="btn">View</a>
        `;
        notesList.appendChild(noteItem);
    }

    // Upload one or more files to the server
    async function uploadFiles(fileList) {
        const formData = new FormData();
        // Since the backend is configured for a single file upload, we'll upload one by one.
        for (const file of fileList) {
            formData.set('file', file); // Use .set to overwrite the file for each loop
             try {
                await fetch('/upload', { method: 'POST', body: formData });
             } catch (error) {
                console.error('File upload failed:', error);
             }
        }
        // The 'fileUploaded' socket event will handle refreshing the list automatically.
    }


    // --- UI Event Listeners ---
    
    // Chat functionality
    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // File Upload: Browse button
    browseBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true; // Allow multiple file selection
        input.accept = '.pdf,.doc,.docx,.txt,.ppt,.pptx';
        input.onchange = (e) => {
            if (e.target.files.length) {
                uploadFiles(e.target.files);
            }
        };
        input.click();
    });

    // File Upload: Drag and drop
    notesUpload.addEventListener('dragover', (e) => {
        e.preventDefault();
        notesUpload.classList.add('dragover');
    });
    notesUpload.addEventListener('dragleave', () => {
        notesUpload.classList.remove('dragover');
    });
    notesUpload.addEventListener('drop', (e) => {
        e.preventDefault();
        notesUpload.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            uploadFiles(e.dataTransfer.files);
        }
    });

    // --- Initial Data Load ---
    // Fetch everything needed when the page first loads
    fetchAndDisplayFiles();
    fetchMessages();
});