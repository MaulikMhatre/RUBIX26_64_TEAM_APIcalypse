from database import SessionLocal, engine, Base
import models 

def seed_beds():
    print("Initializing system infrastructure...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        # FORCE REFRESH: Clear old beds to apply new naming convention
        print("Purging existing bed data for clean sync...")
        db.query(models.BedModel).delete()
        db.commit()

        print("Seeding beds with Explicit Department Tags (190 Total)...")
        beds = []
        
        # --- 1. ICU: 20 Beds ---
        for i in range(1, 21):
            beds.append(models.BedModel(id=f"ICU-{i}", type="ICU", is_occupied=False, status="AVAILABLE"))
        
        # --- 2. ER: 60 Beds ---
        for i in range(1, 61):
            beds.append(models.BedModel(id=f"ER-{i}", type="ER", is_occupied=False, status="AVAILABLE"))

        # --- 3. Surgery: 10 Beds ---
        for i in range(1, 11):
            # Using current_state and status as per your model requirements
            beds.append(models.BedModel(id=f"SURG-{i}", type="Surgery", current_state="AVAILABLE", status="AVAILABLE"))

        # --- 4. Wards: 100 Beds (Strictly Categorized) ---
        
        # Medical Ward (1-40): Includes Gender tags in ID
        for i in range(1, 21):
            beds.append(models.BedModel(id=f"WARD-MED-M-{i}", type="Wards", is_occupied=False, status="AVAILABLE", gender="M"))
        for i in range(21, 41):
            beds.append(models.BedModel(id=f"WARD-MED-F-{i}", type="Wards", is_occupied=False, status="AVAILABLE", gender="F"))
        
        # Specialty Block (41-60)
        for i in range(41, 61):
            beds.append(models.BedModel(id=f"WARD-SPEC-{i}", type="Wards", is_occupied=False, status="AVAILABLE", gender="Any"))
        
        # Recovery Block (61-80)
        for i in range(61, 81):
            beds.append(models.BedModel(id=f"WARD-REC-{i}", type="Wards", is_occupied=False, status="AVAILABLE", gender="Any"))
        
        # Security Block (81-100)
        for i in range(81, 101):
            beds.append(models.BedModel(id=f"WARD-SEC-{i}", type="Wards", is_occupied=False, status="AVAILABLE", gender="Any"))
        
        db.add_all(beds)

        # --- 5. Staff ---
        if db.query(models.Staff).count() == 0:
            print("Seeding staff...")
            staff_members = [
                models.Staff(id="N-01", name="Nurse Jackie", role="Nurse", hashed_password="password123", is_clocked_in=True),
                models.Staff(id="D-01", name="Dr. House", role="Doctor", hashed_password="password123", is_clocked_in=True)
            ]
            db.add_all(staff_members)

        db.commit()
        print("Infrastructure ready. 190 Beds Active across all Command Center zones.")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_beds()
