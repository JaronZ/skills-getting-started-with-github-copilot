from fastapi.testclient import TestClient
from src.app import app

client = TestClient(app)


def test_get_activities_contains_known_activity():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    # The seeded data should contain Chess Club
    assert "Chess Club" in data


def test_signup_and_remove_participant_lifecycle():
    activity = "Chess Club"
    email = "teststudent@example.com"

    # Ensure email not present initially
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert email not in data[activity]["participants"]

    # Sign up
    resp = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp.status_code == 200
    assert "Signed up" in resp.json().get("message", "")

    # Confirm present
    resp = client.get("/activities")
    data = resp.json()
    assert email in data[activity]["participants"]

    # Signing up again should fail (already signed up)
    resp = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp.status_code == 400

    # Remove participant
    resp = client.delete(f"/activities/{activity}/participants?email={email}")
    assert resp.status_code == 200
    assert "Removed" in resp.json().get("message", "")

    # Confirm removed
    resp = client.get("/activities")
    data = resp.json()
    assert email not in data[activity]["participants"]

    # Removing again should return 404
    resp = client.delete(f"/activities/{activity}/participants?email={email}")
    assert resp.status_code == 404


def test_signup_invalid_activity():
    resp = client.post("/activities/Nonexistent/signup?email=someone@example.com")
    assert resp.status_code == 404


def test_delete_invalid_activity():
    resp = client.delete("/activities/Nonexistent/participants?email=someone@example.com")
    assert resp.status_code == 404
