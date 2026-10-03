import os 
import httpx 
import psycopg
from psycopg.rows import dict_row

from datetime import date, datetime
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.database import get_connection

from fastapi.security import OAuth2PasswordRequestForm
from fastapi import Depends
from app.auth import (
    authenticate_user,
    create_access_token,
    get_current_user,
    require_admin,
    hash_password,
)
OLLAMA_BASE_URL = os.getenv(
    "OLLAMA_BASE_URL",
    "http://host.docker.internal:11434",
)

app = FastAPI(
    title="Med-Intel API",
    description="Hospital Operations Management & Platform",
    version="0.3.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

VALID_STATUSES = {
    "scheduled",
    "waiting",
    "in_progress",
    "completed",
    "cancelled",
    "no_show",
}

VALID_CAUSES = {
    "check_up",
    "sick",
    "emergency",
    "follow_up",
    "consultation",
    "screening",
    "procedure",
    "other",
}

VALID_PRIORITIES = {
    "routine",
    "urgent",
    "emergency",
}


# ============================================================
# Pydantic models
# ============================================================

class PatientCreate(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    date_of_birth: date


class ProviderCreate(BaseModel):
    provider_id: str = Field(min_length=1, max_length=50)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    department_id: Optional[str] = None


class AppointmentCreate(BaseModel):
    patient_id: Optional[str] = None
    department: str = Field(min_length=1, max_length=100)
    provider_id: Optional[str] = None
    scheduled_time: datetime
    arrival_time: Optional[datetime] = None
    completion_time: Optional[datetime] = None
    status: str = "scheduled"
    cause: Optional[str] = None
    priority: str = "routine"
    operational_notes: Optional[str] = None


class AppointmentUpdate(BaseModel):
    patient_id: Optional[str] = None
    department: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=100,
    )
    provider_id: Optional[str] = None
    scheduled_time: Optional[datetime] = None
    arrival_time: Optional[datetime] = None
    completion_time: Optional[datetime] = None
    status: Optional[str] = None
    cause: Optional[str] = None
    priority: Optional[str] = None
    operational_notes: Optional[str] = None
    actor: str = "staff"

class AdminUserCreate(BaseModel):
    username: str
    full_name: str
    password: str
    role: str = "staff"


class AdminUserStatusUpdate(BaseModel):
    is_active: bool


class AssistantChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    history: list[dict[str, str]] = Field(
        default_factory=list,
        max_length=10,
    )

# ============================================================
# Helpers
# ============================================================

def appointment_dict(row):
    return {
        "appointment_id": row[0],
        "patient_id": row[1],
        "patient_name": row[2],
        "department": row[3],
        "provider_id": row[4],
        "provider_name": row[5],
        "scheduled_time": row[6],
        "arrival_time": row[7],
        "completion_time": row[8],
        "status": row[9],
        "cause": row[10],
        "priority": row[11],
        "operational_notes": row[12],
        "created_at": row[13],
        "updated_at": row[14],
    }


def get_appointment_query():
    return """
        SELECT
            a.appointment_id,
            a.patient_id,
            CASE
                WHEN p.patient_id IS NOT NULL
                THEN p.first_name || ' ' || p.last_name
                ELSE NULL
            END AS patient_name,
            a.department,
            a.provider_id,
            CASE
                WHEN pr.provider_id IS NOT NULL
                THEN pr.first_name || ' ' || pr.last_name
                ELSE NULL
            END AS provider_name,
            a.scheduled_time,
            a.arrival_time,
            a.completion_time,
            a.status,
            a.cause,
            a.priority,
            a.operational_notes,
            a.created_at,
            a.updated_at
        FROM appointments a
        LEFT JOIN patients p
            ON a.patient_id = p.patient_id
        LEFT JOIN providers pr
            ON a.provider_id = pr.provider_id
    """


def create_audit_log(
    cursor,
    appointment_id: str,
    action: str,
    description: str,
    actor: str = "system",
):
    cursor.execute(
        """
        INSERT INTO audit_logs (
            appointment_id,
            action,
            description,
            actor
        )
        VALUES (%s, %s, %s, %s)
        """,
        (
            appointment_id,
            action,
            description,
            actor,
        ),
    )


# ============================================================
# Health
# ============================================================

@app.get("/health")
def health_check():
    try:
        with get_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()

        return {
            "status": "healthy",
            "database": "connected",
            "service": "med-intel-api",
        }

    except Exception as error:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "unhealthy",
                "database": "disconnected",
                "error": str(error),
            },
        )


