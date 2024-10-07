document.getElementById('checkout-button').addEventListener('click', async () => {
    let email = localStorage.getItem('loggedInUserEmail') || '<%= userEmail %>';
    
    if (!email) {
        alert('No email found. Please enter your email to proceed.');
        window.location.href = '/payment';  // Redirect to email input form
        return;
    }

    try {
        // Call your backend to associate stripeCustomerId with the user and get Stripe payment link
        const response = await fetch('/create-stripe-customer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,  // Use email from localStorage or backend
            }),
        });

        const result = await response.json();

        if (response.ok && result.stripePaymentLink) {
            // Redirect to the Stripe Payment Link
            window.location.href = result.stripePaymentLink;
        } else {
            console.error('Error creating customer or getting payment link.', result.error);
            alert('Failed to create customer or retrieve payment link. Please try again.');
        }
    } catch (err) {
        console.error('Error:', err);
        alert('An unexpected error occurred. Please try again.');
    }
});
