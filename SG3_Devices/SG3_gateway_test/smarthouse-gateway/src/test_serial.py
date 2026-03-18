from serial_client import SerialClient

sc = SerialClient()
print("Commands: X/Y fan, D[:1/:0] door, N[:1/:0] window, B[:1/:0] buzzer, W/O lights, q=quit")

while True:
    cmd = input("> ").strip()
    if cmd == "q":
        break
    sc.send_line(cmd)