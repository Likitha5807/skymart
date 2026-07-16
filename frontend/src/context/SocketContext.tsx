// frontend/src/context/SocketContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "https://skymart-h-socket.onrender.com";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  currentRoom: string | null;
  joinRoom: (roomId: string, username: string, userId: string) => void;
  leaveRoom: () => void;
  sendMessage: (message: string) => void;
  users: any[];
  messages: any[];
  cartItems: any[];
  addToCollabCart: (productId: number, product: any) => void;
  removeFromCollabCart: (productId: number) => void;
  updateCartQuantity: (productId: number, quantity: number) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("🟢 Socket connected!", newSocket.id);
      setIsConnected(true);
    });

    newSocket.on("disconnect", () => {
      console.log("🔴 Socket disconnected");
      setIsConnected(false);
    });

    newSocket.on("room_joined", (data) => {
      console.log("📥 Room joined:", data);
      setUsers(data.users || []);
      setMessages(data.messages || []);
      setCartItems(data.cart || []);
      setCurrentRoom(data.room);
    });

    newSocket.on("user_joined", (data) => {
      console.log("👤 User joined:", data);
      setUsers((prev) => [
        ...prev,
        {
          userId: data.userId,
          username: data.username,
          socketId: data.socketId,
          isActive: true,
          currentProduct: null,
        },
      ]);
    });

    newSocket.on("user_left", (data) => {
      console.log("👋 User left:", data);
      setUsers((prev) => prev.filter((u) => u.userId !== data.userId));
    });

    newSocket.on("new_message", (data) => {
      console.log("💬 New message:", data);
      setMessages((prev) => [...prev, data]);
    });

    newSocket.on("cart_updated", (data) => {
      console.log("🛒 Cart updated:", data);
      setCartItems(data.cart || []);
    });

    newSocket.on("error", (data) => {
      console.error("❌ Socket error:", data);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const joinRoom = (roomId: string, username: string, userId: string) => {
    if (!socketRef.current || !isConnected) {
      console.error("❌ Socket not connected");
      return;
    }

    console.log("📤 Joining room:", roomId);
    socketRef.current.emit("join_room", {
      room: roomId,
      username: username,
      userId: userId,
    });
  };

  const leaveRoom = () => {
    if (!socketRef.current || !currentRoom) return;

    socketRef.current.emit("leave_room", {
      room: currentRoom,
      userId: localStorage.getItem("userId") || "guest",
    });

    setCurrentRoom(null);
    setUsers([]);
    setMessages([]);
    setCartItems([]);
  };

  const sendMessage = (message: string) => {
    if (!socketRef.current || !currentRoom) {
      console.error("❌ Not in a room");
      return;
    }

    const userId = localStorage.getItem("userId") || "guest";
    const username = localStorage.getItem("username") || "Guest";

    socketRef.current.emit("send_message", {
      room: currentRoom,
      message: message,
      username: username,
      userId: userId,
    });
  };

  const addToCollabCart = (productId: number, product: any) => {
    if (!socketRef.current || !currentRoom) {
      console.error("❌ Not in a room");
      return;
    }

    const userId = localStorage.getItem("userId") || "guest";

    socketRef.current.emit("add_to_cart", {
      room: currentRoom,
      productId: productId,
      product: product,
      userId: userId,
      quantity: 1,
    });
  };

  const removeFromCollabCart = (productId: number) => {
    if (!socketRef.current || !currentRoom) return;

    const userId = localStorage.getItem("userId") || "guest";

    socketRef.current.emit("remove_from_cart", {
      room: currentRoom,
      productId: productId,
      userId: userId,
    });
  };

  const updateCartQuantity = (productId: number, quantity: number) => {
    if (!socketRef.current || !currentRoom) return;

    const userId = localStorage.getItem("userId") || "guest";

    socketRef.current.emit("update_cart_quantity", {
      room: currentRoom,
      productId: productId,
      quantity: quantity,
      userId: userId,
    });
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        currentRoom,
        joinRoom,
        leaveRoom,
        sendMessage,
        users,
        messages,
        cartItems,
        addToCollabCart,
        removeFromCollabCart,
        updateCartQuantity,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
