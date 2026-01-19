from sqlalchemy import create_engine, text, inspect
import os

DB_URL = "sqlite:///./hospital_os.db"

def fix_schema():
    print("Connecting to database...")
    engine = create_engine(DB_URL)
    
    inspector = inspect(engine)
    columns = inspector.get_columns('surgery_history')
    
    col_names = [col['name'] for col in columns]
    
    if 'patient_age' not in col_names:
        print("ALERT: 'patient_age' column explicitly missing from 'surgery_history'.")
        print("Applying migration...")
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE surgery_history ADD COLUMN patient_age INTEGER"))
            conn.commit()
        print("SUCCESS: Column 'patient_age' added.")
    else:
        print("VERIFIED: 'patient_age' column already exists.")

    if 'surgeon_name' not in col_names:
        print("ALERT: 'surgeon_name' column explicitly missing from 'surgery_history'.")
        print("Applying migration...")
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE surgery_history ADD COLUMN surgeon_name VARCHAR"))
            conn.commit()
        print("SUCCESS: Column 'surgeon_name' added.")
    else:
        print("VERIFIED: 'surgeon_name' column already exists.")

if __name__ == "__main__":
    fix_schema()
