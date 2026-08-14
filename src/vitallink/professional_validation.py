"""Audited local command for professional validation decisions."""

import argparse
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import select

from vitallink.database import Account, AuditEvent, Professional, SessionFactory
from vitallink.main import audit_identifier, keyed_digest


def validated_text(value: str, minimum: int, maximum: int, label: str) -> str:
    """Validate bounded command text without control characters.

    Args:
        value: Submitted command argument.
        minimum: Smallest accepted stripped length.
        maximum: Largest accepted stripped length.
        label: Safe argument name used in errors.

    Returns:
        Stripped validated text.

    Raises:
        ValueError: If the value is outside its boundary or contains controls.
    """
    stripped = value.strip()
    if not minimum <= len(stripped) <= maximum or any(ord(character) < 32 for character in stripped):
        raise ValueError(f"invalid {label}")
    return stripped


def record_validation(
    crm: str,
    uf: str,
    operator: str,
    decision: str,
    justification: str,
) -> bool:
    """Persist one restricted professional validation transition atomically.

    Args:
        crm: Professional registry number.
        uf: Registry state.
        operator: Explicit local operator identity.
        decision: Approved or rejected decision.
        justification: Decision rationale.

    Returns:
        True for a new or identical idempotent decision, otherwise False.
    """
    normalized_crm = validated_text(crm, 1, 32, "crm").upper()
    normalized_uf = validated_text(uf, 2, 2, "uf").upper()
    normalized_operator = validated_text(operator, 3, 100, "operator")
    normalized_justification = validated_text(justification, 10, 500, "justification")
    if decision not in {"approved", "rejected"}:
        raise ValueError("invalid decision")
    operator_id = keyed_digest(f"operator:{normalized_operator}")
    correlation_id = uuid4()
    desired_status = "active" if decision == "approved" else "rejected"

    with SessionFactory() as session:
        professional = session.scalar(
            select(Professional)
            .where(Professional.crm == normalized_crm, Professional.uf == normalized_uf)
            .with_for_update()
        )
        account = session.get(Account, professional.account_id) if professional is not None else None
        if professional is None or account is None:
            session.add(
                AuditEvent(
                    actor_id=operator_id,
                    action="professional.validation.decided",
                    target_id=keyed_digest(f"professional:{normalized_crm}:{normalized_uf}"),
                    result="denied",
                    reason="professional_not_found",
                    correlation_id=correlation_id,
                    event_metadata={"decision": decision},
                )
            )
            session.commit()
            return False

        identical = (
            account.status == desired_status
            and professional.validation_operator_id == operator_id
            and professional.validation_decision == decision
            and professional.validation_justification == normalized_justification
        )
        allowed = account.status == "pending_validation"
        if allowed:
            account.status = desired_status
            professional.validation_operator_id = operator_id
            professional.validation_decision = decision
            professional.validation_justification = normalized_justification
            professional.validated_at = datetime.now(UTC)
        session.add(
            AuditEvent(
                actor_id=operator_id,
                action="professional.validation.decided",
                target_id=audit_identifier(account.id),
                result="success" if allowed or identical else "denied",
                reason="decision_recorded" if allowed else "identical_replay" if identical else "invalid_transition",
                correlation_id=correlation_id,
                event_metadata={"decision": decision},
            )
        )
        session.commit()
        return allowed or identical


def main() -> int:
    """Parse the local command and persist its audited decision.

    Returns:
        Zero on a recorded or identical decision, one otherwise.
    """
    parser = argparse.ArgumentParser(description="Record a professional validation decision.")
    parser.add_argument("--crm", required=True)
    parser.add_argument("--uf", required=True)
    parser.add_argument("--operator", required=True)
    parser.add_argument("--decision", required=True, choices=("approved", "rejected"))
    parser.add_argument("--justification", required=True)
    arguments = parser.parse_args()
    try:
        recorded = record_validation(
            arguments.crm,
            arguments.uf,
            arguments.operator,
            arguments.decision,
            arguments.justification,
        )
    except ValueError:
        parser.error("invalid command input")
    if not recorded:
        print("Professional validation was not recorded.")
        return 1
    print("Professional validation recorded.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
