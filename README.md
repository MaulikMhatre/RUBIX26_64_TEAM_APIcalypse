
# Team-apicalypse
HEALTH IT SYSTEMS
PROJECT NAME- PHRELIS:ADVANCED MEDICAL INTELLIGENCE
TEAM NAME-Apicalypse

DEPLOYED LINK-N.A
2-minute Demonstration Video link-https://drive.google.com/file/d/1Oei6iPnm21abbFYT2fWbSiRxrPO0FJ_f/view?usp=sharing 
PPT Link-https://drive.google.com/file/d/1wH63sMR4DIt5nEqgsThxg6ZV7LjT0ftA/view?usp=sharing

# 🏥 PHRELIS – Predictive Hospital Resource & Emergency Load Intelligence System

PHRELIS is an **AI-powered hospital operating system** that performs intelligent emergency triage, dynamically allocates beds, ventilators, medical staff, and ambulances, and predicts emergency inflow to prevent hospital overload.

---

## 📌 Project Overview

Modern hospitals face:
- Emergency patient surges
- ICU bed & ventilator shortages
- Doctor and nurse overload
- Delayed ambulance dispatch
- Reactive instead of predictive operations

**PHRELIS transforms hospital operations by enabling:**
- AI-assisted emergency triage (ESI-based)
- Automated ICU / ER bed allocation
- Intelligent ventilator assignment
- Real-time doctor & staff allocation
- Smart ambulance dispatch
- Predictive emergency inflow analytics
- Live system-wide updates via WebSockets

---

## 🚀 Core Features

### 🩺 Smart Triage & Admission
- Accepts **SpO₂, heart rate, and symptoms**
- Automatically determines **ESI level**
- Assigns:
  - ICU / ER bed
  - Ventilator (critical cases)
  - Attending doctor
  - Nursing staff
- Generates AI-based clinical justification

---

### 👨‍⚕️ Staff & Doctor Allocation
- Doctors assigned based on:
  - Availability
  - Specialty relevance
  - Current workload
- Nurses allocated using safe **patient-to-staff ratios**
- Prevents staff overload and burnout
- Updates assignments in real time

---

### 🚑 Ambulance Dispatch System
- Automatically dispatches ambulances for:
  - Critical ESI-1 & ESI-2 patients
  - Emergency referrals
- Tracks:
  - Available ambulances
  - Active deployments
- Live ambulance readiness indicators


## 🧪 Usage Instructions
  
- Open the **Smart Triage Portal**.
- Enter patient vitals:
   - **SpO₂ (%)**
   - **Heart Rate (BPM)**
   - **Symptoms** (comma-separated)
- Click **Assess & Admit Patient**.
- PHRELIS automatically:
   - Assigns the **ESI triage level**
   - Allocates an **ICU / ER bed**
   - Allocates a **ventilator** for critical patients
   - Assigns an available **doctor and nursing staff**
   - Dispatches an **ambulance** if required
- All updates appear **instantly on the dashboard** via real-time synchronization.


## 🛠 Tech Stack

### Frontend
- Next.js (React)
- TypeScript
- Tailwind CSS
- WebSockets (real-time UI updates)

### Backend
- FastAPI
- SQLAlchemy ORM
- SQLite / PostgreSQL
- LangChain + Google Gemini (AI reasoning)
- WebSockets

## ⚙️ Setup & Installation Instructions

### 1️⃣ Clone the Repository
git clone https://github.com/your-username/phrelis-hospital-os.git
cd phrelis-hospital-os

### 2️⃣ Backend Setup (FastAPI)

### Navigate to the backend directory:
cd backend

### Create and activate a virtual environment:
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

### Install backend dependencies:
pip install -r requirements.txt

### Create a .env file in the backend directory:
GOOGLE_API_KEY=your_google_gemini_api_key

### Start the FastAPI server:
uvicorn main:app --reload

### Backend will run at:
http://localhost:8000

### 3️⃣ Frontend Setup (Next.js)

### Navigate to the frontend directory:
cd frontend
Install frontend dependencies:
npm install

### Start the development server:
npm run dev

### Frontend will run at:
http://localhost:3000


## Screenshots:
![landing_page](https://github.com/user-attachments/assets/c77420fd-44b3-45dc-b423-4604dec56c2b)
![dashboard_page](https://github.com/user-attachments/assets/c8feeed1-5458-449c-a675-15e7bac53ff7)
![prediction_page](https://github.com/user-attachments/assets/58e4476a-1e4e-4ab9-9185-891aad526595)
![sentiment_command_center](https://github.com/user-attachments/assets/9cd011ee-a825-4bac-892c-74685f037966)
![ERP](https://github.com/user-attachments/assets/2f9c2e42-8c35-47a9-b46c-28cdeb099eae)
![Smart Triage Portal](https://github.com/user-attachments/assets/3aca2f6c-62f6-484a-9fff-81e70a596a9c)
![Staff](https://github.com/user-attachments/assets/5ba65605-53b9-4002-be91-1ed514f4fd65)



