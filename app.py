from flask import Flask, Response, jsonify, request, session
from camera import gen_frames
from flask_cors import CORS
import string
import random
from datetime import datetime
from flask_session import Session
from config import Config
from login_yandex import auth_bp
from database import SessionLocal
from models_bd import Camera, User
from functools import wraps
from camera import STOP_FLAGS
from flask_wtf import CSRFProtect
from flask_wtf.csrf import generate_csrf, validate_csrf

# app = Flask(__name__)
# CORS(app)

app = Flask(__name__)
app.config.from_object(Config)

# CORS(app, supports_credentials=True, origins=["http://localhost:5173"])
CORS(app,
     supports_credentials=True,
     origins=["http://localhost:5173"],
     methods=["GET", "POST", "DELETE", "PUT"],
     allow_headers=["Content-Type", "X-CSRFToken"],
     expose_headers=["Content-Type"])

csrf = CSRFProtect(app)
Session(app)

app.register_blueprint(auth_bp)


DEFAULT_IMAGE_URL = "https://static.vecteezy.com/system/resources/previews/001/213/234/large_2x/interface-viewfinder-digital-camera-vector.jpg"

def generate_random_id(length=8):
    chars = string.ascii_letters + string.digits
    return ''.join(random.choices(chars, k=length))


# @app.route('/csrf-token', methods=['GET'])
# def get_csrf_token():
#     token = generate_csrf()
#     response = jsonify({"csrf_token": token})
#     response.set_cookie(
#         'csrf_token',  # Имя куки
#         token,         # Значение токена
#         secure=False,  # Для разработки (в production должно быть True)
#         httponly=True, # Кука доступна только через HTTP (не через JavaScript)
#         samesite='None' # Политика SameSite
#     )
#     return response

def verify_csrf():
    """Проверка CSRF токена для текущего запроса"""
    if request.method in ('POST', 'PUT', 'DELETE', 'PATCH'):
        csrf_token = request.headers.get('X-CSRFToken') or request.cookies.get('csrf_token')
        if not csrf_token:
            return jsonify({"error": "CSRF token is missing"}), 403
        try:
            validate_csrf(csrf_token)
        except:
            return jsonify({"error": "Invalid CSRF token"}), 403


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



@app.route('/')
def index():
    return "AI Camera Backend is running."

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

@app.route("/get_camera/<camera_id>", methods=["GET"])
@login_required
def get_camera(camera_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404

    camera = get_users_camera(camera_id, user.id)
    if not camera:
        return jsonify({"error": "Camera not found or does not belong to you"}), 404

    return jsonify({
        "id": camera.id,
        "name": camera.title,
        "url": camera.url,
        "image": camera.image or DEFAULT_IMAGE_URL,
        "protocol": camera.protocol,
        "description": camera.description or "",
        "tags": camera.tags.split(",") if camera.tags else []
    }), 200


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
                # id=camera_id,
                user_id=user.id,
                title=data["name"],
                url=data["url"],
                protocol=data["protocol"],
                description=data.get("description", ""),
                tags=",".join(data.get("tags", [])),
                image=data.get("image", DEFAULT_IMAGE_URL),
                # added_at=datetime.utcnow().isoformat() + "Z"
                added_at=datetime.utcnow()
            )

            db.add(camera)
            db.commit()
            db.refresh(camera)

            return jsonify({
                "message": "Camera added successfully",
                "name": data["name"],
                "url": data["url"],
                "image": camera.image,
                "protocol": camera.protocol,
                "addedAt": camera.added_at
            }), 201
        except Exception as e:
            db.rollback()
            return jsonify({"error": "Failed to add camera", "details": str(e)}), 500
        finally:
            db.close()
    except Exception as e:
        return jsonify({"error": "Failed to chech token", "details": str(e)}), 400



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



if __name__ == '__main__':
    app.run(debug=True)
