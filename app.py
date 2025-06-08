from flask import Flask, Response, jsonify, request
from camera import gen_frames, add_camera, camera_sources, youtube_cameras
from flask_cors import CORS
import string
import random
from datetime import datetime

app = Flask(__name__)
CORS(app)

camera_metadata = {}

DEFAULT_IMAGE_URL = "https://static.vecteezy.com/system/resources/previews/001/213/234/large_2x/interface-viewfinder-digital-camera-vector.jpg"

def generate_random_id(length=8):
    chars = string.ascii_letters + string.digits
    return ''.join(random.choices(chars, k=length))

@app.route('/')
def index():
    return "AI Camera Backend is running."


@app.route('/video_feed/<camera_id>')
def video_feed(camera_id):
    if camera_id not in camera_metadata:
        return jsonify({"error": "Camera not found"}), 404

    return Response(gen_frames(camera_id),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/cameras', methods=['GET'])
def list_cameras():
    cameras_list = []
    for cam_id, data in camera_metadata.items():
        cameras_list.append({
            "id": cam_id,
            "name": data.get("name"),
            "url": data.get("url"),
            "image": data.get("image", DEFAULT_IMAGE_URL),
            "protocol": data.get("protocol"),
            "description": data.get("description", ""),
            "tags": data.get("tags", []),
            "addedAt": data.get("addedAt")
        })
    return jsonify(cameras_list)


@app.route("/get_camera/<camera_id>", methods=["GET"])
def get_camera(camera_id):
    if camera_id in camera_metadata:
        data = camera_metadata[camera_id]
        return jsonify({
            "id": camera_id,
            "name": data.get("name"),
            "image": data.get("image", DEFAULT_IMAGE_URL),
            "description": data.get("description", ""),
            "tags": data.get("tags", []),
            "protocol": data.get("protocol"),
            "url": data.get("url"),
        }), 200
    return jsonify({"error": "Camera not found"}), 404


@app.route('/add_camera', methods=['POST'])
def add_camera_route():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
    except Exception as e:
        return jsonify({"error": "Invalid JSON format", "details": str(e)}), 400

    required_fields = ['name', 'url', 'protocol']
    if not all(field in data for field in required_fields):
        return jsonify({"error": f"Missing required fields: {required_fields}"}), 400

    name = data['name']
    url = data['url']
    protocol = data['protocol']
    description = data.get('description', '')
    tags = data.get('tags', [])
    image = data.get('image', DEFAULT_IMAGE_URL)

    camera_id = generate_random_id()
    is_youtube = protocol.upper() == "HTTP"

    try:
        add_camera(camera_id=camera_id, url=url, is_youtube=is_youtube)

        camera_metadata[camera_id] = {
            "name": name,
            "url": url,
            "protocol": protocol,
            "description": description,
            "tags": tags,
            "image": image,
            "addedAt": datetime.utcnow().isoformat() + "Z"

        }

        return jsonify({
            "message": "Camera added successfully",
            "camera_id": camera_id,
            "name": name,
            "url": url,
            "image": image,
            "protocol": protocol,
            "addedAt": camera_metadata[camera_id]["addedAt"]
        }), 201

    except Exception as e:
        return jsonify({"error": "Failed to add camera", "details": str(e)}), 500


@app.route('/delete_camera/<camera_id>', methods=['DELETE'])
def delete_camera(camera_id):
    if camera_id in camera_metadata:
        try:
            del camera_metadata[camera_id]

            if camera_id in camera_sources:
                del camera_sources[camera_id]

            if camera_id in youtube_cameras:
                del youtube_cameras[camera_id]

            return jsonify({"message": f"Camera {camera_id} deleted successfully"}), 200

        except Exception as e:
            return jsonify({"error": "Failed to delete camera", "details": str(e)}), 500
    else:
        return jsonify({"error": "Camera not found"}), 404


if __name__ == '__main__':
    app.run(debug=True)
