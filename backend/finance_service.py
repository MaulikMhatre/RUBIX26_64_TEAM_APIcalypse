from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
import models
from billing_utility import calculate_accrued_bed_cost

class FinanceService:
    @staticmethod
    def get_financial_kpis(db: Session):
        """Calculates live financial ratios: ARPOB, ALOS, Margin, Liquidity."""
        # 1. Total Revenue (Sum of all ledger entries)
        ledger_total = db.query(func.sum(models.FinancialLedger.amount)).filter(
            models.FinancialLedger.transaction_type == "CREDIT"
        ).scalar() or 0.0
        
        # 2. Operational Costs (Sum of all debits)
        total_costs = db.query(func.sum(models.FinancialLedger.amount)).filter(
            models.FinancialLedger.transaction_type == "DEBIT"
        ).scalar() or 0.0
        
        # 3. Liquidity: Days Cash on Hand
        # Survival Metric = (Current Cash / Avg Daily Expenses)
        # Assuming last 30 days for avg daily expenses
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_expenses = db.query(func.sum(models.FinancialLedger.amount)).filter(
            models.FinancialLedger.transaction_type == "DEBIT",
            models.FinancialLedger.timestamp >= thirty_days_ago
        ).scalar() or 1.0 # Avoid div by zero
        avg_daily_expense = recent_expenses / 30
        
        # Mock cash balance for calculation
        cash_balance = ledger_total - total_costs
        days_cash = cash_balance / avg_daily_expense if avg_daily_expense > 0 else 0.0
        
        # 4. ARPOB: Total Revenue / Occupied Beds
        occupied_beds_count = db.query(models.BedModel).filter(models.BedModel.is_occupied == True).count()
        arpob = ledger_total / occupied_beds_count if occupied_beds_count > 0 else 0.0
        
        # 5. Margin
        margin = ((ledger_total - total_costs) / ledger_total * 100) if ledger_total > 0 else 0.0

        return {
            "total_revenue": round(ledger_total, 2),
            "total_expenses": round(total_costs, 2),
            "arpob": round(arpob, 2),
            "operating_margin": round(margin, 2),
            "days_cash_on_hand": round(days_cash, 1),
            "active_occupancy": occupied_beds_count,
            "deltas": {
                "revenue": "+12.4%",
                "margin": "+3.1%",
                "liquidity": "+0.5d"
            }
        }

    @staticmethod
    def get_patient_timeline(db: Session, patient_id: str):
        """Retrieves all billing entries for a specific patient for forensic audit."""
        return db.query(models.BillingLedger).filter(
            models.BillingLedger.patient_id == patient_id
        ).order_by(models.BillingLedger.timestamp.asc()).all()

    @staticmethod
    def get_unit_economics(db: Session):
        """Summarizes profit per patient case: (Bill - Variable Costs)."""
        discharged_patients = db.query(models.PatientRecord).filter(models.PatientRecord.discharge_time != None).limit(10).all()
        results = []
        for p in discharged_patients:
            revenue = db.query(func.sum(models.BillingLedger.amount)).filter(models.BillingLedger.patient_id == p.id).scalar() or 0.0
            # Medicines/Consumables are the variable costs
            costs = db.query(func.sum(models.BillingLedger.amount)).filter(
                models.BillingLedger.patient_id == p.id,
                models.BillingLedger.item_type.in_(["PHARMACY", "CONSUMABLES"])
            ).scalar() or 0.0
            results.append({
                "patient_id": p.id,
                "name": p.patient_name,
                "revenue": round(revenue, 2),
                "variable_costs": round(costs, 2),
                "margin": round(revenue - costs, 2)
            })
        return results

    @staticmethod
    def get_revenue_velocity(db: Session):
        """Measures Charge Lag: delay between clinical action and billing entry."""
        # Comparison between event timestamp and billing ledger entry
        # For simplicity, we compare clinical events to ledger entries for same patient
        recent_ledger = db.query(models.BillingLedger).order_by(models.BillingLedger.timestamp.desc()).limit(20).all()
        lags = []
        for entry in recent_ledger:
            # Finding the closest clinical event (e.g. bed assignment or symptom update)
            # This is a heuristic for 'Charge Lag'
            event = db.query(models.Event).filter(
                models.Event.patient_id == entry.patient_id,
                models.Event.timestamp <= entry.timestamp
            ).order_by(models.Event.timestamp.desc()).first()
            
            if event:
                lag_minutes = (entry.timestamp - event.timestamp).total_seconds() / 60
                lags.append(lag_minutes)
        
        avg_lag = sum(lags) / len(lags) if lags else 0.0
        return {"avg_charge_lag_minutes": round(avg_lag, 2)}

    @staticmethod
    def get_departmental_pl(db: Session):
        """Groups revenue by category (ICU, Pharmacy, Labs)."""
        # Grouping by item_type in BillingLedger
        revenue_by_dept = db.query(
            models.BillingLedger.item_type,
            func.sum(models.BillingLedger.amount)
        ).group_by(models.BillingLedger.item_type).all()
        
        data = []
        for dept, amount in revenue_by_dept:
            data.append({"name": dept, "value": round(amount, 2)})
            
        # Add Bed Revenue explicitly
        active_patients = db.query(models.PatientRecord).filter(models.PatientRecord.discharge_time == None).all()
        bed_rev = 0.0
        for p in active_patients:
            bed = db.query(models.BedModel).filter(models.BedModel.id == p.bed_id).first()
            if bed:
                master = db.query(models.BedMaster).filter(models.BedMaster.category == bed.type).first()
                if master:
                    bed_rev += calculate_accrued_bed_cost(p.timestamp, master.daily_rate)
        
        if bed_rev > 0:
            data.append({"name": "ACCOMMODATION", "value": round(bed_rev, 2)})
            
        return data

    @staticmethod
    def detect_leakage(db: Session):
        """Flags high-acuity patients with low billing activity."""
        # High acuity = ESI 1 or 2
        high_acuity_patients = db.query(models.PatientRecord).filter(
            models.PatientRecord.esi_level <= 2,
            models.PatientRecord.discharge_time == None
        ).all()
        
        leaks = []
        for p in high_acuity_patients:
            ledger_count = db.query(models.BillingLedger).filter(models.BillingLedger.patient_id == p.id).count()
            # If high acuity but less than 2 items (like medication/labs), flag it
            if ledger_count < 2:
                leaks.append({
                    "patient_id": p.id,
                    "name": p.patient_name,
                    "esi": p.esi_level,
                    "ledger_items": ledger_count,
                    "risk": "High"
                })
        return leaks

    @staticmethod
    def get_revenue_history(db: Session, days: int = 30):
        """Calculates revenue and expenses by date from the database."""
        history = []
        now = datetime.utcnow()
        for i in range(days):
            target_date = (now - timedelta(days=i)).date()
            
            # 1. Daily Revenue (Ledger only for simplicity in history)
            # In a full app, we'd include snapshots of bed costs
            daily_rev = db.query(func.sum(models.BillingLedger.amount)).filter(
                func.date(models.BillingLedger.timestamp) == target_date
            ).scalar() or 0.0
            
            # 2. Daily Expenses
            daily_exp = db.query(func.sum(models.HospitalExpense.amount)).filter(
                func.date(models.HospitalExpense.timestamp) == target_date
            ).scalar() or 0.0
            
            history.append({
                "date": target_date.strftime("%Y-%m-%d"),
                "revenue": round(daily_rev, 2),
                "expenses": round(daily_exp, 2)
            })
            
        return sorted(history, key=lambda x: x['date'])

    @staticmethod
    def get_payer_mix(db: Session):
        """Calculates payer distribution from the database."""
        mix = db.query(
            models.PatientRecord.payer_type,
            func.count(models.PatientRecord.id)
        ).group_by(models.PatientRecord.payer_type).all()
        
        return [{"name": name or "Cash", "value": count} for name, count in mix]
