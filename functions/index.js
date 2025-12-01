const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentDeleted } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// New, role-based permission checking helper for Cloud Functions
const checkPermission = async (token, requiredPermission) => {
  if (!token || !token.role) {
    return false;
  }
  try {
    const roleDoc = await admin.firestore().collection("roles").doc(token.role).get();
    if (!roleDoc.exists) {
      return false;
    }
    const permissions = roleDoc.data().permissions || [];
    return permissions.includes("all") || permissions.includes(requiredPermission);
  } catch (error) {
    console.error("Error checking permissions:", error);
    return false;
  }
};

// New, role-based permission checking helper for checking one of many permissions
const checkAnyPermission = async (token, requiredPermissions) => {
  if (!token || !token.role) {
    return false;
  }
  try {
    const roleDoc = await admin.firestore().collection("roles").doc(token.role).get();
    if (!roleDoc.exists) {
      return false;
    }
    const permissions = roleDoc.data().permissions || [];
    if (permissions.includes("all")) {
      return true;
    }
    return requiredPermissions.some((p) => permissions.includes(p));
  } catch (error) {
    console.error("Error checking permissions:", error);
    return false;
  }
};


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
  if (!request.auth || !(await checkPermission(request.auth.token, "settings:manage_users"))) {
    throw new HttpsError("permission-denied", "You do not have permission to send OTPs.");
  }

  const { email } = request.data;
  if (!email) {
    throw new HttpsError("invalid-argument", "The function must be called with an 'email' argument.");
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + 10 * 60 * 1000); // 10 minutes

  try {
    await admin.firestore().collection("otps").doc(email).set({ otp, expiresAt });

    // Fetch email template from Firestore
    const templateRef = admin.firestore().collection("email_templates").doc("otp_email");
    const templateDoc = await templateRef.get();

    let subject = "Your OTP for User Creation";
    let text = `Your One-Time Password is: ${otp}`;
    let html = `<b>Your One-Time Password is: ${otp}</b>`;

    if (templateDoc.exists) {
      const template = templateDoc.data();
      subject = template.subject || subject;
      const body = template.body || text;
      // Simple placeholder replacement
      text = body.replace(/{{otp}}/g, otp);
      html = text.replace(/\n/g, "<br>");
    }

    const mailOptions = {
      from: '"Your App Name" <your-email@example.com>',
      to: email,
      subject: subject,
      text: text,
      html: html,
    };

    await transporter.sendMail(mailOptions);

    return { message: "OTP sent successfully." };
  } catch (error) {
    console.error("Error sending OTP:", error);
    throw new HttpsError("internal", "An unexpected error occurred while sending the OTP.");
  }
});