# ============================================================
# Patients
# ============================================================

@app.get("/patients")
def get_patients(user: dict = Depends(get_current_user)):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    p.patient_id,
                    p.first_name,
                    p.last_name,
                    p.date_of_birth,
                    EXTRACT(
                        YEAR FROM AGE(CURRENT_DATE, p.date_of_birth)
                    )::int AS age,
                    p.created_at,
                    p.updated_at,
                    COUNT(a.id) AS appointment_count
                FROM patients p
                LEFT JOIN appointments a
                    ON p.patient_id = a.patient_id
                GROUP BY
                    p.patient_id,
                    p.first_name,
                    p.last_name,
                    p.date_of_birth,
                    p.created_at,
                    p.updated_at
                ORDER BY p.last_name, p.first_name
                """
            )

            rows = cursor.fetchall()

    return [
        {
            "patient_id": row[0],
            "first_name": row[1],
            "last_name": row[2],
            "date_of_birth": row[3],
            "age": row[4],
            "created_at": row[5],
            "updated_at": row[6],
            "appointment_count": row[7],
        }
        for row in rows
    ]


@app.get("/patients/{patient_id}")
def get_patient(
    patient_id: str,
    user: dict = Depends(get_current_user),
):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    patient_id,
                    first_name,
                    last_name,
                    date_of_birth,
                    EXTRACT(
                        YEAR FROM AGE(CURRENT_DATE, date_of_birth)
                    )::int AS age,
                    created_at,
                    updated_at
                FROM patients
                WHERE patient_id = %s
                """,
                (patient_id,),
            )

            row = cursor.fetchone()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="Patient not found",
        )

    return {
        "patient_id": row[0],
        "first_name": row[1],
        "last_name": row[2],
        "date_of_birth": row[3],
        "age": row[4],
        "created_at": row[5],
        "updated_at": row[6],
    }


@app.get("/patients/{patient_id}/history")
def get_patient_history(
    patient_id: str,
    user: dict = Depends(get_current_user),
):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT patient_id FROM patients WHERE patient_id = %s",
                (patient_id,),
            )

            if cursor.fetchone() is None:
                raise HTTPException(
                    status_code=404,
                    detail="Patient not found",
                )

            cursor.execute(
                get_appointment_query()
                + """
                WHERE a.patient_id = %s
                ORDER BY a.scheduled_time DESC
                """,
                (patient_id,),
            )

            rows = cursor.fetchall()

    return [appointment_dict(row) for row in rows]


@app.post("/patients", status_code=201)
def create_patient(
    patient: PatientCreate,
    user: dict = Depends(get_current_user),
):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            try:
                cursor.execute(
                    "SELECT 'P' || nextval('patient_id_seq')::text"
                )
                patient_id = cursor.fetchone()[0]

                cursor.execute(
                    """
                    INSERT INTO patients (
                        patient_id,
                        first_name,
                        last_name,
                        date_of_birth
                    )
                    VALUES (%s, %s, %s, %s)
                    RETURNING
                        patient_id,
                        first_name,
                        last_name,
                        date_of_birth,
                        created_at,
                        updated_at
                    """,
                    (
                        patient_id,
                        patient.first_name,
                        patient.last_name,
                        patient.date_of_birth,
                    ),
                )

                row = cursor.fetchone()

            except Exception as error:
                connection.rollback()

                if "duplicate key" in str(error).lower():
                    raise HTTPException(
                        status_code=409,
                        detail="Generated appointment ID already exists. Please try again.",
                    )

                raise HTTPException(
                    status_code=500,
                    detail="Failed to create patient.",
                )

    return {
        "patient_id": row[0],
        "first_name": row[1],
        "last_name": row[2],
        "date_of_birth": row[3],
        "created_at": row[4],
        "updated_at": row[5],
    }


# ============================================================
# Departments
# ============================================================

