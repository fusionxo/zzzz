// File: api/createOrder.js
const Razorpay = require('razorpay');
const admin = require('firebase-admin');

try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
} catch (e) {
  console.error('Firebase Admin SDK initialization error:', e.message);
}

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export default async function handler(request, response) {
  try {
    const token = request.headers.authorization?.split('Bearer ')[1];
    if (!token) {
      return response.status(401).send('Unauthorized: No Firebase token.');
    }
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;

    const plans = {
        "Starter": { amount: 9900 },
        "Growth": { amount: 26900 },
        "Pro": { amount: 49900 },
    };
    const { planId } = request.body;
    const selectedPlan = plans[planId];

    if (!selectedPlan) {
      return response.status(400).json({ error: 'Invalid plan selected.' });
    }
    
    const orderOptions = {
      amount: selectedPlan.amount,
      currency: 'INR',
      receipt: `receipt_order_${new Date().getTime()}`,
      notes: { firebase_uid: uid, plan: planId }
    };

    const order = await instance.orders.create(orderOptions);
    response.status(200).json({ orderId: order.id });

  } catch (error) {
    console.error(`Error creating order for user ${uid}:`, error);
    response.status(500).json({ error: 'Order creation failed.', details: error.message });
  }
}
