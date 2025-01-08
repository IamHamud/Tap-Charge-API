const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');

const app = express();

// Middleware to handle CORS and serve static files
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Route to serve the main HTML page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route to handle charge creation
app.post('/create-charge', async (req, res) => {
    const { amount, currency, description } = req.body;

    if (!amount || !currency || !description) {
        return res.status(400).json({ error: 'Missing required fields: amount, currency, or description.' });
    }

    try {
        const chargeData = {
            amount,
            currency,
            customer_initiated: true,
            threeDSecure: true,
            save_card: true,
            description,
            customer: {
                first_name: 'John',
                last_name: 'Doe',
                email: 'john.doe@example.com',
                phone: { country_code: '1', number: '1234567890' },
            },
            source: { id: 'src_card' }, // Default to Visa/MasterCard; modify for specific sources
            redirect: {
                url: `http://localhost:3000/checkout.html?name=${encodeURIComponent(description)}&price=${amount}&currency=${currency}`,
            },
            post: {
                url: 'http://localhost:3000/callback',
            },
        };

        const response = await axios.post('https://api.tap.company/v2/charges', chargeData, {
            headers: {
                Authorization: 'Bearer sk_test_Dfi4SjpRrcPhYE3nXv0bkKyl', // Ensure you are using the correct test API key
                'Content-Type': 'application/json',
            },
        });

        res.status(200).json(response.data);
    } catch (error) {
        console.error('Error creating charge:', error.response?.data || error.message);
        res.status(500).json({ error: error.response?.data || error.message });
    }
});

// Callback route to handle transaction status from Tap webhooks
app.post('/callback', (req, res) => {
    const event = req.body;

    try {
        console.log('Webhook Received:', JSON.stringify(event, null, 2));

        if (event.object === 'charge') {
            if (event.status === 'CAPTURED') {
                console.log(`Payment Successful for Charge ID: ${event.id}`);
            } else if (event.status === 'FAILED') {
                console.log(`Payment Failed for Charge ID: ${event.id}`);
            } else {
                console.log(`Payment in Progress or Other Status: ${event.status}`);
            }
        } else {
            console.log('Event is not a charge object.');
        }

        res.status(200).send('Callback received successfully');
    } catch (error) {
        console.error('Error processing callback:', error.message);
        res.status(500).send('Error processing callback');
    }
});

// Endpoint to fetch transaction status manually for frontend
app.get('/charge-status', async (req, res) => {
    const { charge_id } = req.query;

    if (!charge_id) {
        return res.status(400).json({ error: 'Missing charge_id parameter.' });
    }

    try {
        const response = await axios.get(`https://api.tap.company/v2/charges/${charge_id}`, {
            headers: {
                Authorization: 'Bearer sk_test_Dfi4SjpRrcPhYE3nXv0bkKyl',
            },
        });

        // Return the full charge data for frontend
        res.status(200).json(response.data);
    } catch (error) {
        console.error('Error retrieving charge status:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to retrieve charge status.' });
    }
});

// Handle 404 errors for undefined routes
app.use((req, res) => {
    res.status(404).send('404: Page Not Found');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
