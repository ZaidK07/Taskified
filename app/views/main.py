from flask import Blueprint, render_template, request, redirect, url_for, g, jsonify
from app import db
from app.models import Todo, Note, Tag
from app.utils import login_required
import os
import json
import uuid
from datetime import datetime
from werkzeug.utils import secure_filename
from flask import current_app, Response, make_response

def get_or_create_tags(tag_string, user_id):
    if not tag_string:
        return []
    tags = []
    names = [name.strip() for name in tag_string.split(',') if name.strip()]
    for name in names:
        # Case insensitive check could be better but keeping simple
        tag = Tag.query.filter_by(name=name, user_id=user_id).first()
        if not tag:
            tag = Tag(name=name, user_id=user_id)
            db.session.add(tag)
        tags.append(tag)
    return tags

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
@login_required
def index():
    # Sort: Due dates first (asc), then by creation
    # In SQLite NULLs come first in ASC. We might want NULLs last. 
    # For now simple ASC.
    todos = Todo.query.filter_by(user_id=g.user.id).order_by(Todo.due_date.asc(), Todo.created_at.desc()).all()
    # Separate todos into pending and overdue logic could be done in template
    return render_template('index.html', user=g.user, todos=todos, now=datetime.utcnow().strftime('%Y-%m-%d'))

@main_bp.route('/todo/add', methods=['POST'])
@login_required
def add_todo():
    title = request.form.get('title')
    due_date_str = request.form.get('due_date')
    tag_string = request.form.get('tags')
    
    if title:
        due_date = None
        if due_date_str:
            try:
                due_date = datetime.strptime(due_date_str, '%Y-%m-%d')
            except ValueError:
                pass
        
        new_todo = Todo(title=title, user_id=g.user.id, due_date=due_date)
        tags = get_or_create_tags(tag_string, g.user.id)
        new_todo.tags.extend(tags)
        
        db.session.add(new_todo)
        db.session.commit()
    return redirect(url_for('main.index'))

@main_bp.route('/todo/update/<int:todo_id>', methods=['POST'])
@login_required
def update_todo(todo_id):
    todo = Todo.query.get_or_404(todo_id)
    if todo.user_id == g.user.id:
        todo.is_complete = not todo.is_complete
        db.session.commit()
    return redirect(url_for('main.index'))

@main_bp.route('/todo/delete/<int:todo_id>', methods=['POST'])
@login_required
def delete_todo(todo_id):
    todo = Todo.query.get_or_404(todo_id)
    if todo.user_id == g.user.id:
        db.session.delete(todo)
        db.session.commit()
    return redirect(url_for('main.index'))

@main_bp.route('/notes')
@login_required
def notes():
    notes = Note.query.filter_by(user_id=g.user.id).order_by(Note.created_at.desc()).all()
    return render_template('notes.html', user=g.user, notes=notes, active_page='notes')

@main_bp.route('/notes/add', methods=['POST'])
@login_required
def add_note():
    title = request.form.get('title')
    content = request.form.get('content')
    color = request.form.get('color', 'card-blue')
    tag_string = request.form.get('tags')
    image = request.files.get('image')
    image_filename = None
        
    tags = get_or_create_tags(tag_string, g.user.id)

    if image and image.filename:
        filename = secure_filename(image.filename)
        upload_folder = current_app.config['UPLOAD_FOLDER']
        if not os.path.exists(upload_folder):
            os.makedirs(upload_folder)
        image.save(os.path.join(upload_folder, filename))
        image_filename = filename
    
    if title or content or image_filename:
        new_note = Note(title=title, content=content, color=color, image_filename=image_filename, user_id=g.user.id)
        new_note.tags.extend(tags)
        db.session.add(new_note)
        db.session.commit()
    return redirect(url_for('main.notes'))

@main_bp.route('/notes/delete/<int:note_id>', methods=['POST'])
@login_required
def delete_note(note_id):
    note = Note.query.get_or_404(note_id)
    if note.user_id == g.user.id:
        db.session.delete(note)
        db.session.commit()
    return redirect(url_for('main.notes'))

