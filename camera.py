import cv2
import subprocess
import numpy as np
from model import process_frame
from youtube_utils import get_youtube_stream_url

camera_sources = {
    "1": "video_01.mp4",
    "2": "video_02.mp4",
}

youtube_cameras = {}

def add_camera(camera_id, url, is_youtube=False):
    if is_youtube:
        youtube_cameras[camera_id] = url
    else:
        camera_sources[camera_id] = url

def get_video_stream(camera_id):
    if camera_id in youtube_cameras:
        yt_url = get_youtube_stream_url(youtube_cameras[camera_id])
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
        return subprocess.Popen(cmd, stdout=subprocess.PIPE, bufsize=10**8), True
    elif camera_id in camera_sources:
        return cv2.VideoCapture(camera_sources[camera_id]), False
    else:
        return None, None

def gen_frames(camera_id):
    stream, is_pipe = get_video_stream(camera_id)
    if stream is None:
        return

    if is_pipe:
        w, h = 1280, 720
        frame_size = w * h * 3
        while True:
            raw_image = stream.stdout.read(frame_size)
            if len(raw_image) != frame_size:
                break
            frame = np.frombuffer(raw_image, dtype=np.uint8).reshape((h, w, 3)).copy()
            frame = process_frame(frame)

            _, buffer = cv2.imencode('.jpg', frame)
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
    else:
        while True:
            success, frame = stream.read()
            if not success:
                break
            frame = process_frame(frame)
            _, buffer = cv2.imencode('.jpg', frame)
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
