import sys
import os
import json
import time

try:
    from pytubefix import YouTube
    from pytubefix.cli import on_progress
except ImportError:
    try:
        from pytube import YouTube
    except ImportError:
        print(json.dumps({"error": "Module not found. Please run: pip install pytubefix"}))
        sys.exit(1)

def download_video(url, output_dir):
    try:
        # Create output directory if not exists
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

        # pytubefix often needs 'use_oauth=True' or 'client' tweaks, but defaults are usually better than pytube
        # sometimes passing 'client='WEB'' helps
        yt = YouTube(url, client='WEB') 
        
        # Get duration
        duration = yt.length

        # Select stream: Progressive (audio+video) and mp4, filtering for highest resolution available
        stream = yt.streams.filter(progressive=True, file_extension='mp4').order_by('resolution').desc().first()

        if not stream:
            print(json.dumps({"error": "No suitable stream found"}))
            sys.exit(1)

        # Generate safe filename
        safe_title = "".join([c for c in yt.title if c.isalpha() or c.isdigit() or c==' ' or c in ('_','-')]).rstrip()
        if not safe_title:
            safe_title = "video"
            
        filename = f"yt-{int(time.time())}-{safe_title}.mp4"
        
        # Download
        stream.download(output_path=output_dir, filename=filename)

        result = {
            "filename": filename,
            "duration": duration,
            "title": yt.title
        }
        
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Missing arguments"}))
        sys.exit(1)
        
    url = sys.argv[1]
    output_dir = sys.argv[2]
    
    download_video(url, output_dir)
