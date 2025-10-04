document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('seedForm');
    const statusDiv = document.getElementById('status');
    const SERVER_URL = 'http://localhost:3000';

    form.addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent the default form submission

        const formData = new FormData(form);
        const subject = formData.get('subject');
        const module = formData.get('module');
        const file = formData.get('file');

        if (!subject || !module || !file || file.size === 0) {
            statusDiv.textContent = 'Please fill out all fields and select a file.';
            statusDiv.style.color = 'red';
            return;
        }

        statusDiv.textContent = 'Uploading...';
        statusDiv.style.color = 'blue';

        try {
            const response = await fetch(`${SERVER_URL}/upload`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                statusDiv.textContent = 'File uploaded successfully!';
                statusDiv.style.color = 'green';
                form.reset(); // Clear the form
            } else {
                const errorData = await response.json();
                throw new Error(errorData.err || 'Upload failed.');
            }
        } catch (error) {
            statusDiv.textContent = `Error: ${error.message}`;
            statusDiv.style.color = 'red';
        }
    });
});