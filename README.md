# OPD Flow 🏥

**Right patient. Right priority. Right now.**

OPD Flow is a fast, offline-first, client-side web application designed to solve the critical problem of overcrowding and patient prioritization (triage) in busy government hospital Outpatient Departments (OPDs) in India. 

It provides an explainable, rules-based advisory decision support system to empower nurses, clerks, and doctors, ensuring that critical patients are identified and treated immediately, while routine cases wait safely.

![OPD Flow Architecture](https://via.placeholder.com/800x400.png?text=OPD+Flow+-+Clinical+Triage)

> **Note:** This is an ADVISORY decision support prototype. It is NOT a diagnosis tool. It runs entirely on fictional sample data. 

## 🚀 Key Features

* **Instant Triage Engine:** Automatically assigns Priority (Immediate, Soon, Routine) based on a custom clinical rule engine (Layer 1: Symptoms, Layer 2: NEWS2, Layer 3: Risk Modifiers).
* **Role-Based Workflows:** Distinct interfaces for Admins, Doctors, Nurses, Clerks, and Patients.
* **Patient Self Check-In:** Allows patients to register themselves and get a waitlist token securely on their device.
* **Dynamic QR Codes:** Patients receive a QR code and a unique status link to track their queue position without waiting in line.
* **Cross-Tab Synchronization:** Uses `BroadcastChannel` to keep multiple open tabs in sync across the Registration Desk and Dashboard.
* **Offline & Privacy First:** No backend, no databases, no paid APIs. Everything runs in the browser via `localStorage`, ensuring maximum privacy and zero latency.
* **Cryptographic Audit Log:** Every action (Overrides, Registration, Status changes) is cryptographically hash-chained (`SHA-256`) into an immutable audit log to ensure clinical accountability.

## 🛠️ Tech Stack

* **Core Framework:** React 18, TypeScript, Vite
* **Routing:** React Router v6
* **State Management:** Zustand (with localStorage persistence)
* **Styling:** Tailwind CSS + Vanilla CSS Tokens
* **Icons & Charts:** Lucide-React, Recharts
* **Cryptography:** Web Crypto API (`PBKDF2`, `SHA-256`)

## 🏃‍♂️ Getting Started (Local Development)

Because this app is entirely client-side, setup is incredibly fast.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/aayu.git
   cd aayu
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open the App:** Navigate to `http://localhost:5173`. 
   * On first load, the app will automatically seed an Administrator account (`Admin@gmail.com` / `BioCode`).

## ☁️ Deployment (Render)

This application is perfectly suited for a **Static Site Deployment** since it requires no Node.js backend or database.

### Deploying on Render.com:

1. Create an account on [Render.com](https://render.com) and link your GitHub account.
2. Click **New +** and select **Static Site**.
3. Select this GitHub repository.
4. Configure the following settings:
   * **Name:** `opd-flow` (or your preferred name)
   * **Build Command:** `npm run build`
   * **Publish Directory:** `dist`
5. **No Environment Variables are required!** 
6. Click **Create Static Site**.

Render will build the Vite app and deploy it automatically. 

### Post-Deployment Step (Base URL):
Once deployed, log into the app as an **Admin**, go to the **Administration > Settings** tab, and update the **Public Base URL** to your new Render domain (e.g., `https://opd-flow.onrender.com`). This ensures that generated QR codes point to the correct live URL.

## 👥 Hackathon Context

This project was built to address real-world constraints in under-resourced medical facilities:
* **No reliable internet?** The app loads once and can function offline as a PWA (future scope) or rely strictly on local networks.
* **Data Privacy?** All data stays on the device.
* **High Turnover?** The UI is optimized for tablets and large touch targets to ensure nurses and clerks can operate it at high speed.
* **Explainability:** Doctors can see exactly *why* the system assigned a specific priority score via the "Why this priority?" dropdown.

---
*Built with ❤️ for better healthcare.*
# Aayu-Hackathon
