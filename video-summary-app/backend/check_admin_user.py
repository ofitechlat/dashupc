
import os
from supabase import create_client, Client
from dotenv import load_dotenv
from pathlib import Path

# Load env
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Error: Credenciales faltantes en .env")
    exit(1)

supabase: Client = create_client(url, key)

ADMIN_EMAIL = "506casm@gmail.com"

import requests

def check_user():
    print(f"Buscando usuario: {ADMIN_EMAIL}...")
    
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }
    
    # List users endpoint
    api_url = f"{url}/auth/v1/admin/users"
    
    try:
        response = requests.get(api_url, headers=headers)
        if response.status_code != 200:
            print(f"Error API: {response.status_code} - {response.text}")
            return

        users = response.json().get("users", [])
        found = False
        
        for u in users:
            if u.get("email") == ADMIN_EMAIL:
                print(f"Usuario encontrado!")
                print(f"   ID: {u.get('id')}")
                print(f"   Email: {u.get('email')}")
                found = True
                
                # Auto reset password
                print("\n--- Reset Password ---")
                new_pass = "admin123"
                update_url = f"{url}/auth/v1/admin/users/{u.get('id')}"
                update_data = {"password": new_pass}
                res = requests.put(update_url, headers=headers, json=update_data)
                if res.status_code == 200:
                    print(f"Contrasena actualizada exitosamente a: {new_pass}")
                else:
                    print(f"Error actualizando contrasena: {res.text}")
                break
        
        if not found:
            print("Usuario NO encontrado en Supabase Auth.")
            # Auto create
            create_url = f"{url}/auth/v1/admin/users"
            create_data = {
                "email": ADMIN_EMAIL,
                "password": "admin123",
                "email_confirm": True
            }
            res = requests.post(create_url, headers=headers, json=create_data)
            if res.status_code == 200:
                print("Usuario creado exitosamente con contrasena 'admin123'.")
            else:
                print(f"Error creando usuario: {res.text}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_user()
