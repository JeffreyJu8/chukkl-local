document.addEventListener('DOMContentLoaded', function() {
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    const messageElement = document.createElement('p');
    messageElement.style.color = 'red';
    resetPasswordForm.appendChild(messageElement);

    resetPasswordForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const token = document.querySelector('input[name="token"]').value;

        // Basic password validation
        if (password !== confirmPassword) {
            messageElement.textContent = "Passwords do not match!";
            return;
        }

        try {
            const response = await fetch('/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token, password, confirmPassword })
            });

            const result = await response.json();

            if (response.ok) {
                // Display success message and possibly redirect to login page
                messageElement.style.color = 'green';
                messageElement.textContent = "Password reset successfully. Redirecting to login...";
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            } else {
                // Display error message returned from the server
                messageElement.style.color = 'red';
                messageElement.textContent = result.message || "An error occurred. Please try again.";
            }
        } catch (error) {
            console.error("Error:", error);
            messageElement.style.color = 'red';
            messageElement.textContent = "An unexpected error occurred. Please try again later.";
        }
    });
});