@app.get("/departments")
def get_departments(user: dict = Depends(get_current_user)):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    department_id,
                    name,
                    description,
                    created_at
                FROM departments
                ORDER BY name
                """
            )

            rows = cursor.fetchall()

    return [
        {
            "department_id": row[0],
            "name": row[1],
            "description": row[2],
            "created_at": row[3],
        }
        for row in rows
    ]


# ============================================================
# Providers
# ============================================================

@app.get("/providers")
def get_providers(user: dict = Depends(get_current_user)):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    pr.provider_id,
                    pr.first_name,
                    pr.last_name,
                    pr.department_id,
                    d.name AS department_name,
                    pr.created_at,
                    pr.updated_at
                FROM providers pr
                LEFT JOIN departments d
                    ON pr.department_id = d.department_id
                ORDER BY pr.last_name, pr.first_name
                """
            )

            rows = cursor.fetchall()

    return [
        {
            "provider_id": row[0],
            "first_name": row[1],
            "last_name": row[2],
            "department_id": row[3],
            "department_name": row[4],
            "created_at": row[5],
            "updated_at": row[6],
        }
        for row in rows
    ]


@app.post("/providers", status_code=201)
def create_provider(
    provider: ProviderCreate,
    user: dict = Depends(get_current_user),
):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            try:
                if provider.department_id is not None:
                    cursor.execute(
                        """
                        SELECT department_id
                        FROM departments
                        WHERE department_id = %s
                        """,
                        (provider.department_id,),
                    )

                    if cursor.fetchone() is None:
                        raise HTTPException(
                            status_code=400,
                            detail="Department not found.",
                        )

                cursor.execute(
                    """
                    INSERT INTO providers (
                        provider_id,
                        first_name,
                        last_name,
                        department_id
                    )
                    VALUES (%s, %s, %s, %s)
                    RETURNING
                        provider_id,
                        first_name,
                        last_name,
                        department_id,
                        created_at,
                        updated_at
                    """,
                    (
                        provider.provider_id,
                        provider.first_name,
                        provider.last_name,
                        provider.department_id,
                    ),
                )

                row = cursor.fetchone()

            except HTTPException:
                connection.rollback()
                raise

            except Exception as error:
                connection.rollback()

                if "duplicate key" in str(error).lower():
                    raise HTTPException(
                        status_code=409,
                        detail="A provider with that ID already exists.",
                    )

                raise HTTPException(
                    status_code=500,
                    detail="Failed to create provider.",
                )

    return {
        "provider_id": row[0],
        "first_name": row[1],
        "last_name": row[2],
        "department_id": row[3],
        "created_at": row[4],
        "updated_at": row[5],
    }


# ============================================================
# Appointments
# ============================================================

@app.get("/appointments")
def get_appointments(user: dict = Depends(get_current_user)):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                get_appointment_query()
                + """
                ORDER BY a.scheduled_time
                """
            )

            rows = cursor.fetchall()

    return [appointment_dict(row) for row in rows]


@app.get("/appointments/{appointment_id}")
def get_appointment(
    appointment_id: str,
    user: dict = Depends(get_current_user),
):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                get_appointment_query()
                + """
                WHERE a.appointment_id = %s
                """,
                (appointment_id,),
            )

            row = cursor.fetchone()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found",
        )

    return appointment_dict(row)

