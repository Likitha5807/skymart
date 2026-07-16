// src/context/SocketContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { io, Socket } from "socket.io-client";

interface RoomUser {
  socketId: string;
  username: string;
  userId: string;
  isActive: boolean;
  currentProduct: number | null;
}

interface RoomState {
  users: RoomUser[];
  products: any[];
  messages: any[];
  selectedProduct: any | null;
  cart: any[];
  created_at: number;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  currentRoom: string | null;
  roomState: RoomState | null;
  joinRoom: (roomId: string, username: string, userId: string) => void;
  leaveRoom: () => void;
  viewProduct: (productId: number, product: any) => void;
  sendMessage: (message: string) => void;
  addToCollabCart: (productId: number, product: any) => void;
  removeFromCollabCart: (productId: number) => void;
  updateCartQuantity: (productId: number, quantity: number) => void;
  users: RoomUser[];
  messages: any[];
  cartItems: any[];
}

const SocketContext = createContext<SocketContextType | null>(null);
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "https://skymart-socket.onrender.com";
export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("🟢 Socket connected");
      setIsConnected(true);
    });

    newSocket.on("disconnect", () => {
      console.log("🔴 Socket disconnected");
      setIsConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      setIsConnected(false);
    });

    newSocket.on("room-state", (state: RoomState) => {
      setRoomState(state);
    });

    newSocket.on("users-update", (users: RoomUser[]) => {
      setRoomState((prev) => (prev ? { ...prev, users } : null));
    });

    newSocket.on("user-viewing", ({ userId, username, productId, product }) => {
      setRoomState((prev) => {
        if (!prev) return prev;
        const updatedUsers = prev.users.map((u) =>
          u.socketId === userId ? { ...u, currentProduct: productId } : u,
        );
        return { ...prev, users: updatedUsers };
      });
    });

    newSocket.on("new-message", (message) => {
      setRoomState((prev) => {
        if (!prev) return prev;
        return { ...prev, messages: [...prev.messages, message] };
      });
    });

    newSocket.on("cart-update", (cart) => {
      setRoomState((prev) => {
        if (!prev) return prev;
        return { ...prev, cart };
      });
    });

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, []);

  const joinRoom = (roomId: string, username: string, userId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("join-room", { roomId, username, userId });
      setCurrentRoom(roomId);
    } else {
      console.warn("Socket not connected, cannot join room");
    }
  };

  const leaveRoom = () => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("leave-room");
      setCurrentRoom(null);
      setRoomState(null);
    }
  };

  const viewProduct = (productId: number, product: any) => {
    if (socketRef.current && isConnected && currentRoom) {
      socketRef.current.emit("view-product", { productId, product });
    }
  };

  const sendMessage = (message: string) => {
    if (socketRef.current && isConnected && currentRoom) {
      socketRef.current.emit("send-message", { message });
    }
  };

  const addToCollabCart = (productId: number, product: any) => {
    if (socketRef.current && isConnected && currentRoom) {
      socketRef.current.emit("add-to-collab-cart", { productId, product });
    }
  };

  const removeFromCollabCart = (productId: number) => {
    if (socketRef.current && isConnected && currentRoom) {
      socketRef.current.emit("remove-from-collab-cart", { productId });
    }
  };

  const updateCartQuantity = (productId: number, quantity: number) => {
    if (socketRef.current && isConnected && currentRoom) {
      socketRef.current.emit("update-cart-quantity", { productId, quantity });
    }
  };

  const value: SocketContextType = {
    socket,
    isConnected,
    currentRoom,
    roomState,
    joinRoom,
    leaveRoom,
    viewProduct,
    sendMessage,
    addToCollabCart,
    removeFromCollabCart,
    updateCartQuantity,
    users: roomState?.users || [],
    messages: roomState?.messages || [],
    cartItems: roomState?.cart || [],
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}
