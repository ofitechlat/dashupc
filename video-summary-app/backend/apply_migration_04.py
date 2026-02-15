
import os
from supabase import create_client, Client

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "https://wyamimzezkkopcaspwkp.supabase.co")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(url, key)

def apply_migration():
    print("Applying Migration 04...")
    with open("migrations/04_fix_rls.sql", "r", encoding="utf-8") as f:
        sql = f.read()
    
    # Split by statements if needed, or run as one block if pg supports it via rpc or simple execution.
    # Supabase-py 'rpc' or direct SQL execution isn't standard in client unless a function exists.
    # But we can use the 'postgres' python library if installed? No, user has `supabase`.
    # Wait, supabase-js has `rpc`. supabase-py has `rpc`.
    # Do we have a sql execution function? 
    # Usually `backend/main.py` might have one.
    # Or we can use `supabase.postgrest.rpc('exec_sql', {'query': sql})` IF the function exists.
    
    # If no `exec_sql` RPC exists, we can't run DDL via the Client directly unless we have psql access or a custom function.
    # Check if `exec_sql` exists?
    
    # Workaround: The previous `migration.py` (if it existed) would show how.
    # But I check `backend` files earlier. `backend/migration.sql` was there.
    # The user might not have a way to run SQL via python script easily without `psycopg2`.
    # I saw `venv` so `psycopg2` might be installed?
    # I'll try to import psycopg2.
    
    with open("migration_log.txt", "w") as log:
        # Try Psycopg2
        try:
            import psycopg2
            conn_str = "postgresql://postgres:R4-wT433%23V$8Lpa@db.wyamimzezkkopcaspwkp.supabase.co:5432/postgres"
            
            msg = "Connecting to DB via Psycopg2...\n"
            log.write(msg)
            print(msg)
            conn = psycopg2.connect(conn_str)
            cur = conn.cursor()
            cur.execute(sql)
            conn.commit()
            msg = "Migration applied successfully via Psycopg2!\n"
            log.write(msg)
            print(msg)
            cur.close()
            conn.close()
            return

        except Exception as e:
            msg = f"Psycopg2 Failed: {e}\n"
            log.write(msg)
            print(msg)
            
        msg = "Trying RPC fallback...\n"
        log.write(msg)
        print(msg)
        # Try RPC
        try:
            response = supabase.rpc('exec_sql', {'sql_query': sql}).execute()
            msg = f"RPC Response: {response}\n"
            log.write(msg)
            print(msg)
        except Exception as e:
            msg = f"RPC Failed: {e}\n"
            log.write(msg)
            print(msg)

if __name__ == "__main__":
    apply_migration()
