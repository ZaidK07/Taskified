from flask import Blueprint, render_template, redirect, url_for, request, flash, make_response, g, current_app
from app.utils import login_required
import os
from werkzeug.utils import secure_filename
from app import db
from app.models import User

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        
        if User.query.filter_by(email=email).first():
            flash('Email already registered')
            return redirect(url_for('auth.register'))
        
        new_user = User(email=email)
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.commit()
        
        return redirect(url_for('auth.login'))
    return render_template('auth.html', mode='register')

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        
        user = User.query.filter_by(email=email).first()
        
        if user and user.check_password(password):
            token = user.get_token()
            resp = make_response(redirect(url_for('main.index')))
            resp.set_cookie('auth_token', token, httponly=True)
            return resp
        
        flash('Invalid email or password')
        return redirect(url_for('auth.login'))
    
    return render_template('auth.html', mode='login')

@auth_bp.route('/logout')
def logout():
    token = request.cookies.get('auth_token')
    if token:
        user = User.query.filter_by(auth_token=token).first()
        if user:
            user.clear_token()
    
    resp = make_response(redirect(url_for('auth.login')))
    resp.delete_cookie('auth_token')
    return resp

@auth_bp.route('/profile', methods=['GET', 'POST'])
@login_required
def profile():
    if request.method == 'POST':
        # Handle Avatar
        file = request.files.get('avatar')
        if file and file.filename:
            filename = f"user_{g.user.id}.jpg"
            # Ensure static/avatars exists
            avatars_dir = os.path.join(current_app.root_path, 'static/avatars')
            if not os.path.exists(avatars_dir):
                os.makedirs(avatars_dir)
            
            file.save(os.path.join(avatars_dir, filename))
            # Cache busting could be handled in template with ?v=timestamp
            flash('Avatar updated successfully')

        # Handle Password
        new_password = request.form.get('new_password')
        current_password = request.form.get('current_password')
        
        if new_password and current_password:
            if g.user.check_password(current_password):
                g.user.set_password(new_password)
                db.session.commit()
                flash('Password updated successfully')
            else:
                flash('Incorrect current password')
                
    return render_template('profile.html', user=g.user, active_page='profile')
