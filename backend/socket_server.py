# backend/socket_server.py
import os
import eventlet
from flask import Flask, request
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
from datetime import datetime

# Monkey patch eventlet for Python 3.12 compatibility
eventlet.monkey_patch()

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('DJANGO_SECRET_KEY', 'your-secret-key-here')
CORS(app, origins="*")
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode='eventlet',
    ping_timeout=60,
    ping_interval=25,
)

# ... rest of your socket server code

# Store room data
rooms = {}

@socketio.on('connect')
def handle_connect():
    print(f'Client connected: {request.sid}')

@socketio.on('disconnect')
def handle_disconnect():
    print(f'Client disconnected: {request.sid}')
    # Remove user from all rooms
    for room_id in rooms:
        rooms[room_id]['users'] = [u for u in rooms[room_id]['users'] if u.get('socketId') != request.sid]

@socketio.on('join_room')
def handle_join_room(data):
    room = data.get('room')
    username = data.get('username')
    user_id = data.get('userId')
    
    if not room or not username or not user_id:
        emit('error', {'message': 'Missing room, username, or userId'})
        return
    
    join_room(room)
    
    # Initialize room if not exists
    if room not in rooms:
        rooms[room] = {
            'users': [],
            'messages': [],
            'cart': [],
            'products': [],
            'created_at': datetime.now().isoformat()
        }
    
    # Check if user already in room
    existing_user = next((u for u in rooms[room]['users'] if u['userId'] == user_id), None)
    if not existing_user:
        rooms[room]['users'].append({
            'userId': user_id,
            'username': username,
            'socketId': request.sid,
            'isActive': True,
            'currentProduct': None
        })
    else:
        existing_user['socketId'] = request.sid
        existing_user['isActive'] = True
    
    # Send room state to the user
    emit('room_joined', {
        'room': room,
        'users': rooms[room]['users'],
        'messages': rooms[room]['messages'],
        'cart': rooms[room]['cart'],
        'products': rooms[room]['products'],
        'created_at': rooms[room]['created_at']
    })
    
    # Notify others
    emit('user_joined', {
        'username': username,
        'userId': user_id,
        'socketId': request.sid
    }, room=room, include_self=False)
    
    print(f'User {username} joined room {room}')

@socketio.on('leave_room')
def handle_leave_room(data):
    room = data.get('room')
    user_id = data.get('userId')
    
    if not room or not user_id:
        return
    
    if room in rooms:
        rooms[room]['users'] = [u for u in rooms[room]['users'] if u['userId'] != user_id]
        emit('user_left', {
            'userId': user_id,
            'username': data.get('username', 'Unknown')
        }, room=room)
        
        # Clean up empty rooms
        if not rooms[room]['users']:
            del rooms[room]
    
    leave_room(room)

@socketio.on('send_message')
def handle_send_message(data):
    room = data.get('room')
    message = data.get('message')
    username = data.get('username')
    user_id = data.get('userId')
    
    if not room or not message:
        emit('error', {'message': 'Missing room or message'})
        return
    
    if room not in rooms:
        emit('error', {'message': 'Room not found'})
        return
    
    msg_data = {
        'username': username or 'Anonymous',
        'userId': user_id or 'unknown',
        'message': message,
        'timestamp': datetime.now().isoformat()
    }
    
    rooms[room]['messages'].append(msg_data)
    
    # Keep only last 100 messages
    if len(rooms[room]['messages']) > 100:
        rooms[room]['messages'] = rooms[room]['messages'][-100:]
    
    emit('new_message', msg_data, room=room)

@socketio.on('view_product')
def handle_view_product(data):
    room = data.get('room')
    product_id = data.get('productId')
    product = data.get('product')
    user_id = data.get('userId')
    
    if not room or not product_id:
        return
    
    if room in rooms:
        for user in rooms[room]['users']:
            if user['userId'] == user_id:
                user['currentProduct'] = product_id
                break
        
        # Add product to room products if not exists
        if product and not any(p.get('id') == product_id for p in rooms[room].get('products', [])):
            if 'products' not in rooms[room]:
                rooms[room]['products'] = []
            rooms[room]['products'].append(product)
        
        emit('product_viewed', {
            'userId': user_id,
            'productId': product_id,
            'username': next((u['username'] for u in rooms[room]['users'] if u['userId'] == user_id), 'Unknown')
        }, room=room)

@socketio.on('add_to_cart')
def handle_add_to_cart(data):
    room = data.get('room')
    product_id = data.get('productId')
    product = data.get('product')
    user_id = data.get('userId')
    quantity = data.get('quantity', 1)
    
    if not room or not product_id:
        return
    
    if room in rooms:
        # Find existing cart item
        existing_item = next((item for item in rooms[room]['cart'] if item.get('id') == product_id), None)
        if existing_item:
            existing_item['quantity'] = existing_item.get('quantity', 0) + quantity
            existing_item['addedBy'] = user_id
        else:
            cart_item = {
                'id': product_id,
                'name': product.get('name', 'Product'),
                'price': product.get('price', 0),
                'img': product.get('img', ''),
                'quantity': quantity,
                'addedBy': user_id
            }
            rooms[room]['cart'].append(cart_item)
        
        emit('cart_updated', {
            'cart': rooms[room]['cart'],
            'userId': user_id
        }, room=room)

@socketio.on('remove_from_cart')
def handle_remove_from_cart(data):
    room = data.get('room')
    product_id = data.get('productId')
    user_id = data.get('userId')
    
    if not room or not product_id:
        return
    
    if room in rooms:
        rooms[room]['cart'] = [item for item in rooms[room]['cart'] if item.get('id') != product_id]
        emit('cart_updated', {
            'cart': rooms[room]['cart'],
            'userId': user_id
        }, room=room)

@socketio.on('update_cart_quantity')
def handle_update_cart_quantity(data):
    room = data.get('room')
    product_id = data.get('productId')
    quantity = data.get('quantity', 1)
    user_id = data.get('userId')
    
    if not room or not product_id:
        return
    
    if room in rooms:
        for item in rooms[room]['cart']:
            if item.get('id') == product_id:
                if quantity <= 0:
                    rooms[room]['cart'] = [i for i in rooms[room]['cart'] if i.get('id') != product_id]
                else:
                    item['quantity'] = quantity
                break
        
        emit('cart_updated', {
            'cart': rooms[room]['cart'],
            'userId': user_id
        }, room=room)

@socketio.on('get_room_state')
def handle_get_room_state(data):
    room = data.get('room')
    user_id = data.get('userId')
    
    if not room:
        return
    
    if room in rooms:
        emit('room_state', {
            'users': rooms[room]['users'],
            'messages': rooms[room]['messages'][-50:],
            'cart': rooms[room]['cart'],
            'products': rooms[room].get('products', [])
        })
    else:
        emit('error', {'message': 'Room not found'})

if __name__ == '__main__':
    print('🚀 Starting Socket.io server...')
    socketio.run(
        app,
        host='0.0.0.0',
        port=int(os.environ.get('SOCKET_PORT', 5001)),
        debug=False
    )