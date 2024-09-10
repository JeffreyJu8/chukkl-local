const API_BASE_URL = window.location.hostname.includes('localhost')
    ? 'http://localhost:3003'
    : 'https://chukkl.com';


async function checkLoginStatus() {
    console.log('Checking login status...');
    const token = localStorage.getItem('debughoney:core-sdk:*token');
    console.log('Token retrieved from localStorage:', token);
    
    if (!token) {
        console.error('No token found in localStorage');
        // Redirect to the login page
        window.location.href = '/login';
        return; 
    }

    console.log('Token found, proceeding to verify...');

    try {
        const response = await fetch(`${API_BASE_URL}/verify-token`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
    
        console.log('Verify token response status:', response.status);
    
        if (response.ok) {
            const result = await response.json();
            console.log('Token verification successful, user:', result.user);

            // Optionally refresh the token in localStorage if server provides a new token
            if (result.token) {
                localStorage.setItem('debughoney:core-sdk:*token', result.token);
                // console.log('Updated token stored in localStorage:', localStorage.getItem('debughoney:core-sdk:*token'));
            }

            // Update the UI for a logged-in user
            updateUIForLoggedInUser(result.user);

        } else {
            console.error('Token verification failed');
            // Remove token from localStorage and redirect to login
            // localStorage.removeItem('debughoney:core-sdk:*token');
            // window.location.href = '/login';
        }
    } catch (error) {
        console.error('Error verifying token:', error);
        // Remove token from localStorage and redirect to login
        // localStorage.removeItem('debughoney:core-sdk:*token');
        // window.location.href = '/login';
    }
}


function updateUIForLoggedInUser(user) {
    document.getElementById('loginButton').style.display = 'none';
    document.getElementById('registerButton').style.display = 'none';
    document.getElementById('signOutButton').style.display = 'inline-block';
}

function updateUIForLoggedOutUser() {
    document.getElementById('loginButton').style.display = 'inline-block';
    document.getElementById('registerButton').style.display = 'inline-block';
    document.getElementById('signOutButton').style.display = 'none';
}


document.addEventListener('DOMContentLoaded', function() {
    const signOutButton = document.getElementById('signOutButton');
    if (signOutButton) {
        signOutButton.addEventListener('click', async function(event) {
            event.preventDefault();
            localStorage.removeItem('debughoney:core-sdk:*token');
            updateUIForLoggedOutUser();
            window.location.href = `${API_BASE_URL}/login`; 
        });
    }

    checkLoginStatus(); 
});