@main_bp.route('/notes/update/<int:note_id>', methods=['POST'])
@login_required
def update_note(note_id):
    note = Note.query.get_or_404(note_id)
    if note.user_id == g.user.id:
        note.title = request.form.get('title')
        note.content = request.form.get('content')
        note.color = request.form.get('color')
        
        tag_string = request.form.get('tags')
        if tag_string is not None: # Only update if provided
             note.tags = get_or_create_tags(tag_string, g.user.id)
             
        db.session.commit()
    return redirect(url_for('main.notes'))

@main_bp.route('/search')
@login_required
def search():
    query = request.args.get('q', '')
    filter_type = request.args.get('type', 'all')
    
    results = {'todos': [], 'notes': []}
    
    if query:
        # Search Todos
        if filter_type in ['all', 'todo']:
            todos = Todo.query.filter(
                Todo.user_id == g.user.id,
                Todo.title.ilike(f'%{query}%')
            ).all()
            results['todos'] = todos
            
        # Search Notes
        if filter_type in ['all', 'note']:
            notes = Note.query.filter(
                Note.user_id == g.user.id,
                (Note.title.ilike(f'%{query}%')) | (Note.content.ilike(f'%{query}%'))
            ).all()
            results['notes'] = notes
            
    return render_template('search_results.html', query=query, results=results, user=g.user)

@main_bp.route('/export_data')
@login_required
def export_data():
    todos = Todo.query.filter_by(user_id=g.user.id).all()
    notes = Note.query.filter_by(user_id=g.user.id).all()
    
    data = {
        'todos': [{
            'title': t.title,
            'is_complete': t.is_complete,
            'created_at': t.created_at.isoformat(),
            'due_date': t.due_date.isoformat() if t.due_date else None,
            'tags': [tag.name for tag in t.tags]
        } for t in todos],
        'notes': [{
            'title': n.title,
            'content': n.content,
            'color': n.color,
            'created_at': n.created_at.isoformat(),
            'tags': [tag.name for tag in n.tags],
            'is_public': n.is_public
        } for n in notes]
    }
    
    json_str = json.dumps(data, indent=2)
    response = make_response(json_str)
    response.headers['Content-Disposition'] = 'attachment; filename=backup.json'
    response.headers['Content-Type'] = 'application/json'
    return response

@main_bp.route('/shared/<public_id>')
def shared_note(public_id):
    note = Note.query.filter_by(public_id=public_id, is_public=True).first_or_404()
    # Helper to render markdown
    import markdown2
    import bleach
    html_content = markdown2.markdown(note.content)
    # Basic sanitization - allow common tags
    allowed_tags = ['p', 'b', 'i', 'strong', 'em', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'blockquote', 'code', 'pre', 'img', 'br', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td']
    allowed_attrs = {'a': ['href', 'title'], 'img': ['src', 'alt']}
    clean_html = bleach.clean(html_content, tags=allowed_tags, attributes=allowed_attrs)
    
    return render_template('shared_note.html', note=note, html_content=clean_html)

@main_bp.route('/note/share/<int:note_id>', methods=['POST'])
@login_required
def share_note_toggle(note_id):
    note = Note.query.get_or_404(note_id)
    if note.user_id != g.user.id:
        return 'Unauthorized', 403
        
    note.is_public = not note.is_public
    if note.is_public and not note.public_id:
        note.public_id = str(uuid.uuid4())
    
    db.session.commit()
    
    # AJAX support
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return jsonify({
            'success': True,
            'is_public': note.is_public,
            'public_id': note.public_id
        })
        
    return redirect(url_for('main.notes'))
@main_bp.route('/update_name', methods=['POST'])
@login_required
def update_name():
    data = request.get_json()
    new_name = data.get('name')
    if new_name is not None:
        g.user.name = new_name.strip()
        db.session.commit()
        return jsonify({'success': True})
    return jsonify({'success': False}), 400
