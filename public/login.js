const API_BASE_URL = window.location.hostname.includes('localhost')
    ? 'http://localhost:3003'
    : 'https://chukkl.com';


document.getElementById('loginForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const messageElement = document.getElementById('message');

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        // Debug: Log the entire response to see if the token is included
        console.log('Full login response:', result);

        if (response.ok) {
            // Check the token received from the server
            console.log('Received token:', result.token);

            if (result.token) {
                // Save the JWT token in localStorage
                localStorage.setItem('debughoney:core-sdk:*token', result.token);
                console.log('Stored token:', localStorage.getItem('debughoney:core-sdk:*token'));
                messageElement.innerText = 'Login successful';
                window.location.href = `${API_BASE_URL}/kids`;
            } else {
                console.error('No token found in the result');
            }
        } else {
            messageElement.innerText = `Login failed: ${result.message}`;
        }
    } catch (error) {
        console.error('Error during login:', error);
        messageElement.innerText = 'An error occurred during login';
    }
});