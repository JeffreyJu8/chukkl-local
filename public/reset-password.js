document.addEventListener('DOMContentLoaded', function() {
    console.log("DOMContentLoaded event fired.");
    
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    console.log("Reset password form:", resetPasswordForm);
    
    const messageElement = document.createElement('p');
    messageElement.style.color = 'red';
    resetPasswordForm.appendChild(messageElement);

    // Extract the token from the URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    console.log("Extracted token from URL:", token);

    // Check if the token exists in the URL
    if (token) {
        // Set the token value in the hidden input field
        const tokenInput = document.querySelector('input[name="token"]');
        tokenInput.value = token;
        console.log("Token set in hidden input field:", tokenInput.value);
    } else {
        // If no token is found, display an error message and disable the form
        messageElement.textContent = "Invalid or expired token.";
        resetPasswordForm.querySelector('button[type="submit"]').disabled = true;
        console.log("No token found in URL. Form disabled.");
        return;
    }

    resetPasswordForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        console.log("Form submission intercepted.");

        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        console.log("Password:", password);
        console.log("Confirm Password:", confirmPassword);

        // Basic password validation
        if (password !== confirmPassword) {
            messageElement.textContent = "Passwords do not match!";
            console.log("Passwords do not match.");
            return;
        }

        try {
            console.log("Sending request to server with token:", token);
            const response = await fetch('/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token, password, confirmPassword })
            });

            const result = await response.json();
            console.log("Response from server:", result);

            if (response.ok) {
                // Display success message and possibly redirect to login page
                messageElement.style.color = 'green';
                messageElement.textContent = "Password reset successfully. Redirecting to login...";
                console.log("Password reset successful. Redirecting to login...");
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            } else {
                // Display error message returned from the server
                messageElement.style.color = 'red';
                messageElement.textContent = result.message || "An error occurred. Please try again.";
                console.log("Error from server:", result.message || "An error occurred.");
            }
        } catch (error) {
            console.error("Error during fetch:", error);
            messageElement.style.color = 'red';
            messageElement.textContent = "An unexpected error occurred. Please try again later.";
        }
    });
});
