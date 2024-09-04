document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('registrationForm').addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const fullname = document.getElementById('fullname').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const dob = new Date(document.getElementById('dob').value);
        const ageCheck = document.getElementById('ageCheck').checked;
        const termsCheck = document.getElementById('termsCheck').checked;
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        const messageElement = document.getElementById('message');
        const errorMessageElement = document.getElementById('errorMessage');

        if (!errorMessageElement) {
            console.error('Error: #errorMessage element not found.');
            return;
        }

        // Calculate age
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
            age--;
        }

        // Validate age, age checkbox, and terms checkbox
        if (age < 18 || !ageCheck) {
            errorMessageElement.textContent = "You must be 18 years or older to register.";
            return;
        } else if (!termsCheck) {
            errorMessageElement.textContent = "You must agree to the Terms of Use and Privacy Policy.";
            return;
        } else {
            errorMessageElement.textContent = "";
        }

        // Check if passwords match
        if (password !== confirmPassword) {
            messageElement.innerText = "Passwords do not match!";
            return;
        }

        try {
            // Check if email or phone is already registered
            const checkResponse = await fetch('/check-registration', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, phone })
            });

            if (!checkResponse.ok) {
                throw new Error(`Error checking registration: ${checkResponse.statusText}`);
            }

            const checkResult = await checkResponse.json();

            if (checkResult.exists) {
                messageElement.innerText = "This email or phone number is already registered!";
                return;
            }

            // Proceed with registration if all checks pass
            const response = await fetch('/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fullname, email, phone, dob, password })
            });

            if (!response.ok) {
                throw new Error(`Registration failed: ${response.statusText}`);
            }

            const result = await response.json();

            if (response.status === 201) {
                // Redirect to the home page after successful registration
                window.location.href = '/';
            } else {
                messageElement.innerText = `Registration failed: ${result.message}`;
            }

        } catch (error) {
            console.error("Error:", error);
            messageElement.innerText = error.message || "An unexpected error occurred.";
        }
    });
});
