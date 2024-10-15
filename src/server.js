const { Pool } = require('pg');
const { MongoClient, ServerApiVersion } = require('mongodb');
const moment = require('moment-timezone');
const path = require('path');
const express = require('express');
const compression = require('compression');
const memjs = require('memjs');
const NodeCache = require('node-cache');
const cluster = require('cluster');
const os = require('os');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const formData = require('form-data');
const Mailgun = require('mailgun.js');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
require('dotenv').config({ path: 'src/.env' });

const app = express();
const cors = require('cors');
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.set('view engine', 'ejs');

app.set('views', path.join(__dirname, '../public'));


const PORT = process.env.PORT || 3003;

// PostgreSQL configuration
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

const db = new Pool(dbConfig);

// MongoDB Atlas connection
const mongoUri = process.env.MONGO_URI; 
const mongoClient = new MongoClient(mongoUri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

let mongoDB;

async function connectToMongoDB() {
    try {
        await mongoClient.connect();
        mongoDB = mongoClient.db(process.env.MONGO_DB_NAME);  
        console.log("Connected to MongoDB Atlas.");
    } catch (error) {
        console.error("Failed to connect to MongoDB Atlas:", error);
    }
}

const memcachedClient = memjs.Client.create(process.env.MEMCACHED_SERVERS, {
    username: process.env.MEMCACHED_USERNAME,
    password: process.env.MEMCACHED_PASSWORD,
    timeout: 5000,
});

const localCache = new NodeCache({ stdTTL: 3600 });

async function connectToDatabase() {
    try {
        await db.connect();
        console.log("Connected to the PostgreSQL database.");
    } catch (error) {
        console.error("Failed to connect to the PostgreSQL database:", error);
    }
}

const publicDirectoryPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicDirectoryPath));

// Mailgun configuration
const mailgun = new Mailgun(formData);
const mg = mailgun.client({username: 'api', key: process.env.MAILGUN_API_KEY});
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;

// Function to send email using Mailgun
async function sendEmail(to, subject, text, html) {
    if (process.env.NODE_ENV === 'production') {
        try {
            const msg = await mg.messages.create(MAILGUN_DOMAIN, {
                from: `Chukkl Team <team@chukkl.com>`, 
                to: [to],
                subject: subject,
                text: text,
                html: html
            });
            console.log('Email sent:', msg);
            return msg;
        } catch (error) {
            console.error('Error sending email:', error);
            throw error;
        }
    } else {
        console.log('Email content (DEV MODE):');
        console.log('To:', to);
        console.log('Subject:', subject);
        console.log('Text:', text);
        console.log('HTML:', html);
    }
}

// Function to generate a random token
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Route for registration page
app.get('/register', (req, res) => {
    const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
    res.render('register', { stripePublishableKey });
});


