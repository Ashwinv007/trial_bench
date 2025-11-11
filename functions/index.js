const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

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
    const claims = {};
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
  if (!request.auth || request.auth.token.all !== true) {
    throw new HttpsError("permission-denied", "Only admins can create new users.");
  }

  const { email, password } = request.data;

  if (!email || !password) {
    throw new HttpsError("invalid-argument", "The function must be called with 'email' and 'password'.");
  }

  try {
    const userRecord = await admin.auth().createUser({ email, password });
    return { message: `Success! New user created with UID: ${userRecord.uid}` };
  } catch (error) {
    console.error("Error creating new user:", error);
    if (error.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'The email address is already in use by another account.');
    }
    throw new HttpsError("internal", "An internal error occurred while creating the user.");
  }
});
