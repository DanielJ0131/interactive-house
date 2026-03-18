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

@app.post("/fan_ina/on")
def fan_ina_on():
    sc.send_line("X:1")
    return jsonify(ok = True)

@app.post("/fan_ina/off")
def fan_ina_off():
    sc.send_line("X:0")
    return jsonify(ok = True)

@app.post("/fan_ina/toggle")
def fan_ina_toggle():
    sc.send_line("X")
    return jsonify(ok = True)

@app.post("/fan_inb/on")
def fan_inb_on():
    sc.send_line("Y:1")
    return jsonify(ok = True)

@app.post("/fan_inb/off")
def fan_inb_off():
    sc.send_line("Y:0")
    return jsonify(ok = True)

@app.post("/fan_inb/toggle")
def fan_inb_toggle():
    sc.send_line("Y")
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

@app.post("/window/toggle")
def window_toggle():
    sc.send_line("N")
    return jsonify(ok = True)

@app.post("/window/close")
def window_close():
    sc.send_line("N:0")
    return jsonify(ok = True)

@app.post("/window/open")
def window_open():
    sc.send_line("N:1")
    return jsonify(ok = True)

@app.post("/buzzer/on")
def buzzer_on():
    sc.send_line("B:1")
    return jsonify(ok = True)

@app.post("/buzzer/off")
def buzzer_off():
    sc.send_line("B:0")
    return jsonify(ok = True)

@app.post("/buzzer/toggle")
def buzzer_toggle():
    sc.send_line("B")
    return jsonify(ok = True)

@app.post("/white_light/on")
def white_light_on():
    sc.send_line("W:1")
    return jsonify(ok = True)

@app.post("/white_light/off")
def white_light_off():
    sc.send_line("W:0")
    return jsonify(ok = True)

@app.post("/white_light/toggle")
def white_light_toggle():
    sc.send_line("W")
    return jsonify(ok = True)

@app.post("/orange_light/on")
def orange_light_on():
    sc.send_line("O:1")
    return jsonify(ok = True)

@app.post("/orange_light/off")
def orange_light_off():
    sc.send_line("O:0")
    return jsonify(ok = True)

@app.post("/orange_light/toggle")
def orange_light_toggle():
    sc.send_line("O")
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