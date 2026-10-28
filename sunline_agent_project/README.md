# SUNLINE Ops Agent — Week 1

Plain-Python agent loop + 2 read-only tools + full step logging.

## Setup
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # add ANTHROPIC_API_KEY, DATABASE_URL
python -m pytest            # works without any API key (fake LLM)
python -m sunline_agent.seed_demo   # demo catalog (SQLite), optional
python -m sunline_agent.cli         # chat in the terminal
```

## Adapt to your schema
Edit the SQL in `sunline_agent/tools.py` (see the ADAPT HERE note).
Use a COPY of the database, ideally with a read-only DB user.

## Inspect what the agent did
```sql
SELECT step_no, type, tool_name, input, output, error, duration_ms
FROM agent_steps WHERE run_id = 1 ORDER BY id;
```
