// src/components/ShopTogether.tsx
import React, { useState, useEffect, useRef } from "react";
import { useSocket } from "../context/SocketContext";
import {
  Users,
  MessageCircle,
  ShoppingCart,
  Eye,
  X,
  Send,
  UserPlus,
  Copy,
  Check,
  User,
  ExternalLink,
} from "lucide-react";

interface ShopTogetherProps {
  currentProduct?: any;
  userId: string;
  username: string;
  onProductSelect?: (product: any) => void;
}

export function ShopTogether({
  currentProduct,
  userId,
  username,
  onProductSelect,
}: ShopTogetherProps) {
  const {
    isConnected,
    currentRoom,
    roomState,
    joinRoom,
    leaveRoom,
    sendMessage,
    addToCollabCart,
    removeFromCollabCart,
    updateCartQuantity,
    users,
    messages,
    cartItems,
  } = useSocket();

  const [roomId, setRoomId] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [showChat, setShowChat] = useState(true);
  const [showCart, setShowCart] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [localMessages, setLocalMessages] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages]);

  const generateRoomId = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCreateRoom = () => {
    const newRoomId = generateRoomId();
    setRoomId(newRoomId);
    setIsCreatingRoom(true);
    joinRoom(newRoomId, username, userId);
  };

  const handleJoinRoom = () => {
    if (roomId.trim()) {
      joinRoom(roomId.trim().toUpperCase(), username, userId);
    }
  };

  const handleLeaveRoom = () => {
    leaveRoom();
    setRoomId("");
    setIsCreatingRoom(false);
    setLocalMessages([]);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim() && currentRoom) {
      sendMessage(messageInput);
      setMessageInput("");
    }
  };

  const copyRoomLink = () => {
    const link = `${window.location.origin}/shop-together/${currentRoom}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddToCart = (product: any) => {
    if (!product) return;
    addToCollabCart(product.id, product);
  };

  if (!currentRoom) {
    return (
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-xl">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-amber-500/10 rounded-full mb-4">
            <Users className="w-8 h-8 text-amber-400" />
          </div>
          <h3 className="text-xl font-bold text-white">Shop Together</h3>
          <p className="text-sm text-white/60 mt-1">
            Invite friends to browse and shop in real-time
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleCreateRoom}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            <UserPlus className="w-5 h-5" />
            Create Shopping Room
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-4 bg-[#1a1a24] text-white/40">
                or join existing
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter room code (e.g., ABC123)"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-amber-500 text-white text-sm uppercase font-mono tracking-wider"
              maxLength={6}
            />
            <button
              onClick={handleJoinRoom}
              disabled={!roomId.trim()}
              className="px-6 py-3 bg-white text-[#1a1a24] rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Join
            </button>
          </div>

          <p className="text-[10px] text-white/40 text-center">
            {isConnected ? "🟢 Connected" : "🔴 Connecting..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
      {/* Room Header */}
      <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-amber-400" />
          <span className="font-bold text-sm text-white">
            Room: {currentRoom}
          </span>
          <span className="text-xs text-white/60">{users.length} online</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyRoomLink}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={handleLeaveRoom}
            className="p-2 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Users */}
      <div className="px-4 py-3 border-b border-white/10 flex flex-wrap gap-2">
        {users.map((user: any) => (
          <div
            key={user.socketId}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs ${user.userId === userId ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-white/5 text-white/80 border border-white/5"}`}
          >
            <User className="w-3 h-3" />
            <span>
              {user.username} {user.userId === userId && "(You)"}
            </span>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
        {/* Product - 2/3 */}
        <div className="lg:col-span-2 p-4 min-h-[350px] border-r border-white/10">
          {currentProduct ? (
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="w-full sm:w-1/2 bg-white/5 rounded-xl p-4 flex items-center justify-center">
                <img
                  src={currentProduct.img}
                  alt={currentProduct.name}
                  className="max-h-48 object-contain"
                />
              </div>
              <div className="w-full sm:w-1/2 space-y-2">
                <h4 className="text-lg font-bold text-white">
                  {currentProduct.name}
                </h4>
                <p className="text-sm text-white/60">{currentProduct.brand}</p>
                <p className="text-lg font-semibold text-amber-400">
                  ₹{currentProduct.price}
                </p>
                <button
                  onClick={() => handleAddToCart(currentProduct)}
                  className="w-full px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:opacity-90"
                >
                  Add to Group Cart
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-white/40">
              <Eye className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">No product selected</p>
            </div>
          )}
        </div>

        {/* Chat - 1/3 */}
        <div className="lg:col-span-1 flex flex-col h-[400px]">
          <div className="flex border-b border-white/10">
            <button
              onClick={() => {
                setShowChat(true);
                setShowCart(false);
              }}
              className={`flex-1 py-2 text-xs font-semibold ${showChat ? "border-b-2 border-amber-500 text-amber-400" : "text-white/40"}`}
            >
              <MessageCircle className="w-4 h-4 inline mr-1" /> Chat (
              {localMessages.length})
            </button>
            <button
              onClick={() => {
                setShowChat(false);
                setShowCart(true);
              }}
              className={`flex-1 py-2 text-xs font-semibold ${showCart ? "border-b-2 border-amber-500 text-amber-400" : "text-white/40"}`}
            >
              <ShoppingCart className="w-4 h-4 inline mr-1" /> Cart (
              {cartItems.length})
            </button>
          </div>

          {showChat && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {localMessages.map((msg, idx) => {
                  const isCurrentUser = msg.userId === userId;
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col ${isCurrentUser ? "items-end" : "items-start"}`}
                    >
                      {!isCurrentUser && (
                        <span className="text-[10px] text-white/50">
                          {msg.username}
                        </span>
                      )}
                      <div
                        className={`max-w-[80%] px-3 py-1.5 rounded-xl text-sm ${isCurrentUser ? "bg-amber-500 text-white rounded-tr-none" : "bg-white/10 text-white rounded-tl-none"}`}
                      >
                        {msg.message}
                      </div>
                      <span className="text-[8px] text-white/30">
                        {msg.timestamp
                          ? new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "now"}
                      </span>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
                {localMessages.length === 0 && (
                  <div className="text-center text-white/30 text-sm py-8">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>No messages yet</p>
                  </div>
                )}
              </div>
              <form
                onSubmit={handleSendMessage}
                className="p-2 border-t border-white/10 flex gap-2 bg-white/5 flex-shrink-0"
              >
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white/10 border border-white/10 rounded-full text-sm text-white outline-none focus:border-amber-400 placeholder-white/30"
                />
                <button
                  type="submit"
                  disabled={!messageInput.trim()}
                  className="px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-full hover:opacity-90 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {showCart && (
            <div className="flex-1 overflow-y-auto p-3">
              {cartItems.length === 0 ? (
                <div className="text-center text-white/40 text-sm py-8">
                  <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Group cart is empty</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 p-2 bg-white/5 rounded-lg"
                    >
                      <img
                        src={item.img}
                        alt={item.name}
                        className="w-10 h-10 object-contain"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-white/50">
                          ₹{item.price} x {item.quantity}
                        </p>
                      </div>
                      <button
                        onClick={() => removeFromCollabCart(item.id)}
                        className="p-1 bg-rose-500/20 text-rose-400 rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <div className="border-t border-white/10 pt-2 mt-2">
                    <div className="flex justify-between text-sm font-semibold text-white">
                      <span>Total</span>
                      <span className="text-amber-400">
                        ₹
                        {cartItems.reduce(
                          (sum, item) =>
                            sum + item.price * (item.quantity || 1),
                          0,
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
