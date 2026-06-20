import urllib.request
import json
import base64
import time
import os
import sys

# The user will provide the GAS URL.
# Run this script with: python test_gas_sheet.py <GAS_URL>

def make_request(url, data=None):
    headers = {
        "Content-Type": "text/plain;charset=utf-8",
        "User-Agent": "Antigravity-Test-Script"
    }
    req_body = None
    if data is not None:
        req_body = json.dumps(data).encode("utf-8")
        
    req = urllib.request.Request(url, headers=headers, method="POST", data=req_body)
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err_body)
        except:
            return e.code, {"error": err_body}
    except Exception as e:
        return 500, {"error": str(e)}

def run_10_tests(gas_url):
    print("Starting 10 full lifecycle simulation tests on GAS Google Sheet Backend...")
    test_results = []
    
    for i in range(1, 11):
        print(f"\\n--- Iteration {i}/10 ---")
        success_flags = {"fill": False, "medic": False, "finish": False}
        project_name = f"GasDrillTest_Iter_{i}_{int(time.time())}"
        
        # Step 1: Fill in / Create Project (填入測試)
        status, res = make_request(gas_url, {
            "action": "createProject",
            "projectName": project_name,
            "creator": f"Gas Tester {i}"
        })
        
        if status == 200 and res.get("success"):
            print(f"Created project: {project_name}")
            
            # Save Briefing
            briefing_data = {
                "b_caseName": f"GAS Test Case {i}",
                "b_iso": "Auto ISO",
                "isLocked": False
            }
            status_b, res_b = make_request(gas_url, {
                "action": "saveBriefing",
                "projectName": project_name,
                "creator": f"Gas Tester {i}",
                "briefing": briefing_data
            })
            if status_b == 200 and res_b.get("success"):
                success_flags["fill"] = True
            else:
                print(f"Failed to save briefing: {res_b}")
                
        else:
            print(f"Failed to create project: {res}")

        # Step 2: Add MEDIC
        medic_data = [
            {
                "id": 1,
                "time": "12:00",
                "m": "GAS Test M",
                "e": "GAS Test E",
                "completed": False
            }
        ]
        status_m, res_m = make_request(gas_url, {
            "action": "saveMedic",
            "projectName": project_name,
            "creator": f"Gas Tester {i}",
            "medic": medic_data
        })
        if status_m == 200 and res_m.get("success"):
            success_flags["medic"] = True
        else:
            print(f"Failed to save medic: {res_m}")
            
        # Step 3: Finish case (結案測試)
        briefing_data["isLocked"] = True
        medic_data[0]["completed"] = True
        status_f1, res_f1 = make_request(gas_url, {
            "action": "saveBriefing",
            "projectName": project_name,
            "briefing": briefing_data
        })
        status_f2, res_f2 = make_request(gas_url, {
            "action": "saveMedic",
            "projectName": project_name,
            "medic": medic_data
        })
        
        if status_f1 == 200 and status_f2 == 200 and res_f1.get("success") and res_f2.get("success"):
            success_flags["finish"] = True
        else:
            print("Failed finish case.")
                
        print(f"Iteration {i} results: {success_flags}")
        test_results.append(success_flags)
        
    all_success = all(all(v for v in r.values()) for r in test_results)
    if all_success:
        print("\\nALL 10 GAS ITERATIONS PASSED.")
    else:
        print("\\nSOME GAS ITERATIONS FAILED.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_gas_sheet.py <GAS_URL>")
        sys.exit(1)
    run_10_tests(sys.argv[1])
