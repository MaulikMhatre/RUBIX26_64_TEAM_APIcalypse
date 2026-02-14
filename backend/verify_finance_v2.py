import requests
import json

def verify_finance():
    print("--- Phrelis Finance v2.0 Verification ---")
    baseUrl = "http://localhost:8000/api/finance"
    
    endpoints = ["stats", "department-pl", "leakage", "revenue-history", "payer-mix"]
    
    for ep in endpoints:
        try:
            res = requests.get(f"{baseUrl}/{ep}")
            if res.status_code == 200:
                print(f"[SUCCESS] {ep}: {json.dumps(res.json(), indent=2)[:200]}...")
            else:
                print(f"[FAILED] {ep}: {res.status_code} - {res.text}")
        except Exception as e:
            print(f"[ERROR] {ep}: {e}")

if __name__ == "__main__":
    verify_finance()
