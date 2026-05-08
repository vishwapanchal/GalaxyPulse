import urllib.request
import urllib.error
import json

url = "https://galaxypulse.onrender.com/api/feedback/trigger"
data = json.dumps({
    "chat_id": 6536013557,
    "feature": "AI Photo Erase",
    "health_context": {}
}).encode("utf-8")

req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")

try:
    with urllib.request.urlopen(req) as response:
        print("SUCCESS:", response.status, response.read().decode())
except urllib.error.HTTPError as e:
    print("HTTP ERROR:", e.code, e.read().decode())
except Exception as e:
    print("OTHER ERROR:", str(e))
