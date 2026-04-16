import json
import os

COLLECTION_PATH = r"d:\AI_SDLC\DevPilot_Postman_Collection.json"

def main():
    if not os.path.exists(COLLECTION_PATH):
        print(f"Error: {COLLECTION_PATH} not found.")
        return

    with open(COLLECTION_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 1. Setup Collection Variables
    data["variable"] = [
        {"key": "baseUrl", "value": "http://localhost:5000"},
        {"key": "username", "value": "testuser@example.com"},
        {"key": "password", "value": "password123"},
        {"key": "accessToken", "value": ""},
        {"key": "project_id", "value": ""},
        {"key": "document_id", "value": ""},
        {"key": "task_id", "value": ""}
    ]

    # 2. Setup Collection Auth
    data["auth"] = {
        "type": "bearer",
        "bearer": [
            {
                "key": "token",
                "value": "{{accessToken}}",
                "type": "string"
            }
        ]
    }

    # Recursive function to process collection items
    def process_items(items):
        for item in items:
            if "item" in item:
                # Recursively process folder
                process_items(item["item"])
            else:
                # It's a request
                request = item.get("request", {})
                
                # Replace host with baseUrl
                if "url" in request:
                    url = request["url"]
                    if isinstance(url, dict) and "host" in url:
                        url["host"] = ["{{baseUrl}}"]
                        # We don't remove paths if they already matched but we want to make sure it runs correctly
                        # Original import often puts raw URL string in 'raw' and list in 'host'
                        raw = url.get("raw", "")
                        if "baseUrl" not in raw:
                            url["raw"] = raw.replace("http://localhost", "{{baseUrl}}").replace("{{baseUrl}}/api", "{{baseUrl}}/api")

                path = request.get("url", {}).get("path", [])

                # Convert path list to string for easier checking
                path_str = "/".join(path)

                # ==========================================
                # LOGIN SCRIPT & BODY CONFIGURATION
                # ==========================================
                if "auth/login" in path_str:
                    # Update body to use variables
                    if "body" in request:
                        request["body"]["mode"] = "urlencoded"
                        request["body"]["urlencoded"] = [
                            {"key": "username", "value": "{{username}}", "type": "text"},
                            {"key": "password", "value": "{{password}}", "type": "text"}
                        ]
                    
                    # Add test script to extract token
                    event = item.get("event", [])
                    event.append({
                        "listen": "test",
                        "script": {
                            "type": "text/javascript",
                            "exec": [
                                "var jsonData = pm.response.json();",
                                "if (jsonData && jsonData.access_token) {",
                                "    pm.collectionVariables.set(\"accessToken\", jsonData.access_token);",
                                "}"
                            ]
                        }
                    })
                    item["event"] = event
                    # login doesn't need auth
                    request["auth"] = {"type": "noauth"}

                # ==========================================
                # BRD TEMPLATE INJECTION
                # ==========================================
                if "documents" in path_str and "generate" in path_str:
                    # Update body to BRD Template
                    if "body" in request:
                        request["body"]["mode"] = "raw"
                        request["body"]["raw"] = json.dumps({
                            "context_text": "Business Requirements Document (BRD)\n\nProject Name: DevPilot Automation\nObjective: Automate SDLC processes using AI.\nFeatures Needed: Authentication, Project Management, BRD Generation, Test Case generation.\nTarget Audience: QA Engineers, Developers, Product Managers."
                        }, indent=4)
                        request["body"]["options"] = {
                            "raw": {
                                "language": "json"
                            }
                        }

    # Process all items
    process_items(data.get("item", []))

    # Rename Collection
    info = data.get("info", {})
    info["name"] = "DevPilot API v1 Validations"
    data["info"] = info

    # Overwrite the file
    with open(COLLECTION_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4)
    print(f"Modifications to {COLLECTION_PATH} are complete.")

if __name__ == "__main__":
    main()
