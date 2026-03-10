from flask import Flask, request, jsonify
from serial_client import SerialClient

app = Flask(__name__)
sc = SerialClient()

@app.get("/health")
def health():
    return jsonify(ok = True)

@app.post("/fan/on")
def fan_on():
    sc.send_line("F:1")
    return jsonify(ok = True)

@app.post("/fan/off")
def fan_off():
    sc.send_line("F:0")
    return jsonify(ok = True)

@app.post("/fan/toggle")
def fan():
    sc.send_line("F")
    return jsonify(ok = True)

@app.post("/door/toggle")
def door():
    sc.send_line("D")
    return jsonify(ok = True)

@app.post("/door/close")
def door_close():
    sc.send_line("D:0")
    return jsonify(ok = True)

@app.post("/door/open")
def door_open():
    sc.send_line("D:1")
    return jsonify(ok = True)

@app.post("/lcd")
def lcd():
    data = request.get_json(force=True)
    line1 = (data.get("line1") or "")[:16]
    line2 = (data.get("line2") or "")[:16]
    sc.send_line(f"M{line1}|{line2}")
    return jsonify(ok=True)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port = 5050)