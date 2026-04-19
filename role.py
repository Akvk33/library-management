from flask import Blueprint,request,jsonify
from datetime import datetime
from models import Role,Users
from mongoengine.errors import ValidationError

roleBp=Blueprint("roleBp",__name__)

@roleBp.post("/roles/insert")
def insert_role():
    try:
        data=request.get_json() or {}

        name=data.get('name')

        if not name:
            return jsonify({"status":"error","message":"Name required."}), 400
        
        name=name.strip().lower()

        if Role.objects(name=name).first():
            return jsonify({"status":"error","message":"Role already exists."}), 409
        
        role=Role(
            name=name
        )
        role.save()

        return jsonify({"status":"success","message":"Role created successfully.","data":{"roleId":role.id,"name":role.name,"createdAt":role.createdAt}}), 201

    except Exception as e:
        return jsonify({"status":"error","message":f"Error {str(e)}"}), 500
    
@roleBp.get("/roles")
def get_roles():
    try:
        roles=Role.objects()

        if roles.count() == 0:
            return jsonify({"status":"error","message":"Roles are empty."}), 404
        
        roleList=[]

        for role in roles:
            data={
               "roleId":role.id,
               "name":role.name,
               "createdAt":role.createdAt ,
               "updatedAt":role.updatedAt or None
            }

            roleList.append(data)

        return jsonify({"status":"success","message":"Roles are retrieved successfully.","data":roleList}), 200

    except Exception as e:
        return jsonify({"status":"error","message":f"Error {str(e)}"}), 500
    
@roleBp.get("/roles/<roleId>")
def get_role(roleId):
    try:
        try:
            role = Role.objects(id=roleId).only(
                "id", "name", "createdAt", "updatedAt"
            ).first()

        except ValidationError:
            return jsonify({
                "status": "error",
                "message": "Invalid role ID format"
            }), 400
        
        if not role:
            return jsonify({"status":"error","message":"Role not found."}), 404

        return jsonify({"status":"success","message":"Roles are retrieved successfully.","data":{"roleId":role.id,"name":role.name,"createdAt":role.createdAt,"updatedAt":role.updatedAt or None}}), 200

    except Exception as e:
        return jsonify({"status":"error","message":f"Error {str(e)}"}), 500
    
@roleBp.put("/roles/update/<roleId>")
def update_role(roleId):
    try:
        try:
            role = Role.objects(id=roleId).first()

        except ValidationError:
            return jsonify({
                "status": "error",
                "message": "Invalid role ID format"
            }), 400 
        
        if not role:
            return jsonify({"status":"error","message":"Role not found."}), 404
        
        data=request.get_json() or {}

        name=data.get('name')

        if not name:
            return jsonify({"status":"error","message":"Role name is required."}), 400
        
        name=name.strip().lower()

        if Role.objects(name=name,id__ne=role.id).first():
            return jsonify({"status":"error","message":"Role already exists."}), 409
        
        role.name=name
        role.updatedAt=datetime.now()
        role.save()

        return jsonify({"status":"success","message":"Role updated successfully.","data":{"roleId":role.id,"name":role.name,"updatedAt":role.updatedAt}}), 200 
    
    except Exception as e:
        return jsonify({"status":"error","message":f"Error {str(e)}"}), 500
    
@roleBp.delete("/roles/delete/<roleId>")
def delete_role(roleId):
    try:
        try:
            role = Role.objects(id=roleId).first()

        except ValidationError:
            return jsonify({
                "status": "error",
                "message": "Invalid role ID format"
            }), 400

        if not role:
            return jsonify({"status":"error","message":"Role not found."}), 404
        
        protectedRoles=["librarian","admin","member"]

        if role.name.lower() in protectedRoles:
            return jsonify({"status":"error","message":"This role cannot be deleted."}), 403
        
        if Users.objects(role=role).first():
            return jsonify({"status":"error","message":"Role is assigned to users and cannot be deleted."}), 400
        
        role.delete()

        return jsonify({"status":"success","message":"Role deleted successfully.","data":{"roleId":role.id,"name":role.name}}), 200

    except Exception as e:
        return jsonify({"status":"error","message":f"Error {str(e)}"}), 500
