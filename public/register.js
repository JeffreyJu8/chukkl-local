document.getElementById('registrationForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const messageElement = document.getElementById('message');

    // Check if passwords match
    if (password !== confirmPassword) {
        messageElement.innerText = "Passwords do not match!";
        return;
    }

    const response = await fetch('/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, phone, password })
    });

    const result = await response.json();

    if (response.status === 201) {
        // Redirect to the home page after successful registration
        window.location.href = '/';
    } else {
        messageElement.innerText = `Registration failed: ${result.message}`;
    }
});
