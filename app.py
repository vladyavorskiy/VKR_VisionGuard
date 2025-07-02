from flask import Flask, send_from_directory, Response, jsonify, request, session
from camera import gen_frames
from flask_cors import CORS
from datetime import datetime
from flask_session import Session
from config import Config
from login_yandex import auth_bp
from database import SessionLocal
from models_bd import Camera, User, DetectedObject, CameraClassAssociation, Class
from functools import wraps
from camera import STOP_FLAGS
from flask_wtf import CSRFProtect
from flask_wtf.csrf import generate_csrf, validate_csrf
import os
import json
import time


app = Flask(__name__)
app.config.from_object(Config)

CORS(app,
     supports_credentials=True,
     origins=["http://localhost:5173"],
     methods=["GET", "POST", "DELETE", "PUT", "OPTIONS"],
     allow_headers=["Content-Type", "X-CSRFToken"],
     expose_headers=["Content-Type"],
     )

csrf = CSRFProtect(app)
Session(app)

app.register_blueprint(auth_bp)


DEFAULT_IMAGE_URL = "https://static.vecteezy.com/system/resources/previews/001/213/234/large_2x/interface-viewfinder-digital-camera-vector.jpg"



def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user" not in session:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated_function


def get_current_user():
    db = SessionLocal()
    try:
        user = db.query(User).filter_by(yandex_id=session["user"]["id"]).first()
        return user
    finally:
        db.close()

def get_users_camera(camera_id, user_id):
    db = SessionLocal()
    try:
        return db.query(Camera).filter_by(id=camera_id, user_id=user_id).first()
    finally:
        db.close()

@app.route('/csrf-token', methods=['GET'])
def get_csrf_token():
    token = generate_csrf()
    response = jsonify({"csrf_token": token})
    response.set_cookie(
        'csrf_token',
        token,
        secure=False,
        httponly=False,
        samesite='Lax'
    )
    return response



def verify_csrf():
    if request.method in ('POST', 'PUT', 'DELETE'):
        csrf_token = request.headers.get('X-CSRFToken') or request.cookies.get('csrf_token')
        if not csrf_token:
            return jsonify({"error": "CSRF token is missing"}), 403
        try:
            validate_csrf(csrf_token)
        except:
            return jsonify({"error": "Invalid CSRF token"}), 403




@app.route('/')
def index():
    return "AI Camera Backend is running."

@app.route('/cameras', methods=['GET'])
@login_required
def list_cameras():
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404

    db = SessionLocal()
    try:
        cameras = db.query(Camera).filter_by(user_id=user.id).all()
        cameras_list = []
        for cam in cameras:
            cameras_list.append({
                "id": cam.id,
                "name": cam.title,
                "url": cam.url,
                "image": cam.image or DEFAULT_IMAGE_URL,
                "protocol": cam.protocol,
                "description": cam.description or "",
                "tags": cam.tags.split(",") if cam.tags else [],
                "addedAt": cam.added_at if cam.added_at else None
            })
        return jsonify(cameras_list)
    finally:
        db.close()



