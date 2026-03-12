import json
import random

statuses = ["Active", "Under Maintenance", "Inactive"]
buildings = []

for i in range(1, 51):
    buildings.append({
        "name": f"Building {i}",
        "address": f"{random.randint(1, 999)} Main Street, Dublin, D{random.randint(1,24):02d} {random.choice(['A1B2', 'X7Y8', 'C3D4', 'E5F6'])}",
        "status": random.choice(statuses),
        "monthlyCost": random.randint(1000, 10000)
    })

with open("buildings.json", "w") as f:
    json.dump(buildings, f, indent=2)
