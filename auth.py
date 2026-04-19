from flask import Blueprint,request,jsonify,session
from models import Users,Role

authBp=Blueprint("authbp",__name__)

@authBp.post("/auth/register")
def register():
    try:
        data=request.get_json() or {}
        name=data.get("name")
        password=data.get("password")
        email=data.get("email")
        
        if not all([name,password,email]):
            return jsonify({"status":"error","message":"Name, email, and password are required"}),400
        
        name=name.strip().lower()
        password=password.strip()
        email=email.strip().lower()

        if Users.objects(email=email).first():
            return jsonify({"status":"error","message":"Email already exists"}),400
        
        if len(password)<6:
            return jsonify({"status":"error","message":"Password must be at least 6 characters long"}),400
        
        role_obj=Role.objects(name="user").first()
        if not role_obj:
            return jsonify({"status":"error","message":"Default member role not found"}),404
        
        user=Users(name=name,role=role_obj,email=email)
        user.set_password(password)
        user.save()

        session["user"]={
            "id":user.id,
            "name":name,
            "email":email
        }
        
        return jsonify({"status":"success","message":"User registered successfully","data":{"userId":user.id,"name":user.name,"email":user.email,"role":user.role.name,"created_at":user.createdAt}}),201

    except Exception as e:
        return jsonify({"status":"error","message":f"Error {str(e)}"}),500
    
@authBp.post("/auth/login")
def login():
    try:
        data=request.get_json() or {}
        email=data.get("email")
        password=data.get("password")

        if not all([email,password]):
            return jsonify({"status":"error","message":"Email and password are required"}),400
        
        email=email.strip().lower()
        password=password.strip()

        user=Users.objects(email=email).first()
        if not user or not user.check_password(password):
            return jsonify({"status":"error","message":"Invalid email or password"}),401
        
        session["user"]={
            "id":user.id,
            "name":user.name,
            "email":user.email
        }

        return jsonify({"status":"success","message":"Logged in successfully","data":{"userId":user.id,"name":user.name,"email":user.email,"role":user.role.name if user.role else None,"created_at":user.createdAt}}),200
    
    except Exception as e:
        return jsonify({"status":"error","message":f"Error {str(e)}"}),500


@authBp.get("/auth/me")
def current_user():
    try:
        current_user_data = session.get("user")
        if not current_user_data:
            return jsonify({"status":"error","message":"Unauthorized"}),401

        user = Users.objects(id=current_user_data["id"]).first()
        if not user:
            session.clear()
            return jsonify({"status":"error","message":"User not found"}),404

        return jsonify({
            "status":"success",
            "message":"Current user retrieved successfully",
            "data":{
                "userId":user.id,
                "name":user.name,
                "email":user.email,
                "role":user.role.name if user.role else None,
                "created_at":user.createdAt
            }
        }),200

    except Exception as e:
        return jsonify({"status":"error","message":f"Error {str(e)}"}),500
      
@authBp.get("/auth/logout")
def logOut():
    session.clear()
    return jsonify({"status":"success","message":"Logged out successfully"}),200