// Route for handling registration
// Route for handling registration
app.post('/register', async (req, res) => {
    const { fullname, email, phone, dob, password } = req.body;

    try {
        // Validate input fields
        if (!fullname || !email || !phone || !dob || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const userCollection = mongoDB.collection('users');
        const existingUser = await userCollection.findOne({ $or: [{ email }, { phone }] });

        if (existingUser) {
            if (existingUser.email === email) {
                return res.status(409).json({ message: 'Email already exists' });
            } else if (existingUser.phone === phone) {
                return res.status(409).json({ message: 'Phone number already exists' });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const emailToken = generateToken();
        const confirmationLink = `https://chukkl.com/confirm-email?token=${emailToken}`;

        const stripeCustomer = await stripe.customers.create({
            email: email,
            name: fullname,
            phone: phone,
        });

        const newUser = {
            fullname: fullname,
            email,
            phone,
            dob: new Date(dob),
            password: hashedPassword,
            emailToken,
            isConfirmed: false,
            createdAt: new Date(),
            stripeCustomerId: stripeCustomer.id,
            paymentStatus: 'pending',
        };

        const result = await userCollection.insertOne(newUser);

        if (!result.acknowledged) {
            throw new Error('Failed to insert user into database');
        }

        // Send confirmation email
        try {
            await sendEmail(
                email,
                'Chukkl: Confirm your Email',
                `Hi ${fullname},\n\nThank you for registering. Please click the link below to confirm your email address:\n\n${confirmationLink}`,
                `<p>Hi ${fullname},</p>
                 <p>Thank you for registering. Please click the link below to confirm your email address:</p>
                 <a href="${confirmationLink}">Confirm Email</a>`
            );

            // Send success response after sending email
            res.status(201).json({ 
                message: 'User registered successfully. Please check your email to confirm your registration.' 
            });

        } catch (emailError) {
            console.error("Error sending confirmation email:", emailError);
            res.status(201).json({ 
                message: 'User registered successfully. Email confirmation is currently unavailable. Please contact support to confirm your account.' 
            });
        }
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});



// Route for email confirmation
app.get('/confirm-email', async (req, res) => {
    const { token } = req.query;

    try {
        const userCollection = mongoDB.collection('users');
        const user = await userCollection.findOne({ emailToken: token });

        if (!user) {
            return res.status(400).json({ message: 'Invalid token' });
        }

        await userCollection.updateOne({ _id: user._id }, { $set: { isConfirmed: true, emailToken: null } });

        res.status(200).json({ message: 'Email confirmed successfully' });
    } catch (error) {
        console.error("Error confirming email:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


app.get('/payment-intent', (req, res) => {
    const { email } = req.query;
    const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

    res.render('payment-intent', { 
        stripePublishableKey, 
        userEmail: email 
    });
});


// Route for creating a Stripe Checkout session
app.post('/create-checkout-session', async (req, res) => {
    const { email } = req.body;

    try {
        console.log('Received email:', email);  // Log the received email

        // Create or retrieve Stripe customer
        let customer = await stripe.customers.list({ email });
        console.log('Customer list response:', customer);  // Log customer response

        if (customer.data.length === 0) {
            customer = await stripe.customers.create({ email });
            console.log('New customer created:', customer);  // Log new customer creation
        } else {
            customer = customer.data[0];
            console.log('Existing customer found:', customer);  // Log existing customer
        }

        // Log before creating the session
        console.log('Creating checkout session for customer:', customer.id);

        // Create a new Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',  // Or 'subscription' depending on your use case
            customer: customer.id,
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'Your Product or Service',
                    },
                    unit_amount: 1000,  // Amount in cents ($10.00 in this example)
                },
                quantity: 1,
            }],
            success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.origin}/cancel`,
        });

        console.log('Checkout session created successfully:', session);  // Log session creation success
        res.json({ sessionId: session.id });

    } catch (error) {
        console.error('Error creating checkout session:', error);  // Log the error
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});


// Route to handle Stripe webhook
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];

    let event;
    try {
        // Stripe needs the raw body, not parsed JSON
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.log(`⚠️  Webhook signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            
            // Log the session details for debugging
            console.log(`Received checkout.session.completed event for session: ${session.id}`);
            console.log(`Customer Stripe ID: ${session.customer}`);
            console.log(`Session details:`, session);

            try {
                // Check if the customer exists in the database
                const user = await mongoDB.collection('users').findOne({ stripeCustomerId: session.customer });
                if (!user) {
                    console.error(`No user found with stripeCustomerId: ${session.customer}`);
                } else {
                    console.log(`User found: ${user.fullname} (${user.email})`);
                    
                    // Update user payment status in MongoDB
                    const result = await mongoDB.collection('users').updateOne(
                        { stripeCustomerId: session.customer },
                        { 
                            $set: { 
                                paymentStatus: 'paid', 
                                paymentDetails: {
                                    sessionId: session.id,
                                    amount: session.amount_total,
                                    currency: session.currency,
                                    paymentMethodTypes: session.payment_method_types,
                                    paymentStatus: session.payment_status
                                }
                            }
                        }
                    );
                    
                    // Log the result of the update
                    if (result.modifiedCount > 0) {
                        console.log(`Successfully updated payment status to 'paid' for user ${user.fullname} (${user.email})`);
                    } else {
                        console.error(`Failed to update payment status for user ${user.fullname} (${user.email})`);
                    }
                }
            } catch (updateError) {
                console.error('Error updating payment status in MongoDB:', updateError);
            }
            break;

        default:
            console.log(`Unhandled event type: ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.status(200).json({ received: true });
});



app.get('/success', (req, res) => {
    res.sendFile(path.join(publicDirectoryPath, 'success.html'));
});

app.get('/cancel', (req, res) => {
    res.sendFile(path.join(publicDirectoryPath, 'cancel.html'));
});


app.get('/payment', (req, res) => {
    const email = req.query.email || req.body.email || ''; 
    const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

    if (!email) {
        return res.render('payment-email-form', { stripePublishableKey });
    }

    res.render('payment', { 
        stripePublishableKey, 
        userEmail: email 
    });
});


app.post('/payment', (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).send('Email is required to process payment.');
    }

    // Redirect to the payment page with the email as a query param
    res.redirect(`/payment?email=${encodeURIComponent(email)}`);
});

// Route to check user email
app.post('/check-email', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    try {
        const userCollection = mongoDB.collection('users');
        const user = await userCollection.findOne({ email });

        // If user does not exist
        if (!user) {
            return res.status(401).json({ message: 'Invalid email' });
        }

        // If user has not confirmed their email
        if (!user.isConfirmed) {
            return res.status(403).json({ message: 'Please confirm your email to proceed to payment' });
        }

        // If user exists and has confirmed their email, return success
        return res.status(200).json({ message: 'Email found and confirmed', exists: true });
    } catch (error) {
        console.error('Error checking email:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


// Route for subcription creation
app.post('/create-stripe-customer', async (req, res) => {
    const { email } = req.body;

    try {
        // Step 1: Check MongoDB if the user exists and has a stripeCustomerId
        const user = await mongoDB.collection('users').findOne({ email });

        let stripeCustomerId;

        if (user) {
            // Step 2: If user exists, check if they already have a stripeCustomerId
            if (user.stripeCustomerId) {
                stripeCustomerId = user.stripeCustomerId;
                console.log(`Found existing Stripe customer ID: ${stripeCustomerId} for user ${user.fullname}`);
            } else {
                // Step 3: If no stripeCustomerId exists, create a new customer in Stripe
                const customer = await stripe.customers.create({
                    email: email,
                });

                stripeCustomerId = customer.id;
                console.log(`Created new Stripe customer ID: ${stripeCustomerId} for user ${user.fullname}`);

                // Step 4: Update MongoDB with the new stripeCustomerId
                await mongoDB.collection('users').updateOne(
                    { _id: user._id },
                    { $set: { stripeCustomerId: stripeCustomerId } }
                );
            }
        } else {
            return res.status(404).json({ error: 'User not found in the database' });
        }

        // Step 5: Return the Stripe payment link
        const stripePaymentLink = 'https://buy.stripe.com/bIY6ox7lvc9petO3cc'; 
        res.json({ stripePaymentLink, stripeCustomerId });
    } catch (error) {
        console.error('Error creating customer or retrieving payment link:', error);
        res.status(500).json({ error: 'Failed to create customer or retrieve payment link' });
    }
});


// Route for login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(publicDirectoryPath, 'login.html'));
});

// Login route to issue JWT token
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const userCollection = mongoDB.collection('users');
        const user = await userCollection.findOne({ email });

        if (!user) {
            return res.status(401).json({ message: 'Invalid email' });
        }

        if (!user.isConfirmed) {
            return res.status(403).json({ message: 'Please confirm your email to log in' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, email: user.email }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }
        );

        // Debugging: Check if token is generated
        console.log('Generated token:', token);

        // Send token in response
        res.status(200).json({ message: 'Login successful', token });
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
      next();
    } else {
      res.status(401).json({ message: 'Not authenticated' });
    }
};


// Use the middleware in a route
app.get('/protected-route', isAuthenticated, (req, res) => {
    res.send(`Hello, ${req.session.user.fullname}`);
});

// Route for checking if the user is logged in
app.get('/api/user', (req, res) => {
    if (req.session && req.session.user) {
        res.json({
            isLoggedIn: true,
            user: req.session.user
        });
    } else {
        res.status(401).json({ message: 'Not authenticated' });
    }
});


// Route to verify token
app.post('/verify-token', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Extract the token from the "Bearer" header

    if (!token) {
        return res.sendStatus(401); // No token provided
    }

    // Verify the token
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.sendStatus(403); // Invalid token
        }

        res.json({ user }); // Send user details back if the token is valid
    });
});


// POST request for signout
app.post('/signout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Could not log out, please try again' });
      }
      res.clearCookie('connect.sid'); // Clear the session cookie
      return res.json({ message: 'Logout successful' });
    });
});


app.post('/check-registration', async (req, res) => {
    const { email, phone } = req.body;

    try {
        const userCollection = mongoDB.collection('users');

        const emailExists = await userCollection.findOne({ email });
        if (emailExists) {
            return res.status(409).json({ exists: true, message: 'Email already registered' });
        }

        const phoneExists = await userCollection.findOne({ phone });
        if (phoneExists) {
            return res.status(409).json({ exists: true, message: 'Phone number already registered' });
        }

        res.status(200).json({ exists: false, message: 'Email and phone are available' });
    } catch (error) {
        console.error("Error checking registration:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Route for forgot password
app.get('/forgot-password', (req, res) => {
    res.sendFile(path.join(publicDirectoryPath, 'forgot-password.html'));
});

// Route for post request of forgot password
app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        const userCollection = mongoDB.collection('users');
        const user = await userCollection.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'No user found with that email address. Please register first.' });
        }

        const resetToken = generateToken();
        const resetTokenExpiry = Date.now() + 3600000; // 1 hour

        await userCollection.updateOne(
            { _id: user._id },
            { $set: { resetPasswordToken: resetToken, resetPasswordExpires: resetTokenExpiry } }
        );

        const resetLink = `http://chukkl.com/reset-password?token=${resetToken}`;
        // const resetLink = `/reset-password?token=${resetToken}`;

        try {
            await sendEmail(
                email,
                'Chukkl: Reset Your Password',
                `Hi ${user.fullname},\n\nYou requested to reset your password. Please click the link below to reset it:\n\n${resetLink}`,
                `<p>Hi ${user.fullname},</p>
                 <p>You requested to reset your password. Please click the link below to reset it:</p>
                 <a href="${resetLink}">Reset Password</a>`
            );
            res.status(200).json({ message: 'Password reset link sent to your email address' });
        } catch (emailError) {
            console.error("Error sending password reset email:", emailError);
            res.status(500).json({ message: 'Failed to send password reset email. Please try again later.' });
        }
    } catch (error) {
        console.error("Error handling forgot password request:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Route for password reset
app.get('/reset-password', (req, res) => {
    const { token } = req.query;
    if (!token) {
        return res.status(400).send('Invalid or expired token');
    }
    res.sendFile(path.join(publicDirectoryPath, 'reset-password.html'));
});


// Route to handle password reset
app.post('/reset-password', async (req, res) => {
    const { token, password, confirmPassword } = req.body;
    console.log('Token received:', token);

    if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match' });
    }

    try {
        const userCollection = mongoDB.collection('users');
        const user = await userCollection.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() } // Ensure token hasn't expired
        });

        if (!user) {
        console.error('Invalid or expired token.');
        return res.status(400).json({ message: 'Invalid or expired token' });
        }

        console.log('Token is valid. Proceeding with password reset.');
        const hashedPassword = await bcrypt.hash(password, 10);
        await userCollection.updateOne(
        { _id: user._id },
        { $set: { password: hashedPassword, resetPasswordToken: null, resetPasswordExpires: null } }
        );

        res.status(200).json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error("Error handling password reset:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


// POST endpoint for signing out
app.post('/signout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: 'Sign out failed' });
        }
        res.status(200).json({ message: 'Sign out successful' });
    });
});



// Route for about page
app.get('/about', (req, res) => {
    res.sendFile(path.join(publicDirectoryPath, 'about_us.html'));
});

// Route for "/kids"
// app.get('/kids', (req, res) => {
//     res.sendFile(path.join(publicDirectoryPath, 'index_kids.html'));
// });

// Route for "/kids/about"
// app.get('/kids/about', (req, res) => {
//     res.sendFile(path.join(publicDirectoryPath, 'about_us_kids.html'));
// });

// Route for "/on-demand"
app.get('/on-demand', (req, res) => {
    res.sendFile(path.join(publicDirectoryPath, 'on_demand.html'));
});

// Route for Ivan the Inspector
app.get('/ivan-the-inspector', (req, res) => {
    res.sendFile(path.join(publicDirectoryPath, 'ivan_the_inspector.html'));
});

// Route for Art with Ashley
app.get('/art-with-ashley', (req, res) => {
    res.sendFile(path.join(publicDirectoryPath, 'art_with_ashley.html'));
});

// Route for Miss Linky
app.get('/miss-linky', (req, res) => {
    res.sendFile(path.join(publicDirectoryPath, 'miss_linky.html'));
});

// Route for GoGarbage
app.get('/go-garbage', (req, res) => {
    res.sendFile(path.join(publicDirectoryPath, 'gogarbage.html'));
});

// Route for Cowboy Jack
app.get('/cowboy-jack', (req, res) => {
    res.sendFile(path.join(publicDirectoryPath, 'cowboyjack.html'));
});


async function fetchChannelsFromDatabase() {
    const query = `SELECT c.channel_id, c.name, c.maturity_rating, c.bio FROM Channels c`;
    try {
        const client = await db.connect();
        const { rows } = await client.query(query);
        client.release();
        return rows;
    } catch (error) {
        console.error("Error fetching channels from database:", error);
        return [];
    }
}

async function fetchChannelsForDay(dayOfWeek) {
    const query = `
        SELECT DISTINCT ch.channel_id, ch.name, ch.tags, ch.bio, ch.maturity_rating
        FROM Channels ch
        JOIN Schedules s ON ch.channel_id = s.channel_id
        WHERE s.Days = $1
        ORDER BY ch.channel_id`;
    try {
        const client = await db.connect();
        const { rows } = await client.query(query, [dayOfWeek]);
        client.release();
        return rows;
    } catch (error) {
        console.error("Error fetching channels for day:", error);
        return [];
    }
}

async function fetchChannelDetailsWhenMiss(channelId) {
    const query = `SELECT c.channel_id, c.name, c.maturity_rating, c.bio FROM Channels c WHERE c.channel_id = $1`;
    try {
        const client = await db.connect();
        const { rows } = await client.query(query, [channelId]);
        client.release();
        return rows[0];
    } catch (error) {
        console.error("Error fetching channel details:", error);
        return null;
    }
}

async function fetchAllVideoDetailsFromDatabase() {
    const query = `SELECT * FROM Videos`;
    try {
        const client = await db.connect();
        const { rows } = await client.query(query);
        client.release();
        return rows;
    } catch (error) {
        console.error("Error fetching video details from database:", error);
        return [];
    }
}

async function fetchScheduleDetailsForChannelAndDay(channelId, dayOfWeek) {
    const query = `
        SELECT s.schedule_id, s.video_id, v.title, v.description, s.start_time, s.end_time, s.channel_id
        FROM Schedules s
        JOIN Videos v ON s.video_id = v.video_id
        WHERE s.channel_id = $1 AND s.Days = $2
        ORDER BY s.start_time`;
    try {
        const client = await db.connect();
        const { rows } = await client.query(query, [channelId, dayOfWeek]);
        client.release();
        return rows;
    } catch (error) {
        console.error("Error fetching schedule details for channel:", error);
        return [];
    }
}


// app.get('/channels/dayoftheweek/:day', async (req, res) => {
//     const dayOfWeek = req.params.day;
//     const cacheKey = `channels_day_${dayOfWeek}`;

//     try {
//         let channelsData = localCache.get(cacheKey);
//         if (!channelsData) {
//             channelsData = await memcachedClient.get(cacheKey);

//             if (channelsData && channelsData.value) {
//                 channelsData = JSON.parse(channelsData.value.toString());
//                 localCache.set(cacheKey, channelsData);
//             } else {
//                 console.log(`Cache miss for channels on ${dayOfWeek}`);
//                 channelsData = await fetchChannelsForDay(dayOfWeek);
//                 await memcachedClient.set(cacheKey, JSON.stringify(channelsData), { expires: 3600 });
//                 localCache.set(cacheKey, channelsData);
//             }
//         }

//         res.json(channelsData);
//     } catch (error) {
//         console.error("Error fetching channels for the day from cache:", error);
//         res.status(500).send('Internal Server Error');
//     }
// });


app.get('/channels/dayoftheweek/:day', async (req, res) => {
    const dayOfWeek = req.params.day;

    try {
        // Log the request
        console.log(`Request received for channels on day: ${dayOfWeek}`);

        // Fetch channels directly from the database
        const channelsData = await fetchChannelsForDay(dayOfWeek);

        // Log the fetched data for debugging
        console.log("Fetched channels data from database:", channelsData);

        // Check if data exists, otherwise return 404
        if (!channelsData || channelsData.length === 0) {
            return res.status(404).json({ message: 'No channels found for this day' });
        }

        // Return data to the frontend
        res.json(channelsData);

    } catch (error) {
        console.error("Error fetching channels from database:", error);
        res.status(500).send('Internal Server Error');
    }
});



app.get('/channel/:id', async (req, res) => {
    const channelId = req.params.id;
    const cacheKey = `channel_${channelId}`;

    try {
        let channelDetails = localCache.get(cacheKey);
        if (!channelDetails) {
            channelDetails = await memcachedClient.get(cacheKey);
            if (channelDetails && channelDetails.value) {
                channelDetails = JSON.parse(channelDetails.value.toString());
                localCache.set(cacheKey, channelDetails);
            } else {
                channelDetails = await fetchChannelDetailsWhenMiss(channelId);
                await memcachedClient.set(cacheKey, JSON.stringify(channelDetails), { expires: 3600 });
                localCache.set(cacheKey, channelDetails);
            }
        }

        res.json(channelDetails);
    } catch (error) {
        console.error("Error fetching channel details:", error);
        res.status(500).send('Internal Server Error');
    }
});


app.get('/channels', async (req, res) => {
    const cacheKey = 'all_channels';

    try {
        let channels = localCache.get(cacheKey);
        if (!channels) {
            channels = await memcachedClient.get(cacheKey);

            if (channels && channels.value) {
                channels = JSON.parse(channels.value.toString());
                localCache.set(cacheKey, channels);
            } else {
                console.log('Cache miss for all_channels');
                channels = await fetchChannelsFromDatabase();
                await memcachedClient.set(cacheKey, JSON.stringify(channels), { expires: 3600 });
                localCache.set(cacheKey, channels);
            }
        }

        res.json(channels);
    } catch (error) {
        console.error("Error fetching channels:", error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/videos', async (req, res) => {
    const { channelId, timezone } = req.body;
    const currentTimeMoment = moment().tz(timezone);
    const currentTime = currentTimeMoment.format('HH:mm:ss');
    const dayOfWeek = currentTimeMoment.format('dddd');

    try {
        let videoId = await getCurrentVideoIdFromCache(channelId, currentTimeMoment, timezone, dayOfWeek);
        if (!videoId) {
            console.log(`Cache miss for video on channel ${channelId} at ${currentTime}`);
            const videos = await fetchVideoDetailsFromDatabase(channelId, currentTime);
            videoId = videos.length > 0 ? videos[0].video_id : null;
        }

        if (!videoId) {
            return res.status(404).json({ message: 'No video is scheduled to play at this time.' });
        }

        const cacheKey = `video_details_${videoId}`;
        let videoDetails = localCache.get(cacheKey);
        if (!videoDetails) {
            videoDetails = await memcachedClient.get(cacheKey);
            if (videoDetails && videoDetails.value) {
                videoDetails = JSON.parse(videoDetails.value.toString());
                localCache.set(cacheKey, videoDetails);
            } else {
                const videos = await fetchVideoDetailsFromDatabase(channelId, currentTime);
                videoDetails = videos[0];
                await memcachedClient.set(cacheKey, JSON.stringify(videoDetails), { expires: 3600 });
                localCache.set(cacheKey, videoDetails);
            }
        }

        const scheduleTimes = await fetchScheduleTimesForVideo(videoId, channelId, currentTimeMoment);

        res.json(formatVideoResponse(videoDetails, scheduleTimes));
    } catch (error) {
        console.error("Error fetching videos:", error);
        res.status(500).send('Internal Server Error');
    }
});

async function fetchVideoDetailsFromDatabase(channelId, currentTime) {
    const query = `
        SELECT v.url, v.people, v.video_id, v.channel_id, s.start_time, s.end_time 
        FROM Schedules s
        JOIN Videos v ON s.video_id = v.video_id
        WHERE s.channel_id = $1
        AND $2 BETWEEN s.start_time AND s.end_time
        ORDER BY s.start_time`;

    try {
        const client = await db.connect();
        const { rows } = await client.query(query, [channelId, currentTime]);
        client.release();
        return rows;
    } catch (error) {
        console.error("Error fetching video details from database:", error);
        return [];
    }
}

async function getCurrentVideoIdFromCache(channelId, currentTime, userTimeZone, dayOfWeek) {
    const scheduleKey = `schedule_channel_${channelId}_${dayOfWeek}`;
    let scheduleData = localCache.get(scheduleKey);
    if (!scheduleData) {
        scheduleData = await memcachedClient.get(scheduleKey);

        if (scheduleData && scheduleData.value) {
            scheduleData = JSON.parse(scheduleData.value.toString());
            localCache.set(scheduleKey, scheduleData);
        } else {
            return null;
        }
    }

    const currentVideo = scheduleData.find(entry => {
        const startTime = moment.tz(entry.start_time, "HH:mm:ss", userTimeZone);
        const endTime = moment.tz(entry.end_time, "HH:mm:ss", userTimeZone);

        const currentTimeOnly = moment(currentTime.format("HH:mm:ss"), "HH:mm:ss");
        const startTimeOnly = moment(startTime.format("HH:mm:ss"), "HH:mm:ss");
        const endTimeOnly = moment(endTime.format("HH:mm:ss"), "HH:mm:ss");

        return currentTimeOnly.isBetween(startTimeOnly, endTimeOnly, null, '[]');
    });

    return currentVideo ? currentVideo.video_id : null;
}

function formatVideoResponse(video, scheduleTimes) {
    const urlParts = video.url.split('?');
    const baseUrl = urlParts[0];
    const queryParams = new URLSearchParams(urlParts[1]);
    const autoPlayUrl = `${baseUrl}?${queryParams.toString()}`;

    return {
        videoID: video.video_id,
        embedUrl: autoPlayUrl,
        endTime: scheduleTimes ? scheduleTimes.end_time : video.end_time,
        startTime: scheduleTimes ? scheduleTimes.start_time : video.start_time,
        vChannelId: video.channel_id,
        category: video.category_id,
        video_cast: video.people
    };
}

async function fetchScheduleTimesForVideo(videoId, channelId, currentTime) {
    const dayOfWeek = moment(currentTime).format('dddd');
    const scheduleKey = `schedule_channel_${channelId}_${dayOfWeek}`;
    let scheduleData = localCache.get(scheduleKey);
    if (!scheduleData) {
        scheduleData = await memcachedClient.get(scheduleKey);

        if (scheduleData && scheduleData.value) {
            scheduleData = JSON.parse(scheduleData.value.toString());
            localCache.set(scheduleKey, scheduleData);
        } else {
            return null;
        }
    }

    for (const schedule of scheduleData) {
        if (schedule.video_id === videoId) {
            let startTime = moment.tz(schedule.start_time, "HH:mm:ss", currentTime.tz());
            let endTime = moment.tz(schedule.end_time, "HH:mm:ss", currentTime.tz());

            startTime = startTime.set({
                year: currentTime.year(),
                month: currentTime.month(),
                date: currentTime.date()
            });

            endTime = endTime.set({
                year: currentTime.year(),
                month: currentTime.month(),
                date: currentTime.date()
            });

            if (currentTime.isBetween(startTime, endTime, null, '[]')) {
                return {
                    start_time: schedule.start_time,
                    end_time: schedule.end_time
                };
            }
        }
    }
    return null;
}

app.get('/schedules', async (req, res) => {
    const { channelId, dayOfWeek } = req.query;

    if (!channelId || !dayOfWeek) {
        return res.status(400).json({ error: 'Channel ID and day of week are required' });
    }

    const cacheKey = `schedule_channel_${channelId}_${dayOfWeek}`;

    try {
        let scheduleData = localCache.get(cacheKey);
        if (!scheduleData) {
            scheduleData = await memcachedClient.get(cacheKey);

            if (scheduleData && scheduleData.value) {
                scheduleData = JSON.parse(scheduleData.value.toString());
                localCache.set(cacheKey, scheduleData);
            } else {
                console.log("schedule miss");
                scheduleData = await fetchScheduleDetailsForChannelAndDay(channelId, dayOfWeek);
                await memcachedClient.set(cacheKey, JSON.stringify(scheduleData), { expires: 3600 });
                localCache.set(cacheKey, scheduleData);
            }
        }

        res.json(scheduleData);
    } catch (error) {
        console.error("Error fetching schedule:", error);
        res.status(500).send('Internal Server Error');
    }
});


app.use(express.static(path.join(__dirname, '../public')));


async function startServer() {
    await connectToDatabase();  
    await connectToMongoDB();   
    const server = app.listen(PORT, () => {
        console.log(`Server started on http://localhost:${PORT}`);
    });
    server.maxConnections = 10000;
    server.timeout = 120000;
}

if (cluster.isMaster) {
    const numCPUs = os.cpus().length;
    console.log(`Master ${process.pid} is running`);

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died`);
        cluster.fork();
    });
} else {
    startServer();
}

process.on('SIGINT', async () => {
    console.log('Shutting down server...');
    if (db) {
        await db.end();
    }
    if (mongoClient) {
        await mongoClient.close();
    }
    process.exit(0);
});