# backend/socket_server.py
import os
import eventlet

# ✅ IMPORTANT: Monkey patch must happen BEFORE importing other modules
eventlet.monkey_patch()

# Now import other modules
from flask import Flask, request
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
from datetime import datetime

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('DJANGO_SECRET_KEY', 'your-secret-key-here')

# Configure CORS
CORS(app, origins="*", supports_credentials=True)

# Initialize SocketIO
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode='eventlet',
    ping_timeout=60,
    ping_interval=25,
)

# Store room data
rooms = {}

# ============================================================
# CONNECTION EVENTS
# ============================================================

@socketio.on('connect')
def handle_connect():
    print(f'🟢 Client connected: {request.sid}')

@socketio.on('disconnect')
def handle_disconnect():
    print(f'🔴 Client disconnected: {request.sid}')
    # Remove user from all rooms
    for room_id in list(rooms.keys()):
        rooms[room_id]['users'] = [
            u for u in rooms[room_id]['users'] 
            if u.get('socketId') != request.sid
        ]
        if not rooms[room_id]['users']:
            print(f'🗑️ Room {room_id} is empty, removing...')
            del rooms[room_id]
        else:
            # Notify others that user left
            emit('user_left', {
                'userId': request.sid,
                'username': 'Unknown'
            }, room=room_id)

# ============================================================
# ROOM EVENTS
# ============================================================

@socketio.on('join_room')
def handle_join_room(data):
    room = data.get('room')
    username = data.get('username')
    user_id = data.get('userId')
    
    print(f'📥 Join room request: room={room}, username={username}, userId={user_id}')
    
    if not room or not username or not user_id:
        emit('error', {'message': 'Missing room, username, or userId'})
        return
    
    # Clean room ID (uppercase, no spaces)
    room = room.upper().strip()
    
    join_room(room)
    
    # Create room if it doesn't exist
    if room not in rooms:
        rooms[room] = {
            'users': [],
            'messages': [],
            'cart': [],
            'products': [],
            'created_at': datetime.now().isoformat()
        }
        print(f'🏠 Created new room: {room}')
    
    # Remove existing user with same userId (prevent duplicates)
    rooms[room]['users'] = [u for u in rooms[room]['users'] if u['userId'] != user_id]
    
    # Add new user
    new_user = {
        'userId': user_id,
        'username': username,
        'socketId': request.sid,
        'isActive': True,
        'currentProduct': None
    }
    rooms[room]['users'].append(new_user)
    
    print(f'✅ User {username} joined room {room}. Total users: {len(rooms[room]["users"])}')
    
    # Send room state to the user
    emit('room_joined', {
        'room': room,
        'users': rooms[room]['users'],
        'messages': rooms[room]['messages'][-50:],
        'cart': rooms[room]['cart'],
        'products': rooms[room]['products'],
        'created_at': rooms[room]['created_at']
    })
    
    # Notify others in the room
    emit('user_joined', {
        'username': username,
        'userId': user_id,
        'socketId': request.sid
    }, room=room, include_self=False)

@socketio.on('leave_room')
def handle_leave_room(data):
    room = data.get('room')
    user_id = data.get('userId')
    username = data.get('username', 'Unknown')
    
    if not room or not user_id:
        return
    
    room = room.upper().strip()
    
    if room in rooms:
        # Remove user from room
        rooms[room]['users'] = [
            u for u in rooms[room]['users'] 
            if u['userId'] != user_id
        ]
        
        # Notify others
        emit('user_left', {
            'userId': user_id,
            'username': username
        }, room=room)
        
        # Delete empty rooms
        if not rooms[room]['users']:
            print(f'🗑️ Room {room} is empty, removing...')
            del rooms[room]
    
    leave_room(room)
    print(f'👋 User {username} left room {room}')

# ============================================================
# MESSAGE EVENTS
# ============================================================

