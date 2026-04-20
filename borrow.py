from flask import Blueprint, request, jsonify
from models import Borrow, Books, Users
from datetime import datetime, timedelta
from mongoengine.errors import ValidationError
from auth_helpers import get_jwt_user, get_librarian_user

borrowBp = Blueprint("borrow", __name__)

PENDING_EXPIRY_HOURS = 24


def sync_borrow_state(borrow):
    if not borrow:
        return None

    now = datetime.now()
    changed = False

    if borrow.status in (None, ""):
        borrow.status = "accepted" if borrow.givenBy else "pending"
        changed = True

    if borrow.status == "pending" and borrow.requestExpiresAt and now > borrow.requestExpiresAt:
        borrow.status = "cancelled"
        borrow.updatedAt = now
        changed = True

    if borrow.status == "accepted" and borrow.dueDate and now > borrow.dueDate:
        borrow.status = "expired"
        book=borrow.book
        book.stock+=borrow.quantity
        book.save()
        borrow.updatedAt = now
        changed = True

    if borrow.isPaid and borrow.status != "completed":
        borrow.status = "completed"
        borrow.updatedAt = now
        changed = True

    if changed:
        borrow.save()

    return borrow


def serialize_borrow(borrow):
    return {
        "id": str(borrow.id),
        "status": borrow.status,
        "isPaid": borrow.isPaid,
        "quantity": borrow.quantity,
        "totalPrice": borrow.totalPrice,
        "createdAt": borrow.createdAt,
        "updatedAt": borrow.updatedAt,
        "requestExpiresAt": borrow.requestExpiresAt,
        "dueDate": borrow.dueDate,
        "book": {
            "id": str(borrow.book.id) if borrow.book else None,
            "title": borrow.book.title if borrow.book else None,
            "author": borrow.book.author if borrow.book else None,
        },
        "user": {
            "id": str(borrow.user.id) if borrow.user else None,
            "name": borrow.user.name if borrow.user else None,
            "email": borrow.user.email if borrow.user else None,
            "role": borrow.user.role.name if borrow.user and borrow.user.role else None,
        },
        "givenBy": {
            "id": str(borrow.givenBy.id) if borrow.givenBy else None,
            "name": borrow.givenBy.name if borrow.givenBy else None,
            "email": borrow.givenBy.email if borrow.givenBy else None,
        },
    }


@borrowBp.get("/borrows")
def get_borrows():
    try:
        user = get_jwt_user()
        if not user:
            return jsonify({"status":"error","message":"Unauthorized"}),401

        borrows = Borrow.objects.order_by("-createdAt")

        if not user.role or user.role.name not in ["admin", "librarian"]:
            borrows = borrows.filter(user=user)

        borrow_list = []
        for borrow in borrows:
            synced_borrow = sync_borrow_state(borrow)
            borrow_list.append(serialize_borrow(synced_borrow))

        return jsonify({"status":"success","message":"Borrow requests retrieved successfully.","data":borrow_list}),200

    except Exception as e:
        return jsonify({"status":"error","message":f"Error {str(e)}"}),500


@borrowBp.get("/borrows/me")
def get_my_borrows():
    try:
        user = get_jwt_user()
        if not user:
            return jsonify({"status":"error","message":"Unauthorized"}),401

        borrows = Borrow.objects(user=user).order_by("-createdAt")
        borrow_list = []

        for borrow in borrows:
            synced_borrow = sync_borrow_state(borrow)
            borrow_list.append(serialize_borrow(synced_borrow))

        return jsonify({"status":"success","message":"Your borrow requests retrieved successfully.","data":borrow_list}),200

    except Exception as e:
        return jsonify({"status":"error","message":f"Error {str(e)}"}),500

