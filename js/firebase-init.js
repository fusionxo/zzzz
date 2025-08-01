/**
 * @fileoverview Netlify serverless function to securely expose
 * Firebase configuration to the client-side application.
 */

exports.handler = async function(event, context) {
  // Check to ensure the request is a GET request
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  // These variables are pulled from your Netlify build settings.
  const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID, // Optional
  };

  // Basic validation to ensure all required keys are present
  for (const key in firebaseConfig) {
    if (key !== 'measurementId' && !firebaseConfig[key]) {
      console.error(`Missing environment variable: ${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Server configuration error. A Firebase environment variable is missing.' }),
      };
    }
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*', // Or specify your site's domain for better security
    },
    body: JSON.stringify(firebaseConfig),
  };
};
