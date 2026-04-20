from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_jwt,
    get_jwt_identity,
    jwt_required
)
from models import Users, Role, RevokedToken

authBp = Blueprint("authbp", __name__)


def make_auth_response(user):
    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))
    return {
        "userId": str(user.id),
        "name": user.name,
        "email": user.email,
        "role": user.role.name if user.role else None,
        "created_at": user.createdAt,
        "access_token": access_token,
        "refresh_token": refresh_token
    }


@authBp.post("/auth/register")
def register():
    try:
        data = request.get_json() or {}
        name = data.get("name")
        password = data.get("password")
        email = data.get("email")

        if not all([name, password, email]):
            return jsonify({"status": "error", "message": "Name, email, and password are required"}), 400

        name = name.strip().lower()
        password = password.strip()
        email = email.strip().lower()

        if Users.objects(email=email).first():
            return jsonify({"status": "error", "message": "Email already exists"}), 400

        if len(password) < 6:
            return jsonify({"status": "error", "message": "Password must be at least 6 characters long"}), 400

        role_obj = Role.objects(name="user").first()
        if not role_obj:
            return jsonify({"status": "error", "message": "Default member role not found"}), 404

        user = Users(name=name, role=role_obj, email=email)
        user.set_password(password)
        user.save()

        return jsonify({"status": "success", "message": "User registered successfully", "data": make_auth_response(user)}), 201

    except Exception as e:
        return jsonify({"status": "error", "message": f"Error {str(e)}"}), 500


@authBp.post("/auth/login")
def login():
    try:
        data = request.get_json() or {}
        email = data.get("email")
        password = data.get("password")

        if not all([email, password]):
            return jsonify({"status": "error", "message": "Email and password are required"}), 400

        email = email.strip().lower()
        password = password.strip()

        user = Users.objects(email=email).first()
        if not user or not user.check_password(password):
            return jsonify({"status": "error", "message": "Invalid email or password"}), 401

        return jsonify({"status": "success", "message": "Logged in successfully", "data": make_auth_response(user)}), 200

    except Exception as e:
        return jsonify({"status": "error", "message": f"Error {str(e)}"}), 500


@authBp.get("/auth/me")
@jwt_required()
def current_user():
    try:
        user_id = get_jwt_identity()
        user = Users.objects(id=user_id).first()
        if not user:
            return jsonify({"status": "error", "message": "User not found"}), 404

        return jsonify({
            "status": "success",
            "message": "Current user retrieved successfully",
            "data": {
                "userId": str(user.id),
                "name": user.name,
                "email": user.email,
                "role": user.role.name if user.role else None,
                "created_at": user.createdAt
            }
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": f"Error {str(e)}"}), 500


def revoke_token(jti, token_type, expires_at=None):
    if not RevokedToken.objects(jti=jti).first():
        RevokedToken(jti=jti, token_type=token_type, expiresAt=expires_at).save()


@authBp.post("/auth/refresh")
@jwt_required(refresh=True)
def refresh_token():
    try:
        user_id = get_jwt_identity()
        user = Users.objects(id=user_id).first()
        if not user:
            return jsonify({"status": "error", "message": "User not found"}), 404

        access_token = create_access_token(identity=str(user.id))
        return jsonify({"status": "success", "message": "Access token refreshed", "data": {"access_token": access_token}}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": f"Error {str(e)}"}), 500


@authBp.post("/auth/logout")
@jwt_required()
def logOut():
    try:
        current_jwt = get_jwt()
        access_jti = current_jwt.get("jti")
        access_exp = datetime.fromtimestamp(current_jwt.get("exp")) if current_jwt.get("exp") else None
        revoke_token(access_jti, current_jwt.get("type"), access_exp)

        data = request.get_json() or {}
        refresh_token = data.get("refresh_token")
        if refresh_token:
            try:
                decoded_refresh = decode_token(refresh_token)
                refresh_jti = decoded_refresh.get("jti")
                refresh_exp = datetime.fromtimestamp(decoded_refresh.get("exp")) if decoded_refresh.get("exp") else None
                revoke_token(refresh_jti, decoded_refresh.get("type"), refresh_exp)
            except Exception:
                pass

        return jsonify({"status": "success", "message": "Logged out successfully"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": f"Error {str(e)}"}), 500
