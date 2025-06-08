from ultralytics import YOLO
import cv2
import torch

device = 'cuda' if torch.cuda.is_available() else 'cpu'
print(f"[INFO] Using device: {device}")

last_detections = {}
POSITION_THRESHOLD = 50

model = YOLO("best.pt").to(device)

def is_new_detection(label, box, confidence):
    global last_detections
    x1, y1, x2, y2 = map(int, box)

    if label in last_detections:
        old_box, old_conf = last_detections[label]
        ox1, oy1, ox2, oy2 = old_box
        shift = abs(x1 - ox1) + abs(y1 - oy1) + abs(x2 - ox2) + abs(y2 - oy2)
        if shift < POSITION_THRESHOLD:
            return False

    last_detections[label] = ((x1, y1, x2, y2), confidence)
    return True


def process_frame(frame):
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    frame_count = 0
    frame_count += 1
    if frame_count % 3 != 0:
        return frame

    results = model.predict(rgb_frame, verbose=False,conf=0.25, device='cuda')

    if not results or results[0].boxes is None:
        return frame

    for box in results[0].boxes:
        cls_id = int(box.cls[0])
        confidence = float(box.conf[0])
        label = model.names[cls_id]
        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())

        if is_new_detection(label, (x1, y1, x2, y2), confidence):
            print(f"[DETECTION] Object: {label}, Confidence: {confidence:.2f}, Box: ({x1},{y1})-({x2},{y2})")

        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
        cv2.putText(frame, f"{label} {confidence:.2f}", (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

    return frame
