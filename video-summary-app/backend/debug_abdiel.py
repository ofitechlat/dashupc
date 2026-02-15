
import os
from supabase import create_client, Client

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "https://wyamimzezkkopcaspwkp.supabase.co")
# Service Role Key (Bypasses RLS)
# key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

# Public Key (Respects RLS)
key = os.environ.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY", "sb_publishable_swRXzc9-NWybPD7sT9FsCg_uV3wjLqS") 

supabase: Client = create_client(url, key)

def check_abdiel():
    with open("debug_output.txt", "w", encoding="utf-8") as f:
        print("Starting Search...", file=f)
        # 1. Find Student
        try:
            response = supabase.table('students').select("*").ilike('name', '%Abdiel%').execute()
            students = response.data
            # 1. Inspect Student(s)
            print("\n--- Inspecting Student(s) ---", file=f)
            
            # Check for Duplicate Abdiels using ILIKE
            response = supabase.table("students").select("id, name, email, user_id, phone").ilike("name", "%Abdiel%").execute()
            students = response.data
            
            print(f"Found {len(students)} student(s) matching 'Abdiel':", file=f)
            
            for s in students:
                print(f"\n[Student Record]", file=f)
                print(f"  ID:       {s.get('id')}", file=f)
                print(f"  Name:     {s.get('name')}", file=f)
                print(f"  Email:    {s.get('email')}", file=f)
                print(f"  Phone:    {s.get('phone')}", file=f)
                print(f"  UserID:   {s.get('user_id')}  <-- Linked Auth User", file=f)
                
                # Check Requests for THIS specific student ID
                reqs = supabase.table("course_requests").select("id, status, payment_status, total_price, amount_paid").eq("student_id", s['id']).execute()
                print(f"  Requests: {len(reqs.data)}", file=f)
                for r in reqs.data:
                    print(f"    - ReqID: {r['id']} | Status: {r['status']} | Payment: {r.get('payment_status')} | Balance: {r.get('total_price', 0) - r.get('amount_paid', 0)}", file=f)
                
                # Check Classes
                cls = supabase.table("classes").select("id, request_id").eq("student_id", s['id']).execute()
                print(f"  Classes:  {len(cls.data)}", file=f)
                for c in cls.data:
                     print(f"    - ClassID: {c['id']} | LinkedReq: {c.get('request_id')}", file=f)

            # 2. Check if there are ORPHANED requests (Requests with student_id that doesn't exist? Unlikely due to FK)
            # But maybe connected to a different student name?
        except Exception as e:
            print(f"ERROR: {e}", file=f)

if __name__ == "__main__":
    check_abdiel()
