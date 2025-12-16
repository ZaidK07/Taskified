import uuid
from datetime import datetime
from app import db
from werkzeug.security import generate_password_hash, check_password_hash

# Association Tables
note_tags = db.Table('note_tags',
    db.Column('note_id', db.Integer, db.ForeignKey('note.id'), primary_key=True),
    db.Column('tag_id', db.Integer, db.ForeignKey('tag.id'), primary_key=True)
)

todo_tags = db.Table('todo_tags',
    db.Column('todo_id', db.Integer, db.ForeignKey('todo.id'), primary_key=True),
    db.Column('tag_id', db.Integer, db.ForeignKey('tag.id'), primary_key=True)
)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    auth_token = db.Column(db.String(36), unique=True) # UUID4 token

    todos = db.relationship('Todo', backref='author', lazy=True)
    notes = db.relationship('Note', backref='author', lazy=True)
    tags = db.relationship('Tag', backref='author', lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def get_token(self):
        token = str(uuid.uuid4())
        self.auth_token = token
        db.session.commit()
        return token

    def clear_token(self):
        self.auth_token = None
        db.session.commit()

class Tag(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

class Todo(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(100), nullable=False)
    is_complete = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, index=True, default=datetime.utcnow)
    due_date = db.Column(db.DateTime, nullable=True)
    tags = db.relationship('Tag', secondary=todo_tags, lazy='subquery',
        backref=db.backref('todos', lazy=True))

class Note(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200))
    content = db.Column(db.Text)
    image_filename = db.Column(db.String(255))
    color = db.Column(db.String(20), default='card-blue') # Storing CSS class or hex
    is_public = db.Column(db.Boolean, default=False)
    public_id = db.Column(db.String(36), unique=True, nullable=True)
    created_at = db.Column(db.DateTime, index=True, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    tags = db.relationship('Tag', secondary=note_tags, lazy='subquery',
        backref=db.backref('notes', lazy=True))