@app.post("/appointments", status_code=201)
def create_appointment(
    appointment: AppointmentCreate,
    user: dict = Depends(get_current_user),
):
    if appointment.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail="Invalid appointment status.",
        )
    cause = appointment.cause or None
    if appointment.cause and appointment.cause not in VALID_CAUSES:
        raise HTTPException(
            status_code=400,
            detail="Invalid appointment cause.",
        )

    if appointment.priority not in VALID_PRIORITIES:
        raise HTTPException(
            status_code=400,
            detail="Invalid appointment priority.",
        )

    with get_connection() as connection:
        with connection.cursor() as cursor:
            try:
                # Generate the next appointment ID using PostgreSQL.
                cursor.execute(
                    "SELECT 'A' || nextval('appointment_id_seq')::text"
                )
                appointment_id = cursor.fetchone()[0]

                if appointment.patient_id is not None:
                    cursor.execute(
                        """
                        SELECT patient_id
                        FROM patients
                        WHERE patient_id = %s
                        """,
                        (appointment.patient_id,),
                    )

                    if cursor.fetchone() is None:
                        raise HTTPException(
                            status_code=400,
                            detail="Patient not found.",
                        )

                cursor.execute(
                    """
                    SELECT department_id
                    FROM departments
                    WHERE department_id = %s
                    """,
                    (appointment.department,),
                )

                if cursor.fetchone() is None:
                    raise HTTPException(
                        status_code=400,
                        detail="Department not found.",
                    )

                if appointment.provider_id is not None:
                    cursor.execute(
                        """
                        SELECT provider_id, department_id
                        FROM providers
                        WHERE provider_id = %s
                        """,
                        (appointment.provider_id,),
                    )

                    provider = cursor.fetchone()

                    if provider is None:
                        raise HTTPException(
                            status_code=400,
                            detail="Provider not found.",
                        )

                    if provider[1] != appointment.department:
                        raise HTTPException(
                            status_code=400,
                            detail="Provider does not belong to the selected department.",
                        )

                cursor.execute(
                    """
                    INSERT INTO appointments (
                        appointment_id,
                        patient_id,
                        department,
                        provider_id,
                        scheduled_time,
                        arrival_time,
                        completion_time,
                        status,
                        cause,
                        priority,
                        operational_notes
                    )
                    VALUES (
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s, %s
                    )
                    """,
                    (
                        appointment_id,
                        appointment.patient_id,
                        appointment.department,
                        appointment.provider_id,
                        appointment.scheduled_time,
                        appointment.arrival_time,
                        appointment.completion_time,
                        appointment.status,
                        cause,
                        appointment.priority,
                        appointment.operational_notes,
                    ),
                )

                create_audit_log(
                    cursor,
                    appointment_id,
                    "created",
                    "Appointment created.",
                    user["username"],
                )

            except HTTPException:
                connection.rollback()
                raise

            except Exception as error:
                connection.rollback()

                if "duplicate key" in str(error).lower():
                    raise HTTPException(
                        status_code=409,
                        detail="Generated appointment ID already exists. Please try again.",
                    )

                raise HTTPException(
                    status_code=500,
                    detail=f"Appointment creation error: {error}",
                )

    return get_appointment(appointment_id)


@app.patch("/appointments/{appointment_id}")
def update_appointment(
    appointment_id: str,
    appointment: AppointmentUpdate,
    user: dict = Depends(get_current_user),
):
    updates = []
    values = []

    field_map = {
        "patient_id": appointment.patient_id,
        "department": appointment.department,
        "provider_id": appointment.provider_id,
        "scheduled_time": appointment.scheduled_time,
        "arrival_time": appointment.arrival_time,
        "completion_time": appointment.completion_time,
        "status": appointment.status,
        "cause": appointment.cause,
        "priority": appointment.priority,
        "operational_notes": appointment.operational_notes,
    }

    if appointment.status is not None and appointment.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail="Invalid appointment status.",
        )

    if appointment.cause is not None and appointment.cause not in VALID_CAUSES:
        raise HTTPException(
            status_code=400,
            detail="Invalid appointment cause.",
        )

    if appointment.priority is not None and appointment.priority not in VALID_PRIORITIES:
        raise HTTPException(
            status_code=400,
            detail="Invalid appointment priority.",
        )

    with get_connection() as connection:
        with connection.cursor() as cursor:

            cursor.execute(
                """
                SELECT status, priority
                FROM appointments
                WHERE appointment_id = %s
                """,
                (appointment_id,),
            )

            existing = cursor.fetchone()

            if existing is None:
                raise HTTPException(
                    status_code=404,
                    detail="Appointment not found.",
                )

            for field, value in field_map.items():
                if value is not None:
                    updates.append(f"{field} = %s")
                    values.append(value)

            if not updates:
                raise HTTPException(
                    status_code=400,
                    detail="No fields provided for update.",
                )

            updates.append("updated_at = CURRENT_TIMESTAMP")
            values.append(appointment_id)

            try:
                cursor.execute(
                    f"""
                    UPDATE appointments
                    SET {", ".join(updates)}
                    WHERE appointment_id = %s
                    """,
                    values,
                )

                changes = []

                if appointment.status is not None:
                    changes.append(
                        f"status: {existing[0]} -> {appointment.status}"
                    )

                if appointment.priority is not None:
                    changes.append(
                        f"priority: {existing[1]} -> {appointment.priority}"
                    )

                for field in [
                    "patient_id",
                    "department",
                    "provider_id",
                    "scheduled_time",
                    "arrival_time",
                    "completion_time",
                    "cause",
                    "operational_notes",
                ]:
                    if field_map[field] is not None:
                        changes.append(f"{field} updated")

                description = (
                    "; ".join(changes)
                    if changes
                    else "Appointment updated."
                )

                create_audit_log(
                    cursor,
                    appointment_id,
                    "updated",
                    description,
                    user["username"],
                )

            except Exception:
                connection.rollback()
                raise

    return get_appointment(appointment_id)

