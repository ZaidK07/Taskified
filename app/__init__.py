from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_mail import Mail
from config import Config

db = SQLAlchemy()
mail = Mail()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    mail.init_app(app)

    # Import and register blueprints
    from app.views.auth import auth_bp
    from app.views.main import main_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(main_bp)

    # Create tables if they don't exist
    with app.app_context():
        db.create_all()

    return app
