import cv2
import subprocess
import numpy as np
from yolo_model import process_frame
from youtube_utils import get_youtube_stream_url
from database import SessionLocal
from models_bd import Camera
import time


STOP_FLAGS = {}

def get_camera_from_db(camera_id):
    db = SessionLocal()
    try:
        return db.query(Camera).filter_by(id=camera_id).first()
    finally:
        db.close()

def get_video_stream(camera_id):
    camera = get_camera_from_db(camera_id)
    if not camera:
        print(f"Camera {camera_id} not found in database")
        return None, None

    if not camera.url or not camera.protocol:
        print("Invalid camera configuration: missing URL or protocol")
        return None, None

    url = camera.url
    protocol = camera.protocol.upper()

    if protocol == "HTTP":
        yt_url = get_youtube_stream_url(url)
        cmd = [
            'ffmpeg',
            '-i', yt_url,
            '-loglevel', 'quiet',
            '-an',
            '-rtbufsize', '1500M',
            '-vf', 'scale=1280:720',
            '-pix_fmt', 'bgr24',
            '-vcodec', 'rawvideo',
            '-preset', 'veryfast',
            '-f', 'rawvideo',
            '-'
        ]
        try:
            ffmpeg_process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,  # Добавляем stderr для отладки
                bufsize=10 ** 8
            )
            return ffmpeg_process, True
        except Exception as e:
            print(f"FFmpeg error: {str(e)}")
            return None, None
    else:
        cap = cv2.VideoCapture(url)
        if not cap.isOpened():
            print(f"Failed to open video stream: {url}")
            return None, False
        return cap, False


def check_camera_exists(camera_id):
    """Проверяет существование камеры в БД"""
    return get_camera_from_db(camera_id) is not None


def gen_frames(camera_id):
    STOP_FLAGS[camera_id] = False
    try:
        stream, is_pipe = get_video_stream(camera_id)
        if stream is None:
            print("Stream initialization failed")
            return

        if is_pipe:
            w, h = 1280, 720
            frame_size = w * h * 3
            last_check_time = time.time()
            while not STOP_FLAGS.get(camera_id, False):
                if time.time() - last_check_time > 2:
                    if not check_camera_exists(camera_id):
                        print(f"Camera {camera_id} was deleted, stopping stream")
                        STOP_FLAGS[camera_id] = True
                        break
                    last_check_time = time.time()


                try:
                    raw_image = stream.stdout.read(frame_size)
                    if len(raw_image) != frame_size:
                        print("Incomplete frame received")
                        break
                    frame = np.frombuffer(raw_image, dtype=np.uint8).reshape((h, w, 3)).copy()
                    frame = process_frame(frame)

                    _, buffer = cv2.imencode('.jpg', frame)
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
                except (BrokenPipeError, ConnectionResetError) as e:
                    print(f"Stream broken: {str(e)}")
                    break

        else:
            last_check_time = time.time()
            while not STOP_FLAGS.get(camera_id, False):
                # Проверка существования камеры каждые 2 секунды
                if time.time() - last_check_time > 2:
                    if not check_camera_exists(camera_id):
                        print(f"Camera {camera_id} was deleted, stopping stream")
                        STOP_FLAGS[camera_id] = True
                        break
                    last_check_time = time.time()

                try:
                    success, frame = stream.read()
                    if not success:
                        break
                    frame = process_frame(frame)
                    _, buffer = cv2.imencode('.jpg', frame)
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
                except Exception as e:
                    print(f"Frame read error: {str(e)}")
                    break
    finally:
        if stream:
            if is_pipe:
                stream.terminate()
            else:
                stream.release()
        STOP_FLAGS.pop(camera_id, None)
        print("Stream cleanup completed")