@app.delete("/appointments/{appointment_id}")
def delete_appointment(
    appointment_id: str,
    actor: str = "staff",
    user: dict = Depends(get_current_user),
):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT appointment_id
                FROM appointments
                WHERE appointment_id = %s
                """,
                (appointment_id,),
            )

            if cursor.fetchone() is None:
                raise HTTPException(
                    status_code=404,
                    detail="Appointment not found.",
                )

            # Record deletion before deleting because the audit log
            # uses a foreign key to appointments.
            cursor.execute(
                """
                INSERT INTO audit_logs (
                    appointment_id,
                    action,
                    description,
                    actor
                )
                VALUES (%s, %s, %s, %s)
                """,
                (
                    appointment_id,
                    "deleted",
                    "Appointment deleted.",
                    actor,
                ),
            )

            # The audit row will be removed by CASCADE.
            # This endpoint is mainly retained for administrative cleanup.
            cursor.execute(
                """
                DELETE FROM appointments
                WHERE appointment_id = %s
                """,
                (appointment_id,),
            )

    return {
        "message": "Appointment deleted",
        "appointment_id": appointment_id,
    }


# ============================================================
# Audit logs
# ============================================================

@app.get("/appointments/{appointment_id}/audit")
def get_appointment_audit(
    appointment_id: str,
    user: dict = Depends(get_current_user),
):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    id,
                    appointment_id,
                    action,
                    description,
                    actor,
                    created_at
                FROM audit_logs
                WHERE appointment_id = %s
                ORDER BY created_at DESC
                """,
                (appointment_id,),
            )

            rows = cursor.fetchall()

    return [
        {
            "id": row[0],
            "appointment_id": row[1],
            "action": row[2],
            "description": row[3],
            "actor": row[4],
            "created_at": row[5],
        }
        for row in rows
    ]


# ============================================================
# Analytics
# ============================================================

@app.get("/analytics/summary")
def get_analytics_summary(user: dict = Depends(get_current_user)):
    with get_connection() as connection:
        with connection.cursor() as cursor:

            cursor.execute(
                """
                SELECT COUNT(*)
                FROM appointments
                """
            )
            total_appointments = cursor.fetchone()[0]

            cursor.execute(
                """
                SELECT COUNT(*)
                FROM appointments
                WHERE status = 'completed'
                """
            )
            completed = cursor.fetchone()[0]

            cursor.execute(
                """
                SELECT COUNT(*)
                FROM appointments
                WHERE status = 'no_show'
                """
            )
            no_shows = cursor.fetchone()[0]

            cursor.execute(
                """
                SELECT COUNT(*)
                FROM appointments
                WHERE status = 'cancelled'
                """
            )
            cancelled = cursor.fetchone()[0]

            cursor.execute(
                """
                SELECT
                    COALESCE(
                        ROUND(
                            AVG(
                                EXTRACT(
                                    EPOCH FROM (
                                        completion_time - arrival_time
                                    )
                                ) / 60
                            ),
                            2
                        ),
                        0
                    )
                FROM appointments
                WHERE
                    arrival_time IS NOT NULL
                    AND completion_time IS NOT NULL
                """
            )
            average_service_minutes = float(cursor.fetchone()[0])

            cursor.execute(
                """
                SELECT
                    department,
                    COUNT(*) AS appointment_count,
                    SUM(
                        CASE
                            WHEN status = 'no_show' THEN 1
                            ELSE 0
                        END
                    ) AS no_show_count
                FROM appointments
                GROUP BY department
                ORDER BY appointment_count DESC
                """
            )

            department_rows = cursor.fetchall()

            cursor.execute(
                """
                SELECT
                    cause,
                    COUNT(*)
                FROM appointments
                WHERE cause IS NOT NULL
                GROUP BY cause
                ORDER BY COUNT(*) DESC
                """
            )

            cause_rows = cursor.fetchall()

            cursor.execute(
                """
                SELECT
                    priority,
                    COUNT(*)
                FROM appointments
                GROUP BY priority
                ORDER BY COUNT(*) DESC
                """
            )

            priority_rows = cursor.fetchall()

    no_show_rate = (
        round((no_shows / total_appointments) * 100, 2)
        if total_appointments
        else 0
    )



    return {
        "total_appointments": total_appointments,
        "completed_appointments": completed,
        "no_shows": no_shows,
        "cancelled": cancelled,
        "no_show_rate_percent": no_show_rate,
        "average_service_minutes": average_service_minutes,
        "by_department": [
            {
                "department": row[0],
                "appointment_count": row[1],
                "no_show_count": row[2],
            }
            for row in department_rows
        ],
        "by_cause": [
            {
                "cause": row[0],
                "count": row[1],
            }
            for row in cause_rows
        ],
        "by_priority": [
            {
                "priority": row[0],
                "count": row[1],
            }
            for row in priority_rows
        ],
    }