@borrowBp.post("/borrow/request/<bookId>")
def borrow_book(bookId):
    try:
        data=request.get_json() or {}
        quantity=data.get("quantity")
        
        if quantity is None:
            return jsonify({"error":"Missing required fields"}),400

        try:
            quantity=int(quantity)
        except (TypeError, ValueError):
            return jsonify({"status":"error","message":"Quantity must be a valid integer"}),400
        
        user = get_jwt_user()
        if not user:
            return jsonify({"status":"error","message":"Unauthorized"}),401
        
        try:
            book=Books.objects(id=bookId).first()

        except ValidationError:
            return jsonify({"status":"error","message":"Invalid book ID"}),400
        
        if not book:
            return jsonify({"status":"error","message":"Book not found"}),404
        
        if book.stock<quantity:
            return jsonify({"status":"error","message":"Not enough stock available"}),400
        
        if quantity <= 0:
            return jsonify({"status":"error","message":"Quantity must be greater than zero"}),400

        borrow=Borrow(
            user=user,
            book=book,
            quantity=quantity,
            totalPrice=book.price*quantity,
            status="pending",
            requestExpiresAt=datetime.now()+timedelta(hours=PENDING_EXPIRY_HOURS)
        ).save()

        return jsonify({"status":"success","message":"Borrow request created successfully. It will cancel automatically if not handled in time.","data":{"borrowId":borrow.id,"bookName":borrow.book.title,"quantity":borrow.quantity,"totalPrice":borrow.totalPrice,"status":borrow.status,"requestExpiresAt":borrow.requestExpiresAt}}),200

    except Exception as e:
        return jsonify({"status":"error","message":f"Error {str(e)}"}),500
    
@borrowBp.get("/borrow/checkdue/<borrowId>")
def check_due(borrowId):
    try:
        user = get_jwt_user()
        if not user:
            return jsonify({"status":"error","message":"Unauthorized"}),401
        
        try:
            borrow=Borrow.objects(id=borrowId).first()

        except ValidationError:
            return jsonify({"status":"error","message":"Invalid borrow ID"}),400
        
        if not borrow:
            return jsonify({"status":"error","message":"Borrow request not found"}),404
        
        sync_borrow_state(borrow)

        if borrow.isPaid:
            return jsonify({"status":"error","message":"Borrow already completed"}),400
        
        if borrow.user.id!=user.id:
            return jsonify({"status":"error","message":"Forbidden"}),403

        if borrow.status == "pending":
            return jsonify({"status":"error","message":"Borrow request is still waiting for librarian approval."}),400

        if borrow.status == "cancelled":
            return jsonify({"status":"error","message":"Borrow request was cancelled automatically because the trial period ended."}),400

        if borrow.status == "rejected":
            return jsonify({"status":"error","message":"Borrow request was rejected by the librarian."}),400

        if not borrow.dueDate:
            return jsonify({"status":"error","message":"Borrow due date is not available yet."}),400
        
        if datetime.now()>borrow.dueDate:
            return jsonify({"status":"success","message":"Borrow time has ended.","data":{"isOverdue":True,"dueDate":borrow.dueDate,"status":borrow.status}}),200
        else:
            return jsonify({"status":"success","message":"Borrow is still active.","data":{"isOverdue":False,"dueDate":borrow.dueDate,"status":borrow.status}}),200

    except Exception as e:
        return jsonify({"status":"error","message":f"Error {str(e)}"}),500
    
