from mongoengine import *
from uuid import uuid4
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

class Role(Document):
    id=StringField(primary_key=True,default=lambda: str(uuid4()))
    name=StringField(required=True,unique=True)
    createdAt=DateTimeField(default=datetime.utcnow)
    updatedAt=DateTimeField()

class Books(Document):
    id=StringField(primary_key=True,default=lambda:str(uuid4()))
    title=StringField(required=True)
    author=StringField(required=True)
    price=FloatField(required=True)
    stock=IntField(required=True)
    createdAt=DateTimeField(default=datetime.utcnow)
    updatedAt=DateTimeField()

class Users(Document):
    id=StringField(primary_key=True,default=lambda:str(uuid4()))
    name=StringField(required=True)
    email=EmailField(required=True,unique=True)
    role=ReferenceField(Role,default=lambda :Role.objects(name='user').first())
    password=StringField(required=True)
    createdAt=DateTimeField(default=datetime.utcnow)
    updatedAt=DateTimeField()

    def set_password(self, raw_password):
        if len(raw_password) < 6:
            raise ValueError("Password must be at least 6 characters")
        self.password = generate_password_hash(raw_password)

    def check_password(self, raw_password):
        return check_password_hash(self.password, raw_password)
    
class Borrow(Document):
    id=StringField(primary_key=True,default=lambda:str(uuid4()))
    user=ReferenceField(Users,required=True)
    givenBy=ReferenceField(Users)
    book=ReferenceField(Books,required=True)
    quantity=IntField(required=True)
    totalPrice=FloatField(required=True)
    status=StringField(default="pending")
    isPaid=BooleanField(default=False)
    requestExpiresAt=DateTimeField()
    dueDate=DateTimeField()
    createdAt=DateTimeField(default=datetime.utcnow)
    updatedAt=DateTimeField()


class RevokedToken(Document):
    jti=StringField(required=True,unique=True)
    token_type=StringField(required=True)
    createdAt=DateTimeField(default=datetime.utcnow)
    expiresAt=DateTimeField()
