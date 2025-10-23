# Project Plan: Trial Bench Web Application (MVP)

This document outlines the 3-week plan to develop a Minimum Viable Product (MVP) for the Trial Bench Web Application, as discussed on October 17, 2025.

## Initial Assessment & Revision

*   **Initial Goal:** Build the "Trial Bench" application as detailed in the provided PDF.
*   **Initial Assessment:** Based on a review of several React tutorial projects, the initial assessment was that the required skills for this complex project (advanced state management, complex backend logic, user roles) were not yet demonstrated. A learning path was suggested.
*   **Re-assessment:** After reviewing the Node.js-based "E-commerce Project," it was clear the developer possesses the necessary problem-solving and backend logic skills.
*   **Constraint Clarification:** The project must be built using **React and Firebase only**.

The plan was revised to fit a 3-week timeline using a pure React/Firebase architecture.

---

## The Final 3-Week MVP Plan (React + Firebase)

The goal is to deliver a functional MVP that proves the concept. Advanced features like PDF generation and automated emails are out of scope for this initial 3-week phase.

### **Technology Stack**

*   **Frontend:** React
*   **UI Library:** Material-UI (MUI) - **This is critical for speed.**
*   **Backend:** Firebase
    *   **Database:** Firestore
    *   **Authentication:** Firebase Authentication
    *   **Business Logic:** Cloud Functions for Firebase

---

### **Week 1: The Foundation**

**Goal:** A user can log in, see a list of leads from Firestore, and add a new lead.

1.  **Project Setup:**
    *   Initialize a React project (`create-react-app`).
    *   Create a new project in the Firebase Console.
    *   Integrate the Firebase SDK and MUI into the React app.

2.  **Authentication:**
    *   Enable Email/Password sign-in in the Firebase Console.
    *   Build the Login page in React using `signInWithEmailAndPassword`.
    *   Manage the global user session using React Context and the `onAuthStateChanged` listener.

3.  **Database (Firestore):**
    *   Create a `leads` collection in Firestore.
    *   Set up basic security rules to only allow authenticated users (`allow read, write: if request.auth != null;`).

4.  **UI Development:**
    *   Build the main application layout (sidebar and app bar) using MUI components.
    *   Create the "Lead Management" page with an MUI `DataGrid` for the table and a `Modal` for the add/edit form.
    *   Connect the UI to Firestore using the SDK's `getDocs` and `addDoc` functions.

---

### **Week 2: Roles & Cloud Functions**

**Goal:** Secure the application with user roles and move business logic to the backend.

1.  **Roles & Permissions:**
    *   Use **Firebase Custom Claims** to manage user roles (e.g., 'Admin', 'CommunityManager').
    *   **Create a Cloud Function** that allows an admin to set a custom claim for a user.
    *   **Update Firestore Security Rules** to be role-aware (e.g., `allow create: if request.auth.token.role == 'Admin';`).
    *   In React, read the custom claims from the user's ID token (`getIdTokenResult()`) to conditionally render UI elements.

2.  **Business Logic with Cloud Functions:**
    *   Create **callable Cloud Functions** for complex operations.
    *   **Example:** A `convertLeadToClient` function that, when called from the app, securely handles all the necessary database writes (creating a `Client`, creating an `Agreement`, updating the `Lead`).

---

### **Week 3: Dashboards & Deployment**

**Goal:** Create an efficient dashboard and deploy the application.

1.  **Dashboard:**
    *   Create a `dashboardStats` document in your Firestore.
    *   Write **trigger-based Cloud Functions** that update this document whenever data changes (e.g., a new lead is created). This pre-aggregates your data.
    *   The React dashboard page will then only need to read this single document, making it very fast.

2.  **Deployment:**
    *   Use the Firebase CLI to deploy.
    *   `firebase deploy --only hosting` for the React application.
    *   `firebase deploy --only functions` for your Cloud Functions.
    *   `firebase deploy --only firestore:rules` for your security rules.

---
This plan is aggressive but achievable. The key is to stick to the MVP scope and leverage the chosen tools (MUI, Cloud Functions) effectively.

---
## Notes & Future Improvements
- [ ] Optimistically set user in login form for faster UI response.