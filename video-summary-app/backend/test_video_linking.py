import os
from supabase import create_client, Client

# Initialize Supabase
url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "https://wyamimzezkkopcaspwkp.supabase.co")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Error: Supabase credentials not found in env")
    exit(1)

supabase: Client = create_client(url, key)

def verify_video_linking():
    print("--- Verifying Video Linking ---")
    
    # 1. Check for Videos
    videos = supabase.table("videos").select("*").limit(5).execute()
    print(f"Found {len(videos.data)} videos.")
    
    # 2. Check for Classes
    classes = supabase.table("classes").select("*").limit(5).execute()
    print(f"Found {len(classes.data)} classes.")
    
    if not classes.data:
        print("No classes to test linking.")
        return

    test_class_id = classes.data[0]['id']
    print(f"Using Class ID: {test_class_id}")
    
    # 3. Simulate Linking (We won't actually mutate unless we create a fake video)
    # Let's just check existing links
    linked_videos = supabase.table("videos").select("*").not_.is_("class_id", "null").execute()
    print(f"Videos currently assigned to classes: {len(linked_videos.data)}")
    
    if linked_videos.data:
        vid = linked_videos.data[0]
        print(f" - Video '{vid.get('title')}' is linked to Class '{vid.get('class_id')}'")
        
        # 4. Verify Student Query Logic
        # Student Page does: select classes(..., videos(...))
        print("Testing Student Query Pattern...")
        res = supabase.from_("classes").select("id, videos(id, title)").eq("id", vid.get('class_id')).execute()
        
        if res.data and res.data[0]['videos']:
            print("SUCCESS: Student Query returned the linked video!")
            print(res.data[0])
        else:
            print("FAILURE: Student Query did NOT return the video.")
    else:
        print("No videos are currently linked. Please link one via Admin Dashboard to test fully.")

verify_video_linking()
