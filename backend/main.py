import simple_icd_10 as icd
import uvicorn
import math
import uuid
import os
from dotenv import load_dotenv

load_dotenv() # Load environment variables from .env file

from datetime import timedelta
from datetime import datetime,timezone
from typing import List, Optional
from datetime import datetime, date
from sqlalchemy import func

from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func
from passlib.context import CryptContext
from jose import jwt


from database import engine, get_db
from database import engine, get_db
import models
from inventory_service import InventoryService # [NEW] Import Service
from sqlalchemy import desc # For ordering logs

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate

load_dotenv()
models.Base.metadata.create_all(bind=engine)

# [NEW] Seed Inventory Data
def seed_inventory():
    db = next(get_db())
    items = [
        ("Ventilator Circuit", "ICU", 20, 5),
        ("Sedation Kit", "ICU", 50, 10),
        ("Trauma IV Kit", "ER", 30, 8),
        ("Saline Pack", "General", 100, 20),
        ("OR Prep Kit", "Surgery", 15, 3),
        ("Sterile Gowns", "Surgery", 200, 25),
        ("PPE Kit", "General", 100, 15),
        ("Sanitization Kit", "General", 50, 15), # [NEW]
        ("Bed Linens", "General", 100, 20),      # [NEW]
        ("Gloves", "OPD", 500, 50),              # [NEW]
        ("Tongue Depressor", "OPD", 200, 20)     # [NEW]
    ]
    for name, cat, qty, reorder in items:
        if not db.query(models.InventoryItem).filter_by(name=name).first():
            db.add(models.InventoryItem(name=name, category=cat, quantity=qty, reorder_level=reorder))
    db.commit()

def seed_doctor_rooms():
    db = next(get_db())
    rooms = [
        ("Room-101", "Dr. Sharma"),
        ("Room-102", "Dr. Varma"),
        ("Room-103", "Dr. Iyer"),
        ("Room-104", "Dr. Reddy")
    ]
    for r_id, name in rooms:
        if not db.query(models.DoctorRoom).filter_by(id=r_id).first():
            # Added current_patient_id=None
            db.add(models.DoctorRoom(
                id=r_id, 
                doctor_name=name, 
                status="IDLE", 
                current_patient_id=None
            ))
    db.commit()

def seed_partner_hospitals():
    db = next(get_db())
    # Extended mock data for Command Centre
    hospitals = [
        # ("Phrelis Core", "http://localhost:8000/api/public/status", 0.0, {"ventilators": 15, "icu_beds": 20, "on_call": ["Cardiology", "Neurology"]}),
        # ("Mercy General", "https://api.mercy-general.com/v1/status", 5.2, {"ventilators": 8, "icu_beds": 10, "on_call": ["Trauma", "Pediatrics"]}),
        # ("St. Lukes Hospital", "https://api.stlukes.org/api/status", 8.7, {"ventilators": 5, "icu_beds": 4, "on_call": ["Cardiology", "Orthopedics"]}),
        ("City Central Medical", "https://api.citycentral.med/public/capacity", 12.4, {"ventilators": 20, "icu_beds": 25, "on_call": ["Neurology", "Infectious Disease"]}),
        ("Green Valley Health", "https://gvhealth.io/api/status", 15.1, {"ventilators": 4, "icu_beds": 6, "on_call": ["General Surgery"]})
    ]
    for name, endpoint, dist, resources in hospitals:
        existing = db.query(models.PartnerHospital).filter_by(name=name).first()
        if not existing:
            db.add(models.PartnerHospital(name=name, api_endpoint=endpoint, distance_miles=dist, specialty_resources=resources))
        else:
            existing.specialty_resources = resources
    db.commit()

seed_inventory()
seed_doctor_rooms()
seed_partner_hospitals()

app = FastAPI(title="PHRELIS Hospital OS")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Temporarily allow everything to rule out CORS
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Security Config
PWD_CONTEXT = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "your_super_secret_hospital_key" 
ALGORITHM = "HS256"

class LoginRequest(BaseModel):
    staff_id: str
    password: str


class TriageDecision(BaseModel):
    esi_level: int = Field(..., ge=1, le=5, description="The ESI triage level")
    justification: str = Field(..., description="1-sentence clinical rationale")
    bed_type: str = Field(..., description="Recommended unit: ICU, ER, or Wards")
    acuity_label: str = Field(..., description="Short clinical label e.g., 'Hemodynamically Unstable'")
    recommended_actions: List[str] = Field(..., description="List of immediate medical actions")

class ICDClassification(BaseModel):
    icd_code: str
    official_description: str
    chapter_prefix: str
    confidence_score: float
    clinical_rationale: str
    triage_urgency: str # CRITICAL | URGENT | STABLE

class MedicalAgent:
    def __init__(self):
        # 2. GET API KEY EXPLICITLY
        api_key = os.getenv("GOOGLE_API_KEY")
        
        # Validation for a "Perfect" setup
        if not api_key or api_key == "your_api_key_here":
            print("❌ CRITICAL ERROR: Google API Key is missing or invalid in .env")
            self.active = False
            return
        
        try:
            # 3. PASS API KEY EXPLICITLY TO THE CONSTRUCTOR
            # Use 'api_key' parameter to ensure LangChain receives it correctly
            self.llm = ChatGoogleGenerativeAI(
                model="models/gemini-flash-latest", 
                temperature=0,
                api_key=api_key  # Pass it here explicitly
            )
            
            # Using Structured Output for Senior Dev accuracy
            self.structured_llm = self.llm.with_structured_output(TriageDecision)
            self.active = True
            print("✅ Medical AI Agent linked and active.")
        except Exception as e:
            print(f"❌ Initialization Failed: {e}")
            self.active = False
            
    async def analyze_patient(self, symptoms: List[str], vitals: dict) -> TriageDecision:
        if not self.active:
            return TriageDecision(
                esi_level=3, 
                justification="Protocol fallback: AI offline.",
                bed_type="ER",
                acuity_label="Standard Priority",
                recommended_actions=["Standard Vitals"]
            )

        system_prompt = (
    "You are a Senior Clinical Triage Decision Engine for Phrelis Hospital OS.\n\n"
    
    "### LOGIC HIERARCHY (ESI v5 Protocol):\n"
    "1. ESI 1: Immediate life-saving intervention (e.g., Code Blue, Full Obstruction).\n"
    "2. ESI 2: High-risk situation (e.g., Active Chest Pain, Stroke signs, SpO2 < 90%).\n"
    "3. ESI 3: Stable, requires multiple resources (Labs + IV + Imaging).\n"
    "4. ESI 4: Stable, requires one resource (e.g., simple X-ray, sutures).\n"
    "5. ESI 5: Stable, requires zero resources (e.g., prescription refill).\n\n"

    "### CLINICAL CORRELATION LOGIC:\n"
    "Analyze symptoms for underlying nutritional or systemic deficiencies:\n"
    " - Paresthesia (Tingling/Numbness) in fingers/toes: Assess for Vitamin B12 deficiency or Peripheral Neuropathy.\n"
    " - Extreme Fatigue + Pallor: Assess for Iron-deficiency Anemia.\n"
    " - Polyuria + Polydipsia: Assess for Hyperglycemia/Diabetes.\n\n"

    "### OUTPUT REQUIREMENTS:\n"
    "Return a JSON object only. The 'clinical_justification' must follow this format:\n"
    "'Level [X] assigned. Symptoms of [Symptom] suggest potential [Condition] (e.g., B12 deficiency), "
    "requiring [Resource Name] to prevent [Complication].'\n\n"

    "### CONSTRAINTS:\n"
    " - Map ESI 1-2 -> ICU | ESI 3 -> ER | ESI 4-5 -> Wards.\n"
    " - RETURN ONLY JSON: {'esi_level': int, 'location': str, 'clinical_justification': str}"
)
        
        user_input = f"Symptoms: {symptoms}. Vitals: {vitals}."
        
        try:
            # We call the structured LLM directly
            return await self.structured_llm.ainvoke([
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_input}
            ])
        except Exception as e:
            print(f"AI Execution Error: {e}")
            # Reliable safety fallback for a medical app
            return TriageDecision(
                esi_level=3, 
                justification="Safety fallback due to system error.", 
                bed_type="ER",
                acuity_label="System Alert",
                recommended_actions=["Manual Triage Required"]
            )

    async def classify_icd(self, complaint: str, symptoms: List[str]) -> ICDClassification:
        if not self.active:
            return ICDClassification(
                icd_code="R69",
                official_description="Illness, unspecified",
                chapter_prefix="R",
                confidence_score=0.5,
                clinical_rationale="AI offline.",
                triage_urgency="STABLE"
            )

        system_prompt = (
            "You are the Phrelis OS Clinical Intelligence Core, a high-precision medical classification engine. "
            "Your purpose is to map unstructured patient data to the ICD-10-CM (2026 Edition) ontology for real-time triage prioritization.\\n\\n"
            "OPERATIONAL LOGIC:\\n"
            "1. Anatomical Mapping: Identify the primary system (e.g., I=Circulatory, J=Respiratory, G=Nervous).\\n"
            "2. Acuity Assessment: If keywords like 'sudden', 'sharp', 'crushing', or 'severe' are present, prioritize Acute classifications.\\n"
            "3. Specificity Rule: If data is insufficient for a 7-character code, provide the most accurate 3-to-5 character category (e.g., I21.9 for unspecified MI).\\n\\n"
            "Return a JSON object following the ICDClassification schema accurately."
        )
        
        user_input = f"Primary Complaint: {complaint}. Supporting Symptoms: {symptoms}."
        
        try:
            # Create a specialized structured LLM for ICD classification
            structured_icd = self.llm.with_structured_output(ICDClassification)
            return await structured_icd.ainvoke([
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_input}
            ])
        except Exception as e:
            print(f"ICD Classification Error: {e}")
            return ICDClassification(
                icd_code="R68.89",
                official_description="Other specified general symptoms and signs",
                chapter_prefix="R",
                confidence_score=0.0,
                clinical_rationale=f"Fallback due to processing error: {str(e)[:50]}",
                triage_urgency="STABLE"
            )

