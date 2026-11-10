"""Face track for auto-reframe: samples the video, finds the main face, prints JSON [{t,x,y}] (x,y = 0..1 centre)."""
import json
import sys

import cv2

path = sys.argv[1]
step = float(sys.argv[2]) if len(sys.argv) > 2 else 0.5

cap = cv2.VideoCapture(path)
fps = cap.get(cv2.CAP_PROP_FPS) or 30
total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

out = []
t = 0.0
while True:
    frame_no = int(t * fps)
    if total and frame_no >= total:
        break
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_no)
    ok, frame = cap.read()
    if not ok:
        break
    h, w = frame.shape[:2]
    scale = 480.0 / max(w, h)
    small = cv2.resize(frame, (int(w * scale), int(h * scale)))
    gray = cv2.equalizeHist(cv2.cvtColor(small, cv2.COLOR_BGR2GRAY))
    faces = cascade.detectMultiScale(gray, scaleFactor=1.15, minNeighbors=6, minSize=(28, 28))
    if len(faces):
        fx, fy, fw, fh = max(faces, key=lambda f: f[2] * f[3])  # biggest face = the speaker
        sw, sh = small.shape[1], small.shape[0]
        out.append({"t": round(t, 2), "x": round((fx + fw / 2) / sw, 3), "y": round((fy + fh / 2) / sh, 3)})
    t += step
    if t > 900:
        break

print(json.dumps(out))
