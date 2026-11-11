# ADR-0007: Mission selection guardrails

- Status: Proposed (owners: Qussai / Ismail)
- Context: Family Loop missions must come from a fixed, reviewed table (safety doc 2.3,
  FR-AGT-004), and no generated text may reach a child or family (AP-11, C-02). We still want a
  prompt contract and guardrails ready, so that if a selector model is ever considered, it can
  only ever choose, never write.
- Decisions:
  - **Selection only.** The service answers with a `missionId` from the catalog. Wording comes
    from the app's reviewed messages under the mission's `textKey`.
  - **Rules first.** The rules always choose a mission. A selector model is optional, behind
    `MISSIONS_AI_ENABLED` (off by default), and its answer replaces the rules' only after it
    passes the output guardrails.
  - **Only reviewed missions.** `approved` missions are served. `placeholder` missions are served
    in `MOCK_MODE` only; `draft` never.
  - **No personal data by construction.** The request holds only a uuid, a level and ids. There is
    no free-text field to fill.
  - **Versioned prompt.** The template is a file (`mission_select_v0.txt`) and every response says
    which prompt version was used.
  - **No real model yet.** Only a deterministic mock selector exists. Adding a real (local) model
    needs this ADR accepted and a new review (safety doc 2.6).
- Contract: `docs/contracts/mission-selection.md`
- Open questions: whether a model adds value over the rules at all; real values and missions;
  where the catalog lives (`content` collection).
