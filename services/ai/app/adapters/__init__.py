# Real model adapters go in this folder. Owner: Qussai.
#
# One file per model, for example muaalem.py and whisper_quran.py. Each adapter takes the
# audio and the expected ayah and returns findings built with app.policy.make_finding, so
# models can be swapped or switched off without changing anything else (NFR-AI-002).
#
# TODO(week 2, Qussai): quality gate (app/quality.py) and the first real adapters.
