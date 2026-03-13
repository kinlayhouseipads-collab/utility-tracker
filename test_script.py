import json

with open("buildings.json", "r") as f:
    data = json.load(f)

for b in data[:1]:
    print(b)
