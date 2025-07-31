/**
 * @fileoverview Netlify serverless function to provide environment variables to the client-side app.
 * This function uses modern ES Module syntax.
 */

export const handler = async (event, context) => {
  // Return a 200 OK status and a JSON body with the environment variables.
  // The body must be a string, so we use JSON.stringify.
  return {
    statusCode: 200,
    body: JSON.stringify({
      firebaseConfig: {
        apiKey: process.env.PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
        databaseURL: process.env.PUBLIC_FIREBASE_DATABASE_URL,
        projectId: process.env.PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.PUBLIC_FIREBASE_APP_ID,
        measurementId: process.env.PUBLIC_FIREBASE_MEASUREMENT_ID,
      },
      geminiApiKeys: {
        analyzer: [
          process.env.PUBLIC_ANALYZER_GEM_1,
          process.env.PUBLIC_ANALYZER_GEM_2,
          process.env.PUBLIC_ANALYZER_GEM_3,
        ],
        dashboard: [
          process.env.PUBLIC_DASHBOARD_GEM_1,
          process.env.PUBLIC_DASHBOARD_GEM_2,
          process.env.PUBLIC_DASHBOARD_GEM_3,
        ],
        food: [
          process.env.PUBLIC_FOOD_GEM_1,
          process.env.PUBLIC_FOOD_GEM_2,
          process.env.PUBLIC_FOOD_GEM_3,
        ],
        tools: [
          process.env.PUBLIC_TOOLS_GEM_1,
          process.env.PUBLIC_TOOLS_GEM_2,
          process.env.PUBLIC_TOOLS_GEM_3,
        ],
      }
    })
  };
};