# 4. INITIALIZE THE AGENT AFTER LOAD_DOTENV()
ai_agent = MedicalAgent()

# Connection Manager for WebSockets 
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try: await connection.send_json(message)
            except: pass

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# --- Pydantic Models ---
class AdmissionRequest(BaseModel):
    bed_id: str
    patient_name: str
    patient_age: int
    gender: str
    condition: str
    staff_id: str

class TriageRequest(BaseModel):
    patient_name: str
    patient_age: int
    gender: str
    symptoms: List[str]
    vitals: Optional[dict] = {}

class AmbulanceRequest(BaseModel):
    severity: str 
    location: str
    eta: int

class StaffClockIn(BaseModel):
    staff_id: str

class StaffAssign(BaseModel):
    staff_id: str
    bed_id: str
    role: str 

class TaskUpdate(BaseModel):
    task_id: int
    status: str

class EventCreate(BaseModel):
    patient_id: str
    event_type: str
    details: Optional[str] = None

class PredictionCreate(BaseModel):
    prediction_text: str
    target_department: str
    predicted_delay_minutes: int

# Surgery Specific Models
class SurgeryStartRequest(BaseModel):
    bed_id: str
    patient_name: str
    patient_age: int
    surgeon_name: str
    duration_minutes: int

class SurgeryExtendRequest(BaseModel):
    additional_minutes: int

# OPD Queue Models
class QueueCheckInRequest(BaseModel):
    patient_name: str
    patient_age: int
    gender: str
    base_acuity: int # 1-5
    vitals: dict # {hr, bp, spo2}
    symptoms: List[str]
    icd_code: Optional[str] = None
    icd_rationale: Optional[str] = None
    triage_urgency: Optional[str] = None
#  Admin ERP Endpoints 


# Logic to generate smart tasks based on condition
def generate_smart_tasks(db: Session, bed_id: str, condition: str,patient_id: str = None):
    tasks = []
    now = datetime.utcnow()
    
    # Ensure condition is a string to prevent errors
    cond_lower = str(condition).lower() if condition else ""

    if "critical" in cond_lower or "resuscitation" in cond_lower:
        tasks = [
            models.Task(bed_id=bed_id,patient_id=patient_id, description="Q15m Vital Signs Monitor", due_time=now + timedelta(minutes=15), priority="Critical"),
            models.Task(bed_id=bed_id,patient_id=patient_id, description="Check Arterial Line / IV Patency", due_time=now + timedelta(hours=1), priority="High"),
            models.Task(bed_id=bed_id,patient_id=patient_id, description="Emergency Meds Preparation", due_time=now + timedelta(minutes=30), priority="Critical")
        ]
    elif "pre-surgery" in cond_lower or "pre sugrey" in cond_lower:
        tasks = [
            models.Task(bed_id=bed_id,patient_id=patient_id, description="Confirm NPO Status", due_time=now + timedelta(hours=1), priority="High"),
            models.Task(bed_id=bed_id,patient_id=patient_id, description="Verify Surgical Consent", due_time=now + timedelta(hours=2), priority="Medium")
        ]
    elif "observation" in cond_lower:
        tasks = [
            models.Task(bed_id=bed_id,patient_id=patient_id, description="Hourly Neuro Check", due_time=now + timedelta(hours=1), priority="Medium")
        ]
    else: # Stable
        tasks = [
            models.Task(bed_id=bed_id,patient_id=patient_id, description="Routine Ward Rounds", due_time=now + timedelta(hours=4), priority="Low")
        ]
    
    if tasks:
        db.add_all(tasks)
        db.commit()

@app.get("/api/tasks/sync-all")
async def sync_existing_patients(db: Session = Depends(get_db)):
    # Find all occupied beds
    occupied_beds = db.query(models.BedModel).filter(models.BedModel.is_occupied == True).all()
    
    for bed in occupied_beds:
        # Check if tasks already exist to avoid duplicates
        existing_tasks = db.query(models.Task).filter(models.Task.bed_id == bed.id, models.Task.status == "Pending").first()
        
        if not existing_tasks:
            # Use the protocol function
            generate_smart_tasks(db, bed.id, bed.condition or "Stable")
            
    # Tell the frontend to update via WebSocket
    await manager.broadcast({"type": "REFRESH_RESOURCES"})
    return {"message": f"Tasks generated for {len(occupied_beds)} patients"}



@app.post("/api/login")
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    # Look for the staff member
    staff = db.query(models.Staff).filter(models.Staff.id == request.staff_id).first()
    
    if not staff:
        raise HTTPException(status_code=404, detail="Staff ID not found in database")
    
    # Generate token (ignoring password for now to get you inside)
    access_token = jwt.encode({
        "sub": staff.id, 
        "role": staff.role,
        "exp": datetime.utcnow() + timedelta(hours=8)
    }, SECRET_KEY, algorithm=ALGORITHM)
    
    return {
        "access_token": access_token, 
        "role": staff.role, 
        "staff_id": staff.id
    }


