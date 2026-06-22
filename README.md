# Jerusalem Employment Hub – Employer & Coordinator Portal

A centralized management platform for employment events, employer relations, and industry insights, serving the Jerusalem Employment Authority.

## Contents

Overview • Non-Profit • Team • Quick Start • Handover • Privacy • Contacts

---

# Overview

The platform serves as a digital bridge between the Jerusalem Employment Authority, local coordinators, and employers. It centralizes event management, provides a secure employer directory with advanced privacy controls, and delivers automated professional content.

## Project Goals

The primary goal of this project is to centralize and streamline the interaction between the Jerusalem Employment Authority, local employers, and employment coordinators. By providing a unified digital portal, we aim to improve event management, data accessibility, and professional knowledge sharing while maintaining high standards of privacy and access control.

## The Three Main "Legs" of the Project

### 1. Annual Event Calendar

A centralized hub for managing and displaying employment-related events.

**For Employers**

* View upcoming workshops, job fairs, networking events, and professional activities.
* Register for relevant events through the platform.

**For Coordinators**

* Create, publish, edit, and manage events.
* Track registrations and event participation.

---

### 2. Employer & Coordinator Directory

A comprehensive and secure database of contacts within the Jerusalem employment ecosystem.

**Role-Based Access Control**

* Contact visibility is controlled according to user roles and permissions.

**Privacy Approval Workflow**

* Sensitive employer contact information is protected through an approval process.
* Depending on the employer's assignment status, access requests may require employer approval alone or both employer and assigned coordinator approval.

**Coordinator Assignment**

* Employers can be assigned to a specific coordinator.
* Assigned coordinators receive additional permissions and visibility for managing the employer relationship.

**Employer Profile Management**

* Company information and organizational details.
* Industry and sub-industry classification.
* Company registration number.
* Company description.
* Jobs portal URL.
* Contact history notes.
* Company logo and relationship status tracking.

---

### 3. Automated Content Bot

A smart content collection system designed to keep the community informed.

**Efficiency**

* Automatically collects employment news, professional content, and industry-related updates from approved sources.

**Human Oversight**

* All collected content remains in a pending state until reviewed and approved by authorized staff members.

**Quality Assurance**

* Published content is moderated before becoming visible to end users.

---

# Non-Profit

**Organization:** Jerusalem Employment Authority (Jerusalem Municipality)

**Primary Stakeholder**

* Name: Michal Bromberg
* Role: Employer Relations Manager
* Email: [michal_bro@jerusalem.muni.il](mailto:michal_bro@jerusalem.muni.il)

**Key Deliverable**
A secure role-based portal featuring:

* An annual event calendar
* A privacy-controlled employer directory
* Employer–coordinator relationship management
* An automated content collection and approval system

---

# Team

* Noga Zadah
* Nadav Alejandro Vega Amador
* Yona Atlan

---

# Quick Start (Local)

```bash
git clone https://github.com/jce-kehila-2026/kehila-2026-employment_authority.git

cd kehila-2026-employment_authority/frontend

npm install

npm run dev
```

Open:

```text
http://localhost:5173
```

---

# Demo / Deployment

Deployment details are maintained by the project team and stakeholder organization.

---

# Handover (Minimum)

* Deployed environment access (shared securely)
* HANDOVER.md with maintenance instructions
* Repository access for stakeholder representatives
* Environment configuration documentation

---

# Privacy & Security

* Role-based authorization
* Employer privacy approval workflow
* Secure storage of contact information
* Firebase Authentication and Firestore security rules
* No secrets stored in source control
* Environment variables used for sensitive configuration

---

# Known Limitations

* Content quality depends on external source availability.
* Historical approved requests created before recent privacy-access improvements may require migration.
* Some administrative workflows still require manual review and approval.

---

# Contacts

**Project Team**

* Noga Zadah
* Nadav Alejandro Vega Amador
* Yona Atlan

**Non-Profit Contact**

* Michal Bromberg
* Employer Relations Manager

---

# License

Specify license and ownership terms according to the Jerusalem Employment Authority project requirements.

---

# Coding Conventions

## Coding Conventions & SOLID Principles

Project code follows modern React development practices, component separation, reusable services, and SOLID design principles where applicable.

---

# Documentation

Technical documentation, setup guides, architecture decisions, and maintenance instructions are maintained within the repository.

---

# Team Workflow & GitHub Governance

The team follows a Git-based workflow using feature branches, pull requests, code reviews, and issue tracking through GitHub.