@app.get("/analytics/ai-summary")
def get_ai_summary(user: dict = Depends(get_current_user)):
    analytics = analytics_summary()

    prompt = f"""
You are an operations intelligence assistant for a fictional hospital operations system.

You are given authoritative operational metrics calculated by the application.

Do not invent statistics.
Do not provide medical diagnoses.
Do not recommend medical treatment.
Do not assume information that is not present.

Summarize the operational situation for a hospital staff administrator.

Authoritative metrics:

Total appointments: {analytics["total_appointments"]}
Completed appointments: {analytics["completed_appointments"]}
No-shows: {analytics["no_shows"]}
Cancelled appointments: {analytics["cancelled"]}
No-show rate: {analytics["no_show_rate_percent"]}%
Average service time: {analytics["average_service_minutes"]} minutes

By department:
{analytics["by_department"]}

By appointment cause:
{analytics["by_cause"]}

By priority:
{analytics["by_priority"]}

Provide:
1. A short overall summary.
2. Two or three notable operational observations.
3. One or two areas staff may want to investigate.

Clearly distinguish observations from recommendations.
"""

    try:
        response = httpx.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={
                "model": "llama3.2:3b",
                "prompt": prompt,
                "stream": False,
            },
            timeout=120.0,
        )

        response.raise_for_status()

        data = response.json()

        return {
            "model": "llama3.2:3b",
            "summary": data.get("response", "").strip(),
            "metrics": analytics,
        }

    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=503,
            detail=f"Ollama service unavailable: {error}",
        )

@app.post("/assistant/chat")
def assistant_chat(
    request: AssistantChatRequest,
    user: dict = Depends(get_current_user),
):
    message = request.message.strip()

    conversation_text = " ".join(
        item.get("content", "")
        for item in request.history
        if isinstance(item, dict)
    ).lower()

    scope_text = f"{conversation_text} {message.lower()}"

    med_intel_terms = [
        "med-intel",
        "med intel",
        "appointment",
        "appointments",
        "patient",
        "patients",
        "provider",
        "providers",
        "doctor",
        "doctors",
        "department",
        "departments",
        "analytics",
        "no-show",
        "no show",
        "no-shows",
        "no shows",
        "cancelled",
        "completed",
        "waiting",
        "in progress",
        "scheduled",
        "priority",
        "cause",
        "dashboard",
        "admin",
        "administration",
        "navigation",
        "navigate",
        "portal",
        "login",
        "create",
        "update",
        "status",
        "history",
        "operations",
        "operational",
        "hospital",
    ]

    in_scope = any(term in scope_text for term in med_intel_terms)

    if not in_scope:
        return {
            "response": (
                "I'm the Med-Intel Operations Assistant. "
                "I can only help with Med-Intel patients, appointments, "
                "providers, departments, operational analytics, and portal "
                "operations."
            )
        }

    analytics = get_analytics_summary(user)

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    patient_id,
                    first_name,
                    last_name,
                    date_of_birth
                FROM patients
                ORDER BY last_name, first_name
                LIMIT 50
                """
            )
            patients = cursor.fetchall()

            cursor.execute(
                """
                SELECT
                    provider_id,
                    first_name,
                    last_name,
                    department_id
                FROM providers
                ORDER BY last_name, first_name
                LIMIT 50
                """
            )
            providers = cursor.fetchall()

            cursor.execute(
                """
                SELECT
                    department_id,
                    name,
                    description
                FROM departments
                ORDER BY name
                """
            )
            departments = cursor.fetchall()

            cursor.execute(
                """
                SELECT
                    appointment_id,
                    patient_id,
                    department,
                    provider_id,
                    scheduled_time,
                    status,
                    cause,
                    priority,
                    operational_notes
                FROM appointments
                ORDER BY scheduled_time DESC
                LIMIT 50
                """
            )
            appointments = cursor.fetchall()

    history_lines = []

    for item in request.history[-10:]:
        role = item.get("role", "")
        content = item.get("content", "")

        if role and content:
            history_lines.append(
                f"{role}: {content}"
            )

    conversation_history = (
        "\n".join(history_lines)
        if history_lines
        else "No previous conversation."
    )

    prompt = f"""
