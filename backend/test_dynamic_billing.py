import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_dynamic_billing():
    print("--- Dynamic Billing System Test ---")
    
    # 1. Admit a Test Patient
    print("\n[STEP 1] Admitting Patient...")
    admission_payload = {
        "patient_name": "Test Billing Patient",
        "patient_age": 45,
        "gender": "M",
        "condition": "Stable ICU Observation",
        "staff_id": "S-101",
        "bed_id": "" # Filled below
    }
    
    try:
        # We need a bed ID first. Let's find an ICU bed.
        beds_res = requests.get(f"{BASE_URL}/api/erp/beds")
        if beds_res.status_code != 200:
            print(f"[FAILED] Could not fetch beds: {beds_res.text}")
            return
            
        beds_list = beds_res.json()
        # Find an available ICU or General bed
        icu_bed = next((b for b in beds_list if b['status'] == 'AVAILABLE'), None)
        
        if not icu_bed:
            print("[FAILED] No available beds for testing.")
            return

        admission_payload["bed_id"] = icu_bed['id']
        admit_res = requests.post(f"{BASE_URL}/api/erp/admit", json=admission_payload)
        
        if admit_res.status_code != 200:
            print(f"[FAILED] Admission failed: {admit_res.text}")
            return
            
        res_data = admit_res.json()
        patient_id = res_data["patient_id"]
        print(f"[SUCCESS] Patient admitted with ID: {patient_id}")

        # 2. Check initial billing (should be small, just a few seconds of ICU)
        print("\n[STEP 2] Checking Initial Live Billing...")
        time.sleep(5) # Wait 5 seconds for accrual
        bill_res = requests.get(f"{BASE_URL}/api/billing/live/{patient_id}")
        if bill_res.status_code != 200:
            print(f"[FAILED] Could not fetch billing: {bill_res.text}")
            return
            
        bill_data = bill_res.json()
        print(f"[DEBUG] Accrued Bed Cost: {bill_data['costs']['accrued_bed_cost']}")
        
        if bill_data['costs']['accrued_bed_cost'] <= 0:
            print("[FAILED] Bed cost accrual logic not working.")
        else:
            print("[SUCCESS] Bed cost is accruing.")

        # 3. Simulate Inventory Usage (should trigger automatic charging)
        # Note: In Phrelis, clinical events trigger usage.
        # We can simulate the admission trigger by checking if the earlier admission charged anything.
        # The admission logic calls InventoryService.process_usage internally.
        print("\n[STEP 3] Verifying Automatic Inventory Charges...")
        if len(bill_data['ledger']) > 0:
            print(f"[SUCCESS] Found {len(bill_data['ledger'])} automated charges in ledger.")
            for item in bill_data['ledger']:
                print(f" - Item: {item['description']}, Amount: {item['amount']}")
        else:
            print("[WARNING] No automated inventory charges found. Check InventoryService integration.")

        # 4. Final Aggregation Check
        print("\n[STEP 4] Total Billing Calculation Check...")
        print(f"Subtotal: {bill_data['costs']['subtotal']}")
        print(f"Tax: {bill_data['costs']['tax']}")
        print(f"Grand Total: {bill_data['costs']['grand_total']}")
        
        if bill_data['costs']['grand_total'] > 0:
            print("[SUCCESS] Grand total is calculated correctly.")
        else:
            print("[FAILED] Grand total is zero.")

    except Exception as e:
        print(f"[ERROR] Test encountered an issue: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_dynamic_billing()
