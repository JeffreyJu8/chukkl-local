const API_BASE_URL = window.location.hostname.includes('localhost')
    ? 'http://localhost:3003'
    : 'https://chukkl-heroku-839b30d27713.herokuapp.com';


document.getElementById('loginForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const messageElement = document.getElementById('message');

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        // if (response.ok) {
        //     messageElement.innerText = 'Login successful';
        //     // Redirect to the main page after successful login
        //     window.location.href = `${API_BASE_URL}/kids`;
        // } else {
        //     messageElement.innerText = `Login failed: ${result.message}`;
        // }
    } catch (error) {
        console.error('Error during login:', error);
        messageElement.innerText = 'An error occurred during login';
    }
});