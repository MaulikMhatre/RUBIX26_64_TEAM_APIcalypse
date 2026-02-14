from datetime import datetime
from sqlalchemy.orm import Session
import models

def calculate_accrued_bed_cost(admission_time: datetime, daily_rate: float, end_time: datetime = None) -> float:
    """Calculates accrued bed cost: (end_time - start_time) * daily_rate / 86400 (seconds in a day)."""
    if not admission_time:
        return 0.0
    cutoff = end_time if end_time else datetime.utcnow()
    duration = cutoff - admission_time
    seconds_in_day = 86400
    cost = (duration.total_seconds() / seconds_in_day) * daily_rate
    return round(cost, 2)

class BillingListener:
    @staticmethod
    def log_event(db: Session, patient_id: str, item_type: str, description: str, amount: float):
        """Automatically posts a line-item to the patient_ledger and updates the FinancialLedger."""
        entry = models.BillingLedger(
            patient_id=patient_id,
            item_type=item_type,
            description=description,
            amount=amount
        )
        db.add(entry)
        
        # [NEW] Record in FinancialLedger (CREDIT/REVENUE)
        ledger_entry = models.FinancialLedger(
            transaction_type="CREDIT",
            category="REVENUE",
            amount=amount,
            reference_id=patient_id,
            description=f"Revenue: {description} for {patient_id}"
        )
        db.add(ledger_entry)
        db.commit()
        
        # [NEW] Broadcast to CFO Dashboard
        from main import manager
        import asyncio
        asyncio.create_task(manager.broadcast({
            "type": "REVENUE_UPDATE",
            "desc": description,
            "amt": amount,
            "patient_id": patient_id,
            "timestamp": datetime.utcnow().isoformat()
        }))
        return entry

    @staticmethod
    def log_financial_transaction(db: Session, t_type: str, category: str, amount: float, description: str, ref_id: str = None):
        """Universal ledger logger for professional RCM."""
        entry = models.FinancialLedger(
            transaction_type=t_type, # DEBIT/CREDIT
            category=category, # REVENUE/EXPENSE
            amount=amount,
            reference_id=ref_id,
            description=description
        )
        db.add(entry)
        db.commit()
        return entry
