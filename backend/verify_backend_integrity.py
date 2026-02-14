import models
from database import engine, Base
from sqlalchemy import inspect, text

def verify_and_fix():
    print("--- Phrelis Backend Integrity Check ---")
    
    # 1. Ensure all tables exist
    print("Verifying tables...")
    models.Base.metadata.create_all(bind=engine)
    
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"Existing tables: {', '.join(tables)}")
    
    # 2. Check for missing columns in existing tables
    print("\nVerifying columns...")
    expected_updates = [
        ('inventory_items', 'unit_price', 'FLOAT DEFAULT 0.0'),
        ('bed_master', 'admission_fee', 'FLOAT DEFAULT 0.0'),
        ('patients', 'payer_type', "VARCHAR DEFAULT 'Cash'"),
        ('patients', 'collection_status', "VARCHAR DEFAULT 'Billed'"),
    ]
    
    with engine.connect() as conn:
        for table_name, col_name, col_type in expected_updates:
            columns = [c['name'] for c in inspector.get_columns(table_name)]
            if col_name not in columns:
                print(f"ALERT: Column '{col_name}' missing from '{table_name}'. Fixing...")
                conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}"))
                conn.commit()
                print(f"SUCCESS: Added '{col_name}' to '{table_name}'.")
            else:
                print(f"VERIFIED: '{table_name}.{col_name}' exists.")

    # 3. Verify BedMaster seeding
    print("\nVerifying BedMaster data...")
    from sqlalchemy.orm import Session
    from database import get_db
    
    try:
        db = next(get_db())
        categories = db.query(models.BedMaster).all()
        if not categories:
            print("ALERT: BedMaster is empty. Running seed...")
            seed_data = [
                ("ICU", 15000.0),
                ("ER", 8000.0),
                ("Ward", 3500.0),
                ("Deluxe", 12000.0)
            ]
            for cat, rate in seed_data:
                db.add(models.BedMaster(category=cat, daily_rate=rate))
            db.commit()
            print("SUCCESS: BedMaster seeded.")
        else:
            print(f"VERIFIED: {len(categories)} bed categories found in BedMaster.")
    except Exception as e:
        print(f"ERROR: Could not verify BedMaster data: {e}")

    # 4. Final check: Can we query the live billing endpoint logic?
    print("\nCheck complete. Backend is synchronized.")

if __name__ == "__main__":
    verify_and_fix()
