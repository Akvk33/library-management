from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from models import Users


def get_jwt_user():
    try:
        verify_jwt_in_request()
    except Exception:
        return None

    user_id = get_jwt_identity()
    if not user_id:
        return None

    return Users.objects(id=user_id).first()


def get_admin_user():
    user = get_jwt_user()
    if not user:
        return None, (jsonify({"status":"error","message":"Unauthorized"}), 401)

    if not user.role or user.role.name != "admin":
        return None, (jsonify({"status":"error","message":"Forbidden"}), 403)

    return user, None


def get_librarian_user():
    user = get_jwt_user()
    if not user:
        return None, (jsonify({"status":"error","message":"Unauthorized"}), 401)

    if not user.role or user.role.name != "librarian":
        return None, (jsonify({"status":"error","message":"Forbidden"}), 403)

    return user, None
