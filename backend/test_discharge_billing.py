import requests
import time
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

def test_discharge_billing():
    print("--- Billing Post-Discharge Test ---")
    
    # 1. Admit a Test Patient
    print("\n[STEP 1] Admitting Patient...")
    admission_payload = {
        "patient_name": "Discharge Test Patient",
        "patient_age": 30,
        "gender": "F",
        "condition": "Post-Ops Discharge Test",
        "staff_id": "S-101",
        "bed_id": "" # Will find below
    }
    
    try:
        beds_res = requests.get(f"{BASE_URL}/api/erp/beds").json()
        bed = next((b for b in beds_res if b['status'] == 'AVAILABLE'), None)
        if not bed:
            print("[FAILED] No available beds.")
            return
            
        admission_payload["bed_id"] = bed['id']
        admit_res = requests.post(f"{BASE_URL}/api/erp/admit", json=admission_payload).json()
        patient_id = admit_res["patient_id"]
        bed_id = bed['id']
        print(f"[SUCCESS] Admitted Patient: {patient_id} to Bed: {bed_id}")

        # 2. Wait and check bill
        print("\n[STEP 2] Waiting for cost accrual (5s)...")
        time.sleep(5)
        bill_1 = requests.get(f"{BASE_URL}/api/billing/live/{patient_id}").json()
        cost_1 = bill_1['costs']['accrued_bed_cost']
        print(f"Current Accrued Cost: Rs.{cost_1}")

        # 3. Discharge the patient
        print("\n[STEP 3] Discharging Patient...")
        requests.post(f"{BASE_URL}/api/erp/discharge/{bed_id}")
        
        # Capture bill immediately after discharge
        bill_discharged = requests.get(f"{BASE_URL}/api/billing/live/{patient_id}").json()
        cost_discharged = bill_discharged['costs']['accrued_bed_cost']
        print(f"Cost at Discharge: Rs.{cost_discharged}")

        # 4. Wait again and verify cost is frozen
        print("\n[STEP 4] Waiting to verify cost is frozen (5s)...")
        time.sleep(5)
        bill_final = requests.get(f"{BASE_URL}/api/billing/live/{patient_id}").json()
        cost_final = bill_final['costs']['accrued_bed_cost']
        print(f"Final Accrued Cost: Rs.{cost_final}")

        if cost_final == cost_discharged:
            print("\n[PASSED] Billing incrementation STOPPED after discharge.")
        else:
            print(f"\n[FAILED] Billing KEPT INCREMENTING! ({cost_final} > {cost_discharged})")

    except Exception as e:
        print(f"[ERROR] Test failed: {e}")

if __name__ == "__main__":
    test_discharge_billing()
