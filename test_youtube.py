import cv2
from youtube_utils import get_youtube_stream_url

# Замените на любую активную YouTube-трансляцию
youtube_link = "https://www.youtube.com/watch?app=desktop&v=8vxMTn4kdEY"

try:
    print("[INFO] Getting direct stream URL...")
    stream_url = get_youtube_stream_url(youtube_link)
    print(f"[INFO] Stream URL: {stream_url}")
except Exception as e:
    print(f"[ERROR] Could not extract YouTube stream URL: {e}")
    exit()

cap = cv2.VideoCapture("http://localhost:8888/")

if not cap.isOpened():
    print("[ERROR] Failed to open stream.")
    exit()

print("[INFO] Stream opened successfully. Showing frames...")

while True:
    ret, frame = cap.read()
    if not ret:
        print("[INFO] End of stream or failed to read frame.")
        break

    cv2.imshow("YouTube Stream Test", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()



