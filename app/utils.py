from functools import wraps
from flask import request, redirect, url_for, g
from app.models import User

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.cookies.get('auth_token')
        if not token:
            return redirect(url_for('auth.login'))
        
        user = User.query.filter_by(auth_token=token).first()
        if not user:
            return redirect(url_for('auth.login'))
        
        g.user = user
        return f(*args, **kwargs)
    return decorated_function
