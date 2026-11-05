# Evaluation dataset requirements

Owner: Ismail. Status: DRAFT TEMPLATE.

**Datasets and audio are never committed to this repository (it is public).** They live in private,
access-controlled storage.

## To specify

| Topic                | Questions                                                                        |
| -------------------- | -------------------------------------------------------------------------------- |
| Coverage             | Which surahs, ayahs and Tajweed rules? How many examples per rule?               |
| Speakers             | Ages, genders, dialect backgrounds, proficiency levels, reciters.                |
| Recording conditions | Devices, rooms, noise levels, the formats and sample rates in `AUDIO_LIMITS`.    |
| Labels               | Labeled by qualified teachers? How many labelers per clip? Agreement target?     |
| Splits               | Train/validation/test split **by speaker**, never by clip.                       |
| Quality bar          | Minimum accuracy per rule before a rule goes live. When does it always escalate? |
| Consent and privacy  | Consent wording, children's data rules, anonymization, retention, deletion.      |
| Storage and access   | Where it lives, who can access it, how access is logged.                         |
