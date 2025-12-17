
# Functional Requirement Document (FRD)
## Project: "Trial Bench" Business Management Dashboard

---

### 1. Introduction

This document provides a detailed breakdown of the functional requirements for the "Trial Bench" Business Management Dashboard. It is intended for the development and testing teams and serves as a technical companion to the Business Requirement Document (BRD). All requirements listed here map directly to the high-level goals outlined in the BRD.

### 2. User Roles and Permissions

The system implements a dynamic Role-Based Access Control (RBAC) system. Access to functionality is not hard-coded but is determined by permissions assigned to a user's role.

#### 2.1. Permission List

The following is the exhaustive list of permissions available in the system. Administrators can combine these to create custom roles.

*   `can-view-leads`
*   `can-create-lead`
*   `can-edit-lead`
*   `can-delete-lead`
*   `can-export-leads`
*   `can-view-clients`
*   `can-create-client` (also enables lead conversion)
*   `can-edit-client`
*   `can-delete-client`
*   `can-view-past-members`
*   `can-view-invoices`
*   `can-create-invoice`
*   `can-edit-invoice`
*   `can-delete-invoice`
*   `can-view-agreements`
*   `can-create-agreement`
*   `can-edit-agreement`
*   `can-delete-agreement`
*   `can-view-expenses`
*   `can-create-expense`
*   `can-edit-expense`
*   `can-delete-expense`
*   `can-view-logs`
*   `can-view-settings`
*   `can-edit-roles`
*   `can-assign-roles`

#### 2.2. Example Role Definitions

| Role | Associated Permissions |
|---|---|
| **Administrator** | All permissions listed above. |
| **Sales Rep** | `can-view-leads`, `can-create-lead`, `can-edit-lead`, `can-export-leads`, `can-view-clients`, `can-create-client`. |
| **Accountant** | `can-view-clients`, `can-view-invoices`, `can-create-invoice`, `can-edit-invoice`, `can-view-expenses`, `can-create-expense`. |

---

### 3. Functional Requirements

#### 3.1. Module: Lead Management

| Req. ID | User Story | Acceptance Criteria |
|---|---|---|
| **FR-L-01** | As a Sales Rep, I want to create a new lead so that I can track a potential customer. | 1. User must have `can-create-lead` permission. <br> 2. The "Add Lead" form must capture: First Name, Last Name, Email, Phone, Status (`New`, `Contacted`, `Converted`, `Lost`), Source, Purpose of Visit. <br> 3. Upon saving, a new lead record is created with a unique ID. <br> 4. The system logs the "Lead Created" event. |
| **FR-L-02** | As a Sales Rep, I want to view all leads in a list so that I can manage my pipeline. | 1. User must have `can-view-leads` permission. <br> 2. The system shall display leads in a table with columns for Name, Email, Phone, and Status. <br> 3. The list must be searchable by name and filterable by status. |
| **FR-L-03** | As a Sales Rep, I want to edit a lead's details so that I can keep their information up to date. | 1. User must have `can-edit-lead` permission. <br> 2. The system shall allow modification of all fields captured in FR-L-01. |
| **FR-L-04** | As a Sales Rep, I want to convert a qualified lead into a client so that they officially become a customer. | 1. User must have `can-create-client` permission. <br> 2. From the lead details view, there must be a "Convert to Client" button. <br> 3. Clicking this button shall change the lead's status to "Converted". <br> 4. The system shall automatically create a new record in the "Clients" (Members) database using the information from the lead. |

#### 3.2. Module: Client (Member) Management

| Req. ID | User Story | Acceptance Criteria |
|---|---|---|
| **FR-C-01** | As an Admin, I want to view a list of all active clients so that I can manage our customer base. | 1. User must have `can-view-clients` permission. <br> 2. The system shall display clients in a searchable, sortable table. |
| **FR-C-02** | As an Admin, I want to view a client's profile to see all their associated information. | 1. The profile page must show client contact details, associated agreements, and a history of invoices. |

#### 3.3. Module: System Administration

| Req. ID | User Story | Acceptance Criteria |
|---|---|---|
| **FR-S-01** | As an Administrator, I want to create custom user roles so that I can enforce company policies on data access. | 1. User must have `can-edit-roles` permission. <br> 2. The Settings page must have a section for Role Management. <br> 3. The UI must allow an admin to create a new role by providing a name and selecting any combination of permissions from the master list (see section 2.1). |
| **FR-S-02** | As an Administrator, I want to assign roles to users so that I can grant them the appropriate permissions. | 1. User must have `can-assign-roles` permission. <br> 2. The UI must provide a way to select a user and assign them one of the created roles. |

### 4. Non-Functional Requirements

| Req. ID | Requirement | Description |
|---|---|---|
| **NFR-1** | **Performance** | All pages and data tables must load within 3 seconds on a standard broadband connection. |
| **NFR-2** | **Security** | All API endpoints must be protected and verify the user's permissions before returning data. Access is denied by default. |
| **NFR-3** | **Usability** | The user interface must be intuitive and follow consistent design patterns throughout the application. |
| **NFR-4** | **Data Integrity** | The system must ensure that when a lead is converted, a corresponding client is always created. The two actions should be part of a single transaction if possible. |
