import requests
import re
import time

def extract_video_id(url):
    patterns = [
        r"(?:v=|\/)([0-9A-Za-z_-]{11})",
        r"youtu\.be\/([0-9A-Za-z_-]{11})",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

def fetch_link(video_id, youtube_url):
    headers = {
        "Content-Type": "application/json",
        "Origin": "https://ac.insvid.com",
        "Referer": f"https://ac.insvid.com/widget?url={youtube_url}&el=100",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
    }
    payload = {"id": video_id, "fileType": "MP3"}
    res = requests.post("https://ac.insvid.com/converter", json=payload, headers=headers, timeout=30)
    return res.json()

def download_audio(youtube_url):
    video_id = extract_video_id(youtube_url)
    if not video_id:
        print("❌ Invalid YouTube URL!")
        return

    print(f"🔍 Video ID: {video_id}")

    # Poll until ready
    for _ in range(20):
        data = fetch_link(video_id, youtube_url)
        progress = data.get("progress", 0)
        status = data.get("status", "")

        print(f"\r⏳ Processing... {progress}%   ", end="", flush=True)

        if status == "ok" and data.get("link"):
            break

        time.sleep(3)
    else:
        print("\n❌ Timed out waiting for conversion!")
        return

    print()

    title = data["title"]
    link = data["link"]
    duration = data["duration"]
    filesize = data.get("filesize", 0)

    print(f"\n✅ Ready!")
    print(f"🎵 Title    : {title}")
    print(f"⏱  Duration : {round(duration)}s")
    print(f"📦 Size     : {round(filesize / 1024)}KB")

    safe_title = re.sub(r'[\\/*?:"<>|]', "", title)[:80]
    filename = f"{safe_title}.mp3"

    print(f"\n⬇️  Downloading: {filename}")
    mp3 = requests.get(link, stream=True, timeout=60)
    with open(filename, "wb") as f:
        for chunk in mp3.iter_content(chunk_size=8192):
            f.write(chunk)

    print(f"✅ Saved: {filename}")


if __name__ == "__main__":
    url = input("🎬 Paste YouTube URL: ").strip()
    download_audio(url)