@app.post("/api/erp/admit")
async def admit_patient(request: AdmissionRequest, db: Session = Depends(get_db)):
    # 1. Find the bed with a lock to prevent double-booking
    bed = db.query(models.BedModel).filter(models.BedModel.id == request.bed_id).with_for_update().first()
    
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found")

    # 2. Robust Safety Checks
    # Check Gender Compatibility for Medical Wards
    if getattr(bed, 'unit', None) == "Medical Ward" and getattr(bed, 'gender', 'Any') != "Any":
        # Standardizing input: 'Other' and 'Male' go to 'M'
        target_gender = "M" if request.gender in ["Male", "Other"] else "F"
        if bed.gender != target_gender:
            raise HTTPException(
                status_code=400, 
                detail=f"Clinical Safety Alert: This bed is reserved for {bed.gender} patients."
            )
    
    # Infection Control Override
    infectious_keywords = ["fever", "cough", "contagious", "pathogen", "isolation", "infectious"]
    is_infectious = any(k in request.condition.lower() for k in infectious_keywords)
    
    if is_infectious and getattr(bed, 'unit', None) != "Isolation":
         raise HTTPException(
             status_code=400, 
             detail="Infection Control: Infectious patients must be admitted to an Isolation Unit."
         )

    # Occupancy check
    if bed.is_occupied:
         raise HTTPException(status_code=400, detail=f"Bed {bed.id} is already occupied.")

    # 3. Update Bed Data
    bed.is_occupied = True
    bed.patient_name = request.patient_name
    bed.condition = request.condition
    bed.status = "OCCUPIED" 
    bed.admission_time = datetime.utcnow() # Track for IST normalization

    if hasattr(bed, 'patient_age'): 
        bed.patient_age = request.patient_age

    # 4. Create Persistent Patient Record
    new_patient_id = str(uuid.uuid4())
    new_record = models.PatientRecord(
        id=new_patient_id,
        bed_id=request.bed_id,
        gender=request.gender, # Save gender for the record
        esi_level=3, 
        acuity="Direct Admission",
        symptoms=[request.condition],
        timestamp=datetime.utcnow(),
        patient_name=request.patient_name,
        patient_age=request.patient_age,
        condition=request.condition,
        assigned_staff=request.staff_id
    )
    
    try:
        db.add(new_record)
        db.commit()
        db.refresh(bed)
        
        # 5. Trigger Smart Worklist & Real-time Sync
        generate_smart_tasks(db, bed.id, request.condition, patient_id=new_patient_id)

        # 6. INVENTORY SYNC
        # Determine context based on bed type (ICU/ER/Wards)
        inv_context = bed.type if bed.type in ["ICU", "ER"] else "Wards"
        await InventoryService.process_usage(
            db, manager, inv_context, 
            {"patient_name": request.patient_name, "bed_id": bed.id, "condition": request.condition}
        )
        
        await manager.broadcast({
            "type": "BED_UPDATE", 
            "bed_id": bed.id, 
            "new_status": "OCCUPIED",
            "patient_gender": request.gender
        })
        
        return {"message": "Admission Successful", "bed_id": bed.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database Sync Failed: {str(e)}")


@app.post("/api/tasks/complete/{task_id}")
async def complete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Update status to something that WON'T match the dashboard filter
    task.status = "Completed"
    task.completed_at = datetime.utcnow()
    
    db.commit()
    db.refresh(task) # Ensure the object is updated with DB state
    
    # CRITICAL: If you have a WebSocket manager, broadcast the refresh
    # This tells the frontend "Something changed, re-fetch your data!"
    try:
        await manager.broadcast({"type": "REFRESH_RESOURCES"})
    except:
        pass # Fallback if manager isn't initialized
        
    return {"status": "success", "task_id": task_id}


@app.get("/api/erp/beds")
def list_beds(db: Session = Depends(get_db)):
    return db.query(models.BedModel).all()

@app.post("/api/erp/discharge/{bed_id}")
async def discharge(bed_id: str, db: Session = Depends(get_db)):
    bed = db.query(models.BedModel).filter(models.BedModel.id == bed_id).first()
    if bed:
        # Update History Record (Find latest record for this patient)
        if bed.patient_name:
            history_record = db.query(models.PatientRecord).filter(
                models.PatientRecord.patient_name == bed.patient_name,
                models.PatientRecord.discharge_time == None
            ).order_by(models.PatientRecord.timestamp.desc()).first()
            
            if history_record:
                history_record.discharge_time = datetime.utcnow()
        
        db.query(models.Task).filter(
            models.Task.bed_id == bed_id, 
            models.Task.status == "Pending"
        ).update({"status": "Cancelled"}) # Or delete them

        bed.is_occupied = False
        bed.status = "DIRTY"
        bed.patient_name = None
        bed.patient_age = None
        bed.condition = None
        bed.ventilator_in_use = False
        db.commit()
        
        await manager.broadcast({
            "type": "BED_UPDATE", 
            "bed_id": bed.id, 
            "new_status": "DIRTY",
            "color_code": bed.get_color_code()
        })
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="Bed not found")


@app.post("/api/erp/beds/{bed_id}/start-cleaning")
async def start_cleaning(bed_id: str, db: Session = Depends(get_db)):
    bed = db.query(models.BedModel).filter(models.BedModel.id == bed_id).first()
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found")
        
    bed.status = "CLEANING"
    db.commit()
    
    # [NEW] Inventory Usage for Cleaning
    await InventoryService.process_usage(
        db, manager, "Cleaning", 
        {"patient_name": "Bed Turnover", "bed_id": bed.id, "condition": "Standard Cleaning"}
    )

    await manager.broadcast({
        "type": "BED_UPDATE", 
        "bed_id": bed.id, 
        "new_status": "CLEANING",
        "color_code": bed.get_color_code()
    })
    return {"status": "success"}

@app.post("/api/erp/beds/{bed_id}/cleaning-complete")
async def cleaning_complete(bed_id: str, db: Session = Depends(get_db)):
    bed = db.query(models.BedModel).filter(models.BedModel.id == bed_id).first()
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found")
        
    bed.status = "AVAILABLE"
    # Ensure is_occupied is false just in case
    bed.is_occupied = False 
    db.commit()
    
    await manager.broadcast({
        "type": "BED_UPDATE", 
        "bed_id": bed.id, 
        "new_status": "AVAILABLE",
        "color_code": bed.get_color_code()
    })
    return {"status": "success"}



# --- Surgery Unit Logic ---
@app.post("/api/surgery/start")
async def start_surgery(request: SurgeryStartRequest, db: Session = Depends(get_db)):
    bed = db.query(models.BedModel).filter(models.BedModel.id == request.bed_id).first()
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found")
    
    now = datetime.now(timezone.utc)
    
    bed.patient_name = request.patient_name
    bed.surgeon_name = request.surgeon_name
    bed.patient_age = request.patient_age
    bed.admission_time = now
    
    # Logic Fix: Handle the 0 duration case cleanly
    iso_time = None
    if request.duration_minutes > 0:
        bed.expected_end_time = now + timedelta(minutes=request.duration_minutes)
        iso_time = bed.expected_end_time.isoformat().replace("+00:00", "Z")
    else:
        bed.expected_end_time = None
    
    bed.current_state = "OCCUPIED"
    bed.status = "OCCUPIED"
    bed.is_occupied = True
    
    db.commit()
    db.refresh(bed)

    # REMOVED the duplicate iso_time assignment that was causing the crash

    await manager.broadcast({
        "type": "SURGERY_UPDATE",
        "bed_id": bed.id,
        "state": "OCCUPIED",
        "patient_name": bed.patient_name,
        "expected_end_time": iso_time
    })

    # [NEW] Inventory Hook
    await InventoryService.process_usage(
        db, manager, "Surgery", 
        {"patient_name": bed.patient_name, "bed_id": bed.id, "condition": "Surgery Start"}
    )

    return {"status": "started", "end_time": iso_time}

from datetime import datetime, timezone, timedelta

@app.post("/api/surgery/extend/{bed_id}")
async def extend_surgery(bed_id: str, request: SurgeryExtendRequest, db: Session = Depends(get_db)):
    bed = db.query(models.BedModel).filter(models.BedModel.id == bed_id).first()
    if not bed: raise HTTPException(404, "Bed not found")
    
    now = datetime.now(timezone.utc)

    if bed.expected_end_time and bed.expected_end_time.tzinfo is None:
        bed.expected_end_time = bed.expected_end_time.replace(tzinfo=timezone.utc)

    if not bed.expected_end_time or bed.expected_end_time < now:
        bed.expected_end_time = now + timedelta(minutes=request.additional_minutes)
    else:
        bed.expected_end_time += timedelta(minutes=request.additional_minutes)
    
    bed.current_state = "OCCUPIED"
    bed.status = "OCCUPIED"
    db.commit()
    db.refresh(bed)

    # FIX: Use replace to ensure a clean 'Z' for the frontend
    iso_time = bed.expected_end_time.isoformat().replace("+00:00", "Z")

    await manager.broadcast({
        "type": "SURGERY_EXTENDED",
        "bed_id": bed.id,
        "state": "OCCUPIED",
        "expected_end_time": iso_time
    })
    return {"status": "extended", "new_end_time": iso_time}



@app.post("/api/surgery/complete/{bed_id}")
async def complete_surgery(bed_id: str, db: Session = Depends(get_db)):
    bed = db.query(models.BedModel).filter(models.BedModel.id == bed_id).first()
    if not bed: raise HTTPException(404, "Bed not found")
    
    actual_end_time = datetime.now(timezone.utc)
    start_time = bed.admission_time
    if start_time and start_time.tzinfo is None:
        start_time = start_time.replace(tzinfo=timezone.utc)
    
    if not start_time:
        start_time = actual_end_time

    # Calculate metrics for history
    total_duration = (actual_end_time - start_time).total_seconds() / 60
    overtime = 0
    if bed.expected_end_time:
        expected = bed.expected_end_time
        if expected.tzinfo is None: expected = expected.replace(tzinfo=timezone.utc)
        if actual_end_time > expected:
            overtime = (actual_end_time - expected).total_seconds() / 60
            
    history_entry = models.SurgeryHistory(
        room_id=bed.id,
        patient_name=bed.patient_name or "Unknown Patient",
        patient_age=bed.patient_age,
        surgeon_name=bed.surgeon_name or "Unknown Surgeon",
        start_time=start_time,
        end_time=actual_end_time,
        total_duration_minutes=int(total_duration),
        overtime_minutes=int(overtime) if overtime > 0 else 0
    )
    
    db.add(history_entry)
    
    bed.current_state = "DIRTY"
    bed.status = "DIRTY"
    bed.admission_time = None 
    bed.expected_end_time = None 
    # Optional: Clear these if you want the "Dirty" card to be anonymous
   
    db.commit()
    
    await manager.broadcast({
        "type": "SURGERY_UPDATE", 
        "bed_id": bed.id, 
        "state": "DIRTY",
        "patient_name": bed.patient_name,
        "surgeon_name": bed.surgeon_name,
        "expected_end_time": None
    })
    return {"status": "completed"}

