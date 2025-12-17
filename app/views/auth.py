from flask import Blueprint, render_template, redirect, url_for, request, flash, make_response, g, current_app, session
from app.utils import login_required
import os
import random
import string
from datetime import datetime, timedelta
from werkzeug.utils import secure_filename
from app import db, mail
from flask_mail import Message
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
        
        # Create user but unverified
        new_user = User(email=email)
        new_user.set_password(password)
        new_user.is_verified = False
        
        # Generate OTP
        otp = ''.join(random.choices(string.digits, k=6))
        new_user.otp = otp
        new_user.otp_expiry = datetime.utcnow() + timedelta(minutes=10)
        
        db.session.add(new_user)
        db.session.commit()
        
        # Send Email
        try:
            msg = Message('Your Verification Code',
                        sender=current_app.config['MAIL_USERNAME'],
                        recipients=[email])
            msg.body = f'Your verification code is: {otp}'
            mail.send(msg)
            flash('Verification code sent to your email.')
        except Exception as e:
            print(f"Failed to send email: {e}")
            print(f"DEV MODE - OTP for {email}: {otp}") # Fallback for dev
            flash('Failed to send email. Check console for OTP if in dev mode.')

        session['verification_email'] = email
        return redirect(url_for('auth.verify_otp'))
    return render_template('auth.html', mode='register')

@auth_bp.route('/verify-otp', methods=['GET', 'POST'])
def verify_otp():
    if 'verification_email' not in session:
        return redirect(url_for('auth.login'))
        
    if request.method == 'POST':
        email = session.get('verification_email')
        otp_input = request.form.get('otp')
        
        user = User.query.filter_by(email=email).first()
        
        if not user:
            flash('User not found')
            return redirect(url_for('auth.register'))
            
        if user.otp != otp_input:
            flash('Invalid OTP')
            return render_template('auth.html', mode='verify_otp')
            
        if user.otp_expiry < datetime.utcnow():
            flash('OTP Expired')
            return render_template('auth.html', mode='verify_otp')
            
        # Success
        user.is_verified = True
        user.otp = None
        user.otp_expiry = None
        db.session.commit()
        
        # Auto login
        token = user.get_token()
        resp = make_response(redirect(url_for('main.index')))
        resp.set_cookie('auth_token', token, httponly=True)
        session.pop('verification_email', None)
        return resp
        
    return render_template('auth.html', mode='verify_otp')

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        
        user = User.query.filter_by(email=email).first()
        
        if user and user.check_password(password):
            if not user.is_verified:
                flash('Please verify your email first')
                session['verification_email'] = email
                # Resend OTP logic could be here, but for now just redirect to verify
                 # Generate New OTP if needed or reuse? Let's generic new one to be safe
                otp = ''.join(random.choices(string.digits, k=6))
                user.otp = otp
                user.otp_expiry = datetime.utcnow() + timedelta(minutes=10)
                db.session.commit()
                
                try:
                    msg = Message('Your Verification Code',
                                sender=current_app.config['MAIL_USERNAME'],
                                recipients=[email])
                    msg.body = f'Your verification code is: {otp}'
                    mail.send(msg)
                except Exception as e:
                    print(f"DEV MODE - OTP for {email}: {otp}")
                    
                return redirect(url_for('auth.verify_otp'))

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
