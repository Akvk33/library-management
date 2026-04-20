from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Users, Books
from mongoengine import ValidationError
from datetime import datetime

bookBp = Blueprint("bookbp", __name__)

@bookBp.post("/books/insert")
@jwt_required()
def insert_book():
    try:
        data=request.get_json() or {}

        title=data.get("title")
        author=data.get("author")
        price=data.get("price")
        stock=data.get("stock")

        user_id = get_jwt_identity()
        if not user_id:
            return jsonify({"status":"error","message":"Unauthorized"}), 401

        user = Users.objects(id=user_id).first()
        if not user or not user.role or user.role.name != "admin":
            return jsonify({"status":"error","message":"Forbidden"}), 403

        if not title or not author or price is None or stock is None:
            return jsonify({"status":"error","message":"Missing required fields"}),400

        try:
            price=float(price)
            stock=int(stock)
        except (TypeError, ValueError):
            return jsonify({"status":"error","message":"Price must be numeric and stock must be an integer"}),400

        if stock < 0:
            return jsonify({"status":"error","message":"Stock cannot be negative"}),400
        
        book=Books(title=title,author=author,price=price,stock=stock)

        book.save()

        return jsonify({"status":"success","message":"Book inserted successfully","data":{"id":book.id,"title":book.title,"author":book.author,"price":book.price,"stock":book.stock}}),201
    
    except Exception as e:
        return jsonify({"status":"error","message":f"Error {str(e)}"}),500
    
@bookBp.get("/books")
def get_books():
    try:
        books=Books.objects()

        if books.count()==0:
            return jsonify({"status":"success","message":"No books found","data":[]}),200
        
        book_list=[{"id":book.id,"title":book.title,"author":book.author,"price":book.price,"stock":book.stock} for book in books]

        return jsonify({"status":"success","message":"Books retrieved successfully","data":book_list}),200
    except Exception as e:
        return jsonify({"status":"error","message":f"Error {str(e)}"}),500
    
@bookBp.get("/books/<bookId>")
def get_book(bookId):
    try:
        try:
            book=Books.objects(id=bookId).first()

        except ValidationError:
            return jsonify({"status":"error","message":"Invalid book ID"}),400
        
        if not book:
            return jsonify({"status":"error","message":"Book not found"}),404
        
        if book.stock<=0:
            return jsonify({"status":"success","message":"Book is out of stock","data":None}),200
        
        data={
            "id":book.id,
            "title":book.title,
            "author":book.author,
            "price":book.price,
            "stock":book.stock,
            "createdAt":book.createdAt
        }

        return jsonify({"status":"success","message":"Book retrieved successfully","data":data}),200
    
    except Exception as e:
        return jsonify({"status":"error","message":f"Error {str(e)}"}),500
    
@bookBp.put("/books/update/<bookId>")
@jwt_required()
def update_book(bookId):
    try:
        try:
            book=Books.objects(id=bookId).first()

        except ValidationError:
            return jsonify({"status":"error","message":"Invalid book ID"}),400
        
        if not book:
            return jsonify({"status":"error","message":"Book not found"}),404
        
        data=request.get_json() or {}

        title=data.get("title")
        author=data.get("author")
        price=data.get("price")
        stock=data.get("stock")

        if not any([title, author, price is not None, stock is not None]):
            return jsonify({"status":"error","message":"No fields to update"}),400

        user_id = get_jwt_identity()
        if not user_id:
            return jsonify({"status":"error","message":"Unauthorized"}), 401

        user = Users.objects(id=user_id).first()
        if not user or not user.role or user.role.name != "admin":
            return jsonify({"status":"error","message":"Forbidden"}), 403

        normalized_title = title.strip() if title else book.title
        normalized_author = author.strip() if author else book.author

        if not normalized_title or not normalized_author:
            return jsonify({"status":"error","message":"Title and author cannot be empty"}),400

        if price is not None:
            try:
                price=float(price)
            except (TypeError, ValueError):
                return jsonify({"status":"error","message":"Price must be numeric"}),400
        else:
            price = book.price

        if stock is not None:
            try:
                stock=int(stock)
            except (TypeError, ValueError):
                return jsonify({"status":"error","message":"Stock must be an integer"}),400
            if stock < 0:
                return jsonify({"status":"error","message":"Stock cannot be negative"}),400
        else:
            stock = book.stock
        
        if Books.objects(title=normalized_title, id__ne=book.id).first():
            return jsonify({"status":"error","message":"Book with this title already exists"}),400
        
        book.title=normalized_title
        book.author=normalized_author
        book.price=price
        book.stock=stock
        book.updatedAt=datetime.now()
        book.save()

        return jsonify({"status":"success","message":"Book updated successfully","data":{"id":book.id,"title":book.title,"author":book.author,"price":book.price,"stock":book.stock}}),200
    
    except Exception as e:
        return jsonify({"status":"error","message":f"Error {str(e)}"}),500
    
@bookBp.delete("/books/delete/<bookId>")
@jwt_required()
def delete_book(bookId):
    try:
        try:
            book=Books.objects(id=bookId).first()

        except ValidationError:
            return jsonify({"status":"error","message":"Invalid book ID"}),400
        
        if not book:
            return jsonify({"status":"error","message":"Book not found"}),404

        user_id = get_jwt_identity()
        if not user_id:
            return jsonify({"status":"error","message":"Unauthorized"}), 401

        user = Users.objects(id=user_id).first()
        if not user or not user.role or user.role.name != "admin":
            return jsonify({"status":"error","message":"Forbidden"}), 403

        book.delete()

        return jsonify({"status":"success","message":"Book deleted successfully"}),200
    
    except Exception as e:
        return jsonify({"status":"error","message":f"Error {str(e)}"}),500
    
