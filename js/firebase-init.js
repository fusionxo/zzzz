/**
 * @fileoverview Netlify function to securely provide public Firebase
 * configuration variables to the client-side application.
 * It reads from the Netlify environment variables and returns them as JSON.
 */

exports.handler = async function(event, context) {
  // Check to ensure the request is a GET request
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed',
    };
  }

  // These are your PUBLIC Firebase keys. It is safe to expose these
  // in client-side code. Never expose server-side keys or secrets.
  const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID,
  };

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*', // Or specify your domain for better security
    },
    body: JSON.stringify(firebaseConfig),
  };
};
