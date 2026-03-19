"""
Multi-Tenant Hospital Service
Resolves organization from phone/API key mapping and loads tenant-aware config.
"""
import logging
import os
from typing import Optional, Dict, Any
import asyncpg

logger = logging.getLogger("multitenant.hospital")


class MultiTenantHospitalService:
    """
    Tenant-aware database service for the voice agent.
    All queries are scoped to organization_id.
    """

    def __init__(self):
        self._pool: Optional[asyncpg.Pool] = None
        self._database_url = os.getenv("DATABASE_URL", "")

    async def initialize(self):
        if self._pool:
            return
        if not self._database_url:
            logger.warning("No DATABASE_URL - multi-tenant features disabled")
            return
        try:
            self._pool = await asyncpg.create_pool(
                self._database_url,
                min_size=2,
                max_size=10,
                statement_cache_size=0,
            )
            logger.info("MultiTenantHospitalService pool initialized")
        except Exception as e:
            logger.error(f"Failed to init pool: {e}")

    async def resolve_organization_by_phone(self, phone: str) -> Optional[str]:
        """Return organization_id (UUID string) matching the inbound phone number."""
        if not self._pool:
            return None
        try:
            row = await self._pool.fetchrow(
                "SELECT id FROM organizations WHERE phone = $1 LIMIT 1", phone
            )
            return str(row["id"]) if row else None
        except Exception as e:
            logger.warning(f"Could not resolve org by phone: {e}")
            return None

    async def get_default_organization(self) -> Optional[str]:
        """Return the org with the most active doctors — used as fallback for web/demo connections."""
        if not self._pool:
            return None
        try:
            row = await self._pool.fetchrow("""
                SELECT o.id FROM organizations o
                LEFT JOIN doctors d ON d.organization_id = o.id AND d.active = true
                GROUP BY o.id
                ORDER BY COUNT(d.id) DESC, o.created_at DESC
                LIMIT 1
            """)
            return str(row["id"]) if row else None
        except Exception as e:
            logger.warning(f"Could not get default organization: {e}")
            return None

    async def get_ai_config(self, organization_id: str) -> Dict[str, Any]:
        """Load specialty and symptom mappings for an organization."""
        if not self._pool:
            return {"specialty_mappings": {}, "symptom_mappings": {}}
        row = await self._pool.fetchrow(
            "SELECT specialty_mappings, symptom_mappings FROM ai_configurations WHERE organization_id = $1",
            organization_id,
        )
        if not row:
            return {"specialty_mappings": {}, "symptom_mappings": {}}
        import json
        
        def parse_json_col(val):
            if not val:
                return {}
            if isinstance(val, str):
                try:
                    return json.loads(val)
                except json.JSONDecodeError:
                    return {}
            # If it's already a dict (e.g., asyncpg decoded it)
            return dict(val)

        return {
            "specialty_mappings": parse_json_col(row["specialty_mappings"]),
            "symptom_mappings": parse_json_col(row["symptom_mappings"]),
        }

    async def get_organization_details(self, organization_id: str) -> Optional[Dict]:
        if not self._pool:
            return None
        try:
            row = await self._pool.fetchrow(
                "SELECT id, name, timezone FROM organizations WHERE id = $1", organization_id
            )
            return dict(row) if row else None
        except Exception as e:
            logger.warning(f"get_organization_details error: {e}")
            return None

    async def check_tenant_suspension(self, organization_id: str) -> bool:
        if not self._pool:
            return False
        try:
            row = await self._pool.fetchrow(
                "SELECT is_suspended FROM tenant_subscriptions WHERE organization_id = $1", organization_id
            )
            return bool(row and row["is_suspended"])
        except Exception as e:
            logger.warning(f"check_tenant_suspension error: {e}")
            return False
            
    async def get_tenant_max_agents(self, organization_id: str) -> int:
        if not self._pool:
            return 1 # Default max
        try:
            row = await self._pool.fetchrow(
                "SELECT max_agents FROM tenant_subscriptions WHERE organization_id = $1", organization_id
            )
            return int(row["max_agents"]) if row and row["max_agents"] else 1
        except Exception as e:
            logger.warning(f"get_tenant_max_agents error: {e}")
            return 1

    async def search_specialty_by_symptom(self, organization_id: str, tokens: list) -> list:
        if not self._pool:
            return []
        ai_config = await self.get_ai_config(organization_id)
        symptom_map = ai_config.get("symptom_mappings", {})
        results = []
        for token in tokens:
            for symptom_key, specialty in symptom_map.items():
                if token.lower() in symptom_key.lower():
                    results.append((token, specialty))
        if not results:
            rows = await self._pool.fetch(
                """SELECT s.spec_name as specialty FROM doctor d 
                   JOIN doctor_specialty ds ON ds.doc_id = d.id 
                   JOIN specialty s ON s.id = ds.spec_id 
                   WHERE d.organization_id = $1 AND d.is_active = true
                   GROUP BY s.spec_name""",
                organization_id,
            )
            return [(t, r["specialty"]) for t in tokens for r in rows if t.lower() in r["specialty"].lower()]
        return results

    async def get_all_specialties(self, organization_id: str) -> list:
        """Return all distinct specialty names available at this organization."""
        if not self._pool:
            return []
        try:
            rows = await self._pool.fetch(
                """SELECT DISTINCT s.spec_name
                   FROM specialty s
                   JOIN doctor_specialty ds ON ds.spec_id = s.id
                   JOIN doctor d ON d.id = ds.doc_id
                   WHERE d.organization_id = $1 AND d.is_active = true
                   ORDER BY s.spec_name""",
                organization_id,
            )
            return [r["spec_name"] for r in rows]
        except Exception as e:
            logger.warning(f"get_all_specialties error: {e}")
            return []


    async def get_doctors_by_specialty(self, organization_id: str, specialty: str) -> list:
        if not self._pool:
            return []
            
        # Extract root of the word to handle STT variations (e.g. "Cardiology" matching "Cardiologist")
        search_root = specialty[:5].strip() if len(specialty) >= 5 else specialty.strip()
        
        rows = await self._pool.fetch(
            """SELECT d.name FROM doctor d 
               JOIN doctor_specialty ds ON ds.doc_id = d.id 
               JOIN specialty s ON s.id = ds.spec_id 
               WHERE d.organization_id = $1 AND s.spec_name ILIKE $2 AND d.is_active = true""",
            organization_id, f"%{search_root}%",
        )
        return [r["name"] for r in rows]

    async def get_doctor_details(self, organization_id: str, doctor_name: str) -> Optional[Dict]:
        if not self._pool:
            return None
            
        # Clean up common title prefixes since LLM outputs "Dr." but database might store "Dr " or just the name
        clean_name = doctor_name.lower().replace("dr.", "").replace("dr ", "").strip()
        
        # STT often misspells last names (e.g. Kuamawat vs Kumawat), so we search for the first word
        first_name = clean_name.split()[0] if clean_name else ""
        search_term = f"%{first_name}%" if first_name else f"%{clean_name}%"
        
        row = await self._pool.fetchrow(
            """SELECT d.id, d.name, s.spec_name as specialty 
               FROM doctor d 
               LEFT JOIN doctor_specialty ds ON ds.doc_id = d.id 
               LEFT JOIN specialty s ON s.id = ds.spec_id 
               WHERE d.organization_id = $1 AND d.name ILIKE $2 AND d.is_active = true LIMIT 1""",
            organization_id, search_term,
        )
        return {"doc_id": str(row["id"]), "name": row["name"], "specialty": row["specialty"]} if row else None

    async def get_doctor_shift(self, organization_id: str, doctor_id: str, day_of_week: str):
        if not self._pool:
            return None
        row = await self._pool.fetchrow(
            "SELECT start_time, end_time FROM doc_shift WHERE organization_id = $1 AND doc_id = $2 AND day_of_week = $3",
            organization_id, doctor_id, day_of_week,
        )
        return dict(row) if row else None

    async def get_all_doctor_shifts(self, organization_id: str, doctor_id: str) -> list:
        if not self._pool:
            return []
        rows = await self._pool.fetch(
            "SELECT day_of_week, start_time, end_time FROM doc_shift WHERE organization_id = $1 AND doc_id = $2 ORDER BY start_time",
            organization_id, doctor_id,
        )
        return [dict(r) for r in rows]

    async def get_doctor_bookings(self, organization_id: str, doctor_id: str, date) -> list:
        if not self._pool:
            return []
        rows = await self._pool.fetch(
            """SELECT date_time FROM appointment 
               WHERE organization_id = $1 AND doctor_id = $2 
               AND DATE(date_time) = $3 AND app_status != 'Cancelled'""",
            organization_id, doctor_id, date,
        )
        return [r["date_time"] for r in rows]

    async def ensure_patient(self, organization_id: str, name: str, phone: str, dob: str = None, gender: str = None) -> str:
        if not self._pool:
            raise RuntimeError("Database not available")
            
        parsed_dob = None
        if dob:
            from dateutil import parser
            try:
                parsed_dob = parser.parse(dob).date()
            except Exception:
                pass
                
        if gender:
            gender = gender.capitalize()
                
        # First ensure patient_account
        acc_id = await self._pool.fetchval(
            "SELECT id FROM patient_account WHERE organization_id = $1 AND mobile_no = $2 LIMIT 1",
            organization_id, phone,
        )
        if not acc_id:
            try:
                acc_id = await self._pool.fetchval(
                    "INSERT INTO patient_account (organization_id, mobile_no) VALUES ($1, $2) RETURNING id",
                    organization_id, phone,
                )
            except Exception: # In case of race condition
                acc_id = await self._pool.fetchval(
                    "SELECT id FROM patient_account WHERE organization_id = $1 AND mobile_no = $2 LIMIT 1",
                    organization_id, phone,
                )

        # Then ensure patient
        pt_id = await self._pool.fetchval(
            "SELECT id FROM patient WHERE organization_id = $1 AND account_id = $2 AND name ILIKE $3 LIMIT 1",
            organization_id, acc_id, f"%{name}%",
        )
        if pt_id:
            if parsed_dob or gender:
                await self._pool.execute(
                    "UPDATE patient SET dob = COALESCE(dob, $1), gender = COALESCE(gender, $2::gender_enum) WHERE id = $3",
                    parsed_dob, gender, pt_id
                )
            return str(pt_id)
            
        new_pt_id = await self._pool.fetchval(
            "INSERT INTO patient (organization_id, account_id, name, dob, gender) VALUES ($1, $2, $3, $4, $5::gender_enum) RETURNING id",
            organization_id, acc_id, name, parsed_dob, gender,
        )
        return str(new_pt_id)

    async def create_appointment(
        self, organization_id: str, doctor_id: str, patient_id: str, appointment_time
    ) -> Optional[str]:
        if not self._pool:
            return None
            
        acc_id = await self._pool.fetchval("SELECT account_id FROM patient WHERE id = $1", patient_id)
        
        conflict = await self._pool.fetchrow(
            """SELECT id FROM appointment 
               WHERE organization_id = $1 AND doctor_id = $2 AND date_time = $3 AND app_status != 'Cancelled'""",
            organization_id, doctor_id, appointment_time,
        )
        if conflict:
            return None
        appt_id = await self._pool.fetchval(
            """INSERT INTO appointment (organization_id, doctor_id, account_id, patient_id, date_time, app_status)
               VALUES ($1, $2, $3, $4, $5, 'Scheduled') RETURNING id""",
            organization_id, doctor_id, acc_id, patient_id, appointment_time,
        )
        return str(appt_id)

    async def save_call_log(
        self, organization_id: str, patient_phone: str, transcript: str, summary: str
    ) -> str:
        """Insert a call session record and return the session_id (UUID string)."""
        if not self._pool:
            return ""
        import uuid

        session_uuid = str(uuid.uuid4())

        await self._pool.execute(
            """INSERT INTO call_session
               (session_id, organization_id, phone_number, transcript, intent, started_at, ended_at)
               VALUES ($1::uuid, $2::uuid, $3, $4, $5, NOW() - INTERVAL '3 minutes', NOW())""",
            session_uuid, organization_id, patient_phone, transcript, summary,
        )
        return session_uuid

    async def find_upcoming_appointments(self, organization_id: str, phone: str) -> list:
        if not self._pool:
            return []
        rows = await self._pool.fetch(
            """SELECT a.id, a.date_time as appointment_time, a.app_status as status, d.name as doc_name, p.name as pt_name
               FROM appointment a
               JOIN doctor d ON d.id = a.doctor_id
               JOIN patient p ON p.id = a.patient_id
               JOIN patient_account pa ON pa.id = a.account_id
               WHERE a.organization_id = $1 AND pa.mobile_no = $2 AND a.date_time >= NOW() AND a.app_status != 'Cancelled'
               ORDER BY a.date_time""",
            organization_id, phone,
        )
        return [dict(r) for r in rows]

    async def cancel_appointment(self, organization_id: str, appointment_id: str):
        if not self._pool:
            return
        await self._pool.execute(
            "UPDATE appointment SET app_status = 'Cancelled' WHERE id = $1 AND organization_id = $2",
            appointment_id, organization_id,
        )

    async def save_call_cost(
        self,
        session_id: str,
        organization_id: str,
        duration_seconds: int,
        tts_characters: int,
        llm_input_tokens: int,
        llm_output_tokens: int,
        stt_cost_usd: float,
        tts_cost_usd: float,
        llm_cost_usd: float,
        livekit_cost_usd: float,
        total_cost_usd: float,
    ):
        """Persist per-service cost breakdown for a call session."""
        if not self._pool:
            return
        import uuid
        cost_id = str(uuid.uuid4())
        await self._pool.execute(
            """INSERT INTO call_cost
               (id, session_id, organization_id,
                duration_seconds, tts_characters, llm_input_tokens, llm_output_tokens,
                stt_cost_usd, tts_cost_usd, llm_cost_usd, livekit_cost_usd, total_cost_usd)
               VALUES
               ($1::uuid, $2::uuid, $3::uuid,
                $4, $5, $6, $7,
                $8, $9, $10, $11, $12)
               ON CONFLICT (session_id) DO UPDATE SET
                duration_seconds  = EXCLUDED.duration_seconds,
                tts_characters    = EXCLUDED.tts_characters,
                llm_input_tokens  = EXCLUDED.llm_input_tokens,
                llm_output_tokens = EXCLUDED.llm_output_tokens,
                stt_cost_usd      = EXCLUDED.stt_cost_usd,
                tts_cost_usd      = EXCLUDED.tts_cost_usd,
                llm_cost_usd      = EXCLUDED.llm_cost_usd,
                livekit_cost_usd  = EXCLUDED.livekit_cost_usd,
                total_cost_usd    = EXCLUDED.total_cost_usd""",
            cost_id, session_id, organization_id,
            duration_seconds, tts_characters, llm_input_tokens, llm_output_tokens,
            stt_cost_usd, tts_cost_usd, llm_cost_usd, livekit_cost_usd, total_cost_usd,
        )
        logger.info(f"Call cost saved: session={session_id}, total=${total_cost_usd:.6f}")

    async def close(self):
        if self._pool:
            await self._pool.close()


def get_multitenant_service() -> MultiTenantHospitalService:
    # Always create a fresh instance for the current asyncio loop
    # main_saas.py will be responsible for calling .close() to clean it up
    return MultiTenantHospitalService()
