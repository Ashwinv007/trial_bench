const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentDeleted } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// TODO: Configure the SMTP transporter with your email service credentials
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: "ashwinsm6@gmail.com", // your SMTP username
    pass: "dhay utze lnyv tial", // your SMTP password
  },
});

exports.sendOtp = onCall(async (request) => {
  if (!request.auth || request.auth.token.all !== true) {
    throw new HttpsError("permission-denied", "Only admins can send OTPs.");
  }

  const { email } = request.data;
  if (!email) {
    throw new HttpsError("invalid-argument", "The function must be called with an 'email' argument.");
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + 10 * 60 * 1000); // 10 minutes

  try {
    await admin.firestore().collection("otps").doc(email).set({ otp, expiresAt });

    const mailOptions = {
      from: '"Your App Name" <your-email@example.com>',
      to: email,
      subject: "Your OTP for User Creation",
      text: `Your One-Time Password is: ${otp}`,
      html: `<b>Your One-Time Password is: ${otp}</b>`,
    };

    await transporter.sendMail(mailOptions);

    return { message: "OTP sent successfully." };
  } catch (error) {
    console.error("Error sending OTP:", error);
    throw new HttpsError("internal", "An unexpected error occurred while sending the OTP.");
  }
});

exports.verifyOtp = onCall(async (request) => {
  if (!request.auth || request.auth.token.all !== true) {
    throw new HttpsError("permission-denied", "Only admins can verify OTPs.");
  }

  const { email, otp } = request.data;
  if (!email || !otp) {
    throw new HttpsError("invalid-argument", "The function must be called with 'email' and 'otp'.");
  }

  try {
    const otpDocRef = admin.firestore().collection("otps").doc(email);
    const otpDoc = await otpDocRef.get();

    if (!otpDoc.exists) {
      throw new HttpsError("not-found", "OTP not found. Please request a new one.");
    }

    const { otp: storedOtp, expiresAt } = otpDoc.data();

    if (expiresAt.toMillis() < Date.now()) {
      await otpDocRef.delete();
      throw new HttpsError("deadline-exceeded", "OTP has expired. Please request a new one.");
    }

    if (storedOtp !== otp) {
      throw new HttpsError("invalid-argument", "Invalid OTP.");
    }

    return { message: "OTP verified successfully." };
  } catch (error) {
    console.error("Error verifying OTP:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "An unexpected error occurred while verifying the OTP.");
  }
});

exports.setUserRole = onCall(async (request) => {
  if (!request.auth || request.auth.token.all !== true) {
    throw new HttpsError("permission-denied", "This function can only be called by an admin.");
  }

  const { email, roleId } = request.data;

  if (!email || !roleId) {
    throw new HttpsError("invalid-argument", "The function must be called with both 'email' and 'roleId' arguments.");
  }

  try {
    const user = await admin.auth().getUserByEmail(email);
    const roleDoc = await admin.firestore().collection("roles").doc(roleId).get();

    if (!roleDoc.exists) {
      throw new HttpsError("not-found", `The role with ID '${roleId}' does not exist.`);
    }

    const roleData = roleDoc.data();
    const permissions = roleData.permissions || [];
    const claims = { role: roleId }; // Add roleId to claims
    permissions.forEach(permission => {
      claims[permission] = true;
    });

    await admin.auth().setCustomUserClaims(user.uid, claims);
    return { message: `Success! User ${email} has been assigned the '${roleData.name}' role.` };
  } catch (error) {
    console.error("Error in setUserRole function:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "An unexpected error occurred while setting the user role.");
  }
});

exports.listUsers = onCall(async (request) => {
  if (!request.auth || request.auth.token.all !== true) {
    throw new HttpsError("permission-denied", "Only admins can list users.");
  }

  try {
    const userRecords = await admin.auth().listUsers(1000);
    const users = userRecords.users.map((user) => ({
      uid: user.uid,
      email: user.email,
      customClaims: user.customClaims || {},
    }));
    return { users };
  } catch (error) {
    console.error("Error listing users:", error);
    throw new HttpsError("internal", "An internal error occurred while listing users.");
  }
});

exports.createUser = onCall(async (request) => {
  if (!request.auth || !request.auth.token.all !== true) {
    throw new HttpsError("permission-denied", "Only admins can create new users.");
  }

  const { email, password, otp } = request.data;

  if (!email || !password || !otp) {
    throw new HttpsError("invalid-argument", "The function must be called with 'email', 'password', and 'otp'.");
  }

  try {
    const otpDocRef = admin.firestore().collection("otps").doc(email);
    const otpDoc = await otpDocRef.get();

    if (!otpDoc.exists) {
      throw new HttpsError("not-found", "OTP not found or already used. Please request a new one.");
    }

    const { otp: storedOtp, expiresAt } = otpDoc.data();

    if (expiresAt.toMillis() < Date.now()) {
      await otpDocRef.delete();
      throw new HttpsError("deadline-exceeded", "OTP has expired. Please request a new one.");
    }

    if (storedOtp !== otp) {
      throw new HttpsError("invalid-argument", "Invalid OTP.");
    }

    const userRecord = await admin.auth().createUser({ email, password });
    await otpDocRef.delete(); // Delete OTP after successful user creation

    return { message: `Success! New user created with UID: ${userRecord.uid}` };
  } catch (error) {
    console.error("Error creating new user:", error);
    if (error instanceof HttpsError) throw error;
    if (error.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'The email address is already in use by another account.');
    }
    throw new HttpsError("internal", "An internal error occurred while creating the user.");
  }
});

exports.onRoleDeleted = onDocumentDeleted("roles/{roleId}", async (event) => {
  const deletedRoleId = event.params.roleId;
  console.log(`Role ${deletedRoleId} deleted. Revoking permissions from users.`);

  const usersToUpdate = [];
  let nextPageToken;

  do {
    const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
    listUsersResult.users.forEach(user => {
      if (user.customClaims && user.customClaims.role === deletedRoleId) {
        usersToUpdate.push(user.uid);
      }
    });
    nextPageToken = listUsersResult.pageToken;
  } while (nextPageToken);

  const promises = usersToUpdate.map(uid => {
    console.log(`Revoking claims for user ${uid}`);
    return admin.auth().setCustomUserClaims(uid, {});
  });

  try {
    await Promise.all(promises);
    console.log(`Successfully revoked claims for ${usersToUpdate.length} users.`);
    return { success: true, message: `Revoked claims for ${usersToUpdate.length} users.` };
  } catch (error) {
    console.error("Error revoking user claims:", error);
    // A trigger function should not throw an HttpsError.
    // It should return a promise that resolves or rejects.
    return Promise.reject(new Error("An error occurred while revoking user claims."));
  }
});
