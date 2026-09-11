from app.safety import evaluate_safety_symptom, triage_explain

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


def test_safety_hindi_escalate():
    assert evaluate_safety_symptom("saans lene me takleef ho rahi hai") == "ESCALATE"
    assert evaluate_safety_symptom("छाती में दर्द हो रहा है") == "ESCALATE"
    assert evaluate_safety_symptom("bachao, madad chahiye") == "ESCALATE"


def test_safety_negation():
    assert evaluate_safety_symptom("no chest pain, just tired") != "ESCALATE"
    assert evaluate_safety_symptom("no bleeding, feeling ok") == "NORMAL"
    # Severe override still escalates
    assert evaluate_safety_symptom("no chest pain", severity="severe") == "ESCALATE"


def test_triage_explain():
    out = triage_explain("saans lene me takleef")
    assert out["level"] == "ESCALATE"
    assert out["matched"] is not None
    out2 = triage_explain("no chest pain, just tired")
    assert out2["negated"] is True
    assert out2["level"] != "ESCALATE"


def test_ack_endpoint_skipped():
    import pytest
    pytest.skip("ack endpoint requires DB + auth; covered by API manual test")
