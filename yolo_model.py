from ultralytics import YOLO
import torch
import cv2
import numpy as np
from sort import Sort
import os
import uuid
import subprocess
import threading
import queue
from database import SessionLocal
import time
from collections import defaultdict
from models_bd import DetectedObject, Camera, User
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
import ssl
from datetime import datetime, timedelta
from config import Config
import atexit

CLASS_COLORS = {
    0: (255, 0, 0),  # Красный человек
    1: (0, 255, 0),  # Зеленый велосипед
    2: (0, 0, 255),  # Синий машина
    3: (255, 255, 0),  # Голубой мотоцикл
    5: (255, 0, 255),  # Фиолетовый автобус
    7: (0, 255, 255),  # Желтый грузовик
}

CLASS_NAME_MAPPING = {
    0: "Человек",
    1: "Велосипед",
    2: "Машина",
    3: "Мотоцикл",
    5: "Автобус",
    7: "Грузовик"
}





ID_MAPPING = {
    1: 0,  2: 2,  3: 7,  4: 5,  5: 3,  6: 1
}


model = YOLO("best_yolo11s.pt").to('cuda')
model.fuse()

tracker = Sort(max_age=30, min_hits=3, iou_threshold=0.1)

# Настройки системы
SAVE_DIR = os.path.abspath("detected_videos")
os.makedirs(SAVE_DIR, exist_ok=True)
SAVE_DIR_PREVIEW = os.path.abspath("detected_previews")
os.makedirs(SAVE_DIR_PREVIEW, exist_ok=True)


# Параметры обработки
POST_RECORD_SECONDS = 5
MIN_VIDEO_DURATION = 1.5
MAX_IDLE_SECONDS = 10
IDLE_MOVEMENT_THRESHOLD = 20
DISAPPEAR_TIMEOUT = timedelta(seconds=POST_RECORD_SECONDS)
STATIC_OBJECT_TIMEOUT = timedelta(seconds=10)
REPEAT_RECORD_COOLDOWN = timedelta(minutes=5)

# Email уведомления - параметры
EMAIL_COOLDOWN = timedelta(minutes=1)  # Минимальный интервал между уведомлениями для одного объекта
MAX_EMAILS_PER_HOUR = 100  # Максимум писем в час для одного пользователя


# Глобальные переменные
active_tracks = {}
track_lock = threading.RLock()
frame_queue = queue.Queue(maxsize=200)
result_queue = queue.Queue()

# НОВЫЕ ОЧЕРЕДИ ДЛЯ ПАРАЛЛЕЛЬНОЙ ОБРАБОТКИ
video_write_queue = queue.Queue(maxsize=1000)
db_save_queue = queue.Queue(maxsize=100)
finalize_queue = queue.Queue(maxsize=100)
email_queue = queue.Queue(maxsize=500)  # НОВАЯ очередь для email уведомлений

# Для отслеживания уже записанных мест и отправленных уведомлений
recorded_locations = defaultdict(dict)
email_history = defaultdict(dict)  # НОВЫЙ: история отправки email
user_email_count = defaultdict(int)  # НОВЫЙ: счетчик писем для пользователей
email_count_reset_time = defaultdict(float)  # НОВЫЙ: время сброса счетчика

class_settings_cache = {}
cache_update_time = {}

# НОВЫЕ ФУНКЦИИ ДЛЯ EMAIL УВЕДОМЛЕНИЙ
def get_camera_owner_email(camera_id):
    db = SessionLocal()
    try:
        camera = db.query(Camera).filter_by(id=camera_id).first()
        if camera and camera.user_id:
            user = db.query(User).filter_by(id=camera.user_id).first()
            if user and user.email:
                return user.email, user.name
    except Exception as e:
        print(f"Error getting camera owner email: {e}")
    finally:
        db.close()
    return None, None


def should_send_email_notification(camera_id, obj_class, track_id):
    now = datetime.utcnow()

    notification_key = f"{camera_id}_{obj_class}_{track_id}"

    if notification_key in email_history:
        last_sent = email_history[notification_key]
        if (now - last_sent) < EMAIL_COOLDOWN:
            return False

    owner_email, owner_name = get_camera_owner_email(camera_id)
    if not owner_email:
        return False

    current_hour = now.replace(minute=0, second=0, microsecond=0)
    if (owner_email not in email_count_reset_time or
            email_count_reset_time[owner_email] < current_hour.timestamp()):
        user_email_count[owner_email] = 0
        email_count_reset_time[owner_email] = current_hour.timestamp()

    if user_email_count[owner_email] >= MAX_EMAILS_PER_HOUR:
        return False

    email_history[notification_key] = now
    user_email_count[owner_email] += 1

    return True


