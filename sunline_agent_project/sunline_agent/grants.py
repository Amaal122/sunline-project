"""Print the SQL that creates a database role for the agent with the MINIMUM rights.

    python -m sunline_agent.grants > agent_ro.sql
    Get-Content agent_ro.sql | docker exec -i sunline-postgres psql -U sunline -d sunline_agent_dev -v agent_pw=CHANGE_ME

The role can read ONLY the columns listed in shop_tables.READ_TABLES: no users table (password hashes),
no names, emails, street addresses or postal codes, and it can never write or delete anything."""
import sys

from .shop_tables import READ_TABLES


def grant_sql(role: str = "agent_ro", db_hint: str = "") -> str:
    lines = [
        f"-- Least-privilege role for the SUNLINE agent {db_hint}".rstrip(),
        f"DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '{role}') THEN",
        f"  CREATE ROLE {role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;",
        "END IF; END $$;",
        f"ALTER ROLE {role} PASSWORD :'agent_pw';",
        f"REVOKE ALL ON ALL TABLES IN SCHEMA public FROM {role};",
        f"GRANT USAGE ON SCHEMA public TO {role};",
    ]
    for t in READ_TABLES:
        cols = ", ".join(c.name for c in t.columns)
        lines.append(f"GRANT SELECT ({cols}) ON {t.name} TO {role};")
    return "\n".join(lines) + "\n"


if __name__ == "__main__":
    sys.stdout.write(grant_sql())
