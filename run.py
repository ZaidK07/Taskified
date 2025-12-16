import os
from app import create_app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True, port=3109, host='0.0.0.0')