def create_email_content(camera_id, obj_class, track_id, timestamp, owner_name):
    db = SessionLocal()
    camera_name = "Неизвестная камера"

    try:
        camera = db.query(Camera).filter_by(id=camera_id).first()
        if camera:
            camera_name = camera.title or f"Камера #{camera_id}"
    except Exception as e:
        print(f"Error getting camera info: {e}")
    finally:
        db.close()

    subject = f"🚨 Обнаружен объект: {CLASS_NAME_MAPPING.get(obj_class, 'Неизвестный объект')}"

    html_body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #e74c3c; border-bottom: 2px solid #e74c3c; padding-bottom: 10px;">
                    🚨 Уведомление системы видеонаблюдения
                </h2>

                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #2c3e50;">Детали обнаружения:</h3>
                    <p><strong>👤 Пользователь:</strong> {owner_name or 'Не указано'}</p>
                    <p><strong>📹 Камера:</strong> {camera_name}</p>
                    <p><strong>🎯 Обнаруженный объект:</strong> {CLASS_NAME_MAPPING.get(obj_class, 'Неизвестный объект')}</p>
                    <p><strong>🆔 ID трека:</strong> #{track_id}</p>
                    <p><strong>⏰ Время обнаружения:</strong> {timestamp.strftime('%d.%m.%Y %H:%M:%S')} UTC</p>
                </div>

                <div style="background-color: #e8f4fd; padding: 15px; border-radius: 8px; border-left: 4px solid #3498db;">
                    <p style="margin: 0;"><strong>ℹ️ Информация:</strong> Данное уведомление отправлено автоматически системой видеонаблюдения при обнаружении объекта, отмеченного для уведомлений.</p>
                </div>

                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px;">
                    <p>Система видеонаблюдения © {datetime.now().year}</p>
                    <p>Это автоматическое сообщение, не отвечайте на него.</p>
                </div>
            </div>
        </body>
    </html>
    """

    text_body = f"""
    🚨 УВЕДОМЛЕНИЕ СИСТЕМЫ ВИДЕОНАБЛЮДЕНИЯ

    Обнаружен объект, отмеченный для уведомлений!

    Детали обнаружения:
    👤 Пользователь: {owner_name or 'Не указано'}
    📹 Камера: {camera_name}
    🎯 Обнаруженный объект: {CLASS_NAME_MAPPING.get(obj_class, 'Неизвестный объект')}
    🆔 ID трека: #{track_id}
    ⏰ Время обнаружения: {timestamp.strftime('%d.%m.%Y %H:%M:%S')} UTC

    Это автоматическое сообщение системы видеонаблюдения.
    """

    return subject, html_body, text_body




def send_email_notification(to_email, subject, html_body, text_body, preview_image_path=None):
    try:
        msg = MIMEMultipart('related')
        msg['Subject'] = subject
        msg['From'] = Config.EMAIL_ADDRESS
        msg['To'] = to_email

        msg_alternative = MIMEMultipart('alternative')
        msg.attach(msg_alternative)

        msg_text = MIMEText(text_body, 'plain', 'utf-8')
        msg_alternative.attach(msg_text)

        html_body_with_image = html_body.replace(
            '</body>',
            f'<div style="margin-top:20px;"><img src="cid:detection_preview" style="max-width:100%;"></div></body>'
        )
        msg_html = MIMEText(html_body_with_image, 'html', 'utf-8')
        msg_alternative.attach(msg_html)

        if preview_image_path and os.path.exists(preview_image_path):
            with open(preview_image_path, 'rb') as f:
                img = MIMEImage(f.read())
                img.add_header('Content-ID', '<detection_preview>')
                img.add_header('Content-Disposition', 'inline', filename='detection.jpg')
                msg.attach(img)

        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(
                Config.SMTP_SERVER,
                Config.SMTP_PORT,
                context=context,
                timeout=10
        ) as server:
            server.login(Config.EMAIL_ADDRESS, Config.EMAIL_PASSWORD)
            server.send_message(msg)
            print(f"Email sent to {to_email}")
            return True

    except Exception as e:
        print(f"Failed to send email: {str(e)}")
        return False


def email_worker():
    while True:
        try:
            task = email_queue.get(timeout=1)
            if task is None:
                break

            to_email, subject, html_body, text_body, preview_image_path = task
            send_email_notification(to_email, subject, html_body, text_body, preview_image_path)

        except queue.Empty:
            continue
        except Exception as e:
            print(f"Email worker error: {str(e)}")


def get_class_settings_cached(camera_id):
    global class_settings_cache, cache_update_time
    now = time.time()
    if (camera_id not in cache_update_time or
            now - cache_update_time[camera_id] > 30):

        db = SessionLocal()
        try:
            from models_bd import CameraClassAssociation
            settings = db.query(CameraClassAssociation).filter_by(camera_id=camera_id).all()
            class_settings_cache[camera_id] = {
                assoc.class_id: {
                    'is_ignored': assoc.is_ignored,
                    'is_notify': assoc.is_notify
                }
                for assoc in settings
            }
            cache_update_time[camera_id] = now
        finally:
            db.close()

    return class_settings_cache.get(camera_id, {})


def get_location_hash(bbox, precision=50):
    x1, y1, x2, y2 = bbox
    return hash((round(x1 / precision) * precision,
                 round(y1 / precision) * precision,
                 round(x2 / precision) * precision,
                 round(y2 / precision) * precision))


def should_record_video(camera_id, bbox, now):
    location_hash = get_location_hash(bbox)

    if location_hash in recorded_locations[camera_id]:
        last_record_time = recorded_locations[camera_id][location_hash]
        if (now - last_record_time) < REPEAT_RECORD_COOLDOWN:
            return False

    recorded_locations[camera_id][location_hash] = now
    return True


def bbox_moved(prev_box, new_box, threshold=IDLE_MOVEMENT_THRESHOLD):
    return any(abs(a - b) > threshold for a, b in zip(prev_box, new_box))


# ALL_CLASSES = set(CLASS_NAME_MAPPING.keys())



ALL_CLASSES = set(CLASS_COLORS.keys())
CLASS_TRAIN = set(ALL_CLASSES)
ignored_classes = set()
def update_class_train(data):
    global CLASS_TRAIN, ignored_classes

    ignored_classes.clear()
    CLASS_TRAIN = set(ALL_CLASSES)

    for yolo_class_id, flags in data.items():
        if flags.get("is_ignored"):
            mapped_id = ID_MAPPING.get(yolo_class_id, yolo_class_id)

            if mapped_id in ALL_CLASSES:
                ignored_classes.add(mapped_id)
                CLASS_TRAIN.discard(mapped_id)


def video_writer_worker():
    while True:
        try:
            task = video_write_queue.get(timeout=1)
            if task is None:
                break

            track_id, frame, bbox, label, color = task

            with track_lock:
                if track_id in active_tracks:
                    track = active_tracks[track_id]
                    if track.get("video_writer") is not None:
                        x1, y1, x2, y2 = bbox
                        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                        cv2.putText(frame, label, (x1, y1 - 10),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
                        track["video_writer"].write(frame)

        except queue.Empty:
            continue
        except Exception as e:
            print(f"Video writer error: {str(e)}")


def db_worker():
    while True:
        try:
            task = db_save_queue.get(timeout=1)
            if task is None:
                break

            track_id, obj_class, timestamp, video_path, camera_id, frame = task

            db = SessionLocal()
            try:
                filename = f"{uuid.uuid4()}_{track_id}.jpg"
                path = os.path.join(SAVE_DIR_PREVIEW, filename)
                cv2.imwrite(path, frame)

                detected = DetectedObject(
                    camera_id=camera_id,
                    tracker_id=track_id,
                    object_class=obj_class,
                    start_time=timestamp,
                    image_path=filename,
                    video_path=os.path.basename(video_path)
                )

                db.add(detected)
                db.commit()
                print(f"Object saved to DB: {obj_class} #{track_id}")

            except Exception as e:
                db.rollback()
                print(f"DB error: {str(e)}")
            finally:
                db.close()

        except queue.Empty:
            continue
        except Exception as e:
            print(f"DB worker error: {str(e)}")


def finalize_worker():
    while True:
        try:
            track_id = finalize_queue.get(timeout=1)
            if track_id is None:
                break

            finalize_video_async(track_id)

        except queue.Empty:
            continue
        except Exception as e:
            print(f"Finalize worker error: {str(e)}")


def create_video_writer(video_path, frame_width, frame_height):
    try:
        fourcc = cv2.VideoWriter_fourcc(*'XVID')
        out = cv2.VideoWriter(video_path, fourcc, 30, (frame_width, frame_height))
        if out.isOpened():
            return out
        print(f"Failed to open video writer: {video_path}")
    except Exception as e:
        print(f"Error creating video writer: {str(e)}")
    return None


def finalize_video_async(track_id):
    try:
        with track_lock:
            if track_id not in active_tracks:
                return

            track = active_tracks.pop(track_id)
            temp_video_path = track.get("video_path")

            if not temp_video_path or not os.path.exists(temp_video_path):
                return

            if track.get("video_writer") is not None:
                track["video_writer"].release()

        cap = cv2.VideoCapture(temp_video_path)
        if not cap.isOpened():
            os.remove(temp_video_path)
            return

        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        duration = frame_count / fps

        ret, preview_frame = cap.read()
        cap.release()

        if duration < MIN_VIDEO_DURATION:
            os.remove(temp_video_path)
            return

        final_filename = f"final_{uuid.uuid4()}_{track_id}.mp4"
        final_path = os.path.join(SAVE_DIR, final_filename)

        try:
            subprocess.run([
                'ffmpeg', '-i', temp_video_path,
                '-c:v', 'libx264',
                '-preset', 'ultrafast',
                '-crf', '25',
                '-movflags', '+faststart',
                final_path
            ], check=True, capture_output=True)

            os.remove(temp_video_path)

            if ret:
                db_save_queue.put((
                    track_id, track["object_class"], track["start_time"],
                    final_path, track["camera_id"], preview_frame
                ))
                print(f"Video finalized ({duration:.2f}s): {final_path}")

        except subprocess.CalledProcessError as e:
            print(f"FFmpeg error: {str(e)}")
            if os.path.exists(temp_video_path):
                os.remove(temp_video_path)
            if os.path.exists(final_path):
                os.remove(final_path)

    except Exception as e:
        print(f"Error in finalize_video_async: {str(e)}")







def async_process_frame(frame, camera_id):
    try:
        now = datetime.utcnow()
        clean_frame = frame.copy()
        class_settings = get_class_settings_cached(camera_id)
        update_class_train(class_settings)

        small_frame = cv2.resize(frame, (640, 640))
        rgb_small = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)

        with torch.no_grad():
            results = model.predict(rgb_small, verbose=False, conf=0.25, classes=list(CLASS_TRAIN))

        detections = []
        if results and results[0].boxes is not None:
            scale_x = frame.shape[1] / 640
            scale_y = frame.shape[0] / 640

            for box in results[0].boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                x1, y1, x2, y2 = box.xyxy[0].tolist()

                x1, y1, x2, y2 = int(x1 * scale_x), int(y1 * scale_y), int(x2 * scale_x), int(y2 * scale_y)
                detections.append([x1, y1, x2, y2, conf, cls_id])

        if not detections:
            with track_lock:
                check_and_finalize_tracks(now)
            return frame

        dets_for_sort = np.array([[det[0], det[1], det[2], det[3], det[4]] for det in detections])
        tracked = tracker.update(dets_for_sort)
        current_track_ids = set()

        for trk in tracked:
            x1, y1, x2, y2, track_id = map(int, trk)
            current_track_ids.add(track_id)
            bbox = (x1, y1, x2, y2)

            matched_cls = next((det[5] for det in detections
                                if abs(x1 - det[0]) < 10 and abs(y1 - det[1]) < 10
                                and abs(x2 - det[2]) < 10 and abs(y2 - det[3]) < 10), 0)

            obj_class = model.names.get(matched_cls, "unknown")
            color = CLASS_COLORS.get(matched_cls, (0, 255, 255))
            label = f"{obj_class} #{track_id}"

            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            cv2.putText(frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

            with track_lock:
                if track_id not in active_tracks:
                    yolo_class_id = next((k for k, v in ID_MAPPING.items() if v == matched_cls), matched_cls)
                    class_config = class_settings.get(yolo_class_id, {})

                    if class_config.get('is_notify', False):
                        if should_send_email_notification(camera_id, matched_cls, track_id):
                            owner_email, owner_name = get_camera_owner_email(camera_id)
                            if owner_email:
                                notification_frame = clean_frame.copy()
                                cv2.rectangle(notification_frame, (x1, y1), (x2, y2), color, 2)
                                cv2.putText(notification_frame, label, (x1, y1 - 10),
                                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

                                preview_filename = f"email_preview_{uuid.uuid4()}_{track_id}.jpg"
                                preview_path = os.path.join(SAVE_DIR_PREVIEW, preview_filename)
                                cv2.imwrite(preview_path, notification_frame)

                                subject, html_body, text_body = create_email_content(
                                    camera_id, matched_cls, track_id, now, owner_name
                                )

                                email_queue.put((owner_email, subject, html_body, text_body, preview_path))
                                print(f"📧 Email notification queued for {obj_class} #{track_id} to {owner_email}")

                    if not should_record_video(camera_id, bbox, now):
                        active_tracks[track_id] = {
                            "start_time": now,
                            "last_seen": now,
                            "object_class": obj_class,
                            "camera_id": camera_id,
                            "last_bbox": bbox,
                            "last_movement": now,
                            "video_writer": None,
                            "video_path": None
                        }
                        continue

                    video_filename = f"temp_{uuid.uuid4()}_{track_id}.avi"
                    video_path = os.path.join(SAVE_DIR, video_filename)
                    width = frame.shape[1] - (frame.shape[1] % 2)
                    height = frame.shape[0] - (frame.shape[0] % 2)
                    out = create_video_writer(video_path, width, height)

                    active_tracks[track_id] = {
                        "start_time": now,
                        "last_seen": now,
                        "object_class": obj_class,
                        "camera_id": camera_id,
                        "last_bbox": bbox,
                        "last_movement": now,
                        "video_writer": out,
                        "video_path": video_path if out else None,
                        "location_hash": get_location_hash(bbox)
                    }

                    if out:
                        video_write_queue.put((track_id, clean_frame.copy(), bbox, label, color))
                else:
                    track = active_tracks[track_id]
                    track["last_seen"] = now

                    if bbox_moved(track["last_bbox"], bbox):
                        track["last_movement"] = now
                        track["last_bbox"] = bbox
                        if "static_since" in track:
                            del track["static_since"]
                    else:
                        if "static_since" not in track:
                            track["static_since"] = now
                        elif (now - track["static_since"]) > STATIC_OBJECT_TIMEOUT:
                            if track["video_writer"] is not None:
                                track["video_writer"].release()
                                track["video_writer"] = None

                    if track["video_writer"] is not None:
                        video_write_queue.put((track_id, clean_frame.copy(), bbox, label, color))

        with track_lock:
            vanished_ids = list(set(active_tracks.keys()) - current_track_ids)
            for track_id in vanished_ids:
                if now - active_tracks[track_id]["last_seen"] > DISAPPEAR_TIMEOUT:
                    finalize_queue.put(track_id)

        return frame

    except Exception as e:
        print(f"Error in async_process_frame: {str(e)}")
        return frame









def check_and_finalize_tracks(now):
    to_finalize = []
    for track_id, info in active_tracks.items():
        if now - info["last_seen"] > DISAPPEAR_TIMEOUT:
            to_finalize.append(track_id)

    for tid in to_finalize:
        finalize_queue.put(tid)


def process_frame(frame, camera_id: int):
    if not frame_queue.full():
        frame_queue.put((frame.copy(), camera_id))

    try:
        return result_queue.get_nowait()
    except queue.Empty:
        return frame


def worker():
    while True:
        try:
            frame, camera_id = frame_queue.get(timeout=1)
            processed_frame = async_process_frame(frame, camera_id)

            try:
                result_queue.put_nowait(processed_frame)
            except queue.Full:
                pass

        except queue.Empty:
            continue
        except Exception as e:
            print(f"Worker error: {str(e)}")





def start_workers():
    for i in range(4):
        threading.Thread(target=worker, daemon=True, name=f"FrameWorker-{i}").start()

    for i in range(2):
        threading.Thread(target=video_writer_worker, daemon=True, name=f"VideoWriter-{i}").start()

    threading.Thread(target=db_worker, daemon=True, name="DBWorker").start()

    for i in range(2):
        threading.Thread(target=finalize_worker, daemon=True, name=f"Finalizer-{i}").start()

    threading.Thread(target=email_worker, daemon=True, name=f"EmailWorker").start()

    print("All worker threads started")

start_workers()


def cleanup():
    print("Cleaning up...")

    for _ in range(2):
        video_write_queue.put(None)
        finalize_queue.put(None)

    db_save_queue.put(None)

    with track_lock:
        for track in active_tracks.values():
            if track.get("video_writer"):
                track["video_writer"].release()

atexit.register(cleanup)