@borrowBp.get("/borrow/accept/<borrowId>")
def accept_borrow(borrowId):
    try:
        user, error_response = get_librarian_user()
        if error_response:
            return error_response
        
        try:
            borrow=Borrow.objects(id=borrowId).first()

        except ValidationError:
            return jsonify({"status":"error","message":"Invalid borrow ID"}),400
        
        if not borrow:
            return jsonify({"status":"error","message":"Borrow request not found"}),404
        
        sync_borrow_state(borrow)

        if borrow.isPaid or borrow.status=="completed":
            return jsonify({"status":"error","message":"Borrow request already completed"}),400

        if borrow.status=="cancelled":
            return jsonify({"status":"error","message":"Borrow request expired before librarian action"}),400

        if borrow.status=="rejected":
            return jsonify({"status":"error","message":"Borrow request already rejected"}),400

        if borrow.status=="accepted":
            return jsonify({"status":"error","message":"Borrow request already accepted"}),400

        if borrow.book.stock < borrow.quantity:
            return jsonify({"status":"error","message":"Not enough stock available to accept this borrow request"}),400
        
        if not borrow.book:
            return jsonify({"status":"error","message":"Book not found"}),404
        
        book = borrow.book
        book.stock -= borrow.quantity
        book.updatedAt = datetime.now()
        book.save() 

        borrow.givenBy=user
        borrow.status="accepted"
        borrow.requestExpiresAt=None
        borrow.dueDate=datetime.now()+timedelta(days=7) if borrow.user.role.name=="member" else datetime.now()+timedelta(days=1)
        borrow.updatedAt=datetime.now()
        borrow.save()

        return jsonify({"status":"success","message":"Borrow request accepted.","data":{"status":borrow.status,"dueDate":borrow.dueDate}}),200

    except Exception as e:
        return jsonify({"status":"error","message":f"Error {str(e)}"}),500


@borrowBp.patch("/borrow/reject/<borrowId>")
def reject_borrow(borrowId):
    try:
        user, error_response = get_librarian_user()
        if error_response:
            return error_response

        try:
            borrow=Borrow.objects(id=borrowId).first()
        except ValidationError:
            return jsonify({"status":"error","message":"Invalid borrow ID"}),400

        if not borrow:
            return jsonify({"status":"error","message":"Borrow request not found"}),404

        sync_borrow_state(borrow)

        if borrow.status == "cancelled":
            return jsonify({"status":"error","message":"Borrow request already cancelled automatically"}),400

        if borrow.status == "accepted":
            return jsonify({"status":"error","message":"Accepted borrow requests cannot be rejected"}),400

        if borrow.status == "rejected":
            return jsonify({"status":"error","message":"Borrow request already rejected"}),400

        if borrow.status == "completed":
            return jsonify({"status":"error","message":"Borrow request already completed"}),400

        borrow.status = "rejected"
        borrow.updatedAt = datetime.now()
        borrow.save()

        return jsonify({"status":"success","message":"Borrow request rejected successfully.","data":{"status":borrow.status}}),200

    except Exception as e:
        return jsonify({"status":"error","message":f"Error {str(e)}"}),500

@borrowBp.patch("/borrow/pay/<borrowId>")
def pay_borrow(borrowId):
    try:
        user = get_jwt_user()
        if not user:
            return jsonify({"status":"error","message":"Unauthorized"}),401
        
        try:
            borrow=Borrow.objects(id=borrowId).first()
        except ValidationError:
            return jsonify({"status":"error","message":"Invalid borrow ID"}),400
        
        if not borrow:
            return jsonify({"status":"error","message":"Borrow request not found"}),404
        
        sync_borrow_state(borrow)

        if borrow.isPaid:
            return jsonify({"status":"error","message":"Borrow already paid"}),400
        
        if borrow.user.id!=user.id:
            return jsonify({"status":"error","message":"Forbidden"}),403

        if borrow.status not in ["accepted", "expired"]:
            return jsonify({"status":"error","message":"Only approved borrow requests can be completed"}),400

        book=borrow.book
        if not book:
            return jsonify({"status":"error","message":"Book not found"}),404

        if book.stock < borrow.quantity:
            return jsonify({"status":"error","message":"Not enough stock available to complete this borrow"}),400
        
        borrow.isPaid=True
        borrow.status="completed"
        borrow.updatedAt=datetime.now()
        borrow.save()

        return jsonify({"status":"success","message":"Borrow request paid successfully."}),200
    
    except Exception as e:
        return jsonify({"status":"error","message":f"Error {str(e)}"}),500
    
