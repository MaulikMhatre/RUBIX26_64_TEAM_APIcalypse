from sqlalchemy import Column, Integer, String, Boolean, JSON, DateTime, Float ,ForeignKey
from datetime import datetime
from database import Base


class BedModel(Base):
    __tablename__ = "beds"
    
    id = Column(String, primary_key=True, index=True) #  ICU-1
    type = Column(String)                             # ICU or ER
    is_occupied = Column(Boolean, default=False)
    status = Column(String, default="AVAILABLE")      # AVAILABLE, OCCUPIED, DIRTY, CLEANING
    
    # Patient details for your new ERP page
    patient_name = Column(String, nullable=True)
    patient_age = Column(Integer, nullable=True)
    condition = Column(String, nullable=True)
    surgeon_name = Column(String, nullable=True)
    
    # Snapshot of vitals at time of admission
    vitals_snapshot = Column(String, nullable=True) 
    admission_time = Column(DateTime, default=datetime.utcnow)
    ventilator_in_use = Column(Boolean, default=False)
    gender = Column(String, nullable=True) # M, F, or NULL (Any)

    # Surgery Unit Specific Fields
    current_state = Column(String, default="AVAILABLE") # AVAILABLE, OCCUPIED, OVERTIME, DIRTY, CLEANING
    expected_end_time = Column(DateTime, nullable=True)
    cleanup_start_time = Column(DateTime, nullable=True)
    next_surgery_start_time = Column(DateTime, nullable=True)

    def get_color_code(self):
        if self.status == "AVAILABLE": return "#32CD32" # Green
        if self.status == "OCCUPIED": return "#FF4500"  # Red-Orange
        if self.status == "DIRTY": return "#FFA500"     # Orange
        if self.status == "CLEANING": return "#87CEEB"  # Sky Blue
        return "#808080" # Grey (Unknown)
    


class PredictionHistory(Base):
    __tablename__ = "prediction_history"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    total_predicted = Column(Integer)
    peak_value = Column(Integer)
    peak_time = Column(String)
    actual_weather_multiplier = Column(Float) 


class Ambulance(Base):
    __tablename__ = "ambulances"
    
    id = Column(String, primary_key=True, index=True) #  AMB-01
    status = Column(String, default="IDLE")           # IDLE, DISPATCHED, RETURNING, MAINTENANCE
    location = Column(String, default="Station")      # Current location description
    assigned_patient_id = Column(String, nullable=True)
    eta_minutes = Column(Integer, nullable=True)

class PatientRecord(Base):
    __tablename__ = "patients"
    
    id = Column(String, primary_key=True, index=True)
    esi_level = Column(Integer)
    acuity = Column(String)
    gender = Column(String, nullable=True) # M, F, or Other
    symptoms = Column(JSON)
    timestamp = Column(DateTime, default=datetime.now)
    bed_id = Column(String, ForeignKey("beds.id"), nullable=True)
    # New fields for history integration
    patient_name = Column(String, nullable=True)
    patient_age = Column(Integer, nullable=True)
    condition = Column(String, nullable=True)
    discharge_time = Column(DateTime, nullable=True)
    assigned_staff = Column(String, ForeignKey("staff.id"), nullable=True) # Added for Smart Nursing

class Department(Base):
    __tablename__ = "departments"
    
    id = Column(String, primary_key=True) # "General", "ICU", "ER"
    total_nurses_on_shift = Column(Integer, default=0)
    total_doctors_on_shift = Column(Integer, default=0)

class Staff(Base):
    __tablename__ = "staff"
    
    id = Column(String, primary_key=True) # S-101
    name = Column(String)
    role = Column(String) # "Nurse", "Doctor"
    hashed_password = Column(String)
    is_clocked_in = Column(Boolean, default=False)
    department_id = Column(String, nullable=True) 

class BedAssignment(Base):
    __tablename__ = "bed_assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    bed_id = Column(String) # ForeignKey to beds.id
    staff_id = Column(String) # ForeignKey to staff.id
    assignment_type = Column(String) # "Primary Nurse", "Attending Physician"
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    bed_id = Column(String)
    patient_id = Column(String, ForeignKey("patients.id"))
    title = Column(String)
    assigned_to_staff_id = Column(String, nullable=True)
    description = Column(String)
    due_time = Column(DateTime)
    priority = Column(String) # "Low", "Medium", "High", "Critical"
    status = Column(String, default="Pending") # "Pending", "Completed"
    completed_at = Column(DateTime, nullable=True)

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, index=True)
    event_type = Column(String) 
    timestamp = Column(DateTime, default=datetime.utcnow)
    details = Column(String, nullable=True)

class PredictionLog(Base):
    __tablename__ = "prediction_log"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    prediction_text = Column(String) 
    target_department = Column(String) # ICU, ER
    predicted_delay_minutes = Column(Integer)










class SurgeryHistory(Base):
    __tablename__ = "surgery_history"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(String, index=True)
    patient_name = Column(String)
    patient_age = Column(Integer, nullable=True)
    surgeon_name = Column(String, nullable=True)
    
    start_time = Column(DateTime)
    end_time = Column(DateTime, default=datetime.utcnow)
    
    total_duration_minutes = Column(Integer)
    overtime_minutes = Column(Integer, default=0)

class InventoryItem(Base):
    __tablename__ = "inventory_items"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    category = Column(String) 
    quantity = Column(Integer, default=0)
    reorder_level = Column(Integer, default=10)

class InventoryLog(Base):
    __tablename__ = "inventory_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("inventory_items.id"))
    patient_name = Column(String)
    bed_id = Column(String, nullable=True) # Matches BedModel.id
    quantity_used = Column(Integer)
    reason = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)

class PatientQueue(Base):
    __tablename__ = "patient_queue"
    
    id = Column(String, primary_key=True, index=True)
    patient_name = Column(String)
    patient_age = Column(Integer)
    gender = Column(String)
    base_acuity = Column(Integer) # 1-5 (ESI)
    vitals = Column(JSON) # {hr, bp, spo2}
    symptoms = Column(JSON) # List of strings
    icd_code = Column(String, nullable=True)
    icd_rationale = Column(String, nullable=True)
    triage_urgency = Column(String, nullable=True)
    check_in_time = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="WAITING") # WAITING, CONSULTATION, COMPLETED
    priority_score = Column(Float, default=0.0)
    assigned_room = Column(String, nullable=True)

class DoctorRoom(Base):
    __tablename__ = "doctor_rooms"
    
    id = Column(String, primary_key=True, index=True) # Room 1, Room 2
    doctor_name = Column(String)
    status = Column(String, default="IDLE") # IDLE, ACTIVE
    current_patient_id = Column(String, nullable=True)