exports.verifyOtp = onCall(async (request) => {
  if (!request.auth || !(await checkPermission(request.auth.token, "settings:manage_users"))) {
    throw new HttpsError("permission-denied", "You do not have permission to verify OTPs.");
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
  if (!request.auth || !(await checkPermission(request.auth.token, "settings:manage_users"))) {
    throw new HttpsError("permission-denied", "You do not have permission to manage user roles.");
  }

  const { email, roleId } = request.data;

  // The email check is sufficient, no need to check roleId as it can be empty to unassign.
  if (!email) {
    throw new HttpsError("invalid-argument", "The function must be called with an 'email' argument.");
  }

  try {
    const user = await admin.auth().getUserByEmail(email);

    // If roleId is empty/null, it means we are un-assigning the role.
    if (!roleId) {
      await admin.auth().setCustomUserClaims(user.uid, {});
      return { message: `Success! User ${email}'s role has been removed.` };
    }

    const roleDoc = await admin.firestore().collection("roles").doc(roleId).get();

    if (!roleDoc.exists) {
      throw new HttpsError("not-found", `The role with ID '${roleId}' does not exist.`);
    }

    const roleData = roleDoc.data();
    const claims = { role: roleId }; // Only set the role ID

    console.log(`Setting claims for ${user.uid}:`, JSON.stringify(claims, null, 2));
    await admin.auth().setCustomUserClaims(user.uid, claims);

    return { message: `Success! User ${email} has been assigned the '${roleData.name}' role.` };
  } catch (error) {
    console.error("Error in setUserRole function:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "An unexpected error occurred while setting the user role.");
  }
});

exports.listUsers = onCall(async (request) => {
  if (!request.auth || !(await checkPermission(request.auth.token, "settings:manage_users"))) {
    throw new HttpsError("permission-denied", "You do not have permission to list users.");
  }

  try {
    const userRecords = await admin.auth().listUsers(1000);
    const users = userRecords.users.map((user) => ({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || "",
      customClaims: user.customClaims || {},
    }));
    return { users };
  } catch (error) {
    console.error("Error listing users:", error);
    throw new HttpsError("internal", "An internal error occurred while listing users.");
  }
});

exports.createUser = onCall(async (request) => {
  if (!request.auth || !(await checkPermission(request.auth.token, "settings:manage_users"))) {
    throw new HttpsError("permission-denied", "You do not have permission to create users.");
  }

  const { email, password, otp, username } = request.data;

  if (!email || !password || !otp || !username) {
    throw new HttpsError("invalid-argument", "The function must be called with 'email', 'password', 'otp', and 'username'.");
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

    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: username,
    });
    await otpDocRef.delete(); // Delete OTP after successful user creation

    return { message: `Success! New user created with UID: ${userRecord.uid}` };
  } catch (error) {
    console.error("Error creating new user:", error);
    if (error instanceof HttpsError) throw error;
    if (error.code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "The email address is already in use by another account.");
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
    listUsersResult.users.forEach((user) => {
      if (user.customClaims && user.customClaims.role === deletedRoleId) {
        usersToUpdate.push(user.uid);
      }
    });
    nextPageToken = listUsersResult.pageToken;
  } while (nextPageToken);

  const promises = usersToUpdate.map((uid) => {
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

exports.sendWelcomeEmail = onCall(async (request) => {
  if (!request.auth || !(await checkPermission(request.auth.token, "members:add"))) {
    throw new HttpsError("permission-denied", "You do not have permission to send welcome emails.");
  }

  const { toEmail, username, ccEmail } = request.data;
  if (!toEmail || !username) {
    throw new HttpsError("invalid-argument", "The function must be called with 'toEmail' and 'username'.");
  }

  try {
    // Fetch email template from Firestore
    const templateRef = admin.firestore().collection("email_templates").doc("welcome_email");
    const templateDoc = await templateRef.get();

    let subject = "Welcome to Our Platform!";
    let bodyContent = `Hi ${username},\n\nWelcome! We are excited to have you on board.`;

    if (templateDoc.exists) {
      const template = templateDoc.data();
      subject = template.subject || subject;
      bodyContent = template.body || bodyContent;
    }

    // Replace placeholders
    const personalizedSubject = subject.replace(/{{username}}/g, username);
    const personalizedBody = bodyContent.replace(/{{username}}/g, username);

    const mailOptions = {
      from: '"Your App Name" <your-email@example.com>',
      to: toEmail,
      subject: personalizedSubject,
      text: personalizedBody,
      html: personalizedBody.replace(/\n/g, "<br>"),
    };

    if (ccEmail) {
      mailOptions.cc = ccEmail;
    }

    await transporter.sendMail(mailOptions);

    return { message: "Welcome email sent successfully." };
  } catch (error) {
    console.error("Error sending welcome email:", error);
    throw new HttpsError("internal", "An unexpected error occurred while sending the welcome email.");
  }
});

exports.sendInvoiceEmail = onCall(async (request) => {
  if (!request.auth || !(await checkAnyPermission(request.auth.token, ["invoices:add", "invoices:edit"]))) {
    throw new HttpsError("permission-denied", "You do not have permission to send invoice emails.");
  }

  const { toEmail, customerName, invoiceNumber, pdfBase64, ccEmail } = request.data;
  if (!toEmail || !customerName || !invoiceNumber || !pdfBase64) {
    throw new HttpsError("invalid-argument", "The function must be called with 'toEmail', 'customerName', 'invoiceNumber', and 'pdfBase64'.");
  }

  try {
    // Fetch email template from Firestore
    const templateRef = admin.firestore().collection("email_templates").doc("invoice_email");
    const templateDoc = await templateRef.get();

    let subject = `Your Invoice [${invoiceNumber}] is ready`;
    let bodyContent = `Hi ${customerName},\n\nPlease find your invoice attached.`;

    if (templateDoc.exists) {
      const template = templateDoc.data();
      subject = template.subject || subject;
      bodyContent = template.body || bodyContent;
    }

    // Replace placeholders
    const personalizedSubject = subject
      .replace(/{{customerName}}/g, customerName)
      .replace(/{{invoice_number}}/g, invoiceNumber);
    const personalizedBody = bodyContent
      .replace(/{{customerName}}/g, customerName)
      .replace(/{{invoice_number}}/g, invoiceNumber);

    const mailOptions = {
      from: '"Your App Name" <your-email@example.com>',
      to: toEmail,
      subject: personalizedSubject,
      text: personalizedBody,
      html: personalizedBody.replace(/\n/g, "<br>"),
      attachments: [
        {
          filename: `invoice_${invoiceNumber}.pdf`,
          content: pdfBase64,
          encoding: "base64",
          contentType: "application/pdf",
        },
      ],
    };

    if (ccEmail) {
      mailOptions.cc = ccEmail;
    }

    await transporter.sendMail(mailOptions);

    return { message: "Invoice email sent successfully." };
  } catch (error) {
    console.error("Error sending invoice email:", error);
    throw new HttpsError("internal", "An unexpected error occurred while sending the invoice email.");
  }
});

exports.sendAgreementEmail = onCall(async (request) => {
  if (!request.auth || !(await checkPermission(request.auth.token, "agreements:edit"))) {
    throw new HttpsError("permission-denied", "You do not have permission to send agreement emails.");
  }

  const { toEmail, clientName, agreementName, pdfBase64, ccEmail } = request.data;
  if (!toEmail || !clientName || !agreementName || !pdfBase64) {
    throw new HttpsError("invalid-argument", "The function must be called with 'toEmail', 'clientName', 'agreementName', and 'pdfBase64'.");
  }

  try {
    // Fetch email template from Firestore
    const templateRef = admin.firestore().collection("email_templates").doc("agreement_email");
    const templateDoc = await templateRef.get();

    let subject = `Your Agreement [${agreementName}] is ready`;
    let bodyContent = `Hi ${clientName},\n\nPlease find your agreement attached.`;

    if (templateDoc.exists) {
      const template = templateDoc.data();
      subject = template.subject || subject;
      bodyContent = template.body || bodyContent;
    }

    // Replace placeholders
    const personalizedSubject = subject
      .replace(/{{clientName}}/g, clientName)
      .replace(/{{agreement_name}}/g, agreementName);
    const personalizedBody = bodyContent
      .replace(/{{clientName}}/g, clientName)
      .replace(/{{agreement_name}}/g, agreementName);

    const mailOptions = {
      from: '"Your App Name" <your-email@example.com>',
      to: toEmail,
      subject: personalizedSubject,
      text: personalizedBody,
      html: personalizedBody.replace(/\n/g, "<br>"),
      attachments: [
        {
          filename: `agreement_${agreementName}.pdf`,
          content: pdfBase64,
          encoding: "base64",
          contentType: "application/pdf",
        },
      ],
    };

    if (ccEmail) {
      mailOptions.cc = ccEmail;
    }

    await transporter.sendMail(mailOptions);

    return { message: "Agreement email sent successfully." };
  } catch (error) {
    console.error("Error sending agreement email:", error);
    throw new HttpsError("internal", "An unexpected error occurred while sending the agreement email.");
  }
});

exports.updateUser = onCall(async (request) => {
  if (!request.auth || !(await checkPermission(request.auth.token, "settings:manage_users"))) {
    throw new HttpsError("permission-denied", "You do not have permission to update users.");
  }

  const { uid, username } = request.data;
  if (!uid || !username) {
    throw new HttpsError("invalid-argument", "The function must be called with 'uid' and 'username'.");
  }

  try {
    await admin.auth().updateUser(uid, {
      displayName: username,
    });
    return { message: "User updated successfully." };
  } catch (error) {
    console.error("Error updating user:", error);
    throw new HttpsError("internal", "An unexpected error occurred while updating the user.");
  }
});

exports.deleteUser = onCall(async (request) => {
  if (!request.auth || !(await checkPermission(request.auth.token, "settings:manage_users"))) {
    throw new HttpsError("permission-denied", "You do not have permission to delete users.");
  }

  const { uid } = request.data;
  if (!uid) {
    throw new HttpsError("invalid-argument", "The function must be called with a 'uid'.");
  }

  try {
    await admin.auth().deleteUser(uid);
    return { message: "User deleted successfully." };
  } catch (error) {
    console.error("Error deleting user:", error);
    throw new HttpsError("internal", "An unexpected error occurred while deleting the user.");
  }
});

exports.adminSetUserPassword = onCall(async (request) => {
  if (!request.auth || !(await checkPermission(request.auth.token, "settings:manage_users"))) {
    throw new HttpsError("permission-denied", "You do not have permission to set user passwords.");
  }

  const { uid, newPassword } = request.data;
  if (!uid || !newPassword) {
    throw new HttpsError("invalid-argument", "The function must be called with 'uid' and 'newPassword'.");
  }

  try {
    await admin.auth().updateUser(uid, {
      password: newPassword,
    });
    return { message: "Password updated successfully." };
  } catch (error) {
    console.error("Error setting user password:", error);
    throw new HttpsError("internal", "An unexpected error occurred while setting the password.");
  }
});

exports.scheduledAgreementTermination = onSchedule("every 24 hours", async (event) => {
  console.log("Running scheduled agreement termination job.");
  const db = admin.firestore();

  const today = new Date();
  const todayString = today.toISOString().split("T")[0];

  try {
    const agreementsQuery = db.collection("agreements")
      .where("status", "!=", "terminated")
      .where("endDate", "<=", todayString);

    const expiredAgreementsSnapshot = await agreementsQuery.get();

    if (expiredAgreementsSnapshot.empty) {
      console.log("No expired agreements to terminate.");
      return null;
    }

    const processedLeadIds = new Set();
    const batch = db.batch();

    for (const agreementDoc of expiredAgreementsSnapshot.docs) {
      const agreementData = agreementDoc.data();
      const leadId = agreementData.leadId;
      const agreementId = agreementDoc.id;

      if (!leadId || processedLeadIds.has(leadId)) {
        console.log(`Updating agreement ${agreementId} without member move (no leadId or already processed).`);
        batch.update(agreementDoc.ref, {
          status: "terminated",
          exitDate: agreementData.endDate, // Use the agreement's end date
        });
        continue;
      }

      processedLeadIds.add(leadId);

      // Find and move primary member
      const primaryMemberQuery = db.collection("members").where("leadId", "==", leadId).limit(1);
      const primaryMemberSnapshot = await primaryMemberQuery.get();

      if (!primaryMemberSnapshot.empty) {
        const primaryMemberDoc = primaryMemberSnapshot.docs[0];
        const primaryMemberData = primaryMemberDoc.data();

        const pastPrimaryMemberRef = db.collection("past_members").doc(primaryMemberDoc.id);
        batch.set(pastPrimaryMemberRef, {
          ...primaryMemberData,
          removedAt: new admin.firestore.Timestamp.fromDate(new Date(agreementData.endDate)),
          reason: "Agreement expired.",
        });
        batch.delete(primaryMemberDoc.ref);
        console.log(`Marked primary member ${primaryMemberDoc.id} for move to past_members.`);

        // Find and move sub-members
        const subMembersQuery = db.collection("members").where("primaryMemberId", "==", primaryMemberDoc.id);
        const subMembersSnapshot = await subMembersQuery.get();
        subMembersSnapshot.docs.forEach((doc) => {
          const pastSubMemberRef = db.collection("past_members").doc(doc.id);
          batch.set(pastSubMemberRef, {
            ...doc.data(),
            removedAt: new admin.firestore.Timestamp.fromDate(new Date(agreementData.endDate)),
            reason: "Agreement expired.",
          });
          batch.delete(doc.ref);
          console.log(`Marked sub-member ${doc.id} for move to past_members.`);
        });
      }

      // Update agreement status and exitDate
      batch.update(agreementDoc.ref, {
        status: "terminated",
        exitDate: agreementData.endDate,
      });
      console.log(`Marked agreement ${agreementId} as terminated.`);

      // Log the automated activity
      const logRef = db.collection("logs").doc();
      batch.set(logRef, {
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        user: { uid: "SYSTEM", displayName: "Automated Process" },
        action: "agreement_terminated_auto",
        message: `Agreement "${agreementData.agreementNumber}" for "${agreementData.memberLegalName || ""}" automatically terminated on end date.`,
        details: {
          agreementId: agreementId,
          agreementNumber: agreementData.agreementNumber || null,
          leadId: leadId,
          endDate: agreementData.endDate,
        },
      });
    }

    await batch.commit();
    console.log(`Successfully terminated ${expiredAgreementsSnapshot.size} agreement(s).`);
    return null;
  } catch (error) {
    console.error("Error during scheduled agreement termination:", error);
    return null;
  }
});

exports.earlyExitAgreement = onCall(async (request) => {
  if (!request.auth || !(await checkPermission(request.auth.token, "agreements:edit"))) {
    throw new HttpsError("permission-denied", "You do not have permission to perform an early exit on an agreement.");
  }

  const { agreementId } = request.data;
  if (!agreementId) {
    throw new HttpsError("invalid-argument", "The function must be called with an 'agreementId'.");
  }

  const db = admin.firestore();
  const batch = db.batch();

  try {
    const agreementRef = db.collection("agreements").doc(agreementId);
    const agreementDoc = await agreementRef.get();

    if (!agreementDoc.exists) {
      throw new HttpsError("not-found", "Agreement not found.");
    }

    const agreementData = agreementDoc.data();
    const leadId = agreementData.leadId;

    if (!leadId) {
      // This case should ideally not happen if data integrity is maintained.
      // If there's no leadId, we can't find members. Just update the agreement.
      console.log(`Agreement ${agreementId} has no leadId. Terminating agreement.`);
      batch.update(agreementRef, {
        status: "terminated",
        endDate: admin.firestore.FieldValue.serverTimestamp(),
      });
      await batch.commit();
      return { message: "Agreement terminated. No lead was linked to this agreement." };
    }

    // Find the primary member
    const primaryMemberQuery = db.collection("members").where("leadId", "==", leadId).limit(1);
    const primaryMemberSnapshot = await primaryMemberQuery.get();

    if (primaryMemberSnapshot.empty) {
      // If no primary member, just update the agreement and exit
      console.log(`No primary member found for leadId ${leadId}. Terminating agreement.`);
      batch.update(agreementRef, {
        status: "terminated",
        endDate: admin.firestore.FieldValue.serverTimestamp(),
      });
      await batch.commit();
      return { message: "Agreement terminated. No active members were found for the linked lead." };
    }

    const primaryMemberDoc = primaryMemberSnapshot.docs[0];
    const primaryMemberId = primaryMemberDoc.id;
    const primaryMemberData = primaryMemberDoc.data();

    // Move primary member to past_members
    const pastPrimaryMemberRef = db.collection("past_members").doc(primaryMemberId);
    batch.set(pastPrimaryMemberRef, {
      ...primaryMemberData,
      removedAt: admin.firestore.FieldValue.serverTimestamp(),
      reason: "Early agreement exit.",
    });
    batch.delete(primaryMemberDoc.ref);
    console.log(`Marked primary member ${primaryMemberId} for move to past_members.`);

    // Find and move sub-members
    const subMembersQuery = db.collection("members").where("primaryMemberId", "==", primaryMemberId);
    const subMembersSnapshot = await subMembersQuery.get();

    if (!subMembersSnapshot.empty) {
      subMembersSnapshot.docs.forEach((doc) => {
        const subMemberData = doc.data();
        const pastSubMemberRef = db.collection("past_members").doc(doc.id);
        batch.set(pastSubMemberRef, {
          ...subMemberData,
          removedAt: admin.firestore.FieldValue.serverTimestamp(),
          reason: "Early agreement exit.",
        });
        batch.delete(doc.ref);
        console.log(`Marked sub-member ${doc.id} for move to past_members.`);
      });
    }

    // Update agreement status and end date
    batch.update(agreementRef, {
      status: "terminated",
      endDate: admin.firestore.FieldValue.serverTimestamp(), // Using endDate to mark termination date
    });
    console.log(`Marked agreement ${agreementId} as terminated.`);

    await batch.commit();

    const numSubMembers = subMembersSnapshot.size;
    console.log("Early exit transaction completed successfully.");
    return { message: `Agreement terminated. Moved 1 primary member and ${numSubMembers} sub-member(s) to past members.` };
  } catch (error) {
    console.error("Error during early agreement exit:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "An unexpected error occurred during the early exit process.");
  }
});

exports.replacePrimaryMember = onCall(async (request) => {
  if (!request.auth || !(await checkPermission(request.auth.token, "members:edit"))) {
    throw new HttpsError("permission-denied", "You do not have permission to replace members.");
  }

  const { oldPrimaryMemberId, mode, promotionTarget } = request.data;
  const { uid, token } = request.auth;

  if (!oldPrimaryMemberId || !mode || !promotionTarget) {
    throw new HttpsError("invalid-argument", "Missing required arguments for replacement.");
  }

  const db = admin.firestore();
  let leadIdToLog; // Variable to hold leadId for logging

  try {
    await db.runTransaction(async (transaction) => {
      // --- ALL READS FIRST ---
      const oldPrimaryMemberRef = db.collection("members").doc(oldPrimaryMemberId);
      const subMembersQuery = db.collection("members").where("primaryMemberId", "==", oldPrimaryMemberId);

      const [oldPrimaryMemberDoc, subMembersSnapshot] = await Promise.all([
        transaction.get(oldPrimaryMemberRef),
        transaction.get(subMembersQuery),
      ]);

      // --- VALIDATION AFTER READS ---
      if (!oldPrimaryMemberDoc.exists) {
        throw new HttpsError("not-found", "The member to be replaced does not exist.");
      }
      const oldPrimaryMemberData = oldPrimaryMemberDoc.data();
      let newPrimaryMemberId;

      const emailToTransfer = oldPrimaryMemberData.email || "";
      const leadId = oldPrimaryMemberData.leadId;
      leadIdToLog = leadId; // Capture leadId for logging outside transaction

      const originalSubMemberIds = subMembersSnapshot.docs.map((doc) => doc.id);
      const newSubMemberIds = [];

      if (mode === "replace") {
        newSubMemberIds.push(oldPrimaryMemberId);
      }

      originalSubMemberIds.forEach((id) => {
        if (id !== promotionTarget.promoteMemberId) {
          newSubMemberIds.push(id);
        }
      });

      // --- ALL WRITES AFTER READS ---

      // Determine the new primary member and perform write
      if (promotionTarget.promoteMemberId) {
        newPrimaryMemberId = promotionTarget.promoteMemberId;
        const newPrimaryMemberRef = db.collection("members").doc(newPrimaryMemberId);
        console.log(`Promoting sub-member ${newPrimaryMemberId} to primary.`);
        transaction.update(newPrimaryMemberRef, {
          primary: true,
          primaryMemberId: null,
          company: oldPrimaryMemberData.company,
          package: oldPrimaryMemberData.package,
          subMembers: newSubMemberIds,
          leadId: leadId,
          email: emailToTransfer,
        });
      } else if (promotionTarget.newMember) {
        const newMemberData = promotionTarget.newMember;
        const newMemberRef = db.collection("members").doc();
        newPrimaryMemberId = newMemberRef.id;
        console.log(`Creating new member ${newPrimaryMemberId} as primary.`);
        transaction.set(newMemberRef, {
          ...newMemberData,
          primary: true,
          primaryMemberId: null,
          company: oldPrimaryMemberData.company,
          package: oldPrimaryMemberData.package,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          subMembers: newSubMemberIds,
          leadId: leadId,
          email: emailToTransfer,
        });
      } else {
        throw new HttpsError("invalid-argument", "Invalid promotionTarget specified.");
      }

      // Handle the old primary member
      if (mode === "replace") {
        console.log(`Demoting old primary ${oldPrimaryMemberId} to be a sub-member of ${newPrimaryMemberId}.`);
        transaction.update(oldPrimaryMemberRef, {
          primary: false,
          primaryMemberId: newPrimaryMemberId,
          subMembers: [],
          leadId: null,
          email: "", // Email is moved to the new primary member
        });
      } else if (mode === "removeAndReplace") {
        console.log(`Demoting and moving old primary ${oldPrimaryMemberId} to past_members.`);

        const pastMemberData = {
          ...oldPrimaryMemberData,
          primary: false,
          primaryMemberId: newPrimaryMemberId,
          subMembers: [],
          leadId: null,
          removedAt: admin.firestore.FieldValue.serverTimestamp(),
          reason: `Replaced by new primary member ${newPrimaryMemberId}`,
        };

        const pastMemberRef = db.collection("past_members").doc(oldPrimaryMemberId);

        transaction.set(pastMemberRef, pastMemberData);
        transaction.delete(oldPrimaryMemberRef);
      }

      // Re-parent other sub-members
      console.log(`Re-parenting sub-members of ${oldPrimaryMemberId} to ${newPrimaryMemberId}.`);
      subMembersSnapshot.docs.forEach((doc) => {
        if (doc.id !== newPrimaryMemberId) {
          const subMemberRef = db.collection("members").doc(doc.id);
          console.log(`Updating sub-member ${doc.id}'s primary member to ${newPrimaryMemberId}.`);
          transaction.update(subMemberRef, { primaryMemberId: newPrimaryMemberId });
        }
      });
    });

    // Add to logs after successful transaction
    await db.collection("logs").add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      user: {
        uid: uid,
        displayName: token.name || token.email || "Unknown User",
      },
      action: "member_replaced",
      message: `Replaced primary member (ID: ${oldPrimaryMemberId})`,
      details: {
        oldPrimaryMemberId: oldPrimaryMemberId,
        leadId: leadIdToLog,
        mode: mode,
      },
    });

    console.log("Primary member replacement transaction completed successfully.");
    return { success: true, message: "Primary member replaced successfully." };
  } catch (error) {
    console.error("Error in replacePrimaryMember transaction:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "An unexpected error occurred during the replacement process.");
  }
});
