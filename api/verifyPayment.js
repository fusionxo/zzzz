// File: api/verifyPayment.js
const crypto = require('crypto');
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

const db = admin.firestore();

export default async function handler(request, response) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const receivedSignature = request.headers["x-razorpay-signature"];
  
  const digest = crypto.createHmac("sha256", webhookSecret).update(JSON.stringify(request.body)).digest("hex");

  if (digest !== receivedSignature) {
    console.warn('Invalid webhook signature received.');
    return response.status(403).send("Invalid signature.");
  }

  const payment = request.body.payload.payment.entity;
  const paymentId = payment.id;
  const { firebase_uid: userId, plan: planName } = payment.notes;

  if (!userId || !planName) {
      return response.status(400).send('Bad Request: Missing user or plan info in notes.');
  }

  // **IDEMPOTENCY CHECK**
  const purchaseDocRef = db.collection('users').doc(userId).collection('purchases').doc(paymentId);

  try {
    const doc = await purchaseDocRef.get();
    if (doc.exists) {
        console.log(`Webhook for payment ${paymentId} already processed.`);
        return response.status(200).send("OK: Payment already processed.");
    }
  } catch (error) {
    console.error("Firestore read error during idempotency check:", error);
    return response.status(500).send("Internal Server Error");
  }

  // **PROCESS THE PAYMENT**
  try {
    const plans = { "Starter": { durationInDays: 30 }, "Growth": { durationInDays: 90 }, "Pro": { durationInDays: 180 } };
    const duration = plans[planName]?.durationInDays;
    if (!duration) throw new Error(`Invalid plan name: ${planName}`);

    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + duration);
    
    // Record the purchase in a subcollection
    await purchaseDocRef.set({
        planName: planName,
        amount: payment.amount / 100,
        currency: payment.currency,
        status: payment.status,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update the main user document
    await db.collection("users").doc(userId).set({
      premium: "yes",
      premiumPlan: planName,
      premiumExpirationDate: expirationDate
    }, { merge: true });

    console.log(`Successfully granted premium access for plan '${planName}' to user ${userId}.`);
    response.status(200).send("Payment verified and account updated.");

  } catch (error) {
    console.error(`Error processing payment ${paymentId} for user ${userId}:`, error);
    response.status(500).send("Internal server error while updating account.");
  }
}
