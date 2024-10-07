const API_BASE_URL = window.location.hostname.includes('localhost')
? 'http://localhost:3003'
: 'https://chukkl.com';

document.getElementById('emailForm').addEventListener('submit', async function(event) {
    event.preventDefault(); // Prevent the form from submitting immediately
    const email = document.getElementById('email').value;
    const errorMessage = document.getElementById('errorMessage');

    if (email) {
        try {
            // Check if the email exists in the database and is confirmed
            const response = await fetch(`${API_BASE_URL}/check-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const result = await response.json();

            // Check if the response is OK and the email exists and is confirmed
            if (response.ok && result.exists) {
                // Save the email in localStorage if it exists and is confirmed
                localStorage.setItem('loggedInUserEmail', email);
                console.log('Email exists and is confirmed:', email);

                // Submit the form programmatically since the check was successful
                event.target.submit();
            } else {
                // Display the error message from the backend if email is not found or not confirmed
                errorMessage.textContent = result.message || 'Email is not valid or not confirmed';
                console.log('Email not found or not confirmed:', result.message);
            }
        } catch (error) {
            console.error('Error checking email:', error);
            errorMessage.textContent = 'An error occurred. Please try again later.';
        }
    } else {
        // Show an error if no email is entered in the form
        errorMessage.textContent = 'Please enter a valid email address.';
    }
});