@socketio.on('send_message')
def handle_send_message(data):
    room = data.get('room')
    message = data.get('message')
    username = data.get('username')
    user_id = data.get('userId')
    
    if not room or not message:
        return
    
    if room not in rooms:
        return
    
    # ✅ Check for duplicate before adding
    if rooms[room]['messages']:
        last = rooms[room]['messages'][-1]
        if (last.get('message') == message and 
            last.get('userId') == user_id and
            (datetime.now() - datetime.fromisoformat(last.get('timestamp'))).total_seconds() < 1):
            print('⚠️ Duplicate blocked')
            return
    
    msg_data = {
        'username': username or 'Anonymous',
        'userId': user_id or 'unknown',
        'message': message,
        'timestamp': datetime.now().isoformat()
    }
    
    rooms[room]['messages'].append(msg_data)
    emit('new_message', msg_data, room=room)
    
    # Keep only last 100 messages
    if len(rooms[room]['messages']) > 100:
        rooms[room]['messages'] = rooms[room]['messages'][-100:]
    
    # Broadcast to all in room
    emit('new_message', msg_data, room=room)
    print(f'✅ Message broadcasted to room {room}')

# ============================================================
# PRODUCT VIEW EVENTS
# ============================================================

@socketio.on('view_product')
def handle_view_product(data):
    room = data.get('room')
    product_id = data.get('productId')
    product = data.get('product')
    user_id = data.get('userId')
    
    if not room or not product_id:
        return
    
    room = room.upper().strip()
    
    if room in rooms:
        # Update user's current product
        for user in rooms[room]['users']:
            if user['userId'] == user_id:
                user['currentProduct'] = product_id
                break
        
        # Add product to room products if not exists
        if product and not any(p.get('id') == product_id for p in rooms[room].get('products', [])):
            if 'products' not in rooms[room]:
                rooms[room]['products'] = []
            rooms[room]['products'].append(product)
        
        # Notify others
        emit('product_viewed', {
            'userId': user_id,
            'productId': product_id,
            'username': next((u['username'] for u in rooms[room]['users'] if u['userId'] == user_id), 'Unknown')
        }, room=room)

# ============================================================
# CART EVENTS
# ============================================================

@socketio.on('add_to_cart')
def handle_add_to_cart(data):
    room = data.get('room')
    product_id = data.get('productId')
    product = data.get('product')
    user_id = data.get('userId')
    quantity = data.get('quantity', 1)
    
    print(f'🛒 Add to cart: room={room}, product={product_id}, user={user_id}')
    
    if not room or not product_id:
        return
    
    room = room.upper().strip()
    
    if room in rooms:
        # Check if product already in cart
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
        
        # Broadcast cart update
        emit('cart_updated', {
            'cart': rooms[room]['cart'],
            'userId': user_id
        }, room=room)
        print(f'✅ Cart updated in room {room}: {len(rooms[room]["cart"])} items')

@socketio.on('remove_from_cart')
def handle_remove_from_cart(data):
    room = data.get('room')
    product_id = data.get('productId')
    user_id = data.get('userId')
    
    if not room or not product_id:
        return
    
    room = room.upper().strip()
    
    if room in rooms:
        rooms[room]['cart'] = [
            item for item in rooms[room]['cart'] 
            if item.get('id') != product_id
        ]
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
    
    room = room.upper().strip()
    
    if room in rooms:
        for item in rooms[room]['cart']:
            if item.get('id') == product_id:
                if quantity <= 0:
                    rooms[room]['cart'] = [
                        i for i in rooms[room]['cart'] 
                        if i.get('id') != product_id
                    ]
                else:
                    item['quantity'] = quantity
                break
        
        emit('cart_updated', {
            'cart': rooms[room]['cart'],
            'userId': user_id
        }, room=room)

# ============================================================
# ROOM STATE EVENTS
# ============================================================

@socketio.on('get_room_state')
def handle_get_room_state(data):
    room = data.get('room')
    
    if not room:
        return
    
    room = room.upper().strip()
    
    if room in rooms:
        emit('room_state', {
            'users': rooms[room]['users'],
            'messages': rooms[room]['messages'][-50:],
            'cart': rooms[room]['cart'],
            'products': rooms[room].get('products', [])
        })
    else:
        emit('error', {'message': 'Room not found'})

# ============================================================
# MAIN ENTRY POINT
# ============================================================

if __name__ == '__main__':
    print('🚀 Starting Socket.io server...')
    print(f'📡 Running on port: {os.environ.get("SOCKET_PORT", 5001)}')
    port = int(os.environ.get('SOCKET_PORT', 5001))
    socketio.run(
        app,
        host='0.0.0.0',
        port=port,
        debug=False,
        
    )