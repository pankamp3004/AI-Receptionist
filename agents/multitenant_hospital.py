"""
Multi-Tenant Hospital Agent
Fully tenant-aware: uses organization_id for all DB queries.
"""

import logging
import asyncio
from typing import Annotated, Optional
from datetime import datetime, timedelta, time

from dateutil import parser
from livekit.agents import RunContext, function_tool

from agents.base import BaseReceptionist, get_timezone_aware_now
from agents.registry import register_agent
from memory.multitenant_service import get_multitenant_service
from tools.session_logger import log_tool_call

logger = logging.getLogger("multitenant-hospital-agent")


class MultiTenantHospitalAgent(BaseReceptionist):
    """
    Tenant-isolated hospital receptionist agent.
    All data operations are scoped to organization_id.
    """

    SYSTEM_PROMPT_TEMPLATE = """You are a professional receptionist at {org_name}, connected to a live database.

YOUR IDENTITY:
- You work at: {org_name}
- When asked "who are you", "which hospital", "what is your name", or any identity question, always respond: "I'm the receptionist at {org_name}." Be direct and concise.

CURRENT DATE & TIME: {current_date} ({current_day}) at {current_time}

CRITICAL CONSTRAINTS:
1. NO HALLUCINATIONS: You have ZERO knowledge of doctors outside of tools. Always call tools for facts.
2. INSTANT ACKNOWLEDGMENTS: Always acknowledge before calling any tool.
   - "Let me check that for you..." / "One moment please..." / "Looking that up..."
3. PAST TIME PREVENTION: Never suggest time slots that have already passed today.
4. WORKFLOWS:
   - Symptom -> call search_specialty_by_symptom
   - Doctor schedule -> call get_doctor_schedule
   - Booking -> verify doctor -> check_doctor_availability -> collect patient info -> summarize details and ask for explicit confirmation -> book_appointment
   - Cancel -> ask for mobile -> find_patient_appointments -> cancel_appointment
5. DATA COLLECTION RULE: When collecting patient info for booking, ALWAYS ask for details ONE BY ONE in a conversational manner. 
   Do NOT ask for Name, Mobile, Date of Birth, Gender, and Reason all at once! 
   Ask for the Name first, then wait for their reply. Then ask for Mobile, wait for reply, etc.
6. FINAL CONFIRMATION: Once you have collected ALL required booking info (Name, Mobile, DOB, Gender, Reason), you MUST summarize the appointment details and explicitly ask the user "Should I go ahead and book this appointment?" Wait for their "Yes" before calling the book_appointment tool.
7. After booking, say "A confirmation message will be sent to your registered mobile number shortly."
"""

    @property
    def SYSTEM_PROMPT(self) -> str:
        now = get_timezone_aware_now()
        org_name = getattr(self, "_org_name", "Our Clinic")
        return self.SYSTEM_PROMPT_TEMPLATE.format(
            org_name=org_name,
            current_date=now.strftime("%B %d, %Y"),
            current_day=now.strftime("%A"),
            current_time=now.strftime("%I:%M %p"),
        )

    GREETING_TEMPLATE = "Thank you for calling {org_name}. How can I assist you today?"
    RETURNING_GREETING_TEMPLATE = "Hi {name}, welcome back to {org_name}. How can I help you today?"

    def __init__(
        self,
        organization_id: Optional[str] = None,
        org_details: Optional[dict] = None,
        ai_config: Optional[dict] = None,
        db_service = None,
        *args,
        **kwargs,
    ):
        # IMPORTANT: _org_name MUST be set before super().__init__() because
        # BaseReceptionist.__init__ reads self.SYSTEM_PROMPT (which accesses _org_name)
        # to build the LLM instructions. Setting it after super() means the LLM
        # gets the fallback "Our Clinic" name instead of the real org name.
        self._organization_id = organization_id
        raw_name = (org_details or {}).get("name") or ""
        self._org_name = raw_name.title() if raw_name else "Our Clinic"
        if not raw_name:
            logger.warning(
                f"org_details has no 'name' for org_id={organization_id}. "
                "org_details received: %s", org_details
            )
        self._ai_config = ai_config or {}

        super().__init__(*args, **kwargs)
        self.db = db_service or get_multitenant_service()

    @property
    def _greeting(self) -> str:
        if self.memory_context and self.memory_context.get("name"):
            return self.RETURNING_GREETING_TEMPLATE.format(
                name=self.memory_context["name"], org_name=self._org_name
            )
        return self.GREETING_TEMPLATE.format(org_name=self._org_name)

    @function_tool()
    @log_tool_call
    async def search_specialty_by_symptom(
        self,
        ctx: RunContext,
        symptom: Annotated[str, "Symptom described by the user"],
    ) -> str:
        if not self._organization_id:
            return "I'm unable to search for specialists right now. Please call our direct line."
        cleaned = symptom.lower().replace(" and ", ",")
        tokens = [t.strip() for t in cleaned.split(",") if len(t.strip()) >= 3]
        if not tokens:
            return "Could you describe the symptom more specifically?"
        matches = await self.db.search_specialty_by_symptom(self._organization_id, tokens)
        if not matches:
            return "I couldn't match that symptom. A General Physician is usually a good start. Shall I find one?"
        specialties = list(set([m[1] for m in matches]))
        if len(specialties) == 1:
            return f"For '{symptom}', you should see a {specialties[0]}. Shall I find one?"
        return f"I found specialists for {', '.join(specialties)}. Which one would you like?"

    @function_tool()
    @log_tool_call
    async def get_doctors_by_specialty(
        self,
        ctx: RunContext,
        specialty: Annotated[str, "Medical specialty"],
    ) -> str:
        if not self._organization_id:
            return "Unable to look up doctors right now."
        doctors = await self.db.get_doctors_by_specialty(self._organization_id, specialty)
        if not doctors:
            return f"No active {specialty} specialists found at the moment."
        return f"We have: {', '.join(doctors)}. Who would you like to see?"

    @function_tool()
    @log_tool_call
    async def get_doctor_schedule(
        self,
        ctx: RunContext,
        doctor_name: Annotated[str, "Name of the doctor"],
    ) -> str:
        if not self._organization_id:
            return "Unable to retrieve schedules right now."
        doc = await self.db.get_doctor_details(self._organization_id, doctor_name)
        if not doc:
            return f"I couldn't find a doctor named {doctor_name}."
        shifts = await self.db.get_all_doctor_shifts(self._organization_id, doc["doc_id"])
        if not shifts:
            return f"Dr. {doc['name']} doesn't have scheduled hours."
        parts = []
        for s in shifts:
            start = s["start_time"].strftime("%I:%M %p").lstrip("0")
            end = s["end_time"].strftime("%I:%M %p").lstrip("0")
            parts.append(f"{s['day_of_week']} from {start} to {end}")
        if len(parts) == 1:
            return f"Dr. {doc['name']} is available {parts[0]}. Would you like to book?"
        return f"Dr. {doc['name']} is available on {', '.join(parts[:-1])}, and {parts[-1]}. Which day works?"

    @function_tool()
    @log_tool_call
    async def check_doctor_availability(
        self,
        ctx: RunContext,
        doctor_name: Annotated[str, "Doctor name"],
        date_str: Annotated[str, "Date (e.g. tomorrow, next Monday)"],
        before_time: Annotated[Optional[str], "Filter slots before this time"] = None,
        after_time: Annotated[Optional[str], "Filter slots after this time"] = None,
    ) -> str:
        if not self._organization_id:
            return "Unable to check availability right now."
        ctx.disallow_interruptions()
        try:
            parsed_date = parser.parse(date_str, fuzzy=True, default=datetime.now())
            if parsed_date.date() < datetime.now().date():
                return "I cannot check availability in the past."
            query_date = parsed_date.date()
        except Exception:
            return "I didn't catch the date. Could you say 'tomorrow' or a specific date?"

        doc = await self.db.get_doctor_details(self._organization_id, doctor_name)
        if not doc:
            return f"I couldn't find a doctor named {doctor_name}."

        day_name = query_date.strftime("%A")
        shift_task = self.db.get_doctor_shift(self._organization_id, doc["doc_id"], day_name)
        bookings_task = self.db.get_doctor_bookings(self._organization_id, doc["doc_id"], query_date)
        shift, bookings = await asyncio.gather(shift_task, bookings_task)

        if not shift:
            return f"Dr. {doc['name']} does not have hours on {day_name}s."

        start_t = shift["start_time"]
        end_t = shift["end_time"]
        booked_minutes = set()
        for b_dt in bookings:
            m = b_dt.hour * 60 + b_dt.minute
            booked_minutes.update(range(m, m + 30))

        current_m = start_t.hour * 60 + start_t.minute
        end_m = end_t.hour * 60 + end_t.minute
        slots = []
        while current_m + 30 <= end_m:
            if current_m not in booked_minutes:
                h, m = divmod(current_m, 60)
                slots.append(time(h, m).strftime("%I:%M %p"))
            current_m += 30

        now = datetime.now()
        if query_date == now.date():
            cur_min = now.hour * 60 + now.minute
            slots = [
                s for s in slots
                if datetime.strptime(s, "%I:%M %p").hour * 60 + datetime.strptime(s, "%I:%M %p").minute > cur_min
            ]

        if not slots:
            return f"Dr. {doc['name']} is fully booked on {day_name}. Would you like another date?"

        filtered = []
        for slot in slots:
            s_t = datetime.strptime(slot, "%I:%M %p").time()
            if before_time:
                try:
                    if s_t >= parser.parse(before_time).time():
                        continue
                except Exception:
                    pass
            if after_time:
                try:
                    if s_t <= parser.parse(after_time).time():
                        continue
                except Exception:
                    pass
            filtered.append(slot)

        if not filtered:
            return f"Dr. {doc['name']} has openings but none match your time range. Available: {', '.join(slots[:3])}"

        if len(filtered) > 5:
            return f"Dr. {doc['name']} has availability starting at {filtered[0]} and {filtered[-1]}. What time works?"
        return f"Available slots: {', '.join(filtered)}. Which works for you?"

    @function_tool()
    @log_tool_call
    async def book_appointment(
        self,
        ctx: RunContext,
        doctor_name: Annotated[str, "Doctor name"],
        date_str: Annotated[str, "Date of appointment"],
        time_str: Annotated[str, "Time of appointment"],
        patient_name: Annotated[str, "Patient full name"],
        patient_phone: Annotated[str, "Patient mobile number"],
        reason: Annotated[str, "Reason for visit"],
        dob: Annotated[str, "Patient date of birth (e.g. 1990-05-15 or spoken format)"],
        gender: Annotated[str, "Patient gender (Male, Female, or Other)"],
    ) -> str:
        if not self._organization_id:
            return "Unable to book appointments right now."
        ctx.disallow_interruptions()

        if not patient_name or len(patient_name.strip()) < 2:
            return "I need your full name to make a booking."

        cleaned_phone = "".join(filter(str.isdigit, patient_phone))
        if len(cleaned_phone) < 10:
            return "Please provide a valid mobile number (at least 10 digits)."

        try:
            p_date = parser.parse(date_str, fuzzy=True, default=datetime.now()).date()
            p_time = parser.parse(time_str, default=datetime.now()).time()
            if p_time.minute not in [0, 30]:
                return f"We book on the hour or half-hour. Please choose :00 or :30."
            full_dt = datetime.combine(p_date, p_time)
        except Exception:
            return "I couldn't parse the date or time. Could you repeat them?"

        doc = await self.db.get_doctor_details(self._organization_id, doctor_name)
        if not doc:
            return f"Doctor {doctor_name} not found."

        try:
            patient_id = await self.db.ensure_patient(
                self._organization_id, patient_name, patient_phone, dob=dob, gender=gender
            )
            appt_id = await self.db.create_appointment(
                self._organization_id, doc["doc_id"], patient_id, full_dt
            )
            if not appt_id:
                return "That slot is no longer available. Please choose another time."

            check_in = (full_dt - timedelta(minutes=15)).strftime("%I:%M %p")
            return (
                f"Confirmed. {patient_name} is booked with Dr. {doc['name']} on "
                f"{full_dt.strftime('%A, %B %d')} at {full_dt.strftime('%I:%M %p')}. "
                f"Please arrive by {check_in}."
            )
        except Exception as e:
            logger.error(f"Booking error: {e}")
            return "Something went wrong while saving the appointment. Please try again."

    @function_tool()
    @log_tool_call
    async def find_patient_appointments(
        self,
        ctx: RunContext,
        mobile_no: Annotated[str, "Patient mobile number"],
    ) -> str:
        if not self._organization_id:
            return "Unable to look up appointments right now."
        cleaned = "".join(filter(str.isdigit, mobile_no))
        if len(cleaned) < 10:
            return "Please provide a valid mobile number."
        apps = await self.db.find_upcoming_appointments(self._organization_id, mobile_no)
        if not apps:
            return "No upcoming appointments found for that number."
        lines = [f"{i+1}. Dr. {a['doc_name']} on {a['appointment_time'].strftime('%B %d at %I:%M %p')} ({a['pt_name']})" for i, a in enumerate(apps)]
        return "Upcoming appointments:\n" + "\n".join(lines) + "\nWhich would you like to update?"

    @function_tool()
    @log_tool_call
    async def cancel_appointment(
        self,
        ctx: RunContext,
        appointment_index: Annotated[int, "Appointment number from the list (1-based)"],
        mobile_no: Annotated[str, "Patient mobile number"],
    ) -> str:
        if not self._organization_id:
            return "Unable to cancel appointments right now."
        apps = await self.db.find_upcoming_appointments(self._organization_id, mobile_no)
        if not apps or appointment_index < 1 or appointment_index > len(apps):
            return "Invalid appointment number. Please ask me to list your appointments first."
        target = apps[appointment_index - 1]
        await self.db.cancel_appointment(self._organization_id, str(target["id"]))
        return "Your appointment has been successfully cancelled."

    @function_tool()
    @log_tool_call
    async def handle_general_query(
        self,
        ctx: RunContext,
        query: Annotated[str, "General question from the user"],
    ) -> str:
        q = query.lower()
        if "hour" in q or "open" in q:
            return "Please check our website or call us during business hours for current timings."
        if "location" in q or "address" in q:
            return "Please check our website for our location and directions."
        if "insurance" in q:
            return "We accept most major insurance providers. Please contact our billing department for specifics."
        return "I can help with appointments and doctor information. For other queries, please visit our website."
