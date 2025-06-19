from flask import Blueprint, redirect, request, session, jsonify
import requests
from config import Config
from database import SessionLocal
from models_bd import User

from flask_wtf.csrf import generate_csrf

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/login/yandex")
def login_yandex():
    url = (
        f"https://oauth.yandex.ru/authorize?response_type=code"
        f"&client_id={Config.YANDEX_CLIENT_ID}"
        f"&redirect_uri={Config.REDIRECT_URI}"
    )
    return redirect(url)


@auth_bp.route("/login/yandex/callback")
def callback_yandex():
    code = request.args.get("code")
    if not code:
        return jsonify({"error": "No code provided"}), 400

    print("CLIENT_ID:", Config.YANDEX_CLIENT_ID)
    print("CLIENT_SECRET:", Config.YANDEX_CLIENT_SECRET)
    print("REDIRECT_URI:", Config.REDIRECT_URI)



    # Получаем access_token
    token_url = "https://oauth.yandex.ru/token"
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "client_id": Config.YANDEX_CLIENT_ID,
        "client_secret": Config.YANDEX_CLIENT_SECRET,
        "redirect_uri": Config.REDIRECT_URI
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    token_response = requests.post(token_url, data=data, headers=headers)

    # token_response = requests.post(token_url, data=data)

    if token_response.status_code != 200:
        return jsonify({"error": "Token exchange failed", "details": token_response.text}), 400

    access_token = token_response.json().get("access_token")

    print(token_response.status_code)
    print(token_response.json())
    # Получаем профиль
    profile_response = requests.get(
        "https://login.yandex.ru/info",
        headers={"Authorization": f"OAuth {access_token}"}
    )

    if profile_response.status_code != 200:
        return jsonify({"error": "Failed to fetch user info"}), 400

    user_info = profile_response.json()

    session["user"] = {
        "id": user_info.get("id"),
        "login": user_info.get("login"),
        "email": user_info.get("default_email"),
        "name": user_info.get("real_name"),
        "gender": user_info.get("sex"),
        "avatar": f"https://avatars.yandex.net/get-yapic/{user_info.get('default_avatar_id')}/islands-200"
    }

    db = SessionLocal()
    existing_user = db.query(User).filter_by(yandex_id=user_info.get("id")).first()

    if not existing_user:
        new_user = User(
            yandex_id=user_info.get("id"),
            name=user_info.get("real_name"),
            email=user_info.get("default_email"),
            gender=user_info.get("sex"),
            avatar=f"https://avatars.yandex.net/get-yapic/{user_info.get('default_avatar_id')}/islands-200"
        )
        db.add(new_user)
        db.commit()
    db.close()

    # return redirect("http://localhost:5173/")  # фронт-адрес после входа


    token = generate_csrf()
    response = redirect("http://localhost:5173/")
    response.set_cookie(
        'csrf_token',
        token,
        secure=False,
        httponly=False,  # Должно быть доступно для чтения через JS
        samesite='Lax'
    )

    return response

@auth_bp.route("/logout")
def logout():
    session.clear()
    response = jsonify({"message": "Logged out"})
    response.delete_cookie('session')
    response.delete_cookie('csrf_token')
    return response, 200


@auth_bp.route("/me")
def current_user():
    user = session.get("user")
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify(user)
