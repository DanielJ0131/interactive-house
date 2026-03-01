from src.serial_client import SerialClient

sc = SerialClient()
print("F or D for fan or door, q to quit")

while True:
    cmd = input("> ").strip()
    if cmd == "q":
        break
    sc.send_line(cmd)