document.addEventListener('DOMContentLoaded', function() {
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const messageElement = document.getElementById('message');
    const errorMessageElement = document.getElementById('errorMessage');

    forgotPasswordForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const email = document.getElementById('email').value;

        // Basic email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            errorMessageElement.textContent = "Please enter a valid email address.";
            return;
        }

        try {
            // Send the email to the server to initiate the reset process
            const response = await fetch('/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const result = await response.json();

            if (response.ok) {
                // Display success message
                messageElement.textContent = result.message;
                errorMessageElement.textContent = '';
            } else {
                // Display error message returned from the server
                errorMessageElement.textContent = result.message || "An error occurred. Please try again.";
                messageElement.textContent = '';
            }
        } catch (error) {
            console.error("Error:", error);
            errorMessageElement.textContent = "An unexpected error occurred. Please try again later.";
            messageElement.textContent = '';
        }
    });
});