@app.post("/api/surgery/release/{bed_id}")
async def release_surgery_room(bed_id: str, db: Session = Depends(get_db)):
    bed = db.query(models.BedModel).filter(models.BedModel.id == bed_id).first()
    if not bed: 
        raise HTTPException(404, "Bed not found")
    
    # FULL RESET of all fields to prevent data leaking to the next patient
    bed.current_state = "AVAILABLE"
    bed.status = "AVAILABLE"
    bed.is_occupied = False
    bed.patient_name = None
    bed.patient_age = None
    bed.surgeon_name = None
    bed.admission_time = None 
    bed.expected_end_time = None 
    
    db.commit()
    
    await manager.broadcast({
        "type": "ROOM_RELEASED",
        "bed_id": bed.id,
        "state": "AVAILABLE",
        "expected_end_time": None 
    })
    return {"status": "released"}

@app.post("/api/triage/assess")
async def assess_patient(request: TriageRequest, db: Session = Depends(get_db)):
    # 1. Ask Gemini for clinical decision (ESI Level & Target Unit)
    # Gemini returns "ICU", "ER", or "Wards"
    decision = await ai_agent.analyze_patient(request.symptoms, request.vitals)
    
    level = decision.esi_level
    bed_type = decision.bed_type 
    
    # 2. Gender Logic for Wards
    # Requirements: 'Other' and 'Male' go to Male Ward ('M'). 'Female' goes to Female Ward ('F').
    target_bed_gender = "M" if request.gender in ["Male", "Other"] else "F"
    
    # 3. Critical System Check (Ventilator Requirement)
    spo2 = request.vitals.get("spo2", 100)
    ventilator_needed = spo2 < 88 and level <= 2
    
    # 4. Find Available Bed with Database Locking
    query = db.query(models.BedModel).filter(
        models.BedModel.type == bed_type, 
        models.BedModel.is_occupied == False,
        models.BedModel.status == "AVAILABLE"
    )

    # Apply Gender Constraint ONLY if the target is a Ward
    # ICU and ER remain gender-neutral for emergency speed
    if bed_type == "Wards":
        query = query.filter(models.BedModel.gender == target_bed_gender)

    # Use with_for_update to prevent race conditions during high-concurrency
    bed = query.with_for_update(skip_locked=True).first()

    # 5. Create Patient Record
    new_patient_id = str(uuid.uuid4())
    new_record = models.PatientRecord(
        id=new_patient_id,
        esi_level=level,
        acuity=bed_type,
        gender=request.gender, # Audit trail
        symptoms=request.symptoms,
        timestamp=datetime.utcnow(),
        patient_name=request.patient_name, 
        patient_age=request.patient_age,
        condition=f"ESI {level}: {decision.justification}"
    )
    db.add(new_record)

    assigned_id = "WAITING_LIST"
    
    # 6. Final Allocation
    if bed:
        bed.is_occupied = True
        bed.status = "OCCUPIED"
        bed.patient_name = request.patient_name
        bed.condition = new_record.condition
        bed.ventilator_in_use = ventilator_needed
        assigned_id = bed.id
        
        # Trigger Smart Nursing Worklist tasks
        generate_smart_tasks(db, bed.id, bed.condition, patient_id=new_patient_id)

    db.commit()

    # 7. Real-time Broadcast to Dashboard
    await manager.broadcast({
        "type": "NEW_ADMISSION", 
        "bed_id": assigned_id,
        "patient_gender": request.gender,
        "is_critical": level <= 2
    })

    # [NEW] Inventory Hook for Triage Admissions
    if bed:
        # Determine context based on the assigned bed type
        inv_context = bed.type if bed.type in ["ICU", "ER"] else "Wards"
        
        # Trigger inventory deduction shared logic
        await InventoryService.process_usage(
            db, manager, inv_context, 
            {
                "patient_name": request.patient_name, 
                "bed_id": bed.id, 
                "condition": new_record.condition # Contains "ESI X: Justification"
            }
        )

    return {
        "patient_name": request.patient_name,  # Added
        "acuity": bed_type,                    # Added (e.g., "ICU", "ER", "Wards")
        "patient_name": request.patient_name,
        "patient_age": request.patient_age,
        "esi_level": level,
        "esi_level": level,
        "acuity": f"Priority {level}: {decision.acuity_label}",
        "assigned_bed": assigned_id,
        "ai_justification": decision.justification,
        "recommended_actions": decision.recommended_actions,
        "patient_age": request.patient_age
    }



@app.get("/api/history/day/{target_date}")
def get_history_by_day(target_date: date, db: Session = Depends(get_db)):
    records = db.query(models.PatientRecord).filter(
        func.date(models.PatientRecord.timestamp) == target_date
    ).order_by(models.PatientRecord.timestamp.desc()).all()
    
    # Return directly; FastAPI's JSONEncoder handles Datetime objects 
    # but ensure they include timezone info if possible.
    return records

@app.get("/api/history/surgery")
def get_surgery_history(db: Session = Depends(get_db)):
    try:
        # Fetching end_time for surgery
        history = db.query(models.SurgeryHistory).order_by(models.SurgeryHistory.end_time.desc()).all()
        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history/opd")
def get_opd_history(db: Session = Depends(get_db)):
    try:
        records = db.query(models.PatientQueue).filter(
            models.PatientQueue.status == "COMPLETED"
        ).order_by(models.PatientQueue.check_in_time.desc()).all()
        return records
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# --- OPD Triage & Queue Logic ---


# --- Integrated ICD-10 Priority Logic ---

# Chapter-based weights (Industry standard approach)
ICD_CHAPTER_WEIGHTS = {
    "I": 40,  # Circulatory System
    "J": 35,  # Respiratory System
    "S": 30,  # Injury, poisoning (Trauma)
    "T": 30,  # External causes
    "G": 25,  # Nervous system
    "A": 15,  # Infectious and parasitic
    "B": 15,  # Infectious and parasitic
    "E": 20,  # Endocrine/Metabolic
    "L": 5,   # Skin diseases (Lower priority)
}

