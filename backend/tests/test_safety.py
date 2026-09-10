from app.safety import evaluate_safety_symptom

def test_safety_escalate():
    assert evaluate_safety_symptom("I have severe pain in my chest") == "ESCALATE"
    assert evaluate_safety_symptom("I am breathless", severity="unknown") == "ESCALATE"
    assert evaluate_safety_symptom("My stomach hurts", severity="severe") == "ESCALATE"

def test_safety_monitor():
    assert evaluate_safety_symptom("I have a mild headache") == "MONITOR"
    assert evaluate_safety_symptom("I feel a little dizzy") == "MONITOR"

def test_safety_normal():
    assert evaluate_safety_symptom("I am doing fine today") == "NORMAL"
    assert evaluate_safety_symptom("The medicine tastes bad") == "NORMAL"

if __name__ == "__main__":
    test_safety_escalate()
    test_safety_monitor()
    test_safety_normal()
    print("All safety tests passed successfully.")