You are the Med-Intel Operations Assistant inside a fictional hospital
operations management portal.

Your job is to help authenticated staff with:
- appointments
- patients
- providers
- departments
- operational analytics
- portal navigation and workflows

You are NOT a general-purpose assistant.

Rules:
- Only answer questions related to Med-Intel and hospital operations.
- Do not provide medical diagnoses.
- Do not recommend medical treatment.
- Do not invent database facts.
- Treat the operational data below as authoritative.
- If the requested information is not present, say that it is not available.
- When answering a how-to question about the portal, explain the workflow clearly.
- Do not expose passwords, password hashes, secret keys, access tokens, or other authentication secrets.
- Keep answers concise and useful for hospital operations staff.
- Do not claim that a patient record is medical advice; this system is for operational use only.

Current authenticated user:
Username: {user["username"]}
Role: {user["role"]}

Current operational analytics:
{analytics}

Patients:
{patients}

Providers:
{providers}

Departments:
{departments}

Recent appointments:
{appointments}

Previous conversation:
{conversation_history}

Current user message:
{message}

Answer the user's current question directly.
"""

    try:
        response = httpx.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={
                "model": "llama3.2:3b",
                "prompt": prompt,
                "stream": False,
            },
            timeout=120.0,
        )

        response.raise_for_status()

        data = response.json()

        assistant_response = data.get("response", "").strip()

        if not assistant_response:
            raise HTTPException(
                status_code=503,
                detail="Ollama returned an empty response.",
            )

        return {
            "response": assistant_response,
            "model": "llama3.2:3b",
        }

    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=503,
            detail=f"Ollama service unavailable: {error}",
        )


@app.post("/auth/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(
        form_data.username,
        form_data.password,
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(user)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "username": user["username"],
            "full_name": user["full_name"],
            "role": user["role"],
        },
    }


@app.get("/auth/me")
def get_me(user: dict = Depends(get_current_user)):
    return {
        "username": user["username"],
        "full_name": user["full_name"],
        "role": user["role"],
    }

@app.get("/admin/users")
def list_users(admin: dict = Depends(require_admin)):
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT
                    id,
                    username,
                    full_name,
                    role,
                    is_active,
                    created_at
                FROM users
                ORDER BY username
                """
            )
            users = cur.fetchall()

    return users


@app.post("/admin/users")
def create_admin_user(
    user_data: AdminUserCreate,
    admin: dict = Depends(require_admin),
):
    if user_data.role not in {"staff", "admin"}:
        raise HTTPException(
            status_code=400,
            detail="Role must be either staff or admin.",
        )

    if len(user_data.password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least 8 characters.",
        )

    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "SELECT id FROM users WHERE username = %s",
                (user_data.username,),
            )

            if cur.fetchone():
                raise HTTPException(
                    status_code=409,
                    detail="Username already exists.",
                )

            password_hash = hash_password(user_data.password)

            cur.execute(
                """
                INSERT INTO users (
                    username,
                    full_name,
                    password_hash,
                    role
                )
                VALUES (%s, %s, %s, %s)
                RETURNING id, username, full_name, role, is_active, created_at
                """,
                (
                    user_data.username,
                    user_data.full_name,
                    password_hash,
                    user_data.role,
                ),
            )

            created_user = cur.fetchone()

        conn.commit()

    return created_user


@app.patch("/admin/users/{username}")
def update_user_status(
    username: str,
    status_update: AdminUserStatusUpdate,
    admin: dict = Depends(require_admin),
):
    if username == admin["username"] and not status_update.is_active:
        raise HTTPException(
            status_code=400,
            detail="You cannot deactivate your own account.",
        )

    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                UPDATE users
                SET is_active = %s
                WHERE username = %s
                RETURNING id, username, full_name, role, is_active, created_at
                """,
                (
                    status_update.is_active,
                    username,
                ),
            )

            updated_user = cur.fetchone()

        conn.commit()

    if not updated_user:
        raise HTTPException(
            status_code=404,
            detail="User not found.",
        )

    return updated_user