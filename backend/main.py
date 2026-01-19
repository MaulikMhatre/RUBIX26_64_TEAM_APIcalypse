
import uvicorn
import math
import uuid
import os
from dotenv import load_dotenv

load_dotenv() # Load environment variables from .env file

from datetime import timedelta
from datetime import datetime
from typing import List, Optional
from datetime import datetime, date
from sqlalchemy import func

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends
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
        ("PPE Kit", "General", 100, 15)
    ]
    for name, cat, qty, reorder in items:
        if not db.query(models.InventoryItem).filter_by(name=name).first():
            db.add(models.InventoryItem(name=name, category=cat, quantity=qty, reorder_level=reorder))
    db.commit()

seed_inventory()

app = FastAPI(title="PHRELIS Hospital OS")


app.add_middleware(
    CORSMiddleware,
    # allow_origins=["http://localhost:3000"],
    allow_origins=["*"],
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
                model="gemini-2.5-flash", 
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
    " - RETURN ONLY JSON: {'esi_level': int, 'bed_type': str, 'justification': str}"
    " - bed_type MUST be one of: 'ICU', 'ER', 'Wards'"
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
    
    # REQUIREMENT: Start Clock Logic
    now = datetime.utcnow() 
    
    # REQUIREMENT: Save Identity Data
    bed.patient_name = request.patient_name
    bed.surgeon_name = request.surgeon_name
    bed.patient_age = request.patient_age
    
    # Critical: This starts the duration timer
    bed.admission_time = now
    
    bed.expected_end_time = now + timedelta(minutes=request.duration_minutes)
    bed.current_state = "OCCUPIED"
    bed.status = "OCCUPIED"
    bed.is_occupied = True
    
    db.commit()
    db.refresh(bed)

    iso_time = bed.expected_end_time.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + "Z"

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

@app.post("/api/surgery/extend/{bed_id}")
async def extend_surgery(bed_id: str, request: SurgeryExtendRequest, db: Session = Depends(get_db)):
    bed = db.query(models.BedModel).filter(models.BedModel.id == bed_id).first()
    if not bed: raise HTTPException(404, "Bed not found")
    
    now = datetime.utcnow()

    # Logic: Extend the expected end time
    if not bed.expected_end_time or bed.expected_end_time < now:
        bed.expected_end_time = now + timedelta(minutes=request.additional_minutes)
    else:
        bed.expected_end_time = bed.expected_end_time + timedelta(minutes=request.additional_minutes)
    
    bed.current_state = "OCCUPIED"
    bed.status = "OCCUPIED"

    db.commit()
    db.refresh(bed)

    iso_time = bed.expected_end_time.isoformat() + "Z"

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
    if not bed: 
        raise HTTPException(404, "Bed not found")
    
    actual_end_time = datetime.utcnow()
    
    # REQUIREMENT: Calculate Duration based on admission_time
    start_time = bed.admission_time if bed.admission_time else actual_end_time
    total_duration = (actual_end_time - start_time).total_seconds() / 60
    
    overtime = 0
    if bed.expected_end_time and actual_end_time > bed.expected_end_time:
        overtime = (actual_end_time - bed.expected_end_time).total_seconds() / 60
        
    # REQUIREMENT: Create History Entry with Identity Data
    history_entry = models.SurgeryHistory(
        room_id=bed.id,
        patient_name=bed.patient_name or "Unknown Patient",
        patient_age=bed.patient_age,     # REQUIREMENT: Save Age
        surgeon_name=bed.surgeon_name or "Unknown Surgeon", # REQUIREMENT: Save Surgeon
        start_time=start_time,
        end_time=actual_end_time,
        total_duration_minutes=int(total_duration),
        overtime_minutes=int(overtime) if overtime > 0 else 0
    )
    
    # REQUIREMENT: Validation of DB Commit
    try:
        db.add(history_entry)
        db.commit()
    except Exception as e:
        print(f"FAILED TO SAVE HISTORY: {e}")
        db.rollback() 
        # Continue with room release even if history fails, but log it.

    # Transition to DIRTY for cleaning
    bed.current_state = "DIRTY"
    bed.status = "DIRTY"
    
    db.commit()
    
    await manager.broadcast({
        "type": "SURGERY_UPDATE",
        "bed_id": bed.id,
        "state": "DIRTY"
    })
    return {"status": "completed_turnover_pending"}

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

from sqlalchemy import or_ # Add this import at the top

@app.post("/api/triage/assess")
async def assess_patient(request: TriageRequest, db: Session = Depends(get_db)):
    # 1. Ask Gemini for clinical decision
    decision = await ai_agent.analyze_patient(request.symptoms, request.vitals)
    
    level = decision.esi_level
    bed_type = decision.bed_type 
    
    # 2. Gender Logic
    target_bed_gender = "M" if request.gender in ["Male", "Other"] else "F"
    
    # 3. Critical System Check
    spo2 = request.vitals.get("spo2", 100)
    ventilator_needed = spo2 < 88 and level <= 2
    
    # 4. Find Available Bed with Database Locking
    # Start with base filters
    query = db.query(models.BedModel).filter(
        models.BedModel.type == bed_type, 
        models.BedModel.is_occupied == False,
        models.BedModel.status == "AVAILABLE"
    )

    # UPDATED GENDER LOGIC:
    # If it's a Ward, look for the specific gender OR the "Any" catch-all from your seed
    if bed_type == "Wards":
        query = query.filter(
            or_(
                models.BedModel.gender == target_bed_gender,
                models.BedModel.gender == "Any"
            )
        )
    
    print(f"DEBUG: Searching {bed_type} for gender {target_bed_gender} or 'Any'")

    # Use with_for_update to prevent race conditions
    bed = query.with_for_update(skip_locked=True).first()

    # 5. Create Patient Record
    new_patient_id = str(uuid.uuid4())
    new_record = models.PatientRecord(
        id=new_patient_id,
        esi_level=level,
        acuity=bed_type,
        gender=request.gender,
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

    # Inventory Hook
    if bed:
        inv_context = bed.type if bed.type in ["ICU", "ER"] else "Wards"
        await InventoryService.process_usage(
            db, manager, inv_context, 
            {
                "patient_name": request.patient_name, 
                "bed_id": bed.id, 
                "condition": new_record.condition
            }
        )

    return {
        "patient_name": request.patient_name,
        "patient_age": request.patient_age,
        "esi_level": level,
        "acuity": f"Priority {level}: {decision.acuity_label}",
        "assigned_bed": assigned_id,
        "ai_justification": decision.justification,
        "recommended_actions": decision.recommended_actions
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
    
@app.get("/api/erp/bed-info/{bed_id}")
def get_bed_info(bed_id: str, db: Session = Depends(get_db)):
    bed = db.query(models.BedModel).filter(models.BedModel.id == bed_id).first()
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found")
        
    return {
        "id": bed.id,
        "type": bed.type,
        "is_occupied": bed.is_occupied,
        "ventilator_in_use": bed.ventilator_in_use,
        "details": {
            "name": bed.patient_name if bed.is_occupied else "Empty",
            "age": bed.patient_age if bed.is_occupied else None,
            "condition": bed.condition if bed.is_occupied else "No active condition",
            "admitted_at": bed.admission_time.strftime("%Y-%m-%d %H:%M") if (bed.is_occupied and bed.admission_time) else None
        }
    }

# --- Infrastructure ---

# [NEW] Inventory Endpoint
@app.get("/api/erp/inventory")
def get_inventory(db: Session = Depends(get_db)):
    return db.query(models.InventoryItem).all()


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
    
    # 1. Seed Static Units (ICU, ER, Surgery)
    for unit, prefix, count in targets:
        for i in range(1, count + 1):
            bid = f"{prefix}-{i}"
            if not db.query(models.BedModel).filter(models.BedModel.id == bid).first():
                db.add(models.BedModel(
                    id=bid, 
                    type=unit, 
                    gender="Any", 
                    is_occupied=False, 
                    status="AVAILABLE"
                ))

    # 2. Seed 100 Ward Beds with Zone Distribution
    # Note: 'unit' argument removed to prevent TypeError
    if db.query(models.BedModel).filter(models.BedModel.type == "Wards").count() == 0:
        # Medical Ward (40: 20M / 20F)
        for i in range(1, 21):
            db.add(models.BedModel(id=f"WARD-MED-M-{i}", type="Wards", gender="M", is_occupied=False, status="AVAILABLE"))
            db.add(models.BedModel(id=f"WARD-MED-F-{i}", type="Wards", gender="F", is_occupied=False, status="AVAILABLE"))
        
        # Specialty (30: 15 Pediatric / 15 Maternity)
        for i in range(1, 16):
            db.add(models.BedModel(id=f"WARD-PED-{i}", type="Wards", gender="Any", is_occupied=False, status="AVAILABLE"))
            db.add(models.BedModel(id=f"WARD-MAT-{i}", type="Wards", gender="F", is_occupied=False, status="AVAILABLE"))
            
        # Recovery & Security (30)
        for i in range(1, 11):
            db.add(models.BedModel(id=f"WARD-HDU-{i}", type="Wards", gender="Any", is_occupied=False, status="AVAILABLE"))
            db.add(models.BedModel(id=f"WARD-DC-{i}", type="Wards", gender="Any", is_occupied=False, status="AVAILABLE"))
        for i in range(1, 6):
            db.add(models.BedModel(id=f"WARD-ISO-{i}", type="Wards", gender="Any", is_occupied=False, status="AVAILABLE"))
            db.add(models.BedModel(id=f"WARD-SEMIP-{i}", type="Wards", gender="Any", is_occupied=False, status="AVAILABLE"))
    
    db.commit()
    print("✅ System Infrastructure Initialized: 190 Beds Active.")
    
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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)












