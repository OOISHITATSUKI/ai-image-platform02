const http = require('http');

async function testNode() {
    process.env.NOWPAYMENTS_API_KEY = "M21W8V8-S56MBB1-NWBBXYC-XEQT42Q"; // Some dummy or test key

    const testPayload = JSON.stringify({
        price_amount: 9.99,
        price_currency: 'USD',
        order_id: "test-id-123",
        order_description: "LIGHT Credit Pack - 1200 Credits",
        ipn_callback_url: "http://localhost:3000/api/webhooks/nowpayments",
        success_url: "http://localhost:3000/pricing/success",
        cancel_url: "http://localhost:3000/pricing"
    });

    console.log("Payload:", testPayload);
}

testNode();