@app.route('/get_camera/<camera_id>', methods=['GET'])
@login_required
def get_camera(camera_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404

    db = SessionLocal()
    try:
        camera = db.query(Camera).filter_by(id=camera_id, user_id=user.id).first()
        if not camera:
            return jsonify({"error": "Camera not found or does not belong to you"}), 404
        class_associations = (db.query(CameraClassAssociation).
                              filter_by(camera_id=camera.id).all())
        class_settings = []
        for assoc in class_associations:
            class_settings.append({
                "class_id": assoc.class_id,
                "class_name": assoc.object_class.name,
                "is_ignored": assoc.is_ignored,
                "is_notify": assoc.is_notify
            })

        return jsonify({
            "id": camera.id,
            "name": camera.title,
            "url": camera.url,
            "image": camera.image or DEFAULT_IMAGE_URL,
            "protocol": camera.protocol,
            "description": camera.description or "",
            "tags": camera.tags.split(",") if camera.tags else [],
            "class_settings": class_settings
        }), 200
    finally:
        db.close()


BASE_CLASSES = ["Человек", "Машина", "Грузовик", "Мотоцикл", "Автобус", "Велосипед"]

@app.route('/add_camera', methods=['POST'])
@login_required
def add_camera_route():
    try:
        verify_csrf()
        user = get_current_user()
        if not user:
            return jsonify({"error": "User not found"}), 404

        data = request.get_json()
        required_fields = ['name', 'url', 'protocol']
        if not all(field in data for field in required_fields):
            return jsonify({"error": f"Missing required fields: {required_fields}"}), 400

        db = SessionLocal()
        try:
            camera = Camera(
                user_id=user.id,
                title=data["name"],
                url=data["url"],
                protocol=data["protocol"],
                description=data.get("description", ""),
                tags=",".join(data.get("tags", [])),
                image=data.get("image", DEFAULT_IMAGE_URL),
                added_at=datetime.utcnow()
            )

            db.add(camera)
            db.flush()

            classes = db.query(Class).filter(Class.name.in_(BASE_CLASSES)).all()

            for obj_class in classes:
                assoc = CameraClassAssociation(
                    camera_id=camera.id,
                    class_id=obj_class.id,
                    is_ignored=False,
                    is_notify=False
                )
                db.add(assoc)

            db.commit()
            db.refresh(camera)

            return jsonify({
                "message": "Camera added successfully",
                "name": camera.title,
                "url": camera.url,
                "image": camera.image,
                "protocol": camera.protocol,
                "addedAt": camera.added_at.isoformat() + "Z"
            }), 201
        except Exception as e:
            db.rollback()
            return jsonify({"error": "Failed to add camera", "details": str(e)}), 500
        finally:
            db.close()
    except Exception as e:
        return jsonify({"error": "Failed to check token", "details": str(e)}), 400

from flask import make_response


@app.route('/update_camera/<camera_id>', methods=['OPTIONS'])
def preflight_update_camera(camera_id):
    response = make_response()
    response.headers.add("Access-Control-Allow-Origin", "http://localhost:5173")
    response.headers.add("Access-Control-Allow-Credentials", "true")
    response.headers.add("Access-Control-Allow-Methods", "PUT, OPTIONS")
    response.headers.add("Access-Control-Allow-Headers",
                         "Content-Type, Authorization, X-CSRFToken")
    return response, 204

@app.route('/update_camera/<camera_id>', methods=['PUT'])
@login_required
def update_camera(camera_id):
    try:
        verify_csrf()
        user = get_current_user()
        if not user:
            return jsonify({"error": "User not found"}), 404

        db = SessionLocal()
        camera = db.query(Camera).filter_by(id=camera_id, user_id=user.id).first()
        if not camera:
            return jsonify({"error": "Camera not found or does not belong to you"}), 404

        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        try:
            if 'name' in data:
                camera.title = data['name']
            if 'description' in data:
                camera.description = data['description']
            if 'tags' in data:
                camera.tags = ",".join(data['tags']) if isinstance(data['tags'], list) else data['tags']
            if 'image' in data:
                camera.image = data['image']

            if 'class_settings' in data:
                for class_setting in data['class_settings']:
                    assoc = db.query(CameraClassAssociation).filter_by(
                        camera_id=camera.id,
                        class_id=class_setting['class_id']
                    ).first()
                    if assoc:
                        if 'is_ignored' in class_setting:
                            assoc.is_ignored = class_setting['is_ignored']
                            if class_setting['is_ignored']:
                                assoc.is_notify = False
                        if 'is_notify' in class_setting:
                            if assoc.is_ignored and class_setting['is_notify']:
                                return jsonify({
                                    "error": f"Class {class_setting['class_id']} marked as ignored; cannot enable notify."
                                }), 400
                            assoc.is_notify = class_setting['is_notify']

            db.commit()

            updated_camera = {
                "id": camera.id,
                "name": camera.title,
                "url": camera.url,
                "image": camera.image or DEFAULT_IMAGE_URL,
                "protocol": camera.protocol,
                "description": camera.description or "",
                "tags": camera.tags.split(",") if camera.tags else []
            }

            return jsonify({
                "message": "Camera updated successfully",
                "camera": updated_camera
            }), 200
        except Exception as e:
            db.rollback()
            return jsonify({"error": "Failed to update camera", "details": str(e)}), 500
        finally:
            db.close()
    except Exception as e:
        return jsonify({"error": "Failed to check token", "details": str(e)}), 400

@app.route('/delete_camera/<camera_id>', methods=['DELETE'])
@login_required
def delete_camera(camera_id):
    try:
        verify_csrf()
        user = get_current_user()
        if not user:
            return jsonify({"error": "User not found"}), 404

        camera = get_users_camera(camera_id, user.id)
        if not camera:
            return jsonify({"error": "Camera not found or does not belong to you"}), 404

        db = SessionLocal()
        try:
            db.delete(camera)
            db.commit()
            STOP_FLAGS[camera_id] = True
            return jsonify({"message": f"Camera {camera_id} deleted successfully"}), 200
        except Exception as e:
            db.rollback()
            return jsonify({"error": "Failed to delete camera", "details": str(e)}), 500
        finally:
            db.close()
    except Exception as e:
        return jsonify({"error": "Failed to chech token", "details": str(e)}), 400



@app.route('/video_feed/<camera_id>')
@login_required
def video_feed(camera_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404

    camera = get_users_camera(camera_id, user.id)
    if not camera:
        return jsonify({"error": "Camera not found or does not belong to you"}), 404

    try:
        return Response(gen_frames(camera_id), mimetype='multipart/x-mixed-replace; boundary=frame')
    except Exception as e:
        return jsonify({"error": "Failed to stream video", "details": str(e)}), 500





os.makedirs("detected_videos", exist_ok=True)
os.makedirs("detected_previews", exist_ok=True)  # Исправлено на "previews" вместо "preview"

DETECTED_VIDEOS_DIR = os.path.join(os.path.abspath(os.path.dirname(__file__)), "detected_videos")
DETECTED_PREVIEWS_DIR = os.path.join(os.path.abspath(os.path.dirname(__file__)), "detected_previews")  # Исправлено

@app.route('/detected_videos/<path:filename>')
@login_required
def detected_video(filename):
    try:
        mimetype = 'video/x-msvideo' if filename.endswith('.avi') else 'video/mp4'
        return send_from_directory(
            DETECTED_VIDEOS_DIR,
            filename,
            mimetype=mimetype,
            as_attachment=False
        )
    except FileNotFoundError:
        if filename.endswith('.avi'):
            mp4_file = filename.replace('.avi', '.mp4')
            if os.path.exists(os.path.join(DETECTED_VIDEOS_DIR, mp4_file)):
                return send_from_directory(
                    DETECTED_VIDEOS_DIR,
                    mp4_file,
                    mimetype='video/mp4'
                )
        return "Video not found", 404


@app.route('/detected_previews/<path:filename>')
@login_required
def detected_preview(filename):
    try:
        return send_from_directory(DETECTED_PREVIEWS_DIR, filename)
    except FileNotFoundError:
        return "Preview not found", 404

@app.route('/detected_objects/<int:camera_id>', methods=['GET'])
@login_required
def get_detected_objects(camera_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404

    db = SessionLocal()
    try:
        camera = db.query(Camera).filter_by(id=camera_id, user_id=user.id).first()
        if not camera:
            return jsonify({"error": "Camera not found or access denied"}), 404

        detected_objects = (
            db.query(DetectedObject)
            .filter(DetectedObject.camera_id == camera_id)
            .order_by(DetectedObject.start_time.desc())
            .limit(100)
            .all()
        )

        results = []
        for obj in detected_objects:
            image_url = f"/detected_previews/{obj.image_path}" if obj.image_path else None
            video_url = f"/detected_videos/{obj.video_path}" if obj.video_path else None

            if obj.image_path and not os.path.exists(os.path.join(DETECTED_PREVIEWS_DIR, obj.image_path)):
                print(f"Preview not found: {obj.image_path}")
                image_url = None

            if obj.video_path and not os.path.exists(os.path.join(DETECTED_VIDEOS_DIR, obj.video_path)):
                print(f"Video not found: {obj.video_path}")
                video_url = None

            results.append({
                "id": obj.id,
                "tracker_id": obj.tracker_id,
                "object_class": obj.object_class,
                "start_time": obj.start_time.isoformat() + "Z",
                "end_time": obj.end_time.isoformat() if obj.end_time else None,
                "image_path": image_url,
                "video_path": video_url
            })

        return jsonify(results)
    finally:
        db.close()


@app.route('/sse/detected_objects/<int:camera_id>')
def sse_detected_objects(camera_id):
    def event_stream():
        db = SessionLocal()
        try:
            last_count = 0
            while True:
                current_count = db.query(DetectedObject).filter_by(camera_id=camera_id).count()
                if current_count != last_count:
                    objects = (
                        db.query(DetectedObject)
                        .filter_by(camera_id=camera_id)
                        .order_by(DetectedObject.start_time.desc())
                        .limit(100)
                        .all()
                    )

                    result = []
                    for obj in objects:
                        result.append({
                            "id": obj.id,
                            "tracker_id": obj.tracker_id,
                            "object_class": obj.object_class,
                            "start_time": obj.start_time.isoformat() + "Z",
                            "end_time": obj.end_time.isoformat() if obj.end_time else None,
                            "image_path": f"/detected_previews/{obj.image_path}" if obj.image_path else None,
                            "video_path": f"/detected_videos/{obj.video_path}" if obj.video_path else None
                        })

                    yield f"data: {json.dumps(result)}\n\n"
                    last_count = current_count
                time.sleep(1)
        finally:
            db.close()

    return Response(event_stream(), mimetype="text/event-stream")




if __name__ == '__main__':
    app.run(debug=True, threaded=True)