def calculate_priority_index(patient: models.PatientQueue):
    """
    Phrelis Triage Algorithm v2.5 (ICD-10 Integrated)
    """
    # 1. Base ESI: (6 - Level) * 20
    score = (6 - patient.base_acuity) * 20
    
    # 2. ICD-10 Dynamic Weighting [INTEGRATED]
    if hasattr(patient, 'icd_code') and patient.icd_code:
        # Validate using simple_icd_10 library
        if icd.is_valid_item(patient.icd_code):
            chapter = patient.icd_code[0].upper()
            chapter_bonus = ICD_CHAPTER_WEIGHTS.get(chapter, 10)
            score += chapter_bonus
            
    # 3. Standard Symptom Bonuses (Fallback/Addition)
    symptoms_lower = [s.lower() for s in (patient.symptoms or [])]
    if any("chest pain" in s for s in symptoms_lower): score += 25
    if any("shortness of breath" in s for s in symptoms_lower): score += 20
    
    # 4. Anti-Starvation (Wait-Time Compensation)
    wait_time_mins = (datetime.utcnow() - patient.check_in_time).total_seconds() / 60
    score += (wait_time_mins // 2)
    
    return float(score)

# --- Updated API Endpoints ---

@app.get("/api/queue/icd-validate")
def validate_icd(code: str):
    """
    Bio-Intake Helper: Validates a code and returns the medical description.
    """
    is_valid = icd.is_valid_item(code)
    return {
        "valid": is_valid,
        "description": icd.get_description(code) if is_valid else "Unknown Medical Code",
        "chapter": code[0].upper() if is_valid else None
    }

@app.post("/api/queue/checkin")
async def queue_checkin(request: QueueCheckInRequest, db: Session = Depends(get_db)):
    """
    Enhanced Check-in: Now accepts ICD-10 codes from the nurse's bio-intake form.
    """
    new_id = str(uuid.uuid4())
    
    # Ensure the icd_code is part of your QueueCheckInRequest Pydantic model
    patient = models.PatientQueue(
        id=new_id,
        patient_name=request.patient_name,
        patient_age=request.patient_age,
        gender=request.gender,
        base_acuity=request.base_acuity,
        icd_code=request.icd_code, # [INTEGRATED]
        icd_rationale=request.icd_rationale,
        triage_urgency=request.triage_urgency,
        vitals=request.vitals,
        symptoms=request.symptoms,
        check_in_time=datetime.utcnow(),
        status="WAITING"
    )
    
    db.add(patient)
    db.commit()
    db.refresh(patient)
    
    # Calculate initial score based on ICD-10 + ESI
    patient.priority_score = calculate_priority_index(patient)
    db.commit()
    
    await manager.broadcast({"type": "QUEUE_UPDATE"})
    return {"status": "success", "patient_id": new_id, "priority_score": patient.priority_score}

@app.post("/api/clinical/classify")
async def clinical_classify(request: dict):
    """
    Phrelis OS Clinical Intelligence Core: Map unstructured data to ICD-10.
    """
    complaint = request.get("complaint", "")
    symptoms = request.get("symptoms", [])
    if isinstance(symptoms, str):
        symptoms = [s.strip() for s in symptoms.split(",")]
    
    classification = await ai_agent.classify_icd(complaint, symptoms)
    return classification

@app.get("/api/queue/sorted")
def get_sorted_queue(db: Session = Depends(get_db)):
    """
    Real-time Orchestration Hub: Recalculates all scores to 
    account for growing wait times.
    """
    patients = db.query(models.PatientQueue).filter(models.PatientQueue.status == "WAITING").all()
    
    for p in patients:
        p.priority_score = calculate_priority_index(p)
    
    db.commit() 
    
    # Sort by Priority Score (Descending)
    sorted_patients = sorted(patients, key=lambda x: x.priority_score, reverse=True)
    
    # Surge Logic
    avg_score = sum(p.priority_score for p in sorted_patients) / len(sorted_patients) if sorted_patients else 0
    surge_warning = avg_score > 105 # Critical threshold

    return {
        "patients": sorted_patients,
        "surge_warning": surge_warning,
        "average_score": avg_score,
        "system_status": "CRITICAL" if surge_warning else "STABLE"
    }

# --- Internal ICD-10 Search Helper (For Demo) ---
@app.get("/api/queue/icd-search")
def search_icd_codes(query: str):
    """
    Simulated ICD-10 Lookup Service.
    In a real app, this would hit an external library or ICD-10 database.
    """
    # Example mock data
    mock_codes = [
        {"code": "I21.9", "desc": "Acute Myocardial Infarction (Heart Attack)"},
        {"code": "J44.9", "desc": "Chronic Obstructive Pulmonary Disease (COPD)"},
        {"code": "S06.0X1A", "desc": "Concussion, Initial Encounter"},
        {"code": "L03.90", "desc": "Cellulitis, Unspecified"}
    ]
    return [c for c in mock_codes if query.lower() in c['desc'].lower() or query.lower() in c['code'].lower()]




# def calculate_priority_index(patient: models.PatientQueue):
#     """
#     ESI Score: (6 - baseAcuity) * 20 points.
#     Symptom Weights: Bonus points for 'Chest Pain' (+25), 'Shortness of Breath' (+20), 'Fever' (+10).
#     Wait-Time Compensation: +1 point for every 2 minutes spent in the queue.
#     """
#     score = (6 - patient.base_acuity) * 20
    
#     # Symptom Bonuses
#     symptoms_lower = [s.lower() for s in (patient.symptoms or [])]
#     if any("chest pain" in s for s in symptoms_lower): score += 25
#     if any("shortness of breath" in s or "sob" in s for s in symptoms_lower): score += 20
#     if any("fever" in s for s in symptoms_lower): score += 10
    
#     # Wait Time Compensation
#     wait_time_mins = (datetime.utcnow() - patient.check_in_time).total_seconds() / 60
#     score += (wait_time_mins // 2)
    
#     return float(score)

# @app.post("/api/queue/checkin")
# async def queue_checkin(request: QueueCheckInRequest, db: Session = Depends(get_db)):
#     new_id = str(uuid.uuid4())
#     patient = models.PatientQueue(
#         id=new_id,
#         patient_name=request.patient_name,
#         patient_age=request.patient_age,
#         gender=request.gender,
#         base_acuity=request.base_acuity,
#         vitals=request.vitals,
#         symptoms=request.symptoms,
#         check_in_time=datetime.utcnow(),
#         status="WAITING"
#     )
#     db.add(patient)
#     db.commit()
#     db.refresh(patient)
    
#     # Calculate initial score
#     patient.priority_score = calculate_priority_index(patient)
#     db.commit()
    
#     await manager.broadcast({"type": "QUEUE_UPDATE"})
#     return {"status": "success", "patient_id": new_id}

# @app.get("/api/queue/sorted")
# def get_sorted_queue(db: Session = Depends(get_db)):
#     patients = db.query(models.PatientQueue).filter(models.PatientQueue.status == "WAITING").all()
    
#     # Recalculate scores on the fly for real-time wait-time compensation
#     for p in patients:
#         p.priority_score = calculate_priority_index(p)
    
#     db.commit() # Save updated scores
    
#     # Re-fetch sorted (or just sort in memory)
#     sorted_patients = sorted(patients, key=lambda x: x.priority_score, reverse=True)
    
#     # Add Surge Warning logic
#     avg_score = sum(p.priority_score for p in sorted_patients) / len(sorted_patients) if sorted_patients else 0
#     surge_warning = avg_score > 100 # Example threshold

#     return {
#         "patients": sorted_patients,
#         "surge_warning": surge_warning,
#         "average_score": avg_score
#     }

@app.get("/api/queue/rooms")
def get_doctor_rooms(db: Session = Depends(get_db)):
    return db.query(models.DoctorRoom).all()

@app.post("/api/queue/call/{patient_id}")
async def call_to_room(
    patient_id: str, 
    room_id: str = Query(...), # Explicitly tell FastAPI this is a query param (?room_id=...)
    db: Session = Depends(get_db)
):
    patient = db.query(models.PatientQueue).filter(models.PatientQueue.id == patient_id).first()
    room = db.query(models.DoctorRoom).filter(models.DoctorRoom.id == room_id).first()
    
    if not patient or not room:
        raise HTTPException(status_code=404, detail="Patient or Room not found")
        
    if room.status == "ACTIVE":
        raise HTTPException(status_code=400, detail="Room is already active")

    # 1. Update Patient Status
    patient.status = "CONSULTATION"
    # Ensure your PatientQueue model has 'assigned_room' column
    if hasattr(patient, 'assigned_room'):
        patient.assigned_room = room_id
    
    # 2. Update Room Status (Linking the patient to the room)
    room.status = "ACTIVE"
    room.current_patient_id = patient_id
    
    db.commit()
    
    # 3. Trigger Inventory Hook
    # Safety check for patient name field (standardizing names)
    p_name = getattr(patient, "patient_name", "Unknown Patient")
    
    try:
        await InventoryService.process_usage(
            db, manager, "OPD_Consultation", 
            {"patient_name": p_name, "id": patient.id, "condition": "OPD Consult"}
        )
    except Exception as e:
        print(f"Inventory hook failed but continuing: {e}")
    
    # 4. Global Broadcasts
    await manager.broadcast({"type": "QUEUE_UPDATE"})
    await manager.broadcast({"type": "ROOM_UPDATE", "room_id": room_id, "status": "ACTIVE"})
    
    return {"status": "called", "room_id": room_id, "patient_id": patient_id}

@app.post("/api/queue/complete/{room_id}")
async def complete_consultation(room_id: str, db: Session = Depends(get_db)):
    # 1. Fetch the room
    room = db.query(models.DoctorRoom).filter(models.DoctorRoom.id == room_id).first()
    
    if not room:
        raise HTTPException(status_code=404, detail="Room configuration not found")
        
    if room.status == "IDLE":
        return {"status": "already_idle", "message": "Room is not currently occupied"}

    # 2. Identify and update the patient
    # We use getattr as a safety measure while you transition your DB schema
    patient_id = getattr(room, "current_patient_id", None)
    
    if patient_id:
        patient = db.query(models.PatientQueue).filter(models.PatientQueue.id == patient_id).first()
        if patient:
            patient.status = "COMPLETED"
            # Logic: If you want to free up a bed in the ward automatically, add it here.

    # 3. Reset the room status
    room.status = "IDLE"
    if hasattr(room, "current_patient_id"):
        room.current_patient_id = None
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Database Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update database")

    # 4. Real-time Broadcast to Frontend
    # This triggers the 'mutateQueue' and 'mutateRooms' in your Next.js page
    await manager.broadcast({"type": "QUEUE_UPDATE"})
    await manager.broadcast({
        "type": "ROOM_UPDATE", 
        "room_id": room_id, 
        "status": "IDLE"
    })
    
    return {"status": "completed", "room_id": room_id}

@app.get("/api/external/capacity")
def get_external_capacity(db: Session = Depends(get_db)):
    """Anonymized bed availability and patient load data"""
    total_beds = db.query(models.BedModel).count()
    occupied_beds = db.query(models.BedModel).filter(models.BedModel.is_occupied == True).count()
    opd_waiting = db.query(models.PatientQueue).filter(models.PatientQueue.status == "WAITING").count()
    
    return {
        "hospital_name": "Phrelis General",
        "bed_capacity": total_beds,
        "beds_available": total_beds - occupied_beds,
        "opd_load": opd_waiting,
        "timestamp": datetime.utcnow()
    }

# --- Infrastructure ---

# [NEW] Inventory Endpoint
@app.get("/api/erp/inventory")
def get_inventory(db: Session = Depends(get_db)):
    return db.query(models.InventoryItem).all()

@app.get("/api/inventory/forecast")
def get_inventory_forecast(db: Session = Depends(get_db)):
    """
    Predictive Engine: Calculates burn rate and exhaustion time.
    """
    # 1. Calculate Hospital Load Multiplier
    total_beds = db.query(models.BedModel).count() or 1
    occupied_beds = db.query(models.BedModel).filter(models.BedModel.is_occupied == True).count()
    occupancy_rate = occupied_beds / total_beds
    
    # Dynamic Weighting: Global 1.2x overhead if hospital is busy (>80%)
    load_multiplier = 1.2 if occupancy_rate > 0.8 else 1.0
    
    items = db.query(models.InventoryItem).all()
    forecast_data = []
    
    now = datetime.utcnow()
    six_hours_ago = now - timedelta(hours=6)
    
    for item in items:
        # 2. Historical Windowing (Last 6 Hours)
        logs = db.query(models.InventoryLog).filter(
            models.InventoryLog.item_id == item.id,
            models.InventoryLog.timestamp >= six_hours_ago
        ).all()
        
        total_used = sum(log.quantity_used for log in logs)
        
        # 3. Consumption Rate Calculation (Units per Hour)
        # Avoid division by zero, default to minimal usage to prevent infinite exhaustion time
        raw_burn_rate = total_used / 6.0
        if raw_burn_rate == 0: raw_burn_rate = 0.1 # Baseline trickle
            
        # Apply Logic: Dynamic Weighting
        adjusted_burn_rate = raw_burn_rate * load_multiplier
        
        # 4. Exhaustion Prediction
        hours_remaining = 999.0
        if adjusted_burn_rate > 0:
            hours_remaining = item.quantity / adjusted_burn_rate
            
        # 5. Smart Alert Thresholds
        status = "Normal"
        if hours_remaining < 3:
            status = "Critical" # Stockout Imminent
        elif hours_remaining < 12:
            status = "Warning" # Draft Reorder
            
        forecast_data.append({
            "id": item.id,
            "name": item.name,
            "category": item.category,
            "quantity": item.quantity,
            "reorder_level": item.reorder_level,
            "burn_rate": round(adjusted_burn_rate, 2),
            "hours_remaining": round(hours_remaining, 1),
            "status": status,
            "load_multiplier": load_multiplier if occupancy_rate > 0.8 else 1.0 # For debugging/UI transparency
        })
        
    return forecast_data


@app.get("/api/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):

    def get_count(unit_type: str):
        return db.query(models.BedModel).filter(
            models.BedModel.type == unit_type, 
           (models.BedModel.is_occupied == True) | (models.BedModel.status == "OCCUPIED")
        ).count()

    er_occ = get_count("ER")
    icu_occ = get_count("ICU")
    wards_occ = get_count("Wards")
    surgery_occ = get_count("Surgery")
    
    total_beds = db.query(models.BedModel).count() or 190

    # Resource Usage
    vents_in_use = db.query(models.BedModel).filter(models.BedModel.ventilator_in_use == True).count()
    amb_total = db.query(models.Ambulance).count()
    amb_avail = db.query(models.Ambulance).filter(models.Ambulance.status == "IDLE").count()

    # Staff Ratio (Patients per Doctor)
    total_doctors = db.query(models.Staff).filter(models.Staff.role == "Doctor", models.Staff.is_clocked_in == True).count()
    total_patients = er_occ + icu_occ + wards_occ + surgery_occ
    
    ratio_str = "N/A"
    if total_doctors > 0:
        ratio = round(total_patients / total_doctors, 1)
        ratio_str = f"1:{ratio}"

    return {
        "staff_ratio": ratio_str,
        "occupancy": {
            "ER": er_occ, 
            "ICU": icu_occ, 
            "Wards": wards_occ, 
            "Surgery": surgery_occ
        },
        "bed_stats": {
            "total": total_beds,
            "occupied": er_occ + icu_occ + wards_occ + surgery_occ,
            "available": total_beds - (er_occ + icu_occ + wards_occ + surgery_occ)
        },
        "resources": {
            "Ventilators": {"total": 20, "in_use": vents_in_use},
            "Ambulances": {"total": amb_total, "available": amb_avail}
        }
    }
# Ambulance System 

@app.get("/api/ambulances")
def list_ambulances(db: Session = Depends(get_db)):
    return db.query(models.Ambulance).all()

@app.post("/api/ambulance/dispatch")
def dispatch_ambulance(request: AmbulanceRequest, db: Session = Depends(get_db)):
    # 1. Check Hospital Capacity (Diversion Logic)
    required_type = "ICU" if request.severity.upper() == "HIGH" else "ER"
    
    total_beds = 20 if required_type == "ICU" else 60
    occupied = db.query(models.BedModel).filter(
        models.BedModel.type == required_type, 
        models.BedModel.is_occupied == True
    ).count()
    
    if occupied >= total_beds:
        return {
            "status": "DIVERTED", 
            "message": f"Hospital {required_type} Full. Ambulance Redirected to neighboring facility.",
            "ambulance_id": None
        }

    # 2. Find Available Ambulance
    ambulance = db.query(models.Ambulance).filter(models.Ambulance.status == "IDLE").first()
    
    if not ambulance:
        return {
            "status": "DELAYED", 
            "message": "No ambulances available at station.",
            "ambulance_id": None
        }

    # 3. Dispatch
    ambulance.status = "DISPATCHED"
    ambulance.location = request.location
    ambulance.eta_minutes = request.eta
    db.commit()
    
    return {
        "status": "DISPATCHED",
        "ambulance_id": ambulance.id,
        "eta": f"{request.eta} mins",
        "target_unit": required_type
    }

@app.post("/api/ambulance/reset/{ambulance_id}")
def reset_ambulance(ambulance_id: str, db: Session = Depends(get_db)):
    amb = db.query(models.Ambulance).filter(models.Ambulance.id == ambulance_id).first()
    if amb:
        amb.status = "IDLE"
        amb.location = "Station"
        amb.eta_minutes = 0
        db.commit()
        return {"status": "success", "message": f"Ambulance {ambulance_id} returned to station."}
    raise HTTPException(status_code=404, detail="Ambulance not found")

# Staff & Task Management 

@app.get("/api/staff")
def get_staff(db: Session = Depends(get_db)):

    total_nurses = db.query(models.Staff).filter(models.Staff.role == "Nurse", models.Staff.is_clocked_in == True).count()
    total_doctors = db.query(models.Staff).filter(models.Staff.role == "Doctor", models.Staff.is_clocked_in == True).count()
    
    staff_list = db.query(models.Staff).all()
    assignments = db.query(models.BedAssignment).filter(models.BedAssignment.is_active == True).all()
    
    return {
        "stats": {"nurses_on_shift": total_nurses, "doctors_on_shift": total_doctors},
        "staff": staff_list,
        "assignments": assignments
    }

@app.post("/api/staff/clock")
def clock_staff(request: StaffClockIn, db: Session = Depends(get_db)):
    staff = db.query(models.Staff).filter(models.Staff.id == request.staff_id).first()
    if not staff: raise HTTPException(status_code=404, detail="Staff not found")
    
    staff.is_clocked_in = not staff.is_clocked_in # Toggle
    db.commit()
    return {"status": "success", "is_clocked_in": staff.is_clocked_in}

@app.get("/api/staff/worklist/{staff_id}")
async def get_staff_worklist(staff_id: str, db: Session = Depends(get_db)):
    # 1. Find patients assigned to this specific nurse
    patients = db.query(models.PatientRecord).filter(
        models.PatientRecord.assigned_staff == staff_id,
        models.PatientRecord.discharge_time == None  
    ).all()
    
    # 2. Get ONLY PENDING tasks for those specific patients
    patient_ids = [p.id for p in patients]
    tasks = db.query(models.Task).filter(
        models.Task.patient_id.in_(patient_ids),
        models.Task.status == "Pending"  
    ).all()
    
    return {
        "patients": patients,
        "tasks": tasks,
        "stats": {
            "total_patients": len(patients),
            "pending_tasks": len(tasks)
        }
    }


@app.post("/api/staff/assign")
def assign_staff(request: StaffAssign, db: Session = Depends(get_db)):
    bed = db.query(models.BedModel).filter(models.BedModel.id == request.bed_id).first()
    patient = db.query(models.PatientRecord).filter(models.PatientRecord.patient_name == bed.patient_name).first()

    if not patient:
        raise HTTPException(status_code=404, detail="No active patient found in this bed.")
    
    patient.assigned_staff = request.staff_id
    
    if request.role == "Primary Nurse":

        current_load = db.query(models.BedAssignment).filter(
            models.BedAssignment.staff_id == request.staff_id,
            models.BedAssignment.is_active == True
        ).count()

        target_bed = db.query(models.BedModel).filter(models.BedModel.id == request.bed_id).first()
        is_critical = target_bed.type == "ICU" or (target_bed.condition and "Critical" in target_bed.condition)

        if is_critical and current_load >= 2: 
             raise HTTPException(status_code=400, detail="Load Limit Reached: Nurse has critical patient load.")
        if current_load >= 6:
             raise HTTPException(status_code=400, detail="Load Limit Reached: Max 6 patients per nurse.")


    existing = db.query(models.BedAssignment).filter(
        models.BedAssignment.bed_id == request.bed_id,
        models.BedAssignment.assignment_type == request.role,
        models.BedAssignment.is_active == True
    ).first()
    if existing:
        existing.is_active = False
        existing.end_time = datetime.utcnow()
    
    # 3. Create New Assignment
    new_assign = models.BedAssignment(
        bed_id=request.bed_id,
        staff_id=request.staff_id,
        assignment_type=request.role
    )
    db.add(new_assign)
    db.commit()
    return {"status": "assigned", "staff": request.staff_id, "bed": request.bed_id}

@app.get("/api/staff/dashboard/{staff_id}")
def staff_dashboard(staff_id: str, db: Session = Depends(get_db)):
    # "Digital Floor Plan" logic
    staff = db.query(models.Staff).filter(models.Staff.id == staff_id).first()
    if not staff: raise HTTPException(404, "Staff not found")
    
    # Get Assigned Beds
    assignments = db.query(models.BedAssignment).filter(
        models.BedAssignment.staff_id == staff_id,
        models.BedAssignment.is_active == True
    ).all()
    
    bed_ids = [a.bed_id for a in assignments]
    beds = db.query(models.BedModel).filter(models.BedModel.id.in_(bed_ids)).all()
    
    # Get Tasks for these beds
    tasks = db.query(models.Task).filter(
        models.Task.bed_id.in_(bed_ids),
        models.Task.status == "Pending"
    ).all()
    
    return {
        "role": staff.role,
        "my_beds": beds,
        "my_tasks": tasks
    }

def initialize_hospital_beds(db: Session):
    # Precise 190 Bed Distribution
    targets = [
        ("ICU", "ICU", 20), 
        ("ER", "ER", 60), 
        ("Surgery", "SURG", 10)
    ]
    
    # 1. Seed Static Units
    for unit, prefix, count in targets:
        for i in range(1, count + 1):
            bid = f"{prefix}-{i}"
            if not db.query(models.BedModel).filter(models.BedModel.id == bid).first():
                db.add(models.BedModel(id=bid, type=unit, unit=unit, gender="Any", is_occupied=False, status="AVAILABLE"))

    # 2. Seed 100 Ward Beds with Zone Distribution
    if db.query(models.BedModel).filter(models.BedModel.type == "Wards").count() == 0:
        # Medical Ward (40: 20M/20F)
        for i in range(1, 21):
            db.add(models.BedModel(id=f"WARD-MED-M-{i}", type="Wards", unit="Medical Ward", gender="M"))
            db.add(models.BedModel(id=f"WARD-MED-F-{i}", type="Wards", unit="Medical Ward", gender="F"))
        
        # Specialty (30: 15 Ped / 15 Mat)
        for i in range(1, 16):
            db.add(models.BedModel(id=f"WARD-PED-{i}", type="Wards", unit="Pediatric", gender="Any"))
            db.add(models.BedModel(id=f"WARD-MAT-{i}", type="Wards", unit="Maternity", gender="F"))
            
        # Recovery & Security (30)
        for i in range(1, 11):
            db.add(models.BedModel(id=f"WARD-HDU-{i}", type="Wards", unit="HDU", gender="Any"))
            db.add(models.BedModel(id=f"WARD-DC-{i}", type="Wards", unit="Day Care", gender="Any"))
        for i in range(1, 6):
            db.add(models.BedModel(id=f"WARD-ISO-{i}", type="Wards", unit="Isolation", gender="Any"))
            db.add(models.BedModel(id=f"WARD-SEMIP-{i}", type="Wards", unit="Semi-Private", gender="Any"))
    
    db.commit()

@app.on_event("startup")
def seed_db():
    db = next(get_db())
    initialize_hospital_beds(db)
    
    # Seed Ambulances
    if db.query(models.Ambulance).count() == 0:
        ambs = []
        for i in range(1, 6): # 5 Ambulances
            ambs.append(models.Ambulance(id=f"AMB-0{i}", status="IDLE", location="Station", eta_minutes=0))
        db.add_all(ambs)
        db.commit()

    # Seed Staff
    if db.query(models.Staff).count() == 0:
        staff = [
            models.Staff( id="A-01",  name="System Admin",  role="Admin",  is_clocked_in=True,  hashed_password="adminpassword" ),
            models.Staff(id="N-01", name="Nurse Jackie", role="Nurse", is_clocked_in=True, hashed_password="password123"),
            models.Staff(id="N-02", name="Nurse Ratched", role="Nurse", is_clocked_in=True, hashed_password="password123"),
            models.Staff(id="N-03", name="Nurse Joy", role="Nurse", is_clocked_in=False, hashed_password="password123"),
            models.Staff(id="D-01", name="Dr. House", role="Doctor", is_clocked_in=True, hashed_password="password123"),
            models.Staff(id="D-02", name="Dr. Strange", role="Doctor", is_clocked_in=False, hashed_password="password123"),
        ]
        db.add_all(staff)
        db.commit()
    

class WeatherService:
    @staticmethod
    async def get_weather_coefficient() -> dict:
        hour = datetime.now().hour
        temp, humidity, condition = 20, 50, "Clear"
        if hour < 8: temp, condition = -2, "Snow"
        elif 12 < hour < 16: temp, humidity = 35, 95
        multiplier, reason = 1.0, "Normal Conditions"
        if temp < 0: multiplier, reason = 1.15, f"Cold Snap ({temp}°C)"
        
        return {
            "temp": temp, "humidity": humidity, "condition": condition,
            "multiplier": multiplier, "reason": reason
        }

@app.post("/api/predict-inflow")
async def predict_inflow(db: Session = Depends(get_db)):
    """
    Deterministic Neural Engine Logic: 
    Strict mathematical bimodal forecast.
    """
    weather = await WeatherService.get_weather_coefficient()
    w_mult = weather["multiplier"] 
    
    occupied_count = db.query(models.BedModel).filter(models.BedModel.is_occupied == True).count()
    # Saturation factor based on real-time bed data
    saturation_factor = 1 + (occupied_count / 60) * 0.25 

    current_hour = datetime.now().hour
    forecast = []
    total_val = 0
    
    # Generate 12-hour deterministic forecast
    for i in range(1, 13):
        h = (current_hour + i) % 24
        

        morning_peak = 18 * math.exp(-((h - 10)**2) / 6) 
        evening_peak = 14 * math.exp(-((h - 20)**2) / 5)
        
 
        base_inflow = 4 + morning_peak + evening_peak
        
        predicted_count = int(base_inflow * w_mult * saturation_factor)
        forecast.append({"hour": f"{h}:00", "inflow": predicted_count})
        total_val += predicted_count
    
    peak_entry = max(forecast, key=lambda x: x["inflow"])
    return {
        "forecast": forecast,
        "total_predicted_inflow": total_val,
        "risk_level": "HIGH SURGE RISK" if total_val > 50 else "STABLE",
        "weather_impact": weather,
        "confidence_score": 95, 
        "factors": {
        "environmental": f"{round(w_mult, 2)}x",
        "systemic_saturation": f"{round(saturation_factor, 2)}x"
        }
    }

# --- Sentinel Flow Endpoints ---

@app.post("/api/events")
def log_event(event: EventCreate, db: Session = Depends(get_db)):
    new_event = models.Event(
        patient_id=event.patient_id,
        event_type=event.event_type,
        details=event.details,
        timestamp=datetime.utcnow()
    )
    db.add(new_event)
    db.commit()
    return {"status": "success", "event_id": new_event.id}

@app.get("/api/metrics/latency")
def get_latency_metrics(db: Session = Depends(get_db)):
    # Calculate average time between TRANSFER_START and TRANSFER_COMPLETE in last 24h
    completed_transfers = db.query(models.Event).filter(
        models.Event.event_type == "TRANSFER_COMPLETE"
    ).order_by(models.Event.timestamp.desc()).limit(100).all()
    
    total_latency = 0
    count = 0
    
    for end_event in completed_transfers:
        # Find corresponding start event
        start_event = db.query(models.Event).filter(
            models.Event.patient_id == end_event.patient_id,
            models.Event.event_type == "TRANSFER_START",
            models.Event.timestamp < end_event.timestamp
        ).order_by(models.Event.timestamp.desc()).first()
        
        if start_event:
            delta = (end_event.timestamp - start_event.timestamp).total_seconds() / 60 # minutes
            total_latency += delta
            count += 1
            
    avg_latency = total_latency / count if count > 0 else 0
    throughput = count 
    latency_score = min(avg_latency * 2, 100) 
    
    return {
        "latencyScore": latency_score,
        "averageLatencyMinutes": avg_latency,
        "throughputRate": throughput,
        "isCritical": latency_score > 80 
    }

@app.get("/api/predictions")
def get_predictions(db: Session = Depends(get_db)):
    return db.query(models.PredictionLog).order_by(models.PredictionLog.timestamp.desc()).limit(10).all()

@app.post("/api/predictions")
def create_prediction(pred: PredictionCreate, db: Session = Depends(get_db)):
    new_pred = models.PredictionLog(
        prediction_text=pred.prediction_text,
        target_department=pred.target_department,
        predicted_delay_minutes=pred.predicted_delay_minutes,
        timestamp=datetime.utcnow()
    )
    db.add(new_pred)
    db.commit()
    return {"status": "success"}

def calculate_latency_score(db: Session):
    completed_transfers = db.query(models.Event).filter(
        models.Event.event_type == "TRANSFER_COMPLETE"
    ).order_by(models.Event.timestamp.desc()).limit(20).all()
    
    if not completed_transfers: return 0
    
    total_latency = 0
    count = 0
    for end_event in completed_transfers:
        start_event = db.query(models.Event).filter(
            models.Event.patient_id == end_event.patient_id,
            models.Event.event_type == "TRANSFER_START",
            models.Event.timestamp < end_event.timestamp
        ).order_by(models.Event.timestamp.desc()).first()
        if start_event:
            delta = (end_event.timestamp - start_event.timestamp).total_seconds() / 60
            total_latency += delta
            count += 1
            
    avg = total_latency / count if count > 0 else 0
    return min(avg * 2, 100)

@app.get("/api/alerts/active")
def get_active_alerts(db: Session = Depends(get_db)):
    alerts = []
    
    
    latency = calculate_latency_score(db)
    if latency > 80:
        alerts.append({
            "type": "FLOW_OBSTRUCTION", 
            "message": "Latency threshold exceeded (Code Yellow).", 
            "level": "Critical"
        })
    elif latency > 50:
        alerts.append({
            "type": "FLOW_WARNING", 
            "message": "Transfer times degrading.", 
            "level": "High"
        })
        
    return {"alerts": alerts}

# --- Inter-Hospital Capacity & Diversion ---

@app.get("/api/public/status")
async def get_public_status(db: Session = Depends(get_db)):
    """
    Returns anonymized counts and load index.
    Load Index: 0.0 (Empty) to 1.0 (Full)
    """
    total_beds = db.query(models.BedModel).count()
    occupied_beds = db.query(models.BedModel).filter(models.BedModel.is_occupied == True).count()
    
    available = total_beds - occupied_beds
    load_index = occupied_beds / total_beds if total_beds > 0 else 0.0
    
    return {
        "hospital_name": "Phrelis ERP Core",
        "total_beds": total_beds,
        "occupied": occupied_beds,
        "available": available,
        "load_index": round(load_index, 2),
        "status": "CRITICAL" if load_index >= 1.0 else "NORMAL"
    }

@app.get("/api/diversion/recommend")
async def get_diversion_recommendation(db: Session = Depends(get_db)):
    # 1. Check local capacity
    total_beds = db.query(models.BedModel).count()
    occupied_beds = db.query(models.BedModel).filter(models.BedModel.is_occupied == True).count()
    
    if occupied_beds < total_beds:
        return {"recommendation": None, "reason": "Capacity available locally"}

    # 2. Fetch Partner data (Mocking the external API calls for this demo)
    partners = db.query(models.PartnerHospital).all()
    recommendations = []
    
    import random # For simulating live partner data
    
    for partner in partners:
        # In a real scenario, use httpx.get(partner.api_endpoint)
        # Here we mock live capacity for the demonstration
        mock_available = random.randint(0, 15)
        mock_load = 1.0 - (mock_available / 50.0) # Assume 50 total beds
        
        if mock_available > 0:
            # Simple heuristic: Score = Distance + (1 / Available Beds) * 10
            # Lower score is better
            score = partner.distance_miles + (1.0 / mock_available) * 10
            recommendations.append({
                "hospital": partner.name,
                "distance": partner.distance_miles,
                "available_beds": mock_available,
                "load_index": round(mock_load, 2),
                "eta_minutes": int(partner.distance_miles * 2.5), # Rough estimate
                "score": score
            })
    
    if not recommendations:
        return {"recommendation": None, "reason": "No partner capacity found"}
        
    # Sort by score (lowest first)
    recommendations.sort(key=lambda x: x["score"])
    
    return {
        "recommendation": recommendations[0],
        "alternatives": recommendations[1:3]
    }

# --- Command Centre Dashboard Endpoints ---

@app.get("/api/command-centre/status")
async def get_command_centre_status(db: Session = Depends(get_db)):
    """Aggregates real-time status from all hospitals"""
    partners = db.query(models.PartnerHospital).all()
    results = []
    
    import random # Simulating real-time data for partners
    
    for p in partners:
        # Mocking live data for each hospital node
        total = random.randint(50, 200)
        occ = random.randint(40, total)
        load = occ / total
        
        results.append({
            "id": p.id,
            "name": p.name,
            "load_index": round(load, 2),
            "total_beds": total,
            "occupied": occ,
            "available": total - occ,
            "status": "DIVERSION" if load >= 1.0 else "STABLE" if load < 0.7 else "WARNING",
            "distance": p.distance_miles,
            "resources": p.specialty_resources
        })
    
    return results

@app.get("/api/command-centre/syndrome-stats")
async def get_syndrome_stats(db: Session = Depends(get_db)):
    """Returns anonymized syndrome patterns for heatmap spikes"""
    categories = ["Respiratory", "Fever/Viral", "Gastro", "Neurological"]
    stats = []
    
    import random
    for cat in categories:
        # Mocking 24h trend
        current_count = random.randint(50, 150)
        prev_count = random.randint(40, 100)
        spike = ((current_count - prev_count) / prev_count) * 100
        
        stats.append({
            "category": cat,
            "current_24h": current_count,
            "previous_24h": prev_count,
            "spike_percentage": round(spike, 1),
            "is_alert": spike > 20.0
        })
    
    return stats

@app.get("/api/command-centre/match")
async def match_specialty_resource(resource: str, db: Session = Depends(get_db)):
    """Finds best match hospital for a specific resource or specialty"""
    partners = db.query(models.PartnerHospital).all()
    matches = []
    
    res_lower = resource.lower()
    
    for p in partners:
        resources = p.specialty_resources or {}
        on_call = resources.get("on_call", [])
        
        score = 0
        if res_lower in [v.lower() for v in on_call]:
            score += 50
        
        if res_lower == "ventilator" and resources.get("ventilators", 0) > 0:
            score += 30
            
        if res_lower == "icu" and resources.get("icu_beds", 0) > 0:
            score += 30
            
        if score > 0:
            # Factor in distance (closer is better)
            final_score = score - (p.distance_miles * 2)
            matches.append({
                "hospital": p.name,
                "score": final_score,
                "distance": p.distance_miles,
                "available_resource": resource
            })
            
    matches.sort(key=lambda x: x["score"], reverse=True)
    return matches

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)












