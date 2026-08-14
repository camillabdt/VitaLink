"""Idempotent synthetic identity seed for the local demonstration."""

import os
from datetime import UTC, date, datetime
from uuid import uuid4

import pyotp
from sqlalchemy import select

from vitallink.database import Account, AuditEvent, Patient, SessionFactory, TotpCredential
from vitallink.main import audit_identifier, keyed_digest, password_hasher, secret_cipher


def main() -> int:
    """Create one active synthetic patient without printing credentials.

    Returns:
        Zero after the patient exists.

    Raises:
        SystemExit: If explicit synthetic credentials are absent or invalid.
    """
    password = os.environ.get("VITALINK_DEMO_PASSWORD")
    totp_secret = os.environ.get("VITALINK_DEMO_TOTP_SECRET")
    if not password or not totp_secret:
        raise SystemExit("Configure VITALINK_DEMO_PASSWORD and VITALINK_DEMO_TOTP_SECRET.")
    if len(password) < 12:
        raise SystemExit("VITALINK_DEMO_PASSWORD must contain at least 12 characters.")
    try:
        pyotp.TOTP(totp_secret).now()
    except Exception as error:
        raise SystemExit("VITALINK_DEMO_TOTP_SECRET must be a valid Base32 secret.") from error

    with SessionFactory() as session:
        account = session.scalar(select(Account).where(Account.email == "demo.patient@example.com"))
        if account is not None:
            print("Synthetic patient already exists.")
            return 0

        account = Account(
            email="demo.patient@example.com",
            password_hash=password_hasher.hash(password),
            role="patient",
            status="active",
        )
        account.patient = Patient(
            name="Paciente Demonstração",
            cpf="52998224725",
            birthdate=date(1992, 8, 13),
            phone="+5553999999999",
            blood_type="O+",
        )
        session.add(account)
        session.flush()
        session.add(
            TotpCredential(
                account_id=account.id,
                secret_ciphertext=secret_cipher.encrypt(totp_secret.encode()).decode(),
                confirmed_at=datetime.now(UTC),
            )
        )
        session.add(
            AuditEvent(
                actor_id=keyed_digest("demo-seed"),
                action="demo.seed.patient",
                target_id=audit_identifier(account.id),
                result="success",
                reason="synthetic_identity_created",
                correlation_id=uuid4(),
                event_metadata={"role": "patient"},
            )
        )
        session.commit()
    print("Synthetic patient created.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
