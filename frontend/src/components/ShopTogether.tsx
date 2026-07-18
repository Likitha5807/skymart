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
  Crown,
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

  // Update local messages when socket messages change
  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  // Auto-scroll to bottom of messages
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
      console.log("📤 Sending message:", messageInput);
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
    console.log("🛒 Adding to cart:", product);
    addToCollabCart(product.id, product);
  };

  // Not in a room - show join/create UI
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

  // In a room - show collaborative UI
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
      {/* Room Header */}
      <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-sm text-white">
              Room: {currentRoom}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-white/60">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span>{users.length} online</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyRoomLink}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
            title="Copy invite link"
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

      {/* Online Users */}
      <div className="px-4 py-3 border-b border-white/10 flex flex-wrap gap-2">
        {users.map((user: any) => {
          const isCurrentUser = user.userId === userId;
          return (
            <div
              key={user.socketId}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs ${
                isCurrentUser
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-white/5 text-white/80 border border-white/5"
              }`}
            >
              <div className="relative">
                <User className="w-3 h-3" />
                {user.isActive && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-[#1a1a24]"></span>
                )}
              </div>
              <span className="font-medium">
                {user.username} {isCurrentUser && "(You)"}
              </span>
              {user.currentProduct && (
                <span className="text-[8px] text-white/40 flex items-center gap-0.5">
                  <Eye className="w-2.5 h-2.5" /> viewing
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* ✅ FIXED: Main Content Area - Changed from 4 to 5 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
        {/* ✅ FIXED: Product View Area - Now 4 columns instead of 3 */}
        <div className="lg:col-span-4 p-6 min-h-[350px] border-r border-white/10">
          {currentProduct ? (
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              <div className="w-full lg:w-1/2 bg-white/5 rounded-xl p-6 flex items-center justify-center">
                <img
                  src={currentProduct.img}
                  alt={currentProduct.name}
                  className="max-h-64 object-contain"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://via.placeholder.com/300x300?text=No+Image";
                  }}
                />
              </div>
              <div className="w-full lg:w-1/2 space-y-4">
                <h4 className="text-xl font-bold text-white">
                  {currentProduct.name}
                </h4>
                <p className="text-sm text-white/60">{currentProduct.brand}</p>
                <p className="text-lg font-semibold text-amber-400">
                  ₹{currentProduct.price}
                </p>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => handleAddToCart(currentProduct)}
                    className="flex-1 px-6 py-3 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all"
                  >
                    Add to Group Cart
                  </button>
                </div>

                {/* Show who's viewing this product */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-xs text-white/40">👀 Currently viewing:</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {users
                      .filter(
                        (u: any) =>
                          u.currentProduct === currentProduct.id &&
                          u.userId !== userId,
                      )
                      .map((u: any) => (
                        <span
                          key={u.socketId}
                          className="text-xs text-white/60 bg-white/5 px-2 py-1 rounded-full"
                        >
                          {u.username}
                        </span>
                      ))}
                    {users.filter(
                      (u: any) =>
                        u.currentProduct === currentProduct.id &&
                        u.userId !== userId,
                    ).length === 0 && (
                      <span className="text-xs text-white/40">Only you</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-white/40">
              <Eye className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">No product selected</p>
              <p className="text-xs">
                Browse the catalog and click "View Together"
              </p>
            </div>
          )}
        </div>

        {/* ✅ FIXED: Chat / Cart Toggle - Now has more space */}
        <div className="lg:col-span-1 flex flex-col h-[450px] max-h-[70vh]">
          {/* Tabs */}
          <div className="flex border-b border-white/10 flex-shrink-0">
            <button
              onClick={() => {
                setShowChat(true);
                setShowCart(false);
              }}
              className={`flex-1 py-3 text-xs font-semibold transition-colors ${
                showChat
                  ? "border-b-2 border-amber-500 text-amber-400"
                  : "text-white/40"
              }`}
            >
              <MessageCircle className="w-4 h-4 inline mr-1" />
              Chat ({localMessages.length})
            </button>
            <button
              onClick={() => {
                setShowChat(false);
                setShowCart(true);
              }}
              className={`flex-1 py-3 text-xs font-semibold transition-colors ${
                showCart
                  ? "border-b-2 border-amber-500 text-amber-400"
                  : "text-white/40"
              }`}
            >
              <ShoppingCart className="w-4 h-4 inline mr-1" />
              Cart ({cartItems.length})
            </button>
          </div>

          {/* Chat View */}
          {showChat && (
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {localMessages.map((msg, idx) => {
                  const isCurrentUser = msg.userId === userId;

                  // Check if this is the first message from this user
                  const isFirstMessage =
                    idx === 0 ||
                    (idx > 0 && localMessages[idx - 1]?.userId !== msg.userId);

                  return (
                    <div
                      key={idx}
                      className={`flex flex-col ${isCurrentUser ? "items-end" : "items-start"} animate-message-in`}
                    >
                      {/* Show avatar and username for other users' first message */}
                      {!isCurrentUser && isFirstMessage && (
                        <div className="flex items-center gap-2 mb-0.5">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-amber-500/20">
                            {(msg.username || "U").charAt(0).toUpperCase()}
                          </div>
                          <span className="text-[10px] text-white/60 font-medium">
                            {msg.username || "Unknown User"}
                          </span>
                          <span className="text-[8px] text-white/30">
                            {msg.timestamp
                              ? new Date(msg.timestamp).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "just now"}
                          </span>
                        </div>
                      )}

                      {/* Show "You" for current user's first message */}
                      {isCurrentUser && isFirstMessage && (
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] text-amber-400/70 font-medium">
                            You
                          </span>
                          <span className="text-[8px] text-white/30">
                            {msg.timestamp
                              ? new Date(msg.timestamp).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "just now"}
                          </span>
                        </div>
                      )}

                      {/* Message bubble */}
                      <div
                        className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                          isCurrentUser
                            ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-br-none shadow-lg shadow-amber-500/20"
                            : "bg-white/10 text-white rounded-bl-none border border-white/5"
                        }`}
                      >
                        {msg.message}
                      </div>

                      {/* Show time for non-first messages */}
                      {!isFirstMessage && (
                        <span className="text-[8px] text-white/20 mt-0.5 px-1">
                          {msg.timestamp
                            ? new Date(msg.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "just now"}
                        </span>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
                {localMessages.length === 0 && (
                  <div className="text-center text-white/30 text-sm py-8">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No messages yet</p>
                    <p className="text-xs">
                      Say hello to your shopping buddies!
                    </p>
                  </div>
                )}
              </div>
              <form
                onSubmit={handleSendMessage}
                className="p-3 border-t border-white/10 flex gap-2 bg-white/5 flex-shrink-0"
              >
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-full text-sm text-white outline-none focus:border-amber-500 placeholder-white/30 transition-all"
                />
                <button
                  type="submit"
                  disabled={!messageInput.trim()}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-full hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-amber-500/20"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* Cart View */}
          {showCart && (
            <div className="flex-1 overflow-y-auto p-3">
              {cartItems.length === 0 ? (
                <div className="text-center text-white/40 text-sm py-8">
                  <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Group cart is empty</p>
                  <p className="text-xs">Add items from the product view</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-2 bg-white/5 rounded-lg"
                    >
                      <img
                        src={item.img}
                        alt={item.name}
                        className="w-12 h-12 object-contain bg-white/5 rounded border border-white/10 p-1"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://via.placeholder.com/50x50?text=No+Image";
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-white/50">
                          ₹{item.price} x {item.quantity || 1}
                        </p>
                        <p className="text-[8px] text-white/30">
                          Added by {item.addedBy || "someone"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            updateCartQuantity(
                              item.id,
                              Math.max(1, (item.quantity || 1) - 1),
                            )
                          }
                          className="w-6 h-6 bg-white/10 rounded hover:bg-white/20 text-white/60 hover:text-white flex items-center justify-center text-xs"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold w-6 text-center text-white">
                          {item.quantity || 1}
                        </span>
                        <button
                          onClick={() =>
                            updateCartQuantity(
                              item.id,
                              (item.quantity || 1) + 1,
                            )
                          }
                          className="w-6 h-6 bg-white/10 rounded hover:bg-white/20 text-white/60 hover:text-white flex items-center justify-center text-xs"
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeFromCollabCart(item.id)}
                          className="w-6 h-6 bg-rose-500/20 text-rose-400 rounded hover:bg-rose-500/30 flex items-center justify-center text-xs"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Cart Summary */}
                  <div className="border-t border-white/10 pt-3 mt-3">
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
                    <button className="w-full mt-2 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg text-sm font-semibold hover:opacity-90">
                      Checkout Group Cart
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Product Suggestions */}
      {currentProduct && (
        <div className="p-4 border-t border-white/10 bg-white/5">
          <p className="text-xs text-white/40 mb-2">👀 Others are viewing:</p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {users
              .filter(
                (u: any) =>
                  u.currentProduct &&
                  u.currentProduct !== currentProduct.id &&
                  u.userId !== userId,
              )
              .slice(0, 3)
              .map((user: any) => {
                const product = roomState?.products.find(
                  (p: any) => p.id === user.currentProduct,
                );
                if (!product) return null;
                return (
                  <button
                    key={user.socketId}
                    onClick={() => {
                      if (onProductSelect) {
                        onProductSelect(product);
                      }
                    }}
                    className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg hover:border-amber-500/50 transition-all"
                  >
                    <img
                      src={product.img}
                      alt={product.name}
                      className="w-8 h-8 object-contain"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://via.placeholder.com/40x40?text=No+Image";
                      }}
                    />
                    <div className="text-left">
                      <p className="text-xs font-medium text-white truncate max-w-[120px]">
                        {product.name}
                      </p>
                      <p className="text-[8px] text-white/40">
                        Viewed by {user.username}
                      </p>
                    </div>
                    <ExternalLink className="w-3 h-3 text-white/30" />
                  </button>
                );
              })}
            {users.filter(
              (u: any) =>
                u.currentProduct &&
                u.currentProduct !== currentProduct.id &&
                u.userId !== userId,
            ).length === 0 && (
              <p className="text-xs text-white/30">
                No one else is viewing a product
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
