// *************************************************************************

document.addEventListener('DOMContentLoaded', () => {
    const SERVER_URL = 'http://localhost:3000';
    const socket = io(SERVER_URL);

    // --- Element References ---
    const notesContainer = document.getElementById('notesContainer');
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const userCountElement = document.getElementById('userCount');

    // --- State Management ---
    let studyMaterials = {};
    let currentView = 'subjects';
    let selectedSubject = null;
    let selectedModule = null;
    const moduleNames = ["Module 1", "Module 2", "Module 3", "Module 4", "Module 5", "Syllabus"];

    // --- Render Functions ---
    function renderSubjects() {
        notesContainer.innerHTML = `
            <div class="breadcrumb">Subjects</div>
            <div class="subject-grid"></div>
        `;
        const grid = notesContainer.querySelector('.subject-grid');
        const subjects = Object.keys(studyMaterials);
        if (subjects.length === 0) {
            grid.innerHTML = "<p>No subjects with files are available. Upload a file to get started!</p>";
            return;
        }
        subjects.forEach(subject => {
            const tile = document.createElement('div');
            tile.className = 'subject-tile';
            tile.dataset.subject = subject;
            tile.innerHTML = `<h3>${subject}</h3>`;
            grid.appendChild(tile);
        });
    }

    function renderModules(subject) {
        notesContainer.innerHTML = `
            <div class="breadcrumb"><span class="back-btn" data-target="subjects">&larr; Subjects</span> / ${subject}</div>
            <div class="module-list"></div>
        `;
        const list = notesContainer.querySelector('.module-list');
        moduleNames.forEach(moduleName => {
            const moduleItem = document.createElement('div');
            moduleItem.className = 'module-item';
            moduleItem.dataset.subject = subject;
            moduleItem.dataset.module = moduleName;
            const hasFile = studyMaterials[subject] && studyMaterials[subject][moduleName];
            moduleItem.innerHTML = `
                <span>${moduleName}</span>
                <span style="color: ${hasFile ? '#10b981' : '#64748b'}; font-weight: ${hasFile ? 'bold' : 'normal'};">${hasFile ? 'Available' : 'No File'}</span>
            `;
            list.appendChild(moduleItem);
        });
    }

    function renderFile(subject, module) {
        const file = studyMaterials[subject][module];
        notesContainer.innerHTML = `
            <div class="breadcrumb">
                <span class="back-btn" data-target="subjects">&larr; Subjects</span> / 
                <span class="back-btn" data-target="modules" data-subject="${subject}">${subject}</span> / 
                ${module}
            </div>
            <div class="file-view">
                <h3>${file.filename}</h3>
                <p>${(file.size / 1024).toFixed(2)} KB</p>
                <a href="${SERVER_URL}/files/${encodeURIComponent(file.filename)}" target="_blank" class="btn">Download File</a>
            </div>
        `;
    }

    // --- Navigation ---
    function updateView() {
        if (currentView === 'subjects') renderSubjects();
        else if (currentView === 'modules') renderModules(selectedSubject);
        else if (currentView === 'file') renderFile(selectedSubject, selectedModule);
    }

    notesContainer.addEventListener('click', (e) => {
        const subjectTile = e.target.closest('.subject-tile');
        const moduleItem = e.target.closest('.module-item');
        const backBtn = e.target.closest('.back-btn');

        if (backBtn) {
            const target = backBtn.dataset.target;
            if (target === 'subjects') {
                currentView = 'subjects';
                selectedSubject = null;
                selectedModule = null;
            } else if (target === 'modules') {
                currentView = 'modules';
                selectedModule = null;
            }
            updateView();
        } else if (subjectTile) {
            selectedSubject = subjectTile.dataset.subject;
            currentView = 'modules';
            updateView();
        } else if (moduleItem) {
            selectedModule = moduleItem.dataset.module;
            if (studyMaterials[selectedSubject] && studyMaterials[selectedSubject][selectedModule]) {
                currentView = 'file';
                updateView();
            } else {
                alert('No file available for this module. Please upload one.');
            }
        }
    });

    // --- Data Fetching and Socket Listeners ---
    async function fetchAndDisplayFiles() {
        try {
            const res = await fetch(`${SERVER_URL}/files`);
            studyMaterials = await res.json();
            updateView();
        } catch (e) {
            console.error('Failed to load files', e);
        }
    }
    socket.on('fileUploaded', fetchAndDisplayFiles);
    
    // --- Chat Functions ---
    async function fetchMessages() {
        try {
            const response = await fetch(`${SERVER_URL}/messages`);
            const messages = await response.json();
            chatMessages.innerHTML = '';
            messages.forEach(renderMessage);
        } catch (error) { console.error('Error fetching messages:', error); }
    }
    function renderMessage(doc) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user';
        messageDiv.innerHTML = `<div class="message-bubble"><strong>${doc.username}:</strong> ${doc.text}</div>`;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    function sendMessage() {
        const text = chatInput.value.trim();
        if (text) {
            socket.emit('chatMessage', { text });
            chatInput.value = '';
        }
    }
    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
    socket.on('updateUserCount', (count) => userCountElement.textContent = count);
    socket.on('chatMessage', (message) => renderMessage(message));

    // --- Initial Load ---
    fetchAndDisplayFiles();
    fetchMessages();
});