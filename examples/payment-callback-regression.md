# Payment callback regression

Run this from the affected service repository:

```sh
qwen-local-incident
```

Then paste:

```text
Treat this as an authorized local incident investigation. A payment-provider callback handler may transition a booking to confirmed without independently establishing settled payment. Do not contact production, staging, the provider, or any booking API. Do not use real transaction or booking identifiers.

Inspect the callback handler and the payment-to-booking state machine. Build sanitized fixtures and regression tests for a valid signed callback, forged or missing authentication, replay, order mismatch, amount mismatch, unexpected prior state, duplicate delivery, and concurrent delivery. Determine whether the current code can confirm an unpaid booking, identify the exact trust-boundary failure, and implement the smallest production-safe fix if the repository contains enough evidence. Run the focused tests and relevant surrounding suite. End with an evidence matrix showing each case, expected behavior, observed behavior, and the command that produced it.
```

Incident mode blocks network access for tool processes. If the final proof needs an approved staging replay, keep that as a separately reviewed manual step with sanitized identifiers.
