import urllib.request
import json

try:
    print("Testing /api/rates on 5000...")
    req = urllib.request.Request("http://localhost:5000/api/rates", method="HEAD")
    with urllib.request.urlopen(req) as resp:
        print("HEAD /api/rates status:", resp.status)
except Exception as e:
    print("HEAD /api/rates failed:", e)

try:
    print("\nTesting /api/vehicles on 5000...")
    with urllib.request.urlopen("http://localhost:5000/api/vehicles") as resp:
        data = json.loads(resp.read().decode())
        print("Total vehicles returned by API:", len(data))
        print("First 3 vehicles:", data[:3])
except Exception as e:
    print("GET /api/vehicles failed:", e)
