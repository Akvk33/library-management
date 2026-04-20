from flask import Blueprint, request, jsonify
from models import Users, Role, Borrow
from mongoengine.errors import ValidationError
from datetime import datetime
from auth_helpers import get_admin_user

userBp = Blueprint("userBp", __name__)

@userBp.post("/users/insert")
def create_user():
    try:
        admin, error_response = get_admin_user()
        if error_response:
            return error_response

        data=request.get_json() or {}
        name=data.get("name")
        password=data.get("password")
        email=data.get("email")
        role_name=data.get("role")
        
        if not all([name,password,email]):
            return jsonify({"error":"Name, email, and password are required"}),400
        
        name=name.strip().lower()
        password=password.strip()
        email=email.strip().lower()
        role_name=(role_name or "").strip().lower()

        if Users.objects(email=email).first():
            return jsonify({"error":"Email already exists"}),400
        
        if len(password)<6:
            return jsonify({"error":"Password must be at least 6 characters long"}),400
        

        
        role_obj=Role.objects(name=role_name).first()
        if not role_obj:
            return jsonify({"error":"Role not found"}),404
        
        user=Users(name=name,email=email,role=role_obj)
        user.set_password(password)
        user.save()
        
        return jsonify({"status":"success","message":"User created successfully","data":{"id":user.id,"name":user.name,"email":user.email,"role":user.role.name if user.role else None,"createdAt":user.createdAt}}),201

    except Exception as e:
        return jsonify({"status":"error","message":f"Error {str(e)}"}),500
    
@userBp.get("/users")
def get_users():
    try:
        admin, error_response = get_admin_user()
        if error_response:
            return error_response

        users=Users.objects()

        if users.count()==0:
            return jsonify({"message":"No users found"}),200

        userList=[]
        for user in users:
            userList.append({
                "id":user.id,
                "name":user.name,
                "email":user.email,
                "role":user.role.name if user.role else None,
                "createdAt":user.createdAt,
                "updatedAt":user.updatedAt if user.updatedAt else None
            })

        return jsonify({"status":"success","message":"Users retrieved successfully","data":userList}),200
    except Exception as e:
        return jsonify({"status":"error","message":f"Error {str(e)}"}),500
    
@userBp.get("/users/<userId>")
def get_user(userId):
    try:
        admin, error_response = get_admin_user()
        if error_response:
            return error_response

        try:
            user = Users.objects(id=userId).exclude("password").first()

        except ValidationError:
            return jsonify({
                "status": "error",
                "message": "Invalid user ID format"
            }), 400 

        if not user:
            return jsonify({"error":"User not found"}),404
        
        userData={
            "id":user.id,
            "name":user.name,
            "email":user.email,
            "role":user.role.name if user.role else None,
            "createdAt":user.createdAt,
            "updatedAt":user.updatedAt if user.updatedAt else None
        }

        return jsonify({"status":"success","message":"User retrieved successfully","data":userData}),200
    except Exception as e:
        return jsonify({"status":"error","message":f"Error {str(e)}"}),500
    
@userBp.put("/users/update/<userId>")
def update_user(userId):
    try:
        admin, error_response = get_admin_user()
        if error_response:
            return error_response

        try:
            user = Users.objects(id=userId).first()

        except ValidationError:
            return jsonify({
                "status": "error",
                "message": "Invalid user ID format"
            }), 400 

        if not user:
            return jsonify({"error":"User not found"}),404
        
        data=request.get_json() or {}
        name=data.get("name")
        password=data.get("password")
        email=data.get("email")
        role=data.get("role")

        if not any([name,email,password,role]):
            return jsonify({"error":"At least one field is required"}),400

        email=email.strip().lower() if email else user.email
        role=(role or "").strip().lower()
        
        if Users.objects(email=email,id__ne=user.id).first():
            return jsonify({"status":"error","message":"Email already exists"}),400
        
        roleObj=user.role
        if role:
            roleObj=Role.objects(name=role).first()
            if not roleObj:
                return jsonify({"status":"error","message":"Role not found"}),404
            if user.id == admin.id and role != "admin":
                return jsonify({"status":"error","message":"Admin users cannot remove their own admin role"}),403
        
        user.name=name.strip().lower() if name else user.name
        user.email=email
        user.role=roleObj
        if password:
            user.set_password(password.strip())
        user.updatedAt=datetime.now()

        user.save()

        return jsonify({"status":"success","message":"User updated successfully","data":{"id":user.id,"name":user.name,"email":user.email,"role":user.role.name if user.role else None,"createdAt":user.createdAt,"updatedAt":user.updatedAt if user.updatedAt else None}}),200

    except Exception as e:
        return jsonify({"status":"error","message":f"Error {str(e)}"}),500
    
@userBp.delete("/users/delete/<userId>")
def delete_user(userId):
    try:
        admin, error_response = get_admin_user()
        if error_response:
            return error_response

        try:
            user = Users.objects(id=userId).first()

        except ValidationError:
            return jsonify({
                "status": "error",
                "message": "Invalid user ID format"
            }), 400 

        if not user:
            return jsonify({"status":"error","message":"User not found"}),404
        
        if user.id == admin.id:
            return jsonify({"status":"error","message":"You cannot delete your own account"}),403

        if user.role and user.role.name=="admin":
            return jsonify({"status":"error","message":"Admin users cannot be deleted"}),403

        Borrow.objects(user=user).delete()

        # optional: if librarian assigned
        Borrow.objects(givenBy=user).update(unset__givenBy=1)
        
        user.delete()

        return jsonify({"status":"success","message":"User deleted successfully"}),200

    except Exception as e:
        return jsonify({"status":"error","message":f"Error {str(e)}"}),500
